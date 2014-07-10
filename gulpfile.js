( function () {

  'use strict';

  var browserify = require( 'browserify' );
  var gulp = require( 'gulp' );
  var jshint = require( 'gulp-jshint' );
  var rename = require( 'gulp-rename' );
  var streamify = require( 'gulp-streamify' );
  var uglify = require( 'gulp-uglify' );
  var source = require( 'vinyl-source-stream' );

  // Production mode or development mode
  var isDevEnvironment = true;

  // Run jshint to check for any glaring errors in the JS
  gulp.task( 'lint', function () {
    gulp.src( './src/*.js' )
      .pipe( jshint() )
      .pipe( jshint.reporter( 'jshint-stylish' ) );
  } );

  // Concat scripts using Browserify to manage dependencies
  gulp.task( 'build', function () {
    return browserify( './src/index.js' )
      .bundle( {
        "standalone": 'Bridge',
        "debug": isDevEnvironment
      } )
      .pipe( source( 'bridge-client.js' ) )
      .pipe( gulp.dest( './lib' ) )
      .pipe( rename( 'bridge-client.min.js' ) )
      .pipe( streamify( uglify() ) )
      .pipe( gulp.dest( './lib' ) );
  } );

  // Watch for changes to the source or dependencies
  gulp.task( 'watch', function () {
    gulp.watch( [ './src/**/*.js' ], [ 'lint', 'build' ] );
  } );

  // Default task
  gulp.task( 'default', [ 'lint', 'build', 'watch' ] );

} )();