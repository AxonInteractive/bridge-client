( function () {

  'use strict';

  var gulp       = require( 'gulp'                );
  var browserify = require( 'browserify'          );
  var jshint     = require( 'gulp-jshint'         );
  var rename     = require( 'gulp-rename'         );
  var source     = require( 'vinyl-source-stream' );
  var streamify  = require( 'gulp-streamify'      );
  var uglify     = require( 'gulp-uglify'         );


  ///////////////////////
  // Notable Commands //
  /////////////////////

  // > gulp
  // Builds production library files and watches for changes in the source files, rebuilding each
  // time a change is detected.
  gulp.task( 'default', [ 'lint', 'coreDev', 'plugins', 'watch' ] );

  // > gulp build
  // Builds production library files from source.
  gulp.task( 'build', [ 'lint', 'coreDev', 'coreDist', 'plugins' ] );


  ///////////////////////
  // Task Definitions //
  /////////////////////

  // Run jshint to check for any glaring errors in the JS
  gulp.task( 'lint', function () {
    gulp.src( './src/*.js' )
      .pipe( jshint() )
      .pipe( jshint.reporter( 'jshint-stylish' ) );
  } );

  // Concat scripts using Browserify to manage dependencies
  gulp.task( 'coreDev', function () {
    return browserify( './src/BridgeClient.js' )
      .bundle( {
        'standalone': 'Bridge',
        'debug': true
      } )
      .pipe( source( 'BridgeClient.js' ) )
      .pipe( gulp.dest( './lib' ) );
  } );

  // Concat scripts using Browserify to manage dependencies
  gulp.task( 'coreDist', function () {
    return browserify( './src/BridgeClient.js' )
      .bundle( {
        'standalone': 'Bridge',
        'debug': false
      } )
      .pipe( source( 'BridgeClient.min.js' ) )
      .pipe( streamify( uglify() ) )
      .pipe( gulp.dest( './lib' ) );
  } );

  // Copy the plugins into the lib folder
  gulp.task( 'plugins', function () {
    return gulp.src( [
        './src/plugins/*',
        '!./src/plugins/Default.js'
      ] )
      .pipe( gulp.dest( './lib/plugins' ) );
  } );

  // Watch for changes to the source or dependencies
  gulp.task( 'watch', function () {
    gulp.watch( [ './src/**/*.js', './example/**/*' ], [ 'lint', 'coreDev', 'plugins' ] );
  } );

} )();
