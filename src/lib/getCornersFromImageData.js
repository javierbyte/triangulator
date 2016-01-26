const jsfeat = require('jsfeat')
const SkinTracker = require('../../lib/handtracking.js')
const _ = require('lodash')

// detail settings
const minScore = 1
const maxPoints = 300

const yapeRadius = 1
const pyramid_levels = 1

const yapeLaplacian = 80
const yapeMineigen = 80

// fast
const fastTreshold = 25

// random
const randomStrenght = 38

// head track
const headTrackIterations = 25

const algorithm = ['face', 'yape', 'skin', 'random']

const clm = require('../../lib/clmtrackr.js')
const pModel = require('../../lib/model_pca_20_mosse.js')

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
    while (x--) {
      ctracker.track(canvas)
    }
    const trackerPositions = ctracker.getCurrentPosition()

    _.forEach(trackerPositions, pos => {
      cornerArray.push(pos)
    })
    console.log('\n END - HEAD TRACK')
  }

  return cornerArray
}

module.exports = getCornersFromImageData
