// Run this once the window is ready
window.onload = function () {

  'use strict';


  // =================
  // MOVE ALONG PLEASE
  // =================

  // Just a help that shows up later.
  function timestamp ( message ) {
    return '<p>' + new Date().toLocaleTimeString() + ': ' + message + '</p>';
  }

  // Hook up button to clear HTML5 local storage:
  $( '#clear-local-storage' ).click( function ( evt ) {
    $.jStorage.deleteKey( 'bridge-client-identity' );
  } );


  // ================
  // PROMISE HANDLERS
  // ================

  var loginSuccessHandler = function ( data, jqXHR ) {
    $( '#notify' ).prepend( timestamp( '<strong>login() successful!</strong>' ) );
    $( '#notify' ).prepend( timestamp( 'Bridge.user: ' + JSON.stringify( Bridge.user ) ) );
    $( '#notify' ).prepend( timestamp( 'Bridge.additionalData: ' + JSON.stringify( Bridge.additionalData ) ) );
    $( '#notify' ).prepend( timestamp( 'Bridge.isLoggedIn() result: ' + Bridge.isLoggedIn() ) );
    $( '#notify' ).prepend( timestamp( 'HTML5 stored identity:' + 
      JSON.stringify( jQuery.jStorage.get( 'bridge-client-identity', 'Not found!' ) ) ) );
  };

  var loginFailHandler = function ( error, jqXHR ) {
    if ( error.status === 0 ) {
      $( '#notify' ).prepend( timestamp( '<strong>login() timed out!</strong>' ) );
      $( '#notify' ).prepend( timestamp( 'Check your internet connection...' ) );
    }
    else {
      $( '#notify' ).prepend( timestamp( '<strong>login() error!</strong>  ' + JSON.stringify( error ) ) );
      $( '#notify' ).prepend( timestamp( 'Login request failed...' ) );
    }
  };

  var registerSuccessHandler = function ( data, jqXHR ) {
    $( '#notify' ).prepend( timestamp( '<strong>register() successful!</strong>' ) );
    // You could perform an immediate login after regsitration completes right here!
  };

  var registerFailHandler = function ( error, jqXHR ) {
    if ( error.status === 0 ) {
      $( '#notify' ).prepend( timestamp( '<strong>register() timed out!</strong>' ) );
      $( '#notify' ).prepend( timestamp( 'Check your internet connection...' ) );
    } 
    else {
      $( '#notify' ).prepend( timestamp( '<strong>register() error!</strong>  ' + JSON.stringify( error ) ) );
      $( '#notify' ).prepend( timestamp( 'Registration request failed...' ) );
    }
  };


  // ===============
  // EVENT CALLBACKS
  // ===============

  // You can listen for the changePassword function being called:
  Bridge.onChangePasswordCalled = function () {
    $( '#notify' ).prepend( timestamp( '<strong>changePassword() called!</strong>' ) );
    $( '#notify' ).prepend( timestamp( 'Waiting for a response from the server...' ) );
  };

  // You can listen for the forgotPassword function being called:
  Bridge.onForgotPasswordCalled = function ( email ) {
    $( '#notify' ).prepend( timestamp( '<strong>forgotPassword() called!</strong>' ) );
    $( '#notify' ).prepend( timestamp( 'Waiting for a response from the server...' ) );
  };
  
  // You can listen for the login function being called:
  Bridge.onLoginCalled = function () {
    $( '#notify' ).prepend( timestamp( '<strong>login() called!</strong>' ) );
    $( '#notify' ).prepend( timestamp( 'Waiting for a response from the server...' ) );
  };

  // You can listen for the logout() function being called:
  Bridge.onLogoutCalled = function ( data ) {
    $( '#notify' ).prepend( timestamp( '<strong>logout() called!</strong>' ) );
    $( '#notify' ).prepend( timestamp( 'Bridge.user: ' + JSON.stringify( Bridge.user ) ) );
    $( '#notify' ).prepend( timestamp( 'Bridge.additionalData: ' + JSON.stringify( Bridge.additionalData ) ) );
    $( '#notify' ).prepend( timestamp( 'Bridge.isLoggedIn() result: ' + Bridge.isLoggedIn() ) );
    $( '#notify' ).prepend( timestamp( 'HTML5 stored identity:' + 
      JSON.stringify( jQuery.jStorage.get( 'bridge-client-identity', 'Not found!' ) ) ) );
  };

    // You can listen for the register function being called:
  Bridge.onRegisterCalled = function () {
    $( '#notify' ).prepend( timestamp( '<strong>register() called!</strong>' ) );
    $( '#notify' ).prepend( timestamp( 'Waiting for a response from the server...' ) );
  };

  // You can listen for each request:
  Bridge.onRequestCalled = function ( method, resource, payload ) {
    jQuery( '#notify' ).prepend( timestamp( 'Request >> ' + method + ' resource ' + resource + 
      ' = ' + JSON.stringify( payload ) ) );
  };


  // =====
  // USAGE
  // =====

  // Initialize your Bridge with the base URL of your API and a timeout (in milliseconds):
  Bridge.init( 'https://192.168.2.34/node/api/1.0/', 10000 );

  // Hook up the registration process to a button:
  $( '#register' ).click( function ( evt ) {

    // Read in the input fields
    var email = $( '#email' ).val();
    var password = $( '#password' ).val();
    var firstName = $( '#first-name' ).val();
    var lastName = $( '#last-name' ).val();
    var appData = $( '#app-data' ).val();

    // Send a register request using Bridge.
    Bridge.requestRegister( email, password, firstName, lastName, appData )
      .done( registerSuccessHandler )
      .fail( registerFailHandler );

    // If you include api.js as your 3rd Party API definition, you could also write this as:
    //api.register.put( email, password, firstName, lastName, appData )
    //  .done( registerSuccessHandler )
    //  .fail( registerFailHandler );

  } );

  // Hook up the the login process to a button:
  $( '#login' ).click( function ( evt ) {

    // Read in the input fields
    var email = $( '#email2' ).val();
    var password = $( '#password2' ).val();
    var useLocalStorage = $( '#use-local-storage' ).prop( 'checked' );

    // Send a login request using Bridge.
    Bridge.requestLogin( email, password, useLocalStorage )
      .done( loginSuccessHandler )
      .fail( loginFailHandler );

    // If you include api.js as your 3rd Party API definition, you could also write this as:
    //api.login.get( email, password, useLocalStorage )
    //  .done( loginSuccessHandler )
    //  .fail( loginFailHandler );

  } );

  // Hook up the logout process to a button:
  $( '#logout' ).click( function ( evt ) {
    
    // Call Bridge.logout() to clear the user from Bridge.
    Bridge.logout();

  } );

  // Hook up the password change process to a button:
  $( 'change-password' ).click( function ( evt ) {

    // Read in the input fields
    var oldPassword = $( '#old-password' ).val();
    var newPassword = $( '#new-password' ).val();

    // Send a change password request using Bridge.
    Bridge.requestChangePassword( oldPassword, newPassword )
      .done( function ( data, jqXHR ) {

      } )
      .fail( function ( data, jqXHR ) {
        
      } );

  } );


  // ======================
  // USING STORED IDENTITES
  // ======================

  // Attempt to load up a locally stored user identity and login with that:
  var loginPromise = Bridge.requestLoginStoredIdentity();
  if ( loginPromise === null ) {
    $( '#notify' ).prepend( timestamp( '<strong>No HTML5 stored user. Waiting for manual login...</strong>' ) );
  }
  else {
    $( '#notify' ).prepend( timestamp( '<strong>HTML5 stored user found. Logging in...</strong>' ) );
    // Attach handlers to the login promise, if you like.
    loginPromise.done( loginSuccessHandler ).fail( loginFailHandler );
  }

};