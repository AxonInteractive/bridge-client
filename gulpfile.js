// Include gulp
var gulp = require( 'gulp' );

// Include plugins
var concat = require( 'gulp-concat' );
var rename = require( 'gulp-rename' );
var uglify = require( 'gulp-uglify' );

// Build out the final file in both dev and minified forms
gulp.task( 'build', function () {
  return gulp.src( [ 'src/**/*.js' ] )
    .pipe( concat( 'bridge.js' ) )
    .pipe( gulp.dest( 'lib' ) )
    .pipe( rename( 'bridge.min.js' ) )
    .pipe( uglify() )
    .pipe( gulp.dest( 'lib' ) );
} );

// Default task
gulp.task( 'default', [ 'build' ] );