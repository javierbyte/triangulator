const React = require('react')
const ReactDOM = require('react-dom')
const Dropzone = require('react-dropzone')
const delaunay = require('delaunay-fast')

const getCornersFromImageData = require('./lib/getCornersFromImageData.js')
const drawTrianglesInCtx = require('./lib/drawTrianglesInCtx.js')

export const App = React.createClass({

  getInitialState () {
    return {
      image64: null,
      loadingImage: false
    }
  },

  componentDidMount () {
    this.canvas = ReactDOM.findDOMNode(this.refs.canvas)
    this.ctx = this.canvas.getContext('2d')
  },

  updateCanvas (img, cornerArray) {
    this.ctx.drawImage(img, 0, 0, img.width, img.height)
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height)
    const triangles = delaunay.triangulate(cornerArray)

    drawTrianglesInCtx(this.ctx, this.canvas, triangles, cornerArray, imageData)
  },

  onDrop (files) {
    var file = files[0]
    var fr = new window.FileReader()

    this.setState({
      loadingImage: true
    })

    fr.onload = (data) => {
      const image64 = data.currentTarget.result

      const img = new window.Image()
      img.onload = () => {
        var canvas = this.canvas
        var ctx = this.ctx

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const cornerArray = getCornersFromImageData(ctx, canvas)

        this.updateCanvas(img, cornerArray)
      }
      img.src = image64
    }
    fr.readAsDataURL(file)
  },

  render () {
    return (
      <div>
        <Dropzone onDrop={this.onDrop} className='dropzone'>
          Drop your image here
        </Dropzone>

        <canvas ref='canvas' />
      </div>
    )
  }
})
