function triangulator(elem, params) {

    elem.style.opacity = .5;

    var canvas = elem;
    var ctx = canvas.getContext('2d');

    var algorithm = params.algorithm || 'fast';
    var size = parseInt(params.size, 10);

    var image_data, width, height; // saving for jsfeat

    var image = new Image();

    if (params.rawImage) {
        image.src = URL.createObjectURL(params.rawImage);
    } else {
        image.src = params.image;
    }

    image.onload = function() {
        width = image.width;
        height = image.height;

        var aspect = height / width;

        if (size) {
            if (width > height) {
                width = size;
                height = (width * aspect) | 0;
            } else {
                height = size;
                width = (height / aspect) | 0;
            }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(image, 0, 0, width, height);
        var image_data = ctx.getImageData(0, 0, width, height);
        var img_u8 = new jsfeat.matrix_t(width, height, jsfeat.U8_t | jsfeat.C1_t);
        jsfeat.imgproc.grayscale(image_data.data, width, height, img_u8);

        // runnig jsfeat

        switch (algorithm) {
            case 'fast':
                var threshold = params.fastTreshold || 15;
                jsfeat.fast_corners.set_threshold(threshold);

                var corners = [];
                for (var i = 0; i < width * height; ++i) {
                    corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0);
                }

                var count = jsfeat.fast_corners.detect(img_u8, corners, 0);
                break;

            case 'yape06':
                var corners = [],
                    laplacian_threshold = params.yapeLaplacian || 50,
                    min_eigen_value_threshold = params.yapeMineigen || 50;

                jsfeat.yape06.laplacian_threshold = laplacian_threshold;
                jsfeat.yape06.min_eigen_value_threshold = min_eigen_value_threshold;

                for (var i = 0; i < width * height; ++i) {
                    corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0);
                }

                var count = jsfeat.yape06.detect(img_u8, corners, 0);
                break;

            case 'yape':
                var corners = [],
                    radius = params.yapeRadius || 2,
                    pyramid_levels = 1;

                jsfeat.yape.init(width, height, radius, pyramid_levels);

                for (var i = 0; i < width * height; ++i) {
                    corners[i] = new jsfeat.keypoint_t(0, 0, 0, 0);
                }

                var count = jsfeat.yape.detect(img_u8, corners, 0);
                break;

            default:
                console.log('Error in algorithm');
        }

        /* RENDER CORNERS
        var data_u32 = new Uint32Array(image_data.data.buffer);
        render_corners(corners, count, data_u32, width);
        ctx.putImageData(image_data, 0, 0)
        */

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
            [(width / 1.33) | 0, height],
        ];

        for (corner in corners) {
            if (corners[corner].score !== 0) {
                cornerArray.push([corners[corner].x, corners[corner].y])
            }
        }

        var triangles = [];
        triangles = Delaunay.triangulate(cornerArray);


        /*
        for (i = triangles.length; i;) {
            ctx.beginPath();
            --i;
            ctx.moveTo(cornerArray[triangles[i]][0], cornerArray[triangles[i]][1]);
            --i;
            ctx.lineTo(cornerArray[triangles[i]][0], cornerArray[triangles[i]][1]);
            --i;
            ctx.lineTo(cornerArray[triangles[i]][0], cornerArray[triangles[i]][1]);
            ctx.closePath();
            ctx.stroke();
        }
        */

        for (i = triangles.length; i;) {

            // console.log( (i*100/triangles.length)|0 + '%' );

            var rgb = {
                r: 0,
                g: 0,
                b: 0
            };

            // ctx.fillStyle = getRandomColor();

            ctx.fillStyle = getColor(i - 1, cornerArray, triangles, image_data)

            ctx.beginPath();
            i--;
            ctx.moveTo(cornerArray[triangles[i]][0], cornerArray[triangles[i]][1]);
            i--;
            ctx.lineTo(cornerArray[triangles[i]][0], cornerArray[triangles[i]][1]);
            i--;
            ctx.lineTo(cornerArray[triangles[i]][0], cornerArray[triangles[i]][1]);
            // ctx.lineTo(cornerArray[triangles[i+2]][0], cornerArray[triangles[i+2]][1]);
            ctx.closePath();
            ctx.fill();
        }

        elem.style.opacity = 1;
    }

    function getColor(i, cornerArray, triangles, image_data) {
        var polygon = [{
            x: cornerArray[triangles[i]][0],
            y: cornerArray[triangles[i]][1]
        }, {
            x: cornerArray[triangles[i - 1]][0],
            y: cornerArray[triangles[i - 1]][1]
        }, {
            x: cornerArray[triangles[i - 2]][0],
            y: cornerArray[triangles[i - 2]][1]
        }]

        var p = getAverageColor(ctx, polygon, image_data);

        var hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
        return hex;
    }

    function getAverageColor(ctx, polygon, image_data) {
        var r = 0,
            g = 0,
            b = 0;

        var analyze = [];

        analyze.push({
            x: ((polygon[0].x + polygon[1].x + polygon[2].x) / 3) | 0,
            y: ((polygon[0].y + polygon[1].y + polygon[2].y) / 3) | 0
        });

        for (i in analyze) {
            r += image_data.data[(analyze[i].x + analyze[i].y * width) * 4 + 0];
            g += image_data.data[(analyze[i].x + analyze[i].y * width) * 4 + 1];
            b += image_data.data[(analyze[i].x + analyze[i].y * width) * 4 + 2];
        }

        r = (r / analyze.length) | 0;
        g = (g / analyze.length) | 0;
        b = (b / analyze.length) | 0;

        if (r < 128) r = (r * .95) | 0;
        else r = (r *= 1.05) | 0;
        if (r > 255) r = 255;

        if (g < 128) g = (g * .95) | 0;
        else g = (g *= 1.05) | 0;
        if (g > 255) g = 255;

        if (b < 128) b = (b * .95) | 0;
        else b = (b *= 1.05) | 0;
        if (b > 255) b = 255;

        return [r, g, b];
    }

    function render_corners(corners, count, img, step) {
        var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
        for (var i = 0; i < count; ++i) {
            var x = corners[i].x;
            var y = corners[i].y;
            var off = (x + y * step);
            img[off] = pix;
            img[off - 1] = pix;
            img[off + 1] = pix;
            img[off - step] = pix;
            img[off + step] = pix;
        }
    }

    function rgbToHex(r, g, b) {
        if (r > 255 || g > 255 || b > 255)
            throw "Invalid color component";
        return ((r << 16) | (g << 8) | b).toString(16);
    }
}
