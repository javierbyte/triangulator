angular.module('Triangulator', ['angularFileUpload']);

app = angular.module('Triangulator');

app.controller('MainCtrl', function($scope, $element, $attrs) {
    var elem = document.getElementById('delaunay');

    $scope.original = {
        image: 'img/base.jpg',
        algorithm: 'yape06',

        yapeLaplacian: 50,
        yapeMineigen: 120,

        yapeRadius: 2,

        fastTreshold: 15,

        rawImage: null,

        size: 720
    };

    $scope.process = angular.copy($scope.original);

    $scope.$watch('process', function(newVal, oldVal) {
        $scope.update(newVal);
    }, true);

    $scope.restart = function restart() {
        $scope.process = angular.copy($scope.original);
    };

    $scope.update = function update(process) {
        triangulator(elem, $scope.process);
    };

    /* UPLOAD */
    $scope.onFileSelect = function($files) {
        //$files: an array of files selected, each file has name, size, and type.
        for (var i = 0; i < $files.length; i++) {
            var file = $files[i];
            
            $scope.process.rawImage = file;
        }
    };
    /* UPLOAD FINISHED */

    triangulator(elem, $scope.process);
});


function downloadCanvas(link, canvasId, filename) {
    link.href = document.getElementById('delaunay').toDataURL();
    link.download = filename;
}

/** 
 * The event handler for the link's onclick event. We give THIS as a
 * parameter (=the link element), ID of the canvas and a filename.
 */
document.getElementById('download').addEventListener('click', function() {
    downloadCanvas(this, 'canvas', 'delaunay.png');
}, false);
