const jsfeat = require('jsfeat')
const SkinTracker = require('../../lib/handtracking.js')
const _ = require('lodash')
const clm = require('../../lib/clmtrackr.js')
const pModel = require('../../lib/model_pca_10_svm.js')

// detail settings
const minScore = 1
const maxPoints = 500

const yapeRadius = 1
const pyramid_levels = 1

const yapeLaplacian = 150
const yapeMineigen = 50

// fast
const fastTreshold = 25

// random
const randomStrenght = 50

// head track
const headTrackIterations = 100

const algorithm = ['yape', 'yape06', 'face', 'skin', 'random']

const getCornersFromImageData = function (ctx, canvas) {
  const {width, height} = canvas
  const ctxData = ctx.getImageData(0, 0, width, height)
  const imageData = ctxData.data

  var img_u8 = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t)
  jsfeat.imgproc.grayscale(imageData, width, height, img_u8)

  var corners = []

  console.log('\n START - FIND CORNER ALGORITHM JSFEAT')

  if (_.includes(algorithm, 'fast')) {
    jsfeat.fast_corners.set_threshold(fastTreshold)

    for (var i = 0; i < width * height; ++i) {
      corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0)
    }

    jsfeat.fast_corners.detect(img_u8, corners, 0)
  }

  if (_.includes(algorithm, 'yape06')) {
    jsfeat.yape06.laplacian_threshold = yapeLaplacian
    jsfeat.yape06.min_eigen_value_threshold = yapeMineigen

    for (let i = 0; i < width * height; ++i) {
      corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0)
    }

    jsfeat.yape06.detect(img_u8, corners, 0)
  }

  if (_.includes(algorithm, 'yape')) {
    jsfeat.yape.init(width, height, yapeRadius, pyramid_levels)

    for (let i = 0; i < width * height; ++i) {
      corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0)
    }

    jsfeat.yape.detect(img_u8, corners, 0)
  }

  console.warn('\nTOTAL CORNERS', corners.length, 'TAKEN', maxPoints, corners)

  corners = _.chain(corners).sortBy('score').reverse().take(maxPoints).value()

  if (_.includes(algorithm, 'random')) {
    const randomSegments = Math.floor(Math.sqrt(width * height) / randomStrenght)

    const steps = _.range(randomSegments)
    const stepWidth = width / randomSegments
    const stepHeight = height / randomSegments

    corners = corners.concat(_.map(steps, (step) => {
      return _.map(steps, (innerStep) => {
        return {
          x: Math.round((step + 0.1 + Math.random() * 0.8) * stepWidth),
          y: Math.round((innerStep + 0.1 + Math.random() * 0.8) * stepHeight),
          score: 1000
        }
      })
    }))

    corners = _.flatten(corners)
  }

  if (_.includes(algorithm, 'skin')) {
    console.log('\n START - SKIN ALGORITHM')
    const tracker = new SkinTracker.Tracker()
    const candidate = tracker.detect(ctxData)

    if (candidate) {
      corners = corners.concat(_.map(candidate.contour, (el) => {
        return {
          x: el.x,
          y: el.y,
          score: 1000
        }
      }))
    }
    console.log('\n END - SKIN ALGORITHM')
  }

  console.log('\n END - FIND CORNER ALGORITHM JSFEAT')

  var cornerArray = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],

    [(width / 2) | 0, 0],
    [0, (height / 2) | 0],
    [width, (height / 2) | 0],
    [(width / 2) | 0, height],

    [(width / 4) | 0, 0],
    [0, (height / 4) | 0],
    [width, (height / 4) | 0],
    [(width / 4) | 0, height],

    [(width / 1.33) | 0, 0],
    [0, (height / 1.33) | 0],
    [width, (height / 1.33) | 0],
    [(width / 1.33) | 0, height]
  ]

  let corner
  for (corner in corners) {
    if (corners[corner].score > minScore) cornerArray.push([corners[corner].x, corners[corner].y])
  }

  if (_.includes(algorithm, 'face')) {
    console.log('\n START - HEAD TRACK')
    var ctracker = new clm.tracker()
    ctracker.init(pModel)

    let x = headTrackIterations
    while (x-- && (x > headTrackIterations / 2 || ctracker.getConvergence() > 0.5)) {
      console.warn({x})
      ctracker.track(canvas)
    }
    let trackerPositions = ctracker.getScore() > 0.3 ? ctracker.getCurrentPosition() : []

    if (trackerPositions.length) {
      // remove teeth points
      trackerPositions[61] = averagePoint(trackerPositions[61], trackerPositions[56])
      trackerPositions[60] = averagePoint(trackerPositions[60], trackerPositions[57])
      trackerPositions[59] = averagePoint(trackerPositions[59], trackerPositions[58])

      // make the eyes a little bigger
      _.forEach([23, 63, 24, 64, 25, 65, 26, 66], function(point) {
        trackerPositions[point] = distancePoint(trackerPositions[27], trackerPositions[point], 1.06)
      })

      _.forEach([28, 29, 30, 31, 67, 68, 69, 70], function(point) {
        trackerPositions[point] = distancePoint(trackerPositions[32], trackerPositions[point], 1.06)
      })

      // make the face a little smaller to prevent weird colors
      _.forEach([0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 5, 9], function(point) {
        trackerPositions[point] = distancePoint(trackerPositions[62], trackerPositions[point], 0.95)
      })

      // make the lips a little smaller too
      _.forEach([45, 46, 47, 48, 49, 51, 52, 53, 54, 55], function(point) {
        trackerPositions[point] = distancePoint(trackerPositions[60], trackerPositions[point], 0.95)
      })

      // remove unwanted points
      let pointsToRemove = [1, 13, 42, 43, 19, 20, 21, 22, 18, 17, 16, 15, 56, 57, 58]
      _.forEach(pointsToRemove, (point) => {
        trackerPositions[point] = null
      })
      trackerPositions = _.compact(trackerPositions)
    }

    _.forEach(trackerPositions, pos => {
      cornerArray.push(pos)
    })
    console.log('\n END - HEAD TRACK')
  }

  return cornerArray
}

function averagePoint (a, b) {
  return [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2
  ]
}

function distancePoint(origin, point, scale) {
  return [
    origin[0] + (point[0] - origin[0]) * scale,
    origin[1] + (point[1] - origin[1]) * scale
  ]
}

module.exports = getCornersFromImageData
