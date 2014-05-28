// Include gulp
var gulp = require( 'gulp' );

// Include plugins
var clean = require( 'gulp-clean' );
var shell = require( 'gulp-shell' );

// Build out the library unminified
gulp.task( 'build', shell.task( [
  'r.js.cmd -o build.js'
] ) );

// Build out the library in minified form
gulp.task( 'min', shell.task( [
  'r.js.cmd -o build.min.js'
] ) );

gulp.task( 'clean', function () {
  return gulp.src( 'lib', { read: false } )
    .pipe( clean() );
} );

// Default task
gulp.task( 'default', [ 'build' ] );