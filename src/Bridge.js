// Include dependencies
var enc_hex = require( './include/crypto-js/enc-hex' );
var json3 = require( './include/json3' );
var jstorage = require( './include/jstorage' );
var sha256 = require( './include/crypto-js/sha256' );
var Identity = require( './Identity' );

// [Bridge Constructor]
// The Bridge object is the global object through which other applications will 
// communicate with the bridged API resources. It provides a simple surface API for logging
// in and logging out users as well as sending requests to the API. Internally, it handles
// all of the request authentication necessary for the API without exposing the user's
// account password to outside scrutiny (and even scrutiny from other local applications
// to a significant extent).
module.exports = function () {

  'use strict';

  // The object to be returned from the factory
  var self = {};

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // PRIVATE ////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////
  // PROPERTIES //
  ////////////////

  // [PRIVATE] identity
  // The Identity object used to track the user and create requests signed with 
  // appropriate HMAC hash values.
  var identity = null;


  ///////////////
  // FUNCTIONS //
  ///////////////

  // [PRIVATE] clearIdentity()
  // Sets the current Identity object to null so it gets garbage collected and cannot be used 
  // to validate requests going forward.
  var clearIdentity = function () {

    identity = null;

  };

  // [PRIVATE] clearUser
  // Clears the current user data and additional data assigned to the Bridge.
  var clearUser = function () {

    // Set the user and additional data objects to null
    self.user = null;
    self.additionalData = null;

  };

  // [PRIVATE] hasIdentity()
  // Returns whether or not an the Identity object is currently assigned.
  var hasIdentity = function () {

    return ( identity !== null );

  };

  // [PRIVATE] requestPrivate()
  // This function provides the basic functionality used by all of the Bridge Client's internal
  // request function calls. It performs an XHR request to the API server at the specified resource
  // and return a jQuery Deferred object . If this returns null, the request could not be sent
  // because no user credentials were available to sign the request.
  var requestPrivate = function ( method, resource, payload, tempIdentity ) {

    // Notify the user of the request being ready to send.
    if ( typeof self.onRequestCalled === "function" ) {
      self.onRequestCalled( method, resource, payload );
    }

    // If a temporary identity was provided, use it (even if an identity is set in Bridge).
    var requestIdentity = null;
    if ( tempIdentity !== null && typeof tempIdentity === 'object' ) {
      requestIdentity = tempIdentity;
    }
    // If an identity is set in Bridge, use it.
    else if ( hasIdentity() === true ) {
      requestIdentity = identity;
    }
    // No identity is available. The request can't be sent.
    else { 
      if ( self.debug === true ) {
        console.warn( "BRIDGE | Request | Request cannot be sent. No user credentials available." );
      }
      return null;
    }

    // Create a deferred object to provide a convenient way for the caller to handle success and 
    // failure.
    var deferred = new jQuery.Deferred();

    // Build the payloadString to be sent along with the message.
    // Note: If this is a GET request, prepend 'payload=' since the data is sent in the query 
    // string.
    var payloadString = ( method.toUpperCase() === 'GET' ) ? 'payload=' : '';
    payloadString += JSON.stringify( requestIdentity.createRequest( payload ) );

    // Send the request
    jQuery.ajax( {
      'type': method,
      'url': self.url + resource,
      'data': payloadString,
      'dataType': 'json',
      'contentType': 'application/json',
      'headers': {
        'Accept': 'application/json'
      },
      'timeout': self.timeout,
      'async': true,
    } )
    .done( function ( data, textStatus, jqXHR ) {

      // Check if the returned header was formatted incorrectly.
      if ( typeof data !== 'object' || typeof data.content !== 'object' ) {
        deferred.reject( { status: 417, message: '417 (Expectation Failed) Malformed message.' }, jqXHR );
        return;
      }

      // Notify the user of the successful request.
      deferred.resolve( data, jqXHR );

    } )
    .fail( function ( jqXHR, textStatus, errorThrown ) {

      // Reject the obvious error codes.
      var error = Bridge.isErrorCodeResponse( jqXHR );
      if ( error !== null ) {

        // Notify the user of the error.
        deferred.reject( error, jqXHR );

      } 
      else // Connection timeout
      {

        // Notify the user of the failure to connect to the server.
        deferred.reject( { status: 0, message: '0 (Timeout) No response from the server.' }, jqXHR );

      }

    } );

    // Return the deferred object to the caller
    return deferred.promise();

  };

  // [PRIVATE] requestChangePasswordPrivate()
  // Ask the server to change the password of the curently logged-in user. This operation requires
  // the user's current password to be supplied and creates a temporary Identity object to send the
  // request for a password change to verify that another individual didn't just hop onto a logged-
  // in computer and change a user's password while they were away from their computer.
  var requestChangePasswordPrivate = function ( oldPassword, newPassword ) {

    // Notify the user of the changePassword call occurring.
    if ( typeof self.onFChangePassword === "function" ) {
      self.onChangePassword();
    }

    // Hash the user's passwords
    var oldHashedPassword = sha256( oldPassword ).toString( enc_hex );
    var newHashedPassword = sha256( newPassword ).toString( enc_hex );

    // Clear the unencrypted passwords from memory
    oldPassword = null;
    newPassword = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new jQuery.Deferred();

    // Build our internal success handler (this calls deferred.resolve())
    var onDone = function ( data, jqXHR ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' }, jqXHR );
        return;
      }

      // Set Bridge's identity object using the new password, since future requests will need to be 
      // signed with the new user credentials.
      setIdentity( identity.email, newHashedPassword, true );

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Forgot Password | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data, jqXHR );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error, jqXHR ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Forgot Password | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its fail() handler.
      deferred.reject( error, jqXHR );

    };

    // Build the payload object to send with the request
    var payload = {
      "password": newHashedPassword
    };

    // Configure a temporary Identity object with the user's credentials, using the password 
    // received as a parameter to double-confirm the user's identity immediately before they 
    // change their account password.
    var tempIdentity = new Identity( identity.email, oldHashedPassword, true );

    // Send the request
    requestPrivate( 'POST', 'change-password', payload, tempIdentity ).done( onDone ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise();

  };

  // [PRIVATE] requestForgotPasswordPrivate()
  // Ask the server to set the user into recovery state for a short period of time and send an
  // account recovery email to the email account provided here, as long as it identifies a user
  // in the database.
  var requestForgotPasswordPrivate = function ( email ) {

    // Notify the user of the forgotPassword call occurring.
    if ( typeof self.onForgotPassword === "function" ) {
      self.onForgotPassword( email );
    }

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new jQuery.Deferred();

    // Build our internal success handler (this calls deferred.resolve())
    var onDone = function ( data, jqXHR ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' }, jqXHR );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Forgot Password | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data, jqXHR );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error, jqXHR ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Forgot Password | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its fail() handler.
      deferred.reject( error, jqXHR );

    };

    // Build the payload object to send with the request
    var payload = {
      "email": email
    };

    // Create a temporary Identity object with a blank password.
    var tempIdentity = new Identity( email, '', true );

    // Send the request
    requestPrivate( 'POST', 'forgot-password', payload, null ).done( onDone ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise();

  };

  // [PRIVATE] requestLoginPrivate()
  // Log in a user with the given email/password pair. This creates a new Identity object
  // to sign requests for authentication and performs an initial request to the server to
  // send a login package.
  var requestLoginPrivate = function ( email, password, useLocalStorage, dontHashPassword ) {

    // Notify the user of the login call occurring.
    if ( typeof self.onLoginCalled === "function" ) {
      self.onLoginCalled( email, useLocalStorage );
    }

    // Hash the user's password
    var hashedPassword = ( dontHashPassword === true ) ? password :
      sha256( password ).toString( enc_hex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new jQuery.Deferred();

    // Build our internal success handler (this calls deferred.resolve())
    var onDone = function ( data, jqXHR ) {

      // Check that the content type (Login Package) is formatted correctly.
      if ( typeof data.content.user !== 'object'|| typeof data.content.additionalData !== 'object' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed login package.' }, jqXHR );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Login | " + JSON.stringify( data.content ) );
      }

      // Set the user object using the user data that was returned
      setUser( data.content.user, data.content.additionalData );

      // Store this identity to local storage, if that was requested.
      // [SECURITY NOTE 1] storeLocally should be set based on user input, by asking whether
      // the user is on a private computer or not. This is can be considered a tolerable
      // security risk as long as the user is on a private computer that they trust or manage
      // themselves. However, on a public machine this is probably a security risk, and the
      // user should be able to decline this convencience in favour of security, regardless
      // of whether they are on a public machine or not.
      if ( self.useLocalStorage ) {
        jQuery.jStorage.set( 'bridge-client-identity', JSON.stringify( {
          "email": email,
          "password": hashedPassword
        } ) );
        jQuery.jStorage.setTTL( 'bridge-client-identity', 86400000 ); // Expire in 1 day.
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data, jqXHR );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error, jqXHR ) {

      // Clear the user credentials, since they didn't work anyway.
      clearUser();

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Login | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its fail() handler.
      deferred.reject( error, jqXHR );

    };

    // This request uses an empty payload
    var payload = {};

    // Set whether or not the Bridge should store user credentials and Bridge configuration
    // to local storage.
    self.useLocalStorage = useLocalStorage;

    // Configure an Identity object with the user's credentials.
    setIdentity( email, hashedPassword, true );

    // Send the request
    requestPrivate( 'GET', 'login', payload, null ).done( onDone ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise();

  };

  // [PRIVATE] requestRecoverPasswordPrivate()
  // To be called by the page at the address which an account recovery email links the user
  // to. They will have entered their new password to an input field, and the email and hash will 
  // have been made available to the page in the query string of the URL.
  var requestRecoverPasswordPrivate = function ( email, password, hash ) {

    // Notify the user of the recover password call occurring.
    if ( typeof self.onRecoverPasswordCalled === "function" ) {
      self.onRecoverPasswordCalled( email, hash );
    }

    // Hash the user's password
    var hashedPassword = sha256( password ).toString( enc_hex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new jQuery.Deferred();

    // Build our internal success handler (this calls deferred.resolve())
    var onDone = function ( data, jqXHR ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' }, jqXHR );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Recover Password | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data, jqXHR );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error, jqXHR ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Recover Password | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its fail() handler.
      deferred.reject( error, jqXHR );

    };

    // Build the payload object to send with the request
    var payload = {
      "hash": hash,
      "password": hashedPassword
    };

    // Create a temporary an Identity object with a blank password.
    var tempIdentity = new Identity( email, '', true );

    // Send the request
    requestPrivate( 'POST', 'recover-password', payload, tempIdentity ).done( onDone ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise();

  };

  // [PRIVATE] requestRegisterPrivate()
  // Register in a user with the given email/password pair, name, and application-specific data.
  // This does creates an Identity object for the user to sign the registration request's HMAC,
  // however the password is transmitted in the content of the message (SHA-256 encrypted), so
  // theoretically an interceptor of this message could reconstruct the HMAC and falsify a request
  // to the server the request is made without using HTTPS protocol and given enough persistence
  // on the part of the attacker. 
  var requestRegisterPrivate = function ( email, password, firstName, lastName, appData ) {

    // Notify the user of the register call occurring.
    if ( typeof self.onRegisterCalled === "function" ) {
      self.onRegisterCalled( email, firstName, lastName, appData );
    }

    // Hash the user's password
    var hashedPassword = sha256( password ).toString( enc_hex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new jQuery.Deferred();

    // Build our internal success handler (this calls deferred.resolve())
    var onDone = function ( data, jqXHR ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' }, jqXHR );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Register | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data, jqXHR );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error, jqXHR ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Register | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its fail() handler.
      deferred.reject( error, jqXHR );

    };

    // Build the payload object to send with the request
    var payload = {
      "email": email,
      "password": hashedPassword,
      "first-name": firstName,
      "last-name": lastName,
      "app-data": appData
    };

    // Create a temporary an Identity object with a blank password.
    var tempIdentity = new Identity( email, '', true );

    // Send the request
    requestPrivate( 'PUT', 'register', payload, tempIdentity ).done( onDone ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise();

  };

  // [PRIVATE] requestVerifyEmailPrivate()
  // To be called by the page the at address which an email verification email links the user to.
  // The user will be sent to this page with their email and a hash in the query string of the URL.
  var requestVerifyEmailPrivate = function ( email, hash ) {

    // Notify the user of the verify email call occurring.
    if ( typeof self.onVerifyEmailCalled === "function" ) {
      self.onVerifyEmailCalled( email, hash );
    }

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new jQuery.Deferred();

    // Build our internal success handler (this calls deferred.resolve())
    var onDone = function ( data, jqXHR ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' }, jqXHR );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Verify Email | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data, jqXHR );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error, jqXHR ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Verify Email | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its fail() handler.
      deferred.reject( error, jqXHR );

    };

    // Build the payload object to send with the request
    var payload = {
      "hash": hash
    };

    // Create a temporary an Identity object with a blank password.
    var tempIdentity = new Identity( email, '', true );

    // Send the request
    requestPrivate( 'POST', 'verify-email', payload, tempIdentity ).done( onDone ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise();

  };

  // [PRIVATE] setIdentity()
  // Sets the current Identity object to a new instance given a user's email and password.
  var setIdentity = function ( email, password, dontHashPassword ) {

    identity = new Identity( email, password, dontHashPassword );

  };

  // [PRIVATE] setUser
  // Sets the current user and additional data objects based on the data returned from a login
  // and performs all of the associated error checks for malformed login data.
  var setUser = function ( user, additionalData ) {

    // Set the user and additional data objects
    self.user = user;
    self.additionalData = additionalData;

  };


  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // PUBLIC /////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////
  // PROPERTIES //
  ////////////////

  // [PUBLIC] additionalData
  // The a hashmap of optional objects returned by the the database that provide additional
  // information to be used for implementation-specific login needs.
  self.additionalData = null;

  // [PUBLIC] debug
  // If set to true, Bridge will log errors and warnings to the console when they occur.
  self.debug = false;

  // [PUBLIC] timeout
  // The timeout period for requests (in milliseconds).
  self.timeout = 10000;

  // [PUBLIC] url
  // The URL path to the API to be bridged. This URL must be written so that the final 
  // character is a forward-slash (e.g. https://peir.axoninteractive.ca/api/1.0/).
  self.url = '';

  // [PUBLIC] useLocalStorage
  // Whether or not user credentials and Bridge configuration will be persisted to local storage.
  self.useLocalStorage = false;

  // [PUBLIC] user
  // The User object returned by the the database relating to the current identity.
  self.user = null;


  ////////////
  // EVENTS //
  ////////////

  // [PUBLIC] onChangePasswordCalled()
  // The callback to call when the requestChangePassword() function is called.
  // Signature: function () {}
  self.onChangePasswordCalled = null;

  // [PUBLIC] onForgotPasswordCalled()
  // The callback to call when the requestForgotPassword() function is called.
  // Signature: function ( email ) {}
  self.onForgotPasswordCalled = null;

  // [PUBLIC] onLoginCalled()
  // The callback to call when the requestLogin() function is called.
  // Signature: function ( email, useLocalStorage ) {}
  self.onLoginCalled = null;

  // [PUBLIC] loginErrorCallback()
  // The callback to call when the logout() function is called.
  // Signature: function () {}
  self.onLogoutCalled = null;

  // [PUBLIC] onRecoverPasswordCalled()
  // The callback to call when the requestRecoverPassword() function is called.
  // Signature: function ( email, hash ) {}
  self.onRecoverPasswordCalled = null;

  // [PUBLIC] onRegisterCalled()
  // The callback to call when the requestRegister() function is called.
  // Signature: function ( email, firstName, lastName, appData ) {}
  self.onRegisterCalled = null;

  // [PUBLIC] requestCallback()
  // The callback to call when a request() call occurs, but before it is sent.
  // Signature: function ( method, resource, payload ) {}
  self.onRequestCalled = null;

  // [PUBLIC] onVerifyEmailCalled()
  // The callback to call when the requestVerifyEmail() function is called.
  // Signature: function ( email, hash ) {}
  self.onVerifyEmailCalled = null;


  //////////
  // INIT //
  //////////

  // [PUBLIC] init()
  // Configure theb Bridge with a new URL and timeout.
  self.init = function ( url, timeout ) {

    self.url = url;
    self.timeout = timeout;

  };


  ///////////////
  // FUNCTIONS //
  ///////////////

  // [PUBLIC] isErrorCodeResponse()
  // Returns an Error object if the provided jqXHR has a status code between 400 and 599
  // (inclusive). Since the 400 and 500 series status codes represent errors of various kinds,
  // this acts as a catch-all filter for common error cases to be handled by the client.
  // Returns null if the response status is not between 400 and 599 (inclusive).
  // Error format: { status: 404, message: "The resource you requested was not found." }
  self.isErrorCodeResponse = function ( jqXHR ) {

    // Return an Error object if the status code is between 400 and 599 (inclusive).
    if ( jqXHR.status >= 400 && jqXHR.status < 600 ) {

      switch ( jqXHR.status ) {
      case 400:
        return {
          status: 400,
          message: '400 (Bad Request) >> Your request was not formatted correctly.'
        };
      case 401:
        return {
          status: 401,
          message: '401 (Unauthorized) >> You do not have sufficient priveliges to perform this operation.'
        };
      case 403:
        return {
          status: 403,
          message: '403 (Forbidden) >> Your email and password do not match any user on file.'
        };
      case 404:
        return {
          status: 404,
          message: '404 (Not Found) >> The resource you requested does not exist.'
        };
      case 409:
        return {
          status: 409,
          message: '409 (Conflict) >> A unique database field matching your PUT may already exist.'
        };
      case 500:
        return {
          status: 500,
          message: '500 (Internal Server Error) >> An error has taken place in the Bridge server.'
        };
      case 503:
        return {
          status: 503,
          message: '503 (Service Unavailable) >> The Bridge server may be stopped.'
        };
      default:
        return {
          status: jqXHR.status,
          message: 'Error! Something went wrong!'
        };
      }
    }

    // Return null for no error code.
    return null;

  };

  // [PUBLIC] isLoggedIn()
  // Check if there is currently a user object set. If no user object is set, then none
  // was returned from the login attempt (and the user is still logged out) or the user 
  // logged out manually.
  self.isLoggedIn = function () {

    return ( self.user !== null );

  };

  // [PUBLIC] logout()
  // Set the user object to null and clear the Identity object user to sign requests for
  // authentication purposes, so that the logged-out user's credentials can't still be
  // user to authorize requests.
  self.logout = function () {

    // Delete the Identity object to preserve the user's password security.
    clearIdentity();

    // Clear the user so Bridge reports that it is logged out.
    clearUser();

    // Clear the identity from local storage to preserve the user's password security.
    // If no identity is stored, this will do nothing.
    jQuery.jStorage.deleteKey( 'bridge-client-identity' );

    // Notify the user of the logout action.
    if ( typeof self.onLogoutCalled === 'function' ) {
      self.onLogoutCalled();
    }

  };

  // [PUBLIC] request()
  // Sends an XHR request using jQuery.ajax() to the given API resource using the given 
  // HTTP method. The HTTP request body will be set to the JSON.stringify()ed request 
  // that is generated by the Identity object set to perform HMAC signing.
  // Returns a jQuery jqZHR object. See http://api.jquery.com/jQuery.ajax/#jqXHR.
  // If no Identity is set, sendRequest() returns null, indicating no request was sent.
  self.request = function ( method, resource, payload ) {

    return requestPrivate( method, resource, payload, null );

  };

  // [PUBLIC] requestChangePassword()
  // The public requestChangePassword() function used to hide requestChangePasswordPrivate().
  self.requestChangePassword = function ( oldPassword, newPassword ) {

    return requestChangePasswordPrivate( oldPassword, newPassword );

  };

  // [PUBLIC] requestForgotPassword()
  // The public requestForgotPassword() function used to hide requestForgotPasswordPrivate().
  self.requestForgotPassword = function ( email ) {

    return requestForgotPasswordPrivate( email );

  };

  // [PUBLIC] requestLogin()
  // The public requestLogin() function used to hide requestLoginPrivate().
  self.requestLogin = function ( email, password, useLocalStorage ) {

    return requestLoginPrivate( email, password, useLocalStorage, false );

  };

  // [PUBLIC] requestLoginStoredIdentity()
  // Checks the browser's local storage for an existing user and performs a login request
  // using the stored credentials if one is found. Returns a jQuery Deferred object if a login 
  // request was sent and null if no stored identity was found / login request was sent.
  self.requestLoginStoredIdentity = function () {

    // Check if an identity is in local storage to use for authentication.
    var storedIdentity = jQuery.jStorage.get( 'bridge-client-identity', null );
    if ( storedIdentity !== null ) {

      var parsedIdentity = JSON.parse( storedIdentity );

      if ( self.debug === true ) {
        console.log( "Stoed identity: " + JSON.stringify( parsedIdentity ) );
      }

      // Send a login request using the private login call and return the deferred object
      return requestLoginPrivate( parsedIdentity.email, parsedIdentity.password, true, true );

    }

    // No login request was sent, so return null.
    return null;

  };

  // [PUBLIC] requestRecoverPassword()
  // The public requestRecoverPassword() function used to hide requestRecoverPasswordPrivate().
  self.requestRecoverPassword = function ( email, password, hash ) {

    requestRecoverPasswordPrivate( email, password, hash );

  };

  // [PUBLIC] requestRegister()
  // The public requestRegister() function used to hide requestRegisterPrivate().
  self.requestRegister = function ( email, password, firstName, lastName, appData ) {

    return requestRegisterPrivate( email, password, firstName, lastName, appData );

  };

  // [PUBLIC] requestVerifyEmail()
  // The public requestVerifyEmail() function used to hide requestVerifyEmailPrivate().
  self.requestVerifyEmail = function ( email, hash ) {

    return requestVerifyEmailPrivate( email, hash );

  };

  return self;

};