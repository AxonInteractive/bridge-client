!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Bridge=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
// Include dependencies
var json3 = _dereq_( './include/json3' );
var jstorage = _dereq_( './include/jstorage' );
var sha256 = _dereq_( './include/sha256' );
var Identity = _dereq_( './Identity' );

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
    var oldHashedPassword = CryptoJS.SHA256( oldPassword ).toString( CryptoJS.enc.Hex );
    var newHashedPassword = CryptoJS.SHA256( newPassword ).toString( CryptoJS.enc.Hex );

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
      CryptoJS.SHA256( password )
      .toString( CryptoJS.enc.Hex );

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
    var hashedPassword = CryptoJS.SHA256( password ).toString( CryptoJS.enc.Hex );

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
    var hashedPassword = CryptoJS.SHA256( password ).toString( CryptoJS.enc.Hex );

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
},{"./Identity":2,"./include/json3":4,"./include/jstorage":5,"./include/sha256":6}],2:[function(_dereq_,module,exports){
// Include dependencies
var hmac_sha256 = _dereq_( './include/hmac-sha256' );
var json3 = _dereq_( './include/json3' );
var sha256 = _dereq_( './include/sha256' );

// [Identity Constructor]
// The Identity object represents an email/password pair used as identification with the
// database to provide authenication for requests. The Identity is used as a request factory
// to create requests that will authenticate the with the server securely.
module.exports = function ( email, password, dontHashPassword ) {

  'use strict';

  // The object to be returned from the factory
  var self = {};

  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // PRIVATE ////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////
  // PROPERTIES //
  ////////////////

  // [PRIVATE] hashedPassword
  // The SHA-256 encoded string generated by hashing the given password. 
  // [SECURITY NOTE 1] By hashing the password we store in memory and keeping it local to 
  // this function, we protect the user's password from scrutiny from other local applications.
  // The password supplied as a constructor argument will also be nulled so that it is not kept 
  // in application memory either, so that the original password information is lost.
  // [SECURITY NOTE 4] If dontHashPassword is set to true, this hashing process is skipped. This 
  // feature exists to allow passwords stored in local storage to be used for authentication, since 
  // they have already been hased in this way. DO NOT USE THIS FOR ANYTHING ELSE!
  var hashedPassword = ( dontHashPassword === true ) ? password : 
    CryptoJS.SHA256( password ).toString( CryptoJS.enc.Hex );

  // [SECURITY NOTE 2] The user's given password should be forgotten once it has been hashed.
  // Although the password is local to this constructor, it is better that it not even be 
  // available in memory once it has been hashed, since the hashed password is much more 
  // difficult to recover in its original form.
  password = null;


  ///////////////
  // FUNCTIONS //
  ///////////////

  // [PRIVATE] hmacSignRequestBody()
  // Returns the given request object after adding the "hmac" property to it and setting "hmac" 
  // by using the user's password as a SHA-256 HMAC hashing secret.
  // [SECURITY NOTE 3] The HMAC string is a hex value, 64 characters in length. It is created 
  // by concatenating the JSON.stringify()ed request content, the request email, and the request 
  // time together, and hashing the result using hashedPassword as a salt. 
  //
  // Pseudocode:
  // toHash = Request Content JSON + Request Email + Request Time JSON
  // salt = hashedPassword
  // hmacString = sha256( toHash, salt )
  // request.hmac = hmacString
  // 
  // By performing the same operation on the data, the server can confirm that the HMAC strings 
  // are identical and authorize the request.
  var hmacSignRequestBody = function ( reqBody ) {

    // Create the concatenated string to be hashed as the HMAC
    var content = JSON.stringify( reqBody.content );
    var email = reqBody.email;
    var time = reqBody.time.toISOString();
    var concat = content + email + time;

    // Add the 'hmac' property to the request with a value computed by salting the concat with the
    // user's hashedPassword.
    // [CAREFUL] hashedPassword should be a string. If it isn't, terrible things WILL happen!
    reqBody.hmac = CryptoJS.HmacSHA256( concat, hashedPassword ).toString( CryptoJS.enc.Hex );

    if ( Bridge.debug === true ) {
      console.log( '=== HMAC Signing Process ===' );
      console.log( 'Hashpass: "' + hashedPassword + '"' );
      console.log( 'Content: "' + content + '"' );
      console.log( 'Email: "' + email + '"' );
      console.log( 'Time: "' + time + '"' );
      console.log( 'Concat: "' + concat + '"' );
      console.log( 'HMAC: "' + reqBody.hmac + '"' );
      console.log( '============================' );
    }

    return reqBody;

  };


  ///////////////////////////////////////////////////////////////////////////////////////////////////
  // PUBLIC /////////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////
  // PROPERTIES //
  ////////////////

  // [PUBLIC] email
  // The email used to identify the user within the database.
  self.email = email;


  ///////////////
  // FUNCTIONS //
  ///////////////

  // [PUBLIC] createRequest()
  // Returns a new request, given the content payload of the request as an object. Utilizes
  // hmacSignRequest() to wrap the given payload in an appropriate header to validate against the
  // server-side authorization scheme (assuming the user credentials are correct).
  self.createRequest = function ( payload ) {

    return hmacSignRequestBody( {
      'content': payload,
      'email': email,
      'time': new Date()
    } );

  };

  return self;

};
},{"./include/hmac-sha256":3,"./include/json3":4,"./include/sha256":6}],3:[function(_dereq_,module,exports){
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(h,s){var f={},g=f.lib={},q=function(){},m=g.Base={extend:function(a){q.prototype=this;var c=new q;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
r=g.WordArray=m.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=s?c:4*a.length},toString:function(a){return(a||k).stringify(this)},concat:function(a){var c=this.words,d=a.words,b=this.sigBytes;a=a.sigBytes;this.clamp();if(b%4)for(var e=0;e<a;e++)c[b+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((b+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)c[b+e>>>2]=d[e>>>2];else c.push.apply(c,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
32-8*(c%4);a.length=h.ceil(c/4)},clone:function(){var a=m.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],d=0;d<a;d+=4)c.push(4294967296*h.random()|0);return new r.init(c,a)}}),l=f.enc={},k=l.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++){var e=c[b>>>2]>>>24-8*(b%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b+=2)d[b>>>3]|=parseInt(a.substr(b,
2),16)<<24-4*(b%8);return new r.init(d,c/2)}},n=l.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++)d.push(String.fromCharCode(c[b>>>2]>>>24-8*(b%4)&255));return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b++)d[b>>>2]|=(a.charCodeAt(b)&255)<<24-8*(b%4);return new r.init(d,c)}},j=l.Utf8={stringify:function(a){try{return decodeURIComponent(escape(n.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return n.parse(unescape(encodeURIComponent(a)))}},
u=g.BufferedBlockAlgorithm=m.extend({reset:function(){this._data=new r.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=j.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,d=c.words,b=c.sigBytes,e=this.blockSize,f=b/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;b=h.min(4*a,b);if(a){for(var g=0;g<a;g+=e)this._doProcessBlock(d,g);g=d.splice(0,a);c.sigBytes-=b}return new r.init(g,b)},clone:function(){var a=m.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});g.Hasher=u.extend({cfg:m.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){u.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,d){return(new a.init(d)).finalize(c)}},_createHmacHelper:function(a){return function(c,d){return(new t.HMAC.init(a,
d)).finalize(c)}}});var t=f.algo={};return f}(Math);
(function(h){for(var s=CryptoJS,f=s.lib,g=f.WordArray,q=f.Hasher,f=s.algo,m=[],r=[],l=function(a){return 4294967296*(a-(a|0))|0},k=2,n=0;64>n;){var j;a:{j=k;for(var u=h.sqrt(j),t=2;t<=u;t++)if(!(j%t)){j=!1;break a}j=!0}j&&(8>n&&(m[n]=l(h.pow(k,0.5))),r[n]=l(h.pow(k,1/3)),n++);k++}var a=[],f=f.SHA256=q.extend({_doReset:function(){this._hash=new g.init(m.slice(0))},_doProcessBlock:function(c,d){for(var b=this._hash.words,e=b[0],f=b[1],g=b[2],j=b[3],h=b[4],m=b[5],n=b[6],q=b[7],p=0;64>p;p++){if(16>p)a[p]=
c[d+p]|0;else{var k=a[p-15],l=a[p-2];a[p]=((k<<25|k>>>7)^(k<<14|k>>>18)^k>>>3)+a[p-7]+((l<<15|l>>>17)^(l<<13|l>>>19)^l>>>10)+a[p-16]}k=q+((h<<26|h>>>6)^(h<<21|h>>>11)^(h<<7|h>>>25))+(h&m^~h&n)+r[p]+a[p];l=((e<<30|e>>>2)^(e<<19|e>>>13)^(e<<10|e>>>22))+(e&f^e&g^f&g);q=n;n=m;m=h;h=j+k|0;j=g;g=f;f=e;e=k+l|0}b[0]=b[0]+e|0;b[1]=b[1]+f|0;b[2]=b[2]+g|0;b[3]=b[3]+j|0;b[4]=b[4]+h|0;b[5]=b[5]+m|0;b[6]=b[6]+n|0;b[7]=b[7]+q|0},_doFinalize:function(){var a=this._data,d=a.words,b=8*this._nDataBytes,e=8*a.sigBytes;
d[e>>>5]|=128<<24-e%32;d[(e+64>>>9<<4)+14]=h.floor(b/4294967296);d[(e+64>>>9<<4)+15]=b;a.sigBytes=4*d.length;this._process();return this._hash},clone:function(){var a=q.clone.call(this);a._hash=this._hash.clone();return a}});s.SHA256=q._createHelper(f);s.HmacSHA256=q._createHmacHelper(f)})(Math);
(function(){var h=CryptoJS,s=h.enc.Utf8;h.algo.HMAC=h.lib.Base.extend({init:function(f,g){f=this._hasher=new f.init;"string"==typeof g&&(g=s.parse(g));var h=f.blockSize,m=4*h;g.sigBytes>m&&(g=f.finalize(g));g.clamp();for(var r=this._oKey=g.clone(),l=this._iKey=g.clone(),k=r.words,n=l.words,j=0;j<h;j++)k[j]^=1549556828,n[j]^=909522486;r.sigBytes=l.sigBytes=m;this.reset()},reset:function(){var f=this._hasher;f.reset();f.update(this._iKey)},update:function(f){this._hasher.update(f);return this},finalize:function(f){var g=
this._hasher;f=g.finalize(f);g.reset();return g.finalize(this._oKey.clone().concat(f))}})})();

},{}],4:[function(_dereq_,module,exports){
(function (global){
/*! JSON v3.3.1 | http://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org */
;(function () {
  // Detect the `define` function exposed by asynchronous module loaders. The
  // strict `define` check is necessary for compatibility with `r.js`.
  var isLoader = typeof define === "function" && define.amd;

  // A set of types used to distinguish objects from primitives.
  var objectTypes = {
    "function": true,
    "object": true
  };

  // Detect the `exports` object exposed by CommonJS implementations.
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

  // Use the `global` object exposed by Node (including Browserify via
  // `insert-module-globals`), Narwhal, and Ringo as the default context,
  // and the `window` object in browsers. Rhino exports a `global` function
  // instead.
  var root = objectTypes[typeof window] && window || this,
      freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

  if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
    root = freeGlobal;
  }

  // Public: Initializes JSON 3 using the given `context` object, attaching the
  // `stringify` and `parse` functions to the specified `exports` object.
  function runInContext(context, exports) {
    context || (context = root["Object"]());
    exports || (exports = root["Object"]());

    // Native constructor aliases.
    var Number = context["Number"] || root["Number"],
        String = context["String"] || root["String"],
        Object = context["Object"] || root["Object"],
        Date = context["Date"] || root["Date"],
        SyntaxError = context["SyntaxError"] || root["SyntaxError"],
        TypeError = context["TypeError"] || root["TypeError"],
        Math = context["Math"] || root["Math"],
        nativeJSON = context["JSON"] || root["JSON"];

    // Delegate to the native `stringify` and `parse` implementations.
    if (typeof nativeJSON == "object" && nativeJSON) {
      exports.stringify = nativeJSON.stringify;
      exports.parse = nativeJSON.parse;
    }

    // Convenience aliases.
    var objectProto = Object.prototype,
        getClass = objectProto.toString,
        isProperty, forEach, undef;

    // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
    var isExtended = new Date(-3509827334573292);
    try {
      // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
      // results for certain dates in Opera >= 10.53.
      isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
        // Safari < 2.0.2 stores the internal millisecond time value correctly,
        // but clips the values returned by the date methods to the range of
        // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
        isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
    } catch (exception) {}

    // Internal: Determines whether the native `JSON.stringify` and `parse`
    // implementations are spec-compliant. Based on work by Ken Snyder.
    function has(name) {
      if (has[name] !== undef) {
        // Return cached feature test result.
        return has[name];
      }
      var isSupported;
      if (name == "bug-string-char-index") {
        // IE <= 7 doesn't support accessing string characters using square
        // bracket notation. IE 8 only supports this for primitives.
        isSupported = "a"[0] != "a";
      } else if (name == "json") {
        // Indicates whether both `JSON.stringify` and `JSON.parse` are
        // supported.
        isSupported = has("json-stringify") && has("json-parse");
      } else {
        var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
        // Test `JSON.stringify`.
        if (name == "json-stringify") {
          var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
          if (stringifySupported) {
            // A test function object with a custom `toJSON` method.
            (value = function () {
              return 1;
            }).toJSON = value;
            try {
              stringifySupported =
                // Firefox 3.1b1 and b2 serialize string, number, and boolean
                // primitives as object literals.
                stringify(0) === "0" &&
                // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                // literals.
                stringify(new Number()) === "0" &&
                stringify(new String()) == '""' &&
                // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                // does not define a canonical JSON representation (this applies to
                // objects with `toJSON` properties as well, *unless* they are nested
                // within an object or array).
                stringify(getClass) === undef &&
                // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                // FF 3.1b3 pass this test.
                stringify(undef) === undef &&
                // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                // respectively, if the value is omitted entirely.
                stringify() === undef &&
                // FF 3.1b1, 2 throw an error if the given value is not a number,
                // string, array, object, Boolean, or `null` literal. This applies to
                // objects with custom `toJSON` methods as well, unless they are nested
                // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                // methods entirely.
                stringify(value) === "1" &&
                stringify([value]) == "[1]" &&
                // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                // `"[null]"`.
                stringify([undef]) == "[null]" &&
                // YUI 3.0.0b1 fails to serialize `null` literals.
                stringify(null) == "null" &&
                // FF 3.1b1, 2 halts serialization if an array contains a function:
                // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                // elides non-JSON values from objects and arrays, unless they
                // define custom `toJSON` methods.
                stringify([undef, getClass, null]) == "[null,null,null]" &&
                // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                // where character escape codes are expected (e.g., `\b` => `\u0008`).
                stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                stringify(null, value) === "1" &&
                stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                // serialize extended years.
                stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                // The milliseconds are optional in ES 5, but required in 5.1.
                stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                // four-digit years instead of six-digit years. Credits: @Yaffle.
                stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                // values less than 1000. Credits: @Yaffle.
                stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
            } catch (exception) {
              stringifySupported = false;
            }
          }
          isSupported = stringifySupported;
        }
        // Test `JSON.parse`.
        if (name == "json-parse") {
          var parse = exports.parse;
          if (typeof parse == "function") {
            try {
              // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
              // Conforming implementations should also coerce the initial argument to
              // a string prior to parsing.
              if (parse("0") === 0 && !parse(false)) {
                // Simple parsing test.
                value = parse(serialized);
                var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                if (parseSupported) {
                  try {
                    // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                    parseSupported = !parse('"\t"');
                  } catch (exception) {}
                  if (parseSupported) {
                    try {
                      // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                      // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                      // certain octal literals.
                      parseSupported = parse("01") !== 1;
                    } catch (exception) {}
                  }
                  if (parseSupported) {
                    try {
                      // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                      // points. These environments, along with FF 3.1b1 and 2,
                      // also allow trailing commas in JSON objects and arrays.
                      parseSupported = parse("1.") !== 1;
                    } catch (exception) {}
                  }
                }
              }
            } catch (exception) {
              parseSupported = false;
            }
          }
          isSupported = parseSupported;
        }
      }
      return has[name] = !!isSupported;
    }

    if (!has("json")) {
      // Common `[[Class]]` name aliases.
      var functionClass = "[object Function]",
          dateClass = "[object Date]",
          numberClass = "[object Number]",
          stringClass = "[object String]",
          arrayClass = "[object Array]",
          booleanClass = "[object Boolean]";

      // Detect incomplete support for accessing string characters by index.
      var charIndexBuggy = has("bug-string-char-index");

      // Define additional utility methods if the `Date` methods are buggy.
      if (!isExtended) {
        var floor = Math.floor;
        // A mapping between the months of the year and the number of days between
        // January 1st and the first of the respective month.
        var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        // Internal: Calculates the number of days between the Unix epoch and the
        // first day of the given month.
        var getDay = function (year, month) {
          return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
        };
      }

      // Internal: Determines if a property is a direct property of the given
      // object. Delegates to the native `Object#hasOwnProperty` method.
      if (!(isProperty = objectProto.hasOwnProperty)) {
        isProperty = function (property) {
          var members = {}, constructor;
          if ((members.__proto__ = null, members.__proto__ = {
            // The *proto* property cannot be set multiple times in recent
            // versions of Firefox and SeaMonkey.
            "toString": 1
          }, members).toString != getClass) {
            // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
            // supports the mutable *proto* property.
            isProperty = function (property) {
              // Capture and break the objectgs prototype chain (see section 8.6.2
              // of the ES 5.1 spec). The parenthesized expression prevents an
              // unsafe transformation by the Closure Compiler.
              var original = this.__proto__, result = property in (this.__proto__ = null, this);
              // Restore the original prototype chain.
              this.__proto__ = original;
              return result;
            };
          } else {
            // Capture a reference to the top-level `Object` constructor.
            constructor = members.constructor;
            // Use the `constructor` property to simulate `Object#hasOwnProperty` in
            // other environments.
            isProperty = function (property) {
              var parent = (this.constructor || constructor).prototype;
              return property in this && !(property in parent && this[property] === parent[property]);
            };
          }
          members = null;
          return isProperty.call(this, property);
        };
      }

      // Internal: Normalizes the `for...in` iteration algorithm across
      // environments. Each enumerated key is yielded to a `callback` function.
      forEach = function (object, callback) {
        var size = 0, Properties, members, property;

        // Tests for bugs in the current environment's `for...in` algorithm. The
        // `valueOf` property inherits the non-enumerable flag from
        // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
        (Properties = function () {
          this.valueOf = 0;
        }).prototype.valueOf = 0;

        // Iterate over a new instance of the `Properties` class.
        members = new Properties();
        for (property in members) {
          // Ignore all properties inherited from `Object.prototype`.
          if (isProperty.call(members, property)) {
            size++;
          }
        }
        Properties = members = null;

        // Normalize the iteration algorithm.
        if (!size) {
          // A list of non-enumerable properties inherited from `Object.prototype`.
          members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
          // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
          // properties.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, length;
            var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
            for (property in object) {
              // Gecko <= 1.0 enumerates the `prototype` property of functions under
              // certain conditions; IE does not.
              if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                callback(property);
              }
            }
            // Manually invoke the callback for each non-enumerable property.
            for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
          };
        } else if (size == 2) {
          // Safari <= 2.0.4 enumerates shadowed properties twice.
          forEach = function (object, callback) {
            // Create a set of iterated properties.
            var members = {}, isFunction = getClass.call(object) == functionClass, property;
            for (property in object) {
              // Store each property name to prevent double enumeration. The
              // `prototype` property of functions is not enumerated due to cross-
              // environment inconsistencies.
              if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                callback(property);
              }
            }
          };
        } else {
          // No bugs detected; use the standard `for...in` algorithm.
          forEach = function (object, callback) {
            var isFunction = getClass.call(object) == functionClass, property, isConstructor;
            for (property in object) {
              if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                callback(property);
              }
            }
            // Manually invoke the callback for the `constructor` property due to
            // cross-environment inconsistencies.
            if (isConstructor || isProperty.call(object, (property = "constructor"))) {
              callback(property);
            }
          };
        }
        return forEach(object, callback);
      };

      // Public: Serializes a JavaScript `value` as a JSON string. The optional
      // `filter` argument may specify either a function that alters how object and
      // array members are serialized, or an array of strings and numbers that
      // indicates which properties should be serialized. The optional `width`
      // argument may be either a string or number that specifies the indentation
      // level of the output.
      if (!has("json-stringify")) {
        // Internal: A map of control characters and their escaped equivalents.
        var Escapes = {
          92: "\\\\",
          34: '\\"',
          8: "\\b",
          12: "\\f",
          10: "\\n",
          13: "\\r",
          9: "\\t"
        };

        // Internal: Converts `value` into a zero-padded string such that its
        // length is at least equal to `width`. The `width` must be <= 6.
        var leadingZeroes = "000000";
        var toPaddedString = function (width, value) {
          // The `|| 0` expression is necessary to work around a bug in
          // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
          return (leadingZeroes + (value || 0)).slice(-width);
        };

        // Internal: Double-quotes a string `value`, replacing all ASCII control
        // characters (characters with code unit values between 0 and 31) with
        // their escaped equivalents. This is an implementation of the
        // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
        var unicodePrefix = "\\u00";
        var quote = function (value) {
          var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
          var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
          for (; index < length; index++) {
            var charCode = value.charCodeAt(index);
            // If the character is a control character, append its Unicode or
            // shorthand escape sequence; otherwise, append the character as-is.
            switch (charCode) {
              case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                result += Escapes[charCode];
                break;
              default:
                if (charCode < 32) {
                  result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                  break;
                }
                result += useCharIndex ? symbols[index] : value.charAt(index);
            }
          }
          return result + '"';
        };

        // Internal: Recursively serializes an object. Implements the
        // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
        var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
          var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;
          try {
            // Necessary for host object support.
            value = object[property];
          } catch (exception) {}
          if (typeof value == "object" && value) {
            className = getClass.call(value);
            if (className == dateClass && !isProperty.call(value, "toJSON")) {
              if (value > -1 / 0 && value < 1 / 0) {
                // Dates are serialized according to the `Date#toJSON` method
                // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                // for the ISO 8601 date time string format.
                if (getDay) {
                  // Manually compute the year, month, date, hours, minutes,
                  // seconds, and milliseconds if the `getUTC*` methods are
                  // buggy. Adapted from @Yaffle's `date-shim` project.
                  date = floor(value / 864e5);
                  for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                  for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                  date = 1 + date - getDay(year, month);
                  // The `time` value specifies the time within the day (see ES
                  // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                  // to compute `A modulo B`, as the `%` operator does not
                  // correspond to the `modulo` operation for negative numbers.
                  time = (value % 864e5 + 864e5) % 864e5;
                  // The hours, minutes, seconds, and milliseconds are obtained by
                  // decomposing the time within the day. See section 15.9.1.10.
                  hours = floor(time / 36e5) % 24;
                  minutes = floor(time / 6e4) % 60;
                  seconds = floor(time / 1e3) % 60;
                  milliseconds = time % 1e3;
                } else {
                  year = value.getUTCFullYear();
                  month = value.getUTCMonth();
                  date = value.getUTCDate();
                  hours = value.getUTCHours();
                  minutes = value.getUTCMinutes();
                  seconds = value.getUTCSeconds();
                  milliseconds = value.getUTCMilliseconds();
                }
                // Serialize extended years correctly.
                value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                  "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                  // Months, dates, hours, minutes, and seconds should have two
                  // digits; milliseconds should have three.
                  "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                  // Milliseconds are optional in ES 5.0, but required in 5.1.
                  "." + toPaddedString(3, milliseconds) + "Z";
              } else {
                value = null;
              }
            } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
              // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
              // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
              // ignores all `toJSON` methods on these objects unless they are
              // defined directly on an instance.
              value = value.toJSON(property);
            }
          }
          if (callback) {
            // If a replacement function was provided, call it to obtain the value
            // for serialization.
            value = callback.call(object, property, value);
          }
          if (value === null) {
            return "null";
          }
          className = getClass.call(value);
          if (className == booleanClass) {
            // Booleans are represented literally.
            return "" + value;
          } else if (className == numberClass) {
            // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
            // `"null"`.
            return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
          } else if (className == stringClass) {
            // Strings are double-quoted and escaped.
            return quote("" + value);
          }
          // Recursively serialize objects and arrays.
          if (typeof value == "object") {
            // Check for cyclic structures. This is a linear search; performance
            // is inversely proportional to the number of unique nested objects.
            for (length = stack.length; length--;) {
              if (stack[length] === value) {
                // Cyclic structures cannot be serialized by `JSON.stringify`.
                throw TypeError();
              }
            }
            // Add the object to the stack of traversed objects.
            stack.push(value);
            results = [];
            // Save the current indentation level and indent one additional level.
            prefix = indentation;
            indentation += whitespace;
            if (className == arrayClass) {
              // Recursively serialize array elements.
              for (index = 0, length = value.length; index < length; index++) {
                element = serialize(index, value, callback, properties, whitespace, indentation, stack);
                results.push(element === undef ? "null" : element);
              }
              result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
            } else {
              // Recursively serialize object members. Members are selected from
              // either a user-specified list of property names, or the object
              // itself.
              forEach(properties || value, function (property) {
                var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
                if (element !== undef) {
                  // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                  // is not the empty string, let `member` {quote(property) + ":"}
                  // be the concatenation of `member` and the `space` character."
                  // The "`space` character" refers to the literal space
                  // character, not the `space` {width} argument provided to
                  // `JSON.stringify`.
                  results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
                }
              });
              result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
            }
            // Remove the object from the traversed object stack.
            stack.pop();
            return result;
          }
        };

        // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
        exports.stringify = function (source, filter, width) {
          var whitespace, callback, properties, className;
          if (objectTypes[typeof filter] && filter) {
            if ((className = getClass.call(filter)) == functionClass) {
              callback = filter;
            } else if (className == arrayClass) {
              // Convert the property names array into a makeshift set.
              properties = {};
              for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
            }
          }
          if (width) {
            if ((className = getClass.call(width)) == numberClass) {
              // Convert the `width` to an integer and create a string containing
              // `width` number of space characters.
              if ((width -= width % 1) > 0) {
                for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
              }
            } else if (className == stringClass) {
              whitespace = width.length <= 10 ? width : width.slice(0, 10);
            }
          }
          // Opera <= 7.54u2 discards the values associated with empty string keys
          // (`""`) only if they are used directly within an object member list
          // (e.g., `!("" in { "": 1})`).
          return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
        };
      }

      // Public: Parses a JSON source string.
      if (!has("json-parse")) {
        var fromCharCode = String.fromCharCode;

        // Internal: A map of escaped control characters and their unescaped
        // equivalents.
        var Unescapes = {
          92: "\\",
          34: '"',
          47: "/",
          98: "\b",
          116: "\t",
          110: "\n",
          102: "\f",
          114: "\r"
        };

        // Internal: Stores the parser state.
        var Index, Source;

        // Internal: Resets the parser state and throws a `SyntaxError`.
        var abort = function () {
          Index = Source = null;
          throw SyntaxError();
        };

        // Internal: Returns the next token, or `"$"` if the parser has reached
        // the end of the source string. A token may be a string, number, `null`
        // literal, or Boolean literal.
        var lex = function () {
          var source = Source, length = source.length, value, begin, position, isSigned, charCode;
          while (Index < length) {
            charCode = source.charCodeAt(Index);
            switch (charCode) {
              case 9: case 10: case 13: case 32:
                // Skip whitespace tokens, including tabs, carriage returns, line
                // feeds, and space characters.
                Index++;
                break;
              case 123: case 125: case 91: case 93: case 58: case 44:
                // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                // the current position.
                value = charIndexBuggy ? source.charAt(Index) : source[Index];
                Index++;
                return value;
              case 34:
                // `"` delimits a JSON string; advance to the next character and
                // begin parsing the string. String tokens are prefixed with the
                // sentinel `@` character to distinguish them from punctuators and
                // end-of-string tokens.
                for (value = "@", Index++; Index < length;) {
                  charCode = source.charCodeAt(Index);
                  if (charCode < 32) {
                    // Unescaped ASCII control characters (those with a code unit
                    // less than the space character) are not permitted.
                    abort();
                  } else if (charCode == 92) {
                    // A reverse solidus (`\`) marks the beginning of an escaped
                    // control character (including `"`, `\`, and `/`) or Unicode
                    // escape sequence.
                    charCode = source.charCodeAt(++Index);
                    switch (charCode) {
                      case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                        // Revive escaped control characters.
                        value += Unescapes[charCode];
                        Index++;
                        break;
                      case 117:
                        // `\u` marks the beginning of a Unicode escape sequence.
                        // Advance to the first character and validate the
                        // four-digit code point.
                        begin = ++Index;
                        for (position = Index + 4; Index < position; Index++) {
                          charCode = source.charCodeAt(Index);
                          // A valid sequence comprises four hexdigits (case-
                          // insensitive) that form a single hexadecimal value.
                          if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                            // Invalid Unicode escape sequence.
                            abort();
                          }
                        }
                        // Revive the escaped character.
                        value += fromCharCode("0x" + source.slice(begin, Index));
                        break;
                      default:
                        // Invalid escape sequence.
                        abort();
                    }
                  } else {
                    if (charCode == 34) {
                      // An unescaped double-quote character marks the end of the
                      // string.
                      break;
                    }
                    charCode = source.charCodeAt(Index);
                    begin = Index;
                    // Optimize for the common case where a string is valid.
                    while (charCode >= 32 && charCode != 92 && charCode != 34) {
                      charCode = source.charCodeAt(++Index);
                    }
                    // Append the string as-is.
                    value += source.slice(begin, Index);
                  }
                }
                if (source.charCodeAt(Index) == 34) {
                  // Advance to the next character and return the revived string.
                  Index++;
                  return value;
                }
                // Unterminated string.
                abort();
              default:
                // Parse numbers and literals.
                begin = Index;
                // Advance past the negative sign, if one is specified.
                if (charCode == 45) {
                  isSigned = true;
                  charCode = source.charCodeAt(++Index);
                }
                // Parse an integer or floating-point value.
                if (charCode >= 48 && charCode <= 57) {
                  // Leading zeroes are interpreted as octal literals.
                  if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                    // Illegal octal literal.
                    abort();
                  }
                  isSigned = false;
                  // Parse the integer component.
                  for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                  // Floats cannot contain a leading decimal point; however, this
                  // case is already accounted for by the parser.
                  if (source.charCodeAt(Index) == 46) {
                    position = ++Index;
                    // Parse the decimal component.
                    for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal trailing decimal.
                      abort();
                    }
                    Index = position;
                  }
                  // Parse exponents. The `e` denoting the exponent is
                  // case-insensitive.
                  charCode = source.charCodeAt(Index);
                  if (charCode == 101 || charCode == 69) {
                    charCode = source.charCodeAt(++Index);
                    // Skip past the sign following the exponent, if one is
                    // specified.
                    if (charCode == 43 || charCode == 45) {
                      Index++;
                    }
                    // Parse the exponential component.
                    for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                    if (position == Index) {
                      // Illegal empty exponent.
                      abort();
                    }
                    Index = position;
                  }
                  // Coerce the parsed value to a JavaScript number.
                  return +source.slice(begin, Index);
                }
                // A negative sign may only precede numbers.
                if (isSigned) {
                  abort();
                }
                // `true`, `false`, and `null` literals.
                if (source.slice(Index, Index + 4) == "true") {
                  Index += 4;
                  return true;
                } else if (source.slice(Index, Index + 5) == "false") {
                  Index += 5;
                  return false;
                } else if (source.slice(Index, Index + 4) == "null") {
                  Index += 4;
                  return null;
                }
                // Unrecognized token.
                abort();
            }
          }
          // Return the sentinel `$` character if the parser has reached the end
          // of the source string.
          return "$";
        };

        // Internal: Parses a JSON `value` token.
        var get = function (value) {
          var results, hasMembers;
          if (value == "$") {
            // Unexpected end of input.
            abort();
          }
          if (typeof value == "string") {
            if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
              // Remove the sentinel `@` character.
              return value.slice(1);
            }
            // Parse object and array literals.
            if (value == "[") {
              // Parses a JSON array, returning a new JavaScript array.
              results = [];
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing square bracket marks the end of the array literal.
                if (value == "]") {
                  break;
                }
                // If the array literal contains elements, the current token
                // should be a comma separating the previous element from the
                // next.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "]") {
                      // Unexpected trailing `,` in array literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each array element.
                    abort();
                  }
                }
                // Elisions and leading commas are not permitted.
                if (value == ",") {
                  abort();
                }
                results.push(get(value));
              }
              return results;
            } else if (value == "{") {
              // Parses a JSON object, returning a new JavaScript object.
              results = {};
              for (;; hasMembers || (hasMembers = true)) {
                value = lex();
                // A closing curly brace marks the end of the object literal.
                if (value == "}") {
                  break;
                }
                // If the object literal contains members, the current token
                // should be a comma separator.
                if (hasMembers) {
                  if (value == ",") {
                    value = lex();
                    if (value == "}") {
                      // Unexpected trailing `,` in object literal.
                      abort();
                    }
                  } else {
                    // A `,` must separate each object member.
                    abort();
                  }
                }
                // Leading commas are not permitted, object property names must be
                // double-quoted strings, and a `:` must separate each property
                // name and value.
                if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                  abort();
                }
                results[value.slice(1)] = get(lex());
              }
              return results;
            }
            // Unexpected token encountered.
            abort();
          }
          return value;
        };

        // Internal: Updates a traversed object member.
        var update = function (source, property, callback) {
          var element = walk(source, property, callback);
          if (element === undef) {
            delete source[property];
          } else {
            source[property] = element;
          }
        };

        // Internal: Recursively traverses a parsed JSON object, invoking the
        // `callback` function for each value. This is an implementation of the
        // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
        var walk = function (source, property, callback) {
          var value = source[property], length;
          if (typeof value == "object" && value) {
            // `forEach` can't be used to traverse an array in Opera <= 8.54
            // because its `Object#hasOwnProperty` implementation returns `false`
            // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            if (getClass.call(value) == arrayClass) {
              for (length = value.length; length--;) {
                update(value, length, callback);
              }
            } else {
              forEach(value, function (property) {
                update(value, property, callback);
              });
            }
          }
          return callback.call(source, property, value);
        };

        // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
        exports.parse = function (source, callback) {
          var result, value;
          Index = 0;
          Source = "" + source;
          result = get(lex());
          // If a JSON string contains multiple tokens, it is invalid.
          if (lex() != "$") {
            abort();
          }
          // Reset the parser state.
          Index = Source = null;
          return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
        };
      }
    }

    exports["runInContext"] = runInContext;
    return exports;
  }

  if (freeExports && !isLoader) {
    // Export for CommonJS environments.
    runInContext(root, freeExports);
  } else {
    // Export for web browsers and JavaScript engines.
    var nativeJSON = root.JSON,
        previousJSON = root["JSON3"],
        isRestored = false;

    var JSON3 = runInContext(root, (root["JSON3"] = {
      // Public: Restores the original value of the global `JSON` object and
      // returns a reference to the `JSON3` object.
      "noConflict": function () {
        if (!isRestored) {
          isRestored = true;
          root.JSON = nativeJSON;
          root["JSON3"] = previousJSON;
          nativeJSON = previousJSON = null;
        }
        return JSON3;
      }
    }));

    root.JSON = {
      "parse": JSON3.parse,
      "stringify": JSON3.stringify
    };
  }

  // Export for asynchronous module loaders.
  if (isLoader) {
    define(function () {
      return JSON3;
    });
  }
}).call(this);

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(_dereq_,module,exports){
/*
 * ----------------------------- JSTORAGE -------------------------------------
 * Simple local storage wrapper to save data on the browser side, supporting
 * all major browsers - IE6+, Firefox2+, Safari4+, Chrome4+ and Opera 10.5+
 *
 * Author: Andris Reinman, andris.reinman@gmail.com
 * Project homepage: www.jstorage.info
 *
 * Licensed under Unlicense:
 *
 * This is free and unencumbered software released into the public domain.
 * 
 * Anyone is free to copy, modify, publish, use, compile, sell, or
 * distribute this software, either in source code form or as a compiled
 * binary, for any purpose, commercial or non-commercial, and by any
 * means.
 * 
 * In jurisdictions that recognize copyright laws, the author or authors
 * of this software dedicate any and all copyright interest in the
 * software to the public domain. We make this dedication for the benefit
 * of the public at large and to the detriment of our heirs and
 * successors. We intend this dedication to be an overt act of
 * relinquishment in perpetuity of all present and future rights to this
 * software under copyright law.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 * OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 * 
 * For more information, please refer to <http://unlicense.org/>
 */

 (function(){
    var
        /* jStorage version */
        JSTORAGE_VERSION = "0.4.8",

        /* detect a dollar object or create one if not found */
        $ = window.jQuery || window.$ || (window.$ = {}),

        /* check for a JSON handling support */
        JSON = {
            parse:
                window.JSON && (window.JSON.parse || window.JSON.decode) ||
                String.prototype.evalJSON && function(str){return String(str).evalJSON();} ||
                $.parseJSON ||
                $.evalJSON,
            stringify:
                Object.toJSON ||
                window.JSON && (window.JSON.stringify || window.JSON.encode) ||
                $.toJSON
        };

    // Break if no JSON support was found
    if(!("parse" in JSON) || !("stringify" in JSON)){
        throw new Error("No JSON support found, include //cdnjs.cloudflare.com/ajax/libs/json2/20110223/json2.js to page");
    }

    var
        /* This is the object, that holds the cached values */
        _storage = {__jstorage_meta:{CRC32:{}}},

        /* Actual browser storage (localStorage or globalStorage["domain"]) */
        _storage_service = {jStorage:"{}"},

        /* DOM element for older IE versions, holds userData behavior */
        _storage_elm = null,

        /* How much space does the storage take */
        _storage_size = 0,

        /* which backend is currently used */
        _backend = false,

        /* onchange observers */
        _observers = {},

        /* timeout to wait after onchange event */
        _observer_timeout = false,

        /* last update time */
        _observer_update = 0,

        /* pubsub observers */
        _pubsub_observers = {},

        /* skip published items older than current timestamp */
        _pubsub_last = +new Date(),

        /* Next check for TTL */
        _ttl_timeout,

        /**
         * XML encoding and decoding as XML nodes can't be JSON'ized
         * XML nodes are encoded and decoded if the node is the value to be saved
         * but not if it's as a property of another object
         * Eg. -
         *   $.jStorage.set("key", xmlNode);        // IS OK
         *   $.jStorage.set("key", {xml: xmlNode}); // NOT OK
         */
        _XMLService = {

            /**
             * Validates a XML node to be XML
             * based on jQuery.isXML function
             */
            isXML: function(elm){
                var documentElement = (elm ? elm.ownerDocument || elm : 0).documentElement;
                return documentElement ? documentElement.nodeName !== "HTML" : false;
            },

            /**
             * Encodes a XML node to string
             * based on http://www.mercurytide.co.uk/news/article/issues-when-working-ajax/
             */
            encode: function(xmlNode) {
                if(!this.isXML(xmlNode)){
                    return false;
                }
                try{ // Mozilla, Webkit, Opera
                    return new XMLSerializer().serializeToString(xmlNode);
                }catch(E1) {
                    try {  // IE
                        return xmlNode.xml;
                    }catch(E2){}
                }
                return false;
            },

            /**
             * Decodes a XML node from string
             * loosely based on http://outwestmedia.com/jquery-plugins/xmldom/
             */
            decode: function(xmlString){
                var dom_parser = ("DOMParser" in window && (new DOMParser()).parseFromString) ||
                        (window.ActiveXObject && function(_xmlString) {
                    var xml_doc = new ActiveXObject("Microsoft.XMLDOM");
                    xml_doc.async = "false";
                    xml_doc.loadXML(_xmlString);
                    return xml_doc;
                }),
                resultXML;
                if(!dom_parser){
                    return false;
                }
                resultXML = dom_parser.call("DOMParser" in window && (new DOMParser()) || window, xmlString, "text/xml");
                return this.isXML(resultXML)?resultXML:false;
            }
        };


    ////////////////////////// PRIVATE METHODS ////////////////////////

    /**
     * Initialization function. Detects if the browser supports DOM Storage
     * or userData behavior and behaves accordingly.
     */
    function _init(){
        /* Check if browser supports localStorage */
        var localStorageReallyWorks = false;
        if("localStorage" in window){
            try {
                window.localStorage.setItem("_tmptest", "tmpval");
                localStorageReallyWorks = true;
                window.localStorage.removeItem("_tmptest");
            } catch(BogusQuotaExceededErrorOnIos5) {
                // Thanks be to iOS5 Private Browsing mode which throws
                // QUOTA_EXCEEDED_ERRROR DOM Exception 22.
            }
        }

        if(localStorageReallyWorks){
            try {
                if(window.localStorage) {
                    _storage_service = window.localStorage;
                    _backend = "localStorage";
                    _observer_update = _storage_service.jStorage_update;
                }
            } catch(E3) {/* Firefox fails when touching localStorage and cookies are disabled */}
        }
        /* Check if browser supports globalStorage */
        else if("globalStorage" in window){
            try {
                if(window.globalStorage) {
                    if(window.location.hostname == "localhost"){
                        _storage_service = window.globalStorage["localhost.localdomain"];
                    }
                    else{
                        _storage_service = window.globalStorage[window.location.hostname];
                    }
                    _backend = "globalStorage";
                    _observer_update = _storage_service.jStorage_update;
                }
            } catch(E4) {/* Firefox fails when touching localStorage and cookies are disabled */}
        }
        /* Check if browser supports userData behavior */
        else {
            _storage_elm = document.createElement("link");
            if(_storage_elm.addBehavior){

                /* Use a DOM element to act as userData storage */
                _storage_elm.style.behavior = "url(#default#userData)";

                /* userData element needs to be inserted into the DOM! */
                document.getElementsByTagName("head")[0].appendChild(_storage_elm);

                try{
                    _storage_elm.load("jStorage");
                }catch(E){
                    // try to reset cache
                    _storage_elm.setAttribute("jStorage", "{}");
                    _storage_elm.save("jStorage");
                    _storage_elm.load("jStorage");
                }

                var data = "{}";
                try{
                    data = _storage_elm.getAttribute("jStorage");
                }catch(E5){}

                try{
                    _observer_update = _storage_elm.getAttribute("jStorage_update");
                }catch(E6){}

                _storage_service.jStorage = data;
                _backend = "userDataBehavior";
            }else{
                _storage_elm = null;
                return;
            }
        }

        // Load data from storage
        _load_storage();

        // remove dead keys
        _handleTTL();

        // start listening for changes
        _setupObserver();

        // initialize publish-subscribe service
        _handlePubSub();

        // handle cached navigation
        if("addEventListener" in window){
            window.addEventListener("pageshow", function(event){
                if(event.persisted){
                    _storageObserver();
                }
            }, false);
        }
    }

    /**
     * Reload data from storage when needed
     */
    function _reloadData(){
        var data = "{}";

        if(_backend == "userDataBehavior"){
            _storage_elm.load("jStorage");

            try{
                data = _storage_elm.getAttribute("jStorage");
            }catch(E5){}

            try{
                _observer_update = _storage_elm.getAttribute("jStorage_update");
            }catch(E6){}

            _storage_service.jStorage = data;
        }

        _load_storage();

        // remove dead keys
        _handleTTL();

        _handlePubSub();
    }

    /**
     * Sets up a storage change observer
     */
    function _setupObserver(){
        if(_backend == "localStorage" || _backend == "globalStorage"){
            if("addEventListener" in window){
                window.addEventListener("storage", _storageObserver, false);
            }else{
                document.attachEvent("onstorage", _storageObserver);
            }
        }else if(_backend == "userDataBehavior"){
            setInterval(_storageObserver, 1000);
        }
    }

    /**
     * Fired on any kind of data change, needs to check if anything has
     * really been changed
     */
    function _storageObserver(){
        var updateTime;
        // cumulate change notifications with timeout
        clearTimeout(_observer_timeout);
        _observer_timeout = setTimeout(function(){

            if(_backend == "localStorage" || _backend == "globalStorage"){
                updateTime = _storage_service.jStorage_update;
            }else if(_backend == "userDataBehavior"){
                _storage_elm.load("jStorage");
                try{
                    updateTime = _storage_elm.getAttribute("jStorage_update");
                }catch(E5){}
            }

            if(updateTime && updateTime != _observer_update){
                _observer_update = updateTime;
                _checkUpdatedKeys();
            }

        }, 25);
    }

    /**
     * Reloads the data and checks if any keys are changed
     */
    function _checkUpdatedKeys(){
        var oldCrc32List = JSON.parse(JSON.stringify(_storage.__jstorage_meta.CRC32)),
            newCrc32List;

        _reloadData();
        newCrc32List = JSON.parse(JSON.stringify(_storage.__jstorage_meta.CRC32));

        var key,
            updated = [],
            removed = [];

        for(key in oldCrc32List){
            if(oldCrc32List.hasOwnProperty(key)){
                if(!newCrc32List[key]){
                    removed.push(key);
                    continue;
                }
                if(oldCrc32List[key] != newCrc32List[key] && String(oldCrc32List[key]).substr(0,2) == "2."){
                    updated.push(key);
                }
            }
        }

        for(key in newCrc32List){
            if(newCrc32List.hasOwnProperty(key)){
                if(!oldCrc32List[key]){
                    updated.push(key);
                }
            }
        }

        _fireObservers(updated, "updated");
        _fireObservers(removed, "deleted");
    }

    /**
     * Fires observers for updated keys
     *
     * @param {Array|String} keys Array of key names or a key
     * @param {String} action What happened with the value (updated, deleted, flushed)
     */
    function _fireObservers(keys, action){
        keys = [].concat(keys || []);
        if(action == "flushed"){
            keys = [];
            for(var key in _observers){
                if(_observers.hasOwnProperty(key)){
                    keys.push(key);
                }
            }
            action = "deleted";
        }
        for(var i=0, len = keys.length; i<len; i++){
            if(_observers[keys[i]]){
                for(var j=0, jlen = _observers[keys[i]].length; j<jlen; j++){
                    _observers[keys[i]][j](keys[i], action);
                }
            }
            if(_observers["*"]){
                for(var j=0, jlen = _observers["*"].length; j<jlen; j++){
                    _observers["*"][j](keys[i], action);
                }
            }
        }
    }

    /**
     * Publishes key change to listeners
     */
    function _publishChange(){
        var updateTime = (+new Date()).toString();

        if(_backend == "localStorage" || _backend == "globalStorage"){
            try {
                _storage_service.jStorage_update = updateTime;
            } catch (E8) {
                // safari private mode has been enabled after the jStorage initialization
                _backend = false;
            }
        }else if(_backend == "userDataBehavior"){
            _storage_elm.setAttribute("jStorage_update", updateTime);
            _storage_elm.save("jStorage");
        }

        _storageObserver();
    }

    /**
     * Loads the data from the storage based on the supported mechanism
     */
    function _load_storage(){
        /* if jStorage string is retrieved, then decode it */
        if(_storage_service.jStorage){
            try{
                _storage = JSON.parse(String(_storage_service.jStorage));
            }catch(E6){_storage_service.jStorage = "{}";}
        }else{
            _storage_service.jStorage = "{}";
        }
        _storage_size = _storage_service.jStorage?String(_storage_service.jStorage).length:0;

        if(!_storage.__jstorage_meta){
            _storage.__jstorage_meta = {};
        }
        if(!_storage.__jstorage_meta.CRC32){
            _storage.__jstorage_meta.CRC32 = {};
        }
    }

    /**
     * This functions provides the "save" mechanism to store the jStorage object
     */
    function _save(){
        _dropOldEvents(); // remove expired events
        try{
            _storage_service.jStorage = JSON.stringify(_storage);
            // If userData is used as the storage engine, additional
            if(_storage_elm) {
                _storage_elm.setAttribute("jStorage",_storage_service.jStorage);
                _storage_elm.save("jStorage");
            }
            _storage_size = _storage_service.jStorage?String(_storage_service.jStorage).length:0;
        }catch(E7){/* probably cache is full, nothing is saved this way*/}
    }

    /**
     * Function checks if a key is set and is string or numberic
     *
     * @param {String} key Key name
     */
    function _checkKey(key){
        if(typeof key != "string" && typeof key != "number"){
            throw new TypeError("Key name must be string or numeric");
        }
        if(key == "__jstorage_meta"){
            throw new TypeError("Reserved key name");
        }
        return true;
    }

    /**
     * Removes expired keys
     */
    function _handleTTL(){
        var curtime, i, TTL, CRC32, nextExpire = Infinity, changed = false, deleted = [];

        clearTimeout(_ttl_timeout);

        if(!_storage.__jstorage_meta || typeof _storage.__jstorage_meta.TTL != "object"){
            // nothing to do here
            return;
        }

        curtime = +new Date();
        TTL = _storage.__jstorage_meta.TTL;

        CRC32 = _storage.__jstorage_meta.CRC32;
        for(i in TTL){
            if(TTL.hasOwnProperty(i)){
                if(TTL[i] <= curtime){
                    delete TTL[i];
                    delete CRC32[i];
                    delete _storage[i];
                    changed = true;
                    deleted.push(i);
                }else if(TTL[i] < nextExpire){
                    nextExpire = TTL[i];
                }
            }
        }

        // set next check
        if(nextExpire != Infinity){
            _ttl_timeout = setTimeout(Math.min(_handleTTL, nextExpire - curtime, 0x7FFFFFFF));
        }

        // save changes
        if(changed){
            _save();
            _publishChange();
            _fireObservers(deleted, "deleted");
        }
    }

    /**
     * Checks if there's any events on hold to be fired to listeners
     */
    function _handlePubSub(){
        var i, len;
        if(!_storage.__jstorage_meta.PubSub){
            return;
        }
        var pubelm,
            _pubsubCurrent = _pubsub_last;

        for(i=len=_storage.__jstorage_meta.PubSub.length-1; i>=0; i--){
            pubelm = _storage.__jstorage_meta.PubSub[i];
            if(pubelm[0] > _pubsub_last){
                _pubsubCurrent = pubelm[0];
                _fireSubscribers(pubelm[1], pubelm[2]);
            }
        }

        _pubsub_last = _pubsubCurrent;
    }

    /**
     * Fires all subscriber listeners for a pubsub channel
     *
     * @param {String} channel Channel name
     * @param {Mixed} payload Payload data to deliver
     */
    function _fireSubscribers(channel, payload){
        if(_pubsub_observers[channel]){
            for(var i=0, len = _pubsub_observers[channel].length; i<len; i++){
                // send immutable data that can't be modified by listeners
                try{
                    _pubsub_observers[channel][i](channel, JSON.parse(JSON.stringify(payload)));
                }catch(E){};
            }
        }
    }

    /**
     * Remove old events from the publish stream (at least 2sec old)
     */
    function _dropOldEvents(){
        if(!_storage.__jstorage_meta.PubSub){
            return;
        }

        var retire = +new Date() - 2000;

        for(var i=0, len = _storage.__jstorage_meta.PubSub.length; i<len; i++){
            if(_storage.__jstorage_meta.PubSub[i][0] <= retire){
                // deleteCount is needed for IE6
                _storage.__jstorage_meta.PubSub.splice(i, _storage.__jstorage_meta.PubSub.length - i);
                break;
            }
        }

        if(!_storage.__jstorage_meta.PubSub.length){
            delete _storage.__jstorage_meta.PubSub;
        }

    }

    /**
     * Publish payload to a channel
     *
     * @param {String} channel Channel name
     * @param {Mixed} payload Payload to send to the subscribers
     */
    function _publish(channel, payload){
        if(!_storage.__jstorage_meta){
            _storage.__jstorage_meta = {};
        }
        if(!_storage.__jstorage_meta.PubSub){
            _storage.__jstorage_meta.PubSub = [];
        }

        _storage.__jstorage_meta.PubSub.unshift([+new Date, channel, payload]);

        _save();
        _publishChange();
    }


    /**
     * JS Implementation of MurmurHash2
     *
     *  SOURCE: https://github.com/garycourt/murmurhash-js (MIT licensed)
     *
     * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
     * @see http://github.com/garycourt/murmurhash-js
     * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
     * @see http://sites.google.com/site/murmurhash/
     *
     * @param {string} str ASCII only
     * @param {number} seed Positive integer only
     * @return {number} 32-bit positive integer hash
     */

    function murmurhash2_32_gc(str, seed) {
        var
            l = str.length,
            h = seed ^ l,
            i = 0,
            k;

        while (l >= 4) {
            k =
                ((str.charCodeAt(i) & 0xff)) |
                ((str.charCodeAt(++i) & 0xff) << 8) |
                ((str.charCodeAt(++i) & 0xff) << 16) |
                ((str.charCodeAt(++i) & 0xff) << 24);

            k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
            k ^= k >>> 24;
            k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

            h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

            l -= 4;
            ++i;
        }

        switch (l) {
            case 3: h ^= (str.charCodeAt(i + 2) & 0xff) << 16;
            case 2: h ^= (str.charCodeAt(i + 1) & 0xff) << 8;
            case 1: h ^= (str.charCodeAt(i) & 0xff);
                h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
        }

        h ^= h >>> 13;
        h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
        h ^= h >>> 15;

        return h >>> 0;
    }

    ////////////////////////// PUBLIC INTERFACE /////////////////////////

    $.jStorage = {
        /* Version number */
        version: JSTORAGE_VERSION,

        /**
         * Sets a key's value.
         *
         * @param {String} key Key to set. If this value is not set or not
         *              a string an exception is raised.
         * @param {Mixed} value Value to set. This can be any value that is JSON
         *              compatible (Numbers, Strings, Objects etc.).
         * @param {Object} [options] - possible options to use
         * @param {Number} [options.TTL] - optional TTL value, in milliseconds
         * @return {Mixed} the used value
         */
        set: function(key, value, options){
            _checkKey(key);

            options = options || {};

            // undefined values are deleted automatically
            if(typeof value == "undefined"){
                this.deleteKey(key);
                return value;
            }

            if(_XMLService.isXML(value)){
                value = {_is_xml:true,xml:_XMLService.encode(value)};
            }else if(typeof value == "function"){
                return undefined; // functions can't be saved!
            }else if(value && typeof value == "object"){
                // clone the object before saving to _storage tree
                value = JSON.parse(JSON.stringify(value));
            }

            _storage[key] = value;

            _storage.__jstorage_meta.CRC32[key] = "2." + murmurhash2_32_gc(JSON.stringify(value), 0x9747b28c);

            this.setTTL(key, options.TTL || 0); // also handles saving and _publishChange

            _fireObservers(key, "updated");
            return value;
        },

        /**
         * Looks up a key in cache
         *
         * @param {String} key - Key to look up.
         * @param {mixed} def - Default value to return, if key didn't exist.
         * @return {Mixed} the key value, default value or null
         */
        get: function(key, def){
            _checkKey(key);
            if(key in _storage){
                if(_storage[key] && typeof _storage[key] == "object" && _storage[key]._is_xml) {
                    return _XMLService.decode(_storage[key].xml);
                }else{
                    return _storage[key];
                }
            }
            return typeof(def) == "undefined" ? null : def;
        },

        /**
         * Deletes a key from cache.
         *
         * @param {String} key - Key to delete.
         * @return {Boolean} true if key existed or false if it didn't
         */
        deleteKey: function(key){
            _checkKey(key);
            if(key in _storage){
                delete _storage[key];
                // remove from TTL list
                if(typeof _storage.__jstorage_meta.TTL == "object" &&
                  key in _storage.__jstorage_meta.TTL){
                    delete _storage.__jstorage_meta.TTL[key];
                }

                delete _storage.__jstorage_meta.CRC32[key];

                _save();
                _publishChange();
                _fireObservers(key, "deleted");
                return true;
            }
            return false;
        },

        /**
         * Sets a TTL for a key, or remove it if ttl value is 0 or below
         *
         * @param {String} key - key to set the TTL for
         * @param {Number} ttl - TTL timeout in milliseconds
         * @return {Boolean} true if key existed or false if it didn't
         */
        setTTL: function(key, ttl){
            var curtime = +new Date();
            _checkKey(key);
            ttl = Number(ttl) || 0;
            if(key in _storage){

                if(!_storage.__jstorage_meta.TTL){
                    _storage.__jstorage_meta.TTL = {};
                }

                // Set TTL value for the key
                if(ttl>0){
                    _storage.__jstorage_meta.TTL[key] = curtime + ttl;
                }else{
                    delete _storage.__jstorage_meta.TTL[key];
                }

                _save();

                _handleTTL();

                _publishChange();
                return true;
            }
            return false;
        },

        /**
         * Gets remaining TTL (in milliseconds) for a key or 0 when no TTL has been set
         *
         * @param {String} key Key to check
         * @return {Number} Remaining TTL in milliseconds
         */
        getTTL: function(key){
            var curtime = +new Date(), ttl;
            _checkKey(key);
            if(key in _storage && _storage.__jstorage_meta.TTL && _storage.__jstorage_meta.TTL[key]){
                ttl = _storage.__jstorage_meta.TTL[key] - curtime;
                return ttl || 0;
            }
            return 0;
        },

        /**
         * Deletes everything in cache.
         *
         * @return {Boolean} Always true
         */
        flush: function(){
            _storage = {__jstorage_meta:{CRC32:{}}};
            _save();
            _publishChange();
            _fireObservers(null, "flushed");
            return true;
        },

        /**
         * Returns a read-only copy of _storage
         *
         * @return {Object} Read-only copy of _storage
        */
        storageObj: function(){
            function F() {}
            F.prototype = _storage;
            return new F();
        },

        /**
         * Returns an index of all used keys as an array
         * ["key1", "key2",.."keyN"]
         *
         * @return {Array} Used keys
        */
        index: function(){
            var index = [], i;
            for(i in _storage){
                if(_storage.hasOwnProperty(i) && i != "__jstorage_meta"){
                    index.push(i);
                }
            }
            return index;
        },

        /**
         * How much space in bytes does the storage take?
         *
         * @return {Number} Storage size in chars (not the same as in bytes,
         *                  since some chars may take several bytes)
         */
        storageSize: function(){
            return _storage_size;
        },

        /**
         * Which backend is currently in use?
         *
         * @return {String} Backend name
         */
        currentBackend: function(){
            return _backend;
        },

        /**
         * Test if storage is available
         *
         * @return {Boolean} True if storage can be used
         */
        storageAvailable: function(){
            return !!_backend;
        },

        /**
         * Register change listeners
         *
         * @param {String} key Key name
         * @param {Function} callback Function to run when the key changes
         */
        listenKeyChange: function(key, callback){
            _checkKey(key);
            if(!_observers[key]){
                _observers[key] = [];
            }
            _observers[key].push(callback);
        },

        /**
         * Remove change listeners
         *
         * @param {String} key Key name to unregister listeners against
         * @param {Function} [callback] If set, unregister the callback, if not - unregister all
         */
        stopListening: function(key, callback){
            _checkKey(key);

            if(!_observers[key]){
                return;
            }

            if(!callback){
                delete _observers[key];
                return;
            }

            for(var i = _observers[key].length - 1; i>=0; i--){
                if(_observers[key][i] == callback){
                    _observers[key].splice(i,1);
                }
            }
        },

        /**
         * Subscribe to a Publish/Subscribe event stream
         *
         * @param {String} channel Channel name
         * @param {Function} callback Function to run when the something is published to the channel
         */
        subscribe: function(channel, callback){
            channel = (channel || "").toString();
            if(!channel){
                throw new TypeError("Channel not defined");
            }
            if(!_pubsub_observers[channel]){
                _pubsub_observers[channel] = [];
            }
            _pubsub_observers[channel].push(callback);
        },

        /**
         * Publish data to an event stream
         *
         * @param {String} channel Channel name
         * @param {Mixed} payload Payload to deliver
         */
        publish: function(channel, payload){
            channel = (channel || "").toString();
            if(!channel){
                throw new TypeError("Channel not defined");
            }

            _publish(channel, payload);
        },

        /**
         * Reloads the data from browser storage
         */
        reInit: function(){
            _reloadData();
        },

        /**
         * Removes reference from global objects and saves it as jStorage
         *
         * @param {Boolean} option if needed to save object as simple "jStorage" in windows context
         */
         noConflict: function( saveInGlobal ) {
            delete window.$.jStorage

            if ( saveInGlobal ) {
                window.jStorage = this;
            }

            return this;
         }
    };

    // Initialize jStorage
    _init();

})();

},{}],6:[function(_dereq_,module,exports){
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
var CryptoJS=CryptoJS||function(h,s){var f={},t=f.lib={},g=function(){},j=t.Base={extend:function(a){g.prototype=this;var c=new g;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
q=t.WordArray=j.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=s?c:4*a.length},toString:function(a){return(a||u).stringify(this)},concat:function(a){var c=this.words,d=a.words,b=this.sigBytes;a=a.sigBytes;this.clamp();if(b%4)for(var e=0;e<a;e++)c[b+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((b+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)c[b+e>>>2]=d[e>>>2];else c.push.apply(c,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
32-8*(c%4);a.length=h.ceil(c/4)},clone:function(){var a=j.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],d=0;d<a;d+=4)c.push(4294967296*h.random()|0);return new q.init(c,a)}}),v=f.enc={},u=v.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++){var e=c[b>>>2]>>>24-8*(b%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b+=2)d[b>>>3]|=parseInt(a.substr(b,
2),16)<<24-4*(b%8);return new q.init(d,c/2)}},k=v.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++)d.push(String.fromCharCode(c[b>>>2]>>>24-8*(b%4)&255));return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b++)d[b>>>2]|=(a.charCodeAt(b)&255)<<24-8*(b%4);return new q.init(d,c)}},l=v.Utf8={stringify:function(a){try{return decodeURIComponent(escape(k.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return k.parse(unescape(encodeURIComponent(a)))}},
x=t.BufferedBlockAlgorithm=j.extend({reset:function(){this._data=new q.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=l.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,d=c.words,b=c.sigBytes,e=this.blockSize,f=b/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;b=h.min(4*a,b);if(a){for(var m=0;m<a;m+=e)this._doProcessBlock(d,m);m=d.splice(0,a);c.sigBytes-=b}return new q.init(m,b)},clone:function(){var a=j.clone.call(this);
a._data=this._data.clone();return a},_minBufferSize:0});t.Hasher=x.extend({cfg:j.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){x.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,d){return(new a.init(d)).finalize(c)}},_createHmacHelper:function(a){return function(c,d){return(new w.HMAC.init(a,
d)).finalize(c)}}});var w=f.algo={};return f}(Math);
(function(h){for(var s=CryptoJS,f=s.lib,t=f.WordArray,g=f.Hasher,f=s.algo,j=[],q=[],v=function(a){return 4294967296*(a-(a|0))|0},u=2,k=0;64>k;){var l;a:{l=u;for(var x=h.sqrt(l),w=2;w<=x;w++)if(!(l%w)){l=!1;break a}l=!0}l&&(8>k&&(j[k]=v(h.pow(u,0.5))),q[k]=v(h.pow(u,1/3)),k++);u++}var a=[],f=f.SHA256=g.extend({_doReset:function(){this._hash=new t.init(j.slice(0))},_doProcessBlock:function(c,d){for(var b=this._hash.words,e=b[0],f=b[1],m=b[2],h=b[3],p=b[4],j=b[5],k=b[6],l=b[7],n=0;64>n;n++){if(16>n)a[n]=
c[d+n]|0;else{var r=a[n-15],g=a[n-2];a[n]=((r<<25|r>>>7)^(r<<14|r>>>18)^r>>>3)+a[n-7]+((g<<15|g>>>17)^(g<<13|g>>>19)^g>>>10)+a[n-16]}r=l+((p<<26|p>>>6)^(p<<21|p>>>11)^(p<<7|p>>>25))+(p&j^~p&k)+q[n]+a[n];g=((e<<30|e>>>2)^(e<<19|e>>>13)^(e<<10|e>>>22))+(e&f^e&m^f&m);l=k;k=j;j=p;p=h+r|0;h=m;m=f;f=e;e=r+g|0}b[0]=b[0]+e|0;b[1]=b[1]+f|0;b[2]=b[2]+m|0;b[3]=b[3]+h|0;b[4]=b[4]+p|0;b[5]=b[5]+j|0;b[6]=b[6]+k|0;b[7]=b[7]+l|0},_doFinalize:function(){var a=this._data,d=a.words,b=8*this._nDataBytes,e=8*a.sigBytes;
d[e>>>5]|=128<<24-e%32;d[(e+64>>>9<<4)+14]=h.floor(b/4294967296);d[(e+64>>>9<<4)+15]=b;a.sigBytes=4*d.length;this._process();return this._hash},clone:function(){var a=g.clone.call(this);a._hash=this._hash.clone();return a}});s.SHA256=g._createHelper(f);s.HmacSHA256=g._createHmacHelper(f)})(Math);

},{}],7:[function(_dereq_,module,exports){
///////////////////////////////////////////////////////////////////////////////////////////////////
//
// Axon Bridge API Framework
//
// Authored by:   Axon Interactive
//
// Last Modified: June 4, 2014
//
// Dependencies:  crypto-js sha256 and hmac-sha256 (https://code.google.com/p/crypto-js/)
//                jQuery 1.11.1 (http://jquery.com/)
//                json3 (https://github.com/bestiejs/json3)
//                jStorage (https://github.com/andris9/jStorage)
//
// *** History ***
//
// Version    Date                  Notes
// =========  ====================  =============================================================
// 0.1        June 4, 2014          First stable version. 
//
///////////////////////////////////////////////////////////////////////////////////////////////////

// Require the root AxonBridge module
//var BridgeClient = require( './BridgeClient' );

var bridge = _dereq_( './Bridge' );
module.exports = new bridge();

},{"./Bridge":1}]},{},[7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcRGV2ZWxvcG1lbnRcXF9CaXRidWNrZXRcXGJyaWRnZS1jbGllbnRcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiQzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9CcmlkZ2UuanMiLCJDOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL0lkZW50aXR5LmpzIiwiQzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2htYWMtc2hhMjU2LmpzIiwiQzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2pzb24zLmpzIiwiQzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2pzdG9yYWdlLmpzIiwiQzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL3NoYTI1Ni5qcyIsIkM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMTNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4NEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2g4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBJbmNsdWRlIGRlcGVuZGVuY2llc1xyXG52YXIganNvbjMgPSByZXF1aXJlKCAnLi9pbmNsdWRlL2pzb24zJyApO1xyXG52YXIganN0b3JhZ2UgPSByZXF1aXJlKCAnLi9pbmNsdWRlL2pzdG9yYWdlJyApO1xyXG52YXIgc2hhMjU2ID0gcmVxdWlyZSggJy4vaW5jbHVkZS9zaGEyNTYnICk7XHJcbnZhciBJZGVudGl0eSA9IHJlcXVpcmUoICcuL0lkZW50aXR5JyApO1xyXG5cclxuLy8gW0JyaWRnZSBDb25zdHJ1Y3Rvcl1cclxuLy8gVGhlIEJyaWRnZSBvYmplY3QgaXMgdGhlIGdsb2JhbCBvYmplY3QgdGhyb3VnaCB3aGljaCBvdGhlciBhcHBsaWNhdGlvbnMgd2lsbCBcclxuLy8gY29tbXVuaWNhdGUgd2l0aCB0aGUgYnJpZGdlZCBBUEkgcmVzb3VyY2VzLiBJdCBwcm92aWRlcyBhIHNpbXBsZSBzdXJmYWNlIEFQSSBmb3IgbG9nZ2luZ1xyXG4vLyBpbiBhbmQgbG9nZ2luZyBvdXQgdXNlcnMgYXMgd2VsbCBhcyBzZW5kaW5nIHJlcXVlc3RzIHRvIHRoZSBBUEkuIEludGVybmFsbHksIGl0IGhhbmRsZXNcclxuLy8gYWxsIG9mIHRoZSByZXF1ZXN0IGF1dGhlbnRpY2F0aW9uIG5lY2Vzc2FyeSBmb3IgdGhlIEFQSSB3aXRob3V0IGV4cG9zaW5nIHRoZSB1c2VyJ3NcclxuLy8gYWNjb3VudCBwYXNzd29yZCB0byBvdXRzaWRlIHNjcnV0aW55IChhbmQgZXZlbiBzY3J1dGlueSBmcm9tIG90aGVyIGxvY2FsIGFwcGxpY2F0aW9uc1xyXG4vLyB0byBhIHNpZ25pZmljYW50IGV4dGVudCkuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIFRoZSBvYmplY3QgdG8gYmUgcmV0dXJuZWQgZnJvbSB0aGUgZmFjdG9yeVxyXG4gIHZhciBzZWxmID0ge307XHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vIFBSSVZBVEUgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gUFJPUEVSVElFUyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLy8gW1BSSVZBVEVdIGlkZW50aXR5XHJcbiAgLy8gVGhlIElkZW50aXR5IG9iamVjdCB1c2VkIHRvIHRyYWNrIHRoZSB1c2VyIGFuZCBjcmVhdGUgcmVxdWVzdHMgc2lnbmVkIHdpdGggXHJcbiAgLy8gYXBwcm9wcmlhdGUgSE1BQyBoYXNoIHZhbHVlcy5cclxuICB2YXIgaWRlbnRpdHkgPSBudWxsO1xyXG5cclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gRlVOQ1RJT05TIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8vIFtQUklWQVRFXSBjbGVhcklkZW50aXR5KClcclxuICAvLyBTZXRzIHRoZSBjdXJyZW50IElkZW50aXR5IG9iamVjdCB0byBudWxsIHNvIGl0IGdldHMgZ2FyYmFnZSBjb2xsZWN0ZWQgYW5kIGNhbm5vdCBiZSB1c2VkIFxyXG4gIC8vIHRvIHZhbGlkYXRlIHJlcXVlc3RzIGdvaW5nIGZvcndhcmQuXHJcbiAgdmFyIGNsZWFySWRlbnRpdHkgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgaWRlbnRpdHkgPSBudWxsO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gY2xlYXJVc2VyXHJcbiAgLy8gQ2xlYXJzIHRoZSBjdXJyZW50IHVzZXIgZGF0YSBhbmQgYWRkaXRpb25hbCBkYXRhIGFzc2lnbmVkIHRvIHRoZSBCcmlkZ2UuXHJcbiAgdmFyIGNsZWFyVXNlciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAvLyBTZXQgdGhlIHVzZXIgYW5kIGFkZGl0aW9uYWwgZGF0YSBvYmplY3RzIHRvIG51bGxcclxuICAgIHNlbGYudXNlciA9IG51bGw7XHJcbiAgICBzZWxmLmFkZGl0aW9uYWxEYXRhID0gbnVsbDtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIGhhc0lkZW50aXR5KClcclxuICAvLyBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IGFuIHRoZSBJZGVudGl0eSBvYmplY3QgaXMgY3VycmVudGx5IGFzc2lnbmVkLlxyXG4gIHZhciBoYXNJZGVudGl0eSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICByZXR1cm4gKCBpZGVudGl0eSAhPT0gbnVsbCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdFByaXZhdGUoKVxyXG4gIC8vIFRoaXMgZnVuY3Rpb24gcHJvdmlkZXMgdGhlIGJhc2ljIGZ1bmN0aW9uYWxpdHkgdXNlZCBieSBhbGwgb2YgdGhlIEJyaWRnZSBDbGllbnQncyBpbnRlcm5hbFxyXG4gIC8vIHJlcXVlc3QgZnVuY3Rpb24gY2FsbHMuIEl0IHBlcmZvcm1zIGFuIFhIUiByZXF1ZXN0IHRvIHRoZSBBUEkgc2VydmVyIGF0IHRoZSBzcGVjaWZpZWQgcmVzb3VyY2VcclxuICAvLyBhbmQgcmV0dXJuIGEgalF1ZXJ5IERlZmVycmVkIG9iamVjdCAuIElmIHRoaXMgcmV0dXJucyBudWxsLCB0aGUgcmVxdWVzdCBjb3VsZCBub3QgYmUgc2VudFxyXG4gIC8vIGJlY2F1c2Ugbm8gdXNlciBjcmVkZW50aWFscyB3ZXJlIGF2YWlsYWJsZSB0byBzaWduIHRoZSByZXF1ZXN0LlxyXG4gIHZhciByZXF1ZXN0UHJpdmF0ZSA9IGZ1bmN0aW9uICggbWV0aG9kLCByZXNvdXJjZSwgcGF5bG9hZCwgdGVtcElkZW50aXR5ICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgcmVxdWVzdCBiZWluZyByZWFkeSB0byBzZW5kLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vblJlcXVlc3RDYWxsZWQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vblJlcXVlc3RDYWxsZWQoIG1ldGhvZCwgcmVzb3VyY2UsIHBheWxvYWQgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBhIHRlbXBvcmFyeSBpZGVudGl0eSB3YXMgcHJvdmlkZWQsIHVzZSBpdCAoZXZlbiBpZiBhbiBpZGVudGl0eSBpcyBzZXQgaW4gQnJpZGdlKS5cclxuICAgIHZhciByZXF1ZXN0SWRlbnRpdHkgPSBudWxsO1xyXG4gICAgaWYgKCB0ZW1wSWRlbnRpdHkgIT09IG51bGwgJiYgdHlwZW9mIHRlbXBJZGVudGl0eSA9PT0gJ29iamVjdCcgKSB7XHJcbiAgICAgIHJlcXVlc3RJZGVudGl0eSA9IHRlbXBJZGVudGl0eTtcclxuICAgIH1cclxuICAgIC8vIElmIGFuIGlkZW50aXR5IGlzIHNldCBpbiBCcmlkZ2UsIHVzZSBpdC5cclxuICAgIGVsc2UgaWYgKCBoYXNJZGVudGl0eSgpID09PSB0cnVlICkge1xyXG4gICAgICByZXF1ZXN0SWRlbnRpdHkgPSBpZGVudGl0eTtcclxuICAgIH1cclxuICAgIC8vIE5vIGlkZW50aXR5IGlzIGF2YWlsYWJsZS4gVGhlIHJlcXVlc3QgY2FuJ3QgYmUgc2VudC5cclxuICAgIGVsc2UgeyBcclxuICAgICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybiggXCJCUklER0UgfCBSZXF1ZXN0IHwgUmVxdWVzdCBjYW5ub3QgYmUgc2VudC4gTm8gdXNlciBjcmVkZW50aWFscyBhdmFpbGFibGUuXCIgKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgYSBkZWZlcnJlZCBvYmplY3QgdG8gcHJvdmlkZSBhIGNvbnZlbmllbnQgd2F5IGZvciB0aGUgY2FsbGVyIHRvIGhhbmRsZSBzdWNjZXNzIGFuZCBcclxuICAgIC8vIGZhaWx1cmUuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBuZXcgalF1ZXJ5LkRlZmVycmVkKCk7XHJcblxyXG4gICAgLy8gQnVpbGQgdGhlIHBheWxvYWRTdHJpbmcgdG8gYmUgc2VudCBhbG9uZyB3aXRoIHRoZSBtZXNzYWdlLlxyXG4gICAgLy8gTm90ZTogSWYgdGhpcyBpcyBhIEdFVCByZXF1ZXN0LCBwcmVwZW5kICdwYXlsb2FkPScgc2luY2UgdGhlIGRhdGEgaXMgc2VudCBpbiB0aGUgcXVlcnkgXHJcbiAgICAvLyBzdHJpbmcuXHJcbiAgICB2YXIgcGF5bG9hZFN0cmluZyA9ICggbWV0aG9kLnRvVXBwZXJDYXNlKCkgPT09ICdHRVQnICkgPyAncGF5bG9hZD0nIDogJyc7XHJcbiAgICBwYXlsb2FkU3RyaW5nICs9IEpTT04uc3RyaW5naWZ5KCByZXF1ZXN0SWRlbnRpdHkuY3JlYXRlUmVxdWVzdCggcGF5bG9hZCApICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgalF1ZXJ5LmFqYXgoIHtcclxuICAgICAgJ3R5cGUnOiBtZXRob2QsXHJcbiAgICAgICd1cmwnOiBzZWxmLnVybCArIHJlc291cmNlLFxyXG4gICAgICAnZGF0YSc6IHBheWxvYWRTdHJpbmcsXHJcbiAgICAgICdkYXRhVHlwZSc6ICdqc29uJyxcclxuICAgICAgJ2NvbnRlbnRUeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAnaGVhZGVycyc6IHtcclxuICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbiAgICAgIH0sXHJcbiAgICAgICd0aW1lb3V0Jzogc2VsZi50aW1lb3V0LFxyXG4gICAgICAnYXN5bmMnOiB0cnVlLFxyXG4gICAgfSApXHJcbiAgICAuZG9uZSggZnVuY3Rpb24gKCBkYXRhLCB0ZXh0U3RhdHVzLCBqcVhIUiApIHtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHRoZSByZXR1cm5lZCBoZWFkZXIgd2FzIGZvcm1hdHRlZCBpbmNvcnJlY3RseS5cclxuICAgICAgaWYgKCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcgfHwgdHlwZW9mIGRhdGEuY29udGVudCAhPT0gJ29iamVjdCcgKSB7XHJcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KCB7IHN0YXR1czogNDE3LCBtZXNzYWdlOiAnNDE3IChFeHBlY3RhdGlvbiBGYWlsZWQpIE1hbGZvcm1lZCBtZXNzYWdlLicgfSwganFYSFIgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgc3VjY2Vzc2Z1bCByZXF1ZXN0LlxyXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCBkYXRhLCBqcVhIUiApO1xyXG5cclxuICAgIH0gKVxyXG4gICAgLmZhaWwoIGZ1bmN0aW9uICgganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xyXG5cclxuICAgICAgLy8gUmVqZWN0IHRoZSBvYnZpb3VzIGVycm9yIGNvZGVzLlxyXG4gICAgICB2YXIgZXJyb3IgPSBCcmlkZ2UuaXNFcnJvckNvZGVSZXNwb25zZSgganFYSFIgKTtcclxuICAgICAgaWYgKCBlcnJvciAhPT0gbnVsbCApIHtcclxuXHJcbiAgICAgICAgLy8gTm90aWZ5IHRoZSB1c2VyIG9mIHRoZSBlcnJvci5cclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yLCBqcVhIUiApO1xyXG5cclxuICAgICAgfSBcclxuICAgICAgZWxzZSAvLyBDb25uZWN0aW9uIHRpbWVvdXRcclxuICAgICAge1xyXG5cclxuICAgICAgICAvLyBOb3RpZnkgdGhlIHVzZXIgb2YgdGhlIGZhaWx1cmUgdG8gY29ubmVjdCB0byB0aGUgc2VydmVyLlxyXG4gICAgICAgIGRlZmVycmVkLnJlamVjdCggeyBzdGF0dXM6IDAsIG1lc3NhZ2U6ICcwIChUaW1lb3V0KSBObyByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuJyB9LCBqcVhIUiApO1xyXG5cclxuICAgICAgfVxyXG5cclxuICAgIH0gKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGRlZmVycmVkIG9iamVjdCB0byB0aGUgY2FsbGVyXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdENoYW5nZVBhc3N3b3JkUHJpdmF0ZSgpXHJcbiAgLy8gQXNrIHRoZSBzZXJ2ZXIgdG8gY2hhbmdlIHRoZSBwYXNzd29yZCBvZiB0aGUgY3VyZW50bHkgbG9nZ2VkLWluIHVzZXIuIFRoaXMgb3BlcmF0aW9uIHJlcXVpcmVzXHJcbiAgLy8gdGhlIHVzZXIncyBjdXJyZW50IHBhc3N3b3JkIHRvIGJlIHN1cHBsaWVkIGFuZCBjcmVhdGVzIGEgdGVtcG9yYXJ5IElkZW50aXR5IG9iamVjdCB0byBzZW5kIHRoZVxyXG4gIC8vIHJlcXVlc3QgZm9yIGEgcGFzc3dvcmQgY2hhbmdlIHRvIHZlcmlmeSB0aGF0IGFub3RoZXIgaW5kaXZpZHVhbCBkaWRuJ3QganVzdCBob3Agb250byBhIGxvZ2dlZC1cclxuICAvLyBpbiBjb21wdXRlciBhbmQgY2hhbmdlIGEgdXNlcidzIHBhc3N3b3JkIHdoaWxlIHRoZXkgd2VyZSBhd2F5IGZyb20gdGhlaXIgY29tcHV0ZXIuXHJcbiAgdmFyIHJlcXVlc3RDaGFuZ2VQYXNzd29yZFByaXZhdGUgPSBmdW5jdGlvbiAoIG9sZFBhc3N3b3JkLCBuZXdQYXNzd29yZCApIHtcclxuXHJcbiAgICAvLyBOb3RpZnkgdGhlIHVzZXIgb2YgdGhlIGNoYW5nZVBhc3N3b3JkIGNhbGwgb2NjdXJyaW5nLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vbkZDaGFuZ2VQYXNzd29yZCA9PT0gXCJmdW5jdGlvblwiICkge1xyXG4gICAgICBzZWxmLm9uQ2hhbmdlUGFzc3dvcmQoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBIYXNoIHRoZSB1c2VyJ3MgcGFzc3dvcmRzXHJcbiAgICB2YXIgb2xkSGFzaGVkUGFzc3dvcmQgPSBDcnlwdG9KUy5TSEEyNTYoIG9sZFBhc3N3b3JkICkudG9TdHJpbmcoIENyeXB0b0pTLmVuYy5IZXggKTtcclxuICAgIHZhciBuZXdIYXNoZWRQYXNzd29yZCA9IENyeXB0b0pTLlNIQTI1NiggbmV3UGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvSlMuZW5jLkhleCApO1xyXG5cclxuICAgIC8vIENsZWFyIHRoZSB1bmVuY3J5cHRlZCBwYXNzd29yZHMgZnJvbSBtZW1vcnlcclxuICAgIG9sZFBhc3N3b3JkID0gbnVsbDtcclxuICAgIG5ld1Bhc3N3b3JkID0gbnVsbDtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBkZWZlcnJlZCBvYmplY3QgdG8gcmV0dXJuIHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIHN1Y2Nlc3MvZmFpbHVyZSBjb252ZW5pZW50bHkuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBuZXcgalF1ZXJ5LkRlZmVycmVkKCk7XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIHN1Y2Nlc3MgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZXNvbHZlKCkpXHJcbiAgICB2YXIgb25Eb25lID0gZnVuY3Rpb24gKCBkYXRhLCBqcVhIUiApIHtcclxuXHJcbiAgICAgIC8vIENoZWNrIHRoYXQgdGhlIGNvbnRlbnQgdHlwZSAoTWVzc2FnZSkgaXMgZm9ybWF0dGVkIGNvcnJlY3RseS5cclxuICAgICAgaWYgKCB0eXBlb2YgZGF0YS5jb250ZW50Lm1lc3NhZ2UgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIG9uRmFpbCggeyBzdGF0dXM6IDQxNywgbWVzc2FnZTogJzQxNyAoRXhwZWN0YXRpb24gRmFpbGVkKSBNYWxmb3JtZWQgbWVzc2FnZS4nIH0sIGpxWEhSICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTZXQgQnJpZGdlJ3MgaWRlbnRpdHkgb2JqZWN0IHVzaW5nIHRoZSBuZXcgcGFzc3dvcmQsIHNpbmNlIGZ1dHVyZSByZXF1ZXN0cyB3aWxsIG5lZWQgdG8gYmUgXHJcbiAgICAgIC8vIHNpZ25lZCB3aXRoIHRoZSBuZXcgdXNlciBjcmVkZW50aWFscy5cclxuICAgICAgc2V0SWRlbnRpdHkoIGlkZW50aXR5LmVtYWlsLCBuZXdIYXNoZWRQYXNzd29yZCwgdHJ1ZSApO1xyXG5cclxuICAgICAgLy8gTG9nIHRoZSBzdWNjZXNzIHRvIHRoZSBjb25zb2xlLlxyXG4gICAgICBpZiAoIHNlbGYuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coIFwiQlJJREdFIHwgRm9yZ290IFBhc3N3b3JkIHwgXCIgKyBkYXRhLmNvbnRlbnQubWVzc2FnZSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaWduYWwgdGhlIGRlZmVycmVkIG9iamVjdCB0byB1c2UgaXRzIHN1Y2Nlc3MoKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCBkYXRhLCBqcVhIUiApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIGZhaWx1cmUgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZWplY3QoKSlcclxuICAgIHZhciBvbkZhaWwgPSBmdW5jdGlvbiAoIGVycm9yLCBqcVhIUiApIHtcclxuXHJcbiAgICAgIC8vIExvZyB0aGUgZXJyb3IgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggQnJpZGdlLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgRm9yZ290IFBhc3N3b3JkIHwgXCIgKyBlcnJvci5zdGF0dXMudG9TdHJpbmcoKSArIFwiID4+IFwiICsgZXJyb3IubWVzc2FnZSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaWduYWwgdGhlIGRlZmVycmVkIG9iamVjdCB0byB1c2UgaXRzIGZhaWwoKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yLCBqcVhIUiApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgdGhlIHBheWxvYWQgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdFxyXG4gICAgdmFyIHBheWxvYWQgPSB7XHJcbiAgICAgIFwicGFzc3dvcmRcIjogbmV3SGFzaGVkUGFzc3dvcmRcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ29uZmlndXJlIGEgdGVtcG9yYXJ5IElkZW50aXR5IG9iamVjdCB3aXRoIHRoZSB1c2VyJ3MgY3JlZGVudGlhbHMsIHVzaW5nIHRoZSBwYXNzd29yZCBcclxuICAgIC8vIHJlY2VpdmVkIGFzIGEgcGFyYW1ldGVyIHRvIGRvdWJsZS1jb25maXJtIHRoZSB1c2VyJ3MgaWRlbnRpdHkgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZXkgXHJcbiAgICAvLyBjaGFuZ2UgdGhlaXIgYWNjb3VudCBwYXNzd29yZC5cclxuICAgIHZhciB0ZW1wSWRlbnRpdHkgPSBuZXcgSWRlbnRpdHkoIGlkZW50aXR5LmVtYWlsLCBvbGRIYXNoZWRQYXNzd29yZCwgdHJ1ZSApO1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3RQcml2YXRlKCAnUE9TVCcsICdjaGFuZ2UtcGFzc3dvcmQnLCBwYXlsb2FkLCB0ZW1wSWRlbnRpdHkgKS5kb25lKCBvbkRvbmUgKS5mYWlsKCBvbkZhaWwgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGRlZmVycmVkIG9iamVjdCBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBlcnJvcnMgYXMgdGhleSBjaG9vc2UuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdEZvcmdvdFBhc3N3b3JkUHJpdmF0ZSgpXHJcbiAgLy8gQXNrIHRoZSBzZXJ2ZXIgdG8gc2V0IHRoZSB1c2VyIGludG8gcmVjb3Zlcnkgc3RhdGUgZm9yIGEgc2hvcnQgcGVyaW9kIG9mIHRpbWUgYW5kIHNlbmQgYW5cclxuICAvLyBhY2NvdW50IHJlY292ZXJ5IGVtYWlsIHRvIHRoZSBlbWFpbCBhY2NvdW50IHByb3ZpZGVkIGhlcmUsIGFzIGxvbmcgYXMgaXQgaWRlbnRpZmllcyBhIHVzZXJcclxuICAvLyBpbiB0aGUgZGF0YWJhc2UuXHJcbiAgdmFyIHJlcXVlc3RGb3Jnb3RQYXNzd29yZFByaXZhdGUgPSBmdW5jdGlvbiAoIGVtYWlsICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgZm9yZ290UGFzc3dvcmQgY2FsbCBvY2N1cnJpbmcuXHJcbiAgICBpZiAoIHR5cGVvZiBzZWxmLm9uRm9yZ290UGFzc3dvcmQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vbkZvcmdvdFBhc3N3b3JkKCBlbWFpbCApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byByZXR1cm4gc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgc3VjY2Vzcy9mYWlsdXJlIGNvbnZlbmllbnRseS5cclxuICAgIHZhciBkZWZlcnJlZCA9IG5ldyBqUXVlcnkuRGVmZXJyZWQoKTtcclxuXHJcbiAgICAvLyBCdWlsZCBvdXIgaW50ZXJuYWwgc3VjY2VzcyBoYW5kbGVyICh0aGlzIGNhbGxzIGRlZmVycmVkLnJlc29sdmUoKSlcclxuICAgIHZhciBvbkRvbmUgPSBmdW5jdGlvbiAoIGRhdGEsIGpxWEhSICkge1xyXG5cclxuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgY29udGVudCB0eXBlIChNZXNzYWdlKSBpcyBmb3JtYXR0ZWQgY29ycmVjdGx5LlxyXG4gICAgICBpZiAoIHR5cGVvZiBkYXRhLmNvbnRlbnQubWVzc2FnZSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgb25GYWlsKCB7IHN0YXR1czogNDE3LCBtZXNzYWdlOiAnNDE3IChFeHBlY3RhdGlvbiBGYWlsZWQpIE1hbGZvcm1lZCBtZXNzYWdlLicgfSwganFYSFIgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIExvZyB0aGUgc3VjY2VzcyB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IEZvcmdvdCBQYXNzd29yZCB8IFwiICsgZGF0YS5jb250ZW50Lm1lc3NhZ2UgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2lnbmFsIHRoZSBkZWZlcnJlZCBvYmplY3QgdG8gdXNlIGl0cyBzdWNjZXNzKCkgaGFuZGxlci5cclxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSggZGF0YSwganFYSFIgKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEJ1aWxkIG91ciBpbnRlcm5hbCBmYWlsdXJlIGhhbmRsZXIgKHRoaXMgY2FsbHMgZGVmZXJyZWQucmVqZWN0KCkpXHJcbiAgICB2YXIgb25GYWlsID0gZnVuY3Rpb24gKCBlcnJvciwganFYSFIgKSB7XHJcblxyXG4gICAgICAvLyBMb2cgdGhlIGVycm9yIHRvIHRoZSBjb25zb2xlLlxyXG4gICAgICBpZiAoIEJyaWRnZS5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCBcIkJSSURHRSB8IEZvcmdvdCBQYXNzd29yZCB8IFwiICsgZXJyb3Iuc3RhdHVzLnRvU3RyaW5nKCkgKyBcIiA+PiBcIiArIGVycm9yLm1lc3NhZ2UgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2lnbmFsIHRoZSBkZWZlcnJlZCBvYmplY3QgdG8gdXNlIGl0cyBmYWlsKCkgaGFuZGxlci5cclxuICAgICAgZGVmZXJyZWQucmVqZWN0KCBlcnJvciwganFYSFIgKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEJ1aWxkIHRoZSBwYXlsb2FkIG9iamVjdCB0byBzZW5kIHdpdGggdGhlIHJlcXVlc3RcclxuICAgIHZhciBwYXlsb2FkID0ge1xyXG4gICAgICBcImVtYWlsXCI6IGVtYWlsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBJZGVudGl0eSBvYmplY3Qgd2l0aCBhIGJsYW5rIHBhc3N3b3JkLlxyXG4gICAgdmFyIHRlbXBJZGVudGl0eSA9IG5ldyBJZGVudGl0eSggZW1haWwsICcnLCB0cnVlICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdFByaXZhdGUoICdQT1NUJywgJ2ZvcmdvdC1wYXNzd29yZCcsIHBheWxvYWQsIG51bGwgKS5kb25lKCBvbkRvbmUgKS5mYWlsKCBvbkZhaWwgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGRlZmVycmVkIG9iamVjdCBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBlcnJvcnMgYXMgdGhleSBjaG9vc2UuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdExvZ2luUHJpdmF0ZSgpXHJcbiAgLy8gTG9nIGluIGEgdXNlciB3aXRoIHRoZSBnaXZlbiBlbWFpbC9wYXNzd29yZCBwYWlyLiBUaGlzIGNyZWF0ZXMgYSBuZXcgSWRlbnRpdHkgb2JqZWN0XHJcbiAgLy8gdG8gc2lnbiByZXF1ZXN0cyBmb3IgYXV0aGVudGljYXRpb24gYW5kIHBlcmZvcm1zIGFuIGluaXRpYWwgcmVxdWVzdCB0byB0aGUgc2VydmVyIHRvXHJcbiAgLy8gc2VuZCBhIGxvZ2luIHBhY2thZ2UuXHJcbiAgdmFyIHJlcXVlc3RMb2dpblByaXZhdGUgPSBmdW5jdGlvbiAoIGVtYWlsLCBwYXNzd29yZCwgdXNlTG9jYWxTdG9yYWdlLCBkb250SGFzaFBhc3N3b3JkICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgbG9naW4gY2FsbCBvY2N1cnJpbmcuXHJcbiAgICBpZiAoIHR5cGVvZiBzZWxmLm9uTG9naW5DYWxsZWQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vbkxvZ2luQ2FsbGVkKCBlbWFpbCwgdXNlTG9jYWxTdG9yYWdlICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSGFzaCB0aGUgdXNlcidzIHBhc3N3b3JkXHJcbiAgICB2YXIgaGFzaGVkUGFzc3dvcmQgPSAoIGRvbnRIYXNoUGFzc3dvcmQgPT09IHRydWUgKSA/IHBhc3N3b3JkIDpcclxuICAgICAgQ3J5cHRvSlMuU0hBMjU2KCBwYXNzd29yZCApXHJcbiAgICAgIC50b1N0cmluZyggQ3J5cHRvSlMuZW5jLkhleCApO1xyXG5cclxuICAgIC8vIENsZWFyIHRoZSB1bmVuY3J5cHRlZCBwYXNzd29yZCBmcm9tIG1lbW9yeVxyXG4gICAgcGFzc3dvcmQgPSBudWxsO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byByZXR1cm4gc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgc3VjY2Vzcy9mYWlsdXJlIGNvbnZlbmllbnRseS5cclxuICAgIHZhciBkZWZlcnJlZCA9IG5ldyBqUXVlcnkuRGVmZXJyZWQoKTtcclxuXHJcbiAgICAvLyBCdWlsZCBvdXIgaW50ZXJuYWwgc3VjY2VzcyBoYW5kbGVyICh0aGlzIGNhbGxzIGRlZmVycmVkLnJlc29sdmUoKSlcclxuICAgIHZhciBvbkRvbmUgPSBmdW5jdGlvbiAoIGRhdGEsIGpxWEhSICkge1xyXG5cclxuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgY29udGVudCB0eXBlIChMb2dpbiBQYWNrYWdlKSBpcyBmb3JtYXR0ZWQgY29ycmVjdGx5LlxyXG4gICAgICBpZiAoIHR5cGVvZiBkYXRhLmNvbnRlbnQudXNlciAhPT0gJ29iamVjdCd8fCB0eXBlb2YgZGF0YS5jb250ZW50LmFkZGl0aW9uYWxEYXRhICE9PSAnb2JqZWN0JyApIHtcclxuICAgICAgICBvbkZhaWwoIHsgc3RhdHVzOiA0MTcsIG1lc3NhZ2U6ICc0MTcgKEV4cGVjdGF0aW9uIEZhaWxlZCkgTWFsZm9ybWVkIGxvZ2luIHBhY2thZ2UuJyB9LCBqcVhIUiApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gTG9nIHRoZSBzdWNjZXNzIHRvIHRoZSBjb25zb2xlLlxyXG4gICAgICBpZiAoIHNlbGYuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coIFwiQlJJREdFIHwgTG9naW4gfCBcIiArIEpTT04uc3RyaW5naWZ5KCBkYXRhLmNvbnRlbnQgKSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTZXQgdGhlIHVzZXIgb2JqZWN0IHVzaW5nIHRoZSB1c2VyIGRhdGEgdGhhdCB3YXMgcmV0dXJuZWRcclxuICAgICAgc2V0VXNlciggZGF0YS5jb250ZW50LnVzZXIsIGRhdGEuY29udGVudC5hZGRpdGlvbmFsRGF0YSApO1xyXG5cclxuICAgICAgLy8gU3RvcmUgdGhpcyBpZGVudGl0eSB0byBsb2NhbCBzdG9yYWdlLCBpZiB0aGF0IHdhcyByZXF1ZXN0ZWQuXHJcbiAgICAgIC8vIFtTRUNVUklUWSBOT1RFIDFdIHN0b3JlTG9jYWxseSBzaG91bGQgYmUgc2V0IGJhc2VkIG9uIHVzZXIgaW5wdXQsIGJ5IGFza2luZyB3aGV0aGVyXHJcbiAgICAgIC8vIHRoZSB1c2VyIGlzIG9uIGEgcHJpdmF0ZSBjb21wdXRlciBvciBub3QuIFRoaXMgaXMgY2FuIGJlIGNvbnNpZGVyZWQgYSB0b2xlcmFibGVcclxuICAgICAgLy8gc2VjdXJpdHkgcmlzayBhcyBsb25nIGFzIHRoZSB1c2VyIGlzIG9uIGEgcHJpdmF0ZSBjb21wdXRlciB0aGF0IHRoZXkgdHJ1c3Qgb3IgbWFuYWdlXHJcbiAgICAgIC8vIHRoZW1zZWx2ZXMuIEhvd2V2ZXIsIG9uIGEgcHVibGljIG1hY2hpbmUgdGhpcyBpcyBwcm9iYWJseSBhIHNlY3VyaXR5IHJpc2ssIGFuZCB0aGVcclxuICAgICAgLy8gdXNlciBzaG91bGQgYmUgYWJsZSB0byBkZWNsaW5lIHRoaXMgY29udmVuY2llbmNlIGluIGZhdm91ciBvZiBzZWN1cml0eSwgcmVnYXJkbGVzc1xyXG4gICAgICAvLyBvZiB3aGV0aGVyIHRoZXkgYXJlIG9uIGEgcHVibGljIG1hY2hpbmUgb3Igbm90LlxyXG4gICAgICBpZiAoIHNlbGYudXNlTG9jYWxTdG9yYWdlICkge1xyXG4gICAgICAgIGpRdWVyeS5qU3RvcmFnZS5zZXQoICdicmlkZ2UtY2xpZW50LWlkZW50aXR5JywgSlNPTi5zdHJpbmdpZnkoIHtcclxuICAgICAgICAgIFwiZW1haWxcIjogZW1haWwsXHJcbiAgICAgICAgICBcInBhc3N3b3JkXCI6IGhhc2hlZFBhc3N3b3JkXHJcbiAgICAgICAgfSApICk7XHJcbiAgICAgICAgalF1ZXJ5LmpTdG9yYWdlLnNldFRUTCggJ2JyaWRnZS1jbGllbnQtaWRlbnRpdHknLCA4NjQwMDAwMCApOyAvLyBFeHBpcmUgaW4gMSBkYXkuXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgc3VjY2VzcygpIGhhbmRsZXIuXHJcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoIGRhdGEsIGpxWEhSICk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBCdWlsZCBvdXIgaW50ZXJuYWwgZmFpbHVyZSBoYW5kbGVyICh0aGlzIGNhbGxzIGRlZmVycmVkLnJlamVjdCgpKVxyXG4gICAgdmFyIG9uRmFpbCA9IGZ1bmN0aW9uICggZXJyb3IsIGpxWEhSICkge1xyXG5cclxuICAgICAgLy8gQ2xlYXIgdGhlIHVzZXIgY3JlZGVudGlhbHMsIHNpbmNlIHRoZXkgZGlkbid0IHdvcmsgYW55d2F5LlxyXG4gICAgICBjbGVhclVzZXIoKTtcclxuXHJcbiAgICAgIC8vIExvZyB0aGUgZXJyb3IgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggQnJpZGdlLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgTG9naW4gfCBcIiArIGVycm9yLnN0YXR1cy50b1N0cmluZygpICsgXCIgPj4gXCIgKyBlcnJvci5tZXNzYWdlICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgZmFpbCgpIGhhbmRsZXIuXHJcbiAgICAgIGRlZmVycmVkLnJlamVjdCggZXJyb3IsIGpxWEhSICk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBUaGlzIHJlcXVlc3QgdXNlcyBhbiBlbXB0eSBwYXlsb2FkXHJcbiAgICB2YXIgcGF5bG9hZCA9IHt9O1xyXG5cclxuICAgIC8vIFNldCB3aGV0aGVyIG9yIG5vdCB0aGUgQnJpZGdlIHNob3VsZCBzdG9yZSB1c2VyIGNyZWRlbnRpYWxzIGFuZCBCcmlkZ2UgY29uZmlndXJhdGlvblxyXG4gICAgLy8gdG8gbG9jYWwgc3RvcmFnZS5cclxuICAgIHNlbGYudXNlTG9jYWxTdG9yYWdlID0gdXNlTG9jYWxTdG9yYWdlO1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSBhbiBJZGVudGl0eSBvYmplY3Qgd2l0aCB0aGUgdXNlcidzIGNyZWRlbnRpYWxzLlxyXG4gICAgc2V0SWRlbnRpdHkoIGVtYWlsLCBoYXNoZWRQYXNzd29yZCwgdHJ1ZSApO1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3RQcml2YXRlKCAnR0VUJywgJ2xvZ2luJywgcGF5bG9hZCwgbnVsbCApLmRvbmUoIG9uRG9uZSApLmZhaWwoIG9uRmFpbCApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQUklWQVRFXSByZXF1ZXN0UmVjb3ZlclBhc3N3b3JkUHJpdmF0ZSgpXHJcbiAgLy8gVG8gYmUgY2FsbGVkIGJ5IHRoZSBwYWdlIGF0IHRoZSBhZGRyZXNzIHdoaWNoIGFuIGFjY291bnQgcmVjb3ZlcnkgZW1haWwgbGlua3MgdGhlIHVzZXJcclxuICAvLyB0by4gVGhleSB3aWxsIGhhdmUgZW50ZXJlZCB0aGVpciBuZXcgcGFzc3dvcmQgdG8gYW4gaW5wdXQgZmllbGQsIGFuZCB0aGUgZW1haWwgYW5kIGhhc2ggd2lsbCBcclxuICAvLyBoYXZlIGJlZW4gbWFkZSBhdmFpbGFibGUgdG8gdGhlIHBhZ2UgaW4gdGhlIHF1ZXJ5IHN0cmluZyBvZiB0aGUgVVJMLlxyXG4gIHZhciByZXF1ZXN0UmVjb3ZlclBhc3N3b3JkUHJpdmF0ZSA9IGZ1bmN0aW9uICggZW1haWwsIHBhc3N3b3JkLCBoYXNoICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgcmVjb3ZlciBwYXNzd29yZCBjYWxsIG9jY3VycmluZy5cclxuICAgIGlmICggdHlwZW9mIHNlbGYub25SZWNvdmVyUGFzc3dvcmRDYWxsZWQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vblJlY292ZXJQYXNzd29yZENhbGxlZCggZW1haWwsIGhhc2ggKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBIYXNoIHRoZSB1c2VyJ3MgcGFzc3dvcmRcclxuICAgIHZhciBoYXNoZWRQYXNzd29yZCA9IENyeXB0b0pTLlNIQTI1NiggcGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvSlMuZW5jLkhleCApO1xyXG5cclxuICAgIC8vIENsZWFyIHRoZSB1bmVuY3J5cHRlZCBwYXNzd29yZCBmcm9tIG1lbW9yeVxyXG4gICAgcGFzc3dvcmQgPSBudWxsO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byByZXR1cm4gc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgc3VjY2Vzcy9mYWlsdXJlIGNvbnZlbmllbnRseS5cclxuICAgIHZhciBkZWZlcnJlZCA9IG5ldyBqUXVlcnkuRGVmZXJyZWQoKTtcclxuXHJcbiAgICAvLyBCdWlsZCBvdXIgaW50ZXJuYWwgc3VjY2VzcyBoYW5kbGVyICh0aGlzIGNhbGxzIGRlZmVycmVkLnJlc29sdmUoKSlcclxuICAgIHZhciBvbkRvbmUgPSBmdW5jdGlvbiAoIGRhdGEsIGpxWEhSICkge1xyXG5cclxuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgY29udGVudCB0eXBlIChNZXNzYWdlKSBpcyBmb3JtYXR0ZWQgY29ycmVjdGx5LlxyXG4gICAgICBpZiAoIHR5cGVvZiBkYXRhLmNvbnRlbnQubWVzc2FnZSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgb25GYWlsKCB7IHN0YXR1czogNDE3LCBtZXNzYWdlOiAnNDE3IChFeHBlY3RhdGlvbiBGYWlsZWQpIE1hbGZvcm1lZCBtZXNzYWdlLicgfSwganFYSFIgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIExvZyB0aGUgc3VjY2VzcyB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IFJlY292ZXIgUGFzc3dvcmQgfCBcIiArIGRhdGEuY29udGVudC5tZXNzYWdlICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgc3VjY2VzcygpIGhhbmRsZXIuXHJcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoIGRhdGEsIGpxWEhSICk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBCdWlsZCBvdXIgaW50ZXJuYWwgZmFpbHVyZSBoYW5kbGVyICh0aGlzIGNhbGxzIGRlZmVycmVkLnJlamVjdCgpKVxyXG4gICAgdmFyIG9uRmFpbCA9IGZ1bmN0aW9uICggZXJyb3IsIGpxWEhSICkge1xyXG5cclxuICAgICAgLy8gTG9nIHRoZSBlcnJvciB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBCcmlkZ2UuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvciggXCJCUklER0UgfCBSZWNvdmVyIFBhc3N3b3JkIHwgXCIgKyBlcnJvci5zdGF0dXMudG9TdHJpbmcoKSArIFwiID4+IFwiICsgZXJyb3IubWVzc2FnZSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaWduYWwgdGhlIGRlZmVycmVkIG9iamVjdCB0byB1c2UgaXRzIGZhaWwoKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yLCBqcVhIUiApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgdGhlIHBheWxvYWQgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdFxyXG4gICAgdmFyIHBheWxvYWQgPSB7XHJcbiAgICAgIFwiaGFzaFwiOiBoYXNoLFxyXG4gICAgICBcInBhc3N3b3JkXCI6IGhhc2hlZFBhc3N3b3JkXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBhbiBJZGVudGl0eSBvYmplY3Qgd2l0aCBhIGJsYW5rIHBhc3N3b3JkLlxyXG4gICAgdmFyIHRlbXBJZGVudGl0eSA9IG5ldyBJZGVudGl0eSggZW1haWwsICcnLCB0cnVlICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdFByaXZhdGUoICdQT1NUJywgJ3JlY292ZXItcGFzc3dvcmQnLCBwYXlsb2FkLCB0ZW1wSWRlbnRpdHkgKS5kb25lKCBvbkRvbmUgKS5mYWlsKCBvbkZhaWwgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGRlZmVycmVkIG9iamVjdCBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBlcnJvcnMgYXMgdGhleSBjaG9vc2UuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZSgpO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdFJlZ2lzdGVyUHJpdmF0ZSgpXHJcbiAgLy8gUmVnaXN0ZXIgaW4gYSB1c2VyIHdpdGggdGhlIGdpdmVuIGVtYWlsL3Bhc3N3b3JkIHBhaXIsIG5hbWUsIGFuZCBhcHBsaWNhdGlvbi1zcGVjaWZpYyBkYXRhLlxyXG4gIC8vIFRoaXMgZG9lcyBjcmVhdGVzIGFuIElkZW50aXR5IG9iamVjdCBmb3IgdGhlIHVzZXIgdG8gc2lnbiB0aGUgcmVnaXN0cmF0aW9uIHJlcXVlc3QncyBITUFDLFxyXG4gIC8vIGhvd2V2ZXIgdGhlIHBhc3N3b3JkIGlzIHRyYW5zbWl0dGVkIGluIHRoZSBjb250ZW50IG9mIHRoZSBtZXNzYWdlIChTSEEtMjU2IGVuY3J5cHRlZCksIHNvXHJcbiAgLy8gdGhlb3JldGljYWxseSBhbiBpbnRlcmNlcHRvciBvZiB0aGlzIG1lc3NhZ2UgY291bGQgcmVjb25zdHJ1Y3QgdGhlIEhNQUMgYW5kIGZhbHNpZnkgYSByZXF1ZXN0XHJcbiAgLy8gdG8gdGhlIHNlcnZlciB0aGUgcmVxdWVzdCBpcyBtYWRlIHdpdGhvdXQgdXNpbmcgSFRUUFMgcHJvdG9jb2wgYW5kIGdpdmVuIGVub3VnaCBwZXJzaXN0ZW5jZVxyXG4gIC8vIG9uIHRoZSBwYXJ0IG9mIHRoZSBhdHRhY2tlci4gXHJcbiAgdmFyIHJlcXVlc3RSZWdpc3RlclByaXZhdGUgPSBmdW5jdGlvbiAoIGVtYWlsLCBwYXNzd29yZCwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgYXBwRGF0YSApIHtcclxuXHJcbiAgICAvLyBOb3RpZnkgdGhlIHVzZXIgb2YgdGhlIHJlZ2lzdGVyIGNhbGwgb2NjdXJyaW5nLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vblJlZ2lzdGVyQ2FsbGVkID09PSBcImZ1bmN0aW9uXCIgKSB7XHJcbiAgICAgIHNlbGYub25SZWdpc3RlckNhbGxlZCggZW1haWwsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGFwcERhdGEgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBIYXNoIHRoZSB1c2VyJ3MgcGFzc3dvcmRcclxuICAgIHZhciBoYXNoZWRQYXNzd29yZCA9IENyeXB0b0pTLlNIQTI1NiggcGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvSlMuZW5jLkhleCApO1xyXG5cclxuICAgIC8vIENsZWFyIHRoZSB1bmVuY3J5cHRlZCBwYXNzd29yZCBmcm9tIG1lbW9yeVxyXG4gICAgcGFzc3dvcmQgPSBudWxsO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byByZXR1cm4gc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgc3VjY2Vzcy9mYWlsdXJlIGNvbnZlbmllbnRseS5cclxuICAgIHZhciBkZWZlcnJlZCA9IG5ldyBqUXVlcnkuRGVmZXJyZWQoKTtcclxuXHJcbiAgICAvLyBCdWlsZCBvdXIgaW50ZXJuYWwgc3VjY2VzcyBoYW5kbGVyICh0aGlzIGNhbGxzIGRlZmVycmVkLnJlc29sdmUoKSlcclxuICAgIHZhciBvbkRvbmUgPSBmdW5jdGlvbiAoIGRhdGEsIGpxWEhSICkge1xyXG5cclxuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgY29udGVudCB0eXBlIChNZXNzYWdlKSBpcyBmb3JtYXR0ZWQgY29ycmVjdGx5LlxyXG4gICAgICBpZiAoIHR5cGVvZiBkYXRhLmNvbnRlbnQubWVzc2FnZSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgb25GYWlsKCB7IHN0YXR1czogNDE3LCBtZXNzYWdlOiAnNDE3IChFeHBlY3RhdGlvbiBGYWlsZWQpIE1hbGZvcm1lZCBtZXNzYWdlLicgfSwganFYSFIgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIExvZyB0aGUgc3VjY2VzcyB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IFJlZ2lzdGVyIHwgXCIgKyBkYXRhLmNvbnRlbnQubWVzc2FnZSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaWduYWwgdGhlIGRlZmVycmVkIG9iamVjdCB0byB1c2UgaXRzIHN1Y2Nlc3MoKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCBkYXRhLCBqcVhIUiApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIGZhaWx1cmUgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZWplY3QoKSlcclxuICAgIHZhciBvbkZhaWwgPSBmdW5jdGlvbiAoIGVycm9yLCBqcVhIUiApIHtcclxuXHJcbiAgICAgIC8vIExvZyB0aGUgZXJyb3IgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggQnJpZGdlLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgUmVnaXN0ZXIgfCBcIiArIGVycm9yLnN0YXR1cy50b1N0cmluZygpICsgXCIgPj4gXCIgKyBlcnJvci5tZXNzYWdlICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgZmFpbCgpIGhhbmRsZXIuXHJcbiAgICAgIGRlZmVycmVkLnJlamVjdCggZXJyb3IsIGpxWEhSICk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBCdWlsZCB0aGUgcGF5bG9hZCBvYmplY3QgdG8gc2VuZCB3aXRoIHRoZSByZXF1ZXN0XHJcbiAgICB2YXIgcGF5bG9hZCA9IHtcclxuICAgICAgXCJlbWFpbFwiOiBlbWFpbCxcclxuICAgICAgXCJwYXNzd29yZFwiOiBoYXNoZWRQYXNzd29yZCxcclxuICAgICAgXCJmaXJzdC1uYW1lXCI6IGZpcnN0TmFtZSxcclxuICAgICAgXCJsYXN0LW5hbWVcIjogbGFzdE5hbWUsXHJcbiAgICAgIFwiYXBwLWRhdGFcIjogYXBwRGF0YVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSB0ZW1wb3JhcnkgYW4gSWRlbnRpdHkgb2JqZWN0IHdpdGggYSBibGFuayBwYXNzd29yZC5cclxuICAgIHZhciB0ZW1wSWRlbnRpdHkgPSBuZXcgSWRlbnRpdHkoIGVtYWlsLCAnJywgdHJ1ZSApO1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3RQcml2YXRlKCAnUFVUJywgJ3JlZ2lzdGVyJywgcGF5bG9hZCwgdGVtcElkZW50aXR5ICkuZG9uZSggb25Eb25lICkuZmFpbCggb25GYWlsICk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSBkZWZlcnJlZCBvYmplY3Qgc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgZXJyb3JzIGFzIHRoZXkgY2hvb3NlLlxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2UoKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIHJlcXVlc3RWZXJpZnlFbWFpbFByaXZhdGUoKVxyXG4gIC8vIFRvIGJlIGNhbGxlZCBieSB0aGUgcGFnZSB0aGUgYXQgYWRkcmVzcyB3aGljaCBhbiBlbWFpbCB2ZXJpZmljYXRpb24gZW1haWwgbGlua3MgdGhlIHVzZXIgdG8uXHJcbiAgLy8gVGhlIHVzZXIgd2lsbCBiZSBzZW50IHRvIHRoaXMgcGFnZSB3aXRoIHRoZWlyIGVtYWlsIGFuZCBhIGhhc2ggaW4gdGhlIHF1ZXJ5IHN0cmluZyBvZiB0aGUgVVJMLlxyXG4gIHZhciByZXF1ZXN0VmVyaWZ5RW1haWxQcml2YXRlID0gZnVuY3Rpb24gKCBlbWFpbCwgaGFzaCApIHtcclxuXHJcbiAgICAvLyBOb3RpZnkgdGhlIHVzZXIgb2YgdGhlIHZlcmlmeSBlbWFpbCBjYWxsIG9jY3VycmluZy5cclxuICAgIGlmICggdHlwZW9mIHNlbGYub25WZXJpZnlFbWFpbENhbGxlZCA9PT0gXCJmdW5jdGlvblwiICkge1xyXG4gICAgICBzZWxmLm9uVmVyaWZ5RW1haWxDYWxsZWQoIGVtYWlsLCBoYXNoICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgb2JqZWN0IHRvIHJldHVybiBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBzdWNjZXNzL2ZhaWx1cmUgY29udmVuaWVudGx5LlxyXG4gICAgdmFyIGRlZmVycmVkID0gbmV3IGpRdWVyeS5EZWZlcnJlZCgpO1xyXG5cclxuICAgIC8vIEJ1aWxkIG91ciBpbnRlcm5hbCBzdWNjZXNzIGhhbmRsZXIgKHRoaXMgY2FsbHMgZGVmZXJyZWQucmVzb2x2ZSgpKVxyXG4gICAgdmFyIG9uRG9uZSA9IGZ1bmN0aW9uICggZGF0YSwganFYSFIgKSB7XHJcblxyXG4gICAgICAvLyBDaGVjayB0aGF0IHRoZSBjb250ZW50IHR5cGUgKE1lc3NhZ2UpIGlzIGZvcm1hdHRlZCBjb3JyZWN0bHkuXHJcbiAgICAgIGlmICggdHlwZW9mIGRhdGEuY29udGVudC5tZXNzYWdlICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBvbkZhaWwoIHsgc3RhdHVzOiA0MTcsIG1lc3NhZ2U6ICc0MTcgKEV4cGVjdGF0aW9uIEZhaWxlZCkgTWFsZm9ybWVkIG1lc3NhZ2UuJyB9LCBqcVhIUiApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gTG9nIHRoZSBzdWNjZXNzIHRvIHRoZSBjb25zb2xlLlxyXG4gICAgICBpZiAoIHNlbGYuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coIFwiQlJJREdFIHwgVmVyaWZ5IEVtYWlsIHwgXCIgKyBkYXRhLmNvbnRlbnQubWVzc2FnZSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaWduYWwgdGhlIGRlZmVycmVkIG9iamVjdCB0byB1c2UgaXRzIHN1Y2Nlc3MoKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCBkYXRhLCBqcVhIUiApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIGZhaWx1cmUgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZWplY3QoKSlcclxuICAgIHZhciBvbkZhaWwgPSBmdW5jdGlvbiAoIGVycm9yLCBqcVhIUiApIHtcclxuXHJcbiAgICAgIC8vIExvZyB0aGUgZXJyb3IgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggQnJpZGdlLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgVmVyaWZ5IEVtYWlsIHwgXCIgKyBlcnJvci5zdGF0dXMudG9TdHJpbmcoKSArIFwiID4+IFwiICsgZXJyb3IubWVzc2FnZSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaWduYWwgdGhlIGRlZmVycmVkIG9iamVjdCB0byB1c2UgaXRzIGZhaWwoKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yLCBqcVhIUiApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgdGhlIHBheWxvYWQgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdFxyXG4gICAgdmFyIHBheWxvYWQgPSB7XHJcbiAgICAgIFwiaGFzaFwiOiBoYXNoXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBhbiBJZGVudGl0eSBvYmplY3Qgd2l0aCBhIGJsYW5rIHBhc3N3b3JkLlxyXG4gICAgdmFyIHRlbXBJZGVudGl0eSA9IG5ldyBJZGVudGl0eSggZW1haWwsICcnLCB0cnVlICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdFByaXZhdGUoICdQT1NUJywgJ3ZlcmlmeS1lbWFpbCcsIHBheWxvYWQsIHRlbXBJZGVudGl0eSApLmRvbmUoIG9uRG9uZSApLmZhaWwoIG9uRmFpbCApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlKCk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQUklWQVRFXSBzZXRJZGVudGl0eSgpXHJcbiAgLy8gU2V0cyB0aGUgY3VycmVudCBJZGVudGl0eSBvYmplY3QgdG8gYSBuZXcgaW5zdGFuY2UgZ2l2ZW4gYSB1c2VyJ3MgZW1haWwgYW5kIHBhc3N3b3JkLlxyXG4gIHZhciBzZXRJZGVudGl0eSA9IGZ1bmN0aW9uICggZW1haWwsIHBhc3N3b3JkLCBkb250SGFzaFBhc3N3b3JkICkge1xyXG5cclxuICAgIGlkZW50aXR5ID0gbmV3IElkZW50aXR5KCBlbWFpbCwgcGFzc3dvcmQsIGRvbnRIYXNoUGFzc3dvcmQgKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIHNldFVzZXJcclxuICAvLyBTZXRzIHRoZSBjdXJyZW50IHVzZXIgYW5kIGFkZGl0aW9uYWwgZGF0YSBvYmplY3RzIGJhc2VkIG9uIHRoZSBkYXRhIHJldHVybmVkIGZyb20gYSBsb2dpblxyXG4gIC8vIGFuZCBwZXJmb3JtcyBhbGwgb2YgdGhlIGFzc29jaWF0ZWQgZXJyb3IgY2hlY2tzIGZvciBtYWxmb3JtZWQgbG9naW4gZGF0YS5cclxuICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICggdXNlciwgYWRkaXRpb25hbERhdGEgKSB7XHJcblxyXG4gICAgLy8gU2V0IHRoZSB1c2VyIGFuZCBhZGRpdGlvbmFsIGRhdGEgb2JqZWN0c1xyXG4gICAgc2VsZi51c2VyID0gdXNlcjtcclxuICAgIHNlbGYuYWRkaXRpb25hbERhdGEgPSBhZGRpdGlvbmFsRGF0YTtcclxuXHJcbiAgfTtcclxuXHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vIFBVQkxJQyAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gUFJPUEVSVElFUyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLy8gW1BVQkxJQ10gYWRkaXRpb25hbERhdGFcclxuICAvLyBUaGUgYSBoYXNobWFwIG9mIG9wdGlvbmFsIG9iamVjdHMgcmV0dXJuZWQgYnkgdGhlIHRoZSBkYXRhYmFzZSB0aGF0IHByb3ZpZGUgYWRkaXRpb25hbFxyXG4gIC8vIGluZm9ybWF0aW9uIHRvIGJlIHVzZWQgZm9yIGltcGxlbWVudGF0aW9uLXNwZWNpZmljIGxvZ2luIG5lZWRzLlxyXG4gIHNlbGYuYWRkaXRpb25hbERhdGEgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSBkZWJ1Z1xyXG4gIC8vIElmIHNldCB0byB0cnVlLCBCcmlkZ2Ugd2lsbCBsb2cgZXJyb3JzIGFuZCB3YXJuaW5ncyB0byB0aGUgY29uc29sZSB3aGVuIHRoZXkgb2NjdXIuXHJcbiAgc2VsZi5kZWJ1ZyA9IGZhbHNlO1xyXG5cclxuICAvLyBbUFVCTElDXSB0aW1lb3V0XHJcbiAgLy8gVGhlIHRpbWVvdXQgcGVyaW9kIGZvciByZXF1ZXN0cyAoaW4gbWlsbGlzZWNvbmRzKS5cclxuICBzZWxmLnRpbWVvdXQgPSAxMDAwMDtcclxuXHJcbiAgLy8gW1BVQkxJQ10gdXJsXHJcbiAgLy8gVGhlIFVSTCBwYXRoIHRvIHRoZSBBUEkgdG8gYmUgYnJpZGdlZC4gVGhpcyBVUkwgbXVzdCBiZSB3cml0dGVuIHNvIHRoYXQgdGhlIGZpbmFsIFxyXG4gIC8vIGNoYXJhY3RlciBpcyBhIGZvcndhcmQtc2xhc2ggKGUuZy4gaHR0cHM6Ly9wZWlyLmF4b25pbnRlcmFjdGl2ZS5jYS9hcGkvMS4wLykuXHJcbiAgc2VsZi51cmwgPSAnJztcclxuXHJcbiAgLy8gW1BVQkxJQ10gdXNlTG9jYWxTdG9yYWdlXHJcbiAgLy8gV2hldGhlciBvciBub3QgdXNlciBjcmVkZW50aWFscyBhbmQgQnJpZGdlIGNvbmZpZ3VyYXRpb24gd2lsbCBiZSBwZXJzaXN0ZWQgdG8gbG9jYWwgc3RvcmFnZS5cclxuICBzZWxmLnVzZUxvY2FsU3RvcmFnZSA9IGZhbHNlO1xyXG5cclxuICAvLyBbUFVCTElDXSB1c2VyXHJcbiAgLy8gVGhlIFVzZXIgb2JqZWN0IHJldHVybmVkIGJ5IHRoZSB0aGUgZGF0YWJhc2UgcmVsYXRpbmcgdG8gdGhlIGN1cnJlbnQgaWRlbnRpdHkuXHJcbiAgc2VsZi51c2VyID0gbnVsbDtcclxuXHJcblxyXG4gIC8vLy8vLy8vLy8vL1xyXG4gIC8vIEVWRU5UUyAvL1xyXG4gIC8vLy8vLy8vLy8vL1xyXG5cclxuICAvLyBbUFVCTElDXSBvbkNoYW5nZVBhc3N3b3JkQ2FsbGVkKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSByZXF1ZXN0Q2hhbmdlUGFzc3dvcmQoKSBmdW5jdGlvbiBpcyBjYWxsZWQuXHJcbiAgLy8gU2lnbmF0dXJlOiBmdW5jdGlvbiAoKSB7fVxyXG4gIHNlbGYub25DaGFuZ2VQYXNzd29yZENhbGxlZCA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIG9uRm9yZ290UGFzc3dvcmRDYWxsZWQoKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gdGhlIHJlcXVlc3RGb3Jnb3RQYXNzd29yZCgpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggZW1haWwgKSB7fVxyXG4gIHNlbGYub25Gb3Jnb3RQYXNzd29yZENhbGxlZCA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIG9uTG9naW5DYWxsZWQoKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gdGhlIHJlcXVlc3RMb2dpbigpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggZW1haWwsIHVzZUxvY2FsU3RvcmFnZSApIHt9XHJcbiAgc2VsZi5vbkxvZ2luQ2FsbGVkID0gbnVsbDtcclxuXHJcbiAgLy8gW1BVQkxJQ10gbG9naW5FcnJvckNhbGxiYWNrKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSBsb2dvdXQoKSBmdW5jdGlvbiBpcyBjYWxsZWQuXHJcbiAgLy8gU2lnbmF0dXJlOiBmdW5jdGlvbiAoKSB7fVxyXG4gIHNlbGYub25Mb2dvdXRDYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSBvblJlY292ZXJQYXNzd29yZENhbGxlZCgpXHJcbiAgLy8gVGhlIGNhbGxiYWNrIHRvIGNhbGwgd2hlbiB0aGUgcmVxdWVzdFJlY292ZXJQYXNzd29yZCgpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggZW1haWwsIGhhc2ggKSB7fVxyXG4gIHNlbGYub25SZWNvdmVyUGFzc3dvcmRDYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSBvblJlZ2lzdGVyQ2FsbGVkKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSByZXF1ZXN0UmVnaXN0ZXIoKSBmdW5jdGlvbiBpcyBjYWxsZWQuXHJcbiAgLy8gU2lnbmF0dXJlOiBmdW5jdGlvbiAoIGVtYWlsLCBmaXJzdE5hbWUsIGxhc3ROYW1lLCBhcHBEYXRhICkge31cclxuICBzZWxmLm9uUmVnaXN0ZXJDYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0Q2FsbGJhY2soKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gYSByZXF1ZXN0KCkgY2FsbCBvY2N1cnMsIGJ1dCBiZWZvcmUgaXQgaXMgc2VudC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggbWV0aG9kLCByZXNvdXJjZSwgcGF5bG9hZCApIHt9XHJcbiAgc2VsZi5vblJlcXVlc3RDYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSBvblZlcmlmeUVtYWlsQ2FsbGVkKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSByZXF1ZXN0VmVyaWZ5RW1haWwoKSBmdW5jdGlvbiBpcyBjYWxsZWQuXHJcbiAgLy8gU2lnbmF0dXJlOiBmdW5jdGlvbiAoIGVtYWlsLCBoYXNoICkge31cclxuICBzZWxmLm9uVmVyaWZ5RW1haWxDYWxsZWQgPSBudWxsO1xyXG5cclxuXHJcbiAgLy8vLy8vLy8vL1xyXG4gIC8vIElOSVQgLy9cclxuICAvLy8vLy8vLy8vXHJcblxyXG4gIC8vIFtQVUJMSUNdIGluaXQoKVxyXG4gIC8vIENvbmZpZ3VyZSB0aGViIEJyaWRnZSB3aXRoIGEgbmV3IFVSTCBhbmQgdGltZW91dC5cclxuICBzZWxmLmluaXQgPSBmdW5jdGlvbiAoIHVybCwgdGltZW91dCApIHtcclxuXHJcbiAgICBzZWxmLnVybCA9IHVybDtcclxuICAgIHNlbGYudGltZW91dCA9IHRpbWVvdXQ7XHJcblxyXG4gIH07XHJcblxyXG5cclxuICAvLy8vLy8vLy8vLy8vLy9cclxuICAvLyBGVU5DVElPTlMgLy9cclxuICAvLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLy8gW1BVQkxJQ10gaXNFcnJvckNvZGVSZXNwb25zZSgpXHJcbiAgLy8gUmV0dXJucyBhbiBFcnJvciBvYmplY3QgaWYgdGhlIHByb3ZpZGVkIGpxWEhSIGhhcyBhIHN0YXR1cyBjb2RlIGJldHdlZW4gNDAwIGFuZCA1OTlcclxuICAvLyAoaW5jbHVzaXZlKS4gU2luY2UgdGhlIDQwMCBhbmQgNTAwIHNlcmllcyBzdGF0dXMgY29kZXMgcmVwcmVzZW50IGVycm9ycyBvZiB2YXJpb3VzIGtpbmRzLFxyXG4gIC8vIHRoaXMgYWN0cyBhcyBhIGNhdGNoLWFsbCBmaWx0ZXIgZm9yIGNvbW1vbiBlcnJvciBjYXNlcyB0byBiZSBoYW5kbGVkIGJ5IHRoZSBjbGllbnQuXHJcbiAgLy8gUmV0dXJucyBudWxsIGlmIHRoZSByZXNwb25zZSBzdGF0dXMgaXMgbm90IGJldHdlZW4gNDAwIGFuZCA1OTkgKGluY2x1c2l2ZSkuXHJcbiAgLy8gRXJyb3IgZm9ybWF0OiB7IHN0YXR1czogNDA0LCBtZXNzYWdlOiBcIlRoZSByZXNvdXJjZSB5b3UgcmVxdWVzdGVkIHdhcyBub3QgZm91bmQuXCIgfVxyXG4gIHNlbGYuaXNFcnJvckNvZGVSZXNwb25zZSA9IGZ1bmN0aW9uICgganFYSFIgKSB7XHJcblxyXG4gICAgLy8gUmV0dXJuIGFuIEVycm9yIG9iamVjdCBpZiB0aGUgc3RhdHVzIGNvZGUgaXMgYmV0d2VlbiA0MDAgYW5kIDU5OSAoaW5jbHVzaXZlKS5cclxuICAgIGlmICgganFYSFIuc3RhdHVzID49IDQwMCAmJiBqcVhIUi5zdGF0dXMgPCA2MDAgKSB7XHJcblxyXG4gICAgICBzd2l0Y2ggKCBqcVhIUi5zdGF0dXMgKSB7XHJcbiAgICAgIGNhc2UgNDAwOlxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXM6IDQwMCxcclxuICAgICAgICAgIG1lc3NhZ2U6ICc0MDAgKEJhZCBSZXF1ZXN0KSA+PiBZb3VyIHJlcXVlc3Qgd2FzIG5vdCBmb3JtYXR0ZWQgY29ycmVjdGx5LidcclxuICAgICAgICB9O1xyXG4gICAgICBjYXNlIDQwMTpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzOiA0MDEsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnNDAxIChVbmF1dGhvcml6ZWQpID4+IFlvdSBkbyBub3QgaGF2ZSBzdWZmaWNpZW50IHByaXZlbGlnZXMgdG8gcGVyZm9ybSB0aGlzIG9wZXJhdGlvbi4nXHJcbiAgICAgICAgfTtcclxuICAgICAgY2FzZSA0MDM6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1czogNDAzLFxyXG4gICAgICAgICAgbWVzc2FnZTogJzQwMyAoRm9yYmlkZGVuKSA+PiBZb3VyIGVtYWlsIGFuZCBwYXNzd29yZCBkbyBub3QgbWF0Y2ggYW55IHVzZXIgb24gZmlsZS4nXHJcbiAgICAgICAgfTtcclxuICAgICAgY2FzZSA0MDQ6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1czogNDA0LFxyXG4gICAgICAgICAgbWVzc2FnZTogJzQwNCAoTm90IEZvdW5kKSA+PiBUaGUgcmVzb3VyY2UgeW91IHJlcXVlc3RlZCBkb2VzIG5vdCBleGlzdC4nXHJcbiAgICAgICAgfTtcclxuICAgICAgY2FzZSA0MDk6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1czogNDA5LFxyXG4gICAgICAgICAgbWVzc2FnZTogJzQwOSAoQ29uZmxpY3QpID4+IEEgdW5pcXVlIGRhdGFiYXNlIGZpZWxkIG1hdGNoaW5nIHlvdXIgUFVUIG1heSBhbHJlYWR5IGV4aXN0LidcclxuICAgICAgICB9O1xyXG4gICAgICBjYXNlIDUwMDpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzOiA1MDAsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnNTAwIChJbnRlcm5hbCBTZXJ2ZXIgRXJyb3IpID4+IEFuIGVycm9yIGhhcyB0YWtlbiBwbGFjZSBpbiB0aGUgQnJpZGdlIHNlcnZlci4nXHJcbiAgICAgICAgfTtcclxuICAgICAgY2FzZSA1MDM6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1czogNTAzLFxyXG4gICAgICAgICAgbWVzc2FnZTogJzUwMyAoU2VydmljZSBVbmF2YWlsYWJsZSkgPj4gVGhlIEJyaWRnZSBzZXJ2ZXIgbWF5IGJlIHN0b3BwZWQuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1czoganFYSFIuc3RhdHVzLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ0Vycm9yISBTb21ldGhpbmcgd2VudCB3cm9uZyEnXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFJldHVybiBudWxsIGZvciBubyBlcnJvciBjb2RlLlxyXG4gICAgcmV0dXJuIG51bGw7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIGlzTG9nZ2VkSW4oKVxyXG4gIC8vIENoZWNrIGlmIHRoZXJlIGlzIGN1cnJlbnRseSBhIHVzZXIgb2JqZWN0IHNldC4gSWYgbm8gdXNlciBvYmplY3QgaXMgc2V0LCB0aGVuIG5vbmVcclxuICAvLyB3YXMgcmV0dXJuZWQgZnJvbSB0aGUgbG9naW4gYXR0ZW1wdCAoYW5kIHRoZSB1c2VyIGlzIHN0aWxsIGxvZ2dlZCBvdXQpIG9yIHRoZSB1c2VyIFxyXG4gIC8vIGxvZ2dlZCBvdXQgbWFudWFsbHkuXHJcbiAgc2VsZi5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIHJldHVybiAoIHNlbGYudXNlciAhPT0gbnVsbCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSBsb2dvdXQoKVxyXG4gIC8vIFNldCB0aGUgdXNlciBvYmplY3QgdG8gbnVsbCBhbmQgY2xlYXIgdGhlIElkZW50aXR5IG9iamVjdCB1c2VyIHRvIHNpZ24gcmVxdWVzdHMgZm9yXHJcbiAgLy8gYXV0aGVudGljYXRpb24gcHVycG9zZXMsIHNvIHRoYXQgdGhlIGxvZ2dlZC1vdXQgdXNlcidzIGNyZWRlbnRpYWxzIGNhbid0IHN0aWxsIGJlXHJcbiAgLy8gdXNlciB0byBhdXRob3JpemUgcmVxdWVzdHMuXHJcbiAgc2VsZi5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgLy8gRGVsZXRlIHRoZSBJZGVudGl0eSBvYmplY3QgdG8gcHJlc2VydmUgdGhlIHVzZXIncyBwYXNzd29yZCBzZWN1cml0eS5cclxuICAgIGNsZWFySWRlbnRpdHkoKTtcclxuXHJcbiAgICAvLyBDbGVhciB0aGUgdXNlciBzbyBCcmlkZ2UgcmVwb3J0cyB0aGF0IGl0IGlzIGxvZ2dlZCBvdXQuXHJcbiAgICBjbGVhclVzZXIoKTtcclxuXHJcbiAgICAvLyBDbGVhciB0aGUgaWRlbnRpdHkgZnJvbSBsb2NhbCBzdG9yYWdlIHRvIHByZXNlcnZlIHRoZSB1c2VyJ3MgcGFzc3dvcmQgc2VjdXJpdHkuXHJcbiAgICAvLyBJZiBubyBpZGVudGl0eSBpcyBzdG9yZWQsIHRoaXMgd2lsbCBkbyBub3RoaW5nLlxyXG4gICAgalF1ZXJ5LmpTdG9yYWdlLmRlbGV0ZUtleSggJ2JyaWRnZS1jbGllbnQtaWRlbnRpdHknICk7XHJcblxyXG4gICAgLy8gTm90aWZ5IHRoZSB1c2VyIG9mIHRoZSBsb2dvdXQgYWN0aW9uLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vbkxvZ291dENhbGxlZCA9PT0gJ2Z1bmN0aW9uJyApIHtcclxuICAgICAgc2VsZi5vbkxvZ291dENhbGxlZCgpO1xyXG4gICAgfVxyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0KClcclxuICAvLyBTZW5kcyBhbiBYSFIgcmVxdWVzdCB1c2luZyBqUXVlcnkuYWpheCgpIHRvIHRoZSBnaXZlbiBBUEkgcmVzb3VyY2UgdXNpbmcgdGhlIGdpdmVuIFxyXG4gIC8vIEhUVFAgbWV0aG9kLiBUaGUgSFRUUCByZXF1ZXN0IGJvZHkgd2lsbCBiZSBzZXQgdG8gdGhlIEpTT04uc3RyaW5naWZ5KCllZCByZXF1ZXN0IFxyXG4gIC8vIHRoYXQgaXMgZ2VuZXJhdGVkIGJ5IHRoZSBJZGVudGl0eSBvYmplY3Qgc2V0IHRvIHBlcmZvcm0gSE1BQyBzaWduaW5nLlxyXG4gIC8vIFJldHVybnMgYSBqUXVlcnkganFaSFIgb2JqZWN0LiBTZWUgaHR0cDovL2FwaS5qcXVlcnkuY29tL2pRdWVyeS5hamF4LyNqcVhIUi5cclxuICAvLyBJZiBubyBJZGVudGl0eSBpcyBzZXQsIHNlbmRSZXF1ZXN0KCkgcmV0dXJucyBudWxsLCBpbmRpY2F0aW5nIG5vIHJlcXVlc3Qgd2FzIHNlbnQuXHJcbiAgc2VsZi5yZXF1ZXN0ID0gZnVuY3Rpb24gKCBtZXRob2QsIHJlc291cmNlLCBwYXlsb2FkICkge1xyXG5cclxuICAgIHJldHVybiByZXF1ZXN0UHJpdmF0ZSggbWV0aG9kLCByZXNvdXJjZSwgcGF5bG9hZCwgbnVsbCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0Q2hhbmdlUGFzc3dvcmQoKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdENoYW5nZVBhc3N3b3JkKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RDaGFuZ2VQYXNzd29yZFByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RDaGFuZ2VQYXNzd29yZCA9IGZ1bmN0aW9uICggb2xkUGFzc3dvcmQsIG5ld1Bhc3N3b3JkICkge1xyXG5cclxuICAgIHJldHVybiByZXF1ZXN0Q2hhbmdlUGFzc3dvcmRQcml2YXRlKCBvbGRQYXNzd29yZCwgbmV3UGFzc3dvcmQgKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gcmVxdWVzdEZvcmdvdFBhc3N3b3JkKClcclxuICAvLyBUaGUgcHVibGljIHJlcXVlc3RGb3Jnb3RQYXNzd29yZCgpIGZ1bmN0aW9uIHVzZWQgdG8gaGlkZSByZXF1ZXN0Rm9yZ290UGFzc3dvcmRQcml2YXRlKCkuXHJcbiAgc2VsZi5yZXF1ZXN0Rm9yZ290UGFzc3dvcmQgPSBmdW5jdGlvbiAoIGVtYWlsICkge1xyXG5cclxuICAgIHJldHVybiByZXF1ZXN0Rm9yZ290UGFzc3dvcmRQcml2YXRlKCBlbWFpbCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0TG9naW4oKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdExvZ2luKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RMb2dpblByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RMb2dpbiA9IGZ1bmN0aW9uICggZW1haWwsIHBhc3N3b3JkLCB1c2VMb2NhbFN0b3JhZ2UgKSB7XHJcblxyXG4gICAgcmV0dXJuIHJlcXVlc3RMb2dpblByaXZhdGUoIGVtYWlsLCBwYXNzd29yZCwgdXNlTG9jYWxTdG9yYWdlLCBmYWxzZSApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0TG9naW5TdG9yZWRJZGVudGl0eSgpXHJcbiAgLy8gQ2hlY2tzIHRoZSBicm93c2VyJ3MgbG9jYWwgc3RvcmFnZSBmb3IgYW4gZXhpc3RpbmcgdXNlciBhbmQgcGVyZm9ybXMgYSBsb2dpbiByZXF1ZXN0XHJcbiAgLy8gdXNpbmcgdGhlIHN0b3JlZCBjcmVkZW50aWFscyBpZiBvbmUgaXMgZm91bmQuIFJldHVybnMgYSBqUXVlcnkgRGVmZXJyZWQgb2JqZWN0IGlmIGEgbG9naW4gXHJcbiAgLy8gcmVxdWVzdCB3YXMgc2VudCBhbmQgbnVsbCBpZiBubyBzdG9yZWQgaWRlbnRpdHkgd2FzIGZvdW5kIC8gbG9naW4gcmVxdWVzdCB3YXMgc2VudC5cclxuICBzZWxmLnJlcXVlc3RMb2dpblN0b3JlZElkZW50aXR5ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIC8vIENoZWNrIGlmIGFuIGlkZW50aXR5IGlzIGluIGxvY2FsIHN0b3JhZ2UgdG8gdXNlIGZvciBhdXRoZW50aWNhdGlvbi5cclxuICAgIHZhciBzdG9yZWRJZGVudGl0eSA9IGpRdWVyeS5qU3RvcmFnZS5nZXQoICdicmlkZ2UtY2xpZW50LWlkZW50aXR5JywgbnVsbCApO1xyXG4gICAgaWYgKCBzdG9yZWRJZGVudGl0eSAhPT0gbnVsbCApIHtcclxuXHJcbiAgICAgIHZhciBwYXJzZWRJZGVudGl0eSA9IEpTT04ucGFyc2UoIHN0b3JlZElkZW50aXR5ICk7XHJcblxyXG4gICAgICBpZiAoIHNlbGYuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coIFwiU3RvZWQgaWRlbnRpdHk6IFwiICsgSlNPTi5zdHJpbmdpZnkoIHBhcnNlZElkZW50aXR5ICkgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2VuZCBhIGxvZ2luIHJlcXVlc3QgdXNpbmcgdGhlIHByaXZhdGUgbG9naW4gY2FsbCBhbmQgcmV0dXJuIHRoZSBkZWZlcnJlZCBvYmplY3RcclxuICAgICAgcmV0dXJuIHJlcXVlc3RMb2dpblByaXZhdGUoIHBhcnNlZElkZW50aXR5LmVtYWlsLCBwYXJzZWRJZGVudGl0eS5wYXNzd29yZCwgdHJ1ZSwgdHJ1ZSApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBObyBsb2dpbiByZXF1ZXN0IHdhcyBzZW50LCBzbyByZXR1cm4gbnVsbC5cclxuICAgIHJldHVybiBudWxsO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0UmVjb3ZlclBhc3N3b3JkKClcclxuICAvLyBUaGUgcHVibGljIHJlcXVlc3RSZWNvdmVyUGFzc3dvcmQoKSBmdW5jdGlvbiB1c2VkIHRvIGhpZGUgcmVxdWVzdFJlY292ZXJQYXNzd29yZFByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RSZWNvdmVyUGFzc3dvcmQgPSBmdW5jdGlvbiAoIGVtYWlsLCBwYXNzd29yZCwgaGFzaCApIHtcclxuXHJcbiAgICByZXF1ZXN0UmVjb3ZlclBhc3N3b3JkUHJpdmF0ZSggZW1haWwsIHBhc3N3b3JkLCBoYXNoICk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIHJlcXVlc3RSZWdpc3RlcigpXHJcbiAgLy8gVGhlIHB1YmxpYyByZXF1ZXN0UmVnaXN0ZXIoKSBmdW5jdGlvbiB1c2VkIHRvIGhpZGUgcmVxdWVzdFJlZ2lzdGVyUHJpdmF0ZSgpLlxyXG4gIHNlbGYucmVxdWVzdFJlZ2lzdGVyID0gZnVuY3Rpb24gKCBlbWFpbCwgcGFzc3dvcmQsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGFwcERhdGEgKSB7XHJcblxyXG4gICAgcmV0dXJuIHJlcXVlc3RSZWdpc3RlclByaXZhdGUoIGVtYWlsLCBwYXNzd29yZCwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgYXBwRGF0YSApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0VmVyaWZ5RW1haWwoKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdFZlcmlmeUVtYWlsKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RWZXJpZnlFbWFpbFByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RWZXJpZnlFbWFpbCA9IGZ1bmN0aW9uICggZW1haWwsIGhhc2ggKSB7XHJcblxyXG4gICAgcmV0dXJuIHJlcXVlc3RWZXJpZnlFbWFpbFByaXZhdGUoIGVtYWlsLCBoYXNoICk7XHJcblxyXG4gIH07XHJcblxyXG4gIHJldHVybiBzZWxmO1xyXG5cclxufTsiLCIvLyBJbmNsdWRlIGRlcGVuZGVuY2llc1xudmFyIGhtYWNfc2hhMjU2ID0gcmVxdWlyZSggJy4vaW5jbHVkZS9obWFjLXNoYTI1NicgKTtcbnZhciBqc29uMyA9IHJlcXVpcmUoICcuL2luY2x1ZGUvanNvbjMnICk7XG52YXIgc2hhMjU2ID0gcmVxdWlyZSggJy4vaW5jbHVkZS9zaGEyNTYnICk7XG5cbi8vIFtJZGVudGl0eSBDb25zdHJ1Y3Rvcl1cbi8vIFRoZSBJZGVudGl0eSBvYmplY3QgcmVwcmVzZW50cyBhbiBlbWFpbC9wYXNzd29yZCBwYWlyIHVzZWQgYXMgaWRlbnRpZmljYXRpb24gd2l0aCB0aGVcbi8vIGRhdGFiYXNlIHRvIHByb3ZpZGUgYXV0aGVuaWNhdGlvbiBmb3IgcmVxdWVzdHMuIFRoZSBJZGVudGl0eSBpcyB1c2VkIGFzIGEgcmVxdWVzdCBmYWN0b3J5XG4vLyB0byBjcmVhdGUgcmVxdWVzdHMgdGhhdCB3aWxsIGF1dGhlbnRpY2F0ZSB0aGUgd2l0aCB0aGUgc2VydmVyIHNlY3VyZWx5LlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoIGVtYWlsLCBwYXNzd29yZCwgZG9udEhhc2hQYXNzd29yZCApIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gVGhlIG9iamVjdCB0byBiZSByZXR1cm5lZCBmcm9tIHRoZSBmYWN0b3J5XG4gIHZhciBzZWxmID0ge307XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vIFBSSVZBVEUgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuICAvLy8vLy8vLy8vLy8vLy8vXG4gIC8vIFBST1BFUlRJRVMgLy9cbiAgLy8vLy8vLy8vLy8vLy8vL1xuXG4gIC8vIFtQUklWQVRFXSBoYXNoZWRQYXNzd29yZFxuICAvLyBUaGUgU0hBLTI1NiBlbmNvZGVkIHN0cmluZyBnZW5lcmF0ZWQgYnkgaGFzaGluZyB0aGUgZ2l2ZW4gcGFzc3dvcmQuIFxuICAvLyBbU0VDVVJJVFkgTk9URSAxXSBCeSBoYXNoaW5nIHRoZSBwYXNzd29yZCB3ZSBzdG9yZSBpbiBtZW1vcnkgYW5kIGtlZXBpbmcgaXQgbG9jYWwgdG8gXG4gIC8vIHRoaXMgZnVuY3Rpb24sIHdlIHByb3RlY3QgdGhlIHVzZXIncyBwYXNzd29yZCBmcm9tIHNjcnV0aW55IGZyb20gb3RoZXIgbG9jYWwgYXBwbGljYXRpb25zLlxuICAvLyBUaGUgcGFzc3dvcmQgc3VwcGxpZWQgYXMgYSBjb25zdHJ1Y3RvciBhcmd1bWVudCB3aWxsIGFsc28gYmUgbnVsbGVkIHNvIHRoYXQgaXQgaXMgbm90IGtlcHQgXG4gIC8vIGluIGFwcGxpY2F0aW9uIG1lbW9yeSBlaXRoZXIsIHNvIHRoYXQgdGhlIG9yaWdpbmFsIHBhc3N3b3JkIGluZm9ybWF0aW9uIGlzIGxvc3QuXG4gIC8vIFtTRUNVUklUWSBOT1RFIDRdIElmIGRvbnRIYXNoUGFzc3dvcmQgaXMgc2V0IHRvIHRydWUsIHRoaXMgaGFzaGluZyBwcm9jZXNzIGlzIHNraXBwZWQuIFRoaXMgXG4gIC8vIGZlYXR1cmUgZXhpc3RzIHRvIGFsbG93IHBhc3N3b3JkcyBzdG9yZWQgaW4gbG9jYWwgc3RvcmFnZSB0byBiZSB1c2VkIGZvciBhdXRoZW50aWNhdGlvbiwgc2luY2UgXG4gIC8vIHRoZXkgaGF2ZSBhbHJlYWR5IGJlZW4gaGFzZWQgaW4gdGhpcyB3YXkuIERPIE5PVCBVU0UgVEhJUyBGT1IgQU5ZVEhJTkcgRUxTRSFcbiAgdmFyIGhhc2hlZFBhc3N3b3JkID0gKCBkb250SGFzaFBhc3N3b3JkID09PSB0cnVlICkgPyBwYXNzd29yZCA6IFxuICAgIENyeXB0b0pTLlNIQTI1NiggcGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvSlMuZW5jLkhleCApO1xuXG4gIC8vIFtTRUNVUklUWSBOT1RFIDJdIFRoZSB1c2VyJ3MgZ2l2ZW4gcGFzc3dvcmQgc2hvdWxkIGJlIGZvcmdvdHRlbiBvbmNlIGl0IGhhcyBiZWVuIGhhc2hlZC5cbiAgLy8gQWx0aG91Z2ggdGhlIHBhc3N3b3JkIGlzIGxvY2FsIHRvIHRoaXMgY29uc3RydWN0b3IsIGl0IGlzIGJldHRlciB0aGF0IGl0IG5vdCBldmVuIGJlIFxuICAvLyBhdmFpbGFibGUgaW4gbWVtb3J5IG9uY2UgaXQgaGFzIGJlZW4gaGFzaGVkLCBzaW5jZSB0aGUgaGFzaGVkIHBhc3N3b3JkIGlzIG11Y2ggbW9yZSBcbiAgLy8gZGlmZmljdWx0IHRvIHJlY292ZXIgaW4gaXRzIG9yaWdpbmFsIGZvcm0uXG4gIHBhc3N3b3JkID0gbnVsbDtcblxuXG4gIC8vLy8vLy8vLy8vLy8vL1xuICAvLyBGVU5DVElPTlMgLy9cbiAgLy8vLy8vLy8vLy8vLy8vXG5cbiAgLy8gW1BSSVZBVEVdIGhtYWNTaWduUmVxdWVzdEJvZHkoKVxuICAvLyBSZXR1cm5zIHRoZSBnaXZlbiByZXF1ZXN0IG9iamVjdCBhZnRlciBhZGRpbmcgdGhlIFwiaG1hY1wiIHByb3BlcnR5IHRvIGl0IGFuZCBzZXR0aW5nIFwiaG1hY1wiIFxuICAvLyBieSB1c2luZyB0aGUgdXNlcidzIHBhc3N3b3JkIGFzIGEgU0hBLTI1NiBITUFDIGhhc2hpbmcgc2VjcmV0LlxuICAvLyBbU0VDVVJJVFkgTk9URSAzXSBUaGUgSE1BQyBzdHJpbmcgaXMgYSBoZXggdmFsdWUsIDY0IGNoYXJhY3RlcnMgaW4gbGVuZ3RoLiBJdCBpcyBjcmVhdGVkIFxuICAvLyBieSBjb25jYXRlbmF0aW5nIHRoZSBKU09OLnN0cmluZ2lmeSgpZWQgcmVxdWVzdCBjb250ZW50LCB0aGUgcmVxdWVzdCBlbWFpbCwgYW5kIHRoZSByZXF1ZXN0IFxuICAvLyB0aW1lIHRvZ2V0aGVyLCBhbmQgaGFzaGluZyB0aGUgcmVzdWx0IHVzaW5nIGhhc2hlZFBhc3N3b3JkIGFzIGEgc2FsdC4gXG4gIC8vXG4gIC8vIFBzZXVkb2NvZGU6XG4gIC8vIHRvSGFzaCA9IFJlcXVlc3QgQ29udGVudCBKU09OICsgUmVxdWVzdCBFbWFpbCArIFJlcXVlc3QgVGltZSBKU09OXG4gIC8vIHNhbHQgPSBoYXNoZWRQYXNzd29yZFxuICAvLyBobWFjU3RyaW5nID0gc2hhMjU2KCB0b0hhc2gsIHNhbHQgKVxuICAvLyByZXF1ZXN0LmhtYWMgPSBobWFjU3RyaW5nXG4gIC8vIFxuICAvLyBCeSBwZXJmb3JtaW5nIHRoZSBzYW1lIG9wZXJhdGlvbiBvbiB0aGUgZGF0YSwgdGhlIHNlcnZlciBjYW4gY29uZmlybSB0aGF0IHRoZSBITUFDIHN0cmluZ3MgXG4gIC8vIGFyZSBpZGVudGljYWwgYW5kIGF1dGhvcml6ZSB0aGUgcmVxdWVzdC5cbiAgdmFyIGhtYWNTaWduUmVxdWVzdEJvZHkgPSBmdW5jdGlvbiAoIHJlcUJvZHkgKSB7XG5cbiAgICAvLyBDcmVhdGUgdGhlIGNvbmNhdGVuYXRlZCBzdHJpbmcgdG8gYmUgaGFzaGVkIGFzIHRoZSBITUFDXG4gICAgdmFyIGNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeSggcmVxQm9keS5jb250ZW50ICk7XG4gICAgdmFyIGVtYWlsID0gcmVxQm9keS5lbWFpbDtcbiAgICB2YXIgdGltZSA9IHJlcUJvZHkudGltZS50b0lTT1N0cmluZygpO1xuICAgIHZhciBjb25jYXQgPSBjb250ZW50ICsgZW1haWwgKyB0aW1lO1xuXG4gICAgLy8gQWRkIHRoZSAnaG1hYycgcHJvcGVydHkgdG8gdGhlIHJlcXVlc3Qgd2l0aCBhIHZhbHVlIGNvbXB1dGVkIGJ5IHNhbHRpbmcgdGhlIGNvbmNhdCB3aXRoIHRoZVxuICAgIC8vIHVzZXIncyBoYXNoZWRQYXNzd29yZC5cbiAgICAvLyBbQ0FSRUZVTF0gaGFzaGVkUGFzc3dvcmQgc2hvdWxkIGJlIGEgc3RyaW5nLiBJZiBpdCBpc24ndCwgdGVycmlibGUgdGhpbmdzIFdJTEwgaGFwcGVuIVxuICAgIHJlcUJvZHkuaG1hYyA9IENyeXB0b0pTLkhtYWNTSEEyNTYoIGNvbmNhdCwgaGFzaGVkUGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvSlMuZW5jLkhleCApO1xuXG4gICAgaWYgKCBCcmlkZ2UuZGVidWcgPT09IHRydWUgKSB7XG4gICAgICBjb25zb2xlLmxvZyggJz09PSBITUFDIFNpZ25pbmcgUHJvY2VzcyA9PT0nICk7XG4gICAgICBjb25zb2xlLmxvZyggJ0hhc2hwYXNzOiBcIicgKyBoYXNoZWRQYXNzd29yZCArICdcIicgKTtcbiAgICAgIGNvbnNvbGUubG9nKCAnQ29udGVudDogXCInICsgY29udGVudCArICdcIicgKTtcbiAgICAgIGNvbnNvbGUubG9nKCAnRW1haWw6IFwiJyArIGVtYWlsICsgJ1wiJyApO1xuICAgICAgY29uc29sZS5sb2coICdUaW1lOiBcIicgKyB0aW1lICsgJ1wiJyApO1xuICAgICAgY29uc29sZS5sb2coICdDb25jYXQ6IFwiJyArIGNvbmNhdCArICdcIicgKTtcbiAgICAgIGNvbnNvbGUubG9nKCAnSE1BQzogXCInICsgcmVxQm9keS5obWFjICsgJ1wiJyApO1xuICAgICAgY29uc29sZS5sb2coICc9PT09PT09PT09PT09PT09PT09PT09PT09PT09JyApO1xuICAgIH1cblxuICAgIHJldHVybiByZXFCb2R5O1xuXG4gIH07XG5cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gUFVCTElDIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4gIC8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gUFJPUEVSVElFUyAvL1xuICAvLy8vLy8vLy8vLy8vLy8vXG5cbiAgLy8gW1BVQkxJQ10gZW1haWxcbiAgLy8gVGhlIGVtYWlsIHVzZWQgdG8gaWRlbnRpZnkgdGhlIHVzZXIgd2l0aGluIHRoZSBkYXRhYmFzZS5cbiAgc2VsZi5lbWFpbCA9IGVtYWlsO1xuXG5cbiAgLy8vLy8vLy8vLy8vLy8vXG4gIC8vIEZVTkNUSU9OUyAvL1xuICAvLy8vLy8vLy8vLy8vLy9cblxuICAvLyBbUFVCTElDXSBjcmVhdGVSZXF1ZXN0KClcbiAgLy8gUmV0dXJucyBhIG5ldyByZXF1ZXN0LCBnaXZlbiB0aGUgY29udGVudCBwYXlsb2FkIG9mIHRoZSByZXF1ZXN0IGFzIGFuIG9iamVjdC4gVXRpbGl6ZXNcbiAgLy8gaG1hY1NpZ25SZXF1ZXN0KCkgdG8gd3JhcCB0aGUgZ2l2ZW4gcGF5bG9hZCBpbiBhbiBhcHByb3ByaWF0ZSBoZWFkZXIgdG8gdmFsaWRhdGUgYWdhaW5zdCB0aGVcbiAgLy8gc2VydmVyLXNpZGUgYXV0aG9yaXphdGlvbiBzY2hlbWUgKGFzc3VtaW5nIHRoZSB1c2VyIGNyZWRlbnRpYWxzIGFyZSBjb3JyZWN0KS5cbiAgc2VsZi5jcmVhdGVSZXF1ZXN0ID0gZnVuY3Rpb24gKCBwYXlsb2FkICkge1xuXG4gICAgcmV0dXJuIGhtYWNTaWduUmVxdWVzdEJvZHkoIHtcbiAgICAgICdjb250ZW50JzogcGF5bG9hZCxcbiAgICAgICdlbWFpbCc6IGVtYWlsLFxuICAgICAgJ3RpbWUnOiBuZXcgRGF0ZSgpXG4gICAgfSApO1xuXG4gIH07XG5cbiAgcmV0dXJuIHNlbGY7XG5cbn07IiwiLypcbkNyeXB0b0pTIHYzLjEuMlxuY29kZS5nb29nbGUuY29tL3AvY3J5cHRvLWpzXG4oYykgMjAwOS0yMDEzIGJ5IEplZmYgTW90dC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbmNvZGUuZ29vZ2xlLmNvbS9wL2NyeXB0by1qcy93aWtpL0xpY2Vuc2VcbiovXG52YXIgQ3J5cHRvSlM9Q3J5cHRvSlN8fGZ1bmN0aW9uKGgscyl7dmFyIGY9e30sZz1mLmxpYj17fSxxPWZ1bmN0aW9uKCl7fSxtPWcuQmFzZT17ZXh0ZW5kOmZ1bmN0aW9uKGEpe3EucHJvdG90eXBlPXRoaXM7dmFyIGM9bmV3IHE7YSYmYy5taXhJbihhKTtjLmhhc093blByb3BlcnR5KFwiaW5pdFwiKXx8KGMuaW5pdD1mdW5jdGlvbigpe2MuJHN1cGVyLmluaXQuYXBwbHkodGhpcyxhcmd1bWVudHMpfSk7Yy5pbml0LnByb3RvdHlwZT1jO2MuJHN1cGVyPXRoaXM7cmV0dXJuIGN9LGNyZWF0ZTpmdW5jdGlvbigpe3ZhciBhPXRoaXMuZXh0ZW5kKCk7YS5pbml0LmFwcGx5KGEsYXJndW1lbnRzKTtyZXR1cm4gYX0saW5pdDpmdW5jdGlvbigpe30sbWl4SW46ZnVuY3Rpb24oYSl7Zm9yKHZhciBjIGluIGEpYS5oYXNPd25Qcm9wZXJ0eShjKSYmKHRoaXNbY109YVtjXSk7YS5oYXNPd25Qcm9wZXJ0eShcInRvU3RyaW5nXCIpJiYodGhpcy50b1N0cmluZz1hLnRvU3RyaW5nKX0sY2xvbmU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pbml0LnByb3RvdHlwZS5leHRlbmQodGhpcyl9fSxcbnI9Zy5Xb3JkQXJyYXk9bS5leHRlbmQoe2luaXQ6ZnVuY3Rpb24oYSxjKXthPXRoaXMud29yZHM9YXx8W107dGhpcy5zaWdCeXRlcz1jIT1zP2M6NCphLmxlbmd0aH0sdG9TdHJpbmc6ZnVuY3Rpb24oYSl7cmV0dXJuKGF8fGspLnN0cmluZ2lmeSh0aGlzKX0sY29uY2F0OmZ1bmN0aW9uKGEpe3ZhciBjPXRoaXMud29yZHMsZD1hLndvcmRzLGI9dGhpcy5zaWdCeXRlczthPWEuc2lnQnl0ZXM7dGhpcy5jbGFtcCgpO2lmKGIlNClmb3IodmFyIGU9MDtlPGE7ZSsrKWNbYitlPj4+Ml18PShkW2U+Pj4yXT4+PjI0LTgqKGUlNCkmMjU1KTw8MjQtOCooKGIrZSklNCk7ZWxzZSBpZig2NTUzNTxkLmxlbmd0aClmb3IoZT0wO2U8YTtlKz00KWNbYitlPj4+Ml09ZFtlPj4+Ml07ZWxzZSBjLnB1c2guYXBwbHkoYyxkKTt0aGlzLnNpZ0J5dGVzKz1hO3JldHVybiB0aGlzfSxjbGFtcDpmdW5jdGlvbigpe3ZhciBhPXRoaXMud29yZHMsYz10aGlzLnNpZ0J5dGVzO2FbYz4+PjJdJj00Mjk0OTY3Mjk1PDxcbjMyLTgqKGMlNCk7YS5sZW5ndGg9aC5jZWlsKGMvNCl9LGNsb25lOmZ1bmN0aW9uKCl7dmFyIGE9bS5jbG9uZS5jYWxsKHRoaXMpO2Eud29yZHM9dGhpcy53b3Jkcy5zbGljZSgwKTtyZXR1cm4gYX0scmFuZG9tOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYz1bXSxkPTA7ZDxhO2QrPTQpYy5wdXNoKDQyOTQ5NjcyOTYqaC5yYW5kb20oKXwwKTtyZXR1cm4gbmV3IHIuaW5pdChjLGEpfX0pLGw9Zi5lbmM9e30saz1sLkhleD17c3RyaW5naWZ5OmZ1bmN0aW9uKGEpe3ZhciBjPWEud29yZHM7YT1hLnNpZ0J5dGVzO2Zvcih2YXIgZD1bXSxiPTA7YjxhO2IrKyl7dmFyIGU9Y1tiPj4+Ml0+Pj4yNC04KihiJTQpJjI1NTtkLnB1c2goKGU+Pj40KS50b1N0cmluZygxNikpO2QucHVzaCgoZSYxNSkudG9TdHJpbmcoMTYpKX1yZXR1cm4gZC5qb2luKFwiXCIpfSxwYXJzZTpmdW5jdGlvbihhKXtmb3IodmFyIGM9YS5sZW5ndGgsZD1bXSxiPTA7YjxjO2IrPTIpZFtiPj4+M118PXBhcnNlSW50KGEuc3Vic3RyKGIsXG4yKSwxNik8PDI0LTQqKGIlOCk7cmV0dXJuIG5ldyByLmluaXQoZCxjLzIpfX0sbj1sLkxhdGluMT17c3RyaW5naWZ5OmZ1bmN0aW9uKGEpe3ZhciBjPWEud29yZHM7YT1hLnNpZ0J5dGVzO2Zvcih2YXIgZD1bXSxiPTA7YjxhO2IrKylkLnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShjW2I+Pj4yXT4+PjI0LTgqKGIlNCkmMjU1KSk7cmV0dXJuIGQuam9pbihcIlwiKX0scGFyc2U6ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPWEubGVuZ3RoLGQ9W10sYj0wO2I8YztiKyspZFtiPj4+Ml18PShhLmNoYXJDb2RlQXQoYikmMjU1KTw8MjQtOCooYiU0KTtyZXR1cm4gbmV3IHIuaW5pdChkLGMpfX0saj1sLlV0Zjg9e3N0cmluZ2lmeTpmdW5jdGlvbihhKXt0cnl7cmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUobi5zdHJpbmdpZnkoYSkpKX1jYXRjaChjKXt0aHJvdyBFcnJvcihcIk1hbGZvcm1lZCBVVEYtOCBkYXRhXCIpO319LHBhcnNlOmZ1bmN0aW9uKGEpe3JldHVybiBuLnBhcnNlKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChhKSkpfX0sXG51PWcuQnVmZmVyZWRCbG9ja0FsZ29yaXRobT1tLmV4dGVuZCh7cmVzZXQ6ZnVuY3Rpb24oKXt0aGlzLl9kYXRhPW5ldyByLmluaXQ7dGhpcy5fbkRhdGFCeXRlcz0wfSxfYXBwZW5kOmZ1bmN0aW9uKGEpe1wic3RyaW5nXCI9PXR5cGVvZiBhJiYoYT1qLnBhcnNlKGEpKTt0aGlzLl9kYXRhLmNvbmNhdChhKTt0aGlzLl9uRGF0YUJ5dGVzKz1hLnNpZ0J5dGVzfSxfcHJvY2VzczpmdW5jdGlvbihhKXt2YXIgYz10aGlzLl9kYXRhLGQ9Yy53b3JkcyxiPWMuc2lnQnl0ZXMsZT10aGlzLmJsb2NrU2l6ZSxmPWIvKDQqZSksZj1hP2guY2VpbChmKTpoLm1heCgoZnwwKS10aGlzLl9taW5CdWZmZXJTaXplLDApO2E9ZiplO2I9aC5taW4oNCphLGIpO2lmKGEpe2Zvcih2YXIgZz0wO2c8YTtnKz1lKXRoaXMuX2RvUHJvY2Vzc0Jsb2NrKGQsZyk7Zz1kLnNwbGljZSgwLGEpO2Muc2lnQnl0ZXMtPWJ9cmV0dXJuIG5ldyByLmluaXQoZyxiKX0sY2xvbmU6ZnVuY3Rpb24oKXt2YXIgYT1tLmNsb25lLmNhbGwodGhpcyk7XG5hLl9kYXRhPXRoaXMuX2RhdGEuY2xvbmUoKTtyZXR1cm4gYX0sX21pbkJ1ZmZlclNpemU6MH0pO2cuSGFzaGVyPXUuZXh0ZW5kKHtjZmc6bS5leHRlbmQoKSxpbml0OmZ1bmN0aW9uKGEpe3RoaXMuY2ZnPXRoaXMuY2ZnLmV4dGVuZChhKTt0aGlzLnJlc2V0KCl9LHJlc2V0OmZ1bmN0aW9uKCl7dS5yZXNldC5jYWxsKHRoaXMpO3RoaXMuX2RvUmVzZXQoKX0sdXBkYXRlOmZ1bmN0aW9uKGEpe3RoaXMuX2FwcGVuZChhKTt0aGlzLl9wcm9jZXNzKCk7cmV0dXJuIHRoaXN9LGZpbmFsaXplOmZ1bmN0aW9uKGEpe2EmJnRoaXMuX2FwcGVuZChhKTtyZXR1cm4gdGhpcy5fZG9GaW5hbGl6ZSgpfSxibG9ja1NpemU6MTYsX2NyZWF0ZUhlbHBlcjpmdW5jdGlvbihhKXtyZXR1cm4gZnVuY3Rpb24oYyxkKXtyZXR1cm4obmV3IGEuaW5pdChkKSkuZmluYWxpemUoYyl9fSxfY3JlYXRlSG1hY0hlbHBlcjpmdW5jdGlvbihhKXtyZXR1cm4gZnVuY3Rpb24oYyxkKXtyZXR1cm4obmV3IHQuSE1BQy5pbml0KGEsXG5kKSkuZmluYWxpemUoYyl9fX0pO3ZhciB0PWYuYWxnbz17fTtyZXR1cm4gZn0oTWF0aCk7XG4oZnVuY3Rpb24oaCl7Zm9yKHZhciBzPUNyeXB0b0pTLGY9cy5saWIsZz1mLldvcmRBcnJheSxxPWYuSGFzaGVyLGY9cy5hbGdvLG09W10scj1bXSxsPWZ1bmN0aW9uKGEpe3JldHVybiA0Mjk0OTY3Mjk2KihhLShhfDApKXwwfSxrPTIsbj0wOzY0Pm47KXt2YXIgajthOntqPWs7Zm9yKHZhciB1PWguc3FydChqKSx0PTI7dDw9dTt0KyspaWYoIShqJXQpKXtqPSExO2JyZWFrIGF9aj0hMH1qJiYoOD5uJiYobVtuXT1sKGgucG93KGssMC41KSkpLHJbbl09bChoLnBvdyhrLDEvMykpLG4rKyk7aysrfXZhciBhPVtdLGY9Zi5TSEEyNTY9cS5leHRlbmQoe19kb1Jlc2V0OmZ1bmN0aW9uKCl7dGhpcy5faGFzaD1uZXcgZy5pbml0KG0uc2xpY2UoMCkpfSxfZG9Qcm9jZXNzQmxvY2s6ZnVuY3Rpb24oYyxkKXtmb3IodmFyIGI9dGhpcy5faGFzaC53b3JkcyxlPWJbMF0sZj1iWzFdLGc9YlsyXSxqPWJbM10saD1iWzRdLG09Yls1XSxuPWJbNl0scT1iWzddLHA9MDs2ND5wO3ArKyl7aWYoMTY+cClhW3BdPVxuY1tkK3BdfDA7ZWxzZXt2YXIgaz1hW3AtMTVdLGw9YVtwLTJdO2FbcF09KChrPDwyNXxrPj4+NyleKGs8PDE0fGs+Pj4xOCleaz4+PjMpK2FbcC03XSsoKGw8PDE1fGw+Pj4xNyleKGw8PDEzfGw+Pj4xOSlebD4+PjEwKSthW3AtMTZdfWs9cSsoKGg8PDI2fGg+Pj42KV4oaDw8MjF8aD4+PjExKV4oaDw8N3xoPj4+MjUpKSsoaCZtXn5oJm4pK3JbcF0rYVtwXTtsPSgoZTw8MzB8ZT4+PjIpXihlPDwxOXxlPj4+MTMpXihlPDwxMHxlPj4+MjIpKSsoZSZmXmUmZ15mJmcpO3E9bjtuPW07bT1oO2g9aitrfDA7aj1nO2c9ZjtmPWU7ZT1rK2x8MH1iWzBdPWJbMF0rZXwwO2JbMV09YlsxXStmfDA7YlsyXT1iWzJdK2d8MDtiWzNdPWJbM10ranwwO2JbNF09Yls0XStofDA7Yls1XT1iWzVdK218MDtiWzZdPWJbNl0rbnwwO2JbN109Yls3XStxfDB9LF9kb0ZpbmFsaXplOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5fZGF0YSxkPWEud29yZHMsYj04KnRoaXMuX25EYXRhQnl0ZXMsZT04KmEuc2lnQnl0ZXM7XG5kW2U+Pj41XXw9MTI4PDwyNC1lJTMyO2RbKGUrNjQ+Pj45PDw0KSsxNF09aC5mbG9vcihiLzQyOTQ5NjcyOTYpO2RbKGUrNjQ+Pj45PDw0KSsxNV09YjthLnNpZ0J5dGVzPTQqZC5sZW5ndGg7dGhpcy5fcHJvY2VzcygpO3JldHVybiB0aGlzLl9oYXNofSxjbG9uZTpmdW5jdGlvbigpe3ZhciBhPXEuY2xvbmUuY2FsbCh0aGlzKTthLl9oYXNoPXRoaXMuX2hhc2guY2xvbmUoKTtyZXR1cm4gYX19KTtzLlNIQTI1Nj1xLl9jcmVhdGVIZWxwZXIoZik7cy5IbWFjU0hBMjU2PXEuX2NyZWF0ZUhtYWNIZWxwZXIoZil9KShNYXRoKTtcbihmdW5jdGlvbigpe3ZhciBoPUNyeXB0b0pTLHM9aC5lbmMuVXRmODtoLmFsZ28uSE1BQz1oLmxpYi5CYXNlLmV4dGVuZCh7aW5pdDpmdW5jdGlvbihmLGcpe2Y9dGhpcy5faGFzaGVyPW5ldyBmLmluaXQ7XCJzdHJpbmdcIj09dHlwZW9mIGcmJihnPXMucGFyc2UoZykpO3ZhciBoPWYuYmxvY2tTaXplLG09NCpoO2cuc2lnQnl0ZXM+bSYmKGc9Zi5maW5hbGl6ZShnKSk7Zy5jbGFtcCgpO2Zvcih2YXIgcj10aGlzLl9vS2V5PWcuY2xvbmUoKSxsPXRoaXMuX2lLZXk9Zy5jbG9uZSgpLGs9ci53b3JkcyxuPWwud29yZHMsaj0wO2o8aDtqKyspa1tqXV49MTU0OTU1NjgyOCxuW2pdXj05MDk1MjI0ODY7ci5zaWdCeXRlcz1sLnNpZ0J5dGVzPW07dGhpcy5yZXNldCgpfSxyZXNldDpmdW5jdGlvbigpe3ZhciBmPXRoaXMuX2hhc2hlcjtmLnJlc2V0KCk7Zi51cGRhdGUodGhpcy5faUtleSl9LHVwZGF0ZTpmdW5jdGlvbihmKXt0aGlzLl9oYXNoZXIudXBkYXRlKGYpO3JldHVybiB0aGlzfSxmaW5hbGl6ZTpmdW5jdGlvbihmKXt2YXIgZz1cbnRoaXMuX2hhc2hlcjtmPWcuZmluYWxpemUoZik7Zy5yZXNldCgpO3JldHVybiBnLmZpbmFsaXplKHRoaXMuX29LZXkuY2xvbmUoKS5jb25jYXQoZikpfX0pfSkoKTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qISBKU09OIHYzLjMuMSB8IGh0dHA6Ly9iZXN0aWVqcy5naXRodWIuaW8vanNvbjMgfCBDb3B5cmlnaHQgMjAxMi0yMDE0LCBLaXQgQ2FtYnJpZGdlIHwgaHR0cDovL2tpdC5taXQtbGljZW5zZS5vcmcgKi9cbjsoZnVuY3Rpb24gKCkge1xuICAvLyBEZXRlY3QgdGhlIGBkZWZpbmVgIGZ1bmN0aW9uIGV4cG9zZWQgYnkgYXN5bmNocm9ub3VzIG1vZHVsZSBsb2FkZXJzLiBUaGVcbiAgLy8gc3RyaWN0IGBkZWZpbmVgIGNoZWNrIGlzIG5lY2Vzc2FyeSBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIGByLmpzYC5cbiAgdmFyIGlzTG9hZGVyID0gdHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQ7XG5cbiAgLy8gQSBzZXQgb2YgdHlwZXMgdXNlZCB0byBkaXN0aW5ndWlzaCBvYmplY3RzIGZyb20gcHJpbWl0aXZlcy5cbiAgdmFyIG9iamVjdFR5cGVzID0ge1xuICAgIFwiZnVuY3Rpb25cIjogdHJ1ZSxcbiAgICBcIm9iamVjdFwiOiB0cnVlXG4gIH07XG5cbiAgLy8gRGV0ZWN0IHRoZSBgZXhwb3J0c2Agb2JqZWN0IGV4cG9zZWQgYnkgQ29tbW9uSlMgaW1wbGVtZW50YXRpb25zLlxuICB2YXIgZnJlZUV4cG9ydHMgPSBvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cyAmJiAhZXhwb3J0cy5ub2RlVHlwZSAmJiBleHBvcnRzO1xuXG4gIC8vIFVzZSB0aGUgYGdsb2JhbGAgb2JqZWN0IGV4cG9zZWQgYnkgTm9kZSAoaW5jbHVkaW5nIEJyb3dzZXJpZnkgdmlhXG4gIC8vIGBpbnNlcnQtbW9kdWxlLWdsb2JhbHNgKSwgTmFyd2hhbCwgYW5kIFJpbmdvIGFzIHRoZSBkZWZhdWx0IGNvbnRleHQsXG4gIC8vIGFuZCB0aGUgYHdpbmRvd2Agb2JqZWN0IGluIGJyb3dzZXJzLiBSaGlubyBleHBvcnRzIGEgYGdsb2JhbGAgZnVuY3Rpb25cbiAgLy8gaW5zdGVhZC5cbiAgdmFyIHJvb3QgPSBvYmplY3RUeXBlc1t0eXBlb2Ygd2luZG93XSAmJiB3aW5kb3cgfHwgdGhpcyxcbiAgICAgIGZyZWVHbG9iYWwgPSBmcmVlRXhwb3J0cyAmJiBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiB0eXBlb2YgZ2xvYmFsID09IFwib2JqZWN0XCIgJiYgZ2xvYmFsO1xuXG4gIGlmIChmcmVlR2xvYmFsICYmIChmcmVlR2xvYmFsW1wiZ2xvYmFsXCJdID09PSBmcmVlR2xvYmFsIHx8IGZyZWVHbG9iYWxbXCJ3aW5kb3dcIl0gPT09IGZyZWVHbG9iYWwgfHwgZnJlZUdsb2JhbFtcInNlbGZcIl0gPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgcm9vdCA9IGZyZWVHbG9iYWw7XG4gIH1cblxuICAvLyBQdWJsaWM6IEluaXRpYWxpemVzIEpTT04gMyB1c2luZyB0aGUgZ2l2ZW4gYGNvbnRleHRgIG9iamVjdCwgYXR0YWNoaW5nIHRoZVxuICAvLyBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBmdW5jdGlvbnMgdG8gdGhlIHNwZWNpZmllZCBgZXhwb3J0c2Agb2JqZWN0LlxuICBmdW5jdGlvbiBydW5JbkNvbnRleHQoY29udGV4dCwgZXhwb3J0cykge1xuICAgIGNvbnRleHQgfHwgKGNvbnRleHQgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuICAgIGV4cG9ydHMgfHwgKGV4cG9ydHMgPSByb290W1wiT2JqZWN0XCJdKCkpO1xuXG4gICAgLy8gTmF0aXZlIGNvbnN0cnVjdG9yIGFsaWFzZXMuXG4gICAgdmFyIE51bWJlciA9IGNvbnRleHRbXCJOdW1iZXJcIl0gfHwgcm9vdFtcIk51bWJlclwiXSxcbiAgICAgICAgU3RyaW5nID0gY29udGV4dFtcIlN0cmluZ1wiXSB8fCByb290W1wiU3RyaW5nXCJdLFxuICAgICAgICBPYmplY3QgPSBjb250ZXh0W1wiT2JqZWN0XCJdIHx8IHJvb3RbXCJPYmplY3RcIl0sXG4gICAgICAgIERhdGUgPSBjb250ZXh0W1wiRGF0ZVwiXSB8fCByb290W1wiRGF0ZVwiXSxcbiAgICAgICAgU3ludGF4RXJyb3IgPSBjb250ZXh0W1wiU3ludGF4RXJyb3JcIl0gfHwgcm9vdFtcIlN5bnRheEVycm9yXCJdLFxuICAgICAgICBUeXBlRXJyb3IgPSBjb250ZXh0W1wiVHlwZUVycm9yXCJdIHx8IHJvb3RbXCJUeXBlRXJyb3JcIl0sXG4gICAgICAgIE1hdGggPSBjb250ZXh0W1wiTWF0aFwiXSB8fCByb290W1wiTWF0aFwiXSxcbiAgICAgICAgbmF0aXZlSlNPTiA9IGNvbnRleHRbXCJKU09OXCJdIHx8IHJvb3RbXCJKU09OXCJdO1xuXG4gICAgLy8gRGVsZWdhdGUgdG8gdGhlIG5hdGl2ZSBgc3RyaW5naWZ5YCBhbmQgYHBhcnNlYCBpbXBsZW1lbnRhdGlvbnMuXG4gICAgaWYgKHR5cGVvZiBuYXRpdmVKU09OID09IFwib2JqZWN0XCIgJiYgbmF0aXZlSlNPTikge1xuICAgICAgZXhwb3J0cy5zdHJpbmdpZnkgPSBuYXRpdmVKU09OLnN0cmluZ2lmeTtcbiAgICAgIGV4cG9ydHMucGFyc2UgPSBuYXRpdmVKU09OLnBhcnNlO1xuICAgIH1cblxuICAgIC8vIENvbnZlbmllbmNlIGFsaWFzZXMuXG4gICAgdmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZSxcbiAgICAgICAgZ2V0Q2xhc3MgPSBvYmplY3RQcm90by50b1N0cmluZyxcbiAgICAgICAgaXNQcm9wZXJ0eSwgZm9yRWFjaCwgdW5kZWY7XG5cbiAgICAvLyBUZXN0IHRoZSBgRGF0ZSNnZXRVVEMqYCBtZXRob2RzLiBCYXNlZCBvbiB3b3JrIGJ5IEBZYWZmbGUuXG4gICAgdmFyIGlzRXh0ZW5kZWQgPSBuZXcgRGF0ZSgtMzUwOTgyNzMzNDU3MzI5Mik7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBgZ2V0VVRDRnVsbFllYXJgLCBgTW9udGhgLCBhbmQgYERhdGVgIG1ldGhvZHMgcmV0dXJuIG5vbnNlbnNpY2FsXG4gICAgICAvLyByZXN1bHRzIGZvciBjZXJ0YWluIGRhdGVzIGluIE9wZXJhID49IDEwLjUzLlxuICAgICAgaXNFeHRlbmRlZCA9IGlzRXh0ZW5kZWQuZ2V0VVRDRnVsbFllYXIoKSA9PSAtMTA5MjUyICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTW9udGgoKSA9PT0gMCAmJiBpc0V4dGVuZGVkLmdldFVUQ0RhdGUoKSA9PT0gMSAmJlxuICAgICAgICAvLyBTYWZhcmkgPCAyLjAuMiBzdG9yZXMgdGhlIGludGVybmFsIG1pbGxpc2Vjb25kIHRpbWUgdmFsdWUgY29ycmVjdGx5LFxuICAgICAgICAvLyBidXQgY2xpcHMgdGhlIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgZGF0ZSBtZXRob2RzIHRvIHRoZSByYW5nZSBvZlxuICAgICAgICAvLyBzaWduZWQgMzItYml0IGludGVnZXJzIChbLTIgKiogMzEsIDIgKiogMzEgLSAxXSkuXG4gICAgICAgIGlzRXh0ZW5kZWQuZ2V0VVRDSG91cnMoKSA9PSAxMCAmJiBpc0V4dGVuZGVkLmdldFVUQ01pbnV0ZXMoKSA9PSAzNyAmJiBpc0V4dGVuZGVkLmdldFVUQ1NlY29uZHMoKSA9PSA2ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWlsbGlzZWNvbmRzKCkgPT0gNzA4O1xuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cblxuICAgIC8vIEludGVybmFsOiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIG5hdGl2ZSBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgcGFyc2VgXG4gICAgLy8gaW1wbGVtZW50YXRpb25zIGFyZSBzcGVjLWNvbXBsaWFudC4gQmFzZWQgb24gd29yayBieSBLZW4gU255ZGVyLlxuICAgIGZ1bmN0aW9uIGhhcyhuYW1lKSB7XG4gICAgICBpZiAoaGFzW25hbWVdICE9PSB1bmRlZikge1xuICAgICAgICAvLyBSZXR1cm4gY2FjaGVkIGZlYXR1cmUgdGVzdCByZXN1bHQuXG4gICAgICAgIHJldHVybiBoYXNbbmFtZV07XG4gICAgICB9XG4gICAgICB2YXIgaXNTdXBwb3J0ZWQ7XG4gICAgICBpZiAobmFtZSA9PSBcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKSB7XG4gICAgICAgIC8vIElFIDw9IDcgZG9lc24ndCBzdXBwb3J0IGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyB1c2luZyBzcXVhcmVcbiAgICAgICAgLy8gYnJhY2tldCBub3RhdGlvbi4gSUUgOCBvbmx5IHN1cHBvcnRzIHRoaXMgZm9yIHByaW1pdGl2ZXMuXG4gICAgICAgIGlzU3VwcG9ydGVkID0gXCJhXCJbMF0gIT0gXCJhXCI7XG4gICAgICB9IGVsc2UgaWYgKG5hbWUgPT0gXCJqc29uXCIpIHtcbiAgICAgICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgYm90aCBgSlNPTi5zdHJpbmdpZnlgIGFuZCBgSlNPTi5wYXJzZWAgYXJlXG4gICAgICAgIC8vIHN1cHBvcnRlZC5cbiAgICAgICAgaXNTdXBwb3J0ZWQgPSBoYXMoXCJqc29uLXN0cmluZ2lmeVwiKSAmJiBoYXMoXCJqc29uLXBhcnNlXCIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHZhbHVlLCBzZXJpYWxpemVkID0gJ3tcImFcIjpbMSx0cnVlLGZhbHNlLG51bGwsXCJcXFxcdTAwMDBcXFxcYlxcXFxuXFxcXGZcXFxcclxcXFx0XCJdfSc7XG4gICAgICAgIC8vIFRlc3QgYEpTT04uc3RyaW5naWZ5YC5cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJqc29uLXN0cmluZ2lmeVwiKSB7XG4gICAgICAgICAgdmFyIHN0cmluZ2lmeSA9IGV4cG9ydHMuc3RyaW5naWZ5LCBzdHJpbmdpZnlTdXBwb3J0ZWQgPSB0eXBlb2Ygc3RyaW5naWZ5ID09IFwiZnVuY3Rpb25cIiAmJiBpc0V4dGVuZGVkO1xuICAgICAgICAgIGlmIChzdHJpbmdpZnlTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgIC8vIEEgdGVzdCBmdW5jdGlvbiBvYmplY3Qgd2l0aCBhIGN1c3RvbSBgdG9KU09OYCBtZXRob2QuXG4gICAgICAgICAgICAodmFsdWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSkudG9KU09OID0gdmFsdWU7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPVxuICAgICAgICAgICAgICAgIC8vIEZpcmVmb3ggMy4xYjEgYW5kIGIyIHNlcmlhbGl6ZSBzdHJpbmcsIG51bWJlciwgYW5kIGJvb2xlYW5cbiAgICAgICAgICAgICAgICAvLyBwcmltaXRpdmVzIGFzIG9iamVjdCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkoMCkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyLCBhbmQgSlNPTiAyIHNlcmlhbGl6ZSB3cmFwcGVkIHByaW1pdGl2ZXMgYXMgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBOdW1iZXIoKSkgPT09IFwiMFwiICYmXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBTdHJpbmcoKSkgPT0gJ1wiXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIHZhbHVlIGlzIGBudWxsYCwgYHVuZGVmaW5lZGAsIG9yXG4gICAgICAgICAgICAgICAgLy8gZG9lcyBub3QgZGVmaW5lIGEgY2Fub25pY2FsIEpTT04gcmVwcmVzZW50YXRpb24gKHRoaXMgYXBwbGllcyB0b1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdHMgd2l0aCBgdG9KU09OYCBwcm9wZXJ0aWVzIGFzIHdlbGwsICp1bmxlc3MqIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIHdpdGhpbiBhbiBvYmplY3Qgb3IgYXJyYXkpLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShnZXRDbGFzcykgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gSUUgOCBzZXJpYWxpemVzIGB1bmRlZmluZWRgIGFzIGBcInVuZGVmaW5lZFwiYC4gU2FmYXJpIDw9IDUuMS43IGFuZFxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIzIHBhc3MgdGhpcyB0ZXN0LlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeSh1bmRlZikgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gU2FmYXJpIDw9IDUuMS43IGFuZCBGRiAzLjFiMyB0aHJvdyBgRXJyb3JgcyBhbmQgYFR5cGVFcnJvcmBzLFxuICAgICAgICAgICAgICAgIC8vIHJlc3BlY3RpdmVseSwgaWYgdGhlIHZhbHVlIGlzIG9taXR0ZWQgZW50aXJlbHkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KCkgPT09IHVuZGVmICYmXG4gICAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIDIgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGdpdmVuIHZhbHVlIGlzIG5vdCBhIG51bWJlcixcbiAgICAgICAgICAgICAgICAvLyBzdHJpbmcsIGFycmF5LCBvYmplY3QsIEJvb2xlYW4sIG9yIGBudWxsYCBsaXRlcmFsLiBUaGlzIGFwcGxpZXMgdG9cbiAgICAgICAgICAgICAgICAvLyBvYmplY3RzIHdpdGggY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMgYXMgd2VsbCwgdW5sZXNzIHRoZXkgYXJlIG5lc3RlZFxuICAgICAgICAgICAgICAgIC8vIGluc2lkZSBvYmplY3Qgb3IgYXJyYXkgbGl0ZXJhbHMuIFlVSSAzLjAuMGIxIGlnbm9yZXMgY3VzdG9tIGB0b0pTT05gXG4gICAgICAgICAgICAgICAgLy8gbWV0aG9kcyBlbnRpcmVseS5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkodmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdmFsdWVdKSA9PSBcIlsxXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gUHJvdG90eXBlIDw9IDEuNi4xIHNlcmlhbGl6ZXMgYFt1bmRlZmluZWRdYCBhcyBgXCJbXVwiYCBpbnN0ZWFkIG9mXG4gICAgICAgICAgICAgICAgLy8gYFwiW251bGxdXCJgLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbdW5kZWZdKSA9PSBcIltudWxsXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gWVVJIDMuMC4wYjEgZmFpbHMgdG8gc2VyaWFsaXplIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCkgPT0gXCJudWxsXCIgJiZcbiAgICAgICAgICAgICAgICAvLyBGRiAzLjFiMSwgMiBoYWx0cyBzZXJpYWxpemF0aW9uIGlmIGFuIGFycmF5IGNvbnRhaW5zIGEgZnVuY3Rpb246XG4gICAgICAgICAgICAgICAgLy8gYFsxLCB0cnVlLCBnZXRDbGFzcywgMV1gIHNlcmlhbGl6ZXMgYXMgXCJbMSx0cnVlLF0sXCIuIEZGIDMuMWIzXG4gICAgICAgICAgICAgICAgLy8gZWxpZGVzIG5vbi1KU09OIHZhbHVlcyBmcm9tIG9iamVjdHMgYW5kIGFycmF5cywgdW5sZXNzIHRoZXlcbiAgICAgICAgICAgICAgICAvLyBkZWZpbmUgY3VzdG9tIGB0b0pTT05gIG1ldGhvZHMuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KFt1bmRlZiwgZ2V0Q2xhc3MsIG51bGxdKSA9PSBcIltudWxsLG51bGwsbnVsbF1cIiAmJlxuICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBzZXJpYWxpemF0aW9uIHRlc3QuIEZGIDMuMWIxIHVzZXMgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2VzXG4gICAgICAgICAgICAgICAgLy8gd2hlcmUgY2hhcmFjdGVyIGVzY2FwZSBjb2RlcyBhcmUgZXhwZWN0ZWQgKGUuZy4sIGBcXGJgID0+IGBcXHUwMDA4YCkuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KHsgXCJhXCI6IFt2YWx1ZSwgdHJ1ZSwgZmFsc2UsIG51bGwsIFwiXFx4MDBcXGJcXG5cXGZcXHJcXHRcIl0gfSkgPT0gc2VyaWFsaXplZCAmJlxuICAgICAgICAgICAgICAgIC8vIEZGIDMuMWIxIGFuZCBiMiBpZ25vcmUgdGhlIGBmaWx0ZXJgIGFuZCBgd2lkdGhgIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobnVsbCwgdmFsdWUpID09PSBcIjFcIiAmJlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShbMSwgMl0sIG51bGwsIDEpID09IFwiW1xcbiAxLFxcbiAyXFxuXVwiICYmXG4gICAgICAgICAgICAgICAgLy8gSlNPTiAyLCBQcm90b3R5cGUgPD0gMS43LCBhbmQgb2xkZXIgV2ViS2l0IGJ1aWxkcyBpbmNvcnJlY3RseVxuICAgICAgICAgICAgICAgIC8vIHNlcmlhbGl6ZSBleHRlbmRlZCB5ZWFycy5cbiAgICAgICAgICAgICAgICBzdHJpbmdpZnkobmV3IERhdGUoLTguNjRlMTUpKSA9PSAnXCItMjcxODIxLTA0LTIwVDAwOjAwOjAwLjAwMFpcIicgJiZcbiAgICAgICAgICAgICAgICAvLyBUaGUgbWlsbGlzZWNvbmRzIGFyZSBvcHRpb25hbCBpbiBFUyA1LCBidXQgcmVxdWlyZWQgaW4gNS4xLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSg4LjY0ZTE1KSkgPT0gJ1wiKzI3NTc2MC0wOS0xM1QwMDowMDowMC4wMDBaXCInICYmXG4gICAgICAgICAgICAgICAgLy8gRmlyZWZveCA8PSAxMS4wIGluY29ycmVjdGx5IHNlcmlhbGl6ZXMgeWVhcnMgcHJpb3IgdG8gMCBhcyBuZWdhdGl2ZVxuICAgICAgICAgICAgICAgIC8vIGZvdXItZGlnaXQgeWVhcnMgaW5zdGVhZCBvZiBzaXgtZGlnaXQgeWVhcnMuIENyZWRpdHM6IEBZYWZmbGUuXG4gICAgICAgICAgICAgICAgc3RyaW5naWZ5KG5ldyBEYXRlKC02MjE5ODc1NTJlNSkpID09ICdcIi0wMDAwMDEtMDEtMDFUMDA6MDA6MDAuMDAwWlwiJyAmJlxuICAgICAgICAgICAgICAgIC8vIFNhZmFyaSA8PSA1LjEuNSBhbmQgT3BlcmEgPj0gMTAuNTMgaW5jb3JyZWN0bHkgc2VyaWFsaXplIG1pbGxpc2Vjb25kXG4gICAgICAgICAgICAgICAgLy8gdmFsdWVzIGxlc3MgdGhhbiAxMDAwLiBDcmVkaXRzOiBAWWFmZmxlLlxuICAgICAgICAgICAgICAgIHN0cmluZ2lmeShuZXcgRGF0ZSgtMSkpID09ICdcIjE5NjktMTItMzFUMjM6NTk6NTkuOTk5WlwiJztcbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBzdHJpbmdpZnlTdXBwb3J0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaXNTdXBwb3J0ZWQgPSBzdHJpbmdpZnlTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGVzdCBgSlNPTi5wYXJzZWAuXG4gICAgICAgIGlmIChuYW1lID09IFwianNvbi1wYXJzZVwiKSB7XG4gICAgICAgICAgdmFyIHBhcnNlID0gZXhwb3J0cy5wYXJzZTtcbiAgICAgICAgICBpZiAodHlwZW9mIHBhcnNlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gRkYgMy4xYjEsIGIyIHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGEgYmFyZSBsaXRlcmFsIGlzIHByb3ZpZGVkLlxuICAgICAgICAgICAgICAvLyBDb25mb3JtaW5nIGltcGxlbWVudGF0aW9ucyBzaG91bGQgYWxzbyBjb2VyY2UgdGhlIGluaXRpYWwgYXJndW1lbnQgdG9cbiAgICAgICAgICAgICAgLy8gYSBzdHJpbmcgcHJpb3IgdG8gcGFyc2luZy5cbiAgICAgICAgICAgICAgaWYgKHBhcnNlKFwiMFwiKSA9PT0gMCAmJiAhcGFyc2UoZmFsc2UpKSB7XG4gICAgICAgICAgICAgICAgLy8gU2ltcGxlIHBhcnNpbmcgdGVzdC5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHBhcnNlKHNlcmlhbGl6ZWQpO1xuICAgICAgICAgICAgICAgIHZhciBwYXJzZVN1cHBvcnRlZCA9IHZhbHVlW1wiYVwiXS5sZW5ndGggPT0gNSAmJiB2YWx1ZVtcImFcIl1bMF0gPT09IDE7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgPD0gNS4xLjIgYW5kIEZGIDMuMWIxIGFsbG93IHVuZXNjYXBlZCB0YWJzIGluIHN0cmluZ3MuXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gIXBhcnNlKCdcIlxcdFwiJyk7XG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHt9XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VTdXBwb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBGRiA0LjAgYW5kIDQuMC4xIGFsbG93IGxlYWRpbmcgYCtgIHNpZ25zIGFuZCBsZWFkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgLy8gZGVjaW1hbCBwb2ludHMuIEZGIDQuMCwgNC4wLjEsIGFuZCBJRSA5LTEwIGFsc28gYWxsb3dcbiAgICAgICAgICAgICAgICAgICAgICAvLyBjZXJ0YWluIG9jdGFsIGxpdGVyYWxzLlxuICAgICAgICAgICAgICAgICAgICAgIHBhcnNlU3VwcG9ydGVkID0gcGFyc2UoXCIwMVwiKSAhPT0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7fVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlU3VwcG9ydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gRkYgNC4wLCA0LjAuMSwgYW5kIFJoaW5vIDEuN1IzLVI0IGFsbG93IHRyYWlsaW5nIGRlY2ltYWxcbiAgICAgICAgICAgICAgICAgICAgICAvLyBwb2ludHMuIFRoZXNlIGVudmlyb25tZW50cywgYWxvbmcgd2l0aCBGRiAzLjFiMSBhbmQgMixcbiAgICAgICAgICAgICAgICAgICAgICAvLyBhbHNvIGFsbG93IHRyYWlsaW5nIGNvbW1hcyBpbiBKU09OIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IHBhcnNlKFwiMS5cIikgIT09IDE7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICAgICAgICBwYXJzZVN1cHBvcnRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpc1N1cHBvcnRlZCA9IHBhcnNlU3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaGFzW25hbWVdID0gISFpc1N1cHBvcnRlZDtcbiAgICB9XG5cbiAgICBpZiAoIWhhcyhcImpzb25cIikpIHtcbiAgICAgIC8vIENvbW1vbiBgW1tDbGFzc11dYCBuYW1lIGFsaWFzZXMuXG4gICAgICB2YXIgZnVuY3Rpb25DbGFzcyA9IFwiW29iamVjdCBGdW5jdGlvbl1cIixcbiAgICAgICAgICBkYXRlQ2xhc3MgPSBcIltvYmplY3QgRGF0ZV1cIixcbiAgICAgICAgICBudW1iZXJDbGFzcyA9IFwiW29iamVjdCBOdW1iZXJdXCIsXG4gICAgICAgICAgc3RyaW5nQ2xhc3MgPSBcIltvYmplY3QgU3RyaW5nXVwiLFxuICAgICAgICAgIGFycmF5Q2xhc3MgPSBcIltvYmplY3QgQXJyYXldXCIsXG4gICAgICAgICAgYm9vbGVhbkNsYXNzID0gXCJbb2JqZWN0IEJvb2xlYW5dXCI7XG5cbiAgICAgIC8vIERldGVjdCBpbmNvbXBsZXRlIHN1cHBvcnQgZm9yIGFjY2Vzc2luZyBzdHJpbmcgY2hhcmFjdGVycyBieSBpbmRleC5cbiAgICAgIHZhciBjaGFySW5kZXhCdWdneSA9IGhhcyhcImJ1Zy1zdHJpbmctY2hhci1pbmRleFwiKTtcblxuICAgICAgLy8gRGVmaW5lIGFkZGl0aW9uYWwgdXRpbGl0eSBtZXRob2RzIGlmIHRoZSBgRGF0ZWAgbWV0aG9kcyBhcmUgYnVnZ3kuXG4gICAgICBpZiAoIWlzRXh0ZW5kZWQpIHtcbiAgICAgICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICAgICAgLy8gQSBtYXBwaW5nIGJldHdlZW4gdGhlIG1vbnRocyBvZiB0aGUgeWVhciBhbmQgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW5cbiAgICAgICAgLy8gSmFudWFyeSAxc3QgYW5kIHRoZSBmaXJzdCBvZiB0aGUgcmVzcGVjdGl2ZSBtb250aC5cbiAgICAgICAgdmFyIE1vbnRocyA9IFswLCAzMSwgNTksIDkwLCAxMjAsIDE1MSwgMTgxLCAyMTIsIDI0MywgMjczLCAzMDQsIDMzNF07XG4gICAgICAgIC8vIEludGVybmFsOiBDYWxjdWxhdGVzIHRoZSBudW1iZXIgb2YgZGF5cyBiZXR3ZWVuIHRoZSBVbml4IGVwb2NoIGFuZCB0aGVcbiAgICAgICAgLy8gZmlyc3QgZGF5IG9mIHRoZSBnaXZlbiBtb250aC5cbiAgICAgICAgdmFyIGdldERheSA9IGZ1bmN0aW9uICh5ZWFyLCBtb250aCkge1xuICAgICAgICAgIHJldHVybiBNb250aHNbbW9udGhdICsgMzY1ICogKHllYXIgLSAxOTcwKSArIGZsb29yKCh5ZWFyIC0gMTk2OSArIChtb250aCA9ICsobW9udGggPiAxKSkpIC8gNCkgLSBmbG9vcigoeWVhciAtIDE5MDEgKyBtb250aCkgLyAxMDApICsgZmxvb3IoKHllYXIgLSAxNjAxICsgbW9udGgpIC8gNDAwKTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50ZXJuYWw6IERldGVybWluZXMgaWYgYSBwcm9wZXJ0eSBpcyBhIGRpcmVjdCBwcm9wZXJ0eSBvZiB0aGUgZ2l2ZW5cbiAgICAgIC8vIG9iamVjdC4gRGVsZWdhdGVzIHRvIHRoZSBuYXRpdmUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgbWV0aG9kLlxuICAgICAgaWYgKCEoaXNQcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5KSkge1xuICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgdmFyIG1lbWJlcnMgPSB7fSwgY29uc3RydWN0b3I7XG4gICAgICAgICAgaWYgKChtZW1iZXJzLl9fcHJvdG9fXyA9IG51bGwsIG1lbWJlcnMuX19wcm90b19fID0ge1xuICAgICAgICAgICAgLy8gVGhlICpwcm90byogcHJvcGVydHkgY2Fubm90IGJlIHNldCBtdWx0aXBsZSB0aW1lcyBpbiByZWNlbnRcbiAgICAgICAgICAgIC8vIHZlcnNpb25zIG9mIEZpcmVmb3ggYW5kIFNlYU1vbmtleS5cbiAgICAgICAgICAgIFwidG9TdHJpbmdcIjogMVxuICAgICAgICAgIH0sIG1lbWJlcnMpLnRvU3RyaW5nICE9IGdldENsYXNzKSB7XG4gICAgICAgICAgICAvLyBTYWZhcmkgPD0gMi4wLjMgZG9lc24ndCBpbXBsZW1lbnQgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAsIGJ1dFxuICAgICAgICAgICAgLy8gc3VwcG9ydHMgdGhlIG11dGFibGUgKnByb3RvKiBwcm9wZXJ0eS5cbiAgICAgICAgICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgLy8gQ2FwdHVyZSBhbmQgYnJlYWsgdGhlIG9iamVjdGdzIHByb3RvdHlwZSBjaGFpbiAoc2VlIHNlY3Rpb24gOC42LjJcbiAgICAgICAgICAgICAgLy8gb2YgdGhlIEVTIDUuMSBzcGVjKS4gVGhlIHBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvbiBwcmV2ZW50cyBhblxuICAgICAgICAgICAgICAvLyB1bnNhZmUgdHJhbnNmb3JtYXRpb24gYnkgdGhlIENsb3N1cmUgQ29tcGlsZXIuXG4gICAgICAgICAgICAgIHZhciBvcmlnaW5hbCA9IHRoaXMuX19wcm90b19fLCByZXN1bHQgPSBwcm9wZXJ0eSBpbiAodGhpcy5fX3Byb3RvX18gPSBudWxsLCB0aGlzKTtcbiAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcHJvdG90eXBlIGNoYWluLlxuICAgICAgICAgICAgICB0aGlzLl9fcHJvdG9fXyA9IG9yaWdpbmFsO1xuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2FwdHVyZSBhIHJlZmVyZW5jZSB0byB0aGUgdG9wLWxldmVsIGBPYmplY3RgIGNvbnN0cnVjdG9yLlxuICAgICAgICAgICAgY29uc3RydWN0b3IgPSBtZW1iZXJzLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IHRvIHNpbXVsYXRlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIGluXG4gICAgICAgICAgICAvLyBvdGhlciBlbnZpcm9ubWVudHMuXG4gICAgICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgIHZhciBwYXJlbnQgPSAodGhpcy5jb25zdHJ1Y3RvciB8fCBjb25zdHJ1Y3RvcikucHJvdG90eXBlO1xuICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHkgaW4gdGhpcyAmJiAhKHByb3BlcnR5IGluIHBhcmVudCAmJiB0aGlzW3Byb3BlcnR5XSA9PT0gcGFyZW50W3Byb3BlcnR5XSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBtZW1iZXJzID0gbnVsbDtcbiAgICAgICAgICByZXR1cm4gaXNQcm9wZXJ0eS5jYWxsKHRoaXMsIHByb3BlcnR5KTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gSW50ZXJuYWw6IE5vcm1hbGl6ZXMgdGhlIGBmb3IuLi5pbmAgaXRlcmF0aW9uIGFsZ29yaXRobSBhY3Jvc3NcbiAgICAgIC8vIGVudmlyb25tZW50cy4gRWFjaCBlbnVtZXJhdGVkIGtleSBpcyB5aWVsZGVkIHRvIGEgYGNhbGxiYWNrYCBmdW5jdGlvbi5cbiAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgc2l6ZSA9IDAsIFByb3BlcnRpZXMsIG1lbWJlcnMsIHByb3BlcnR5O1xuXG4gICAgICAgIC8vIFRlc3RzIGZvciBidWdzIGluIHRoZSBjdXJyZW50IGVudmlyb25tZW50J3MgYGZvci4uLmluYCBhbGdvcml0aG0uIFRoZVxuICAgICAgICAvLyBgdmFsdWVPZmAgcHJvcGVydHkgaW5oZXJpdHMgdGhlIG5vbi1lbnVtZXJhYmxlIGZsYWcgZnJvbVxuICAgICAgICAvLyBgT2JqZWN0LnByb3RvdHlwZWAgaW4gb2xkZXIgdmVyc2lvbnMgb2YgSUUsIE5ldHNjYXBlLCBhbmQgTW96aWxsYS5cbiAgICAgICAgKFByb3BlcnRpZXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhpcy52YWx1ZU9mID0gMDtcbiAgICAgICAgfSkucHJvdG90eXBlLnZhbHVlT2YgPSAwO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgYFByb3BlcnRpZXNgIGNsYXNzLlxuICAgICAgICBtZW1iZXJzID0gbmV3IFByb3BlcnRpZXMoKTtcbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBtZW1iZXJzKSB7XG4gICAgICAgICAgLy8gSWdub3JlIGFsbCBwcm9wZXJ0aWVzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAgICAgICAgICBpZiAoaXNQcm9wZXJ0eS5jYWxsKG1lbWJlcnMsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBQcm9wZXJ0aWVzID0gbWVtYmVycyA9IG51bGw7XG5cbiAgICAgICAgLy8gTm9ybWFsaXplIHRoZSBpdGVyYXRpb24gYWxnb3JpdGhtLlxuICAgICAgICBpZiAoIXNpemUpIHtcbiAgICAgICAgICAvLyBBIGxpc3Qgb2Ygbm9uLWVudW1lcmFibGUgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICAgICAgbWVtYmVycyA9IFtcInZhbHVlT2ZcIiwgXCJ0b1N0cmluZ1wiLCBcInRvTG9jYWxlU3RyaW5nXCIsIFwicHJvcGVydHlJc0VudW1lcmFibGVcIiwgXCJpc1Byb3RvdHlwZU9mXCIsIFwiaGFzT3duUHJvcGVydHlcIiwgXCJjb25zdHJ1Y3RvclwiXTtcbiAgICAgICAgICAvLyBJRSA8PSA4LCBNb3ppbGxhIDEuMCwgYW5kIE5ldHNjYXBlIDYuMiBpZ25vcmUgc2hhZG93ZWQgbm9uLWVudW1lcmFibGVcbiAgICAgICAgICAvLyBwcm9wZXJ0aWVzLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gZnVuY3Rpb25DbGFzcywgcHJvcGVydHksIGxlbmd0aDtcbiAgICAgICAgICAgIHZhciBoYXNQcm9wZXJ0eSA9ICFpc0Z1bmN0aW9uICYmIHR5cGVvZiBvYmplY3QuY29uc3RydWN0b3IgIT0gXCJmdW5jdGlvblwiICYmIG9iamVjdFR5cGVzW3R5cGVvZiBvYmplY3QuaGFzT3duUHJvcGVydHldICYmIG9iamVjdC5oYXNPd25Qcm9wZXJ0eSB8fCBpc1Byb3BlcnR5O1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gR2Vja28gPD0gMS4wIGVudW1lcmF0ZXMgdGhlIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyB1bmRlclxuICAgICAgICAgICAgICAvLyBjZXJ0YWluIGNvbmRpdGlvbnM7IElFIGRvZXMgbm90LlxuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGhhc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIGVhY2ggbm9uLWVudW1lcmFibGUgcHJvcGVydHkuXG4gICAgICAgICAgICBmb3IgKGxlbmd0aCA9IG1lbWJlcnMubGVuZ3RoOyBwcm9wZXJ0eSA9IG1lbWJlcnNbLS1sZW5ndGhdOyBoYXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpICYmIGNhbGxiYWNrKHByb3BlcnR5KSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChzaXplID09IDIpIHtcbiAgICAgICAgICAvLyBTYWZhcmkgPD0gMi4wLjQgZW51bWVyYXRlcyBzaGFkb3dlZCBwcm9wZXJ0aWVzIHR3aWNlLlxuICAgICAgICAgIGZvckVhY2ggPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgc2V0IG9mIGl0ZXJhdGVkIHByb3BlcnRpZXMuXG4gICAgICAgICAgICB2YXIgbWVtYmVycyA9IHt9LCBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5O1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gU3RvcmUgZWFjaCBwcm9wZXJ0eSBuYW1lIHRvIHByZXZlbnQgZG91YmxlIGVudW1lcmF0aW9uLiBUaGVcbiAgICAgICAgICAgICAgLy8gYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIGlzIG5vdCBlbnVtZXJhdGVkIGR1ZSB0byBjcm9zcy1cbiAgICAgICAgICAgICAgLy8gZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmICFpc1Byb3BlcnR5LmNhbGwobWVtYmVycywgcHJvcGVydHkpICYmIChtZW1iZXJzW3Byb3BlcnR5XSA9IDEpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gYnVncyBkZXRlY3RlZDsgdXNlIHRoZSBzdGFuZGFyZCBgZm9yLi4uaW5gIGFsZ29yaXRobS5cbiAgICAgICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IGZ1bmN0aW9uQ2xhc3MsIHByb3BlcnR5LCBpc0NvbnN0cnVjdG9yO1xuICAgICAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgIShpc0NvbnN0cnVjdG9yID0gcHJvcGVydHkgPT09IFwiY29uc3RydWN0b3JcIikpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIE1hbnVhbGx5IGludm9rZSB0aGUgY2FsbGJhY2sgZm9yIHRoZSBgY29uc3RydWN0b3JgIHByb3BlcnR5IGR1ZSB0b1xuICAgICAgICAgICAgLy8gY3Jvc3MtZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgICAgaWYgKGlzQ29uc3RydWN0b3IgfHwgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgKHByb3BlcnR5ID0gXCJjb25zdHJ1Y3RvclwiKSkpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvckVhY2gob2JqZWN0LCBjYWxsYmFjayk7XG4gICAgICB9O1xuXG4gICAgICAvLyBQdWJsaWM6IFNlcmlhbGl6ZXMgYSBKYXZhU2NyaXB0IGB2YWx1ZWAgYXMgYSBKU09OIHN0cmluZy4gVGhlIG9wdGlvbmFsXG4gICAgICAvLyBgZmlsdGVyYCBhcmd1bWVudCBtYXkgc3BlY2lmeSBlaXRoZXIgYSBmdW5jdGlvbiB0aGF0IGFsdGVycyBob3cgb2JqZWN0IGFuZFxuICAgICAgLy8gYXJyYXkgbWVtYmVycyBhcmUgc2VyaWFsaXplZCwgb3IgYW4gYXJyYXkgb2Ygc3RyaW5ncyBhbmQgbnVtYmVycyB0aGF0XG4gICAgICAvLyBpbmRpY2F0ZXMgd2hpY2ggcHJvcGVydGllcyBzaG91bGQgYmUgc2VyaWFsaXplZC4gVGhlIG9wdGlvbmFsIGB3aWR0aGBcbiAgICAgIC8vIGFyZ3VtZW50IG1heSBiZSBlaXRoZXIgYSBzdHJpbmcgb3IgbnVtYmVyIHRoYXQgc3BlY2lmaWVzIHRoZSBpbmRlbnRhdGlvblxuICAgICAgLy8gbGV2ZWwgb2YgdGhlIG91dHB1dC5cbiAgICAgIGlmICghaGFzKFwianNvbi1zdHJpbmdpZnlcIikpIHtcbiAgICAgICAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIEVzY2FwZXMgPSB7XG4gICAgICAgICAgOTI6IFwiXFxcXFxcXFxcIixcbiAgICAgICAgICAzNDogJ1xcXFxcIicsXG4gICAgICAgICAgODogXCJcXFxcYlwiLFxuICAgICAgICAgIDEyOiBcIlxcXFxmXCIsXG4gICAgICAgICAgMTA6IFwiXFxcXG5cIixcbiAgICAgICAgICAxMzogXCJcXFxcclwiLFxuICAgICAgICAgIDk6IFwiXFxcXHRcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBDb252ZXJ0cyBgdmFsdWVgIGludG8gYSB6ZXJvLXBhZGRlZCBzdHJpbmcgc3VjaCB0aGF0IGl0c1xuICAgICAgICAvLyBsZW5ndGggaXMgYXQgbGVhc3QgZXF1YWwgdG8gYHdpZHRoYC4gVGhlIGB3aWR0aGAgbXVzdCBiZSA8PSA2LlxuICAgICAgICB2YXIgbGVhZGluZ1plcm9lcyA9IFwiMDAwMDAwXCI7XG4gICAgICAgIHZhciB0b1BhZGRlZFN0cmluZyA9IGZ1bmN0aW9uICh3aWR0aCwgdmFsdWUpIHtcbiAgICAgICAgICAvLyBUaGUgYHx8IDBgIGV4cHJlc3Npb24gaXMgbmVjZXNzYXJ5IHRvIHdvcmsgYXJvdW5kIGEgYnVnIGluXG4gICAgICAgICAgLy8gT3BlcmEgPD0gNy41NHUyIHdoZXJlIGAwID09IC0wYCwgYnV0IGBTdHJpbmcoLTApICE9PSBcIjBcImAuXG4gICAgICAgICAgcmV0dXJuIChsZWFkaW5nWmVyb2VzICsgKHZhbHVlIHx8IDApKS5zbGljZSgtd2lkdGgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBEb3VibGUtcXVvdGVzIGEgc3RyaW5nIGB2YWx1ZWAsIHJlcGxhY2luZyBhbGwgQVNDSUkgY29udHJvbFxuICAgICAgICAvLyBjaGFyYWN0ZXJzIChjaGFyYWN0ZXJzIHdpdGggY29kZSB1bml0IHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDMxKSB3aXRoXG4gICAgICAgIC8vIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBRdW90ZSh2YWx1ZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG4gICAgICAgIHZhciB1bmljb2RlUHJlZml4ID0gXCJcXFxcdTAwXCI7XG4gICAgICAgIHZhciBxdW90ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgIHZhciByZXN1bHQgPSAnXCInLCBpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aCwgdXNlQ2hhckluZGV4ID0gIWNoYXJJbmRleEJ1Z2d5IHx8IGxlbmd0aCA+IDEwO1xuICAgICAgICAgIHZhciBzeW1ib2xzID0gdXNlQ2hhckluZGV4ICYmIChjaGFySW5kZXhCdWdneSA/IHZhbHVlLnNwbGl0KFwiXCIpIDogdmFsdWUpO1xuICAgICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICAgICAgdmFyIGNoYXJDb2RlID0gdmFsdWUuY2hhckNvZGVBdChpbmRleCk7XG4gICAgICAgICAgICAvLyBJZiB0aGUgY2hhcmFjdGVyIGlzIGEgY29udHJvbCBjaGFyYWN0ZXIsIGFwcGVuZCBpdHMgVW5pY29kZSBvclxuICAgICAgICAgICAgLy8gc2hvcnRoYW5kIGVzY2FwZSBzZXF1ZW5jZTsgb3RoZXJ3aXNlLCBhcHBlbmQgdGhlIGNoYXJhY3RlciBhcy1pcy5cbiAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgY2FzZSA4OiBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTI6IGNhc2UgMTM6IGNhc2UgMzQ6IGNhc2UgOTI6XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IEVzY2FwZXNbY2hhckNvZGVdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHQgKz0gdW5pY29kZVByZWZpeCArIHRvUGFkZGVkU3RyaW5nKDIsIGNoYXJDb2RlLnRvU3RyaW5nKDE2KSk7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IHVzZUNoYXJJbmRleCA/IHN5bWJvbHNbaW5kZXhdIDogdmFsdWUuY2hhckF0KGluZGV4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCArICdcIic7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZXMgYW4gb2JqZWN0LiBJbXBsZW1lbnRzIHRoZVxuICAgICAgICAvLyBgU3RyKGtleSwgaG9sZGVyKWAsIGBKTyh2YWx1ZSlgLCBhbmQgYEpBKHZhbHVlKWAgb3BlcmF0aW9ucy5cbiAgICAgICAgdmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSwgb2JqZWN0LCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sIHN0YWNrKSB7XG4gICAgICAgICAgdmFyIHZhbHVlLCBjbGFzc05hbWUsIHllYXIsIG1vbnRoLCBkYXRlLCB0aW1lLCBob3VycywgbWludXRlcywgc2Vjb25kcywgbWlsbGlzZWNvbmRzLCByZXN1bHRzLCBlbGVtZW50LCBpbmRleCwgbGVuZ3RoLCBwcmVmaXgsIHJlc3VsdDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gTmVjZXNzYXJ5IGZvciBob3N0IG9iamVjdCBzdXBwb3J0LlxuICAgICAgICAgICAgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIgJiYgdmFsdWUpIHtcbiAgICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgICAgaWYgKGNsYXNzTmFtZSA9PSBkYXRlQ2xhc3MgJiYgIWlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpIHtcbiAgICAgICAgICAgICAgaWYgKHZhbHVlID4gLTEgLyAwICYmIHZhbHVlIDwgMSAvIDApIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRlcyBhcmUgc2VyaWFsaXplZCBhY2NvcmRpbmcgdG8gdGhlIGBEYXRlI3RvSlNPTmAgbWV0aG9kXG4gICAgICAgICAgICAgICAgLy8gc3BlY2lmaWVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjkuNS40NC4gU2VlIHNlY3Rpb24gMTUuOS4xLjE1XG4gICAgICAgICAgICAgICAgLy8gZm9yIHRoZSBJU08gODYwMSBkYXRlIHRpbWUgc3RyaW5nIGZvcm1hdC5cbiAgICAgICAgICAgICAgICBpZiAoZ2V0RGF5KSB7XG4gICAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb21wdXRlIHRoZSB5ZWFyLCBtb250aCwgZGF0ZSwgaG91cnMsIG1pbnV0ZXMsXG4gICAgICAgICAgICAgICAgICAvLyBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGlmIHRoZSBgZ2V0VVRDKmAgbWV0aG9kcyBhcmVcbiAgICAgICAgICAgICAgICAgIC8vIGJ1Z2d5LiBBZGFwdGVkIGZyb20gQFlhZmZsZSdzIGBkYXRlLXNoaW1gIHByb2plY3QuXG4gICAgICAgICAgICAgICAgICBkYXRlID0gZmxvb3IodmFsdWUgLyA4NjRlNSk7XG4gICAgICAgICAgICAgICAgICBmb3IgKHllYXIgPSBmbG9vcihkYXRlIC8gMzY1LjI0MjUpICsgMTk3MCAtIDE7IGdldERheSh5ZWFyICsgMSwgMCkgPD0gZGF0ZTsgeWVhcisrKTtcbiAgICAgICAgICAgICAgICAgIGZvciAobW9udGggPSBmbG9vcigoZGF0ZSAtIGdldERheSh5ZWFyLCAwKSkgLyAzMC40Mik7IGdldERheSh5ZWFyLCBtb250aCArIDEpIDw9IGRhdGU7IG1vbnRoKyspO1xuICAgICAgICAgICAgICAgICAgZGF0ZSA9IDEgKyBkYXRlIC0gZ2V0RGF5KHllYXIsIG1vbnRoKTtcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBgdGltZWAgdmFsdWUgc3BlY2lmaWVzIHRoZSB0aW1lIHdpdGhpbiB0aGUgZGF5IChzZWUgRVNcbiAgICAgICAgICAgICAgICAgIC8vIDUuMSBzZWN0aW9uIDE1LjkuMS4yKS4gVGhlIGZvcm11bGEgYChBICUgQiArIEIpICUgQmAgaXMgdXNlZFxuICAgICAgICAgICAgICAgICAgLy8gdG8gY29tcHV0ZSBgQSBtb2R1bG8gQmAsIGFzIHRoZSBgJWAgb3BlcmF0b3IgZG9lcyBub3RcbiAgICAgICAgICAgICAgICAgIC8vIGNvcnJlc3BvbmQgdG8gdGhlIGBtb2R1bG9gIG9wZXJhdGlvbiBmb3IgbmVnYXRpdmUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICAgIHRpbWUgPSAodmFsdWUgJSA4NjRlNSArIDg2NGU1KSAlIDg2NGU1O1xuICAgICAgICAgICAgICAgICAgLy8gVGhlIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBhbmQgbWlsbGlzZWNvbmRzIGFyZSBvYnRhaW5lZCBieVxuICAgICAgICAgICAgICAgICAgLy8gZGVjb21wb3NpbmcgdGhlIHRpbWUgd2l0aGluIHRoZSBkYXkuIFNlZSBzZWN0aW9uIDE1LjkuMS4xMC5cbiAgICAgICAgICAgICAgICAgIGhvdXJzID0gZmxvb3IodGltZSAvIDM2ZTUpICUgMjQ7XG4gICAgICAgICAgICAgICAgICBtaW51dGVzID0gZmxvb3IodGltZSAvIDZlNCkgJSA2MDtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSBmbG9vcih0aW1lIC8gMWUzKSAlIDYwO1xuICAgICAgICAgICAgICAgICAgbWlsbGlzZWNvbmRzID0gdGltZSAlIDFlMztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgeWVhciA9IHZhbHVlLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgICAgICAgICAgICBtb250aCA9IHZhbHVlLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgICAgICAgICBkYXRlID0gdmFsdWUuZ2V0VVRDRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgaG91cnMgPSB2YWx1ZS5nZXRVVENIb3VycygpO1xuICAgICAgICAgICAgICAgICAgbWludXRlcyA9IHZhbHVlLmdldFVUQ01pbnV0ZXMoKTtcbiAgICAgICAgICAgICAgICAgIHNlY29uZHMgPSB2YWx1ZS5nZXRVVENTZWNvbmRzKCk7XG4gICAgICAgICAgICAgICAgICBtaWxsaXNlY29uZHMgPSB2YWx1ZS5nZXRVVENNaWxsaXNlY29uZHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gU2VyaWFsaXplIGV4dGVuZGVkIHllYXJzIGNvcnJlY3RseS5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9ICh5ZWFyIDw9IDAgfHwgeWVhciA+PSAxZTQgPyAoeWVhciA8IDAgPyBcIi1cIiA6IFwiK1wiKSArIHRvUGFkZGVkU3RyaW5nKDYsIHllYXIgPCAwID8gLXllYXIgOiB5ZWFyKSA6IHRvUGFkZGVkU3RyaW5nKDQsIHllYXIpKSArXG4gICAgICAgICAgICAgICAgICBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1vbnRoICsgMSkgKyBcIi1cIiArIHRvUGFkZGVkU3RyaW5nKDIsIGRhdGUpICtcbiAgICAgICAgICAgICAgICAgIC8vIE1vbnRocywgZGF0ZXMsIGhvdXJzLCBtaW51dGVzLCBhbmQgc2Vjb25kcyBzaG91bGQgaGF2ZSB0d29cbiAgICAgICAgICAgICAgICAgIC8vIGRpZ2l0czsgbWlsbGlzZWNvbmRzIHNob3VsZCBoYXZlIHRocmVlLlxuICAgICAgICAgICAgICAgICAgXCJUXCIgKyB0b1BhZGRlZFN0cmluZygyLCBob3VycykgKyBcIjpcIiArIHRvUGFkZGVkU3RyaW5nKDIsIG1pbnV0ZXMpICsgXCI6XCIgKyB0b1BhZGRlZFN0cmluZygyLCBzZWNvbmRzKSArXG4gICAgICAgICAgICAgICAgICAvLyBNaWxsaXNlY29uZHMgYXJlIG9wdGlvbmFsIGluIEVTIDUuMCwgYnV0IHJlcXVpcmVkIGluIDUuMS5cbiAgICAgICAgICAgICAgICAgIFwiLlwiICsgdG9QYWRkZWRTdHJpbmcoMywgbWlsbGlzZWNvbmRzKSArIFwiWlwiO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUudG9KU09OID09IFwiZnVuY3Rpb25cIiAmJiAoKGNsYXNzTmFtZSAhPSBudW1iZXJDbGFzcyAmJiBjbGFzc05hbWUgIT0gc3RyaW5nQ2xhc3MgJiYgY2xhc3NOYW1lICE9IGFycmF5Q2xhc3MpIHx8IGlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpKSB7XG4gICAgICAgICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBhZGRzIG5vbi1zdGFuZGFyZCBgdG9KU09OYCBtZXRob2RzIHRvIHRoZVxuICAgICAgICAgICAgICAvLyBgTnVtYmVyYCwgYFN0cmluZ2AsIGBEYXRlYCwgYW5kIGBBcnJheWAgcHJvdG90eXBlcy4gSlNPTiAzXG4gICAgICAgICAgICAgIC8vIGlnbm9yZXMgYWxsIGB0b0pTT05gIG1ldGhvZHMgb24gdGhlc2Ugb2JqZWN0cyB1bmxlc3MgdGhleSBhcmVcbiAgICAgICAgICAgICAgLy8gZGVmaW5lZCBkaXJlY3RseSBvbiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZS50b0pTT04ocHJvcGVydHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIC8vIElmIGEgcmVwbGFjZW1lbnQgZnVuY3Rpb24gd2FzIHByb3ZpZGVkLCBjYWxsIGl0IHRvIG9idGFpbiB0aGUgdmFsdWVcbiAgICAgICAgICAgIC8vIGZvciBzZXJpYWxpemF0aW9uLlxuICAgICAgICAgICAgdmFsdWUgPSBjYWxsYmFjay5jYWxsKG9iamVjdCwgcHJvcGVydHksIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNsYXNzTmFtZSA9IGdldENsYXNzLmNhbGwodmFsdWUpO1xuICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYm9vbGVhbkNsYXNzKSB7XG4gICAgICAgICAgICAvLyBCb29sZWFucyBhcmUgcmVwcmVzZW50ZWQgbGl0ZXJhbGx5LlxuICAgICAgICAgICAgcmV0dXJuIFwiXCIgKyB2YWx1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBudW1iZXJDbGFzcykge1xuICAgICAgICAgICAgLy8gSlNPTiBudW1iZXJzIG11c3QgYmUgZmluaXRlLiBgSW5maW5pdHlgIGFuZCBgTmFOYCBhcmUgc2VyaWFsaXplZCBhc1xuICAgICAgICAgICAgLy8gYFwibnVsbFwiYC5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSA+IC0xIC8gMCAmJiB2YWx1ZSA8IDEgLyAwID8gXCJcIiArIHZhbHVlIDogXCJudWxsXCI7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MpIHtcbiAgICAgICAgICAgIC8vIFN0cmluZ3MgYXJlIGRvdWJsZS1xdW90ZWQgYW5kIGVzY2FwZWQuXG4gICAgICAgICAgICByZXR1cm4gcXVvdGUoXCJcIiArIHZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gUmVjdXJzaXZlbHkgc2VyaWFsaXplIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhpcyBpcyBhIGxpbmVhciBzZWFyY2g7IHBlcmZvcm1hbmNlXG4gICAgICAgICAgICAvLyBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2YgdW5pcXVlIG5lc3RlZCBvYmplY3RzLlxuICAgICAgICAgICAgZm9yIChsZW5ndGggPSBzdGFjay5sZW5ndGg7IGxlbmd0aC0tOykge1xuICAgICAgICAgICAgICBpZiAoc3RhY2tbbGVuZ3RoXSA9PT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBDeWNsaWMgc3RydWN0dXJlcyBjYW5ub3QgYmUgc2VyaWFsaXplZCBieSBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBZGQgdGhlIG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgICAgICAgICBzdGFjay5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgaW5kZW50YXRpb24gbGV2ZWwgYW5kIGluZGVudCBvbmUgYWRkaXRpb25hbCBsZXZlbC5cbiAgICAgICAgICAgIHByZWZpeCA9IGluZGVudGF0aW9uO1xuICAgICAgICAgICAgaW5kZW50YXRpb24gKz0gd2hpdGVzcGFjZTtcbiAgICAgICAgICAgIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICAvLyBSZWN1cnNpdmVseSBzZXJpYWxpemUgYXJyYXkgZWxlbWVudHMuXG4gICAgICAgICAgICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB2YWx1ZS5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHNlcmlhbGl6ZShpbmRleCwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbiwgc3RhY2spO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChlbGVtZW50ID09PSB1bmRlZiA/IFwibnVsbFwiIDogZWxlbWVudCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggPyAod2hpdGVzcGFjZSA/IFwiW1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJdXCIgOiAoXCJbXCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJdXCIpKSA6IFwiW11cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3QgbWVtYmVycy4gTWVtYmVycyBhcmUgc2VsZWN0ZWQgZnJvbVxuICAgICAgICAgICAgICAvLyBlaXRoZXIgYSB1c2VyLXNwZWNpZmllZCBsaXN0IG9mIHByb3BlcnR5IG5hbWVzLCBvciB0aGUgb2JqZWN0XG4gICAgICAgICAgICAgIC8vIGl0c2VsZi5cbiAgICAgICAgICAgICAgZm9yRWFjaChwcm9wZXJ0aWVzIHx8IHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgZWxlbWVudCA9IHNlcmlhbGl6ZShwcm9wZXJ0eSwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbiwgc3RhY2spO1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZikge1xuICAgICAgICAgICAgICAgICAgLy8gQWNjb3JkaW5nIHRvIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjM6IFwiSWYgYGdhcGAge3doaXRlc3BhY2V9XG4gICAgICAgICAgICAgICAgICAvLyBpcyBub3QgdGhlIGVtcHR5IHN0cmluZywgbGV0IGBtZW1iZXJgIHtxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIn1cbiAgICAgICAgICAgICAgICAgIC8vIGJlIHRoZSBjb25jYXRlbmF0aW9uIG9mIGBtZW1iZXJgIGFuZCB0aGUgYHNwYWNlYCBjaGFyYWN0ZXIuXCJcbiAgICAgICAgICAgICAgICAgIC8vIFRoZSBcImBzcGFjZWAgY2hhcmFjdGVyXCIgcmVmZXJzIHRvIHRoZSBsaXRlcmFsIHNwYWNlXG4gICAgICAgICAgICAgICAgICAvLyBjaGFyYWN0ZXIsIG5vdCB0aGUgYHNwYWNlYCB7d2lkdGh9IGFyZ3VtZW50IHByb3ZpZGVkIHRvXG4gICAgICAgICAgICAgICAgICAvLyBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHF1b3RlKHByb3BlcnR5KSArIFwiOlwiICsgKHdoaXRlc3BhY2UgPyBcIiBcIiA6IFwiXCIpICsgZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0cy5sZW5ndGggPyAod2hpdGVzcGFjZSA/IFwie1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJ9XCIgOiAoXCJ7XCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJ9XCIpKSA6IFwie31cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgb2JqZWN0IGZyb20gdGhlIHRyYXZlcnNlZCBvYmplY3Qgc3RhY2suXG4gICAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04uc3RyaW5naWZ5YC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG4gICAgICAgIGV4cG9ydHMuc3RyaW5naWZ5ID0gZnVuY3Rpb24gKHNvdXJjZSwgZmlsdGVyLCB3aWR0aCkge1xuICAgICAgICAgIHZhciB3aGl0ZXNwYWNlLCBjYWxsYmFjaywgcHJvcGVydGllcywgY2xhc3NOYW1lO1xuICAgICAgICAgIGlmIChvYmplY3RUeXBlc1t0eXBlb2YgZmlsdGVyXSAmJiBmaWx0ZXIpIHtcbiAgICAgICAgICAgIGlmICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbChmaWx0ZXIpKSA9PSBmdW5jdGlvbkNsYXNzKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrID0gZmlsdGVyO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBwcm9wZXJ0eSBuYW1lcyBhcnJheSBpbnRvIGEgbWFrZXNoaWZ0IHNldC5cbiAgICAgICAgICAgICAgcHJvcGVydGllcyA9IHt9O1xuICAgICAgICAgICAgICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbmd0aCA9IGZpbHRlci5sZW5ndGgsIHZhbHVlOyBpbmRleCA8IGxlbmd0aDsgdmFsdWUgPSBmaWx0ZXJbaW5kZXgrK10sICgoY2xhc3NOYW1lID0gZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkpLCBjbGFzc05hbWUgPT0gc3RyaW5nQ2xhc3MgfHwgY2xhc3NOYW1lID09IG51bWJlckNsYXNzKSAmJiAocHJvcGVydGllc1t2YWx1ZV0gPSAxKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh3aWR0aCkge1xuICAgICAgICAgICAgaWYgKChjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHdpZHRoKSkgPT0gbnVtYmVyQ2xhc3MpIHtcbiAgICAgICAgICAgICAgLy8gQ29udmVydCB0aGUgYHdpZHRoYCB0byBhbiBpbnRlZ2VyIGFuZCBjcmVhdGUgYSBzdHJpbmcgY29udGFpbmluZ1xuICAgICAgICAgICAgICAvLyBgd2lkdGhgIG51bWJlciBvZiBzcGFjZSBjaGFyYWN0ZXJzLlxuICAgICAgICAgICAgICBpZiAoKHdpZHRoIC09IHdpZHRoICUgMSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgZm9yICh3aGl0ZXNwYWNlID0gXCJcIiwgd2lkdGggPiAxMCAmJiAod2lkdGggPSAxMCk7IHdoaXRlc3BhY2UubGVuZ3RoIDwgd2lkdGg7IHdoaXRlc3BhY2UgKz0gXCIgXCIpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcykge1xuICAgICAgICAgICAgICB3aGl0ZXNwYWNlID0gd2lkdGgubGVuZ3RoIDw9IDEwID8gd2lkdGggOiB3aWR0aC5zbGljZSgwLCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIE9wZXJhIDw9IDcuNTR1MiBkaXNjYXJkcyB0aGUgdmFsdWVzIGFzc29jaWF0ZWQgd2l0aCBlbXB0eSBzdHJpbmcga2V5c1xuICAgICAgICAgIC8vIChgXCJcImApIG9ubHkgaWYgdGhleSBhcmUgdXNlZCBkaXJlY3RseSB3aXRoaW4gYW4gb2JqZWN0IG1lbWJlciBsaXN0XG4gICAgICAgICAgLy8gKGUuZy4sIGAhKFwiXCIgaW4geyBcIlwiOiAxfSlgKS5cbiAgICAgICAgICByZXR1cm4gc2VyaWFsaXplKFwiXCIsICh2YWx1ZSA9IHt9LCB2YWx1ZVtcIlwiXSA9IHNvdXJjZSwgdmFsdWUpLCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgXCJcIiwgW10pO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBQdWJsaWM6IFBhcnNlcyBhIEpTT04gc291cmNlIHN0cmluZy5cbiAgICAgIGlmICghaGFzKFwianNvbi1wYXJzZVwiKSkge1xuICAgICAgICB2YXIgZnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIHVuZXNjYXBlZFxuICAgICAgICAvLyBlcXVpdmFsZW50cy5cbiAgICAgICAgdmFyIFVuZXNjYXBlcyA9IHtcbiAgICAgICAgICA5MjogXCJcXFxcXCIsXG4gICAgICAgICAgMzQ6ICdcIicsXG4gICAgICAgICAgNDc6IFwiL1wiLFxuICAgICAgICAgIDk4OiBcIlxcYlwiLFxuICAgICAgICAgIDExNjogXCJcXHRcIixcbiAgICAgICAgICAxMTA6IFwiXFxuXCIsXG4gICAgICAgICAgMTAyOiBcIlxcZlwiLFxuICAgICAgICAgIDExNDogXCJcXHJcIlxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBTdG9yZXMgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICAgICAgdmFyIEluZGV4LCBTb3VyY2U7XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlc2V0cyB0aGUgcGFyc2VyIHN0YXRlIGFuZCB0aHJvd3MgYSBgU3ludGF4RXJyb3JgLlxuICAgICAgICB2YXIgYWJvcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgSW5kZXggPSBTb3VyY2UgPSBudWxsO1xuICAgICAgICAgIHRocm93IFN5bnRheEVycm9yKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJldHVybnMgdGhlIG5leHQgdG9rZW4sIG9yIGBcIiRcImAgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZFxuICAgICAgICAvLyB0aGUgZW5kIG9mIHRoZSBzb3VyY2Ugc3RyaW5nLiBBIHRva2VuIG1heSBiZSBhIHN0cmluZywgbnVtYmVyLCBgbnVsbGBcbiAgICAgICAgLy8gbGl0ZXJhbCwgb3IgQm9vbGVhbiBsaXRlcmFsLlxuICAgICAgICB2YXIgbGV4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBzb3VyY2UgPSBTb3VyY2UsIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGgsIHZhbHVlLCBiZWdpbiwgcG9zaXRpb24sIGlzU2lnbmVkLCBjaGFyQ29kZTtcbiAgICAgICAgICB3aGlsZSAoSW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpO1xuICAgICAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgICAgICBjYXNlIDk6IGNhc2UgMTA6IGNhc2UgMTM6IGNhc2UgMzI6XG4gICAgICAgICAgICAgICAgLy8gU2tpcCB3aGl0ZXNwYWNlIHRva2VucywgaW5jbHVkaW5nIHRhYnMsIGNhcnJpYWdlIHJldHVybnMsIGxpbmVcbiAgICAgICAgICAgICAgICAvLyBmZWVkcywgYW5kIHNwYWNlIGNoYXJhY3RlcnMuXG4gICAgICAgICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAxMjM6IGNhc2UgMTI1OiBjYXNlIDkxOiBjYXNlIDkzOiBjYXNlIDU4OiBjYXNlIDQ0OlxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGEgcHVuY3R1YXRvciB0b2tlbiAoYHtgLCBgfWAsIGBbYCwgYF1gLCBgOmAsIG9yIGAsYCkgYXRcbiAgICAgICAgICAgICAgICAvLyB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGNoYXJJbmRleEJ1Z2d5ID8gc291cmNlLmNoYXJBdChJbmRleCkgOiBzb3VyY2VbSW5kZXhdO1xuICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICBjYXNlIDM0OlxuICAgICAgICAgICAgICAgIC8vIGBcImAgZGVsaW1pdHMgYSBKU09OIHN0cmluZzsgYWR2YW5jZSB0byB0aGUgbmV4dCBjaGFyYWN0ZXIgYW5kXG4gICAgICAgICAgICAgICAgLy8gYmVnaW4gcGFyc2luZyB0aGUgc3RyaW5nLiBTdHJpbmcgdG9rZW5zIGFyZSBwcmVmaXhlZCB3aXRoIHRoZVxuICAgICAgICAgICAgICAgIC8vIHNlbnRpbmVsIGBAYCBjaGFyYWN0ZXIgdG8gZGlzdGluZ3Vpc2ggdGhlbSBmcm9tIHB1bmN0dWF0b3JzIGFuZFxuICAgICAgICAgICAgICAgIC8vIGVuZC1vZi1zdHJpbmcgdG9rZW5zLlxuICAgICAgICAgICAgICAgIGZvciAodmFsdWUgPSBcIkBcIiwgSW5kZXgrKzsgSW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA8IDMyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVuZXNjYXBlZCBBU0NJSSBjb250cm9sIGNoYXJhY3RlcnMgKHRob3NlIHdpdGggYSBjb2RlIHVuaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gbGVzcyB0aGFuIHRoZSBzcGFjZSBjaGFyYWN0ZXIpIGFyZSBub3QgcGVybWl0dGVkLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFyQ29kZSA9PSA5Mikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIHJldmVyc2Ugc29saWR1cyAoYFxcYCkgbWFya3MgdGhlIGJlZ2lubmluZyBvZiBhbiBlc2NhcGVkXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRyb2wgY2hhcmFjdGVyIChpbmNsdWRpbmcgYFwiYCwgYFxcYCwgYW5kIGAvYCkgb3IgVW5pY29kZVxuICAgICAgICAgICAgICAgICAgICAvLyBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2hhckNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIDkyOiBjYXNlIDM0OiBjYXNlIDQ3OiBjYXNlIDk4OiBjYXNlIDExNjogY2FzZSAxMTA6IGNhc2UgMTAyOiBjYXNlIDExNDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSBlc2NhcGVkIGNvbnRyb2wgY2hhcmFjdGVycy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IFVuZXNjYXBlc1tjaGFyQ29kZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSAxMTc6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBgXFx1YCBtYXJrcyB0aGUgYmVnaW5uaW5nIG9mIGEgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBmaXJzdCBjaGFyYWN0ZXIgYW5kIHZhbGlkYXRlIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm91ci1kaWdpdCBjb2RlIHBvaW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgYmVnaW4gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4ICsgNDsgSW5kZXggPCBwb3NpdGlvbjsgSW5kZXgrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQSB2YWxpZCBzZXF1ZW5jZSBjb21wcmlzZXMgZm91ciBoZXhkaWdpdHMgKGNhc2UtXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluc2Vuc2l0aXZlKSB0aGF0IGZvcm0gYSBzaW5nbGUgaGV4YWRlY2ltYWwgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3IHx8IGNoYXJDb2RlID49IDk3ICYmIGNoYXJDb2RlIDw9IDEwMiB8fCBjaGFyQ29kZSA+PSA2NSAmJiBjaGFyQ29kZSA8PSA3MCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJldml2ZSB0aGUgZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSArPSBmcm9tQ2hhckNvZGUoXCIweFwiICsgc291cmNlLnNsaWNlKGJlZ2luLCBJbmRleCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID09IDM0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gQW4gdW5lc2NhcGVkIGRvdWJsZS1xdW90ZSBjaGFyYWN0ZXIgbWFya3MgdGhlIGVuZCBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgICAvLyBzdHJpbmcuXG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGJlZ2luID0gSW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9wdGltaXplIGZvciB0aGUgY29tbW9uIGNhc2Ugd2hlcmUgYSBzdHJpbmcgaXMgdmFsaWQuXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjaGFyQ29kZSA+PSAzMiAmJiBjaGFyQ29kZSAhPSA5MiAmJiBjaGFyQ29kZSAhPSAzNCkge1xuICAgICAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIHRoZSBzdHJpbmcgYXMtaXMuXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlICs9IHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpID09IDM0KSB7XG4gICAgICAgICAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmQgcmV0dXJuIHRoZSByZXZpdmVkIHN0cmluZy5cbiAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFVudGVybWluYXRlZCBzdHJpbmcuXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBudW1iZXJzIGFuZCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBiZWdpbiA9IEluZGV4O1xuICAgICAgICAgICAgICAgIC8vIEFkdmFuY2UgcGFzdCB0aGUgbmVnYXRpdmUgc2lnbiwgaWYgb25lIGlzIHNwZWNpZmllZC5cbiAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDUpIHtcbiAgICAgICAgICAgICAgICAgIGlzU2lnbmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoKytJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFBhcnNlIGFuIGludGVnZXIgb3IgZmxvYXRpbmctcG9pbnQgdmFsdWUuXG4gICAgICAgICAgICAgICAgaWYgKGNoYXJDb2RlID49IDQ4ICYmIGNoYXJDb2RlIDw9IDU3KSB7XG4gICAgICAgICAgICAgICAgICAvLyBMZWFkaW5nIHplcm9lcyBhcmUgaW50ZXJwcmV0ZWQgYXMgb2N0YWwgbGl0ZXJhbHMuXG4gICAgICAgICAgICAgICAgICBpZiAoY2hhckNvZGUgPT0gNDggJiYgKChjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4ICsgMSkpLCBjaGFyQ29kZSA+PSA0OCAmJiBjaGFyQ29kZSA8PSA1NykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBvY3RhbCBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaXNTaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBpbnRlZ2VyIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgIGZvciAoOyBJbmRleCA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQoSW5kZXgpKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBJbmRleCsrKTtcbiAgICAgICAgICAgICAgICAgIC8vIEZsb2F0cyBjYW5ub3QgY29udGFpbiBhIGxlYWRpbmcgZGVjaW1hbCBwb2ludDsgaG93ZXZlciwgdGhpc1xuICAgICAgICAgICAgICAgICAgLy8gY2FzZSBpcyBhbHJlYWR5IGFjY291bnRlZCBmb3IgYnkgdGhlIHBhcnNlci5cbiAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChJbmRleCkgPT0gNDYpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24gPSArK0luZGV4O1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJzZSB0aGUgZGVjaW1hbCBjb21wb25lbnQuXG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQocG9zaXRpb24pKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCB0cmFpbGluZyBkZWNpbWFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIFBhcnNlIGV4cG9uZW50cy4gVGhlIGBlYCBkZW5vdGluZyB0aGUgZXhwb25lbnQgaXNcbiAgICAgICAgICAgICAgICAgIC8vIGNhc2UtaW5zZW5zaXRpdmUuXG4gICAgICAgICAgICAgICAgICBjaGFyQ29kZSA9IHNvdXJjZS5jaGFyQ29kZUF0KEluZGV4KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSAxMDEgfHwgY2hhckNvZGUgPT0gNjkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hhckNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdCgrK0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBwYXN0IHRoZSBzaWduIGZvbGxvd2luZyB0aGUgZXhwb25lbnQsIGlmIG9uZSBpc1xuICAgICAgICAgICAgICAgICAgICAvLyBzcGVjaWZpZWQuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyQ29kZSA9PSA0MyB8fCBjaGFyQ29kZSA9PSA0NSkge1xuICAgICAgICAgICAgICAgICAgICAgIEluZGV4Kys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGV4cG9uZW50aWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChwb3NpdGlvbiA9IEluZGV4OyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoKGNoYXJDb2RlID0gc291cmNlLmNoYXJDb2RlQXQocG9zaXRpb24pKSwgY2hhckNvZGUgPj0gNDggJiYgY2hhckNvZGUgPD0gNTcpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgLy8gSWxsZWdhbCBlbXB0eSBleHBvbmVudC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyBDb2VyY2UgdGhlIHBhcnNlZCB2YWx1ZSB0byBhIEphdmFTY3JpcHQgbnVtYmVyLlxuICAgICAgICAgICAgICAgICAgcmV0dXJuICtzb3VyY2Uuc2xpY2UoYmVnaW4sIEluZGV4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gQSBuZWdhdGl2ZSBzaWduIG1heSBvbmx5IHByZWNlZGUgbnVtYmVycy5cbiAgICAgICAgICAgICAgICBpZiAoaXNTaWduZWQpIHtcbiAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIGB0cnVlYCwgYGZhbHNlYCwgYW5kIGBudWxsYCBsaXRlcmFscy5cbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNSkgPT0gXCJmYWxzZVwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA1O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwibnVsbFwiKSB7XG4gICAgICAgICAgICAgICAgICBJbmRleCArPSA0O1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFVucmVjb2duaXplZCB0b2tlbi5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBSZXR1cm4gdGhlIHNlbnRpbmVsIGAkYCBjaGFyYWN0ZXIgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZCB0aGUgZW5kXG4gICAgICAgICAgLy8gb2YgdGhlIHNvdXJjZSBzdHJpbmcuXG4gICAgICAgICAgcmV0dXJuIFwiJFwiO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEludGVybmFsOiBQYXJzZXMgYSBKU09OIGB2YWx1ZWAgdG9rZW4uXG4gICAgICAgIHZhciBnZXQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICB2YXIgcmVzdWx0cywgaGFzTWVtYmVycztcbiAgICAgICAgICBpZiAodmFsdWUgPT0gXCIkXCIpIHtcbiAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgZW5kIG9mIGlucHV0LlxuICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBpZiAoKGNoYXJJbmRleEJ1Z2d5ID8gdmFsdWUuY2hhckF0KDApIDogdmFsdWVbMF0pID09IFwiQFwiKSB7XG4gICAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgc2VudGluZWwgYEBgIGNoYXJhY3Rlci5cbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnNsaWNlKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUGFyc2Ugb2JqZWN0IGFuZCBhcnJheSBsaXRlcmFscy5cbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIltcIikge1xuICAgICAgICAgICAgICAvLyBQYXJzZXMgYSBKU09OIGFycmF5LCByZXR1cm5pbmcgYSBuZXcgSmF2YVNjcmlwdCBhcnJheS5cbiAgICAgICAgICAgICAgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgICBmb3IgKDs7IGhhc01lbWJlcnMgfHwgKGhhc01lbWJlcnMgPSB0cnVlKSkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgICAgLy8gQSBjbG9zaW5nIHNxdWFyZSBicmFja2V0IG1hcmtzIHRoZSBlbmQgb2YgdGhlIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIGFycmF5IGxpdGVyYWwgY29udGFpbnMgZWxlbWVudHMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdGluZyB0aGUgcHJldmlvdXMgZWxlbWVudCBmcm9tIHRoZVxuICAgICAgICAgICAgICAgIC8vIG5leHQuXG4gICAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJdXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBhcnJheSBsaXRlcmFsLlxuICAgICAgICAgICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEEgYCxgIG11c3Qgc2VwYXJhdGUgZWFjaCBhcnJheSBlbGVtZW50LlxuICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBFbGlzaW9ucyBhbmQgbGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goZ2V0KHZhbHVlKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09IFwie1wiKSB7XG4gICAgICAgICAgICAgIC8vIFBhcnNlcyBhIEpTT04gb2JqZWN0LCByZXR1cm5pbmcgYSBuZXcgSmF2YVNjcmlwdCBvYmplY3QuXG4gICAgICAgICAgICAgIHJlc3VsdHMgPSB7fTtcbiAgICAgICAgICAgICAgZm9yICg7OyBoYXNNZW1iZXJzIHx8IChoYXNNZW1iZXJzID0gdHJ1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgIC8vIEEgY2xvc2luZyBjdXJseSBicmFjZSBtYXJrcyB0aGUgZW5kIG9mIHRoZSBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgb2JqZWN0IGxpdGVyYWwgY29udGFpbnMgbWVtYmVycywgdGhlIGN1cnJlbnQgdG9rZW5cbiAgICAgICAgICAgICAgICAvLyBzaG91bGQgYmUgYSBjb21tYSBzZXBhcmF0b3IuXG4gICAgICAgICAgICAgICAgaWYgKGhhc01lbWJlcnMpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggb2JqZWN0IG1lbWJlci5cbiAgICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gTGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQsIG9iamVjdCBwcm9wZXJ0eSBuYW1lcyBtdXN0IGJlXG4gICAgICAgICAgICAgICAgLy8gZG91YmxlLXF1b3RlZCBzdHJpbmdzLCBhbmQgYSBgOmAgbXVzdCBzZXBhcmF0ZSBlYWNoIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgLy8gbmFtZSBhbmQgdmFsdWUuXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiIHx8IHR5cGVvZiB2YWx1ZSAhPSBcInN0cmluZ1wiIHx8IChjaGFySW5kZXhCdWdneSA/IHZhbHVlLmNoYXJBdCgwKSA6IHZhbHVlWzBdKSAhPSBcIkBcIiB8fCBsZXgoKSAhPSBcIjpcIikge1xuICAgICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0c1t2YWx1ZS5zbGljZSgxKV0gPSBnZXQobGV4KCkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVW5leHBlY3RlZCB0b2tlbiBlbmNvdW50ZXJlZC5cbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbnRlcm5hbDogVXBkYXRlcyBhIHRyYXZlcnNlZCBvYmplY3QgbWVtYmVyLlxuICAgICAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24gKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIGVsZW1lbnQgPSB3YWxrKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICAgICAgICBpZiAoZWxlbWVudCA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3VyY2VbcHJvcGVydHldID0gZWxlbWVudDtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBhIHBhcnNlZCBKU09OIG9iamVjdCwgaW52b2tpbmcgdGhlXG4gICAgICAgIC8vIGBjYWxsYmFja2AgZnVuY3Rpb24gZm9yIGVhY2ggdmFsdWUuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gICAgICAgIC8vIGBXYWxrKGhvbGRlciwgbmFtZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gICAgICAgIHZhciB3YWxrID0gZnVuY3Rpb24gKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gc291cmNlW3Byb3BlcnR5XSwgbGVuZ3RoO1xuICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgICAgICAgLy8gYGZvckVhY2hgIGNhbid0IGJlIHVzZWQgdG8gdHJhdmVyc2UgYW4gYXJyYXkgaW4gT3BlcmEgPD0gOC41NFxuICAgICAgICAgICAgLy8gYmVjYXVzZSBpdHMgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW1wbGVtZW50YXRpb24gcmV0dXJucyBgZmFsc2VgXG4gICAgICAgICAgICAvLyBmb3IgYXJyYXkgaW5kaWNlcyAoZS5nLiwgYCFbMSwgMiwgM10uaGFzT3duUHJvcGVydHkoXCIwXCIpYCkuXG4gICAgICAgICAgICBpZiAoZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkgPT0gYXJyYXlDbGFzcykge1xuICAgICAgICAgICAgICBmb3IgKGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgbGVuZ3RoLS07KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKHZhbHVlLCBsZW5ndGgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm9yRWFjaCh2YWx1ZSwgZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlKHZhbHVlLCBwcm9wZXJ0eSwgY2FsbGJhY2spO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwoc291cmNlLCBwcm9wZXJ0eSwgdmFsdWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1YmxpYzogYEpTT04ucGFyc2VgLiBTZWUgRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgICAgICAgZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChzb3VyY2UsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHJlc3VsdCwgdmFsdWU7XG4gICAgICAgICAgSW5kZXggPSAwO1xuICAgICAgICAgIFNvdXJjZSA9IFwiXCIgKyBzb3VyY2U7XG4gICAgICAgICAgcmVzdWx0ID0gZ2V0KGxleCgpKTtcbiAgICAgICAgICAvLyBJZiBhIEpTT04gc3RyaW5nIGNvbnRhaW5zIG11bHRpcGxlIHRva2VucywgaXQgaXMgaW52YWxpZC5cbiAgICAgICAgICBpZiAobGV4KCkgIT0gXCIkXCIpIHtcbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJlc2V0IHRoZSBwYXJzZXIgc3RhdGUuXG4gICAgICAgICAgSW5kZXggPSBTb3VyY2UgPSBudWxsO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayAmJiBnZXRDbGFzcy5jYWxsKGNhbGxiYWNrKSA9PSBmdW5jdGlvbkNsYXNzID8gd2FsaygodmFsdWUgPSB7fSwgdmFsdWVbXCJcIl0gPSByZXN1bHQsIHZhbHVlKSwgXCJcIiwgY2FsbGJhY2spIDogcmVzdWx0O1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIGV4cG9ydHNbXCJydW5JbkNvbnRleHRcIl0gPSBydW5JbkNvbnRleHQ7XG4gICAgcmV0dXJuIGV4cG9ydHM7XG4gIH1cblxuICBpZiAoZnJlZUV4cG9ydHMgJiYgIWlzTG9hZGVyKSB7XG4gICAgLy8gRXhwb3J0IGZvciBDb21tb25KUyBlbnZpcm9ubWVudHMuXG4gICAgcnVuSW5Db250ZXh0KHJvb3QsIGZyZWVFeHBvcnRzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBFeHBvcnQgZm9yIHdlYiBicm93c2VycyBhbmQgSmF2YVNjcmlwdCBlbmdpbmVzLlxuICAgIHZhciBuYXRpdmVKU09OID0gcm9vdC5KU09OLFxuICAgICAgICBwcmV2aW91c0pTT04gPSByb290W1wiSlNPTjNcIl0sXG4gICAgICAgIGlzUmVzdG9yZWQgPSBmYWxzZTtcblxuICAgIHZhciBKU09OMyA9IHJ1bkluQ29udGV4dChyb290LCAocm9vdFtcIkpTT04zXCJdID0ge1xuICAgICAgLy8gUHVibGljOiBSZXN0b3JlcyB0aGUgb3JpZ2luYWwgdmFsdWUgb2YgdGhlIGdsb2JhbCBgSlNPTmAgb2JqZWN0IGFuZFxuICAgICAgLy8gcmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgYEpTT04zYCBvYmplY3QuXG4gICAgICBcIm5vQ29uZmxpY3RcIjogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIWlzUmVzdG9yZWQpIHtcbiAgICAgICAgICBpc1Jlc3RvcmVkID0gdHJ1ZTtcbiAgICAgICAgICByb290LkpTT04gPSBuYXRpdmVKU09OO1xuICAgICAgICAgIHJvb3RbXCJKU09OM1wiXSA9IHByZXZpb3VzSlNPTjtcbiAgICAgICAgICBuYXRpdmVKU09OID0gcHJldmlvdXNKU09OID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gSlNPTjM7XG4gICAgICB9XG4gICAgfSkpO1xuXG4gICAgcm9vdC5KU09OID0ge1xuICAgICAgXCJwYXJzZVwiOiBKU09OMy5wYXJzZSxcbiAgICAgIFwic3RyaW5naWZ5XCI6IEpTT04zLnN0cmluZ2lmeVxuICAgIH07XG4gIH1cblxuICAvLyBFeHBvcnQgZm9yIGFzeW5jaHJvbm91cyBtb2R1bGUgbG9hZGVycy5cbiAgaWYgKGlzTG9hZGVyKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBKU09OMztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIvKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gSlNUT1JBR0UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogU2ltcGxlIGxvY2FsIHN0b3JhZ2Ugd3JhcHBlciB0byBzYXZlIGRhdGEgb24gdGhlIGJyb3dzZXIgc2lkZSwgc3VwcG9ydGluZ1xuICogYWxsIG1ham9yIGJyb3dzZXJzIC0gSUU2KywgRmlyZWZveDIrLCBTYWZhcmk0KywgQ2hyb21lNCsgYW5kIE9wZXJhIDEwLjUrXG4gKlxuICogQXV0aG9yOiBBbmRyaXMgUmVpbm1hbiwgYW5kcmlzLnJlaW5tYW5AZ21haWwuY29tXG4gKiBQcm9qZWN0IGhvbWVwYWdlOiB3d3cuanN0b3JhZ2UuaW5mb1xuICpcbiAqIExpY2Vuc2VkIHVuZGVyIFVubGljZW5zZTpcbiAqXG4gKiBUaGlzIGlzIGZyZWUgYW5kIHVuZW5jdW1iZXJlZCBzb2Z0d2FyZSByZWxlYXNlZCBpbnRvIHRoZSBwdWJsaWMgZG9tYWluLlxuICogXG4gKiBBbnlvbmUgaXMgZnJlZSB0byBjb3B5LCBtb2RpZnksIHB1Ymxpc2gsIHVzZSwgY29tcGlsZSwgc2VsbCwgb3JcbiAqIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSwgZWl0aGVyIGluIHNvdXJjZSBjb2RlIGZvcm0gb3IgYXMgYSBjb21waWxlZFxuICogYmluYXJ5LCBmb3IgYW55IHB1cnBvc2UsIGNvbW1lcmNpYWwgb3Igbm9uLWNvbW1lcmNpYWwsIGFuZCBieSBhbnlcbiAqIG1lYW5zLlxuICogXG4gKiBJbiBqdXJpc2RpY3Rpb25zIHRoYXQgcmVjb2duaXplIGNvcHlyaWdodCBsYXdzLCB0aGUgYXV0aG9yIG9yIGF1dGhvcnNcbiAqIG9mIHRoaXMgc29mdHdhcmUgZGVkaWNhdGUgYW55IGFuZCBhbGwgY29weXJpZ2h0IGludGVyZXN0IGluIHRoZVxuICogc29mdHdhcmUgdG8gdGhlIHB1YmxpYyBkb21haW4uIFdlIG1ha2UgdGhpcyBkZWRpY2F0aW9uIGZvciB0aGUgYmVuZWZpdFxuICogb2YgdGhlIHB1YmxpYyBhdCBsYXJnZSBhbmQgdG8gdGhlIGRldHJpbWVudCBvZiBvdXIgaGVpcnMgYW5kXG4gKiBzdWNjZXNzb3JzLiBXZSBpbnRlbmQgdGhpcyBkZWRpY2F0aW9uIHRvIGJlIGFuIG92ZXJ0IGFjdCBvZlxuICogcmVsaW5xdWlzaG1lbnQgaW4gcGVycGV0dWl0eSBvZiBhbGwgcHJlc2VudCBhbmQgZnV0dXJlIHJpZ2h0cyB0byB0aGlzXG4gKiBzb2Z0d2FyZSB1bmRlciBjb3B5cmlnaHQgbGF3LlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuICogRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4gKiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuXG4gKiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUlxuICogT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsXG4gKiBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1JcbiAqIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiAqIFxuICogRm9yIG1vcmUgaW5mb3JtYXRpb24sIHBsZWFzZSByZWZlciB0byA8aHR0cDovL3VubGljZW5zZS5vcmcvPlxuICovXG5cbiAoZnVuY3Rpb24oKXtcbiAgICB2YXJcbiAgICAgICAgLyogalN0b3JhZ2UgdmVyc2lvbiAqL1xuICAgICAgICBKU1RPUkFHRV9WRVJTSU9OID0gXCIwLjQuOFwiLFxuXG4gICAgICAgIC8qIGRldGVjdCBhIGRvbGxhciBvYmplY3Qgb3IgY3JlYXRlIG9uZSBpZiBub3QgZm91bmQgKi9cbiAgICAgICAgJCA9IHdpbmRvdy5qUXVlcnkgfHwgd2luZG93LiQgfHwgKHdpbmRvdy4kID0ge30pLFxuXG4gICAgICAgIC8qIGNoZWNrIGZvciBhIEpTT04gaGFuZGxpbmcgc3VwcG9ydCAqL1xuICAgICAgICBKU09OID0ge1xuICAgICAgICAgICAgcGFyc2U6XG4gICAgICAgICAgICAgICAgd2luZG93LkpTT04gJiYgKHdpbmRvdy5KU09OLnBhcnNlIHx8IHdpbmRvdy5KU09OLmRlY29kZSkgfHxcbiAgICAgICAgICAgICAgICBTdHJpbmcucHJvdG90eXBlLmV2YWxKU09OICYmIGZ1bmN0aW9uKHN0cil7cmV0dXJuIFN0cmluZyhzdHIpLmV2YWxKU09OKCk7fSB8fFxuICAgICAgICAgICAgICAgICQucGFyc2VKU09OIHx8XG4gICAgICAgICAgICAgICAgJC5ldmFsSlNPTixcbiAgICAgICAgICAgIHN0cmluZ2lmeTpcbiAgICAgICAgICAgICAgICBPYmplY3QudG9KU09OIHx8XG4gICAgICAgICAgICAgICAgd2luZG93LkpTT04gJiYgKHdpbmRvdy5KU09OLnN0cmluZ2lmeSB8fCB3aW5kb3cuSlNPTi5lbmNvZGUpIHx8XG4gICAgICAgICAgICAgICAgJC50b0pTT05cbiAgICAgICAgfTtcblxuICAgIC8vIEJyZWFrIGlmIG5vIEpTT04gc3VwcG9ydCB3YXMgZm91bmRcbiAgICBpZighKFwicGFyc2VcIiBpbiBKU09OKSB8fCAhKFwic3RyaW5naWZ5XCIgaW4gSlNPTikpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBKU09OIHN1cHBvcnQgZm91bmQsIGluY2x1ZGUgLy9jZG5qcy5jbG91ZGZsYXJlLmNvbS9hamF4L2xpYnMvanNvbjIvMjAxMTAyMjMvanNvbjIuanMgdG8gcGFnZVwiKTtcbiAgICB9XG5cbiAgICB2YXJcbiAgICAgICAgLyogVGhpcyBpcyB0aGUgb2JqZWN0LCB0aGF0IGhvbGRzIHRoZSBjYWNoZWQgdmFsdWVzICovXG4gICAgICAgIF9zdG9yYWdlID0ge19fanN0b3JhZ2VfbWV0YTp7Q1JDMzI6e319fSxcblxuICAgICAgICAvKiBBY3R1YWwgYnJvd3NlciBzdG9yYWdlIChsb2NhbFN0b3JhZ2Ugb3IgZ2xvYmFsU3RvcmFnZVtcImRvbWFpblwiXSkgKi9cbiAgICAgICAgX3N0b3JhZ2Vfc2VydmljZSA9IHtqU3RvcmFnZTpcInt9XCJ9LFxuXG4gICAgICAgIC8qIERPTSBlbGVtZW50IGZvciBvbGRlciBJRSB2ZXJzaW9ucywgaG9sZHMgdXNlckRhdGEgYmVoYXZpb3IgKi9cbiAgICAgICAgX3N0b3JhZ2VfZWxtID0gbnVsbCxcblxuICAgICAgICAvKiBIb3cgbXVjaCBzcGFjZSBkb2VzIHRoZSBzdG9yYWdlIHRha2UgKi9cbiAgICAgICAgX3N0b3JhZ2Vfc2l6ZSA9IDAsXG5cbiAgICAgICAgLyogd2hpY2ggYmFja2VuZCBpcyBjdXJyZW50bHkgdXNlZCAqL1xuICAgICAgICBfYmFja2VuZCA9IGZhbHNlLFxuXG4gICAgICAgIC8qIG9uY2hhbmdlIG9ic2VydmVycyAqL1xuICAgICAgICBfb2JzZXJ2ZXJzID0ge30sXG5cbiAgICAgICAgLyogdGltZW91dCB0byB3YWl0IGFmdGVyIG9uY2hhbmdlIGV2ZW50ICovXG4gICAgICAgIF9vYnNlcnZlcl90aW1lb3V0ID0gZmFsc2UsXG5cbiAgICAgICAgLyogbGFzdCB1cGRhdGUgdGltZSAqL1xuICAgICAgICBfb2JzZXJ2ZXJfdXBkYXRlID0gMCxcblxuICAgICAgICAvKiBwdWJzdWIgb2JzZXJ2ZXJzICovXG4gICAgICAgIF9wdWJzdWJfb2JzZXJ2ZXJzID0ge30sXG5cbiAgICAgICAgLyogc2tpcCBwdWJsaXNoZWQgaXRlbXMgb2xkZXIgdGhhbiBjdXJyZW50IHRpbWVzdGFtcCAqL1xuICAgICAgICBfcHVic3ViX2xhc3QgPSArbmV3IERhdGUoKSxcblxuICAgICAgICAvKiBOZXh0IGNoZWNrIGZvciBUVEwgKi9cbiAgICAgICAgX3R0bF90aW1lb3V0LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBYTUwgZW5jb2RpbmcgYW5kIGRlY29kaW5nIGFzIFhNTCBub2RlcyBjYW4ndCBiZSBKU09OJ2l6ZWRcbiAgICAgICAgICogWE1MIG5vZGVzIGFyZSBlbmNvZGVkIGFuZCBkZWNvZGVkIGlmIHRoZSBub2RlIGlzIHRoZSB2YWx1ZSB0byBiZSBzYXZlZFxuICAgICAgICAgKiBidXQgbm90IGlmIGl0J3MgYXMgYSBwcm9wZXJ0eSBvZiBhbm90aGVyIG9iamVjdFxuICAgICAgICAgKiBFZy4gLVxuICAgICAgICAgKiAgICQualN0b3JhZ2Uuc2V0KFwia2V5XCIsIHhtbE5vZGUpOyAgICAgICAgLy8gSVMgT0tcbiAgICAgICAgICogICAkLmpTdG9yYWdlLnNldChcImtleVwiLCB7eG1sOiB4bWxOb2RlfSk7IC8vIE5PVCBPS1xuICAgICAgICAgKi9cbiAgICAgICAgX1hNTFNlcnZpY2UgPSB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVmFsaWRhdGVzIGEgWE1MIG5vZGUgdG8gYmUgWE1MXG4gICAgICAgICAgICAgKiBiYXNlZCBvbiBqUXVlcnkuaXNYTUwgZnVuY3Rpb25cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNYTUw6IGZ1bmN0aW9uKGVsbSl7XG4gICAgICAgICAgICAgICAgdmFyIGRvY3VtZW50RWxlbWVudCA9IChlbG0gPyBlbG0ub3duZXJEb2N1bWVudCB8fCBlbG0gOiAwKS5kb2N1bWVudEVsZW1lbnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50RWxlbWVudCA/IGRvY3VtZW50RWxlbWVudC5ub2RlTmFtZSAhPT0gXCJIVE1MXCIgOiBmYWxzZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRW5jb2RlcyBhIFhNTCBub2RlIHRvIHN0cmluZ1xuICAgICAgICAgICAgICogYmFzZWQgb24gaHR0cDovL3d3dy5tZXJjdXJ5dGlkZS5jby51ay9uZXdzL2FydGljbGUvaXNzdWVzLXdoZW4td29ya2luZy1hamF4L1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBlbmNvZGU6IGZ1bmN0aW9uKHhtbE5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZighdGhpcy5pc1hNTCh4bWxOb2RlKSl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHJ5eyAvLyBNb3ppbGxhLCBXZWJraXQsIE9wZXJhXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKHhtbE5vZGUpO1xuICAgICAgICAgICAgICAgIH1jYXRjaChFMSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkgeyAgLy8gSUVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB4bWxOb2RlLnhtbDtcbiAgICAgICAgICAgICAgICAgICAgfWNhdGNoKEUyKXt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRGVjb2RlcyBhIFhNTCBub2RlIGZyb20gc3RyaW5nXG4gICAgICAgICAgICAgKiBsb29zZWx5IGJhc2VkIG9uIGh0dHA6Ly9vdXR3ZXN0bWVkaWEuY29tL2pxdWVyeS1wbHVnaW5zL3htbGRvbS9cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZGVjb2RlOiBmdW5jdGlvbih4bWxTdHJpbmcpe1xuICAgICAgICAgICAgICAgIHZhciBkb21fcGFyc2VyID0gKFwiRE9NUGFyc2VyXCIgaW4gd2luZG93ICYmIChuZXcgRE9NUGFyc2VyKCkpLnBhcnNlRnJvbVN0cmluZykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICh3aW5kb3cuQWN0aXZlWE9iamVjdCAmJiBmdW5jdGlvbihfeG1sU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB4bWxfZG9jID0gbmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MRE9NXCIpO1xuICAgICAgICAgICAgICAgICAgICB4bWxfZG9jLmFzeW5jID0gXCJmYWxzZVwiO1xuICAgICAgICAgICAgICAgICAgICB4bWxfZG9jLmxvYWRYTUwoX3htbFN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4bWxfZG9jO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIHJlc3VsdFhNTDtcbiAgICAgICAgICAgICAgICBpZighZG9tX3BhcnNlcil7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0WE1MID0gZG9tX3BhcnNlci5jYWxsKFwiRE9NUGFyc2VyXCIgaW4gd2luZG93ICYmIChuZXcgRE9NUGFyc2VyKCkpIHx8IHdpbmRvdywgeG1sU3RyaW5nLCBcInRleHQveG1sXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzWE1MKHJlc3VsdFhNTCk/cmVzdWx0WE1MOmZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG5cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLyBQUklWQVRFIE1FVEhPRFMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXphdGlvbiBmdW5jdGlvbi4gRGV0ZWN0cyBpZiB0aGUgYnJvd3NlciBzdXBwb3J0cyBET00gU3RvcmFnZVxuICAgICAqIG9yIHVzZXJEYXRhIGJlaGF2aW9yIGFuZCBiZWhhdmVzIGFjY29yZGluZ2x5LlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9pbml0KCl7XG4gICAgICAgIC8qIENoZWNrIGlmIGJyb3dzZXIgc3VwcG9ydHMgbG9jYWxTdG9yYWdlICovXG4gICAgICAgIHZhciBsb2NhbFN0b3JhZ2VSZWFsbHlXb3JrcyA9IGZhbHNlO1xuICAgICAgICBpZihcImxvY2FsU3RvcmFnZVwiIGluIHdpbmRvdyl7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIl90bXB0ZXN0XCIsIFwidG1wdmFsXCIpO1xuICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZVJlYWxseVdvcmtzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oXCJfdG1wdGVzdFwiKTtcbiAgICAgICAgICAgIH0gY2F0Y2goQm9ndXNRdW90YUV4Y2VlZGVkRXJyb3JPbklvczUpIHtcbiAgICAgICAgICAgICAgICAvLyBUaGFua3MgYmUgdG8gaU9TNSBQcml2YXRlIEJyb3dzaW5nIG1vZGUgd2hpY2ggdGhyb3dzXG4gICAgICAgICAgICAgICAgLy8gUVVPVEFfRVhDRUVERURfRVJSUk9SIERPTSBFeGNlcHRpb24gMjIuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZihsb2NhbFN0b3JhZ2VSZWFsbHlXb3Jrcyl7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlmKHdpbmRvdy5sb2NhbFN0b3JhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgX3N0b3JhZ2Vfc2VydmljZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG4gICAgICAgICAgICAgICAgICAgIF9iYWNrZW5kID0gXCJsb2NhbFN0b3JhZ2VcIjtcbiAgICAgICAgICAgICAgICAgICAgX29ic2VydmVyX3VwZGF0ZSA9IF9zdG9yYWdlX3NlcnZpY2UualN0b3JhZ2VfdXBkYXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2goRTMpIHsvKiBGaXJlZm94IGZhaWxzIHdoZW4gdG91Y2hpbmcgbG9jYWxTdG9yYWdlIGFuZCBjb29raWVzIGFyZSBkaXNhYmxlZCAqL31cbiAgICAgICAgfVxuICAgICAgICAvKiBDaGVjayBpZiBicm93c2VyIHN1cHBvcnRzIGdsb2JhbFN0b3JhZ2UgKi9cbiAgICAgICAgZWxzZSBpZihcImdsb2JhbFN0b3JhZ2VcIiBpbiB3aW5kb3cpe1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZih3aW5kb3cuZ2xvYmFsU3RvcmFnZSkge1xuICAgICAgICAgICAgICAgICAgICBpZih3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgPT0gXCJsb2NhbGhvc3RcIil7XG4gICAgICAgICAgICAgICAgICAgICAgICBfc3RvcmFnZV9zZXJ2aWNlID0gd2luZG93Lmdsb2JhbFN0b3JhZ2VbXCJsb2NhbGhvc3QubG9jYWxkb21haW5cIl07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9zdG9yYWdlX3NlcnZpY2UgPSB3aW5kb3cuZ2xvYmFsU3RvcmFnZVt3aW5kb3cubG9jYXRpb24uaG9zdG5hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF9iYWNrZW5kID0gXCJnbG9iYWxTdG9yYWdlXCI7XG4gICAgICAgICAgICAgICAgICAgIF9vYnNlcnZlcl91cGRhdGUgPSBfc3RvcmFnZV9zZXJ2aWNlLmpTdG9yYWdlX3VwZGF0ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoKEU0KSB7LyogRmlyZWZveCBmYWlscyB3aGVuIHRvdWNoaW5nIGxvY2FsU3RvcmFnZSBhbmQgY29va2llcyBhcmUgZGlzYWJsZWQgKi99XG4gICAgICAgIH1cbiAgICAgICAgLyogQ2hlY2sgaWYgYnJvd3NlciBzdXBwb3J0cyB1c2VyRGF0YSBiZWhhdmlvciAqL1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIF9zdG9yYWdlX2VsbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuICAgICAgICAgICAgaWYoX3N0b3JhZ2VfZWxtLmFkZEJlaGF2aW9yKXtcblxuICAgICAgICAgICAgICAgIC8qIFVzZSBhIERPTSBlbGVtZW50IHRvIGFjdCBhcyB1c2VyRGF0YSBzdG9yYWdlICovXG4gICAgICAgICAgICAgICAgX3N0b3JhZ2VfZWxtLnN0eWxlLmJlaGF2aW9yID0gXCJ1cmwoI2RlZmF1bHQjdXNlckRhdGEpXCI7XG5cbiAgICAgICAgICAgICAgICAvKiB1c2VyRGF0YSBlbGVtZW50IG5lZWRzIHRvIGJlIGluc2VydGVkIGludG8gdGhlIERPTSEgKi9cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0uYXBwZW5kQ2hpbGQoX3N0b3JhZ2VfZWxtKTtcblxuICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgX3N0b3JhZ2VfZWxtLmxvYWQoXCJqU3RvcmFnZVwiKTtcbiAgICAgICAgICAgICAgICB9Y2F0Y2goRSl7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRyeSB0byByZXNldCBjYWNoZVxuICAgICAgICAgICAgICAgICAgICBfc3RvcmFnZV9lbG0uc2V0QXR0cmlidXRlKFwialN0b3JhZ2VcIiwgXCJ7fVwiKTtcbiAgICAgICAgICAgICAgICAgICAgX3N0b3JhZ2VfZWxtLnNhdmUoXCJqU3RvcmFnZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgX3N0b3JhZ2VfZWxtLmxvYWQoXCJqU3RvcmFnZVwiKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IFwie31cIjtcbiAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBfc3RvcmFnZV9lbG0uZ2V0QXR0cmlidXRlKFwialN0b3JhZ2VcIik7XG4gICAgICAgICAgICAgICAgfWNhdGNoKEU1KXt9XG5cbiAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgIF9vYnNlcnZlcl91cGRhdGUgPSBfc3RvcmFnZV9lbG0uZ2V0QXR0cmlidXRlKFwialN0b3JhZ2VfdXBkYXRlXCIpO1xuICAgICAgICAgICAgICAgIH1jYXRjaChFNil7fVxuXG4gICAgICAgICAgICAgICAgX3N0b3JhZ2Vfc2VydmljZS5qU3RvcmFnZSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgX2JhY2tlbmQgPSBcInVzZXJEYXRhQmVoYXZpb3JcIjtcbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIF9zdG9yYWdlX2VsbSA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gc3RvcmFnZVxuICAgICAgICBfbG9hZF9zdG9yYWdlKCk7XG5cbiAgICAgICAgLy8gcmVtb3ZlIGRlYWQga2V5c1xuICAgICAgICBfaGFuZGxlVFRMKCk7XG5cbiAgICAgICAgLy8gc3RhcnQgbGlzdGVuaW5nIGZvciBjaGFuZ2VzXG4gICAgICAgIF9zZXR1cE9ic2VydmVyKCk7XG5cbiAgICAgICAgLy8gaW5pdGlhbGl6ZSBwdWJsaXNoLXN1YnNjcmliZSBzZXJ2aWNlXG4gICAgICAgIF9oYW5kbGVQdWJTdWIoKTtcblxuICAgICAgICAvLyBoYW5kbGUgY2FjaGVkIG5hdmlnYXRpb25cbiAgICAgICAgaWYoXCJhZGRFdmVudExpc3RlbmVyXCIgaW4gd2luZG93KXtcbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicGFnZXNob3dcIiwgZnVuY3Rpb24oZXZlbnQpe1xuICAgICAgICAgICAgICAgIGlmKGV2ZW50LnBlcnNpc3RlZCl7XG4gICAgICAgICAgICAgICAgICAgIF9zdG9yYWdlT2JzZXJ2ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWxvYWQgZGF0YSBmcm9tIHN0b3JhZ2Ugd2hlbiBuZWVkZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcmVsb2FkRGF0YSgpe1xuICAgICAgICB2YXIgZGF0YSA9IFwie31cIjtcblxuICAgICAgICBpZihfYmFja2VuZCA9PSBcInVzZXJEYXRhQmVoYXZpb3JcIil7XG4gICAgICAgICAgICBfc3RvcmFnZV9lbG0ubG9hZChcImpTdG9yYWdlXCIpO1xuXG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgZGF0YSA9IF9zdG9yYWdlX2VsbS5nZXRBdHRyaWJ1dGUoXCJqU3RvcmFnZVwiKTtcbiAgICAgICAgICAgIH1jYXRjaChFNSl7fVxuXG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgX29ic2VydmVyX3VwZGF0ZSA9IF9zdG9yYWdlX2VsbS5nZXRBdHRyaWJ1dGUoXCJqU3RvcmFnZV91cGRhdGVcIik7XG4gICAgICAgICAgICB9Y2F0Y2goRTYpe31cblxuICAgICAgICAgICAgX3N0b3JhZ2Vfc2VydmljZS5qU3RvcmFnZSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICBfbG9hZF9zdG9yYWdlKCk7XG5cbiAgICAgICAgLy8gcmVtb3ZlIGRlYWQga2V5c1xuICAgICAgICBfaGFuZGxlVFRMKCk7XG5cbiAgICAgICAgX2hhbmRsZVB1YlN1YigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNldHMgdXAgYSBzdG9yYWdlIGNoYW5nZSBvYnNlcnZlclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9zZXR1cE9ic2VydmVyKCl7XG4gICAgICAgIGlmKF9iYWNrZW5kID09IFwibG9jYWxTdG9yYWdlXCIgfHwgX2JhY2tlbmQgPT0gXCJnbG9iYWxTdG9yYWdlXCIpe1xuICAgICAgICAgICAgaWYoXCJhZGRFdmVudExpc3RlbmVyXCIgaW4gd2luZG93KXtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInN0b3JhZ2VcIiwgX3N0b3JhZ2VPYnNlcnZlciwgZmFsc2UpO1xuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYXR0YWNoRXZlbnQoXCJvbnN0b3JhZ2VcIiwgX3N0b3JhZ2VPYnNlcnZlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1lbHNlIGlmKF9iYWNrZW5kID09IFwidXNlckRhdGFCZWhhdmlvclwiKXtcbiAgICAgICAgICAgIHNldEludGVydmFsKF9zdG9yYWdlT2JzZXJ2ZXIsIDEwMDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZWQgb24gYW55IGtpbmQgb2YgZGF0YSBjaGFuZ2UsIG5lZWRzIHRvIGNoZWNrIGlmIGFueXRoaW5nIGhhc1xuICAgICAqIHJlYWxseSBiZWVuIGNoYW5nZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfc3RvcmFnZU9ic2VydmVyKCl7XG4gICAgICAgIHZhciB1cGRhdGVUaW1lO1xuICAgICAgICAvLyBjdW11bGF0ZSBjaGFuZ2Ugbm90aWZpY2F0aW9ucyB3aXRoIHRpbWVvdXRcbiAgICAgICAgY2xlYXJUaW1lb3V0KF9vYnNlcnZlcl90aW1lb3V0KTtcbiAgICAgICAgX29ic2VydmVyX3RpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgICAgIGlmKF9iYWNrZW5kID09IFwibG9jYWxTdG9yYWdlXCIgfHwgX2JhY2tlbmQgPT0gXCJnbG9iYWxTdG9yYWdlXCIpe1xuICAgICAgICAgICAgICAgIHVwZGF0ZVRpbWUgPSBfc3RvcmFnZV9zZXJ2aWNlLmpTdG9yYWdlX3VwZGF0ZTtcbiAgICAgICAgICAgIH1lbHNlIGlmKF9iYWNrZW5kID09IFwidXNlckRhdGFCZWhhdmlvclwiKXtcbiAgICAgICAgICAgICAgICBfc3RvcmFnZV9lbG0ubG9hZChcImpTdG9yYWdlXCIpO1xuICAgICAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlVGltZSA9IF9zdG9yYWdlX2VsbS5nZXRBdHRyaWJ1dGUoXCJqU3RvcmFnZV91cGRhdGVcIik7XG4gICAgICAgICAgICAgICAgfWNhdGNoKEU1KXt9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHVwZGF0ZVRpbWUgJiYgdXBkYXRlVGltZSAhPSBfb2JzZXJ2ZXJfdXBkYXRlKXtcbiAgICAgICAgICAgICAgICBfb2JzZXJ2ZXJfdXBkYXRlID0gdXBkYXRlVGltZTtcbiAgICAgICAgICAgICAgICBfY2hlY2tVcGRhdGVkS2V5cygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sIDI1KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWxvYWRzIHRoZSBkYXRhIGFuZCBjaGVja3MgaWYgYW55IGtleXMgYXJlIGNoYW5nZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfY2hlY2tVcGRhdGVkS2V5cygpe1xuICAgICAgICB2YXIgb2xkQ3JjMzJMaXN0ID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuQ1JDMzIpKSxcbiAgICAgICAgICAgIG5ld0NyYzMyTGlzdDtcblxuICAgICAgICBfcmVsb2FkRGF0YSgpO1xuICAgICAgICBuZXdDcmMzMkxpc3QgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KF9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YS5DUkMzMikpO1xuXG4gICAgICAgIHZhciBrZXksXG4gICAgICAgICAgICB1cGRhdGVkID0gW10sXG4gICAgICAgICAgICByZW1vdmVkID0gW107XG5cbiAgICAgICAgZm9yKGtleSBpbiBvbGRDcmMzMkxpc3Qpe1xuICAgICAgICAgICAgaWYob2xkQ3JjMzJMaXN0Lmhhc093blByb3BlcnR5KGtleSkpe1xuICAgICAgICAgICAgICAgIGlmKCFuZXdDcmMzMkxpc3Rba2V5XSl7XG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZWQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYob2xkQ3JjMzJMaXN0W2tleV0gIT0gbmV3Q3JjMzJMaXN0W2tleV0gJiYgU3RyaW5nKG9sZENyYzMyTGlzdFtrZXldKS5zdWJzdHIoMCwyKSA9PSBcIjIuXCIpe1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3Ioa2V5IGluIG5ld0NyYzMyTGlzdCl7XG4gICAgICAgICAgICBpZihuZXdDcmMzMkxpc3QuaGFzT3duUHJvcGVydHkoa2V5KSl7XG4gICAgICAgICAgICAgICAgaWYoIW9sZENyYzMyTGlzdFtrZXldKXtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZC5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgX2ZpcmVPYnNlcnZlcnModXBkYXRlZCwgXCJ1cGRhdGVkXCIpO1xuICAgICAgICBfZmlyZU9ic2VydmVycyhyZW1vdmVkLCBcImRlbGV0ZWRcIik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZXMgb2JzZXJ2ZXJzIGZvciB1cGRhdGVkIGtleXNcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl8U3RyaW5nfSBrZXlzIEFycmF5IG9mIGtleSBuYW1lcyBvciBhIGtleVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhY3Rpb24gV2hhdCBoYXBwZW5lZCB3aXRoIHRoZSB2YWx1ZSAodXBkYXRlZCwgZGVsZXRlZCwgZmx1c2hlZClcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZmlyZU9ic2VydmVycyhrZXlzLCBhY3Rpb24pe1xuICAgICAgICBrZXlzID0gW10uY29uY2F0KGtleXMgfHwgW10pO1xuICAgICAgICBpZihhY3Rpb24gPT0gXCJmbHVzaGVkXCIpe1xuICAgICAgICAgICAga2V5cyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBrZXkgaW4gX29ic2VydmVycyl7XG4gICAgICAgICAgICAgICAgaWYoX29ic2VydmVycy5oYXNPd25Qcm9wZXJ0eShrZXkpKXtcbiAgICAgICAgICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYWN0aW9uID0gXCJkZWxldGVkXCI7XG4gICAgICAgIH1cbiAgICAgICAgZm9yKHZhciBpPTAsIGxlbiA9IGtleXMubGVuZ3RoOyBpPGxlbjsgaSsrKXtcbiAgICAgICAgICAgIGlmKF9vYnNlcnZlcnNba2V5c1tpXV0pe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaj0wLCBqbGVuID0gX29ic2VydmVyc1trZXlzW2ldXS5sZW5ndGg7IGo8amxlbjsgaisrKXtcbiAgICAgICAgICAgICAgICAgICAgX29ic2VydmVyc1trZXlzW2ldXVtqXShrZXlzW2ldLCBhY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKF9vYnNlcnZlcnNbXCIqXCJdKXtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGo9MCwgamxlbiA9IF9vYnNlcnZlcnNbXCIqXCJdLmxlbmd0aDsgajxqbGVuOyBqKyspe1xuICAgICAgICAgICAgICAgICAgICBfb2JzZXJ2ZXJzW1wiKlwiXVtqXShrZXlzW2ldLCBhY3Rpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFB1Ymxpc2hlcyBrZXkgY2hhbmdlIHRvIGxpc3RlbmVyc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9wdWJsaXNoQ2hhbmdlKCl7XG4gICAgICAgIHZhciB1cGRhdGVUaW1lID0gKCtuZXcgRGF0ZSgpKS50b1N0cmluZygpO1xuXG4gICAgICAgIGlmKF9iYWNrZW5kID09IFwibG9jYWxTdG9yYWdlXCIgfHwgX2JhY2tlbmQgPT0gXCJnbG9iYWxTdG9yYWdlXCIpe1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBfc3RvcmFnZV9zZXJ2aWNlLmpTdG9yYWdlX3VwZGF0ZSA9IHVwZGF0ZVRpbWU7XG4gICAgICAgICAgICB9IGNhdGNoIChFOCkge1xuICAgICAgICAgICAgICAgIC8vIHNhZmFyaSBwcml2YXRlIG1vZGUgaGFzIGJlZW4gZW5hYmxlZCBhZnRlciB0aGUgalN0b3JhZ2UgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICBfYmFja2VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ZWxzZSBpZihfYmFja2VuZCA9PSBcInVzZXJEYXRhQmVoYXZpb3JcIil7XG4gICAgICAgICAgICBfc3RvcmFnZV9lbG0uc2V0QXR0cmlidXRlKFwialN0b3JhZ2VfdXBkYXRlXCIsIHVwZGF0ZVRpbWUpO1xuICAgICAgICAgICAgX3N0b3JhZ2VfZWxtLnNhdmUoXCJqU3RvcmFnZVwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9zdG9yYWdlT2JzZXJ2ZXIoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBMb2FkcyB0aGUgZGF0YSBmcm9tIHRoZSBzdG9yYWdlIGJhc2VkIG9uIHRoZSBzdXBwb3J0ZWQgbWVjaGFuaXNtXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2xvYWRfc3RvcmFnZSgpe1xuICAgICAgICAvKiBpZiBqU3RvcmFnZSBzdHJpbmcgaXMgcmV0cmlldmVkLCB0aGVuIGRlY29kZSBpdCAqL1xuICAgICAgICBpZihfc3RvcmFnZV9zZXJ2aWNlLmpTdG9yYWdlKXtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgICBfc3RvcmFnZSA9IEpTT04ucGFyc2UoU3RyaW5nKF9zdG9yYWdlX3NlcnZpY2UualN0b3JhZ2UpKTtcbiAgICAgICAgICAgIH1jYXRjaChFNil7X3N0b3JhZ2Vfc2VydmljZS5qU3RvcmFnZSA9IFwie31cIjt9XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgX3N0b3JhZ2Vfc2VydmljZS5qU3RvcmFnZSA9IFwie31cIjtcbiAgICAgICAgfVxuICAgICAgICBfc3RvcmFnZV9zaXplID0gX3N0b3JhZ2Vfc2VydmljZS5qU3RvcmFnZT9TdHJpbmcoX3N0b3JhZ2Vfc2VydmljZS5qU3RvcmFnZSkubGVuZ3RoOjA7XG5cbiAgICAgICAgaWYoIV9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YSl7XG4gICAgICAgICAgICBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZighX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhLkNSQzMyKXtcbiAgICAgICAgICAgIF9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YS5DUkMzMiA9IHt9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVGhpcyBmdW5jdGlvbnMgcHJvdmlkZXMgdGhlIFwic2F2ZVwiIG1lY2hhbmlzbSB0byBzdG9yZSB0aGUgalN0b3JhZ2Ugb2JqZWN0XG4gICAgICovXG4gICAgZnVuY3Rpb24gX3NhdmUoKXtcbiAgICAgICAgX2Ryb3BPbGRFdmVudHMoKTsgLy8gcmVtb3ZlIGV4cGlyZWQgZXZlbnRzXG4gICAgICAgIHRyeXtcbiAgICAgICAgICAgIF9zdG9yYWdlX3NlcnZpY2UualN0b3JhZ2UgPSBKU09OLnN0cmluZ2lmeShfc3RvcmFnZSk7XG4gICAgICAgICAgICAvLyBJZiB1c2VyRGF0YSBpcyB1c2VkIGFzIHRoZSBzdG9yYWdlIGVuZ2luZSwgYWRkaXRpb25hbFxuICAgICAgICAgICAgaWYoX3N0b3JhZ2VfZWxtKSB7XG4gICAgICAgICAgICAgICAgX3N0b3JhZ2VfZWxtLnNldEF0dHJpYnV0ZShcImpTdG9yYWdlXCIsX3N0b3JhZ2Vfc2VydmljZS5qU3RvcmFnZSk7XG4gICAgICAgICAgICAgICAgX3N0b3JhZ2VfZWxtLnNhdmUoXCJqU3RvcmFnZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF9zdG9yYWdlX3NpemUgPSBfc3RvcmFnZV9zZXJ2aWNlLmpTdG9yYWdlP1N0cmluZyhfc3RvcmFnZV9zZXJ2aWNlLmpTdG9yYWdlKS5sZW5ndGg6MDtcbiAgICAgICAgfWNhdGNoKEU3KXsvKiBwcm9iYWJseSBjYWNoZSBpcyBmdWxsLCBub3RoaW5nIGlzIHNhdmVkIHRoaXMgd2F5Ki99XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gY2hlY2tzIGlmIGEga2V5IGlzIHNldCBhbmQgaXMgc3RyaW5nIG9yIG51bWJlcmljXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5IEtleSBuYW1lXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2NoZWNrS2V5KGtleSl7XG4gICAgICAgIGlmKHR5cGVvZiBrZXkgIT0gXCJzdHJpbmdcIiAmJiB0eXBlb2Yga2V5ICE9IFwibnVtYmVyXCIpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIktleSBuYW1lIG11c3QgYmUgc3RyaW5nIG9yIG51bWVyaWNcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYoa2V5ID09IFwiX19qc3RvcmFnZV9tZXRhXCIpe1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlJlc2VydmVkIGtleSBuYW1lXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgZXhwaXJlZCBrZXlzXG4gICAgICovXG4gICAgZnVuY3Rpb24gX2hhbmRsZVRUTCgpe1xuICAgICAgICB2YXIgY3VydGltZSwgaSwgVFRMLCBDUkMzMiwgbmV4dEV4cGlyZSA9IEluZmluaXR5LCBjaGFuZ2VkID0gZmFsc2UsIGRlbGV0ZWQgPSBbXTtcblxuICAgICAgICBjbGVhclRpbWVvdXQoX3R0bF90aW1lb3V0KTtcblxuICAgICAgICBpZighX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhIHx8IHR5cGVvZiBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuVFRMICE9IFwib2JqZWN0XCIpe1xuICAgICAgICAgICAgLy8gbm90aGluZyB0byBkbyBoZXJlXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjdXJ0aW1lID0gK25ldyBEYXRlKCk7XG4gICAgICAgIFRUTCA9IF9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YS5UVEw7XG5cbiAgICAgICAgQ1JDMzIgPSBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuQ1JDMzI7XG4gICAgICAgIGZvcihpIGluIFRUTCl7XG4gICAgICAgICAgICBpZihUVEwuaGFzT3duUHJvcGVydHkoaSkpe1xuICAgICAgICAgICAgICAgIGlmKFRUTFtpXSA8PSBjdXJ0aW1lKXtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIFRUTFtpXTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIENSQzMyW2ldO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgX3N0b3JhZ2VbaV07XG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVkLnB1c2goaSk7XG4gICAgICAgICAgICAgICAgfWVsc2UgaWYoVFRMW2ldIDwgbmV4dEV4cGlyZSl7XG4gICAgICAgICAgICAgICAgICAgIG5leHRFeHBpcmUgPSBUVExbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2V0IG5leHQgY2hlY2tcbiAgICAgICAgaWYobmV4dEV4cGlyZSAhPSBJbmZpbml0eSl7XG4gICAgICAgICAgICBfdHRsX3RpbWVvdXQgPSBzZXRUaW1lb3V0KE1hdGgubWluKF9oYW5kbGVUVEwsIG5leHRFeHBpcmUgLSBjdXJ0aW1lLCAweDdGRkZGRkZGKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzYXZlIGNoYW5nZXNcbiAgICAgICAgaWYoY2hhbmdlZCl7XG4gICAgICAgICAgICBfc2F2ZSgpO1xuICAgICAgICAgICAgX3B1Ymxpc2hDaGFuZ2UoKTtcbiAgICAgICAgICAgIF9maXJlT2JzZXJ2ZXJzKGRlbGV0ZWQsIFwiZGVsZXRlZFwiKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENoZWNrcyBpZiB0aGVyZSdzIGFueSBldmVudHMgb24gaG9sZCB0byBiZSBmaXJlZCB0byBsaXN0ZW5lcnNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfaGFuZGxlUHViU3ViKCl7XG4gICAgICAgIHZhciBpLCBsZW47XG4gICAgICAgIGlmKCFfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHViZWxtLFxuICAgICAgICAgICAgX3B1YnN1YkN1cnJlbnQgPSBfcHVic3ViX2xhc3Q7XG5cbiAgICAgICAgZm9yKGk9bGVuPV9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YS5QdWJTdWIubGVuZ3RoLTE7IGk+PTA7IGktLSl7XG4gICAgICAgICAgICBwdWJlbG0gPSBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViW2ldO1xuICAgICAgICAgICAgaWYocHViZWxtWzBdID4gX3B1YnN1Yl9sYXN0KXtcbiAgICAgICAgICAgICAgICBfcHVic3ViQ3VycmVudCA9IHB1YmVsbVswXTtcbiAgICAgICAgICAgICAgICBfZmlyZVN1YnNjcmliZXJzKHB1YmVsbVsxXSwgcHViZWxtWzJdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIF9wdWJzdWJfbGFzdCA9IF9wdWJzdWJDdXJyZW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZpcmVzIGFsbCBzdWJzY3JpYmVyIGxpc3RlbmVycyBmb3IgYSBwdWJzdWIgY2hhbm5lbFxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGNoYW5uZWwgQ2hhbm5lbCBuYW1lXG4gICAgICogQHBhcmFtIHtNaXhlZH0gcGF5bG9hZCBQYXlsb2FkIGRhdGEgdG8gZGVsaXZlclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIF9maXJlU3Vic2NyaWJlcnMoY2hhbm5lbCwgcGF5bG9hZCl7XG4gICAgICAgIGlmKF9wdWJzdWJfb2JzZXJ2ZXJzW2NoYW5uZWxdKXtcbiAgICAgICAgICAgIGZvcih2YXIgaT0wLCBsZW4gPSBfcHVic3ViX29ic2VydmVyc1tjaGFubmVsXS5sZW5ndGg7IGk8bGVuOyBpKyspe1xuICAgICAgICAgICAgICAgIC8vIHNlbmQgaW1tdXRhYmxlIGRhdGEgdGhhdCBjYW4ndCBiZSBtb2RpZmllZCBieSBsaXN0ZW5lcnNcbiAgICAgICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgICAgICAgIF9wdWJzdWJfb2JzZXJ2ZXJzW2NoYW5uZWxdW2ldKGNoYW5uZWwsIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkpKTtcbiAgICAgICAgICAgICAgICB9Y2F0Y2goRSl7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBvbGQgZXZlbnRzIGZyb20gdGhlIHB1Ymxpc2ggc3RyZWFtIChhdCBsZWFzdCAyc2VjIG9sZClcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfZHJvcE9sZEV2ZW50cygpe1xuICAgICAgICBpZighX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhLlB1YlN1Yil7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmV0aXJlID0gK25ldyBEYXRlKCkgLSAyMDAwO1xuXG4gICAgICAgIGZvcih2YXIgaT0wLCBsZW4gPSBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViLmxlbmd0aDsgaTxsZW47IGkrKyl7XG4gICAgICAgICAgICBpZihfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViW2ldWzBdIDw9IHJldGlyZSl7XG4gICAgICAgICAgICAgICAgLy8gZGVsZXRlQ291bnQgaXMgbmVlZGVkIGZvciBJRTZcbiAgICAgICAgICAgICAgICBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViLnNwbGljZShpLCBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViLmxlbmd0aCAtIGkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYoIV9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YS5QdWJTdWIubGVuZ3RoKXtcbiAgICAgICAgICAgIGRlbGV0ZSBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQdWJsaXNoIHBheWxvYWQgdG8gYSBjaGFubmVsXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gY2hhbm5lbCBDaGFubmVsIG5hbWVcbiAgICAgKiBAcGFyYW0ge01peGVkfSBwYXlsb2FkIFBheWxvYWQgdG8gc2VuZCB0byB0aGUgc3Vic2NyaWJlcnNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBfcHVibGlzaChjaGFubmVsLCBwYXlsb2FkKXtcbiAgICAgICAgaWYoIV9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YSl7XG4gICAgICAgICAgICBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBpZighX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhLlB1YlN1Yil7XG4gICAgICAgICAgICBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuUHViU3ViLnVuc2hpZnQoWytuZXcgRGF0ZSwgY2hhbm5lbCwgcGF5bG9hZF0pO1xuXG4gICAgICAgIF9zYXZlKCk7XG4gICAgICAgIF9wdWJsaXNoQ2hhbmdlKCk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBKUyBJbXBsZW1lbnRhdGlvbiBvZiBNdXJtdXJIYXNoMlxuICAgICAqXG4gICAgICogIFNPVVJDRTogaHR0cHM6Ly9naXRodWIuY29tL2dhcnljb3VydC9tdXJtdXJoYXNoLWpzIChNSVQgbGljZW5zZWQpXG4gICAgICpcbiAgICAgKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86Z2FyeS5jb3VydEBnbWFpbC5jb21cIj5HYXJ5IENvdXJ0PC9hPlxuICAgICAqIEBzZWUgaHR0cDovL2dpdGh1Yi5jb20vZ2FyeWNvdXJ0L211cm11cmhhc2gtanNcbiAgICAgKiBAYXV0aG9yIDxhIGhyZWY9XCJtYWlsdG86YWFwcGxlYnlAZ21haWwuY29tXCI+QXVzdGluIEFwcGxlYnk8L2E+XG4gICAgICogQHNlZSBodHRwOi8vc2l0ZXMuZ29vZ2xlLmNvbS9zaXRlL211cm11cmhhc2gvXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyIEFTQ0lJIG9ubHlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2VlZCBQb3NpdGl2ZSBpbnRlZ2VyIG9ubHlcbiAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IDMyLWJpdCBwb3NpdGl2ZSBpbnRlZ2VyIGhhc2hcbiAgICAgKi9cblxuICAgIGZ1bmN0aW9uIG11cm11cmhhc2gyXzMyX2djKHN0ciwgc2VlZCkge1xuICAgICAgICB2YXJcbiAgICAgICAgICAgIGwgPSBzdHIubGVuZ3RoLFxuICAgICAgICAgICAgaCA9IHNlZWQgXiBsLFxuICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICBrO1xuXG4gICAgICAgIHdoaWxlIChsID49IDQpIHtcbiAgICAgICAgICAgIGsgPVxuICAgICAgICAgICAgICAgICgoc3RyLmNoYXJDb2RlQXQoaSkgJiAweGZmKSkgfFxuICAgICAgICAgICAgICAgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDgpIHxcbiAgICAgICAgICAgICAgICAoKHN0ci5jaGFyQ29kZUF0KCsraSkgJiAweGZmKSA8PCAxNikgfFxuICAgICAgICAgICAgICAgICgoc3RyLmNoYXJDb2RlQXQoKytpKSAmIDB4ZmYpIDw8IDI0KTtcblxuICAgICAgICAgICAgayA9ICgoKGsgJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoayA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG4gICAgICAgICAgICBrIF49IGsgPj4+IDI0O1xuICAgICAgICAgICAgayA9ICgoKGsgJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoayA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG5cbiAgICAgICAgICAgIGggPSAoKChoICYgMHhmZmZmKSAqIDB4NWJkMWU5OTUpICsgKCgoKGggPj4+IDE2KSAqIDB4NWJkMWU5OTUpICYgMHhmZmZmKSA8PCAxNikpIF4gaztcblxuICAgICAgICAgICAgbCAtPSA0O1xuICAgICAgICAgICAgKytpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChsKSB7XG4gICAgICAgICAgICBjYXNlIDM6IGggXj0gKHN0ci5jaGFyQ29kZUF0KGkgKyAyKSAmIDB4ZmYpIDw8IDE2O1xuICAgICAgICAgICAgY2FzZSAyOiBoIF49IChzdHIuY2hhckNvZGVBdChpICsgMSkgJiAweGZmKSA8PCA4O1xuICAgICAgICAgICAgY2FzZSAxOiBoIF49IChzdHIuY2hhckNvZGVBdChpKSAmIDB4ZmYpO1xuICAgICAgICAgICAgICAgIGggPSAoKChoICYgMHhmZmZmKSAqIDB4NWJkMWU5OTUpICsgKCgoKGggPj4+IDE2KSAqIDB4NWJkMWU5OTUpICYgMHhmZmZmKSA8PCAxNikpO1xuICAgICAgICB9XG5cbiAgICAgICAgaCBePSBoID4+PiAxMztcbiAgICAgICAgaCA9ICgoKGggJiAweGZmZmYpICogMHg1YmQxZTk5NSkgKyAoKCgoaCA+Pj4gMTYpICogMHg1YmQxZTk5NSkgJiAweGZmZmYpIDw8IDE2KSk7XG4gICAgICAgIGggXj0gaCA+Pj4gMTU7XG5cbiAgICAgICAgcmV0dXJuIGggPj4+IDA7XG4gICAgfVxuXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8gUFVCTElDIElOVEVSRkFDRSAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbiAgICAkLmpTdG9yYWdlID0ge1xuICAgICAgICAvKiBWZXJzaW9uIG51bWJlciAqL1xuICAgICAgICB2ZXJzaW9uOiBKU1RPUkFHRV9WRVJTSU9OLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIGEga2V5J3MgdmFsdWUuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgS2V5IHRvIHNldC4gSWYgdGhpcyB2YWx1ZSBpcyBub3Qgc2V0IG9yIG5vdFxuICAgICAgICAgKiAgICAgICAgICAgICAgYSBzdHJpbmcgYW4gZXhjZXB0aW9uIGlzIHJhaXNlZC5cbiAgICAgICAgICogQHBhcmFtIHtNaXhlZH0gdmFsdWUgVmFsdWUgdG8gc2V0LiBUaGlzIGNhbiBiZSBhbnkgdmFsdWUgdGhhdCBpcyBKU09OXG4gICAgICAgICAqICAgICAgICAgICAgICBjb21wYXRpYmxlIChOdW1iZXJzLCBTdHJpbmdzLCBPYmplY3RzIGV0Yy4pLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIC0gcG9zc2libGUgb3B0aW9ucyB0byB1c2VcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLlRUTF0gLSBvcHRpb25hbCBUVEwgdmFsdWUsIGluIG1pbGxpc2Vjb25kc1xuICAgICAgICAgKiBAcmV0dXJuIHtNaXhlZH0gdGhlIHVzZWQgdmFsdWVcbiAgICAgICAgICovXG4gICAgICAgIHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucyl7XG4gICAgICAgICAgICBfY2hlY2tLZXkoa2V5KTtcblxuICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgICAgICAgIC8vIHVuZGVmaW5lZCB2YWx1ZXMgYXJlIGRlbGV0ZWQgYXV0b21hdGljYWxseVxuICAgICAgICAgICAgaWYodHlwZW9mIHZhbHVlID09IFwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlS2V5KGtleSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihfWE1MU2VydmljZS5pc1hNTCh2YWx1ZSkpe1xuICAgICAgICAgICAgICAgIHZhbHVlID0ge19pc194bWw6dHJ1ZSx4bWw6X1hNTFNlcnZpY2UuZW5jb2RlKHZhbHVlKX07XG4gICAgICAgICAgICB9ZWxzZSBpZih0eXBlb2YgdmFsdWUgPT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyBmdW5jdGlvbnMgY2FuJ3QgYmUgc2F2ZWQhXG4gICAgICAgICAgICB9ZWxzZSBpZih2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIil7XG4gICAgICAgICAgICAgICAgLy8gY2xvbmUgdGhlIG9iamVjdCBiZWZvcmUgc2F2aW5nIHRvIF9zdG9yYWdlIHRyZWVcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX3N0b3JhZ2Vba2V5XSA9IHZhbHVlO1xuXG4gICAgICAgICAgICBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuQ1JDMzJba2V5XSA9IFwiMi5cIiArIG11cm11cmhhc2gyXzMyX2djKEpTT04uc3RyaW5naWZ5KHZhbHVlKSwgMHg5NzQ3YjI4Yyk7XG5cbiAgICAgICAgICAgIHRoaXMuc2V0VFRMKGtleSwgb3B0aW9ucy5UVEwgfHwgMCk7IC8vIGFsc28gaGFuZGxlcyBzYXZpbmcgYW5kIF9wdWJsaXNoQ2hhbmdlXG5cbiAgICAgICAgICAgIF9maXJlT2JzZXJ2ZXJzKGtleSwgXCJ1cGRhdGVkXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMb29rcyB1cCBhIGtleSBpbiBjYWNoZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5IC0gS2V5IHRvIGxvb2sgdXAuXG4gICAgICAgICAqIEBwYXJhbSB7bWl4ZWR9IGRlZiAtIERlZmF1bHQgdmFsdWUgdG8gcmV0dXJuLCBpZiBrZXkgZGlkbid0IGV4aXN0LlxuICAgICAgICAgKiBAcmV0dXJuIHtNaXhlZH0gdGhlIGtleSB2YWx1ZSwgZGVmYXVsdCB2YWx1ZSBvciBudWxsXG4gICAgICAgICAqL1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKGtleSwgZGVmKXtcbiAgICAgICAgICAgIF9jaGVja0tleShrZXkpO1xuICAgICAgICAgICAgaWYoa2V5IGluIF9zdG9yYWdlKXtcbiAgICAgICAgICAgICAgICBpZihfc3RvcmFnZVtrZXldICYmIHR5cGVvZiBfc3RvcmFnZVtrZXldID09IFwib2JqZWN0XCIgJiYgX3N0b3JhZ2Vba2V5XS5faXNfeG1sKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfWE1MU2VydmljZS5kZWNvZGUoX3N0b3JhZ2Vba2V5XS54bWwpO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX3N0b3JhZ2Vba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mKGRlZikgPT0gXCJ1bmRlZmluZWRcIiA/IG51bGwgOiBkZWY7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbGV0ZXMgYSBrZXkgZnJvbSBjYWNoZS5cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGtleSAtIEtleSB0byBkZWxldGUuXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IHRydWUgaWYga2V5IGV4aXN0ZWQgb3IgZmFsc2UgaWYgaXQgZGlkbid0XG4gICAgICAgICAqL1xuICAgICAgICBkZWxldGVLZXk6IGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICBfY2hlY2tLZXkoa2V5KTtcbiAgICAgICAgICAgIGlmKGtleSBpbiBfc3RvcmFnZSl7XG4gICAgICAgICAgICAgICAgZGVsZXRlIF9zdG9yYWdlW2tleV07XG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGZyb20gVFRMIGxpc3RcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhLlRUTCA9PSBcIm9iamVjdFwiICYmXG4gICAgICAgICAgICAgICAgICBrZXkgaW4gX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhLlRUTCl7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuVFRMW2tleV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZGVsZXRlIF9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YS5DUkMzMltrZXldO1xuXG4gICAgICAgICAgICAgICAgX3NhdmUoKTtcbiAgICAgICAgICAgICAgICBfcHVibGlzaENoYW5nZSgpO1xuICAgICAgICAgICAgICAgIF9maXJlT2JzZXJ2ZXJzKGtleSwgXCJkZWxldGVkXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTZXRzIGEgVFRMIGZvciBhIGtleSwgb3IgcmVtb3ZlIGl0IGlmIHR0bCB2YWx1ZSBpcyAwIG9yIGJlbG93XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgLSBrZXkgdG8gc2V0IHRoZSBUVEwgZm9yXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSB0dGwgLSBUVEwgdGltZW91dCBpbiBtaWxsaXNlY29uZHNcbiAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gdHJ1ZSBpZiBrZXkgZXhpc3RlZCBvciBmYWxzZSBpZiBpdCBkaWRuJ3RcbiAgICAgICAgICovXG4gICAgICAgIHNldFRUTDogZnVuY3Rpb24oa2V5LCB0dGwpe1xuICAgICAgICAgICAgdmFyIGN1cnRpbWUgPSArbmV3IERhdGUoKTtcbiAgICAgICAgICAgIF9jaGVja0tleShrZXkpO1xuICAgICAgICAgICAgdHRsID0gTnVtYmVyKHR0bCkgfHwgMDtcbiAgICAgICAgICAgIGlmKGtleSBpbiBfc3RvcmFnZSl7XG5cbiAgICAgICAgICAgICAgICBpZighX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhLlRUTCl7XG4gICAgICAgICAgICAgICAgICAgIF9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YS5UVEwgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgVFRMIHZhbHVlIGZvciB0aGUga2V5XG4gICAgICAgICAgICAgICAgaWYodHRsPjApe1xuICAgICAgICAgICAgICAgICAgICBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuVFRMW2tleV0gPSBjdXJ0aW1lICsgdHRsO1xuICAgICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhLlRUTFtrZXldO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIF9zYXZlKCk7XG5cbiAgICAgICAgICAgICAgICBfaGFuZGxlVFRMKCk7XG5cbiAgICAgICAgICAgICAgICBfcHVibGlzaENoYW5nZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXRzIHJlbWFpbmluZyBUVEwgKGluIG1pbGxpc2Vjb25kcykgZm9yIGEga2V5IG9yIDAgd2hlbiBubyBUVEwgaGFzIGJlZW4gc2V0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgS2V5IHRvIGNoZWNrXG4gICAgICAgICAqIEByZXR1cm4ge051bWJlcn0gUmVtYWluaW5nIFRUTCBpbiBtaWxsaXNlY29uZHNcbiAgICAgICAgICovXG4gICAgICAgIGdldFRUTDogZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgIHZhciBjdXJ0aW1lID0gK25ldyBEYXRlKCksIHR0bDtcbiAgICAgICAgICAgIF9jaGVja0tleShrZXkpO1xuICAgICAgICAgICAgaWYoa2V5IGluIF9zdG9yYWdlICYmIF9zdG9yYWdlLl9fanN0b3JhZ2VfbWV0YS5UVEwgJiYgX3N0b3JhZ2UuX19qc3RvcmFnZV9tZXRhLlRUTFtrZXldKXtcbiAgICAgICAgICAgICAgICB0dGwgPSBfc3RvcmFnZS5fX2pzdG9yYWdlX21ldGEuVFRMW2tleV0gLSBjdXJ0aW1lO1xuICAgICAgICAgICAgICAgIHJldHVybiB0dGwgfHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWxldGVzIGV2ZXJ5dGhpbmcgaW4gY2FjaGUuXG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IEFsd2F5cyB0cnVlXG4gICAgICAgICAqL1xuICAgICAgICBmbHVzaDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIF9zdG9yYWdlID0ge19fanN0b3JhZ2VfbWV0YTp7Q1JDMzI6e319fTtcbiAgICAgICAgICAgIF9zYXZlKCk7XG4gICAgICAgICAgICBfcHVibGlzaENoYW5nZSgpO1xuICAgICAgICAgICAgX2ZpcmVPYnNlcnZlcnMobnVsbCwgXCJmbHVzaGVkXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJldHVybnMgYSByZWFkLW9ubHkgY29weSBvZiBfc3RvcmFnZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFJlYWQtb25seSBjb3B5IG9mIF9zdG9yYWdlXG4gICAgICAgICovXG4gICAgICAgIHN0b3JhZ2VPYmo6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBmdW5jdGlvbiBGKCkge31cbiAgICAgICAgICAgIEYucHJvdG90eXBlID0gX3N0b3JhZ2U7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEYoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmV0dXJucyBhbiBpbmRleCBvZiBhbGwgdXNlZCBrZXlzIGFzIGFuIGFycmF5XG4gICAgICAgICAqIFtcImtleTFcIiwgXCJrZXkyXCIsLi5cImtleU5cIl1cbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7QXJyYXl9IFVzZWQga2V5c1xuICAgICAgICAqL1xuICAgICAgICBpbmRleDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IFtdLCBpO1xuICAgICAgICAgICAgZm9yKGkgaW4gX3N0b3JhZ2Upe1xuICAgICAgICAgICAgICAgIGlmKF9zdG9yYWdlLmhhc093blByb3BlcnR5KGkpICYmIGkgIT0gXCJfX2pzdG9yYWdlX21ldGFcIil7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4LnB1c2goaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIb3cgbXVjaCBzcGFjZSBpbiBieXRlcyBkb2VzIHRoZSBzdG9yYWdlIHRha2U/XG4gICAgICAgICAqXG4gICAgICAgICAqIEByZXR1cm4ge051bWJlcn0gU3RvcmFnZSBzaXplIGluIGNoYXJzIChub3QgdGhlIHNhbWUgYXMgaW4gYnl0ZXMsXG4gICAgICAgICAqICAgICAgICAgICAgICAgICAgc2luY2Ugc29tZSBjaGFycyBtYXkgdGFrZSBzZXZlcmFsIGJ5dGVzKVxuICAgICAgICAgKi9cbiAgICAgICAgc3RvcmFnZVNpemU6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gX3N0b3JhZ2Vfc2l6ZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2hpY2ggYmFja2VuZCBpcyBjdXJyZW50bHkgaW4gdXNlP1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcmV0dXJuIHtTdHJpbmd9IEJhY2tlbmQgbmFtZVxuICAgICAgICAgKi9cbiAgICAgICAgY3VycmVudEJhY2tlbmQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXR1cm4gX2JhY2tlbmQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRlc3QgaWYgc3RvcmFnZSBpcyBhdmFpbGFibGVcbiAgICAgICAgICpcbiAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gVHJ1ZSBpZiBzdG9yYWdlIGNhbiBiZSB1c2VkXG4gICAgICAgICAqL1xuICAgICAgICBzdG9yYWdlQXZhaWxhYmxlOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgcmV0dXJuICEhX2JhY2tlbmQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlZ2lzdGVyIGNoYW5nZSBsaXN0ZW5lcnNcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGtleSBLZXkgbmFtZVxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB0byBydW4gd2hlbiB0aGUga2V5IGNoYW5nZXNcbiAgICAgICAgICovXG4gICAgICAgIGxpc3RlbktleUNoYW5nZTogZnVuY3Rpb24oa2V5LCBjYWxsYmFjayl7XG4gICAgICAgICAgICBfY2hlY2tLZXkoa2V5KTtcbiAgICAgICAgICAgIGlmKCFfb2JzZXJ2ZXJzW2tleV0pe1xuICAgICAgICAgICAgICAgIF9vYnNlcnZlcnNba2V5XSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX29ic2VydmVyc1trZXldLnB1c2goY2FsbGJhY2spO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgY2hhbmdlIGxpc3RlbmVyc1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30ga2V5IEtleSBuYW1lIHRvIHVucmVnaXN0ZXIgbGlzdGVuZXJzIGFnYWluc3RcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBJZiBzZXQsIHVucmVnaXN0ZXIgdGhlIGNhbGxiYWNrLCBpZiBub3QgLSB1bnJlZ2lzdGVyIGFsbFxuICAgICAgICAgKi9cbiAgICAgICAgc3RvcExpc3RlbmluZzogZnVuY3Rpb24oa2V5LCBjYWxsYmFjayl7XG4gICAgICAgICAgICBfY2hlY2tLZXkoa2V5KTtcblxuICAgICAgICAgICAgaWYoIV9vYnNlcnZlcnNba2V5XSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZighY2FsbGJhY2spe1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBfb2JzZXJ2ZXJzW2tleV07XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmb3IodmFyIGkgPSBfb2JzZXJ2ZXJzW2tleV0ubGVuZ3RoIC0gMTsgaT49MDsgaS0tKXtcbiAgICAgICAgICAgICAgICBpZihfb2JzZXJ2ZXJzW2tleV1baV0gPT0gY2FsbGJhY2spe1xuICAgICAgICAgICAgICAgICAgICBfb2JzZXJ2ZXJzW2tleV0uc3BsaWNlKGksMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdWJzY3JpYmUgdG8gYSBQdWJsaXNoL1N1YnNjcmliZSBldmVudCBzdHJlYW1cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGNoYW5uZWwgQ2hhbm5lbCBuYW1lXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIHJ1biB3aGVuIHRoZSBzb21ldGhpbmcgaXMgcHVibGlzaGVkIHRvIHRoZSBjaGFubmVsXG4gICAgICAgICAqL1xuICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uKGNoYW5uZWwsIGNhbGxiYWNrKXtcbiAgICAgICAgICAgIGNoYW5uZWwgPSAoY2hhbm5lbCB8fCBcIlwiKS50b1N0cmluZygpO1xuICAgICAgICAgICAgaWYoIWNoYW5uZWwpe1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDaGFubmVsIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoIV9wdWJzdWJfb2JzZXJ2ZXJzW2NoYW5uZWxdKXtcbiAgICAgICAgICAgICAgICBfcHVic3ViX29ic2VydmVyc1tjaGFubmVsXSA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgX3B1YnN1Yl9vYnNlcnZlcnNbY2hhbm5lbF0ucHVzaChjYWxsYmFjayk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFB1Ymxpc2ggZGF0YSB0byBhbiBldmVudCBzdHJlYW1cbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGNoYW5uZWwgQ2hhbm5lbCBuYW1lXG4gICAgICAgICAqIEBwYXJhbSB7TWl4ZWR9IHBheWxvYWQgUGF5bG9hZCB0byBkZWxpdmVyXG4gICAgICAgICAqL1xuICAgICAgICBwdWJsaXNoOiBmdW5jdGlvbihjaGFubmVsLCBwYXlsb2FkKXtcbiAgICAgICAgICAgIGNoYW5uZWwgPSAoY2hhbm5lbCB8fCBcIlwiKS50b1N0cmluZygpO1xuICAgICAgICAgICAgaWYoIWNoYW5uZWwpe1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDaGFubmVsIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfcHVibGlzaChjaGFubmVsLCBwYXlsb2FkKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVsb2FkcyB0aGUgZGF0YSBmcm9tIGJyb3dzZXIgc3RvcmFnZVxuICAgICAgICAgKi9cbiAgICAgICAgcmVJbml0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3JlbG9hZERhdGEoKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlcyByZWZlcmVuY2UgZnJvbSBnbG9iYWwgb2JqZWN0cyBhbmQgc2F2ZXMgaXQgYXMgalN0b3JhZ2VcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb24gaWYgbmVlZGVkIHRvIHNhdmUgb2JqZWN0IGFzIHNpbXBsZSBcImpTdG9yYWdlXCIgaW4gd2luZG93cyBjb250ZXh0XG4gICAgICAgICAqL1xuICAgICAgICAgbm9Db25mbGljdDogZnVuY3Rpb24oIHNhdmVJbkdsb2JhbCApIHtcbiAgICAgICAgICAgIGRlbGV0ZSB3aW5kb3cuJC5qU3RvcmFnZVxuXG4gICAgICAgICAgICBpZiAoIHNhdmVJbkdsb2JhbCApIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cualN0b3JhZ2UgPSB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgIH1cbiAgICB9O1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBqU3RvcmFnZVxuICAgIF9pbml0KCk7XG5cbn0pKCk7XG4iLCIvKlxuQ3J5cHRvSlMgdjMuMS4yXG5jb2RlLmdvb2dsZS5jb20vcC9jcnlwdG8tanNcbihjKSAyMDA5LTIwMTMgYnkgSmVmZiBNb3R0LiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuY29kZS5nb29nbGUuY29tL3AvY3J5cHRvLWpzL3dpa2kvTGljZW5zZVxuKi9cbnZhciBDcnlwdG9KUz1DcnlwdG9KU3x8ZnVuY3Rpb24oaCxzKXt2YXIgZj17fSx0PWYubGliPXt9LGc9ZnVuY3Rpb24oKXt9LGo9dC5CYXNlPXtleHRlbmQ6ZnVuY3Rpb24oYSl7Zy5wcm90b3R5cGU9dGhpczt2YXIgYz1uZXcgZzthJiZjLm1peEluKGEpO2MuaGFzT3duUHJvcGVydHkoXCJpbml0XCIpfHwoYy5pbml0PWZ1bmN0aW9uKCl7Yy4kc3VwZXIuaW5pdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9KTtjLmluaXQucHJvdG90eXBlPWM7Yy4kc3VwZXI9dGhpcztyZXR1cm4gY30sY3JlYXRlOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5leHRlbmQoKTthLmluaXQuYXBwbHkoYSxhcmd1bWVudHMpO3JldHVybiBhfSxpbml0OmZ1bmN0aW9uKCl7fSxtaXhJbjpmdW5jdGlvbihhKXtmb3IodmFyIGMgaW4gYSlhLmhhc093blByb3BlcnR5KGMpJiYodGhpc1tjXT1hW2NdKTthLmhhc093blByb3BlcnR5KFwidG9TdHJpbmdcIikmJih0aGlzLnRvU3RyaW5nPWEudG9TdHJpbmcpfSxjbG9uZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLmluaXQucHJvdG90eXBlLmV4dGVuZCh0aGlzKX19LFxucT10LldvcmRBcnJheT1qLmV4dGVuZCh7aW5pdDpmdW5jdGlvbihhLGMpe2E9dGhpcy53b3Jkcz1hfHxbXTt0aGlzLnNpZ0J5dGVzPWMhPXM/Yzo0KmEubGVuZ3RofSx0b1N0cmluZzpmdW5jdGlvbihhKXtyZXR1cm4oYXx8dSkuc3RyaW5naWZ5KHRoaXMpfSxjb25jYXQ6ZnVuY3Rpb24oYSl7dmFyIGM9dGhpcy53b3JkcyxkPWEud29yZHMsYj10aGlzLnNpZ0J5dGVzO2E9YS5zaWdCeXRlczt0aGlzLmNsYW1wKCk7aWYoYiU0KWZvcih2YXIgZT0wO2U8YTtlKyspY1tiK2U+Pj4yXXw9KGRbZT4+PjJdPj4+MjQtOCooZSU0KSYyNTUpPDwyNC04KigoYitlKSU0KTtlbHNlIGlmKDY1NTM1PGQubGVuZ3RoKWZvcihlPTA7ZTxhO2UrPTQpY1tiK2U+Pj4yXT1kW2U+Pj4yXTtlbHNlIGMucHVzaC5hcHBseShjLGQpO3RoaXMuc2lnQnl0ZXMrPWE7cmV0dXJuIHRoaXN9LGNsYW1wOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy53b3JkcyxjPXRoaXMuc2lnQnl0ZXM7YVtjPj4+Ml0mPTQyOTQ5NjcyOTU8PFxuMzItOCooYyU0KTthLmxlbmd0aD1oLmNlaWwoYy80KX0sY2xvbmU6ZnVuY3Rpb24oKXt2YXIgYT1qLmNsb25lLmNhbGwodGhpcyk7YS53b3Jkcz10aGlzLndvcmRzLnNsaWNlKDApO3JldHVybiBhfSxyYW5kb206ZnVuY3Rpb24oYSl7Zm9yKHZhciBjPVtdLGQ9MDtkPGE7ZCs9NCljLnB1c2goNDI5NDk2NzI5NipoLnJhbmRvbSgpfDApO3JldHVybiBuZXcgcS5pbml0KGMsYSl9fSksdj1mLmVuYz17fSx1PXYuSGV4PXtzdHJpbmdpZnk6ZnVuY3Rpb24oYSl7dmFyIGM9YS53b3JkczthPWEuc2lnQnl0ZXM7Zm9yKHZhciBkPVtdLGI9MDtiPGE7YisrKXt2YXIgZT1jW2I+Pj4yXT4+PjI0LTgqKGIlNCkmMjU1O2QucHVzaCgoZT4+PjQpLnRvU3RyaW5nKDE2KSk7ZC5wdXNoKChlJjE1KS50b1N0cmluZygxNikpfXJldHVybiBkLmpvaW4oXCJcIil9LHBhcnNlOmZ1bmN0aW9uKGEpe2Zvcih2YXIgYz1hLmxlbmd0aCxkPVtdLGI9MDtiPGM7Yis9MilkW2I+Pj4zXXw9cGFyc2VJbnQoYS5zdWJzdHIoYixcbjIpLDE2KTw8MjQtNCooYiU4KTtyZXR1cm4gbmV3IHEuaW5pdChkLGMvMil9fSxrPXYuTGF0aW4xPXtzdHJpbmdpZnk6ZnVuY3Rpb24oYSl7dmFyIGM9YS53b3JkczthPWEuc2lnQnl0ZXM7Zm9yKHZhciBkPVtdLGI9MDtiPGE7YisrKWQucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKGNbYj4+PjJdPj4+MjQtOCooYiU0KSYyNTUpKTtyZXR1cm4gZC5qb2luKFwiXCIpfSxwYXJzZTpmdW5jdGlvbihhKXtmb3IodmFyIGM9YS5sZW5ndGgsZD1bXSxiPTA7YjxjO2IrKylkW2I+Pj4yXXw9KGEuY2hhckNvZGVBdChiKSYyNTUpPDwyNC04KihiJTQpO3JldHVybiBuZXcgcS5pbml0KGQsYyl9fSxsPXYuVXRmOD17c3RyaW5naWZ5OmZ1bmN0aW9uKGEpe3RyeXtyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShrLnN0cmluZ2lmeShhKSkpfWNhdGNoKGMpe3Rocm93IEVycm9yKFwiTWFsZm9ybWVkIFVURi04IGRhdGFcIik7fX0scGFyc2U6ZnVuY3Rpb24oYSl7cmV0dXJuIGsucGFyc2UodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KGEpKSl9fSxcbng9dC5CdWZmZXJlZEJsb2NrQWxnb3JpdGhtPWouZXh0ZW5kKHtyZXNldDpmdW5jdGlvbigpe3RoaXMuX2RhdGE9bmV3IHEuaW5pdDt0aGlzLl9uRGF0YUJ5dGVzPTB9LF9hcHBlbmQ6ZnVuY3Rpb24oYSl7XCJzdHJpbmdcIj09dHlwZW9mIGEmJihhPWwucGFyc2UoYSkpO3RoaXMuX2RhdGEuY29uY2F0KGEpO3RoaXMuX25EYXRhQnl0ZXMrPWEuc2lnQnl0ZXN9LF9wcm9jZXNzOmZ1bmN0aW9uKGEpe3ZhciBjPXRoaXMuX2RhdGEsZD1jLndvcmRzLGI9Yy5zaWdCeXRlcyxlPXRoaXMuYmxvY2tTaXplLGY9Yi8oNCplKSxmPWE/aC5jZWlsKGYpOmgubWF4KChmfDApLXRoaXMuX21pbkJ1ZmZlclNpemUsMCk7YT1mKmU7Yj1oLm1pbig0KmEsYik7aWYoYSl7Zm9yKHZhciBtPTA7bTxhO20rPWUpdGhpcy5fZG9Qcm9jZXNzQmxvY2soZCxtKTttPWQuc3BsaWNlKDAsYSk7Yy5zaWdCeXRlcy09Yn1yZXR1cm4gbmV3IHEuaW5pdChtLGIpfSxjbG9uZTpmdW5jdGlvbigpe3ZhciBhPWouY2xvbmUuY2FsbCh0aGlzKTtcbmEuX2RhdGE9dGhpcy5fZGF0YS5jbG9uZSgpO3JldHVybiBhfSxfbWluQnVmZmVyU2l6ZTowfSk7dC5IYXNoZXI9eC5leHRlbmQoe2NmZzpqLmV4dGVuZCgpLGluaXQ6ZnVuY3Rpb24oYSl7dGhpcy5jZmc9dGhpcy5jZmcuZXh0ZW5kKGEpO3RoaXMucmVzZXQoKX0scmVzZXQ6ZnVuY3Rpb24oKXt4LnJlc2V0LmNhbGwodGhpcyk7dGhpcy5fZG9SZXNldCgpfSx1cGRhdGU6ZnVuY3Rpb24oYSl7dGhpcy5fYXBwZW5kKGEpO3RoaXMuX3Byb2Nlc3MoKTtyZXR1cm4gdGhpc30sZmluYWxpemU6ZnVuY3Rpb24oYSl7YSYmdGhpcy5fYXBwZW5kKGEpO3JldHVybiB0aGlzLl9kb0ZpbmFsaXplKCl9LGJsb2NrU2l6ZToxNixfY3JlYXRlSGVscGVyOmZ1bmN0aW9uKGEpe3JldHVybiBmdW5jdGlvbihjLGQpe3JldHVybihuZXcgYS5pbml0KGQpKS5maW5hbGl6ZShjKX19LF9jcmVhdGVIbWFjSGVscGVyOmZ1bmN0aW9uKGEpe3JldHVybiBmdW5jdGlvbihjLGQpe3JldHVybihuZXcgdy5ITUFDLmluaXQoYSxcbmQpKS5maW5hbGl6ZShjKX19fSk7dmFyIHc9Zi5hbGdvPXt9O3JldHVybiBmfShNYXRoKTtcbihmdW5jdGlvbihoKXtmb3IodmFyIHM9Q3J5cHRvSlMsZj1zLmxpYix0PWYuV29yZEFycmF5LGc9Zi5IYXNoZXIsZj1zLmFsZ28saj1bXSxxPVtdLHY9ZnVuY3Rpb24oYSl7cmV0dXJuIDQyOTQ5NjcyOTYqKGEtKGF8MCkpfDB9LHU9MixrPTA7NjQ+azspe3ZhciBsO2E6e2w9dTtmb3IodmFyIHg9aC5zcXJ0KGwpLHc9Mjt3PD14O3crKylpZighKGwldykpe2w9ITE7YnJlYWsgYX1sPSEwfWwmJig4PmsmJihqW2tdPXYoaC5wb3codSwwLjUpKSkscVtrXT12KGgucG93KHUsMS8zKSksaysrKTt1Kyt9dmFyIGE9W10sZj1mLlNIQTI1Nj1nLmV4dGVuZCh7X2RvUmVzZXQ6ZnVuY3Rpb24oKXt0aGlzLl9oYXNoPW5ldyB0LmluaXQoai5zbGljZSgwKSl9LF9kb1Byb2Nlc3NCbG9jazpmdW5jdGlvbihjLGQpe2Zvcih2YXIgYj10aGlzLl9oYXNoLndvcmRzLGU9YlswXSxmPWJbMV0sbT1iWzJdLGg9YlszXSxwPWJbNF0saj1iWzVdLGs9Yls2XSxsPWJbN10sbj0wOzY0Pm47bisrKXtpZigxNj5uKWFbbl09XG5jW2Qrbl18MDtlbHNle3ZhciByPWFbbi0xNV0sZz1hW24tMl07YVtuXT0oKHI8PDI1fHI+Pj43KV4ocjw8MTR8cj4+PjE4KV5yPj4+MykrYVtuLTddKygoZzw8MTV8Zz4+PjE3KV4oZzw8MTN8Zz4+PjE5KV5nPj4+MTApK2Fbbi0xNl19cj1sKygocDw8MjZ8cD4+PjYpXihwPDwyMXxwPj4+MTEpXihwPDw3fHA+Pj4yNSkpKyhwJmpefnAmaykrcVtuXSthW25dO2c9KChlPDwzMHxlPj4+MileKGU8PDE5fGU+Pj4xMyleKGU8PDEwfGU+Pj4yMikpKyhlJmZeZSZtXmYmbSk7bD1rO2s9ajtqPXA7cD1oK3J8MDtoPW07bT1mO2Y9ZTtlPXIrZ3wwfWJbMF09YlswXStlfDA7YlsxXT1iWzFdK2Z8MDtiWzJdPWJbMl0rbXwwO2JbM109YlszXStofDA7Yls0XT1iWzRdK3B8MDtiWzVdPWJbNV0ranwwO2JbNl09Yls2XStrfDA7Yls3XT1iWzddK2x8MH0sX2RvRmluYWxpemU6ZnVuY3Rpb24oKXt2YXIgYT10aGlzLl9kYXRhLGQ9YS53b3JkcyxiPTgqdGhpcy5fbkRhdGFCeXRlcyxlPTgqYS5zaWdCeXRlcztcbmRbZT4+PjVdfD0xMjg8PDI0LWUlMzI7ZFsoZSs2ND4+Pjk8PDQpKzE0XT1oLmZsb29yKGIvNDI5NDk2NzI5Nik7ZFsoZSs2ND4+Pjk8PDQpKzE1XT1iO2Euc2lnQnl0ZXM9NCpkLmxlbmd0aDt0aGlzLl9wcm9jZXNzKCk7cmV0dXJuIHRoaXMuX2hhc2h9LGNsb25lOmZ1bmN0aW9uKCl7dmFyIGE9Zy5jbG9uZS5jYWxsKHRoaXMpO2EuX2hhc2g9dGhpcy5faGFzaC5jbG9uZSgpO3JldHVybiBhfX0pO3MuU0hBMjU2PWcuX2NyZWF0ZUhlbHBlcihmKTtzLkhtYWNTSEEyNTY9Zy5fY3JlYXRlSG1hY0hlbHBlcihmKX0pKE1hdGgpO1xuIiwiLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vL1xuLy8gQXhvbiBCcmlkZ2UgQVBJIEZyYW1ld29ya1xuLy9cbi8vIEF1dGhvcmVkIGJ5OiAgIEF4b24gSW50ZXJhY3RpdmVcbi8vXG4vLyBMYXN0IE1vZGlmaWVkOiBKdW5lIDQsIDIwMTRcbi8vXG4vLyBEZXBlbmRlbmNpZXM6ICBjcnlwdG8tanMgc2hhMjU2IGFuZCBobWFjLXNoYTI1NiAoaHR0cHM6Ly9jb2RlLmdvb2dsZS5jb20vcC9jcnlwdG8tanMvKVxuLy8gICAgICAgICAgICAgICAgalF1ZXJ5IDEuMTEuMSAoaHR0cDovL2pxdWVyeS5jb20vKVxuLy8gICAgICAgICAgICAgICAganNvbjMgKGh0dHBzOi8vZ2l0aHViLmNvbS9iZXN0aWVqcy9qc29uMylcbi8vICAgICAgICAgICAgICAgIGpTdG9yYWdlIChodHRwczovL2dpdGh1Yi5jb20vYW5kcmlzOS9qU3RvcmFnZSlcbi8vXG4vLyAqKiogSGlzdG9yeSAqKipcbi8vXG4vLyBWZXJzaW9uICAgIERhdGUgICAgICAgICAgICAgICAgICBOb3Rlc1xuLy8gPT09PT09PT09ICA9PT09PT09PT09PT09PT09PT09PSAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gMC4xICAgICAgICBKdW5lIDQsIDIwMTQgICAgICAgICAgRmlyc3Qgc3RhYmxlIHZlcnNpb24uIFxuLy9cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4vLyBSZXF1aXJlIHRoZSByb290IEF4b25CcmlkZ2UgbW9kdWxlXG4vL3ZhciBCcmlkZ2VDbGllbnQgPSByZXF1aXJlKCAnLi9CcmlkZ2VDbGllbnQnICk7XG5cbnZhciBicmlkZ2UgPSByZXF1aXJlKCAnLi9CcmlkZ2UnICk7XG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBicmlkZ2UoKTtcbiJdfQ==
(7)
});
