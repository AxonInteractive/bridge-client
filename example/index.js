/* global $:false */

// Run this once the window is ready
window.onload = function () {

  'use strict';

  // Setup ////////////////////////////////////////////////////////////////////////////////////////
  // Specify the debug mode and your API's base URL (for your own convenience)
  Bridge.setDebug( true );
  var apiUrl = 'https://192.168.2.34/peir/api/1.0';
  /////////////////////////////////////////////////////////////////////////////////////////////////

  // Just a convenience to dump text to the DOM for this demo:
  function timestamp ( message ) {
    return '<p>' + new Date().toLocaleTimeString() + ': ' + message + '</p>';
  }

  // You can listen for each request:
  Bridge.onRequestCalled = function ( method, resource, payload ) {
    $( '#notify' ).prepend( timestamp( 'Request >> ' + method + ' resource ' + resource +
      ' = ' + JSON.stringify( payload ) ) );
  };

  $( '#register' ).click( function ( event ) {

    // Read in the input fields
    var email = $( '#register-email' ).val();
    var password = $( '#register-password' ).val();
    var firstName = $( '#register-first-name' ).val();
    var lastName = $( '#register-last-name' ).val();
    var appData = JSON.parse( $( '#register-app-data' ).val() );

    // Send a register request using Bridge.
    Bridge.register( apiUrl, email, password, firstName, lastName, appData )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>Registration successful!</strong>' ) );
      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.register() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( 'Register request failed...' ) );
      } );

  } );

  $( '#verify-email' ).click( function ( event ) {

    // Read in the input fields
    var email = $( '#verify-email-email' ).val();
    var hash = $( '#verify-email-hash' ).val();

    // Send a verify email request using Bridge.
    Bridge.verifyEmail( apiUrl, hash )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>Email account verified successfully!</strong>' ) );
      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.verifyEmail() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( 'Verify Email request failed...' ) );
      } );

  } );

  $( '#authenticate' ).click( function ( event ) {

    // Read in the input fields
    var email = $( '#authenticate-email' ).val();
    var password = $( '#authenticate-password' ).val();
    var rememberMe = $( '#authenticate-remember-me' ).prop( 'checked' );

    // Send an authenticate request using Bridge.
    Bridge.authenticate( apiUrl, email, password, rememberMe )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>Authentication successful!</strong>' ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.isAuthenticated() result: ' + Bridge.isAuthenticated() ) );
      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.authenticate() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( 'Authenticate request failed...' ) );
      } );

  } );

  $( '#login' ).click( function ( event ) {

    // Read in the input fields
    var email = $( '#login-email' ).val();
    var password = $( '#login-password' ).val();
    var rememberMe = $( '#login-remember-me' ).prop( 'checked' );

    // Login by authenticating, then getting the user's profile (login() does both itself).
    Bridge.login( apiUrl, email, password, rememberMe )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>Login successful!</strong>' ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.isAuthenticated() result: ' + Bridge.isAuthenticated() ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.isUserLoggedIn() result: ' + Bridge.isUserLoggedIn() ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.isUserModified() result: ' + Bridge.isUserModified() ) );
      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.login() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( 'Login request failed...' ) );
      } );

  } );

  $( '#save-user' ).click( function ( event ) {

    // Read in the input fields
    var email = $( '#save-user-email' ).val();
    var currentPassword = $( '#save-user-old-password' ).val();
    var newPassword = $( '#save-user-new-password' ).val();
    var firstName = $( '#save-user-first-name' ).val();
    var lastName = $( '#save-user-last-name' ).val();
    var appData = JSON.parse( $( '#save-user-app-data' ).val() );

    // Send a change password request using Bridge.
    Bridge.saveUser( apiUrl, currentPassword, newPassword )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>User Profile Update successful!</strong>' ) );
      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.updateUserProfile() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( 'User Profile Update request failed...' ) );
      } );

  } );

  $( '#forgot-password' ).click( function ( event ) {

    // Read in the input fields
    var email = $( '#forgot-password-email' ).val();

    // Send a recover password request using Bridge.
    Bridge.forgotPassword( apiUrl, email )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>Forgot Password successful!<strong>' ) );
        $( '#notify' ).prepend( timestamp( '<strong>Password recovery email sent!</strong>' ) );
      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.forgotPassword() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( 'Password recovery email failed to send...' ) );
        $( '#notify' ).prepend( timestamp( 'Forgot Password request failed...' ) );
      } );

  } );

  $( '#recover-password' ).click( function ( event ) {

    // Read in the input fields
    var newPassword = $( '#recover-password-new-password' ).val();
    var hash = $( '#recover-password-hash' ).val();

    // Send a recover password request using Bridge.
    Bridge.recoverPassword( apiUrl, newPassword, hash )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>Recover Password successful!</strong>' ) );
      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.forgotPassword() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( '<strong>Recover Password failed...</strong>' ) );
      } );

  } );

  $( 'load-user' ).click( function ( event ) {

    // Send a recover password request using Bridge.
    Bridge.loadUser( apiUrl )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>User Profile Fetch successful!</strong>' ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.user: ' + JSON.stringify( Bridge.user ) ) );

      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.getUserProfile() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( '<strong>User Profile Fetch failed...</strong>' ) );
      } );

  } );

  $( '#logout' ).click( function ( event ) {

    Bridge.logout( apiUrl )
      .then( function ( data ) {
        $( '#notify' ).prepend( timestamp( '<strong>Logout successful!</strong>' ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.getUser(): ' + JSON.stringify( Bridge.getUser() ) ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.isAuthenticated() result: ' + Bridge.isAuthenticated() ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.isUserLoggedIn() result: ' + Bridge.isUserLoggedIn() ) );
        $( '#notify' ).prepend( timestamp( 'Bridge.isUserModified() result: ' + Bridge.isUserModified() ) );

      } )
      .fail( function ( error ) {
        $( '#notify' ).prepend( timestamp( '<strong>Bridge.logout() error!</strong>  ' +
          JSON.stringify( Bridge.errors.getExplanation( error ) ) ) );
        $( '#notify' ).prepend( timestamp( '<strong>Logout failed...</strong>' ) );
      } );
  } );

};
