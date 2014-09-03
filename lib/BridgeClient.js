!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Bridge=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(_dereq_,module,exports){
// Include dependencies
var CryptoEncHex = _dereq_( './include/crypto-js/enc-hex' );
var CryptoSha256 = _dereq_( './include/crypto-js/sha256' );
var Q = _dereq_( './include/q' );
var Identity = _dereq_( './Identity' );

// Configure Q to provide promise strack traces in full.
Q.longStackSupport = true;

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
  // This function is responsible for handling all generic Bridge errors.
  var requestPrivate = function ( method, resource, payload, tempIdentity ) {

    // Create a deferred object to provide a convenient way for the caller to handle success and 
    // failure.
    var deferred = new Q.defer();

    // If a temporary identity was provided, use it (even if an identity is set in Bridge).
    var requestIdentity = null;
    if ( tempIdentity !== null && typeof tempIdentity !== 'undefined' ) {
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
      deferred.reject( { status: 412, message: '412 (Precondition Failed) Null user identity.' }, null );
      return deferred.promise;
    }

    // Create and sign the request header to attach to the XHR request.
    var signedHeader = requestIdentity.createHeader( payload );

    // Handle a successful XHR request
    var onThen = function ( resBody ) {

      var data = null;
      // If the resBody is an object, use it as the data object.
      if ( typeof resBody === 'object' ) {
        data = resBody;
      }
      // If the resBody is a string, attempt to parse it as JSON and use it as the data object. If 
      // it fails to parse as valid JSON, the response is malformed.
      else if ( typeof resBody === 'string' ) {
        try {
          data = JSON.parse( resBody );
        }
        catch ( e ) {
          onFail( { status: 417, message: '417 (Expectation Failed) Malformed message (couldn\'t parse as JSON).' } );
          return;
        }
      }
      // If the resBody is of any other data type, the response is malformed.
      else {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message (response wasn\'t an object).' } );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Response | " + data.content );
      }
      
      // Notify the user of the request about to be sent.
      if ( typeof self.onRequestCalled === "function" ) {
        self.onRequestCalled( method, resource, signedHeader );
      }
      
      // Resolve the deferred and return the body of the response parsed as JSON and the XHR.
      deferred.resolve( data );

    };

    // Handle a failed XHR request
    var onFail = function ( error ) { 

      // If a null error is provided, assume this is a timeout.
      if ( error === null && typeof error !== 'undefined' ) {
        error = { status: 0, message: '0 (Timeout) No response from the server.' };
      }

      // Debug error output
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Request | " + error.status.toString() + " >> " + error.message );
      }

      // Reject the deferred and return the error object matching this status code and the XHR.
      deferred.reject( error );

    };

    // Send the request
    self.createRequest( method, self.url + resource, signedHeader ).then( onThen ).fail( onFail );

    // Return the promise object to the caller
    return deferred.promise;

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

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new Q.defer();

    // Build our internal success handler (this calls deferred.resolve())
    var onThen = function ( data ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' } );
        return;
      }

      // Set Bridge's identity object using the new password, since future requests will need to be 
      // signed with the new user credentials.
      setIdentity( identity.email, newHashedPassword, true );

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Change Password | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Change Password | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its catch() handler.
      deferred.reject( error );

    };

    // Check is the user is logged in before attempting to change their password.
    if ( !self.isLoggedIn() ) {
      onFail( { status: 412, message: '412 (Precondition Failed) Null user identity.' } );
      return deferred.promise;
    }

    // Hash the user's passwords
    var oldHashedPassword = CryptoSha256( oldPassword ).toString( CryptoEncHex );
    var newHashedPassword = CryptoSha256( newPassword ).toString( CryptoEncHex );

    // Clear the unencrypted passwords from memory
    oldPassword = null;
    newPassword = null;

    // Build the payload object to send with the request
    var payload = {
      "appData": {},
      "email": '',
      "firstName": '',
      "lastName": '',
      "password": newHashedPassword
    };

    // Configure a temporary Identity object with the user's credentials, using the password 
    // received as a parameter to double-confirm the user's identity immediately before they 
    // change their account password.
    var tempIdentity = new Identity( identity.email, oldHashedPassword, true );

    // Send the request
    requestPrivate( 'PUT', 'users', payload, tempIdentity ).then( onThen ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise;

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
    var deferred = new Q.defer();

    // Build our internal success handler (this calls deferred.resolve())
    var onThen = function ( data ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' } );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Forgot Password | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Forgot Password | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its catch() handler.
      deferred.reject( error );

    };

    // Build the payload object to send with the request
    var payload = {
      "message": email
    };

    // Create a temporary Identity object with a blank password.
    var tempIdentity = new Identity( '', '', true );

    // Send the request
    requestPrivate( 'PUT', 'forgot-password', payload, tempIdentity ).then( onThen ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise;

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
      CryptoSha256( password ).toString( CryptoEncHex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new Q.defer();

    // Build our internal success handler (this calls deferred.resolve())
    var onThen = function ( data ) {

      // Check that the content type (Login Package) is formatted correctly.
      if ( typeof data.content.user !== 'object' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed login package.' } );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Login | " + JSON.stringify( data.content ) );
      }

      // Set the user object using the user data that was returned
      setUser( data.content.user, data.content.additionalData );

      // Store this identity to local storage, if that was requested.
      // [SECURITY NOTE 1] useLocalStorage should be set based on user input, by asking whether 
      // the user is on a private computer or not. This is can be considered a tolerable
      // security risk as long as the user is on a private computer that they trust or manage
      // themselves. However, on a public machine this is probably a security risk, and the
      // user should be able to decline this convencience in favour of security, regardless
      // of whether they are on a public machine or not.
      if ( self.useLocalStorage ) {
        localStorage.setItem( 'bridge-client-identity', JSON.stringify( {
          'ttl': 86400000, // Expire in 1 day
          'now': new Date(), // From now
          'value': { // Store this data
            "email": email,
            "password": hashedPassword
          }
        } ) );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error ) {

      // Clear the user credentials, since they didn't work anyway.
      clearUser();

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Login | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its catch() handler.
      deferred.reject( error );

    };

    // This request uses an empty payload
    var payload = {};

    // Set whether or not the Bridge should store user credentials and Bridge configuration
    // to local storage.
    self.useLocalStorage = useLocalStorage;

    // Configure an Identity object with the user's credentials.
    setIdentity( email, hashedPassword, true );

    // Send the request
    requestPrivate( 'GET', 'login', payload ).then( onThen ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise;

  };

  // [PRIVATE] requestRecoverPasswordPrivate()
  // To be called by the page at the address which an account recovery email links the user
  // to. They will have entered their new password to an input field, and the email and hash will 
  // have been made available to the page in the query string of the URL.
  var requestRecoverPasswordPrivate = function ( password, hash ) {

    // Notify the user of the recover password call occurring.
    if ( typeof self.onRecoverPasswordCalled === "function" ) {
      self.onRecoverPasswordCalled( hash );
    }

    // Hash the user's password
    var hashedPassword = CryptoSha256( password ).toString( CryptoEncHex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new Q.defer();

    // Build our internal success handler (this calls deferred.resolve())
    var onThen = function ( data ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' } );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Recover Password | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Recover Password | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its catch() handler.
      deferred.reject( error );

    };

    // Build the payload object to send with the request
    var payload = {
      "hash": hash,
      "message": hashedPassword
    };

    // Create a temporary an Identity object with a blank password.
    var tempIdentity = new Identity( '', '', true );

    // Send the request
    requestPrivate( 'PUT', 'recover-password', payload, tempIdentity ).then( onThen ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise;

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
    var hashedPassword = CryptoSha256( password ).toString( CryptoEncHex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new Q.defer();

    // Build our internal success handler (this calls deferred.resolve())
    var onThen = function ( data ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' } );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Register | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Register | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its catch() handler.
      deferred.reject( error );

    };

    // Build the payload object to send with the request
    var payload = {
      "appData": appData,
      "email": email,
      "firstName": firstName,
      "lastName": lastName,
      "password": hashedPassword
    };

    // Create a temporary an Identity object with a blank password.
    var tempIdentity = new Identity( '', '', true );

    // Send the request
    requestPrivate( 'POST', 'users', payload, tempIdentity ).then( onThen ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise;

  };

  // [PRIVATE] requestVerifyEmailPrivate()
  // To be called by the page the at address which an email verification email links the user to.
  // The user will be sent to this page with their email and a hash in the query string of the URL.
  var requestVerifyEmailPrivate = function ( hash ) {

    // Notify the user of the verify email call occurring.
    if ( typeof self.onVerifyEmailCalled === "function" ) {
      self.onVerifyEmailCalled( hash );
    }

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new Q.defer();

    // Build our internal success handler (this calls deferred.resolve())
    var onThen = function ( data ) {

      // Check that the content type (Message) is formatted correctly.
      if ( typeof data.content.message !== 'string' ) {
        onFail( { status: 417, message: '417 (Expectation Failed) Malformed message.' } );
        return;
      }

      // Log the success to the console.
      if ( self.debug === true ) {
        console.log( "BRIDGE | Verify Email | " + data.content.message );
      }

      // Signal the deferred object to use its success() handler.
      deferred.resolve( data );

    };

    // Build our internal failure handler (this calls deferred.reject())
    var onFail = function ( error ) {

      // Log the error to the console.
      if ( Bridge.debug === true ) {
        console.error( "BRIDGE | Verify Email | " + error.status.toString() + " >> " + error.message );
      }

      // Signal the deferred object to use its catch() handler.
      deferred.reject( error );

    };

    // Build the payload object to send with the request
    var payload = {
      "hash": hash
    };

    // Create a temporary an Identity object with a blank password.
    var tempIdentity = new Identity( '', '', true );

    // Send the request
    requestPrivate( 'PUT', 'verify-email', payload, tempIdentity ).then( onThen ).fail( onFail );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise;

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
  // Sets up the essential Bridge Client variables.
  self.init = function ( url, timeout ) {
    self.timeout = timeout;
    self.url = url;
  };


  ///////////////
  // FUNCTIONS //
  ///////////////

  // [PUBLIC] createRequest()
  // This function provides the lowest-level interface to the XHR functionality that the Bridge 
  // Client is operating on top of. This function is responsible only for issuing a request and 
  // returning a Q promise and hooking up the resolve() and reject() methods to the results of the 
  // XHR request.
  // Note: Any function assigned to this variable must accept the same 3 arguments, and it must 
  // return a promise that matches the Q promise interface (must have then() and catch() at least).
  self.createRequest = function( method, url, signedHeader ) {

    // Create a new XhrHttpRequest and a Q deferred to wrap it.
    var xhr = new XMLHttpRequest();
    var deferred = Q.defer();

    // Configure the XHR request
    xhr.open( method.toUpperCase(), url, true );
    xhr.setRequestHeader( 'Accept', 'application/json' );
    xhr.setRequestHeader( 'Bridge', JSON.stringify( signedHeader ) );
    xhr.timeout = self.timeout;
    
    // Assign the callback for all onreadystatechange XHR events
    xhr.onreadystatechange = function () {
      // Only when the XHR state transitions to completed
      if ( xhr.readyState === 4 ) {
        // Use isErrorCodeResponse() to screen for error codes that might be returned by the Bridge 
        // Server. If the status code we got back can't be classified as anything hy 
        // isErrorCodeResponse(), a null error is returned and we can consider the response a
        // successful communication.
        var error = self.isErrorCodeResponse( xhr.status );
        if ( error !== null ) {
          try {
            error = JSON.parse( xhr.responseText );
          }
          catch ( e ) {
            deferred.reject( error );
          }
          deferred.reject( error );
        }
        else {
          deferred.resolve( xhr.responseText );
        }
      }
    };

    // Assign the callback for all onerror XHR events
    xhr.onerror = function () { 
      // Use isErrorCodeResponse() to screen for error codes that might be returned by the Bridge 
      // Server. If the status code we got back can't be classified as anything hy 
      // isErrorCodeResponse(), a null error is returned and the Bridge Client will handle the 
      // problem internally.
      var error = self.isErrorCodeResponse( xhr.status );
      deferred.reject( error );
    };

    // Assign the callback for all ontimeout XHR events
    xhr.ontimeout = function () { 
      // Use isErrorCodeResponse() to screen for error codes that might be returned by the Bridge 
      // Server. If the status code we got back can't be classified as anything hy 
      // isErrorCodeResponse(), a null error is returned and the Bridge Client will handle the 
      // problem internally.
      var error = self.isErrorCodeResponse( xhr.status );
      deferred.reject( error );
    };
    
    // Send the request out into the network
    xhr.send();

    // Return the promise object to the caller 
    return deferred.promise;

  };

  // [PUBLIC] createRequestHeader()
  // Returns a new request header wrapped around the payload passed in.
  self.createRequestHeader = function( payload ) {

    return ( hasIdentity() ) ? identity.createHeader( payload ) : {};

  };

  // [PUBLIC] isErrorCodeResponse()
  // Returns an Error object if the provided xhr has a status code between 400 and 599
  // (inclusive). Since the 400 and 500 series status codes represent errors of various kinds,
  // this acts as a catch-all filter for common error cases to be handled by the client.
  // Returns null if the response status is not between 400 and 599 (inclusive).
  // Error format: { status: 404, message: "The resource you requested was not found." }
  self.isErrorCodeResponse = function ( status ) {

    // Return an Error object if the status code is between 400 and 599 (inclusive).
    if ( status >= 400 ) {

      switch ( status ) {
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
          status: status,
          message: 'Error! Something went wrong, but we don\'t know why!'
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

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = new Q.defer();

    // Delete the Identity object to preserve the user's password security.
    clearIdentity();

    // Clear the user so Bridge reports that it is logged out.
    clearUser();

    // Clear the identity from local storage to preserve the user's password security.
    // If no identity is stored, this will do nothing.
    localStorage.removeItem( 'bridge-client-identity' );

    // Notify the user of the logout action.
    if ( typeof self.onLogoutCalled === 'function' ) {
      self.onLogoutCalled();
    }

    // Resolve the promise since this operation cannot fail
    deferred.resolve();

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise;

  };

  // [PUBLIC] request()
  // Sends an XHR request using jQuery.ajax() to the given API resource using the given 
  // HTTP method. The HTTP request body will be set to the JSON.stringify()ed request 
  // that is generated by the Identity object set to perform HMAC signing.
  // Returns the XhrHttpRequest object that the request represents.
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
    var storedIdentity = localStorage.getItem( 'bridge-client-identity' );
    if ( storedIdentity !== null ) {

      var parsedIdentity = JSON.parse( storedIdentity );

      if ( self.debug === true ) {
        console.log( "Stored identity: " + JSON.stringify( parsedIdentity ) );
      }

      // Send a login request using the private login call and return the deferred object
      return requestLoginPrivate( parsedIdentity.email, parsedIdentity.password, true, true );

    }

    // No login request was sent, so return null.
    return null;

  };

  // [PUBLIC] requestRecoverPassword()
  // The public requestRecoverPassword() function used to hide requestRecoverPasswordPrivate().
  self.requestRecoverPassword = function ( password, hash ) {

    return requestRecoverPasswordPrivate( password, hash );

  };

  // [PUBLIC] requestRegister()
  // The public requestRegister() function used to hide requestRegisterPrivate().
  self.requestRegister = function ( email, password, firstName, lastName, appData ) {

    return requestRegisterPrivate( email, password, firstName, lastName, appData );

  };

  // [PUBLIC] requestVerifyEmail()
  // The public requestVerifyEmail() function used to hide requestVerifyEmailPrivate().
  self.requestVerifyEmail = function ( hash ) {

    return requestVerifyEmailPrivate( hash );

  };

  return self;

};
},{"./Identity":3,"./include/crypto-js/enc-hex":5,"./include/crypto-js/sha256":8,"./include/q":9}],3:[function(_dereq_,module,exports){
// Include dependencies
var CryptoEncHex = _dereq_( './include/crypto-js/enc-hex' );
var CryptoHmacSha256 = _dereq_( './include/crypto-js/hmac-sha256' );
var CryptoSha256 = _dereq_( './include/crypto-js/sha256' );

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
    CryptoSha256( password ).toString( CryptoEncHex );

  // [SECURITY NOTE 2] The user's given password should be forgotten once it has been hashed.
  // Although the password is local to this constructor, it is better that it not even be 
  // available in memory once it has been hashed, since the hashed password is much more 
  // difficult to recover in its original form.
  password = null;


  ///////////////
  // FUNCTIONS //
  ///////////////

  // [PRIVATE] hmacSignHeader()
  // Returns the given request object after adding the "hmac" property to it and setting "hmac" 
  // by using the user's password as a SHA-256 HMAC hashing secret.
  // [SECURITY NOTE 3] The HMAC string is a hex value, 64 characters in length. It is created 
  // by concatenating the JSON.stringify()ed request content, the request email, and the request 
  // time together, and hashing the result using hashedPassword as a salt. 
  //
  // Pseudocode:
  // toHash = Request Content JSON + Request Email + Request Time JSON
  // salt = hashedPassword
  // hmacString = CryptoSha256( toHash, salt )
  // request.hmac = hmacString
  // 
  // By performing the same operation on the data, the server can confirm that the HMAC strings 
  // are identical and authorize the request.
  var hmacSignHeader = function ( reqBody ) {

    // Create the concatenated string to be hashed as the HMAC
    var content = JSON.stringify( reqBody.content );
    var email = reqBody.email;
    var time = reqBody.time.toISOString();
    var concat = content + email + time;

    // Add the 'hmac' property to the request with a value computed by salting the concat with the
    // user's hashedPassword.
    // [CAREFUL] hashedPassword should be a string. If it isn't, terrible things WILL happen!
    reqBody.hmac = CryptoHmacSha256( concat, hashedPassword ).toString( CryptoEncHex );

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

  // [PUBLIC] createHeader()
  // Returns a new request, given the content payload of the request as an object. Utilizes
  // hmacSignHeader() to wrap the given payload in an appropriate header to validate against the
  // server-side authorization scheme (assuming the user credentials are correct).
  self.createHeader = function ( payload ) {

    return hmacSignHeader( {
      'content': payload,
      'email': email,
      'time': new Date()
    } );

  };

  return self;

};
},{"./include/crypto-js/enc-hex":5,"./include/crypto-js/hmac-sha256":6,"./include/crypto-js/sha256":8}],4:[function(_dereq_,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory();
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define([], factory);
	}
	else {
		// Global (browser)
		root.CryptoJS = factory();
	}
}(this, function () {

	/**
	 * CryptoJS core components.
	 */
	var CryptoJS = CryptoJS || (function (Math, undefined) {
	    /**
	     * CryptoJS namespace.
	     */
	    var C = {};

	    /**
	     * Library namespace.
	     */
	    var C_lib = C.lib = {};

	    /**
	     * Base object for prototypal inheritance.
	     */
	    var Base = C_lib.Base = (function () {
	        function F() {}

	        return {
	            /**
	             * Creates a new object that inherits from this object.
	             *
	             * @param {Object} overrides Properties to copy into the new object.
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         field: 'value',
	             *
	             *         method: function () {
	             *         }
	             *     });
	             */
	            extend: function (overrides) {
	                // Spawn
	                F.prototype = this;
	                var subtype = new F();

	                // Augment
	                if (overrides) {
	                    subtype.mixIn(overrides);
	                }

	                // Create default initializer
	                if (!subtype.hasOwnProperty('init')) {
	                    subtype.init = function () {
	                        subtype.$super.init.apply(this, arguments);
	                    };
	                }

	                // Initializer's prototype is the subtype object
	                subtype.init.prototype = subtype;

	                // Reference supertype
	                subtype.$super = this;

	                return subtype;
	            },

	            /**
	             * Extends this object and runs the init method.
	             * Arguments to create() will be passed to init().
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var instance = MyType.create();
	             */
	            create: function () {
	                var instance = this.extend();
	                instance.init.apply(instance, arguments);

	                return instance;
	            },

	            /**
	             * Initializes a newly created object.
	             * Override this method to add some logic when your objects are created.
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         init: function () {
	             *             // ...
	             *         }
	             *     });
	             */
	            init: function () {
	            },

	            /**
	             * Copies properties into this object.
	             *
	             * @param {Object} properties The properties to mix in.
	             *
	             * @example
	             *
	             *     MyType.mixIn({
	             *         field: 'value'
	             *     });
	             */
	            mixIn: function (properties) {
	                for (var propertyName in properties) {
	                    if (properties.hasOwnProperty(propertyName)) {
	                        this[propertyName] = properties[propertyName];
	                    }
	                }

	                // IE won't copy toString using the loop above
	                if (properties.hasOwnProperty('toString')) {
	                    this.toString = properties.toString;
	                }
	            },

	            /**
	             * Creates a copy of this object.
	             *
	             * @return {Object} The clone.
	             *
	             * @example
	             *
	             *     var clone = instance.clone();
	             */
	            clone: function () {
	                return this.init.prototype.extend(this);
	            }
	        };
	    }());

	    /**
	     * An array of 32-bit words.
	     *
	     * @property {Array} words The array of 32-bit words.
	     * @property {number} sigBytes The number of significant bytes in this word array.
	     */
	    var WordArray = C_lib.WordArray = Base.extend({
	        /**
	         * Initializes a newly created word array.
	         *
	         * @param {Array} words (Optional) An array of 32-bit words.
	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.create();
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
	         */
	        init: function (words, sigBytes) {
	            words = this.words = words || [];

	            if (sigBytes != undefined) {
	                this.sigBytes = sigBytes;
	            } else {
	                this.sigBytes = words.length * 4;
	            }
	        },

	        /**
	         * Converts this word array to a string.
	         *
	         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
	         *
	         * @return {string} The stringified word array.
	         *
	         * @example
	         *
	         *     var string = wordArray + '';
	         *     var string = wordArray.toString();
	         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
	         */
	        toString: function (encoder) {
	            return (encoder || Hex).stringify(this);
	        },

	        /**
	         * Concatenates a word array to this word array.
	         *
	         * @param {WordArray} wordArray The word array to append.
	         *
	         * @return {WordArray} This word array.
	         *
	         * @example
	         *
	         *     wordArray1.concat(wordArray2);
	         */
	        concat: function (wordArray) {
	            // Shortcuts
	            var thisWords = this.words;
	            var thatWords = wordArray.words;
	            var thisSigBytes = this.sigBytes;
	            var thatSigBytes = wordArray.sigBytes;

	            // Clamp excess bits
	            this.clamp();

	            // Concat
	            if (thisSigBytes % 4) {
	                // Copy one byte at a time
	                for (var i = 0; i < thatSigBytes; i++) {
	                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
	                }
	            } else if (thatWords.length > 0xffff) {
	                // Copy one word at a time
	                for (var i = 0; i < thatSigBytes; i += 4) {
	                    thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
	                }
	            } else {
	                // Copy all words at once
	                thisWords.push.apply(thisWords, thatWords);
	            }
	            this.sigBytes += thatSigBytes;

	            // Chainable
	            return this;
	        },

	        /**
	         * Removes insignificant bits.
	         *
	         * @example
	         *
	         *     wordArray.clamp();
	         */
	        clamp: function () {
	            // Shortcuts
	            var words = this.words;
	            var sigBytes = this.sigBytes;

	            // Clamp
	            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
	            words.length = Math.ceil(sigBytes / 4);
	        },

	        /**
	         * Creates a copy of this word array.
	         *
	         * @return {WordArray} The clone.
	         *
	         * @example
	         *
	         *     var clone = wordArray.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone.words = this.words.slice(0);

	            return clone;
	        },

	        /**
	         * Creates a word array filled with random bytes.
	         *
	         * @param {number} nBytes The number of random bytes to generate.
	         *
	         * @return {WordArray} The random word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.random(16);
	         */
	        random: function (nBytes) {
	            var words = [];

	            var r = (function (m_w) {
	                var m_w = m_w;
	                var m_z = 0x3ade68b1;
	                var mask = 0xffffffff;

	                return function () {
	                    m_z = (0x9069 * (m_z & 0xFFFF) + (m_z >> 0x10)) & mask;
	                    m_w = (0x4650 * (m_w & 0xFFFF) + (m_w >> 0x10)) & mask;
	                    var result = ((m_z << 0x10) + m_w) & mask;
	                    result /= 0x100000000;
	                    result += 0.5;
	                    return result * (Math.random() > .5 ? 1 : -1);
	                }
	            });

	            for (var i = 0, rcache; i < nBytes; i += 4) {
	                var _r = r((rcache || Math.random()) * 0x100000000);

	                rcache = _r() * 0x3ade67b7;
	                words.push((_r() * 0x100000000) | 0);
	            }

	            return new WordArray.init(words, nBytes);
	        }
	    });

	    /**
	     * Encoder namespace.
	     */
	    var C_enc = C.enc = {};

	    /**
	     * Hex encoding strategy.
	     */
	    var Hex = C_enc.Hex = {
	        /**
	         * Converts a word array to a hex string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The hex string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var hexChars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                hexChars.push((bite >>> 4).toString(16));
	                hexChars.push((bite & 0x0f).toString(16));
	            }

	            return hexChars.join('');
	        },

	        /**
	         * Converts a hex string to a word array.
	         *
	         * @param {string} hexStr The hex string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
	         */
	        parse: function (hexStr) {
	            // Shortcut
	            var hexStrLength = hexStr.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < hexStrLength; i += 2) {
	                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
	            }

	            return new WordArray.init(words, hexStrLength / 2);
	        }
	    };

	    /**
	     * Latin1 encoding strategy.
	     */
	    var Latin1 = C_enc.Latin1 = {
	        /**
	         * Converts a word array to a Latin1 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The Latin1 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var latin1Chars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                latin1Chars.push(String.fromCharCode(bite));
	            }

	            return latin1Chars.join('');
	        },

	        /**
	         * Converts a Latin1 string to a word array.
	         *
	         * @param {string} latin1Str The Latin1 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
	         */
	        parse: function (latin1Str) {
	            // Shortcut
	            var latin1StrLength = latin1Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < latin1StrLength; i++) {
	                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
	            }

	            return new WordArray.init(words, latin1StrLength);
	        }
	    };

	    /**
	     * UTF-8 encoding strategy.
	     */
	    var Utf8 = C_enc.Utf8 = {
	        /**
	         * Converts a word array to a UTF-8 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-8 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            try {
	                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
	            } catch (e) {
	                throw new Error('Malformed UTF-8 data');
	            }
	        },

	        /**
	         * Converts a UTF-8 string to a word array.
	         *
	         * @param {string} utf8Str The UTF-8 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
	         */
	        parse: function (utf8Str) {
	            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
	        }
	    };

	    /**
	     * Abstract buffered block algorithm template.
	     *
	     * The property blockSize must be implemented in a concrete subtype.
	     *
	     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
	     */
	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
	        /**
	         * Resets this block algorithm's data buffer to its initial state.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm.reset();
	         */
	        reset: function () {
	            // Initial values
	            this._data = new WordArray.init();
	            this._nDataBytes = 0;
	        },

	        /**
	         * Adds new data to this block algorithm's buffer.
	         *
	         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm._append('data');
	         *     bufferedBlockAlgorithm._append(wordArray);
	         */
	        _append: function (data) {
	            // Convert string to WordArray, else assume WordArray already
	            if (typeof data == 'string') {
	                data = Utf8.parse(data);
	            }

	            // Append
	            this._data.concat(data);
	            this._nDataBytes += data.sigBytes;
	        },

	        /**
	         * Processes available data blocks.
	         *
	         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
	         *
	         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
	         *
	         * @return {WordArray} The processed data.
	         *
	         * @example
	         *
	         *     var processedData = bufferedBlockAlgorithm._process();
	         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
	         */
	        _process: function (doFlush) {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;
	            var dataSigBytes = data.sigBytes;
	            var blockSize = this.blockSize;
	            var blockSizeBytes = blockSize * 4;

	            // Count blocks ready
	            var nBlocksReady = dataSigBytes / blockSizeBytes;
	            if (doFlush) {
	                // Round up to include partial blocks
	                nBlocksReady = Math.ceil(nBlocksReady);
	            } else {
	                // Round down to include only full blocks,
	                // less the number of blocks that must remain in the buffer
	                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
	            }

	            // Count words ready
	            var nWordsReady = nBlocksReady * blockSize;

	            // Count bytes ready
	            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

	            // Process blocks
	            if (nWordsReady) {
	                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
	                    // Perform concrete-algorithm logic
	                    this._doProcessBlock(dataWords, offset);
	                }

	                // Remove processed words
	                var processedWords = dataWords.splice(0, nWordsReady);
	                data.sigBytes -= nBytesReady;
	            }

	            // Return processed words
	            return new WordArray.init(processedWords, nBytesReady);
	        },

	        /**
	         * Creates a copy of this object.
	         *
	         * @return {Object} The clone.
	         *
	         * @example
	         *
	         *     var clone = bufferedBlockAlgorithm.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone._data = this._data.clone();

	            return clone;
	        },

	        _minBufferSize: 0
	    });

	    /**
	     * Abstract hasher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
	     */
	    var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
	        /**
	         * Configuration options.
	         */
	        cfg: Base.extend(),

	        /**
	         * Initializes a newly created hasher.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
	         *
	         * @example
	         *
	         *     var hasher = CryptoJS.algo.SHA256.create();
	         */
	        init: function (cfg) {
	            // Apply config defaults
	            this.cfg = this.cfg.extend(cfg);

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this hasher to its initial state.
	         *
	         * @example
	         *
	         *     hasher.reset();
	         */
	        reset: function () {
	            // Reset data buffer
	            BufferedBlockAlgorithm.reset.call(this);

	            // Perform concrete-hasher logic
	            this._doReset();
	        },

	        /**
	         * Updates this hasher with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {Hasher} This hasher.
	         *
	         * @example
	         *
	         *     hasher.update('message');
	         *     hasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            // Append
	            this._append(messageUpdate);

	            // Update the hash
	            this._process();

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the hash computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The hash.
	         *
	         * @example
	         *
	         *     var hash = hasher.finalize();
	         *     var hash = hasher.finalize('message');
	         *     var hash = hasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Final message update
	            if (messageUpdate) {
	                this._append(messageUpdate);
	            }

	            // Perform concrete-hasher logic
	            var hash = this._doFinalize();

	            return hash;
	        },

	        blockSize: 512/32,

	        /**
	         * Creates a shortcut function to a hasher's object interface.
	         *
	         * @param {Hasher} hasher The hasher to create a helper for.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
	         */
	        _createHelper: function (hasher) {
	            return function (message, cfg) {
	                return new hasher.init(cfg).finalize(message);
	            };
	        },

	        /**
	         * Creates a shortcut function to the HMAC's object interface.
	         *
	         * @param {Hasher} hasher The hasher to use in this HMAC helper.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
	         */
	        _createHmacHelper: function (hasher) {
	            return function (message, key) {
	                return new C_algo.HMAC.init(hasher, key).finalize(message);
	            };
	        }
	    });

	    /**
	     * Algorithm namespace.
	     */
	    var C_algo = C.algo = {};

	    return C;
	}(Math));


	return CryptoJS;

}));
},{}],5:[function(_dereq_,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(_dereq_("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	return CryptoJS.enc.Hex;

}));
},{"./core":4}],6:[function(_dereq_,module,exports){
;(function (root, factory, undef) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(_dereq_("./core"), _dereq_("./sha256"), _dereq_("./hmac"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core", "./sha256", "./hmac"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	return CryptoJS.HmacSHA256;

}));
},{"./core":4,"./hmac":7,"./sha256":8}],7:[function(_dereq_,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(_dereq_("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var C_enc = C.enc;
	    var Utf8 = C_enc.Utf8;
	    var C_algo = C.algo;

	    /**
	     * HMAC algorithm.
	     */
	    var HMAC = C_algo.HMAC = Base.extend({
	        /**
	         * Initializes a newly created HMAC.
	         *
	         * @param {Hasher} hasher The hash algorithm to use.
	         * @param {WordArray|string} key The secret key.
	         *
	         * @example
	         *
	         *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
	         */
	        init: function (hasher, key) {
	            // Init hasher
	            hasher = this._hasher = new hasher.init();

	            // Convert string to WordArray, else assume WordArray already
	            if (typeof key == 'string') {
	                key = Utf8.parse(key);
	            }

	            // Shortcuts
	            var hasherBlockSize = hasher.blockSize;
	            var hasherBlockSizeBytes = hasherBlockSize * 4;

	            // Allow arbitrary length keys
	            if (key.sigBytes > hasherBlockSizeBytes) {
	                key = hasher.finalize(key);
	            }

	            // Clamp excess bits
	            key.clamp();

	            // Clone key for inner and outer pads
	            var oKey = this._oKey = key.clone();
	            var iKey = this._iKey = key.clone();

	            // Shortcuts
	            var oKeyWords = oKey.words;
	            var iKeyWords = iKey.words;

	            // XOR keys with pad constants
	            for (var i = 0; i < hasherBlockSize; i++) {
	                oKeyWords[i] ^= 0x5c5c5c5c;
	                iKeyWords[i] ^= 0x36363636;
	            }
	            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this HMAC to its initial state.
	         *
	         * @example
	         *
	         *     hmacHasher.reset();
	         */
	        reset: function () {
	            // Shortcut
	            var hasher = this._hasher;

	            // Reset
	            hasher.reset();
	            hasher.update(this._iKey);
	        },

	        /**
	         * Updates this HMAC with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {HMAC} This HMAC instance.
	         *
	         * @example
	         *
	         *     hmacHasher.update('message');
	         *     hmacHasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            this._hasher.update(messageUpdate);

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the HMAC computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The HMAC.
	         *
	         * @example
	         *
	         *     var hmac = hmacHasher.finalize();
	         *     var hmac = hmacHasher.finalize('message');
	         *     var hmac = hmacHasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Shortcut
	            var hasher = this._hasher;

	            // Compute HMAC
	            var innerHash = hasher.finalize(messageUpdate);
	            hasher.reset();
	            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

	            return hmac;
	        }
	    });
	}());


}));
},{"./core":4}],8:[function(_dereq_,module,exports){
;(function (root, factory) {
	if (typeof exports === "object") {
		// CommonJS
		module.exports = exports = factory(_dereq_("./core"));
	}
	else if (typeof define === "function" && define.amd) {
		// AMD
		define(["./core"], factory);
	}
	else {
		// Global (browser)
		factory(root.CryptoJS);
	}
}(this, function (CryptoJS) {

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Initialization and round constants tables
	    var H = [];
	    var K = [];

	    // Compute constants
	    (function () {
	        function isPrime(n) {
	            var sqrtN = Math.sqrt(n);
	            for (var factor = 2; factor <= sqrtN; factor++) {
	                if (!(n % factor)) {
	                    return false;
	                }
	            }

	            return true;
	        }

	        function getFractionalBits(n) {
	            return ((n - (n | 0)) * 0x100000000) | 0;
	        }

	        var n = 2;
	        var nPrime = 0;
	        while (nPrime < 64) {
	            if (isPrime(n)) {
	                if (nPrime < 8) {
	                    H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
	                }
	                K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

	                nPrime++;
	            }

	            n++;
	        }
	    }());

	    // Reusable object
	    var W = [];

	    /**
	     * SHA-256 hash algorithm.
	     */
	    var SHA256 = C_algo.SHA256 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init(H.slice(0));
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var H = this._hash.words;

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];
	            var e = H[4];
	            var f = H[5];
	            var g = H[6];
	            var h = H[7];

	            // Computation
	            for (var i = 0; i < 64; i++) {
	                if (i < 16) {
	                    W[i] = M[offset + i] | 0;
	                } else {
	                    var gamma0x = W[i - 15];
	                    var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
	                                  ((gamma0x << 14) | (gamma0x >>> 18)) ^
	                                   (gamma0x >>> 3);

	                    var gamma1x = W[i - 2];
	                    var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
	                                  ((gamma1x << 13) | (gamma1x >>> 19)) ^
	                                   (gamma1x >>> 10);

	                    W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
	                }

	                var ch  = (e & f) ^ (~e & g);
	                var maj = (a & b) ^ (a & c) ^ (b & c);

	                var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
	                var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

	                var t1 = h + sigma1 + ch + K[i] + W[i];
	                var t2 = sigma0 + maj;

	                h = g;
	                g = f;
	                f = e;
	                e = (d + t1) | 0;
	                d = c;
	                c = b;
	                b = a;
	                a = (t1 + t2) | 0;
	            }

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	            H[4] = (H[4] + e) | 0;
	            H[5] = (H[5] + f) | 0;
	            H[6] = (H[6] + g) | 0;
	            H[7] = (H[7] + h) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Return final computed hash
	            return this._hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA256('message');
	     *     var hash = CryptoJS.SHA256(wordArray);
	     */
	    C.SHA256 = Hasher._createHelper(SHA256);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA256(message, key);
	     */
	    C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
	}(Math));


	return CryptoJS.SHA256;

}));
},{"./core":4}],9:[function(_dereq_,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become fulfilled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be fulfilled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,_dereq_("Zbi7gb"))
},{"Zbi7gb":1}],10:[function(_dereq_,module,exports){
///////////////////////////////////////////////////////////////////////////////////////////////////
//
// Axon Bridge API Framework
//
// Authored by:   Axon Interactive
//
// Last Modified: June 4, 2014
//
// Dependencies:  crypto-js (https://github.com/evanvosberg/crypto-js)
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

},{"./Bridge":2}]},{},[10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJjOlxcRGV2ZWxvcG1lbnRcXF9CaXRidWNrZXRcXGJyaWRnZS1jbGllbnRcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL0JyaWRnZS5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvSWRlbnRpdHkuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvY3J5cHRvLWpzL2NvcmUuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvY3J5cHRvLWpzL2VuYy1oZXguanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvY3J5cHRvLWpzL2htYWMtc2hhMjU2LmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2NyeXB0by1qcy9obWFjLmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2NyeXB0by1qcy9zaGEyNTYuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvcS5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3orQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeHVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0M0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIvLyBJbmNsdWRlIGRlcGVuZGVuY2llc1xyXG52YXIgQ3J5cHRvRW5jSGV4ID0gcmVxdWlyZSggJy4vaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleCcgKTtcclxudmFyIENyeXB0b1NoYTI1NiA9IHJlcXVpcmUoICcuL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1NicgKTtcclxudmFyIFEgPSByZXF1aXJlKCAnLi9pbmNsdWRlL3EnICk7XHJcbnZhciBJZGVudGl0eSA9IHJlcXVpcmUoICcuL0lkZW50aXR5JyApO1xyXG5cclxuLy8gQ29uZmlndXJlIFEgdG8gcHJvdmlkZSBwcm9taXNlIHN0cmFjayB0cmFjZXMgaW4gZnVsbC5cclxuUS5sb25nU3RhY2tTdXBwb3J0ID0gdHJ1ZTtcclxuXHJcbi8vIFtCcmlkZ2UgQ29uc3RydWN0b3JdXHJcbi8vIFRoZSBCcmlkZ2Ugb2JqZWN0IGlzIHRoZSBnbG9iYWwgb2JqZWN0IHRocm91Z2ggd2hpY2ggb3RoZXIgYXBwbGljYXRpb25zIHdpbGwgXHJcbi8vIGNvbW11bmljYXRlIHdpdGggdGhlIGJyaWRnZWQgQVBJIHJlc291cmNlcy4gSXQgcHJvdmlkZXMgYSBzaW1wbGUgc3VyZmFjZSBBUEkgZm9yIGxvZ2dpbmdcclxuLy8gaW4gYW5kIGxvZ2dpbmcgb3V0IHVzZXJzIGFzIHdlbGwgYXMgc2VuZGluZyByZXF1ZXN0cyB0byB0aGUgQVBJLiBJbnRlcm5hbGx5LCBpdCBoYW5kbGVzXHJcbi8vIGFsbCBvZiB0aGUgcmVxdWVzdCBhdXRoZW50aWNhdGlvbiBuZWNlc3NhcnkgZm9yIHRoZSBBUEkgd2l0aG91dCBleHBvc2luZyB0aGUgdXNlcidzXHJcbi8vIGFjY291bnQgcGFzc3dvcmQgdG8gb3V0c2lkZSBzY3J1dGlueSAoYW5kIGV2ZW4gc2NydXRpbnkgZnJvbSBvdGhlciBsb2NhbCBhcHBsaWNhdGlvbnNcclxuLy8gdG8gYSBzaWduaWZpY2FudCBleHRlbnQpLlxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBUaGUgb2JqZWN0IHRvIGJlIHJldHVybmVkIGZyb20gdGhlIGZhY3RvcnlcclxuICB2YXIgc2VsZiA9IHt9O1xyXG5cclxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAvLyBQUklWQVRFIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vIFBST1BFUlRJRVMgLy9cclxuICAvLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8vIFtQUklWQVRFXSBpZGVudGl0eVxyXG4gIC8vIFRoZSBJZGVudGl0eSBvYmplY3QgdXNlZCB0byB0cmFjayB0aGUgdXNlciBhbmQgY3JlYXRlIHJlcXVlc3RzIHNpZ25lZCB3aXRoIFxyXG4gIC8vIGFwcHJvcHJpYXRlIEhNQUMgaGFzaCB2YWx1ZXMuXHJcbiAgdmFyIGlkZW50aXR5ID0gbnVsbDtcclxuXHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vIEZVTkNUSU9OUyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLyBbUFJJVkFURV0gY2xlYXJJZGVudGl0eSgpXHJcbiAgLy8gU2V0cyB0aGUgY3VycmVudCBJZGVudGl0eSBvYmplY3QgdG8gbnVsbCBzbyBpdCBnZXRzIGdhcmJhZ2UgY29sbGVjdGVkIGFuZCBjYW5ub3QgYmUgdXNlZCBcclxuICAvLyB0byB2YWxpZGF0ZSByZXF1ZXN0cyBnb2luZyBmb3J3YXJkLlxyXG4gIHZhciBjbGVhcklkZW50aXR5ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIGlkZW50aXR5ID0gbnVsbDtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIGNsZWFyVXNlclxyXG4gIC8vIENsZWFycyB0aGUgY3VycmVudCB1c2VyIGRhdGEgYW5kIGFkZGl0aW9uYWwgZGF0YSBhc3NpZ25lZCB0byB0aGUgQnJpZGdlLlxyXG4gIHZhciBjbGVhclVzZXIgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgLy8gU2V0IHRoZSB1c2VyIGFuZCBhZGRpdGlvbmFsIGRhdGEgb2JqZWN0cyB0byBudWxsXHJcbiAgICBzZWxmLnVzZXIgPSBudWxsO1xyXG4gICAgc2VsZi5hZGRpdGlvbmFsRGF0YSA9IG51bGw7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQUklWQVRFXSBoYXNJZGVudGl0eSgpXHJcbiAgLy8gUmV0dXJucyB3aGV0aGVyIG9yIG5vdCBhbiB0aGUgSWRlbnRpdHkgb2JqZWN0IGlzIGN1cnJlbnRseSBhc3NpZ25lZC5cclxuICB2YXIgaGFzSWRlbnRpdHkgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgcmV0dXJuICggaWRlbnRpdHkgIT09IG51bGwgKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIHJlcXVlc3RQcml2YXRlKClcclxuICAvLyBUaGlzIGZ1bmN0aW9uIHByb3ZpZGVzIHRoZSBiYXNpYyBmdW5jdGlvbmFsaXR5IHVzZWQgYnkgYWxsIG9mIHRoZSBCcmlkZ2UgQ2xpZW50J3MgaW50ZXJuYWxcclxuICAvLyByZXF1ZXN0IGZ1bmN0aW9uIGNhbGxzLiBJdCBwZXJmb3JtcyBhbiBYSFIgcmVxdWVzdCB0byB0aGUgQVBJIHNlcnZlciBhdCB0aGUgc3BlY2lmaWVkIHJlc291cmNlXHJcbiAgLy8gYW5kIHJldHVybiBhIGpRdWVyeSBEZWZlcnJlZCBvYmplY3QgLiBJZiB0aGlzIHJldHVybnMgbnVsbCwgdGhlIHJlcXVlc3QgY291bGQgbm90IGJlIHNlbnRcclxuICAvLyBiZWNhdXNlIG5vIHVzZXIgY3JlZGVudGlhbHMgd2VyZSBhdmFpbGFibGUgdG8gc2lnbiB0aGUgcmVxdWVzdC5cclxuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIGZvciBoYW5kbGluZyBhbGwgZ2VuZXJpYyBCcmlkZ2UgZXJyb3JzLlxyXG4gIHZhciByZXF1ZXN0UHJpdmF0ZSA9IGZ1bmN0aW9uICggbWV0aG9kLCByZXNvdXJjZSwgcGF5bG9hZCwgdGVtcElkZW50aXR5ICkge1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byBwcm92aWRlIGEgY29udmVuaWVudCB3YXkgZm9yIHRoZSBjYWxsZXIgdG8gaGFuZGxlIHN1Y2Nlc3MgYW5kIFxyXG4gICAgLy8gZmFpbHVyZS5cclxuICAgIHZhciBkZWZlcnJlZCA9IG5ldyBRLmRlZmVyKCk7XHJcblxyXG4gICAgLy8gSWYgYSB0ZW1wb3JhcnkgaWRlbnRpdHkgd2FzIHByb3ZpZGVkLCB1c2UgaXQgKGV2ZW4gaWYgYW4gaWRlbnRpdHkgaXMgc2V0IGluIEJyaWRnZSkuXHJcbiAgICB2YXIgcmVxdWVzdElkZW50aXR5ID0gbnVsbDtcclxuICAgIGlmICggdGVtcElkZW50aXR5ICE9PSBudWxsICYmIHR5cGVvZiB0ZW1wSWRlbnRpdHkgIT09ICd1bmRlZmluZWQnICkge1xyXG4gICAgICByZXF1ZXN0SWRlbnRpdHkgPSB0ZW1wSWRlbnRpdHk7XHJcbiAgICB9XHJcbiAgICAvLyBJZiBhbiBpZGVudGl0eSBpcyBzZXQgaW4gQnJpZGdlLCB1c2UgaXQuXHJcbiAgICBlbHNlIGlmICggaGFzSWRlbnRpdHkoKSA9PT0gdHJ1ZSApIHtcclxuICAgICAgcmVxdWVzdElkZW50aXR5ID0gaWRlbnRpdHk7XHJcbiAgICB9XHJcbiAgICAvLyBObyBpZGVudGl0eSBpcyBhdmFpbGFibGUuIFRoZSByZXF1ZXN0IGNhbid0IGJlIHNlbnQuXHJcbiAgICBlbHNlIHsgXHJcbiAgICAgIGlmICggc2VsZi5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oIFwiQlJJREdFIHwgUmVxdWVzdCB8IFJlcXVlc3QgY2Fubm90IGJlIHNlbnQuIE5vIHVzZXIgY3JlZGVudGlhbHMgYXZhaWxhYmxlLlwiICk7XHJcbiAgICAgIH1cclxuICAgICAgZGVmZXJyZWQucmVqZWN0KCB7IHN0YXR1czogNDEyLCBtZXNzYWdlOiAnNDEyIChQcmVjb25kaXRpb24gRmFpbGVkKSBOdWxsIHVzZXIgaWRlbnRpdHkuJyB9LCBudWxsICk7XHJcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBhbmQgc2lnbiB0aGUgcmVxdWVzdCBoZWFkZXIgdG8gYXR0YWNoIHRvIHRoZSBYSFIgcmVxdWVzdC5cclxuICAgIHZhciBzaWduZWRIZWFkZXIgPSByZXF1ZXN0SWRlbnRpdHkuY3JlYXRlSGVhZGVyKCBwYXlsb2FkICk7XHJcblxyXG4gICAgLy8gSGFuZGxlIGEgc3VjY2Vzc2Z1bCBYSFIgcmVxdWVzdFxyXG4gICAgdmFyIG9uVGhlbiA9IGZ1bmN0aW9uICggcmVzQm9keSApIHtcclxuXHJcbiAgICAgIHZhciBkYXRhID0gbnVsbDtcclxuICAgICAgLy8gSWYgdGhlIHJlc0JvZHkgaXMgYW4gb2JqZWN0LCB1c2UgaXQgYXMgdGhlIGRhdGEgb2JqZWN0LlxyXG4gICAgICBpZiAoIHR5cGVvZiByZXNCb2R5ID09PSAnb2JqZWN0JyApIHtcclxuICAgICAgICBkYXRhID0gcmVzQm9keTtcclxuICAgICAgfVxyXG4gICAgICAvLyBJZiB0aGUgcmVzQm9keSBpcyBhIHN0cmluZywgYXR0ZW1wdCB0byBwYXJzZSBpdCBhcyBKU09OIGFuZCB1c2UgaXQgYXMgdGhlIGRhdGEgb2JqZWN0LiBJZiBcclxuICAgICAgLy8gaXQgZmFpbHMgdG8gcGFyc2UgYXMgdmFsaWQgSlNPTiwgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgZWxzZSBpZiAoIHR5cGVvZiByZXNCb2R5ID09PSAnc3RyaW5nJyApIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgZGF0YSA9IEpTT04ucGFyc2UoIHJlc0JvZHkgKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKCBlICkge1xyXG4gICAgICAgICAgb25GYWlsKCB7IHN0YXR1czogNDE3LCBtZXNzYWdlOiAnNDE3IChFeHBlY3RhdGlvbiBGYWlsZWQpIE1hbGZvcm1lZCBtZXNzYWdlIChjb3VsZG5cXCd0IHBhcnNlIGFzIEpTT04pLicgfSApO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICAvLyBJZiB0aGUgcmVzQm9keSBpcyBvZiBhbnkgb3RoZXIgZGF0YSB0eXBlLCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBlbHNlIHtcclxuICAgICAgICBvbkZhaWwoIHsgc3RhdHVzOiA0MTcsIG1lc3NhZ2U6ICc0MTcgKEV4cGVjdGF0aW9uIEZhaWxlZCkgTWFsZm9ybWVkIG1lc3NhZ2UgKHJlc3BvbnNlIHdhc25cXCd0IGFuIG9iamVjdCkuJyB9ICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBMb2cgdGhlIHN1Y2Nlc3MgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggc2VsZi5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyggXCJCUklER0UgfCBSZXNwb25zZSB8IFwiICsgZGF0YS5jb250ZW50ICk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgcmVxdWVzdCBhYm91dCB0byBiZSBzZW50LlxyXG4gICAgICBpZiAoIHR5cGVvZiBzZWxmLm9uUmVxdWVzdENhbGxlZCA9PT0gXCJmdW5jdGlvblwiICkge1xyXG4gICAgICAgIHNlbGYub25SZXF1ZXN0Q2FsbGVkKCBtZXRob2QsIHJlc291cmNlLCBzaWduZWRIZWFkZXIgKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gUmVzb2x2ZSB0aGUgZGVmZXJyZWQgYW5kIHJldHVybiB0aGUgYm9keSBvZiB0aGUgcmVzcG9uc2UgcGFyc2VkIGFzIEpTT04gYW5kIHRoZSBYSFIuXHJcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoIGRhdGEgKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEhhbmRsZSBhIGZhaWxlZCBYSFIgcmVxdWVzdFxyXG4gICAgdmFyIG9uRmFpbCA9IGZ1bmN0aW9uICggZXJyb3IgKSB7IFxyXG5cclxuICAgICAgLy8gSWYgYSBudWxsIGVycm9yIGlzIHByb3ZpZGVkLCBhc3N1bWUgdGhpcyBpcyBhIHRpbWVvdXQuXHJcbiAgICAgIGlmICggZXJyb3IgPT09IG51bGwgJiYgdHlwZW9mIGVycm9yICE9PSAndW5kZWZpbmVkJyApIHtcclxuICAgICAgICBlcnJvciA9IHsgc3RhdHVzOiAwLCBtZXNzYWdlOiAnMCAoVGltZW91dCkgTm8gcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLicgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRGVidWcgZXJyb3Igb3V0cHV0XHJcbiAgICAgIGlmICggQnJpZGdlLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgUmVxdWVzdCB8IFwiICsgZXJyb3Iuc3RhdHVzLnRvU3RyaW5nKCkgKyBcIiA+PiBcIiArIGVycm9yLm1lc3NhZ2UgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gUmVqZWN0IHRoZSBkZWZlcnJlZCBhbmQgcmV0dXJuIHRoZSBlcnJvciBvYmplY3QgbWF0Y2hpbmcgdGhpcyBzdGF0dXMgY29kZSBhbmQgdGhlIFhIUi5cclxuICAgICAgZGVmZXJyZWQucmVqZWN0KCBlcnJvciApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgc2VsZi5jcmVhdGVSZXF1ZXN0KCBtZXRob2QsIHNlbGYudXJsICsgcmVzb3VyY2UsIHNpZ25lZEhlYWRlciApLnRoZW4oIG9uVGhlbiApLmZhaWwoIG9uRmFpbCApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgcHJvbWlzZSBvYmplY3QgdG8gdGhlIGNhbGxlclxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQUklWQVRFXSByZXF1ZXN0Q2hhbmdlUGFzc3dvcmRQcml2YXRlKClcclxuICAvLyBBc2sgdGhlIHNlcnZlciB0byBjaGFuZ2UgdGhlIHBhc3N3b3JkIG9mIHRoZSBjdXJlbnRseSBsb2dnZWQtaW4gdXNlci4gVGhpcyBvcGVyYXRpb24gcmVxdWlyZXNcclxuICAvLyB0aGUgdXNlcidzIGN1cnJlbnQgcGFzc3dvcmQgdG8gYmUgc3VwcGxpZWQgYW5kIGNyZWF0ZXMgYSB0ZW1wb3JhcnkgSWRlbnRpdHkgb2JqZWN0IHRvIHNlbmQgdGhlXHJcbiAgLy8gcmVxdWVzdCBmb3IgYSBwYXNzd29yZCBjaGFuZ2UgdG8gdmVyaWZ5IHRoYXQgYW5vdGhlciBpbmRpdmlkdWFsIGRpZG4ndCBqdXN0IGhvcCBvbnRvIGEgbG9nZ2VkLVxyXG4gIC8vIGluIGNvbXB1dGVyIGFuZCBjaGFuZ2UgYSB1c2VyJ3MgcGFzc3dvcmQgd2hpbGUgdGhleSB3ZXJlIGF3YXkgZnJvbSB0aGVpciBjb21wdXRlci5cclxuICB2YXIgcmVxdWVzdENoYW5nZVBhc3N3b3JkUHJpdmF0ZSA9IGZ1bmN0aW9uICggb2xkUGFzc3dvcmQsIG5ld1Bhc3N3b3JkICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgY2hhbmdlUGFzc3dvcmQgY2FsbCBvY2N1cnJpbmcuXHJcbiAgICBpZiAoIHR5cGVvZiBzZWxmLm9uRkNoYW5nZVBhc3N3b3JkID09PSBcImZ1bmN0aW9uXCIgKSB7XHJcbiAgICAgIHNlbGYub25DaGFuZ2VQYXNzd29yZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byByZXR1cm4gc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgc3VjY2Vzcy9mYWlsdXJlIGNvbnZlbmllbnRseS5cclxuICAgIHZhciBkZWZlcnJlZCA9IG5ldyBRLmRlZmVyKCk7XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIHN1Y2Nlc3MgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZXNvbHZlKCkpXHJcbiAgICB2YXIgb25UaGVuID0gZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgY29udGVudCB0eXBlIChNZXNzYWdlKSBpcyBmb3JtYXR0ZWQgY29ycmVjdGx5LlxyXG4gICAgICBpZiAoIHR5cGVvZiBkYXRhLmNvbnRlbnQubWVzc2FnZSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgb25GYWlsKCB7IHN0YXR1czogNDE3LCBtZXNzYWdlOiAnNDE3IChFeHBlY3RhdGlvbiBGYWlsZWQpIE1hbGZvcm1lZCBtZXNzYWdlLicgfSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2V0IEJyaWRnZSdzIGlkZW50aXR5IG9iamVjdCB1c2luZyB0aGUgbmV3IHBhc3N3b3JkLCBzaW5jZSBmdXR1cmUgcmVxdWVzdHMgd2lsbCBuZWVkIHRvIGJlIFxyXG4gICAgICAvLyBzaWduZWQgd2l0aCB0aGUgbmV3IHVzZXIgY3JlZGVudGlhbHMuXHJcbiAgICAgIHNldElkZW50aXR5KCBpZGVudGl0eS5lbWFpbCwgbmV3SGFzaGVkUGFzc3dvcmQsIHRydWUgKTtcclxuXHJcbiAgICAgIC8vIExvZyB0aGUgc3VjY2VzcyB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IENoYW5nZSBQYXNzd29yZCB8IFwiICsgZGF0YS5jb250ZW50Lm1lc3NhZ2UgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2lnbmFsIHRoZSBkZWZlcnJlZCBvYmplY3QgdG8gdXNlIGl0cyBzdWNjZXNzKCkgaGFuZGxlci5cclxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSggZGF0YSApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIGZhaWx1cmUgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZWplY3QoKSlcclxuICAgIHZhciBvbkZhaWwgPSBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gTG9nIHRoZSBlcnJvciB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBCcmlkZ2UuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvciggXCJCUklER0UgfCBDaGFuZ2UgUGFzc3dvcmQgfCBcIiArIGVycm9yLnN0YXR1cy50b1N0cmluZygpICsgXCIgPj4gXCIgKyBlcnJvci5tZXNzYWdlICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgY2F0Y2goKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yICk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBDaGVjayBpcyB0aGUgdXNlciBpcyBsb2dnZWQgaW4gYmVmb3JlIGF0dGVtcHRpbmcgdG8gY2hhbmdlIHRoZWlyIHBhc3N3b3JkLlxyXG4gICAgaWYgKCAhc2VsZi5pc0xvZ2dlZEluKCkgKSB7XHJcbiAgICAgIG9uRmFpbCggeyBzdGF0dXM6IDQxMiwgbWVzc2FnZTogJzQxMiAoUHJlY29uZGl0aW9uIEZhaWxlZCkgTnVsbCB1c2VyIGlkZW50aXR5LicgfSApO1xyXG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBIYXNoIHRoZSB1c2VyJ3MgcGFzc3dvcmRzXHJcbiAgICB2YXIgb2xkSGFzaGVkUGFzc3dvcmQgPSBDcnlwdG9TaGEyNTYoIG9sZFBhc3N3b3JkICkudG9TdHJpbmcoIENyeXB0b0VuY0hleCApO1xyXG4gICAgdmFyIG5ld0hhc2hlZFBhc3N3b3JkID0gQ3J5cHRvU2hhMjU2KCBuZXdQYXNzd29yZCApLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKTtcclxuXHJcbiAgICAvLyBDbGVhciB0aGUgdW5lbmNyeXB0ZWQgcGFzc3dvcmRzIGZyb20gbWVtb3J5XHJcbiAgICBvbGRQYXNzd29yZCA9IG51bGw7XHJcbiAgICBuZXdQYXNzd29yZCA9IG51bGw7XHJcblxyXG4gICAgLy8gQnVpbGQgdGhlIHBheWxvYWQgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdFxyXG4gICAgdmFyIHBheWxvYWQgPSB7XHJcbiAgICAgIFwiYXBwRGF0YVwiOiB7fSxcclxuICAgICAgXCJlbWFpbFwiOiAnJyxcclxuICAgICAgXCJmaXJzdE5hbWVcIjogJycsXHJcbiAgICAgIFwibGFzdE5hbWVcIjogJycsXHJcbiAgICAgIFwicGFzc3dvcmRcIjogbmV3SGFzaGVkUGFzc3dvcmRcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ29uZmlndXJlIGEgdGVtcG9yYXJ5IElkZW50aXR5IG9iamVjdCB3aXRoIHRoZSB1c2VyJ3MgY3JlZGVudGlhbHMsIHVzaW5nIHRoZSBwYXNzd29yZCBcclxuICAgIC8vIHJlY2VpdmVkIGFzIGEgcGFyYW1ldGVyIHRvIGRvdWJsZS1jb25maXJtIHRoZSB1c2VyJ3MgaWRlbnRpdHkgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZXkgXHJcbiAgICAvLyBjaGFuZ2UgdGhlaXIgYWNjb3VudCBwYXNzd29yZC5cclxuICAgIHZhciB0ZW1wSWRlbnRpdHkgPSBuZXcgSWRlbnRpdHkoIGlkZW50aXR5LmVtYWlsLCBvbGRIYXNoZWRQYXNzd29yZCwgdHJ1ZSApO1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3RQcml2YXRlKCAnUFVUJywgJ3VzZXJzJywgcGF5bG9hZCwgdGVtcElkZW50aXR5ICkudGhlbiggb25UaGVuICkuZmFpbCggb25GYWlsICk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSBkZWZlcnJlZCBvYmplY3Qgc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgZXJyb3JzIGFzIHRoZXkgY2hvb3NlLlxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQUklWQVRFXSByZXF1ZXN0Rm9yZ290UGFzc3dvcmRQcml2YXRlKClcclxuICAvLyBBc2sgdGhlIHNlcnZlciB0byBzZXQgdGhlIHVzZXIgaW50byByZWNvdmVyeSBzdGF0ZSBmb3IgYSBzaG9ydCBwZXJpb2Qgb2YgdGltZSBhbmQgc2VuZCBhblxyXG4gIC8vIGFjY291bnQgcmVjb3ZlcnkgZW1haWwgdG8gdGhlIGVtYWlsIGFjY291bnQgcHJvdmlkZWQgaGVyZSwgYXMgbG9uZyBhcyBpdCBpZGVudGlmaWVzIGEgdXNlclxyXG4gIC8vIGluIHRoZSBkYXRhYmFzZS5cclxuICB2YXIgcmVxdWVzdEZvcmdvdFBhc3N3b3JkUHJpdmF0ZSA9IGZ1bmN0aW9uICggZW1haWwgKSB7XHJcblxyXG4gICAgLy8gTm90aWZ5IHRoZSB1c2VyIG9mIHRoZSBmb3Jnb3RQYXNzd29yZCBjYWxsIG9jY3VycmluZy5cclxuICAgIGlmICggdHlwZW9mIHNlbGYub25Gb3Jnb3RQYXNzd29yZCA9PT0gXCJmdW5jdGlvblwiICkge1xyXG4gICAgICBzZWxmLm9uRm9yZ290UGFzc3dvcmQoIGVtYWlsICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgb2JqZWN0IHRvIHJldHVybiBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBzdWNjZXNzL2ZhaWx1cmUgY29udmVuaWVudGx5LlxyXG4gICAgdmFyIGRlZmVycmVkID0gbmV3IFEuZGVmZXIoKTtcclxuXHJcbiAgICAvLyBCdWlsZCBvdXIgaW50ZXJuYWwgc3VjY2VzcyBoYW5kbGVyICh0aGlzIGNhbGxzIGRlZmVycmVkLnJlc29sdmUoKSlcclxuICAgIHZhciBvblRoZW4gPSBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBDaGVjayB0aGF0IHRoZSBjb250ZW50IHR5cGUgKE1lc3NhZ2UpIGlzIGZvcm1hdHRlZCBjb3JyZWN0bHkuXHJcbiAgICAgIGlmICggdHlwZW9mIGRhdGEuY29udGVudC5tZXNzYWdlICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBvbkZhaWwoIHsgc3RhdHVzOiA0MTcsIG1lc3NhZ2U6ICc0MTcgKEV4cGVjdGF0aW9uIEZhaWxlZCkgTWFsZm9ybWVkIG1lc3NhZ2UuJyB9ICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBMb2cgdGhlIHN1Y2Nlc3MgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggc2VsZi5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyggXCJCUklER0UgfCBGb3Jnb3QgUGFzc3dvcmQgfCBcIiArIGRhdGEuY29udGVudC5tZXNzYWdlICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgc3VjY2VzcygpIGhhbmRsZXIuXHJcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoIGRhdGEgKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEJ1aWxkIG91ciBpbnRlcm5hbCBmYWlsdXJlIGhhbmRsZXIgKHRoaXMgY2FsbHMgZGVmZXJyZWQucmVqZWN0KCkpXHJcbiAgICB2YXIgb25GYWlsID0gZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIExvZyB0aGUgZXJyb3IgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggQnJpZGdlLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgRm9yZ290IFBhc3N3b3JkIHwgXCIgKyBlcnJvci5zdGF0dXMudG9TdHJpbmcoKSArIFwiID4+IFwiICsgZXJyb3IubWVzc2FnZSApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTaWduYWwgdGhlIGRlZmVycmVkIG9iamVjdCB0byB1c2UgaXRzIGNhdGNoKCkgaGFuZGxlci5cclxuICAgICAgZGVmZXJyZWQucmVqZWN0KCBlcnJvciApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgdGhlIHBheWxvYWQgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdFxyXG4gICAgdmFyIHBheWxvYWQgPSB7XHJcbiAgICAgIFwibWVzc2FnZVwiOiBlbWFpbFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSB0ZW1wb3JhcnkgSWRlbnRpdHkgb2JqZWN0IHdpdGggYSBibGFuayBwYXNzd29yZC5cclxuICAgIHZhciB0ZW1wSWRlbnRpdHkgPSBuZXcgSWRlbnRpdHkoICcnLCAnJywgdHJ1ZSApO1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3RQcml2YXRlKCAnUFVUJywgJ2ZvcmdvdC1wYXNzd29yZCcsIHBheWxvYWQsIHRlbXBJZGVudGl0eSApLnRoZW4oIG9uVGhlbiApLmZhaWwoIG9uRmFpbCApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdExvZ2luUHJpdmF0ZSgpXHJcbiAgLy8gTG9nIGluIGEgdXNlciB3aXRoIHRoZSBnaXZlbiBlbWFpbC9wYXNzd29yZCBwYWlyLiBUaGlzIGNyZWF0ZXMgYSBuZXcgSWRlbnRpdHkgb2JqZWN0XHJcbiAgLy8gdG8gc2lnbiByZXF1ZXN0cyBmb3IgYXV0aGVudGljYXRpb24gYW5kIHBlcmZvcm1zIGFuIGluaXRpYWwgcmVxdWVzdCB0byB0aGUgc2VydmVyIHRvXHJcbiAgLy8gc2VuZCBhIGxvZ2luIHBhY2thZ2UuXHJcbiAgdmFyIHJlcXVlc3RMb2dpblByaXZhdGUgPSBmdW5jdGlvbiAoIGVtYWlsLCBwYXNzd29yZCwgdXNlTG9jYWxTdG9yYWdlLCBkb250SGFzaFBhc3N3b3JkICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgbG9naW4gY2FsbCBvY2N1cnJpbmcuXHJcbiAgICBpZiAoIHR5cGVvZiBzZWxmLm9uTG9naW5DYWxsZWQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vbkxvZ2luQ2FsbGVkKCBlbWFpbCwgdXNlTG9jYWxTdG9yYWdlICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSGFzaCB0aGUgdXNlcidzIHBhc3N3b3JkXHJcbiAgICB2YXIgaGFzaGVkUGFzc3dvcmQgPSAoIGRvbnRIYXNoUGFzc3dvcmQgPT09IHRydWUgKSA/IHBhc3N3b3JkIDpcclxuICAgICAgQ3J5cHRvU2hhMjU2KCBwYXNzd29yZCApLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKTtcclxuXHJcbiAgICAvLyBDbGVhciB0aGUgdW5lbmNyeXB0ZWQgcGFzc3dvcmQgZnJvbSBtZW1vcnlcclxuICAgIHBhc3N3b3JkID0gbnVsbDtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBkZWZlcnJlZCBvYmplY3QgdG8gcmV0dXJuIHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIHN1Y2Nlc3MvZmFpbHVyZSBjb252ZW5pZW50bHkuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBuZXcgUS5kZWZlcigpO1xyXG5cclxuICAgIC8vIEJ1aWxkIG91ciBpbnRlcm5hbCBzdWNjZXNzIGhhbmRsZXIgKHRoaXMgY2FsbHMgZGVmZXJyZWQucmVzb2x2ZSgpKVxyXG4gICAgdmFyIG9uVGhlbiA9IGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIENoZWNrIHRoYXQgdGhlIGNvbnRlbnQgdHlwZSAoTG9naW4gUGFja2FnZSkgaXMgZm9ybWF0dGVkIGNvcnJlY3RseS5cclxuICAgICAgaWYgKCB0eXBlb2YgZGF0YS5jb250ZW50LnVzZXIgIT09ICdvYmplY3QnICkge1xyXG4gICAgICAgIG9uRmFpbCggeyBzdGF0dXM6IDQxNywgbWVzc2FnZTogJzQxNyAoRXhwZWN0YXRpb24gRmFpbGVkKSBNYWxmb3JtZWQgbG9naW4gcGFja2FnZS4nIH0gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIExvZyB0aGUgc3VjY2VzcyB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IExvZ2luIHwgXCIgKyBKU09OLnN0cmluZ2lmeSggZGF0YS5jb250ZW50ICkgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2V0IHRoZSB1c2VyIG9iamVjdCB1c2luZyB0aGUgdXNlciBkYXRhIHRoYXQgd2FzIHJldHVybmVkXHJcbiAgICAgIHNldFVzZXIoIGRhdGEuY29udGVudC51c2VyLCBkYXRhLmNvbnRlbnQuYWRkaXRpb25hbERhdGEgKTtcclxuXHJcbiAgICAgIC8vIFN0b3JlIHRoaXMgaWRlbnRpdHkgdG8gbG9jYWwgc3RvcmFnZSwgaWYgdGhhdCB3YXMgcmVxdWVzdGVkLlxyXG4gICAgICAvLyBbU0VDVVJJVFkgTk9URSAxXSB1c2VMb2NhbFN0b3JhZ2Ugc2hvdWxkIGJlIHNldCBiYXNlZCBvbiB1c2VyIGlucHV0LCBieSBhc2tpbmcgd2hldGhlciBcclxuICAgICAgLy8gdGhlIHVzZXIgaXMgb24gYSBwcml2YXRlIGNvbXB1dGVyIG9yIG5vdC4gVGhpcyBpcyBjYW4gYmUgY29uc2lkZXJlZCBhIHRvbGVyYWJsZVxyXG4gICAgICAvLyBzZWN1cml0eSByaXNrIGFzIGxvbmcgYXMgdGhlIHVzZXIgaXMgb24gYSBwcml2YXRlIGNvbXB1dGVyIHRoYXQgdGhleSB0cnVzdCBvciBtYW5hZ2VcclxuICAgICAgLy8gdGhlbXNlbHZlcy4gSG93ZXZlciwgb24gYSBwdWJsaWMgbWFjaGluZSB0aGlzIGlzIHByb2JhYmx5IGEgc2VjdXJpdHkgcmlzaywgYW5kIHRoZVxyXG4gICAgICAvLyB1c2VyIHNob3VsZCBiZSBhYmxlIHRvIGRlY2xpbmUgdGhpcyBjb252ZW5jaWVuY2UgaW4gZmF2b3VyIG9mIHNlY3VyaXR5LCByZWdhcmRsZXNzXHJcbiAgICAgIC8vIG9mIHdoZXRoZXIgdGhleSBhcmUgb24gYSBwdWJsaWMgbWFjaGluZSBvciBub3QuXHJcbiAgICAgIGlmICggc2VsZi51c2VMb2NhbFN0b3JhZ2UgKSB7XHJcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oICdicmlkZ2UtY2xpZW50LWlkZW50aXR5JywgSlNPTi5zdHJpbmdpZnkoIHtcclxuICAgICAgICAgICd0dGwnOiA4NjQwMDAwMCwgLy8gRXhwaXJlIGluIDEgZGF5XHJcbiAgICAgICAgICAnbm93JzogbmV3IERhdGUoKSwgLy8gRnJvbSBub3dcclxuICAgICAgICAgICd2YWx1ZSc6IHsgLy8gU3RvcmUgdGhpcyBkYXRhXHJcbiAgICAgICAgICAgIFwiZW1haWxcIjogZW1haWwsXHJcbiAgICAgICAgICAgIFwicGFzc3dvcmRcIjogaGFzaGVkUGFzc3dvcmRcclxuICAgICAgICAgIH1cclxuICAgICAgICB9ICkgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2lnbmFsIHRoZSBkZWZlcnJlZCBvYmplY3QgdG8gdXNlIGl0cyBzdWNjZXNzKCkgaGFuZGxlci5cclxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSggZGF0YSApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIGZhaWx1cmUgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZWplY3QoKSlcclxuICAgIHZhciBvbkZhaWwgPSBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gQ2xlYXIgdGhlIHVzZXIgY3JlZGVudGlhbHMsIHNpbmNlIHRoZXkgZGlkbid0IHdvcmsgYW55d2F5LlxyXG4gICAgICBjbGVhclVzZXIoKTtcclxuXHJcbiAgICAgIC8vIExvZyB0aGUgZXJyb3IgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggQnJpZGdlLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgTG9naW4gfCBcIiArIGVycm9yLnN0YXR1cy50b1N0cmluZygpICsgXCIgPj4gXCIgKyBlcnJvci5tZXNzYWdlICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgY2F0Y2goKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yICk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBUaGlzIHJlcXVlc3QgdXNlcyBhbiBlbXB0eSBwYXlsb2FkXHJcbiAgICB2YXIgcGF5bG9hZCA9IHt9O1xyXG5cclxuICAgIC8vIFNldCB3aGV0aGVyIG9yIG5vdCB0aGUgQnJpZGdlIHNob3VsZCBzdG9yZSB1c2VyIGNyZWRlbnRpYWxzIGFuZCBCcmlkZ2UgY29uZmlndXJhdGlvblxyXG4gICAgLy8gdG8gbG9jYWwgc3RvcmFnZS5cclxuICAgIHNlbGYudXNlTG9jYWxTdG9yYWdlID0gdXNlTG9jYWxTdG9yYWdlO1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSBhbiBJZGVudGl0eSBvYmplY3Qgd2l0aCB0aGUgdXNlcidzIGNyZWRlbnRpYWxzLlxyXG4gICAgc2V0SWRlbnRpdHkoIGVtYWlsLCBoYXNoZWRQYXNzd29yZCwgdHJ1ZSApO1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3RQcml2YXRlKCAnR0VUJywgJ2xvZ2luJywgcGF5bG9hZCApLnRoZW4oIG9uVGhlbiApLmZhaWwoIG9uRmFpbCApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdFJlY292ZXJQYXNzd29yZFByaXZhdGUoKVxyXG4gIC8vIFRvIGJlIGNhbGxlZCBieSB0aGUgcGFnZSBhdCB0aGUgYWRkcmVzcyB3aGljaCBhbiBhY2NvdW50IHJlY292ZXJ5IGVtYWlsIGxpbmtzIHRoZSB1c2VyXHJcbiAgLy8gdG8uIFRoZXkgd2lsbCBoYXZlIGVudGVyZWQgdGhlaXIgbmV3IHBhc3N3b3JkIHRvIGFuIGlucHV0IGZpZWxkLCBhbmQgdGhlIGVtYWlsIGFuZCBoYXNoIHdpbGwgXHJcbiAgLy8gaGF2ZSBiZWVuIG1hZGUgYXZhaWxhYmxlIHRvIHRoZSBwYWdlIGluIHRoZSBxdWVyeSBzdHJpbmcgb2YgdGhlIFVSTC5cclxuICB2YXIgcmVxdWVzdFJlY292ZXJQYXNzd29yZFByaXZhdGUgPSBmdW5jdGlvbiAoIHBhc3N3b3JkLCBoYXNoICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgcmVjb3ZlciBwYXNzd29yZCBjYWxsIG9jY3VycmluZy5cclxuICAgIGlmICggdHlwZW9mIHNlbGYub25SZWNvdmVyUGFzc3dvcmRDYWxsZWQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vblJlY292ZXJQYXNzd29yZENhbGxlZCggaGFzaCApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEhhc2ggdGhlIHVzZXIncyBwYXNzd29yZFxyXG4gICAgdmFyIGhhc2hlZFBhc3N3b3JkID0gQ3J5cHRvU2hhMjU2KCBwYXNzd29yZCApLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKTtcclxuXHJcbiAgICAvLyBDbGVhciB0aGUgdW5lbmNyeXB0ZWQgcGFzc3dvcmQgZnJvbSBtZW1vcnlcclxuICAgIHBhc3N3b3JkID0gbnVsbDtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBkZWZlcnJlZCBvYmplY3QgdG8gcmV0dXJuIHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIHN1Y2Nlc3MvZmFpbHVyZSBjb252ZW5pZW50bHkuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBuZXcgUS5kZWZlcigpO1xyXG5cclxuICAgIC8vIEJ1aWxkIG91ciBpbnRlcm5hbCBzdWNjZXNzIGhhbmRsZXIgKHRoaXMgY2FsbHMgZGVmZXJyZWQucmVzb2x2ZSgpKVxyXG4gICAgdmFyIG9uVGhlbiA9IGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIENoZWNrIHRoYXQgdGhlIGNvbnRlbnQgdHlwZSAoTWVzc2FnZSkgaXMgZm9ybWF0dGVkIGNvcnJlY3RseS5cclxuICAgICAgaWYgKCB0eXBlb2YgZGF0YS5jb250ZW50Lm1lc3NhZ2UgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIG9uRmFpbCggeyBzdGF0dXM6IDQxNywgbWVzc2FnZTogJzQxNyAoRXhwZWN0YXRpb24gRmFpbGVkKSBNYWxmb3JtZWQgbWVzc2FnZS4nIH0gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIExvZyB0aGUgc3VjY2VzcyB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IFJlY292ZXIgUGFzc3dvcmQgfCBcIiArIGRhdGEuY29udGVudC5tZXNzYWdlICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgc3VjY2VzcygpIGhhbmRsZXIuXHJcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoIGRhdGEgKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEJ1aWxkIG91ciBpbnRlcm5hbCBmYWlsdXJlIGhhbmRsZXIgKHRoaXMgY2FsbHMgZGVmZXJyZWQucmVqZWN0KCkpXHJcbiAgICB2YXIgb25GYWlsID0gZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIExvZyB0aGUgZXJyb3IgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggQnJpZGdlLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgUmVjb3ZlciBQYXNzd29yZCB8IFwiICsgZXJyb3Iuc3RhdHVzLnRvU3RyaW5nKCkgKyBcIiA+PiBcIiArIGVycm9yLm1lc3NhZ2UgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2lnbmFsIHRoZSBkZWZlcnJlZCBvYmplY3QgdG8gdXNlIGl0cyBjYXRjaCgpIGhhbmRsZXIuXHJcbiAgICAgIGRlZmVycmVkLnJlamVjdCggZXJyb3IgKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEJ1aWxkIHRoZSBwYXlsb2FkIG9iamVjdCB0byBzZW5kIHdpdGggdGhlIHJlcXVlc3RcclxuICAgIHZhciBwYXlsb2FkID0ge1xyXG4gICAgICBcImhhc2hcIjogaGFzaCxcclxuICAgICAgXCJtZXNzYWdlXCI6IGhhc2hlZFBhc3N3b3JkXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBhbiBJZGVudGl0eSBvYmplY3Qgd2l0aCBhIGJsYW5rIHBhc3N3b3JkLlxyXG4gICAgdmFyIHRlbXBJZGVudGl0eSA9IG5ldyBJZGVudGl0eSggJycsICcnLCB0cnVlICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdFByaXZhdGUoICdQVVQnLCAncmVjb3Zlci1wYXNzd29yZCcsIHBheWxvYWQsIHRlbXBJZGVudGl0eSApLnRoZW4oIG9uVGhlbiApLmZhaWwoIG9uRmFpbCApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdFJlZ2lzdGVyUHJpdmF0ZSgpXHJcbiAgLy8gUmVnaXN0ZXIgaW4gYSB1c2VyIHdpdGggdGhlIGdpdmVuIGVtYWlsL3Bhc3N3b3JkIHBhaXIsIG5hbWUsIGFuZCBhcHBsaWNhdGlvbi1zcGVjaWZpYyBkYXRhLlxyXG4gIC8vIFRoaXMgZG9lcyBjcmVhdGVzIGFuIElkZW50aXR5IG9iamVjdCBmb3IgdGhlIHVzZXIgdG8gc2lnbiB0aGUgcmVnaXN0cmF0aW9uIHJlcXVlc3QncyBITUFDLFxyXG4gIC8vIGhvd2V2ZXIgdGhlIHBhc3N3b3JkIGlzIHRyYW5zbWl0dGVkIGluIHRoZSBjb250ZW50IG9mIHRoZSBtZXNzYWdlIChTSEEtMjU2IGVuY3J5cHRlZCksIHNvXHJcbiAgLy8gdGhlb3JldGljYWxseSBhbiBpbnRlcmNlcHRvciBvZiB0aGlzIG1lc3NhZ2UgY291bGQgcmVjb25zdHJ1Y3QgdGhlIEhNQUMgYW5kIGZhbHNpZnkgYSByZXF1ZXN0XHJcbiAgLy8gdG8gdGhlIHNlcnZlciB0aGUgcmVxdWVzdCBpcyBtYWRlIHdpdGhvdXQgdXNpbmcgSFRUUFMgcHJvdG9jb2wgYW5kIGdpdmVuIGVub3VnaCBwZXJzaXN0ZW5jZVxyXG4gIC8vIG9uIHRoZSBwYXJ0IG9mIHRoZSBhdHRhY2tlci4gXHJcbiAgdmFyIHJlcXVlc3RSZWdpc3RlclByaXZhdGUgPSBmdW5jdGlvbiAoIGVtYWlsLCBwYXNzd29yZCwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgYXBwRGF0YSApIHtcclxuXHJcbiAgICAvLyBOb3RpZnkgdGhlIHVzZXIgb2YgdGhlIHJlZ2lzdGVyIGNhbGwgb2NjdXJyaW5nLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vblJlZ2lzdGVyQ2FsbGVkID09PSBcImZ1bmN0aW9uXCIgKSB7XHJcbiAgICAgIHNlbGYub25SZWdpc3RlckNhbGxlZCggZW1haWwsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGFwcERhdGEgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBIYXNoIHRoZSB1c2VyJ3MgcGFzc3dvcmRcclxuICAgIHZhciBoYXNoZWRQYXNzd29yZCA9IENyeXB0b1NoYTI1NiggcGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICk7XHJcblxyXG4gICAgLy8gQ2xlYXIgdGhlIHVuZW5jcnlwdGVkIHBhc3N3b3JkIGZyb20gbWVtb3J5XHJcbiAgICBwYXNzd29yZCA9IG51bGw7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgb2JqZWN0IHRvIHJldHVybiBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBzdWNjZXNzL2ZhaWx1cmUgY29udmVuaWVudGx5LlxyXG4gICAgdmFyIGRlZmVycmVkID0gbmV3IFEuZGVmZXIoKTtcclxuXHJcbiAgICAvLyBCdWlsZCBvdXIgaW50ZXJuYWwgc3VjY2VzcyBoYW5kbGVyICh0aGlzIGNhbGxzIGRlZmVycmVkLnJlc29sdmUoKSlcclxuICAgIHZhciBvblRoZW4gPSBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBDaGVjayB0aGF0IHRoZSBjb250ZW50IHR5cGUgKE1lc3NhZ2UpIGlzIGZvcm1hdHRlZCBjb3JyZWN0bHkuXHJcbiAgICAgIGlmICggdHlwZW9mIGRhdGEuY29udGVudC5tZXNzYWdlICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBvbkZhaWwoIHsgc3RhdHVzOiA0MTcsIG1lc3NhZ2U6ICc0MTcgKEV4cGVjdGF0aW9uIEZhaWxlZCkgTWFsZm9ybWVkIG1lc3NhZ2UuJyB9ICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBMb2cgdGhlIHN1Y2Nlc3MgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICAgIGlmICggc2VsZi5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyggXCJCUklER0UgfCBSZWdpc3RlciB8IFwiICsgZGF0YS5jb250ZW50Lm1lc3NhZ2UgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2lnbmFsIHRoZSBkZWZlcnJlZCBvYmplY3QgdG8gdXNlIGl0cyBzdWNjZXNzKCkgaGFuZGxlci5cclxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSggZGF0YSApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIGZhaWx1cmUgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZWplY3QoKSlcclxuICAgIHZhciBvbkZhaWwgPSBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gTG9nIHRoZSBlcnJvciB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBCcmlkZ2UuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvciggXCJCUklER0UgfCBSZWdpc3RlciB8IFwiICsgZXJyb3Iuc3RhdHVzLnRvU3RyaW5nKCkgKyBcIiA+PiBcIiArIGVycm9yLm1lc3NhZ2UgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2lnbmFsIHRoZSBkZWZlcnJlZCBvYmplY3QgdG8gdXNlIGl0cyBjYXRjaCgpIGhhbmRsZXIuXHJcbiAgICAgIGRlZmVycmVkLnJlamVjdCggZXJyb3IgKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEJ1aWxkIHRoZSBwYXlsb2FkIG9iamVjdCB0byBzZW5kIHdpdGggdGhlIHJlcXVlc3RcclxuICAgIHZhciBwYXlsb2FkID0ge1xyXG4gICAgICBcImFwcERhdGFcIjogYXBwRGF0YSxcclxuICAgICAgXCJlbWFpbFwiOiBlbWFpbCxcclxuICAgICAgXCJmaXJzdE5hbWVcIjogZmlyc3ROYW1lLFxyXG4gICAgICBcImxhc3ROYW1lXCI6IGxhc3ROYW1lLFxyXG4gICAgICBcInBhc3N3b3JkXCI6IGhhc2hlZFBhc3N3b3JkXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBhbiBJZGVudGl0eSBvYmplY3Qgd2l0aCBhIGJsYW5rIHBhc3N3b3JkLlxyXG4gICAgdmFyIHRlbXBJZGVudGl0eSA9IG5ldyBJZGVudGl0eSggJycsICcnLCB0cnVlICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdFByaXZhdGUoICdQT1NUJywgJ3VzZXJzJywgcGF5bG9hZCwgdGVtcElkZW50aXR5ICkudGhlbiggb25UaGVuICkuZmFpbCggb25GYWlsICk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSBkZWZlcnJlZCBvYmplY3Qgc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgZXJyb3JzIGFzIHRoZXkgY2hvb3NlLlxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQUklWQVRFXSByZXF1ZXN0VmVyaWZ5RW1haWxQcml2YXRlKClcclxuICAvLyBUbyBiZSBjYWxsZWQgYnkgdGhlIHBhZ2UgdGhlIGF0IGFkZHJlc3Mgd2hpY2ggYW4gZW1haWwgdmVyaWZpY2F0aW9uIGVtYWlsIGxpbmtzIHRoZSB1c2VyIHRvLlxyXG4gIC8vIFRoZSB1c2VyIHdpbGwgYmUgc2VudCB0byB0aGlzIHBhZ2Ugd2l0aCB0aGVpciBlbWFpbCBhbmQgYSBoYXNoIGluIHRoZSBxdWVyeSBzdHJpbmcgb2YgdGhlIFVSTC5cclxuICB2YXIgcmVxdWVzdFZlcmlmeUVtYWlsUHJpdmF0ZSA9IGZ1bmN0aW9uICggaGFzaCApIHtcclxuXHJcbiAgICAvLyBOb3RpZnkgdGhlIHVzZXIgb2YgdGhlIHZlcmlmeSBlbWFpbCBjYWxsIG9jY3VycmluZy5cclxuICAgIGlmICggdHlwZW9mIHNlbGYub25WZXJpZnlFbWFpbENhbGxlZCA9PT0gXCJmdW5jdGlvblwiICkge1xyXG4gICAgICBzZWxmLm9uVmVyaWZ5RW1haWxDYWxsZWQoIGhhc2ggKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgYSBkZWZlcnJlZCBvYmplY3QgdG8gcmV0dXJuIHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIHN1Y2Nlc3MvZmFpbHVyZSBjb252ZW5pZW50bHkuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBuZXcgUS5kZWZlcigpO1xyXG5cclxuICAgIC8vIEJ1aWxkIG91ciBpbnRlcm5hbCBzdWNjZXNzIGhhbmRsZXIgKHRoaXMgY2FsbHMgZGVmZXJyZWQucmVzb2x2ZSgpKVxyXG4gICAgdmFyIG9uVGhlbiA9IGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIENoZWNrIHRoYXQgdGhlIGNvbnRlbnQgdHlwZSAoTWVzc2FnZSkgaXMgZm9ybWF0dGVkIGNvcnJlY3RseS5cclxuICAgICAgaWYgKCB0eXBlb2YgZGF0YS5jb250ZW50Lm1lc3NhZ2UgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIG9uRmFpbCggeyBzdGF0dXM6IDQxNywgbWVzc2FnZTogJzQxNyAoRXhwZWN0YXRpb24gRmFpbGVkKSBNYWxmb3JtZWQgbWVzc2FnZS4nIH0gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIExvZyB0aGUgc3VjY2VzcyB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IFZlcmlmeSBFbWFpbCB8IFwiICsgZGF0YS5jb250ZW50Lm1lc3NhZ2UgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2lnbmFsIHRoZSBkZWZlcnJlZCBvYmplY3QgdG8gdXNlIGl0cyBzdWNjZXNzKCkgaGFuZGxlci5cclxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSggZGF0YSApO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgb3VyIGludGVybmFsIGZhaWx1cmUgaGFuZGxlciAodGhpcyBjYWxscyBkZWZlcnJlZC5yZWplY3QoKSlcclxuICAgIHZhciBvbkZhaWwgPSBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gTG9nIHRoZSBlcnJvciB0byB0aGUgY29uc29sZS5cclxuICAgICAgaWYgKCBCcmlkZ2UuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvciggXCJCUklER0UgfCBWZXJpZnkgRW1haWwgfCBcIiArIGVycm9yLnN0YXR1cy50b1N0cmluZygpICsgXCIgPj4gXCIgKyBlcnJvci5tZXNzYWdlICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNpZ25hbCB0aGUgZGVmZXJyZWQgb2JqZWN0IHRvIHVzZSBpdHMgY2F0Y2goKSBoYW5kbGVyLlxyXG4gICAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yICk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBCdWlsZCB0aGUgcGF5bG9hZCBvYmplY3QgdG8gc2VuZCB3aXRoIHRoZSByZXF1ZXN0XHJcbiAgICB2YXIgcGF5bG9hZCA9IHtcclxuICAgICAgXCJoYXNoXCI6IGhhc2hcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgdGVtcG9yYXJ5IGFuIElkZW50aXR5IG9iamVjdCB3aXRoIGEgYmxhbmsgcGFzc3dvcmQuXHJcbiAgICB2YXIgdGVtcElkZW50aXR5ID0gbmV3IElkZW50aXR5KCAnJywgJycsIHRydWUgKTtcclxuXHJcbiAgICAvLyBTZW5kIHRoZSByZXF1ZXN0XHJcbiAgICByZXF1ZXN0UHJpdmF0ZSggJ1BVVCcsICd2ZXJpZnktZW1haWwnLCBwYXlsb2FkLCB0ZW1wSWRlbnRpdHkgKS50aGVuKCBvblRoZW4gKS5mYWlsKCBvbkZhaWwgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGRlZmVycmVkIG9iamVjdCBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBlcnJvcnMgYXMgdGhleSBjaG9vc2UuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIHNldElkZW50aXR5KClcclxuICAvLyBTZXRzIHRoZSBjdXJyZW50IElkZW50aXR5IG9iamVjdCB0byBhIG5ldyBpbnN0YW5jZSBnaXZlbiBhIHVzZXIncyBlbWFpbCBhbmQgcGFzc3dvcmQuXHJcbiAgdmFyIHNldElkZW50aXR5ID0gZnVuY3Rpb24gKCBlbWFpbCwgcGFzc3dvcmQsIGRvbnRIYXNoUGFzc3dvcmQgKSB7XHJcblxyXG4gICAgaWRlbnRpdHkgPSBuZXcgSWRlbnRpdHkoIGVtYWlsLCBwYXNzd29yZCwgZG9udEhhc2hQYXNzd29yZCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gc2V0VXNlclxyXG4gIC8vIFNldHMgdGhlIGN1cnJlbnQgdXNlciBhbmQgYWRkaXRpb25hbCBkYXRhIG9iamVjdHMgYmFzZWQgb24gdGhlIGRhdGEgcmV0dXJuZWQgZnJvbSBhIGxvZ2luXHJcbiAgLy8gYW5kIHBlcmZvcm1zIGFsbCBvZiB0aGUgYXNzb2NpYXRlZCBlcnJvciBjaGVja3MgZm9yIG1hbGZvcm1lZCBsb2dpbiBkYXRhLlxyXG4gIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCB1c2VyLCBhZGRpdGlvbmFsRGF0YSApIHtcclxuXHJcbiAgICAvLyBTZXQgdGhlIHVzZXIgYW5kIGFkZGl0aW9uYWwgZGF0YSBvYmplY3RzXHJcbiAgICBzZWxmLnVzZXIgPSB1c2VyO1xyXG4gICAgc2VsZi5hZGRpdGlvbmFsRGF0YSA9IGFkZGl0aW9uYWxEYXRhO1xyXG5cclxuICB9O1xyXG5cclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gUFVCTElDIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy9cclxuICAvLyBQUk9QRVJUSUVTIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLyBbUFVCTElDXSBhZGRpdGlvbmFsRGF0YVxyXG4gIC8vIFRoZSBhIGhhc2htYXAgb2Ygb3B0aW9uYWwgb2JqZWN0cyByZXR1cm5lZCBieSB0aGUgdGhlIGRhdGFiYXNlIHRoYXQgcHJvdmlkZSBhZGRpdGlvbmFsXHJcbiAgLy8gaW5mb3JtYXRpb24gdG8gYmUgdXNlZCBmb3IgaW1wbGVtZW50YXRpb24tc3BlY2lmaWMgbG9naW4gbmVlZHMuXHJcbiAgc2VsZi5hZGRpdGlvbmFsRGF0YSA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIGRlYnVnXHJcbiAgLy8gSWYgc2V0IHRvIHRydWUsIEJyaWRnZSB3aWxsIGxvZyBlcnJvcnMgYW5kIHdhcm5pbmdzIHRvIHRoZSBjb25zb2xlIHdoZW4gdGhleSBvY2N1ci5cclxuICBzZWxmLmRlYnVnID0gZmFsc2U7XHJcblxyXG4gIC8vIFtQVUJMSUNdIHRpbWVvdXRcclxuICAvLyBUaGUgdGltZW91dCBwZXJpb2QgZm9yIHJlcXVlc3RzIChpbiBtaWxsaXNlY29uZHMpLlxyXG4gIHNlbGYudGltZW91dCA9IDEwMDAwO1xyXG5cclxuICAvLyBbUFVCTElDXSB1cmxcclxuICAvLyBUaGUgVVJMIHBhdGggdG8gdGhlIEFQSSB0byBiZSBicmlkZ2VkLiBUaGlzIFVSTCBtdXN0IGJlIHdyaXR0ZW4gc28gdGhhdCB0aGUgZmluYWwgXHJcbiAgLy8gY2hhcmFjdGVyIGlzIGEgZm9yd2FyZC1zbGFzaCAoZS5nLiBodHRwczovL3BlaXIuYXhvbmludGVyYWN0aXZlLmNhL2FwaS8xLjAvKS5cclxuICBzZWxmLnVybCA9ICcnO1xyXG5cclxuICAvLyBbUFVCTElDXSB1c2VMb2NhbFN0b3JhZ2VcclxuICAvLyBXaGV0aGVyIG9yIG5vdCB1c2VyIGNyZWRlbnRpYWxzIGFuZCBCcmlkZ2UgY29uZmlndXJhdGlvbiB3aWxsIGJlIHBlcnNpc3RlZCB0byBsb2NhbCBzdG9yYWdlLlxyXG4gIHNlbGYudXNlTG9jYWxTdG9yYWdlID0gZmFsc2U7XHJcblxyXG4gIC8vIFtQVUJMSUNdIHVzZXJcclxuICAvLyBUaGUgVXNlciBvYmplY3QgcmV0dXJuZWQgYnkgdGhlIHRoZSBkYXRhYmFzZSByZWxhdGluZyB0byB0aGUgY3VycmVudCBpZGVudGl0eS5cclxuICBzZWxmLnVzZXIgPSBudWxsO1xyXG5cclxuXHJcbiAgLy8vLy8vLy8vLy8vXHJcbiAgLy8gRVZFTlRTIC8vXHJcbiAgLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8vIFtQVUJMSUNdIG9uQ2hhbmdlUGFzc3dvcmRDYWxsZWQoKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gdGhlIHJlcXVlc3RDaGFuZ2VQYXNzd29yZCgpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICgpIHt9XHJcbiAgc2VsZi5vbkNoYW5nZVBhc3N3b3JkQ2FsbGVkID0gbnVsbDtcclxuXHJcbiAgLy8gW1BVQkxJQ10gb25Gb3Jnb3RQYXNzd29yZENhbGxlZCgpXHJcbiAgLy8gVGhlIGNhbGxiYWNrIHRvIGNhbGwgd2hlbiB0aGUgcmVxdWVzdEZvcmdvdFBhc3N3b3JkKCkgZnVuY3Rpb24gaXMgY2FsbGVkLlxyXG4gIC8vIFNpZ25hdHVyZTogZnVuY3Rpb24gKCBlbWFpbCApIHt9XHJcbiAgc2VsZi5vbkZvcmdvdFBhc3N3b3JkQ2FsbGVkID0gbnVsbDtcclxuXHJcbiAgLy8gW1BVQkxJQ10gb25Mb2dpbkNhbGxlZCgpXHJcbiAgLy8gVGhlIGNhbGxiYWNrIHRvIGNhbGwgd2hlbiB0aGUgcmVxdWVzdExvZ2luKCkgZnVuY3Rpb24gaXMgY2FsbGVkLlxyXG4gIC8vIFNpZ25hdHVyZTogZnVuY3Rpb24gKCBlbWFpbCwgdXNlTG9jYWxTdG9yYWdlICkge31cclxuICBzZWxmLm9uTG9naW5DYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSBsb2dpbkVycm9yQ2FsbGJhY2soKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gdGhlIGxvZ291dCgpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICgpIHt9XHJcbiAgc2VsZi5vbkxvZ291dENhbGxlZCA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIG9uUmVjb3ZlclBhc3N3b3JkQ2FsbGVkKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSByZXF1ZXN0UmVjb3ZlclBhc3N3b3JkKCkgZnVuY3Rpb24gaXMgY2FsbGVkLlxyXG4gIC8vIFNpZ25hdHVyZTogZnVuY3Rpb24gKCBlbWFpbCwgaGFzaCApIHt9XHJcbiAgc2VsZi5vblJlY292ZXJQYXNzd29yZENhbGxlZCA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIG9uUmVnaXN0ZXJDYWxsZWQoKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gdGhlIHJlcXVlc3RSZWdpc3RlcigpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggZW1haWwsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGFwcERhdGEgKSB7fVxyXG4gIHNlbGYub25SZWdpc3RlckNhbGxlZCA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIHJlcXVlc3RDYWxsYmFjaygpXHJcbiAgLy8gVGhlIGNhbGxiYWNrIHRvIGNhbGwgd2hlbiBhIHJlcXVlc3QoKSBjYWxsIG9jY3VycywgYnV0IGJlZm9yZSBpdCBpcyBzZW50LlxyXG4gIC8vIFNpZ25hdHVyZTogZnVuY3Rpb24gKCBtZXRob2QsIHJlc291cmNlLCBwYXlsb2FkICkge31cclxuICBzZWxmLm9uUmVxdWVzdENhbGxlZCA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIG9uVmVyaWZ5RW1haWxDYWxsZWQoKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gdGhlIHJlcXVlc3RWZXJpZnlFbWFpbCgpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggZW1haWwsIGhhc2ggKSB7fVxyXG4gIHNlbGYub25WZXJpZnlFbWFpbENhbGxlZCA9IG51bGw7XHJcblxyXG5cclxuICAvLy8vLy8vLy8vXHJcbiAgLy8gSU5JVCAvL1xyXG4gIC8vLy8vLy8vLy9cclxuXHJcbiAgLy8gW1BVQkxJQ10gaW5pdCgpXHJcbiAgLy8gU2V0cyB1cCB0aGUgZXNzZW50aWFsIEJyaWRnZSBDbGllbnQgdmFyaWFibGVzLlxyXG4gIHNlbGYuaW5pdCA9IGZ1bmN0aW9uICggdXJsLCB0aW1lb3V0ICkge1xyXG4gICAgc2VsZi50aW1lb3V0ID0gdGltZW91dDtcclxuICAgIHNlbGYudXJsID0gdXJsO1xyXG4gIH07XHJcblxyXG5cclxuICAvLy8vLy8vLy8vLy8vLy9cclxuICAvLyBGVU5DVElPTlMgLy9cclxuICAvLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLy8gW1BVQkxJQ10gY3JlYXRlUmVxdWVzdCgpXHJcbiAgLy8gVGhpcyBmdW5jdGlvbiBwcm92aWRlcyB0aGUgbG93ZXN0LWxldmVsIGludGVyZmFjZSB0byB0aGUgWEhSIGZ1bmN0aW9uYWxpdHkgdGhhdCB0aGUgQnJpZGdlIFxyXG4gIC8vIENsaWVudCBpcyBvcGVyYXRpbmcgb24gdG9wIG9mLiBUaGlzIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIG9ubHkgZm9yIGlzc3VpbmcgYSByZXF1ZXN0IGFuZCBcclxuICAvLyByZXR1cm5pbmcgYSBRIHByb21pc2UgYW5kIGhvb2tpbmcgdXAgdGhlIHJlc29sdmUoKSBhbmQgcmVqZWN0KCkgbWV0aG9kcyB0byB0aGUgcmVzdWx0cyBvZiB0aGUgXHJcbiAgLy8gWEhSIHJlcXVlc3QuXHJcbiAgLy8gTm90ZTogQW55IGZ1bmN0aW9uIGFzc2lnbmVkIHRvIHRoaXMgdmFyaWFibGUgbXVzdCBhY2NlcHQgdGhlIHNhbWUgMyBhcmd1bWVudHMsIGFuZCBpdCBtdXN0IFxyXG4gIC8vIHJldHVybiBhIHByb21pc2UgdGhhdCBtYXRjaGVzIHRoZSBRIHByb21pc2UgaW50ZXJmYWNlIChtdXN0IGhhdmUgdGhlbigpIGFuZCBjYXRjaCgpIGF0IGxlYXN0KS5cclxuICBzZWxmLmNyZWF0ZVJlcXVlc3QgPSBmdW5jdGlvbiggbWV0aG9kLCB1cmwsIHNpZ25lZEhlYWRlciApIHtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBuZXcgWGhySHR0cFJlcXVlc3QgYW5kIGEgUSBkZWZlcnJlZCB0byB3cmFwIGl0LlxyXG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG4gICAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSB0aGUgWEhSIHJlcXVlc3RcclxuICAgIHhoci5vcGVuKCBtZXRob2QudG9VcHBlckNhc2UoKSwgdXJsLCB0cnVlICk7XHJcbiAgICB4aHIuc2V0UmVxdWVzdEhlYWRlciggJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyApO1xyXG4gICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoICdCcmlkZ2UnLCBKU09OLnN0cmluZ2lmeSggc2lnbmVkSGVhZGVyICkgKTtcclxuICAgIHhoci50aW1lb3V0ID0gc2VsZi50aW1lb3V0O1xyXG4gICAgXHJcbiAgICAvLyBBc3NpZ24gdGhlIGNhbGxiYWNrIGZvciBhbGwgb25yZWFkeXN0YXRlY2hhbmdlIFhIUiBldmVudHNcclxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIC8vIE9ubHkgd2hlbiB0aGUgWEhSIHN0YXRlIHRyYW5zaXRpb25zIHRvIGNvbXBsZXRlZFxyXG4gICAgICBpZiAoIHhoci5yZWFkeVN0YXRlID09PSA0ICkge1xyXG4gICAgICAgIC8vIFVzZSBpc0Vycm9yQ29kZVJlc3BvbnNlKCkgdG8gc2NyZWVuIGZvciBlcnJvciBjb2RlcyB0aGF0IG1pZ2h0IGJlIHJldHVybmVkIGJ5IHRoZSBCcmlkZ2UgXHJcbiAgICAgICAgLy8gU2VydmVyLiBJZiB0aGUgc3RhdHVzIGNvZGUgd2UgZ290IGJhY2sgY2FuJ3QgYmUgY2xhc3NpZmllZCBhcyBhbnl0aGluZyBoeSBcclxuICAgICAgICAvLyBpc0Vycm9yQ29kZVJlc3BvbnNlKCksIGEgbnVsbCBlcnJvciBpcyByZXR1cm5lZCBhbmQgd2UgY2FuIGNvbnNpZGVyIHRoZSByZXNwb25zZSBhXHJcbiAgICAgICAgLy8gc3VjY2Vzc2Z1bCBjb21tdW5pY2F0aW9uLlxyXG4gICAgICAgIHZhciBlcnJvciA9IHNlbGYuaXNFcnJvckNvZGVSZXNwb25zZSggeGhyLnN0YXR1cyApO1xyXG4gICAgICAgIGlmICggZXJyb3IgIT09IG51bGwgKSB7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBlcnJvciA9IEpTT04ucGFyc2UoIHhoci5yZXNwb25zZVRleHQgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGNhdGNoICggZSApIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCBlcnJvciApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCBlcnJvciApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoIHhoci5yZXNwb25zZVRleHQgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gQXNzaWduIHRoZSBjYWxsYmFjayBmb3IgYWxsIG9uZXJyb3IgWEhSIGV2ZW50c1xyXG4gICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7IFxyXG4gICAgICAvLyBVc2UgaXNFcnJvckNvZGVSZXNwb25zZSgpIHRvIHNjcmVlbiBmb3IgZXJyb3IgY29kZXMgdGhhdCBtaWdodCBiZSByZXR1cm5lZCBieSB0aGUgQnJpZGdlIFxyXG4gICAgICAvLyBTZXJ2ZXIuIElmIHRoZSBzdGF0dXMgY29kZSB3ZSBnb3QgYmFjayBjYW4ndCBiZSBjbGFzc2lmaWVkIGFzIGFueXRoaW5nIGh5IFxyXG4gICAgICAvLyBpc0Vycm9yQ29kZVJlc3BvbnNlKCksIGEgbnVsbCBlcnJvciBpcyByZXR1cm5lZCBhbmQgdGhlIEJyaWRnZSBDbGllbnQgd2lsbCBoYW5kbGUgdGhlIFxyXG4gICAgICAvLyBwcm9ibGVtIGludGVybmFsbHkuXHJcbiAgICAgIHZhciBlcnJvciA9IHNlbGYuaXNFcnJvckNvZGVSZXNwb25zZSggeGhyLnN0YXR1cyApO1xyXG4gICAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yICk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEFzc2lnbiB0aGUgY2FsbGJhY2sgZm9yIGFsbCBvbnRpbWVvdXQgWEhSIGV2ZW50c1xyXG4gICAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uICgpIHsgXHJcbiAgICAgIC8vIFVzZSBpc0Vycm9yQ29kZVJlc3BvbnNlKCkgdG8gc2NyZWVuIGZvciBlcnJvciBjb2RlcyB0aGF0IG1pZ2h0IGJlIHJldHVybmVkIGJ5IHRoZSBCcmlkZ2UgXHJcbiAgICAgIC8vIFNlcnZlci4gSWYgdGhlIHN0YXR1cyBjb2RlIHdlIGdvdCBiYWNrIGNhbid0IGJlIGNsYXNzaWZpZWQgYXMgYW55dGhpbmcgaHkgXHJcbiAgICAgIC8vIGlzRXJyb3JDb2RlUmVzcG9uc2UoKSwgYSBudWxsIGVycm9yIGlzIHJldHVybmVkIGFuZCB0aGUgQnJpZGdlIENsaWVudCB3aWxsIGhhbmRsZSB0aGUgXHJcbiAgICAgIC8vIHByb2JsZW0gaW50ZXJuYWxseS5cclxuICAgICAgdmFyIGVycm9yID0gc2VsZi5pc0Vycm9yQ29kZVJlc3BvbnNlKCB4aHIuc3RhdHVzICk7XHJcbiAgICAgIGRlZmVycmVkLnJlamVjdCggZXJyb3IgKTtcclxuICAgIH07XHJcbiAgICBcclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3Qgb3V0IGludG8gdGhlIG5ldHdvcmtcclxuICAgIHhoci5zZW5kKCk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSBwcm9taXNlIG9iamVjdCB0byB0aGUgY2FsbGVyIFxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIGNyZWF0ZVJlcXVlc3RIZWFkZXIoKVxyXG4gIC8vIFJldHVybnMgYSBuZXcgcmVxdWVzdCBoZWFkZXIgd3JhcHBlZCBhcm91bmQgdGhlIHBheWxvYWQgcGFzc2VkIGluLlxyXG4gIHNlbGYuY3JlYXRlUmVxdWVzdEhlYWRlciA9IGZ1bmN0aW9uKCBwYXlsb2FkICkge1xyXG5cclxuICAgIHJldHVybiAoIGhhc0lkZW50aXR5KCkgKSA/IGlkZW50aXR5LmNyZWF0ZUhlYWRlciggcGF5bG9hZCApIDoge307XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIGlzRXJyb3JDb2RlUmVzcG9uc2UoKVxyXG4gIC8vIFJldHVybnMgYW4gRXJyb3Igb2JqZWN0IGlmIHRoZSBwcm92aWRlZCB4aHIgaGFzIGEgc3RhdHVzIGNvZGUgYmV0d2VlbiA0MDAgYW5kIDU5OVxyXG4gIC8vIChpbmNsdXNpdmUpLiBTaW5jZSB0aGUgNDAwIGFuZCA1MDAgc2VyaWVzIHN0YXR1cyBjb2RlcyByZXByZXNlbnQgZXJyb3JzIG9mIHZhcmlvdXMga2luZHMsXHJcbiAgLy8gdGhpcyBhY3RzIGFzIGEgY2F0Y2gtYWxsIGZpbHRlciBmb3IgY29tbW9uIGVycm9yIGNhc2VzIHRvIGJlIGhhbmRsZWQgYnkgdGhlIGNsaWVudC5cclxuICAvLyBSZXR1cm5zIG51bGwgaWYgdGhlIHJlc3BvbnNlIHN0YXR1cyBpcyBub3QgYmV0d2VlbiA0MDAgYW5kIDU5OSAoaW5jbHVzaXZlKS5cclxuICAvLyBFcnJvciBmb3JtYXQ6IHsgc3RhdHVzOiA0MDQsIG1lc3NhZ2U6IFwiVGhlIHJlc291cmNlIHlvdSByZXF1ZXN0ZWQgd2FzIG5vdCBmb3VuZC5cIiB9XHJcbiAgc2VsZi5pc0Vycm9yQ29kZVJlc3BvbnNlID0gZnVuY3Rpb24gKCBzdGF0dXMgKSB7XHJcblxyXG4gICAgLy8gUmV0dXJuIGFuIEVycm9yIG9iamVjdCBpZiB0aGUgc3RhdHVzIGNvZGUgaXMgYmV0d2VlbiA0MDAgYW5kIDU5OSAoaW5jbHVzaXZlKS5cclxuICAgIGlmICggc3RhdHVzID49IDQwMCApIHtcclxuXHJcbiAgICAgIHN3aXRjaCAoIHN0YXR1cyApIHtcclxuICAgICAgY2FzZSA0MDA6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1czogNDAwLFxyXG4gICAgICAgICAgbWVzc2FnZTogJzQwMCAoQmFkIFJlcXVlc3QpID4+IFlvdXIgcmVxdWVzdCB3YXMgbm90IGZvcm1hdHRlZCBjb3JyZWN0bHkuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIGNhc2UgNDAxOlxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXM6IDQwMSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICc0MDEgKFVuYXV0aG9yaXplZCkgPj4gWW91IGRvIG5vdCBoYXZlIHN1ZmZpY2llbnQgcHJpdmVsaWdlcyB0byBwZXJmb3JtIHRoaXMgb3BlcmF0aW9uLidcclxuICAgICAgICB9O1xyXG4gICAgICBjYXNlIDQwMzpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzOiA0MDMsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnNDAzIChGb3JiaWRkZW4pID4+IFlvdXIgZW1haWwgYW5kIHBhc3N3b3JkIGRvIG5vdCBtYXRjaCBhbnkgdXNlciBvbiBmaWxlLidcclxuICAgICAgICB9O1xyXG4gICAgICBjYXNlIDQwNDpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzOiA0MDQsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnNDA0IChOb3QgRm91bmQpID4+IFRoZSByZXNvdXJjZSB5b3UgcmVxdWVzdGVkIGRvZXMgbm90IGV4aXN0LidcclxuICAgICAgICB9O1xyXG4gICAgICBjYXNlIDQwOTpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzOiA0MDksXHJcbiAgICAgICAgICBtZXNzYWdlOiAnNDA5IChDb25mbGljdCkgPj4gQSB1bmlxdWUgZGF0YWJhc2UgZmllbGQgbWF0Y2hpbmcgeW91ciBQVVQgbWF5IGFscmVhZHkgZXhpc3QuJ1xyXG4gICAgICAgIH07XHJcbiAgICAgIGNhc2UgNTAwOlxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXM6IDUwMCxcclxuICAgICAgICAgIG1lc3NhZ2U6ICc1MDAgKEludGVybmFsIFNlcnZlciBFcnJvcikgPj4gQW4gZXJyb3IgaGFzIHRha2VuIHBsYWNlIGluIHRoZSBCcmlkZ2Ugc2VydmVyLidcclxuICAgICAgICB9O1xyXG4gICAgICBjYXNlIDUwMzpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzOiA1MDMsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnNTAzIChTZXJ2aWNlIFVuYXZhaWxhYmxlKSA+PiBUaGUgQnJpZGdlIHNlcnZlciBtYXkgYmUgc3RvcHBlZC4nXHJcbiAgICAgICAgfTtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzOiBzdGF0dXMsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnRXJyb3IhIFNvbWV0aGluZyB3ZW50IHdyb25nLCBidXQgd2UgZG9uXFwndCBrbm93IHdoeSEnXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFJldHVybiBudWxsIGZvciBubyBlcnJvciBjb2RlLlxyXG4gICAgcmV0dXJuIG51bGw7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIGlzTG9nZ2VkSW4oKVxyXG4gIC8vIENoZWNrIGlmIHRoZXJlIGlzIGN1cnJlbnRseSBhIHVzZXIgb2JqZWN0IHNldC4gSWYgbm8gdXNlciBvYmplY3QgaXMgc2V0LCB0aGVuIG5vbmVcclxuICAvLyB3YXMgcmV0dXJuZWQgZnJvbSB0aGUgbG9naW4gYXR0ZW1wdCAoYW5kIHRoZSB1c2VyIGlzIHN0aWxsIGxvZ2dlZCBvdXQpIG9yIHRoZSB1c2VyIFxyXG4gIC8vIGxvZ2dlZCBvdXQgbWFudWFsbHkuXHJcbiAgc2VsZi5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIHJldHVybiAoIHNlbGYudXNlciAhPT0gbnVsbCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSBsb2dvdXQoKVxyXG4gIC8vIFNldCB0aGUgdXNlciBvYmplY3QgdG8gbnVsbCBhbmQgY2xlYXIgdGhlIElkZW50aXR5IG9iamVjdCB1c2VyIHRvIHNpZ24gcmVxdWVzdHMgZm9yXHJcbiAgLy8gYXV0aGVudGljYXRpb24gcHVycG9zZXMsIHNvIHRoYXQgdGhlIGxvZ2dlZC1vdXQgdXNlcidzIGNyZWRlbnRpYWxzIGNhbid0IHN0aWxsIGJlXHJcbiAgLy8gdXNlciB0byBhdXRob3JpemUgcmVxdWVzdHMuXHJcbiAgc2VsZi5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgb2JqZWN0IHRvIHJldHVybiBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBzdWNjZXNzL2ZhaWx1cmUgY29udmVuaWVudGx5LlxyXG4gICAgdmFyIGRlZmVycmVkID0gbmV3IFEuZGVmZXIoKTtcclxuXHJcbiAgICAvLyBEZWxldGUgdGhlIElkZW50aXR5IG9iamVjdCB0byBwcmVzZXJ2ZSB0aGUgdXNlcidzIHBhc3N3b3JkIHNlY3VyaXR5LlxyXG4gICAgY2xlYXJJZGVudGl0eSgpO1xyXG5cclxuICAgIC8vIENsZWFyIHRoZSB1c2VyIHNvIEJyaWRnZSByZXBvcnRzIHRoYXQgaXQgaXMgbG9nZ2VkIG91dC5cclxuICAgIGNsZWFyVXNlcigpO1xyXG5cclxuICAgIC8vIENsZWFyIHRoZSBpZGVudGl0eSBmcm9tIGxvY2FsIHN0b3JhZ2UgdG8gcHJlc2VydmUgdGhlIHVzZXIncyBwYXNzd29yZCBzZWN1cml0eS5cclxuICAgIC8vIElmIG5vIGlkZW50aXR5IGlzIHN0b3JlZCwgdGhpcyB3aWxsIGRvIG5vdGhpbmcuXHJcbiAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSggJ2JyaWRnZS1jbGllbnQtaWRlbnRpdHknICk7XHJcblxyXG4gICAgLy8gTm90aWZ5IHRoZSB1c2VyIG9mIHRoZSBsb2dvdXQgYWN0aW9uLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vbkxvZ291dENhbGxlZCA9PT0gJ2Z1bmN0aW9uJyApIHtcclxuICAgICAgc2VsZi5vbkxvZ291dENhbGxlZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlc29sdmUgdGhlIHByb21pc2Ugc2luY2UgdGhpcyBvcGVyYXRpb24gY2Fubm90IGZhaWxcclxuICAgIGRlZmVycmVkLnJlc29sdmUoKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGRlZmVycmVkIG9iamVjdCBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBlcnJvcnMgYXMgdGhleSBjaG9vc2UuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gcmVxdWVzdCgpXHJcbiAgLy8gU2VuZHMgYW4gWEhSIHJlcXVlc3QgdXNpbmcgalF1ZXJ5LmFqYXgoKSB0byB0aGUgZ2l2ZW4gQVBJIHJlc291cmNlIHVzaW5nIHRoZSBnaXZlbiBcclxuICAvLyBIVFRQIG1ldGhvZC4gVGhlIEhUVFAgcmVxdWVzdCBib2R5IHdpbGwgYmUgc2V0IHRvIHRoZSBKU09OLnN0cmluZ2lmeSgpZWQgcmVxdWVzdCBcclxuICAvLyB0aGF0IGlzIGdlbmVyYXRlZCBieSB0aGUgSWRlbnRpdHkgb2JqZWN0IHNldCB0byBwZXJmb3JtIEhNQUMgc2lnbmluZy5cclxuICAvLyBSZXR1cm5zIHRoZSBYaHJIdHRwUmVxdWVzdCBvYmplY3QgdGhhdCB0aGUgcmVxdWVzdCByZXByZXNlbnRzLlxyXG4gIC8vIElmIG5vIElkZW50aXR5IGlzIHNldCwgc2VuZFJlcXVlc3QoKSByZXR1cm5zIG51bGwsIGluZGljYXRpbmcgbm8gcmVxdWVzdCB3YXMgc2VudC5cclxuICBzZWxmLnJlcXVlc3QgPSBmdW5jdGlvbiAoIG1ldGhvZCwgcmVzb3VyY2UsIHBheWxvYWQgKSB7XHJcblxyXG4gICAgcmV0dXJuIHJlcXVlc3RQcml2YXRlKCBtZXRob2QsIHJlc291cmNlLCBwYXlsb2FkLCBudWxsICk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIHJlcXVlc3RDaGFuZ2VQYXNzd29yZCgpXHJcbiAgLy8gVGhlIHB1YmxpYyByZXF1ZXN0Q2hhbmdlUGFzc3dvcmQoKSBmdW5jdGlvbiB1c2VkIHRvIGhpZGUgcmVxdWVzdENoYW5nZVBhc3N3b3JkUHJpdmF0ZSgpLlxyXG4gIHNlbGYucmVxdWVzdENoYW5nZVBhc3N3b3JkID0gZnVuY3Rpb24gKCBvbGRQYXNzd29yZCwgbmV3UGFzc3dvcmQgKSB7XHJcblxyXG4gICAgcmV0dXJuIHJlcXVlc3RDaGFuZ2VQYXNzd29yZFByaXZhdGUoIG9sZFBhc3N3b3JkLCBuZXdQYXNzd29yZCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0Rm9yZ290UGFzc3dvcmQoKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdEZvcmdvdFBhc3N3b3JkKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RGb3Jnb3RQYXNzd29yZFByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RGb3Jnb3RQYXNzd29yZCA9IGZ1bmN0aW9uICggZW1haWwgKSB7XHJcblxyXG4gICAgcmV0dXJuIHJlcXVlc3RGb3Jnb3RQYXNzd29yZFByaXZhdGUoIGVtYWlsICk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIHJlcXVlc3RMb2dpbigpXHJcbiAgLy8gVGhlIHB1YmxpYyByZXF1ZXN0TG9naW4oKSBmdW5jdGlvbiB1c2VkIHRvIGhpZGUgcmVxdWVzdExvZ2luUHJpdmF0ZSgpLlxyXG4gIHNlbGYucmVxdWVzdExvZ2luID0gZnVuY3Rpb24gKCBlbWFpbCwgcGFzc3dvcmQsIHVzZUxvY2FsU3RvcmFnZSApIHtcclxuXHJcbiAgICByZXR1cm4gcmVxdWVzdExvZ2luUHJpdmF0ZSggZW1haWwsIHBhc3N3b3JkLCB1c2VMb2NhbFN0b3JhZ2UsIGZhbHNlICk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIHJlcXVlc3RMb2dpblN0b3JlZElkZW50aXR5KClcclxuICAvLyBDaGVja3MgdGhlIGJyb3dzZXIncyBsb2NhbCBzdG9yYWdlIGZvciBhbiBleGlzdGluZyB1c2VyIGFuZCBwZXJmb3JtcyBhIGxvZ2luIHJlcXVlc3RcclxuICAvLyB1c2luZyB0aGUgc3RvcmVkIGNyZWRlbnRpYWxzIGlmIG9uZSBpcyBmb3VuZC4gUmV0dXJucyBhIGpRdWVyeSBEZWZlcnJlZCBvYmplY3QgaWYgYSBsb2dpbiBcclxuICAvLyByZXF1ZXN0IHdhcyBzZW50IGFuZCBudWxsIGlmIG5vIHN0b3JlZCBpZGVudGl0eSB3YXMgZm91bmQgLyBsb2dpbiByZXF1ZXN0IHdhcyBzZW50LlxyXG4gIHNlbGYucmVxdWVzdExvZ2luU3RvcmVkSWRlbnRpdHkgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgYW4gaWRlbnRpdHkgaXMgaW4gbG9jYWwgc3RvcmFnZSB0byB1c2UgZm9yIGF1dGhlbnRpY2F0aW9uLlxyXG4gICAgdmFyIHN0b3JlZElkZW50aXR5ID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oICdicmlkZ2UtY2xpZW50LWlkZW50aXR5JyApO1xyXG4gICAgaWYgKCBzdG9yZWRJZGVudGl0eSAhPT0gbnVsbCApIHtcclxuXHJcbiAgICAgIHZhciBwYXJzZWRJZGVudGl0eSA9IEpTT04ucGFyc2UoIHN0b3JlZElkZW50aXR5ICk7XHJcblxyXG4gICAgICBpZiAoIHNlbGYuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coIFwiU3RvcmVkIGlkZW50aXR5OiBcIiArIEpTT04uc3RyaW5naWZ5KCBwYXJzZWRJZGVudGl0eSApICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNlbmQgYSBsb2dpbiByZXF1ZXN0IHVzaW5nIHRoZSBwcml2YXRlIGxvZ2luIGNhbGwgYW5kIHJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0XHJcbiAgICAgIHJldHVybiByZXF1ZXN0TG9naW5Qcml2YXRlKCBwYXJzZWRJZGVudGl0eS5lbWFpbCwgcGFyc2VkSWRlbnRpdHkucGFzc3dvcmQsIHRydWUsIHRydWUgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gTm8gbG9naW4gcmVxdWVzdCB3YXMgc2VudCwgc28gcmV0dXJuIG51bGwuXHJcbiAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gcmVxdWVzdFJlY292ZXJQYXNzd29yZCgpXHJcbiAgLy8gVGhlIHB1YmxpYyByZXF1ZXN0UmVjb3ZlclBhc3N3b3JkKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RSZWNvdmVyUGFzc3dvcmRQcml2YXRlKCkuXHJcbiAgc2VsZi5yZXF1ZXN0UmVjb3ZlclBhc3N3b3JkID0gZnVuY3Rpb24gKCBwYXNzd29yZCwgaGFzaCApIHtcclxuXHJcbiAgICByZXR1cm4gcmVxdWVzdFJlY292ZXJQYXNzd29yZFByaXZhdGUoIHBhc3N3b3JkLCBoYXNoICk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIHJlcXVlc3RSZWdpc3RlcigpXHJcbiAgLy8gVGhlIHB1YmxpYyByZXF1ZXN0UmVnaXN0ZXIoKSBmdW5jdGlvbiB1c2VkIHRvIGhpZGUgcmVxdWVzdFJlZ2lzdGVyUHJpdmF0ZSgpLlxyXG4gIHNlbGYucmVxdWVzdFJlZ2lzdGVyID0gZnVuY3Rpb24gKCBlbWFpbCwgcGFzc3dvcmQsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGFwcERhdGEgKSB7XHJcblxyXG4gICAgcmV0dXJuIHJlcXVlc3RSZWdpc3RlclByaXZhdGUoIGVtYWlsLCBwYXNzd29yZCwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgYXBwRGF0YSApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0VmVyaWZ5RW1haWwoKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdFZlcmlmeUVtYWlsKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RWZXJpZnlFbWFpbFByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RWZXJpZnlFbWFpbCA9IGZ1bmN0aW9uICggaGFzaCApIHtcclxuXHJcbiAgICByZXR1cm4gcmVxdWVzdFZlcmlmeUVtYWlsUHJpdmF0ZSggaGFzaCApO1xyXG5cclxuICB9O1xyXG5cclxuICByZXR1cm4gc2VsZjtcclxuXHJcbn07IiwiLy8gSW5jbHVkZSBkZXBlbmRlbmNpZXNcbnZhciBDcnlwdG9FbmNIZXggPSByZXF1aXJlKCAnLi9pbmNsdWRlL2NyeXB0by1qcy9lbmMtaGV4JyApO1xudmFyIENyeXB0b0htYWNTaGEyNTYgPSByZXF1aXJlKCAnLi9pbmNsdWRlL2NyeXB0by1qcy9obWFjLXNoYTI1NicgKTtcbnZhciBDcnlwdG9TaGEyNTYgPSByZXF1aXJlKCAnLi9pbmNsdWRlL2NyeXB0by1qcy9zaGEyNTYnICk7XG5cbi8vIFtJZGVudGl0eSBDb25zdHJ1Y3Rvcl1cbi8vIFRoZSBJZGVudGl0eSBvYmplY3QgcmVwcmVzZW50cyBhbiBlbWFpbC9wYXNzd29yZCBwYWlyIHVzZWQgYXMgaWRlbnRpZmljYXRpb24gd2l0aCB0aGVcbi8vIGRhdGFiYXNlIHRvIHByb3ZpZGUgYXV0aGVuaWNhdGlvbiBmb3IgcmVxdWVzdHMuIFRoZSBJZGVudGl0eSBpcyB1c2VkIGFzIGEgcmVxdWVzdCBmYWN0b3J5XG4vLyB0byBjcmVhdGUgcmVxdWVzdHMgdGhhdCB3aWxsIGF1dGhlbnRpY2F0ZSB0aGUgd2l0aCB0aGUgc2VydmVyIHNlY3VyZWx5LlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoIGVtYWlsLCBwYXNzd29yZCwgZG9udEhhc2hQYXNzd29yZCApIHtcblxuICAndXNlIHN0cmljdCc7XG5cbiAgLy8gVGhlIG9iamVjdCB0byBiZSByZXR1cm5lZCBmcm9tIHRoZSBmYWN0b3J5XG4gIHZhciBzZWxmID0ge307XG5cbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vIFBSSVZBVEUgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuICAvLy8vLy8vLy8vLy8vLy8vXG4gIC8vIFBST1BFUlRJRVMgLy9cbiAgLy8vLy8vLy8vLy8vLy8vL1xuXG4gIC8vIFtQUklWQVRFXSBoYXNoZWRQYXNzd29yZFxuICAvLyBUaGUgU0hBLTI1NiBlbmNvZGVkIHN0cmluZyBnZW5lcmF0ZWQgYnkgaGFzaGluZyB0aGUgZ2l2ZW4gcGFzc3dvcmQuIFxuICAvLyBbU0VDVVJJVFkgTk9URSAxXSBCeSBoYXNoaW5nIHRoZSBwYXNzd29yZCB3ZSBzdG9yZSBpbiBtZW1vcnkgYW5kIGtlZXBpbmcgaXQgbG9jYWwgdG8gXG4gIC8vIHRoaXMgZnVuY3Rpb24sIHdlIHByb3RlY3QgdGhlIHVzZXIncyBwYXNzd29yZCBmcm9tIHNjcnV0aW55IGZyb20gb3RoZXIgbG9jYWwgYXBwbGljYXRpb25zLlxuICAvLyBUaGUgcGFzc3dvcmQgc3VwcGxpZWQgYXMgYSBjb25zdHJ1Y3RvciBhcmd1bWVudCB3aWxsIGFsc28gYmUgbnVsbGVkIHNvIHRoYXQgaXQgaXMgbm90IGtlcHQgXG4gIC8vIGluIGFwcGxpY2F0aW9uIG1lbW9yeSBlaXRoZXIsIHNvIHRoYXQgdGhlIG9yaWdpbmFsIHBhc3N3b3JkIGluZm9ybWF0aW9uIGlzIGxvc3QuXG4gIC8vIFtTRUNVUklUWSBOT1RFIDRdIElmIGRvbnRIYXNoUGFzc3dvcmQgaXMgc2V0IHRvIHRydWUsIHRoaXMgaGFzaGluZyBwcm9jZXNzIGlzIHNraXBwZWQuIFRoaXMgXG4gIC8vIGZlYXR1cmUgZXhpc3RzIHRvIGFsbG93IHBhc3N3b3JkcyBzdG9yZWQgaW4gbG9jYWwgc3RvcmFnZSB0byBiZSB1c2VkIGZvciBhdXRoZW50aWNhdGlvbiwgc2luY2UgXG4gIC8vIHRoZXkgaGF2ZSBhbHJlYWR5IGJlZW4gaGFzZWQgaW4gdGhpcyB3YXkuIERPIE5PVCBVU0UgVEhJUyBGT1IgQU5ZVEhJTkcgRUxTRSFcbiAgdmFyIGhhc2hlZFBhc3N3b3JkID0gKCBkb250SGFzaFBhc3N3b3JkID09PSB0cnVlICkgPyBwYXNzd29yZCA6IFxuICAgIENyeXB0b1NoYTI1NiggcGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICk7XG5cbiAgLy8gW1NFQ1VSSVRZIE5PVEUgMl0gVGhlIHVzZXIncyBnaXZlbiBwYXNzd29yZCBzaG91bGQgYmUgZm9yZ290dGVuIG9uY2UgaXQgaGFzIGJlZW4gaGFzaGVkLlxuICAvLyBBbHRob3VnaCB0aGUgcGFzc3dvcmQgaXMgbG9jYWwgdG8gdGhpcyBjb25zdHJ1Y3RvciwgaXQgaXMgYmV0dGVyIHRoYXQgaXQgbm90IGV2ZW4gYmUgXG4gIC8vIGF2YWlsYWJsZSBpbiBtZW1vcnkgb25jZSBpdCBoYXMgYmVlbiBoYXNoZWQsIHNpbmNlIHRoZSBoYXNoZWQgcGFzc3dvcmQgaXMgbXVjaCBtb3JlIFxuICAvLyBkaWZmaWN1bHQgdG8gcmVjb3ZlciBpbiBpdHMgb3JpZ2luYWwgZm9ybS5cbiAgcGFzc3dvcmQgPSBudWxsO1xuXG5cbiAgLy8vLy8vLy8vLy8vLy8vXG4gIC8vIEZVTkNUSU9OUyAvL1xuICAvLy8vLy8vLy8vLy8vLy9cblxuICAvLyBbUFJJVkFURV0gaG1hY1NpZ25IZWFkZXIoKVxuICAvLyBSZXR1cm5zIHRoZSBnaXZlbiByZXF1ZXN0IG9iamVjdCBhZnRlciBhZGRpbmcgdGhlIFwiaG1hY1wiIHByb3BlcnR5IHRvIGl0IGFuZCBzZXR0aW5nIFwiaG1hY1wiIFxuICAvLyBieSB1c2luZyB0aGUgdXNlcidzIHBhc3N3b3JkIGFzIGEgU0hBLTI1NiBITUFDIGhhc2hpbmcgc2VjcmV0LlxuICAvLyBbU0VDVVJJVFkgTk9URSAzXSBUaGUgSE1BQyBzdHJpbmcgaXMgYSBoZXggdmFsdWUsIDY0IGNoYXJhY3RlcnMgaW4gbGVuZ3RoLiBJdCBpcyBjcmVhdGVkIFxuICAvLyBieSBjb25jYXRlbmF0aW5nIHRoZSBKU09OLnN0cmluZ2lmeSgpZWQgcmVxdWVzdCBjb250ZW50LCB0aGUgcmVxdWVzdCBlbWFpbCwgYW5kIHRoZSByZXF1ZXN0IFxuICAvLyB0aW1lIHRvZ2V0aGVyLCBhbmQgaGFzaGluZyB0aGUgcmVzdWx0IHVzaW5nIGhhc2hlZFBhc3N3b3JkIGFzIGEgc2FsdC4gXG4gIC8vXG4gIC8vIFBzZXVkb2NvZGU6XG4gIC8vIHRvSGFzaCA9IFJlcXVlc3QgQ29udGVudCBKU09OICsgUmVxdWVzdCBFbWFpbCArIFJlcXVlc3QgVGltZSBKU09OXG4gIC8vIHNhbHQgPSBoYXNoZWRQYXNzd29yZFxuICAvLyBobWFjU3RyaW5nID0gQ3J5cHRvU2hhMjU2KCB0b0hhc2gsIHNhbHQgKVxuICAvLyByZXF1ZXN0LmhtYWMgPSBobWFjU3RyaW5nXG4gIC8vIFxuICAvLyBCeSBwZXJmb3JtaW5nIHRoZSBzYW1lIG9wZXJhdGlvbiBvbiB0aGUgZGF0YSwgdGhlIHNlcnZlciBjYW4gY29uZmlybSB0aGF0IHRoZSBITUFDIHN0cmluZ3MgXG4gIC8vIGFyZSBpZGVudGljYWwgYW5kIGF1dGhvcml6ZSB0aGUgcmVxdWVzdC5cbiAgdmFyIGhtYWNTaWduSGVhZGVyID0gZnVuY3Rpb24gKCByZXFCb2R5ICkge1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBjb25jYXRlbmF0ZWQgc3RyaW5nIHRvIGJlIGhhc2hlZCBhcyB0aGUgSE1BQ1xuICAgIHZhciBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkoIHJlcUJvZHkuY29udGVudCApO1xuICAgIHZhciBlbWFpbCA9IHJlcUJvZHkuZW1haWw7XG4gICAgdmFyIHRpbWUgPSByZXFCb2R5LnRpbWUudG9JU09TdHJpbmcoKTtcbiAgICB2YXIgY29uY2F0ID0gY29udGVudCArIGVtYWlsICsgdGltZTtcblxuICAgIC8vIEFkZCB0aGUgJ2htYWMnIHByb3BlcnR5IHRvIHRoZSByZXF1ZXN0IHdpdGggYSB2YWx1ZSBjb21wdXRlZCBieSBzYWx0aW5nIHRoZSBjb25jYXQgd2l0aCB0aGVcbiAgICAvLyB1c2VyJ3MgaGFzaGVkUGFzc3dvcmQuXG4gICAgLy8gW0NBUkVGVUxdIGhhc2hlZFBhc3N3b3JkIHNob3VsZCBiZSBhIHN0cmluZy4gSWYgaXQgaXNuJ3QsIHRlcnJpYmxlIHRoaW5ncyBXSUxMIGhhcHBlbiFcbiAgICByZXFCb2R5LmhtYWMgPSBDcnlwdG9IbWFjU2hhMjU2KCBjb25jYXQsIGhhc2hlZFBhc3N3b3JkICkudG9TdHJpbmcoIENyeXB0b0VuY0hleCApO1xuXG4gICAgaWYgKCBCcmlkZ2UuZGVidWcgPT09IHRydWUgKSB7XG4gICAgICBjb25zb2xlLmxvZyggJz09PSBITUFDIFNpZ25pbmcgUHJvY2VzcyA9PT0nICk7XG4gICAgICBjb25zb2xlLmxvZyggJ0hhc2hwYXNzOiBcIicgKyBoYXNoZWRQYXNzd29yZCArICdcIicgKTtcbiAgICAgIGNvbnNvbGUubG9nKCAnQ29udGVudDogXCInICsgY29udGVudCArICdcIicgKTtcbiAgICAgIGNvbnNvbGUubG9nKCAnRW1haWw6IFwiJyArIGVtYWlsICsgJ1wiJyApO1xuICAgICAgY29uc29sZS5sb2coICdUaW1lOiBcIicgKyB0aW1lICsgJ1wiJyApO1xuICAgICAgY29uc29sZS5sb2coICdDb25jYXQ6IFwiJyArIGNvbmNhdCArICdcIicgKTtcbiAgICAgIGNvbnNvbGUubG9nKCAnSE1BQzogXCInICsgcmVxQm9keS5obWFjICsgJ1wiJyApO1xuICAgICAgY29uc29sZS5sb2coICc9PT09PT09PT09PT09PT09PT09PT09PT09PT09JyApO1xuICAgIH1cblxuICAgIHJldHVybiByZXFCb2R5O1xuXG4gIH07XG5cblxuICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gUFVCTElDIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG4gIC8vLy8vLy8vLy8vLy8vLy9cbiAgLy8gUFJPUEVSVElFUyAvL1xuICAvLy8vLy8vLy8vLy8vLy8vXG5cbiAgLy8gW1BVQkxJQ10gZW1haWxcbiAgLy8gVGhlIGVtYWlsIHVzZWQgdG8gaWRlbnRpZnkgdGhlIHVzZXIgd2l0aGluIHRoZSBkYXRhYmFzZS5cbiAgc2VsZi5lbWFpbCA9IGVtYWlsO1xuXG5cbiAgLy8vLy8vLy8vLy8vLy8vXG4gIC8vIEZVTkNUSU9OUyAvL1xuICAvLy8vLy8vLy8vLy8vLy9cblxuICAvLyBbUFVCTElDXSBjcmVhdGVIZWFkZXIoKVxuICAvLyBSZXR1cm5zIGEgbmV3IHJlcXVlc3QsIGdpdmVuIHRoZSBjb250ZW50IHBheWxvYWQgb2YgdGhlIHJlcXVlc3QgYXMgYW4gb2JqZWN0LiBVdGlsaXplc1xuICAvLyBobWFjU2lnbkhlYWRlcigpIHRvIHdyYXAgdGhlIGdpdmVuIHBheWxvYWQgaW4gYW4gYXBwcm9wcmlhdGUgaGVhZGVyIHRvIHZhbGlkYXRlIGFnYWluc3QgdGhlXG4gIC8vIHNlcnZlci1zaWRlIGF1dGhvcml6YXRpb24gc2NoZW1lIChhc3N1bWluZyB0aGUgdXNlciBjcmVkZW50aWFscyBhcmUgY29ycmVjdCkuXG4gIHNlbGYuY3JlYXRlSGVhZGVyID0gZnVuY3Rpb24gKCBwYXlsb2FkICkge1xuXG4gICAgcmV0dXJuIGhtYWNTaWduSGVhZGVyKCB7XG4gICAgICAnY29udGVudCc6IHBheWxvYWQsXG4gICAgICAnZW1haWwnOiBlbWFpbCxcbiAgICAgICd0aW1lJzogbmV3IERhdGUoKVxuICAgIH0gKTtcblxuICB9O1xuXG4gIHJldHVybiBzZWxmO1xuXG59OyIsIjsoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XG5cdFx0Ly8gQ29tbW9uSlNcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdH1cblx0ZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcblx0XHQvLyBBTURcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdC8vIEdsb2JhbCAoYnJvd3Nlcilcblx0XHRyb290LkNyeXB0b0pTID0gZmFjdG9yeSgpO1xuXHR9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcblxuXHQvKipcblx0ICogQ3J5cHRvSlMgY29yZSBjb21wb25lbnRzLlxuXHQgKi9cblx0dmFyIENyeXB0b0pTID0gQ3J5cHRvSlMgfHwgKGZ1bmN0aW9uIChNYXRoLCB1bmRlZmluZWQpIHtcblx0ICAgIC8qKlxuXHQgICAgICogQ3J5cHRvSlMgbmFtZXNwYWNlLlxuXHQgICAgICovXG5cdCAgICB2YXIgQyA9IHt9O1xuXG5cdCAgICAvKipcblx0ICAgICAqIExpYnJhcnkgbmFtZXNwYWNlLlxuXHQgICAgICovXG5cdCAgICB2YXIgQ19saWIgPSBDLmxpYiA9IHt9O1xuXG5cdCAgICAvKipcblx0ICAgICAqIEJhc2Ugb2JqZWN0IGZvciBwcm90b3R5cGFsIGluaGVyaXRhbmNlLlxuXHQgICAgICovXG5cdCAgICB2YXIgQmFzZSA9IENfbGliLkJhc2UgPSAoZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIGZ1bmN0aW9uIEYoKSB7fVxuXG5cdCAgICAgICAgcmV0dXJuIHtcblx0ICAgICAgICAgICAgLyoqXG5cdCAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSB0aGlzIG9iamVjdC5cblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG92ZXJyaWRlcyBQcm9wZXJ0aWVzIHRvIGNvcHkgaW50byB0aGUgbmV3IG9iamVjdC5cblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgbmV3IG9iamVjdC5cblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogQHN0YXRpY1xuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiAgICAgdmFyIE15VHlwZSA9IENyeXB0b0pTLmxpYi5CYXNlLmV4dGVuZCh7XG5cdCAgICAgICAgICAgICAqICAgICAgICAgZmllbGQ6ICd2YWx1ZScsXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqICAgICAgICAgbWV0aG9kOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAqICAgICAgICAgfVxuXHQgICAgICAgICAgICAgKiAgICAgfSk7XG5cdCAgICAgICAgICAgICAqL1xuXHQgICAgICAgICAgICBleHRlbmQ6IGZ1bmN0aW9uIChvdmVycmlkZXMpIHtcblx0ICAgICAgICAgICAgICAgIC8vIFNwYXduXG5cdCAgICAgICAgICAgICAgICBGLnByb3RvdHlwZSA9IHRoaXM7XG5cdCAgICAgICAgICAgICAgICB2YXIgc3VidHlwZSA9IG5ldyBGKCk7XG5cblx0ICAgICAgICAgICAgICAgIC8vIEF1Z21lbnRcblx0ICAgICAgICAgICAgICAgIGlmIChvdmVycmlkZXMpIHtcblx0ICAgICAgICAgICAgICAgICAgICBzdWJ0eXBlLm1peEluKG92ZXJyaWRlcyk7XG5cdCAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkZWZhdWx0IGluaXRpYWxpemVyXG5cdCAgICAgICAgICAgICAgICBpZiAoIXN1YnR5cGUuaGFzT3duUHJvcGVydHkoJ2luaXQnKSkge1xuXHQgICAgICAgICAgICAgICAgICAgIHN1YnR5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgc3VidHlwZS4kc3VwZXIuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHQgICAgICAgICAgICAgICAgICAgIH07XG5cdCAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemVyJ3MgcHJvdG90eXBlIGlzIHRoZSBzdWJ0eXBlIG9iamVjdFxuXHQgICAgICAgICAgICAgICAgc3VidHlwZS5pbml0LnByb3RvdHlwZSA9IHN1YnR5cGU7XG5cblx0ICAgICAgICAgICAgICAgIC8vIFJlZmVyZW5jZSBzdXBlcnR5cGVcblx0ICAgICAgICAgICAgICAgIHN1YnR5cGUuJHN1cGVyID0gdGhpcztcblxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIHN1YnR5cGU7XG5cdCAgICAgICAgICAgIH0sXG5cblx0ICAgICAgICAgICAgLyoqXG5cdCAgICAgICAgICAgICAqIEV4dGVuZHMgdGhpcyBvYmplY3QgYW5kIHJ1bnMgdGhlIGluaXQgbWV0aG9kLlxuXHQgICAgICAgICAgICAgKiBBcmd1bWVudHMgdG8gY3JlYXRlKCkgd2lsbCBiZSBwYXNzZWQgdG8gaW5pdCgpLlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBuZXcgb2JqZWN0LlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqICAgICB2YXIgaW5zdGFuY2UgPSBNeVR5cGUuY3JlYXRlKCk7XG5cdCAgICAgICAgICAgICAqL1xuXHQgICAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuZXh0ZW5kKCk7XG5cdCAgICAgICAgICAgICAgICBpbnN0YW5jZS5pbml0LmFwcGx5KGluc3RhbmNlLCBhcmd1bWVudHMpO1xuXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG5cdCAgICAgICAgICAgIH0sXG5cblx0ICAgICAgICAgICAgLyoqXG5cdCAgICAgICAgICAgICAqIEluaXRpYWxpemVzIGEgbmV3bHkgY3JlYXRlZCBvYmplY3QuXG5cdCAgICAgICAgICAgICAqIE92ZXJyaWRlIHRoaXMgbWV0aG9kIHRvIGFkZCBzb21lIGxvZ2ljIHdoZW4geW91ciBvYmplY3RzIGFyZSBjcmVhdGVkLlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiAgICAgdmFyIE15VHlwZSA9IENyeXB0b0pTLmxpYi5CYXNlLmV4dGVuZCh7XG5cdCAgICAgICAgICAgICAqICAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgKiAgICAgICAgICAgICAvLyAuLi5cblx0ICAgICAgICAgICAgICogICAgICAgICB9XG5cdCAgICAgICAgICAgICAqICAgICB9KTtcblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgfSxcblxuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogQ29waWVzIHByb3BlcnRpZXMgaW50byB0aGlzIG9iamVjdC5cblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IHByb3BlcnRpZXMgVGhlIHByb3BlcnRpZXMgdG8gbWl4IGluLlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiAgICAgTXlUeXBlLm1peEluKHtcblx0ICAgICAgICAgICAgICogICAgICAgICBmaWVsZDogJ3ZhbHVlJ1xuXHQgICAgICAgICAgICAgKiAgICAgfSk7XG5cdCAgICAgICAgICAgICAqL1xuXHQgICAgICAgICAgICBtaXhJbjogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcblx0ICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3BlcnR5TmFtZSBpbiBwcm9wZXJ0aWVzKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW3Byb3BlcnR5TmFtZV0gPSBwcm9wZXJ0aWVzW3Byb3BlcnR5TmFtZV07XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICAvLyBJRSB3b24ndCBjb3B5IHRvU3RyaW5nIHVzaW5nIHRoZSBsb29wIGFib3ZlXG5cdCAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eSgndG9TdHJpbmcnKSkge1xuXHQgICAgICAgICAgICAgICAgICAgIHRoaXMudG9TdHJpbmcgPSBwcm9wZXJ0aWVzLnRvU3RyaW5nO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9LFxuXG5cdCAgICAgICAgICAgIC8qKlxuXHQgICAgICAgICAgICAgKiBDcmVhdGVzIGEgY29weSBvZiB0aGlzIG9iamVjdC5cblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgY2xvbmUuXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqICAgICB2YXIgY2xvbmUgPSBpbnN0YW5jZS5jbG9uZSgpO1xuXHQgICAgICAgICAgICAgKi9cblx0ICAgICAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXQucHJvdG90eXBlLmV4dGVuZCh0aGlzKTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH07XG5cdCAgICB9KCkpO1xuXG5cdCAgICAvKipcblx0ICAgICAqIEFuIGFycmF5IG9mIDMyLWJpdCB3b3Jkcy5cblx0ICAgICAqXG5cdCAgICAgKiBAcHJvcGVydHkge0FycmF5fSB3b3JkcyBUaGUgYXJyYXkgb2YgMzItYml0IHdvcmRzLlxuXHQgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IHNpZ0J5dGVzIFRoZSBudW1iZXIgb2Ygc2lnbmlmaWNhbnQgYnl0ZXMgaW4gdGhpcyB3b3JkIGFycmF5LlxuXHQgICAgICovXG5cdCAgICB2YXIgV29yZEFycmF5ID0gQ19saWIuV29yZEFycmF5ID0gQmFzZS5leHRlbmQoe1xuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIEluaXRpYWxpemVzIGEgbmV3bHkgY3JlYXRlZCB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtBcnJheX0gd29yZHMgKE9wdGlvbmFsKSBBbiBhcnJheSBvZiAzMi1iaXQgd29yZHMuXG5cdCAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IHNpZ0J5dGVzIChPcHRpb25hbCkgVGhlIG51bWJlciBvZiBzaWduaWZpY2FudCBieXRlcyBpbiB0aGUgd29yZHMuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5saWIuV29yZEFycmF5LmNyZWF0ZSgpO1xuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMubGliLldvcmRBcnJheS5jcmVhdGUoWzB4MDAwMTAyMDMsIDB4MDQwNTA2MDddKTtcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmxpYi5Xb3JkQXJyYXkuY3JlYXRlKFsweDAwMDEwMjAzLCAweDA0MDUwNjA3XSwgNik7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgaW5pdDogZnVuY3Rpb24gKHdvcmRzLCBzaWdCeXRlcykge1xuXHQgICAgICAgICAgICB3b3JkcyA9IHRoaXMud29yZHMgPSB3b3JkcyB8fCBbXTtcblxuXHQgICAgICAgICAgICBpZiAoc2lnQnl0ZXMgIT0gdW5kZWZpbmVkKSB7XG5cdCAgICAgICAgICAgICAgICB0aGlzLnNpZ0J5dGVzID0gc2lnQnl0ZXM7XG5cdCAgICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgICAgICB0aGlzLnNpZ0J5dGVzID0gd29yZHMubGVuZ3RoICogNDtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIHdvcmQgYXJyYXkgdG8gYSBzdHJpbmcuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge0VuY29kZXJ9IGVuY29kZXIgKE9wdGlvbmFsKSBUaGUgZW5jb2Rpbmcgc3RyYXRlZ3kgdG8gdXNlLiBEZWZhdWx0OiBDcnlwdG9KUy5lbmMuSGV4XG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBzdHJpbmdpZmllZCB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgc3RyaW5nID0gd29yZEFycmF5ICsgJyc7XG5cdCAgICAgICAgICogICAgIHZhciBzdHJpbmcgPSB3b3JkQXJyYXkudG9TdHJpbmcoKTtcblx0ICAgICAgICAgKiAgICAgdmFyIHN0cmluZyA9IHdvcmRBcnJheS50b1N0cmluZyhDcnlwdG9KUy5lbmMuVXRmOCk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uIChlbmNvZGVyKSB7XG5cdCAgICAgICAgICAgIHJldHVybiAoZW5jb2RlciB8fCBIZXgpLnN0cmluZ2lmeSh0aGlzKTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ29uY2F0ZW5hdGVzIGEgd29yZCBhcnJheSB0byB0aGlzIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheX0gd29yZEFycmF5IFRoZSB3b3JkIGFycmF5IHRvIGFwcGVuZC5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhpcyB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB3b3JkQXJyYXkxLmNvbmNhdCh3b3JkQXJyYXkyKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBjb25jYXQ6IGZ1bmN0aW9uICh3b3JkQXJyYXkpIHtcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXG5cdCAgICAgICAgICAgIHZhciB0aGlzV29yZHMgPSB0aGlzLndvcmRzO1xuXHQgICAgICAgICAgICB2YXIgdGhhdFdvcmRzID0gd29yZEFycmF5LndvcmRzO1xuXHQgICAgICAgICAgICB2YXIgdGhpc1NpZ0J5dGVzID0gdGhpcy5zaWdCeXRlcztcblx0ICAgICAgICAgICAgdmFyIHRoYXRTaWdCeXRlcyA9IHdvcmRBcnJheS5zaWdCeXRlcztcblxuXHQgICAgICAgICAgICAvLyBDbGFtcCBleGNlc3MgYml0c1xuXHQgICAgICAgICAgICB0aGlzLmNsYW1wKCk7XG5cblx0ICAgICAgICAgICAgLy8gQ29uY2F0XG5cdCAgICAgICAgICAgIGlmICh0aGlzU2lnQnl0ZXMgJSA0KSB7XG5cdCAgICAgICAgICAgICAgICAvLyBDb3B5IG9uZSBieXRlIGF0IGEgdGltZVxuXHQgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGF0U2lnQnl0ZXM7IGkrKykge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciB0aGF0Qnl0ZSA9ICh0aGF0V29yZHNbaSA+Pj4gMl0gPj4+ICgyNCAtIChpICUgNCkgKiA4KSkgJiAweGZmO1xuXHQgICAgICAgICAgICAgICAgICAgIHRoaXNXb3Jkc1sodGhpc1NpZ0J5dGVzICsgaSkgPj4+IDJdIHw9IHRoYXRCeXRlIDw8ICgyNCAtICgodGhpc1NpZ0J5dGVzICsgaSkgJSA0KSAqIDgpO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9IGVsc2UgaWYgKHRoYXRXb3Jkcy5sZW5ndGggPiAweGZmZmYpIHtcblx0ICAgICAgICAgICAgICAgIC8vIENvcHkgb25lIHdvcmQgYXQgYSB0aW1lXG5cdCAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoYXRTaWdCeXRlczsgaSArPSA0KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdGhpc1dvcmRzWyh0aGlzU2lnQnl0ZXMgKyBpKSA+Pj4gMl0gPSB0aGF0V29yZHNbaSA+Pj4gMl07XG5cdCAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgICAgICAvLyBDb3B5IGFsbCB3b3JkcyBhdCBvbmNlXG5cdCAgICAgICAgICAgICAgICB0aGlzV29yZHMucHVzaC5hcHBseSh0aGlzV29yZHMsIHRoYXRXb3Jkcyk7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgdGhpcy5zaWdCeXRlcyArPSB0aGF0U2lnQnl0ZXM7XG5cblx0ICAgICAgICAgICAgLy8gQ2hhaW5hYmxlXG5cdCAgICAgICAgICAgIHJldHVybiB0aGlzO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBSZW1vdmVzIGluc2lnbmlmaWNhbnQgYml0cy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgd29yZEFycmF5LmNsYW1wKCk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgY2xhbXA6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IHRoaXMud29yZHM7XG5cdCAgICAgICAgICAgIHZhciBzaWdCeXRlcyA9IHRoaXMuc2lnQnl0ZXM7XG5cblx0ICAgICAgICAgICAgLy8gQ2xhbXBcblx0ICAgICAgICAgICAgd29yZHNbc2lnQnl0ZXMgPj4+IDJdICY9IDB4ZmZmZmZmZmYgPDwgKDMyIC0gKHNpZ0J5dGVzICUgNCkgKiA4KTtcblx0ICAgICAgICAgICAgd29yZHMubGVuZ3RoID0gTWF0aC5jZWlsKHNpZ0J5dGVzIC8gNCk7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENyZWF0ZXMgYSBjb3B5IG9mIHRoaXMgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIGNsb25lLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgY2xvbmUgPSB3b3JkQXJyYXkuY2xvbmUoKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICB2YXIgY2xvbmUgPSBCYXNlLmNsb25lLmNhbGwodGhpcyk7XG5cdCAgICAgICAgICAgIGNsb25lLndvcmRzID0gdGhpcy53b3Jkcy5zbGljZSgwKTtcblxuXHQgICAgICAgICAgICByZXR1cm4gY2xvbmU7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENyZWF0ZXMgYSB3b3JkIGFycmF5IGZpbGxlZCB3aXRoIHJhbmRvbSBieXRlcy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBuQnl0ZXMgVGhlIG51bWJlciBvZiByYW5kb20gYnl0ZXMgdG8gZ2VuZXJhdGUuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSByYW5kb20gd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBzdGF0aWNcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmxpYi5Xb3JkQXJyYXkucmFuZG9tKDE2KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICByYW5kb206IGZ1bmN0aW9uIChuQnl0ZXMpIHtcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gW107XG5cblx0ICAgICAgICAgICAgdmFyIHIgPSAoZnVuY3Rpb24gKG1fdykge1xuXHQgICAgICAgICAgICAgICAgdmFyIG1fdyA9IG1fdztcblx0ICAgICAgICAgICAgICAgIHZhciBtX3ogPSAweDNhZGU2OGIxO1xuXHQgICAgICAgICAgICAgICAgdmFyIG1hc2sgPSAweGZmZmZmZmZmO1xuXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgIG1feiA9ICgweDkwNjkgKiAobV96ICYgMHhGRkZGKSArIChtX3ogPj4gMHgxMCkpICYgbWFzaztcblx0ICAgICAgICAgICAgICAgICAgICBtX3cgPSAoMHg0NjUwICogKG1fdyAmIDB4RkZGRikgKyAobV93ID4+IDB4MTApKSAmIG1hc2s7XG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9ICgobV96IDw8IDB4MTApICsgbV93KSAmIG1hc2s7XG5cdCAgICAgICAgICAgICAgICAgICAgcmVzdWx0IC89IDB4MTAwMDAwMDAwO1xuXHQgICAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSAwLjU7XG5cdCAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCAqIChNYXRoLnJhbmRvbSgpID4gLjUgPyAxIDogLTEpO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9KTtcblxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgcmNhY2hlOyBpIDwgbkJ5dGVzOyBpICs9IDQpIHtcblx0ICAgICAgICAgICAgICAgIHZhciBfciA9IHIoKHJjYWNoZSB8fCBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDAwMDAwKTtcblxuXHQgICAgICAgICAgICAgICAgcmNhY2hlID0gX3IoKSAqIDB4M2FkZTY3Yjc7XG5cdCAgICAgICAgICAgICAgICB3b3Jkcy5wdXNoKChfcigpICogMHgxMDAwMDAwMDApIHwgMCk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRBcnJheS5pbml0KHdvcmRzLCBuQnl0ZXMpO1xuXHQgICAgICAgIH1cblx0ICAgIH0pO1xuXG5cdCAgICAvKipcblx0ICAgICAqIEVuY29kZXIgbmFtZXNwYWNlLlxuXHQgICAgICovXG5cdCAgICB2YXIgQ19lbmMgPSBDLmVuYyA9IHt9O1xuXG5cdCAgICAvKipcblx0ICAgICAqIEhleCBlbmNvZGluZyBzdHJhdGVneS5cblx0ICAgICAqL1xuXHQgICAgdmFyIEhleCA9IENfZW5jLkhleCA9IHtcblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIHdvcmQgYXJyYXkgdG8gYSBoZXggc3RyaW5nLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl9IHdvcmRBcnJheSBUaGUgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGhleCBzdHJpbmcuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBoZXhTdHJpbmcgPSBDcnlwdG9KUy5lbmMuSGV4LnN0cmluZ2lmeSh3b3JkQXJyYXkpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIHN0cmluZ2lmeTogZnVuY3Rpb24gKHdvcmRBcnJheSkge1xuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gd29yZEFycmF5LndvcmRzO1xuXHQgICAgICAgICAgICB2YXIgc2lnQnl0ZXMgPSB3b3JkQXJyYXkuc2lnQnl0ZXM7XG5cblx0ICAgICAgICAgICAgLy8gQ29udmVydFxuXHQgICAgICAgICAgICB2YXIgaGV4Q2hhcnMgPSBbXTtcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWdCeXRlczsgaSsrKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgYml0ZSA9ICh3b3Jkc1tpID4+PiAyXSA+Pj4gKDI0IC0gKGkgJSA0KSAqIDgpKSAmIDB4ZmY7XG5cdCAgICAgICAgICAgICAgICBoZXhDaGFycy5wdXNoKChiaXRlID4+PiA0KS50b1N0cmluZygxNikpO1xuXHQgICAgICAgICAgICAgICAgaGV4Q2hhcnMucHVzaCgoYml0ZSAmIDB4MGYpLnRvU3RyaW5nKDE2KSk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICByZXR1cm4gaGV4Q2hhcnMuam9pbignJyk7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgaGV4IHN0cmluZyB0byBhIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGV4U3RyIFRoZSBoZXggc3RyaW5nLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBzdGF0aWNcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmVuYy5IZXgucGFyc2UoaGV4U3RyaW5nKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBwYXJzZTogZnVuY3Rpb24gKGhleFN0cikge1xuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dFxuXHQgICAgICAgICAgICB2YXIgaGV4U3RyTGVuZ3RoID0gaGV4U3RyLmxlbmd0aDtcblxuXHQgICAgICAgICAgICAvLyBDb252ZXJ0XG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IFtdO1xuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhleFN0ckxlbmd0aDsgaSArPSAyKSB7XG5cdCAgICAgICAgICAgICAgICB3b3Jkc1tpID4+PiAzXSB8PSBwYXJzZUludChoZXhTdHIuc3Vic3RyKGksIDIpLCAxNikgPDwgKDI0IC0gKGkgJSA4KSAqIDQpO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkQXJyYXkuaW5pdCh3b3JkcywgaGV4U3RyTGVuZ3RoIC8gMik7XG5cdCAgICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgLyoqXG5cdCAgICAgKiBMYXRpbjEgZW5jb2Rpbmcgc3RyYXRlZ3kuXG5cdCAgICAgKi9cblx0ICAgIHZhciBMYXRpbjEgPSBDX2VuYy5MYXRpbjEgPSB7XG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ29udmVydHMgYSB3b3JkIGFycmF5IHRvIGEgTGF0aW4xIHN0cmluZy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fSB3b3JkQXJyYXkgVGhlIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBMYXRpbjEgc3RyaW5nLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHN0YXRpY1xuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgbGF0aW4xU3RyaW5nID0gQ3J5cHRvSlMuZW5jLkxhdGluMS5zdHJpbmdpZnkod29yZEFycmF5KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBzdHJpbmdpZnk6IGZ1bmN0aW9uICh3b3JkQXJyYXkpIHtcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IHdvcmRBcnJheS53b3Jkcztcblx0ICAgICAgICAgICAgdmFyIHNpZ0J5dGVzID0gd29yZEFycmF5LnNpZ0J5dGVzO1xuXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnRcblx0ICAgICAgICAgICAgdmFyIGxhdGluMUNoYXJzID0gW107XG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2lnQnl0ZXM7IGkrKykge1xuXHQgICAgICAgICAgICAgICAgdmFyIGJpdGUgPSAod29yZHNbaSA+Pj4gMl0gPj4+ICgyNCAtIChpICUgNCkgKiA4KSkgJiAweGZmO1xuXHQgICAgICAgICAgICAgICAgbGF0aW4xQ2hhcnMucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKGJpdGUpKTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIHJldHVybiBsYXRpbjFDaGFycy5qb2luKCcnKTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ29udmVydHMgYSBMYXRpbjEgc3RyaW5nIHRvIGEgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYXRpbjFTdHIgVGhlIExhdGluMSBzdHJpbmcuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHN0YXRpY1xuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMuZW5jLkxhdGluMS5wYXJzZShsYXRpbjFTdHJpbmcpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIHBhcnNlOiBmdW5jdGlvbiAobGF0aW4xU3RyKSB7XG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0XG5cdCAgICAgICAgICAgIHZhciBsYXRpbjFTdHJMZW5ndGggPSBsYXRpbjFTdHIubGVuZ3RoO1xuXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnRcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gW107XG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGF0aW4xU3RyTGVuZ3RoOyBpKyspIHtcblx0ICAgICAgICAgICAgICAgIHdvcmRzW2kgPj4+IDJdIHw9IChsYXRpbjFTdHIuY2hhckNvZGVBdChpKSAmIDB4ZmYpIDw8ICgyNCAtIChpICUgNCkgKiA4KTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIHJldHVybiBuZXcgV29yZEFycmF5LmluaXQod29yZHMsIGxhdGluMVN0ckxlbmd0aCk7XG5cdCAgICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgLyoqXG5cdCAgICAgKiBVVEYtOCBlbmNvZGluZyBzdHJhdGVneS5cblx0ICAgICAqL1xuXHQgICAgdmFyIFV0ZjggPSBDX2VuYy5VdGY4ID0ge1xuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgd29yZCBhcnJheSB0byBhIFVURi04IHN0cmluZy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fSB3b3JkQXJyYXkgVGhlIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBVVEYtOCBzdHJpbmcuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciB1dGY4U3RyaW5nID0gQ3J5cHRvSlMuZW5jLlV0Zjguc3RyaW5naWZ5KHdvcmRBcnJheSk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgc3RyaW5naWZ5OiBmdW5jdGlvbiAod29yZEFycmF5KSB7XG5cdCAgICAgICAgICAgIHRyeSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShMYXRpbjEuc3RyaW5naWZ5KHdvcmRBcnJheSkpKTtcblx0ICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuXHQgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNYWxmb3JtZWQgVVRGLTggZGF0YScpO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgVVRGLTggc3RyaW5nIHRvIGEgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1dGY4U3RyIFRoZSBVVEYtOCBzdHJpbmcuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHN0YXRpY1xuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMuZW5jLlV0ZjgucGFyc2UodXRmOFN0cmluZyk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgcGFyc2U6IGZ1bmN0aW9uICh1dGY4U3RyKSB7XG5cdCAgICAgICAgICAgIHJldHVybiBMYXRpbjEucGFyc2UodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHV0ZjhTdHIpKSk7XG5cdCAgICAgICAgfVxuXHQgICAgfTtcblxuXHQgICAgLyoqXG5cdCAgICAgKiBBYnN0cmFjdCBidWZmZXJlZCBibG9jayBhbGdvcml0aG0gdGVtcGxhdGUuXG5cdCAgICAgKlxuXHQgICAgICogVGhlIHByb3BlcnR5IGJsb2NrU2l6ZSBtdXN0IGJlIGltcGxlbWVudGVkIGluIGEgY29uY3JldGUgc3VidHlwZS5cblx0ICAgICAqXG5cdCAgICAgKiBAcHJvcGVydHkge251bWJlcn0gX21pbkJ1ZmZlclNpemUgVGhlIG51bWJlciBvZiBibG9ja3MgdGhhdCBzaG91bGQgYmUga2VwdCB1bnByb2Nlc3NlZCBpbiB0aGUgYnVmZmVyLiBEZWZhdWx0OiAwXG5cdCAgICAgKi9cblx0ICAgIHZhciBCdWZmZXJlZEJsb2NrQWxnb3JpdGhtID0gQ19saWIuQnVmZmVyZWRCbG9ja0FsZ29yaXRobSA9IEJhc2UuZXh0ZW5kKHtcblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBSZXNldHMgdGhpcyBibG9jayBhbGdvcml0aG0ncyBkYXRhIGJ1ZmZlciB0byBpdHMgaW5pdGlhbCBzdGF0ZS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5yZXNldCgpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgIC8vIEluaXRpYWwgdmFsdWVzXG5cdCAgICAgICAgICAgIHRoaXMuX2RhdGEgPSBuZXcgV29yZEFycmF5LmluaXQoKTtcblx0ICAgICAgICAgICAgdGhpcy5fbkRhdGFCeXRlcyA9IDA7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIEFkZHMgbmV3IGRhdGEgdG8gdGhpcyBibG9jayBhbGdvcml0aG0ncyBidWZmZXIuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IGRhdGEgVGhlIGRhdGEgdG8gYXBwZW5kLiBTdHJpbmdzIGFyZSBjb252ZXJ0ZWQgdG8gYSBXb3JkQXJyYXkgdXNpbmcgVVRGLTguXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uX2FwcGVuZCgnZGF0YScpO1xuXHQgICAgICAgICAqICAgICBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLl9hcHBlbmQod29yZEFycmF5KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBfYXBwZW5kOiBmdW5jdGlvbiAoZGF0YSkge1xuXHQgICAgICAgICAgICAvLyBDb252ZXJ0IHN0cmluZyB0byBXb3JkQXJyYXksIGVsc2UgYXNzdW1lIFdvcmRBcnJheSBhbHJlYWR5XG5cdCAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YSA9PSAnc3RyaW5nJykge1xuXHQgICAgICAgICAgICAgICAgZGF0YSA9IFV0ZjgucGFyc2UoZGF0YSk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAvLyBBcHBlbmRcblx0ICAgICAgICAgICAgdGhpcy5fZGF0YS5jb25jYXQoZGF0YSk7XG5cdCAgICAgICAgICAgIHRoaXMuX25EYXRhQnl0ZXMgKz0gZGF0YS5zaWdCeXRlcztcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogUHJvY2Vzc2VzIGF2YWlsYWJsZSBkYXRhIGJsb2Nrcy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIFRoaXMgbWV0aG9kIGludm9rZXMgX2RvUHJvY2Vzc0Jsb2NrKG9mZnNldCksIHdoaWNoIG11c3QgYmUgaW1wbGVtZW50ZWQgYnkgYSBjb25jcmV0ZSBzdWJ0eXBlLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtib29sZWFufSBkb0ZsdXNoIFdoZXRoZXIgYWxsIGJsb2NrcyBhbmQgcGFydGlhbCBibG9ja3Mgc2hvdWxkIGJlIHByb2Nlc3NlZC5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHByb2Nlc3NlZCBkYXRhLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9IGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uX3Byb2Nlc3MoKTtcblx0ICAgICAgICAgKiAgICAgdmFyIHByb2Nlc3NlZERhdGEgPSBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLl9wcm9jZXNzKCEhJ2ZsdXNoJyk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgX3Byb2Nlc3M6IGZ1bmN0aW9uIChkb0ZsdXNoKSB7XG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xuXHQgICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGE7XG5cdCAgICAgICAgICAgIHZhciBkYXRhV29yZHMgPSBkYXRhLndvcmRzO1xuXHQgICAgICAgICAgICB2YXIgZGF0YVNpZ0J5dGVzID0gZGF0YS5zaWdCeXRlcztcblx0ICAgICAgICAgICAgdmFyIGJsb2NrU2l6ZSA9IHRoaXMuYmxvY2tTaXplO1xuXHQgICAgICAgICAgICB2YXIgYmxvY2tTaXplQnl0ZXMgPSBibG9ja1NpemUgKiA0O1xuXG5cdCAgICAgICAgICAgIC8vIENvdW50IGJsb2NrcyByZWFkeVxuXHQgICAgICAgICAgICB2YXIgbkJsb2Nrc1JlYWR5ID0gZGF0YVNpZ0J5dGVzIC8gYmxvY2tTaXplQnl0ZXM7XG5cdCAgICAgICAgICAgIGlmIChkb0ZsdXNoKSB7XG5cdCAgICAgICAgICAgICAgICAvLyBSb3VuZCB1cCB0byBpbmNsdWRlIHBhcnRpYWwgYmxvY2tzXG5cdCAgICAgICAgICAgICAgICBuQmxvY2tzUmVhZHkgPSBNYXRoLmNlaWwobkJsb2Nrc1JlYWR5KTtcblx0ICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgIC8vIFJvdW5kIGRvd24gdG8gaW5jbHVkZSBvbmx5IGZ1bGwgYmxvY2tzLFxuXHQgICAgICAgICAgICAgICAgLy8gbGVzcyB0aGUgbnVtYmVyIG9mIGJsb2NrcyB0aGF0IG11c3QgcmVtYWluIGluIHRoZSBidWZmZXJcblx0ICAgICAgICAgICAgICAgIG5CbG9ja3NSZWFkeSA9IE1hdGgubWF4KChuQmxvY2tzUmVhZHkgfCAwKSAtIHRoaXMuX21pbkJ1ZmZlclNpemUsIDApO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgLy8gQ291bnQgd29yZHMgcmVhZHlcblx0ICAgICAgICAgICAgdmFyIG5Xb3Jkc1JlYWR5ID0gbkJsb2Nrc1JlYWR5ICogYmxvY2tTaXplO1xuXG5cdCAgICAgICAgICAgIC8vIENvdW50IGJ5dGVzIHJlYWR5XG5cdCAgICAgICAgICAgIHZhciBuQnl0ZXNSZWFkeSA9IE1hdGgubWluKG5Xb3Jkc1JlYWR5ICogNCwgZGF0YVNpZ0J5dGVzKTtcblxuXHQgICAgICAgICAgICAvLyBQcm9jZXNzIGJsb2Nrc1xuXHQgICAgICAgICAgICBpZiAobldvcmRzUmVhZHkpIHtcblx0ICAgICAgICAgICAgICAgIGZvciAodmFyIG9mZnNldCA9IDA7IG9mZnNldCA8IG5Xb3Jkc1JlYWR5OyBvZmZzZXQgKz0gYmxvY2tTaXplKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgLy8gUGVyZm9ybSBjb25jcmV0ZS1hbGdvcml0aG0gbG9naWNcblx0ICAgICAgICAgICAgICAgICAgICB0aGlzLl9kb1Byb2Nlc3NCbG9jayhkYXRhV29yZHMsIG9mZnNldCk7XG5cdCAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBwcm9jZXNzZWQgd29yZHNcblx0ICAgICAgICAgICAgICAgIHZhciBwcm9jZXNzZWRXb3JkcyA9IGRhdGFXb3Jkcy5zcGxpY2UoMCwgbldvcmRzUmVhZHkpO1xuXHQgICAgICAgICAgICAgICAgZGF0YS5zaWdCeXRlcyAtPSBuQnl0ZXNSZWFkeTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIC8vIFJldHVybiBwcm9jZXNzZWQgd29yZHNcblx0ICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkQXJyYXkuaW5pdChwcm9jZXNzZWRXb3JkcywgbkJ5dGVzUmVhZHkpO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBDcmVhdGVzIGEgY29weSBvZiB0aGlzIG9iamVjdC5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIGNsb25lLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgY2xvbmUgPSBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLmNsb25lKCk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgdmFyIGNsb25lID0gQmFzZS5jbG9uZS5jYWxsKHRoaXMpO1xuXHQgICAgICAgICAgICBjbG9uZS5fZGF0YSA9IHRoaXMuX2RhdGEuY2xvbmUoKTtcblxuXHQgICAgICAgICAgICByZXR1cm4gY2xvbmU7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIF9taW5CdWZmZXJTaXplOiAwXG5cdCAgICB9KTtcblxuXHQgICAgLyoqXG5cdCAgICAgKiBBYnN0cmFjdCBoYXNoZXIgdGVtcGxhdGUuXG5cdCAgICAgKlxuXHQgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IGJsb2NrU2l6ZSBUaGUgbnVtYmVyIG9mIDMyLWJpdCB3b3JkcyB0aGlzIGhhc2hlciBvcGVyYXRlcyBvbi4gRGVmYXVsdDogMTYgKDUxMiBiaXRzKVxuXHQgICAgICovXG5cdCAgICB2YXIgSGFzaGVyID0gQ19saWIuSGFzaGVyID0gQnVmZmVyZWRCbG9ja0FsZ29yaXRobS5leHRlbmQoe1xuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucy5cblx0ICAgICAgICAgKi9cblx0ICAgICAgICBjZmc6IEJhc2UuZXh0ZW5kKCksXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBJbml0aWFsaXplcyBhIG5ld2x5IGNyZWF0ZWQgaGFzaGVyLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGNmZyAoT3B0aW9uYWwpIFRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgdG8gdXNlIGZvciB0aGlzIGhhc2ggY29tcHV0YXRpb24uXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBoYXNoZXIgPSBDcnlwdG9KUy5hbGdvLlNIQTI1Ni5jcmVhdGUoKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBpbml0OiBmdW5jdGlvbiAoY2ZnKSB7XG5cdCAgICAgICAgICAgIC8vIEFwcGx5IGNvbmZpZyBkZWZhdWx0c1xuXHQgICAgICAgICAgICB0aGlzLmNmZyA9IHRoaXMuY2ZnLmV4dGVuZChjZmcpO1xuXG5cdCAgICAgICAgICAgIC8vIFNldCBpbml0aWFsIHZhbHVlc1xuXHQgICAgICAgICAgICB0aGlzLnJlc2V0KCk7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIFJlc2V0cyB0aGlzIGhhc2hlciB0byBpdHMgaW5pdGlhbCBzdGF0ZS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgaGFzaGVyLnJlc2V0KCk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgLy8gUmVzZXQgZGF0YSBidWZmZXJcblx0ICAgICAgICAgICAgQnVmZmVyZWRCbG9ja0FsZ29yaXRobS5yZXNldC5jYWxsKHRoaXMpO1xuXG5cdCAgICAgICAgICAgIC8vIFBlcmZvcm0gY29uY3JldGUtaGFzaGVyIGxvZ2ljXG5cdCAgICAgICAgICAgIHRoaXMuX2RvUmVzZXQoKTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogVXBkYXRlcyB0aGlzIGhhc2hlciB3aXRoIGEgbWVzc2FnZS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gbWVzc2FnZVVwZGF0ZSBUaGUgbWVzc2FnZSB0byBhcHBlbmQuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtIYXNoZXJ9IFRoaXMgaGFzaGVyLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICBoYXNoZXIudXBkYXRlKCdtZXNzYWdlJyk7XG5cdCAgICAgICAgICogICAgIGhhc2hlci51cGRhdGUod29yZEFycmF5KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChtZXNzYWdlVXBkYXRlKSB7XG5cdCAgICAgICAgICAgIC8vIEFwcGVuZFxuXHQgICAgICAgICAgICB0aGlzLl9hcHBlbmQobWVzc2FnZVVwZGF0ZSk7XG5cblx0ICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBoYXNoXG5cdCAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcblxuXHQgICAgICAgICAgICAvLyBDaGFpbmFibGVcblx0ICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIEZpbmFsaXplcyB0aGUgaGFzaCBjb21wdXRhdGlvbi5cblx0ICAgICAgICAgKiBOb3RlIHRoYXQgdGhlIGZpbmFsaXplIG9wZXJhdGlvbiBpcyBlZmZlY3RpdmVseSBhIGRlc3RydWN0aXZlLCByZWFkLW9uY2Ugb3BlcmF0aW9uLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlVXBkYXRlIChPcHRpb25hbCkgQSBmaW5hbCBtZXNzYWdlIHVwZGF0ZS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIGhhc2guXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBoYXNoID0gaGFzaGVyLmZpbmFsaXplKCk7XG5cdCAgICAgICAgICogICAgIHZhciBoYXNoID0gaGFzaGVyLmZpbmFsaXplKCdtZXNzYWdlJyk7XG5cdCAgICAgICAgICogICAgIHZhciBoYXNoID0gaGFzaGVyLmZpbmFsaXplKHdvcmRBcnJheSk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uIChtZXNzYWdlVXBkYXRlKSB7XG5cdCAgICAgICAgICAgIC8vIEZpbmFsIG1lc3NhZ2UgdXBkYXRlXG5cdCAgICAgICAgICAgIGlmIChtZXNzYWdlVXBkYXRlKSB7XG5cdCAgICAgICAgICAgICAgICB0aGlzLl9hcHBlbmQobWVzc2FnZVVwZGF0ZSk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbmNyZXRlLWhhc2hlciBsb2dpY1xuXHQgICAgICAgICAgICB2YXIgaGFzaCA9IHRoaXMuX2RvRmluYWxpemUoKTtcblxuXHQgICAgICAgICAgICByZXR1cm4gaGFzaDtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgYmxvY2tTaXplOiA1MTIvMzIsXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBDcmVhdGVzIGEgc2hvcnRjdXQgZnVuY3Rpb24gdG8gYSBoYXNoZXIncyBvYmplY3QgaW50ZXJmYWNlLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtIYXNoZXJ9IGhhc2hlciBUaGUgaGFzaGVyIHRvIGNyZWF0ZSBhIGhlbHBlciBmb3IuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIHNob3J0Y3V0IGZ1bmN0aW9uLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHN0YXRpY1xuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgU0hBMjU2ID0gQ3J5cHRvSlMubGliLkhhc2hlci5fY3JlYXRlSGVscGVyKENyeXB0b0pTLmFsZ28uU0hBMjU2KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBfY3JlYXRlSGVscGVyOiBmdW5jdGlvbiAoaGFzaGVyKSB7XG5cdCAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAobWVzc2FnZSwgY2ZnKSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gbmV3IGhhc2hlci5pbml0KGNmZykuZmluYWxpemUobWVzc2FnZSk7XG5cdCAgICAgICAgICAgIH07XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENyZWF0ZXMgYSBzaG9ydGN1dCBmdW5jdGlvbiB0byB0aGUgSE1BQydzIG9iamVjdCBpbnRlcmZhY2UuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge0hhc2hlcn0gaGFzaGVyIFRoZSBoYXNoZXIgdG8gdXNlIGluIHRoaXMgSE1BQyBoZWxwZXIuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIHNob3J0Y3V0IGZ1bmN0aW9uLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHN0YXRpY1xuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgSG1hY1NIQTI1NiA9IENyeXB0b0pTLmxpYi5IYXNoZXIuX2NyZWF0ZUhtYWNIZWxwZXIoQ3J5cHRvSlMuYWxnby5TSEEyNTYpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIF9jcmVhdGVIbWFjSGVscGVyOiBmdW5jdGlvbiAoaGFzaGVyKSB7XG5cdCAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAobWVzc2FnZSwga2V5KSB7XG5cdCAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENfYWxnby5ITUFDLmluaXQoaGFzaGVyLCBrZXkpLmZpbmFsaXplKG1lc3NhZ2UpO1xuXHQgICAgICAgICAgICB9O1xuXHQgICAgICAgIH1cblx0ICAgIH0pO1xuXG5cdCAgICAvKipcblx0ICAgICAqIEFsZ29yaXRobSBuYW1lc3BhY2UuXG5cdCAgICAgKi9cblx0ICAgIHZhciBDX2FsZ28gPSBDLmFsZ28gPSB7fTtcblxuXHQgICAgcmV0dXJuIEM7XG5cdH0oTWF0aCkpO1xuXG5cblx0cmV0dXJuIENyeXB0b0pTO1xuXG59KSk7IiwiOyhmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcblx0XHQvLyBDb21tb25KU1xuXHRcdG1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZShcIi4vY29yZVwiKSk7XG5cdH1cblx0ZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcblx0XHQvLyBBTURcblx0XHRkZWZpbmUoW1wiLi9jb3JlXCJdLCBmYWN0b3J5KTtcblx0fVxuXHRlbHNlIHtcblx0XHQvLyBHbG9iYWwgKGJyb3dzZXIpXG5cdFx0ZmFjdG9yeShyb290LkNyeXB0b0pTKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAoQ3J5cHRvSlMpIHtcblxuXHRyZXR1cm4gQ3J5cHRvSlMuZW5jLkhleDtcblxufSkpOyIsIjsoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnksIHVuZGVmKSB7XG5cdGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuXHRcdC8vIENvbW1vbkpTXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKFwiLi9jb3JlXCIpLCByZXF1aXJlKFwiLi9zaGEyNTZcIiksIHJlcXVpcmUoXCIuL2htYWNcIikpO1xuXHR9XG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG5cdFx0Ly8gQU1EXG5cdFx0ZGVmaW5lKFtcIi4vY29yZVwiLCBcIi4vc2hhMjU2XCIsIFwiLi9obWFjXCJdLCBmYWN0b3J5KTtcblx0fVxuXHRlbHNlIHtcblx0XHQvLyBHbG9iYWwgKGJyb3dzZXIpXG5cdFx0ZmFjdG9yeShyb290LkNyeXB0b0pTKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAoQ3J5cHRvSlMpIHtcblxuXHRyZXR1cm4gQ3J5cHRvSlMuSG1hY1NIQTI1NjtcblxufSkpOyIsIjsoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcblx0aWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XG5cdFx0Ly8gQ29tbW9uSlNcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCIuL2NvcmVcIikpO1xuXHR9XG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XG5cdFx0Ly8gQU1EXG5cdFx0ZGVmaW5lKFtcIi4vY29yZVwiXSwgZmFjdG9yeSk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ly8gR2xvYmFsIChicm93c2VyKVxuXHRcdGZhY3Rvcnkocm9vdC5DcnlwdG9KUyk7XG5cdH1cbn0odGhpcywgZnVuY3Rpb24gKENyeXB0b0pTKSB7XG5cblx0KGZ1bmN0aW9uICgpIHtcblx0ICAgIC8vIFNob3J0Y3V0c1xuXHQgICAgdmFyIEMgPSBDcnlwdG9KUztcblx0ICAgIHZhciBDX2xpYiA9IEMubGliO1xuXHQgICAgdmFyIEJhc2UgPSBDX2xpYi5CYXNlO1xuXHQgICAgdmFyIENfZW5jID0gQy5lbmM7XG5cdCAgICB2YXIgVXRmOCA9IENfZW5jLlV0Zjg7XG5cdCAgICB2YXIgQ19hbGdvID0gQy5hbGdvO1xuXG5cdCAgICAvKipcblx0ICAgICAqIEhNQUMgYWxnb3JpdGhtLlxuXHQgICAgICovXG5cdCAgICB2YXIgSE1BQyA9IENfYWxnby5ITUFDID0gQmFzZS5leHRlbmQoe1xuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIEluaXRpYWxpemVzIGEgbmV3bHkgY3JlYXRlZCBITUFDLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtIYXNoZXJ9IGhhc2hlciBUaGUgaGFzaCBhbGdvcml0aG0gdG8gdXNlLlxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30ga2V5IFRoZSBzZWNyZXQga2V5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgaG1hY0hhc2hlciA9IENyeXB0b0pTLmFsZ28uSE1BQy5jcmVhdGUoQ3J5cHRvSlMuYWxnby5TSEEyNTYsIGtleSk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgaW5pdDogZnVuY3Rpb24gKGhhc2hlciwga2V5KSB7XG5cdCAgICAgICAgICAgIC8vIEluaXQgaGFzaGVyXG5cdCAgICAgICAgICAgIGhhc2hlciA9IHRoaXMuX2hhc2hlciA9IG5ldyBoYXNoZXIuaW5pdCgpO1xuXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnQgc3RyaW5nIHRvIFdvcmRBcnJheSwgZWxzZSBhc3N1bWUgV29yZEFycmF5IGFscmVhZHlcblx0ICAgICAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT0gJ3N0cmluZycpIHtcblx0ICAgICAgICAgICAgICAgIGtleSA9IFV0ZjgucGFyc2Uoa2V5KTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xuXHQgICAgICAgICAgICB2YXIgaGFzaGVyQmxvY2tTaXplID0gaGFzaGVyLmJsb2NrU2l6ZTtcblx0ICAgICAgICAgICAgdmFyIGhhc2hlckJsb2NrU2l6ZUJ5dGVzID0gaGFzaGVyQmxvY2tTaXplICogNDtcblxuXHQgICAgICAgICAgICAvLyBBbGxvdyBhcmJpdHJhcnkgbGVuZ3RoIGtleXNcblx0ICAgICAgICAgICAgaWYgKGtleS5zaWdCeXRlcyA+IGhhc2hlckJsb2NrU2l6ZUJ5dGVzKSB7XG5cdCAgICAgICAgICAgICAgICBrZXkgPSBoYXNoZXIuZmluYWxpemUoa2V5KTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIC8vIENsYW1wIGV4Y2VzcyBiaXRzXG5cdCAgICAgICAgICAgIGtleS5jbGFtcCgpO1xuXG5cdCAgICAgICAgICAgIC8vIENsb25lIGtleSBmb3IgaW5uZXIgYW5kIG91dGVyIHBhZHNcblx0ICAgICAgICAgICAgdmFyIG9LZXkgPSB0aGlzLl9vS2V5ID0ga2V5LmNsb25lKCk7XG5cdCAgICAgICAgICAgIHZhciBpS2V5ID0gdGhpcy5faUtleSA9IGtleS5jbG9uZSgpO1xuXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xuXHQgICAgICAgICAgICB2YXIgb0tleVdvcmRzID0gb0tleS53b3Jkcztcblx0ICAgICAgICAgICAgdmFyIGlLZXlXb3JkcyA9IGlLZXkud29yZHM7XG5cblx0ICAgICAgICAgICAgLy8gWE9SIGtleXMgd2l0aCBwYWQgY29uc3RhbnRzXG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGFzaGVyQmxvY2tTaXplOyBpKyspIHtcblx0ICAgICAgICAgICAgICAgIG9LZXlXb3Jkc1tpXSBePSAweDVjNWM1YzVjO1xuXHQgICAgICAgICAgICAgICAgaUtleVdvcmRzW2ldIF49IDB4MzYzNjM2MzY7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgb0tleS5zaWdCeXRlcyA9IGlLZXkuc2lnQnl0ZXMgPSBoYXNoZXJCbG9ja1NpemVCeXRlcztcblxuXHQgICAgICAgICAgICAvLyBTZXQgaW5pdGlhbCB2YWx1ZXNcblx0ICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBSZXNldHMgdGhpcyBITUFDIHRvIGl0cyBpbml0aWFsIHN0YXRlLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICBobWFjSGFzaGVyLnJlc2V0KCk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRcblx0ICAgICAgICAgICAgdmFyIGhhc2hlciA9IHRoaXMuX2hhc2hlcjtcblxuXHQgICAgICAgICAgICAvLyBSZXNldFxuXHQgICAgICAgICAgICBoYXNoZXIucmVzZXQoKTtcblx0ICAgICAgICAgICAgaGFzaGVyLnVwZGF0ZSh0aGlzLl9pS2V5KTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogVXBkYXRlcyB0aGlzIEhNQUMgd2l0aCBhIG1lc3NhZ2UuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IG1lc3NhZ2VVcGRhdGUgVGhlIG1lc3NhZ2UgdG8gYXBwZW5kLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHJldHVybiB7SE1BQ30gVGhpcyBITUFDIGluc3RhbmNlLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICBobWFjSGFzaGVyLnVwZGF0ZSgnbWVzc2FnZScpO1xuXHQgICAgICAgICAqICAgICBobWFjSGFzaGVyLnVwZGF0ZSh3b3JkQXJyYXkpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKG1lc3NhZ2VVcGRhdGUpIHtcblx0ICAgICAgICAgICAgdGhpcy5faGFzaGVyLnVwZGF0ZShtZXNzYWdlVXBkYXRlKTtcblxuXHQgICAgICAgICAgICAvLyBDaGFpbmFibGVcblx0ICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIEZpbmFsaXplcyB0aGUgSE1BQyBjb21wdXRhdGlvbi5cblx0ICAgICAgICAgKiBOb3RlIHRoYXQgdGhlIGZpbmFsaXplIG9wZXJhdGlvbiBpcyBlZmZlY3RpdmVseSBhIGRlc3RydWN0aXZlLCByZWFkLW9uY2Ugb3BlcmF0aW9uLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlVXBkYXRlIChPcHRpb25hbCkgQSBmaW5hbCBtZXNzYWdlIHVwZGF0ZS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIEhNQUMuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBobWFjID0gaG1hY0hhc2hlci5maW5hbGl6ZSgpO1xuXHQgICAgICAgICAqICAgICB2YXIgaG1hYyA9IGhtYWNIYXNoZXIuZmluYWxpemUoJ21lc3NhZ2UnKTtcblx0ICAgICAgICAgKiAgICAgdmFyIGhtYWMgPSBobWFjSGFzaGVyLmZpbmFsaXplKHdvcmRBcnJheSk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uIChtZXNzYWdlVXBkYXRlKSB7XG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0XG5cdCAgICAgICAgICAgIHZhciBoYXNoZXIgPSB0aGlzLl9oYXNoZXI7XG5cblx0ICAgICAgICAgICAgLy8gQ29tcHV0ZSBITUFDXG5cdCAgICAgICAgICAgIHZhciBpbm5lckhhc2ggPSBoYXNoZXIuZmluYWxpemUobWVzc2FnZVVwZGF0ZSk7XG5cdCAgICAgICAgICAgIGhhc2hlci5yZXNldCgpO1xuXHQgICAgICAgICAgICB2YXIgaG1hYyA9IGhhc2hlci5maW5hbGl6ZSh0aGlzLl9vS2V5LmNsb25lKCkuY29uY2F0KGlubmVySGFzaCkpO1xuXG5cdCAgICAgICAgICAgIHJldHVybiBobWFjO1xuXHQgICAgICAgIH1cblx0ICAgIH0pO1xuXHR9KCkpO1xuXG5cbn0pKTsiLCI7KGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuXHRcdC8vIENvbW1vbkpTXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKFwiLi9jb3JlXCIpKTtcblx0fVxuXHRlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIEFNRFxuXHRcdGRlZmluZShbXCIuL2NvcmVcIl0sIGZhY3RvcnkpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdC8vIEdsb2JhbCAoYnJvd3Nlcilcblx0XHRmYWN0b3J5KHJvb3QuQ3J5cHRvSlMpO1xuXHR9XG59KHRoaXMsIGZ1bmN0aW9uIChDcnlwdG9KUykge1xuXG5cdChmdW5jdGlvbiAoTWF0aCkge1xuXHQgICAgLy8gU2hvcnRjdXRzXG5cdCAgICB2YXIgQyA9IENyeXB0b0pTO1xuXHQgICAgdmFyIENfbGliID0gQy5saWI7XG5cdCAgICB2YXIgV29yZEFycmF5ID0gQ19saWIuV29yZEFycmF5O1xuXHQgICAgdmFyIEhhc2hlciA9IENfbGliLkhhc2hlcjtcblx0ICAgIHZhciBDX2FsZ28gPSBDLmFsZ287XG5cblx0ICAgIC8vIEluaXRpYWxpemF0aW9uIGFuZCByb3VuZCBjb25zdGFudHMgdGFibGVzXG5cdCAgICB2YXIgSCA9IFtdO1xuXHQgICAgdmFyIEsgPSBbXTtcblxuXHQgICAgLy8gQ29tcHV0ZSBjb25zdGFudHNcblx0ICAgIChmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgZnVuY3Rpb24gaXNQcmltZShuKSB7XG5cdCAgICAgICAgICAgIHZhciBzcXJ0TiA9IE1hdGguc3FydChuKTtcblx0ICAgICAgICAgICAgZm9yICh2YXIgZmFjdG9yID0gMjsgZmFjdG9yIDw9IHNxcnROOyBmYWN0b3IrKykge1xuXHQgICAgICAgICAgICAgICAgaWYgKCEobiAlIGZhY3RvcikpIHtcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG5cdCAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblx0ICAgICAgICB9XG5cblx0ICAgICAgICBmdW5jdGlvbiBnZXRGcmFjdGlvbmFsQml0cyhuKSB7XG5cdCAgICAgICAgICAgIHJldHVybiAoKG4gLSAobiB8IDApKSAqIDB4MTAwMDAwMDAwKSB8IDA7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgdmFyIG4gPSAyO1xuXHQgICAgICAgIHZhciBuUHJpbWUgPSAwO1xuXHQgICAgICAgIHdoaWxlIChuUHJpbWUgPCA2NCkge1xuXHQgICAgICAgICAgICBpZiAoaXNQcmltZShuKSkge1xuXHQgICAgICAgICAgICAgICAgaWYgKG5QcmltZSA8IDgpIHtcblx0ICAgICAgICAgICAgICAgICAgICBIW25QcmltZV0gPSBnZXRGcmFjdGlvbmFsQml0cyhNYXRoLnBvdyhuLCAxIC8gMikpO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgS1tuUHJpbWVdID0gZ2V0RnJhY3Rpb25hbEJpdHMoTWF0aC5wb3cobiwgMSAvIDMpKTtcblxuXHQgICAgICAgICAgICAgICAgblByaW1lKys7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICBuKys7XG5cdCAgICAgICAgfVxuXHQgICAgfSgpKTtcblxuXHQgICAgLy8gUmV1c2FibGUgb2JqZWN0XG5cdCAgICB2YXIgVyA9IFtdO1xuXG5cdCAgICAvKipcblx0ICAgICAqIFNIQS0yNTYgaGFzaCBhbGdvcml0aG0uXG5cdCAgICAgKi9cblx0ICAgIHZhciBTSEEyNTYgPSBDX2FsZ28uU0hBMjU2ID0gSGFzaGVyLmV4dGVuZCh7XG5cdCAgICAgICAgX2RvUmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgdGhpcy5faGFzaCA9IG5ldyBXb3JkQXJyYXkuaW5pdChILnNsaWNlKDApKTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgX2RvUHJvY2Vzc0Jsb2NrOiBmdW5jdGlvbiAoTSwgb2Zmc2V0KSB7XG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0XG5cdCAgICAgICAgICAgIHZhciBIID0gdGhpcy5faGFzaC53b3JkcztcblxuXHQgICAgICAgICAgICAvLyBXb3JraW5nIHZhcmlhYmxlc1xuXHQgICAgICAgICAgICB2YXIgYSA9IEhbMF07XG5cdCAgICAgICAgICAgIHZhciBiID0gSFsxXTtcblx0ICAgICAgICAgICAgdmFyIGMgPSBIWzJdO1xuXHQgICAgICAgICAgICB2YXIgZCA9IEhbM107XG5cdCAgICAgICAgICAgIHZhciBlID0gSFs0XTtcblx0ICAgICAgICAgICAgdmFyIGYgPSBIWzVdO1xuXHQgICAgICAgICAgICB2YXIgZyA9IEhbNl07XG5cdCAgICAgICAgICAgIHZhciBoID0gSFs3XTtcblxuXHQgICAgICAgICAgICAvLyBDb21wdXRhdGlvblxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcblx0ICAgICAgICAgICAgICAgIGlmIChpIDwgMTYpIHtcblx0ICAgICAgICAgICAgICAgICAgICBXW2ldID0gTVtvZmZzZXQgKyBpXSB8IDA7XG5cdCAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciBnYW1tYTB4ID0gV1tpIC0gMTVdO1xuXHQgICAgICAgICAgICAgICAgICAgIHZhciBnYW1tYTAgID0gKChnYW1tYTB4IDw8IDI1KSB8IChnYW1tYTB4ID4+PiA3KSkgIF5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgoZ2FtbWEweCA8PCAxNCkgfCAoZ2FtbWEweCA+Pj4gMTgpKSBeXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGdhbW1hMHggPj4+IDMpO1xuXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGdhbW1hMXggPSBXW2kgLSAyXTtcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgZ2FtbWExICA9ICgoZ2FtbWExeCA8PCAxNSkgfCAoZ2FtbWExeCA+Pj4gMTcpKSBeXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKGdhbW1hMXggPDwgMTMpIHwgKGdhbW1hMXggPj4+IDE5KSkgXlxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChnYW1tYTF4ID4+PiAxMCk7XG5cblx0ICAgICAgICAgICAgICAgICAgICBXW2ldID0gZ2FtbWEwICsgV1tpIC0gN10gKyBnYW1tYTEgKyBXW2kgLSAxNl07XG5cdCAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgIHZhciBjaCAgPSAoZSAmIGYpIF4gKH5lICYgZyk7XG5cdCAgICAgICAgICAgICAgICB2YXIgbWFqID0gKGEgJiBiKSBeIChhICYgYykgXiAoYiAmIGMpO1xuXG5cdCAgICAgICAgICAgICAgICB2YXIgc2lnbWEwID0gKChhIDw8IDMwKSB8IChhID4+PiAyKSkgXiAoKGEgPDwgMTkpIHwgKGEgPj4+IDEzKSkgXiAoKGEgPDwgMTApIHwgKGEgPj4+IDIyKSk7XG5cdCAgICAgICAgICAgICAgICB2YXIgc2lnbWExID0gKChlIDw8IDI2KSB8IChlID4+PiA2KSkgXiAoKGUgPDwgMjEpIHwgKGUgPj4+IDExKSkgXiAoKGUgPDwgNykgIHwgKGUgPj4+IDI1KSk7XG5cblx0ICAgICAgICAgICAgICAgIHZhciB0MSA9IGggKyBzaWdtYTEgKyBjaCArIEtbaV0gKyBXW2ldO1xuXHQgICAgICAgICAgICAgICAgdmFyIHQyID0gc2lnbWEwICsgbWFqO1xuXG5cdCAgICAgICAgICAgICAgICBoID0gZztcblx0ICAgICAgICAgICAgICAgIGcgPSBmO1xuXHQgICAgICAgICAgICAgICAgZiA9IGU7XG5cdCAgICAgICAgICAgICAgICBlID0gKGQgKyB0MSkgfCAwO1xuXHQgICAgICAgICAgICAgICAgZCA9IGM7XG5cdCAgICAgICAgICAgICAgICBjID0gYjtcblx0ICAgICAgICAgICAgICAgIGIgPSBhO1xuXHQgICAgICAgICAgICAgICAgYSA9ICh0MSArIHQyKSB8IDA7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAvLyBJbnRlcm1lZGlhdGUgaGFzaCB2YWx1ZVxuXHQgICAgICAgICAgICBIWzBdID0gKEhbMF0gKyBhKSB8IDA7XG5cdCAgICAgICAgICAgIEhbMV0gPSAoSFsxXSArIGIpIHwgMDtcblx0ICAgICAgICAgICAgSFsyXSA9IChIWzJdICsgYykgfCAwO1xuXHQgICAgICAgICAgICBIWzNdID0gKEhbM10gKyBkKSB8IDA7XG5cdCAgICAgICAgICAgIEhbNF0gPSAoSFs0XSArIGUpIHwgMDtcblx0ICAgICAgICAgICAgSFs1XSA9IChIWzVdICsgZikgfCAwO1xuXHQgICAgICAgICAgICBIWzZdID0gKEhbNl0gKyBnKSB8IDA7XG5cdCAgICAgICAgICAgIEhbN10gPSAoSFs3XSArIGgpIHwgMDtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgX2RvRmluYWxpemU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXG5cdCAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YTtcblx0ICAgICAgICAgICAgdmFyIGRhdGFXb3JkcyA9IGRhdGEud29yZHM7XG5cblx0ICAgICAgICAgICAgdmFyIG5CaXRzVG90YWwgPSB0aGlzLl9uRGF0YUJ5dGVzICogODtcblx0ICAgICAgICAgICAgdmFyIG5CaXRzTGVmdCA9IGRhdGEuc2lnQnl0ZXMgKiA4O1xuXG5cdCAgICAgICAgICAgIC8vIEFkZCBwYWRkaW5nXG5cdCAgICAgICAgICAgIGRhdGFXb3Jkc1tuQml0c0xlZnQgPj4+IDVdIHw9IDB4ODAgPDwgKDI0IC0gbkJpdHNMZWZ0ICUgMzIpO1xuXHQgICAgICAgICAgICBkYXRhV29yZHNbKCgobkJpdHNMZWZ0ICsgNjQpID4+PiA5KSA8PCA0KSArIDE0XSA9IE1hdGguZmxvb3IobkJpdHNUb3RhbCAvIDB4MTAwMDAwMDAwKTtcblx0ICAgICAgICAgICAgZGF0YVdvcmRzWygoKG5CaXRzTGVmdCArIDY0KSA+Pj4gOSkgPDwgNCkgKyAxNV0gPSBuQml0c1RvdGFsO1xuXHQgICAgICAgICAgICBkYXRhLnNpZ0J5dGVzID0gZGF0YVdvcmRzLmxlbmd0aCAqIDQ7XG5cblx0ICAgICAgICAgICAgLy8gSGFzaCBmaW5hbCBibG9ja3Ncblx0ICAgICAgICAgICAgdGhpcy5fcHJvY2VzcygpO1xuXG5cdCAgICAgICAgICAgIC8vIFJldHVybiBmaW5hbCBjb21wdXRlZCBoYXNoXG5cdCAgICAgICAgICAgIHJldHVybiB0aGlzLl9oYXNoO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICB2YXIgY2xvbmUgPSBIYXNoZXIuY2xvbmUuY2FsbCh0aGlzKTtcblx0ICAgICAgICAgICAgY2xvbmUuX2hhc2ggPSB0aGlzLl9oYXNoLmNsb25lKCk7XG5cblx0ICAgICAgICAgICAgcmV0dXJuIGNsb25lO1xuXHQgICAgICAgIH1cblx0ICAgIH0pO1xuXG5cdCAgICAvKipcblx0ICAgICAqIFNob3J0Y3V0IGZ1bmN0aW9uIHRvIHRoZSBoYXNoZXIncyBvYmplY3QgaW50ZXJmYWNlLlxuXHQgICAgICpcblx0ICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBoYXNoLlxuXHQgICAgICpcblx0ICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIGhhc2guXG5cdCAgICAgKlxuXHQgICAgICogQHN0YXRpY1xuXHQgICAgICpcblx0ICAgICAqIEBleGFtcGxlXG5cdCAgICAgKlxuXHQgICAgICogICAgIHZhciBoYXNoID0gQ3J5cHRvSlMuU0hBMjU2KCdtZXNzYWdlJyk7XG5cdCAgICAgKiAgICAgdmFyIGhhc2ggPSBDcnlwdG9KUy5TSEEyNTYod29yZEFycmF5KTtcblx0ICAgICAqL1xuXHQgICAgQy5TSEEyNTYgPSBIYXNoZXIuX2NyZWF0ZUhlbHBlcihTSEEyNTYpO1xuXG5cdCAgICAvKipcblx0ICAgICAqIFNob3J0Y3V0IGZ1bmN0aW9uIHRvIHRoZSBITUFDJ3Mgb2JqZWN0IGludGVyZmFjZS5cblx0ICAgICAqXG5cdCAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gaGFzaC5cblx0ICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30ga2V5IFRoZSBzZWNyZXQga2V5LlxuXHQgICAgICpcblx0ICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIEhNQUMuXG5cdCAgICAgKlxuXHQgICAgICogQHN0YXRpY1xuXHQgICAgICpcblx0ICAgICAqIEBleGFtcGxlXG5cdCAgICAgKlxuXHQgICAgICogICAgIHZhciBobWFjID0gQ3J5cHRvSlMuSG1hY1NIQTI1NihtZXNzYWdlLCBrZXkpO1xuXHQgICAgICovXG5cdCAgICBDLkhtYWNTSEEyNTYgPSBIYXNoZXIuX2NyZWF0ZUhtYWNIZWxwZXIoU0hBMjU2KTtcblx0fShNYXRoKSk7XG5cblxuXHRyZXR1cm4gQ3J5cHRvSlMuU0hBMjU2O1xuXG59KSk7IiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIHZpbTp0cz00OnN0cz00OnN3PTQ6XHJcbi8qIVxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEyIEtyaXMgS293YWwgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBNSVRcclxuICogbGljZW5zZSBmb3VuZCBhdCBodHRwOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcS9yYXcvbWFzdGVyL0xJQ0VOU0VcclxuICpcclxuICogV2l0aCBwYXJ0cyBieSBUeWxlciBDbG9zZVxyXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDA5IFR5bGVyIENsb3NlIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgTUlUIFggbGljZW5zZSBmb3VuZFxyXG4gKiBhdCBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLmh0bWxcclxuICogRm9ya2VkIGF0IHJlZl9zZW5kLmpzIHZlcnNpb246IDIwMDktMDUtMTFcclxuICpcclxuICogV2l0aCBwYXJ0cyBieSBNYXJrIE1pbGxlclxyXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTEgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcclxuICAgIC8vIFR1cm4gb2ZmIHN0cmljdCBtb2RlIGZvciB0aGlzIGZ1bmN0aW9uIHNvIHdlIGNhbiBhc3NpZ24gdG8gZ2xvYmFsLlFcclxuICAgIC8qIGpzaGludCBzdHJpY3Q6IGZhbHNlICovXHJcblxyXG4gICAgLy8gVGhpcyBmaWxlIHdpbGwgZnVuY3Rpb24gcHJvcGVybHkgYXMgYSA8c2NyaXB0PiB0YWcsIG9yIGEgbW9kdWxlXHJcbiAgICAvLyB1c2luZyBDb21tb25KUyBhbmQgTm9kZUpTIG9yIFJlcXVpcmVKUyBtb2R1bGUgZm9ybWF0cy4gIEluXHJcbiAgICAvLyBDb21tb24vTm9kZS9SZXF1aXJlSlMsIHRoZSBtb2R1bGUgZXhwb3J0cyB0aGUgUSBBUEkgYW5kIHdoZW5cclxuICAgIC8vIGV4ZWN1dGVkIGFzIGEgc2ltcGxlIDxzY3JpcHQ+LCBpdCBjcmVhdGVzIGEgUSBnbG9iYWwgaW5zdGVhZC5cclxuXHJcbiAgICAvLyBNb250YWdlIFJlcXVpcmVcclxuICAgIGlmICh0eXBlb2YgYm9vdHN0cmFwID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBib290c3RyYXAoXCJwcm9taXNlXCIsIGRlZmluaXRpb24pO1xyXG5cclxuICAgIC8vIENvbW1vbkpTXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XHJcblxyXG4gICAgLy8gUmVxdWlyZUpTXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xyXG5cclxuICAgIC8vIFNFUyAoU2VjdXJlIEVjbWFTY3JpcHQpXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXMgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICBpZiAoIXNlcy5vaygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXMubWFrZVEgPSBkZWZpbml0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAvLyA8c2NyaXB0PlxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBRID0gZGVmaW5pdGlvbigpO1xyXG4gICAgfVxyXG5cclxufSkoZnVuY3Rpb24gKCkge1xyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBoYXNTdGFja3MgPSBmYWxzZTtcclxudHJ5IHtcclxuICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG59IGNhdGNoIChlKSB7XHJcbiAgICBoYXNTdGFja3MgPSAhIWUuc3RhY2s7XHJcbn1cclxuXHJcbi8vIEFsbCBjb2RlIGFmdGVyIHRoaXMgcG9pbnQgd2lsbCBiZSBmaWx0ZXJlZCBmcm9tIHN0YWNrIHRyYWNlcyByZXBvcnRlZFxyXG4vLyBieSBRLlxyXG52YXIgcVN0YXJ0aW5nTGluZSA9IGNhcHR1cmVMaW5lKCk7XHJcbnZhciBxRmlsZU5hbWU7XHJcblxyXG4vLyBzaGltc1xyXG5cclxuLy8gdXNlZCBmb3IgZmFsbGJhY2sgaW4gXCJhbGxSZXNvbHZlZFwiXHJcbnZhciBub29wID0gZnVuY3Rpb24gKCkge307XHJcblxyXG4vLyBVc2UgdGhlIGZhc3Rlc3QgcG9zc2libGUgbWVhbnMgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gYSBmdXR1cmUgdHVyblxyXG4vLyBvZiB0aGUgZXZlbnQgbG9vcC5cclxudmFyIG5leHRUaWNrID0oZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gbGlua2VkIGxpc3Qgb2YgdGFza3MgKHNpbmdsZSwgd2l0aCBoZWFkIG5vZGUpXHJcbiAgICB2YXIgaGVhZCA9IHt0YXNrOiB2b2lkIDAsIG5leHQ6IG51bGx9O1xyXG4gICAgdmFyIHRhaWwgPSBoZWFkO1xyXG4gICAgdmFyIGZsdXNoaW5nID0gZmFsc2U7XHJcbiAgICB2YXIgcmVxdWVzdFRpY2sgPSB2b2lkIDA7XHJcbiAgICB2YXIgaXNOb2RlSlMgPSBmYWxzZTtcclxuXHJcbiAgICBmdW5jdGlvbiBmbHVzaCgpIHtcclxuICAgICAgICAvKiBqc2hpbnQgbG9vcGZ1bmM6IHRydWUgKi9cclxuXHJcbiAgICAgICAgd2hpbGUgKGhlYWQubmV4dCkge1xyXG4gICAgICAgICAgICBoZWFkID0gaGVhZC5uZXh0O1xyXG4gICAgICAgICAgICB2YXIgdGFzayA9IGhlYWQudGFzaztcclxuICAgICAgICAgICAgaGVhZC50YXNrID0gdm9pZCAwO1xyXG4gICAgICAgICAgICB2YXIgZG9tYWluID0gaGVhZC5kb21haW47XHJcblxyXG4gICAgICAgICAgICBpZiAoZG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICBoZWFkLmRvbWFpbiA9IHZvaWQgMDtcclxuICAgICAgICAgICAgICAgIGRvbWFpbi5lbnRlcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgdGFzaygpO1xyXG5cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUpTKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSW4gbm9kZSwgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgY29uc2lkZXJlZCBmYXRhbCBlcnJvcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBzeW5jaHJvbm91c2x5IHRvIGludGVycnVwdCBmbHVzaGluZyFcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNvbnRpbnVhdGlvbiBpZiB0aGUgdW5jYXVnaHQgZXhjZXB0aW9uIGlzIHN1cHByZXNzZWRcclxuICAgICAgICAgICAgICAgICAgICAvLyBsaXN0ZW5pbmcgXCJ1bmNhdWdodEV4Y2VwdGlvblwiIGV2ZW50cyAoYXMgZG9tYWlucyBkb2VzKS5cclxuICAgICAgICAgICAgICAgICAgICAvLyBDb250aW51ZSBpbiBuZXh0IGV2ZW50IHRvIGF2b2lkIHRpY2sgcmVjdXJzaW9uLlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGU7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJbiBicm93c2VycywgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgbm90IGZhdGFsLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLXRocm93IHRoZW0gYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgc2xvdy1kb3ducy5cclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChkb21haW4pIHtcclxuICAgICAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZsdXNoaW5nID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgbmV4dFRpY2sgPSBmdW5jdGlvbiAodGFzaykge1xyXG4gICAgICAgIHRhaWwgPSB0YWlsLm5leHQgPSB7XHJcbiAgICAgICAgICAgIHRhc2s6IHRhc2ssXHJcbiAgICAgICAgICAgIGRvbWFpbjogaXNOb2RlSlMgJiYgcHJvY2Vzcy5kb21haW4sXHJcbiAgICAgICAgICAgIG5leHQ6IG51bGxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAoIWZsdXNoaW5nKSB7XHJcbiAgICAgICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmVxdWVzdFRpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzLm5leHRUaWNrKSB7XHJcbiAgICAgICAgLy8gTm9kZS5qcyBiZWZvcmUgMC45LiBOb3RlIHRoYXQgc29tZSBmYWtlLU5vZGUgZW52aXJvbm1lbnRzLCBsaWtlIHRoZVxyXG4gICAgICAgIC8vIE1vY2hhIHRlc3QgcnVubmVyLCBpbnRyb2R1Y2UgYSBgcHJvY2Vzc2AgZ2xvYmFsIHdpdGhvdXQgYSBgbmV4dFRpY2tgLlxyXG4gICAgICAgIGlzTm9kZUpTID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAvLyBJbiBJRTEwLCBOb2RlLmpzIDAuOSssIG9yIGh0dHBzOi8vZ2l0aHViLmNvbS9Ob2JsZUpTL3NldEltbWVkaWF0ZVxyXG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gc2V0SW1tZWRpYXRlLmJpbmQod2luZG93LCBmbHVzaCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZmx1c2gpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgIC8vIG1vZGVybiBicm93c2Vyc1xyXG4gICAgICAgIC8vIGh0dHA6Ly93d3cubm9uYmxvY2tpbmcuaW8vMjAxMS8wNi93aW5kb3duZXh0dGljay5odG1sXHJcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcclxuICAgICAgICAvLyBBdCBsZWFzdCBTYWZhcmkgVmVyc2lvbiA2LjAuNSAoODUzNi4zMC4xKSBpbnRlcm1pdHRlbnRseSBjYW5ub3QgY3JlYXRlXHJcbiAgICAgICAgLy8gd29ya2luZyBtZXNzYWdlIHBvcnRzIHRoZSBmaXJzdCB0aW1lIGEgcGFnZSBsb2Fkcy5cclxuICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSByZXF1ZXN0UG9ydFRpY2s7XHJcbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZmx1c2g7XHJcbiAgICAgICAgICAgIGZsdXNoKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgcmVxdWVzdFBvcnRUaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAvLyBPcGVyYSByZXF1aXJlcyB1cyB0byBwcm92aWRlIGEgbWVzc2FnZSBwYXlsb2FkLCByZWdhcmRsZXNzIG9mXHJcbiAgICAgICAgICAgIC8vIHdoZXRoZXIgd2UgdXNlIGl0LlxyXG4gICAgICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xyXG4gICAgICAgICAgICByZXF1ZXN0UG9ydFRpY2soKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gb2xkIGJyb3dzZXJzXHJcbiAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5leHRUaWNrO1xyXG59KSgpO1xyXG5cclxuLy8gQXR0ZW1wdCB0byBtYWtlIGdlbmVyaWNzIHNhZmUgaW4gdGhlIGZhY2Ugb2YgZG93bnN0cmVhbVxyXG4vLyBtb2RpZmljYXRpb25zLlxyXG4vLyBUaGVyZSBpcyBubyBzaXR1YXRpb24gd2hlcmUgdGhpcyBpcyBuZWNlc3NhcnkuXHJcbi8vIElmIHlvdSBuZWVkIGEgc2VjdXJpdHkgZ3VhcmFudGVlLCB0aGVzZSBwcmltb3JkaWFscyBuZWVkIHRvIGJlXHJcbi8vIGRlZXBseSBmcm96ZW4gYW55d2F5LCBhbmQgaWYgeW91IGRvbuKAmXQgbmVlZCBhIHNlY3VyaXR5IGd1YXJhbnRlZSxcclxuLy8gdGhpcyBpcyBqdXN0IHBsYWluIHBhcmFub2lkLlxyXG4vLyBIb3dldmVyLCB0aGlzICoqbWlnaHQqKiBoYXZlIHRoZSBuaWNlIHNpZGUtZWZmZWN0IG9mIHJlZHVjaW5nIHRoZSBzaXplIG9mXHJcbi8vIHRoZSBtaW5pZmllZCBjb2RlIGJ5IHJlZHVjaW5nIHguY2FsbCgpIHRvIG1lcmVseSB4KClcclxuLy8gU2VlIE1hcmsgTWlsbGVy4oCZcyBleHBsYW5hdGlvbiBvZiB3aGF0IHRoaXMgZG9lcy5cclxuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9Y29udmVudGlvbnM6c2FmZV9tZXRhX3Byb2dyYW1taW5nXHJcbnZhciBjYWxsID0gRnVuY3Rpb24uY2FsbDtcclxuZnVuY3Rpb24gdW5jdXJyeVRoaXMoZikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gY2FsbC5hcHBseShmLCBhcmd1bWVudHMpO1xyXG4gICAgfTtcclxufVxyXG4vLyBUaGlzIGlzIGVxdWl2YWxlbnQsIGJ1dCBzbG93ZXI6XHJcbi8vIHVuY3VycnlUaGlzID0gRnVuY3Rpb25fYmluZC5iaW5kKEZ1bmN0aW9uX2JpbmQuY2FsbCk7XHJcbi8vIGh0dHA6Ly9qc3BlcmYuY29tL3VuY3Vycnl0aGlzXHJcblxyXG52YXIgYXJyYXlfc2xpY2UgPSB1bmN1cnJ5VGhpcyhBcnJheS5wcm90b3R5cGUuc2xpY2UpO1xyXG5cclxudmFyIGFycmF5X3JlZHVjZSA9IHVuY3VycnlUaGlzKFxyXG4gICAgQXJyYXkucHJvdG90eXBlLnJlZHVjZSB8fCBmdW5jdGlvbiAoY2FsbGJhY2ssIGJhc2lzKSB7XHJcbiAgICAgICAgdmFyIGluZGV4ID0gMCxcclxuICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XHJcbiAgICAgICAgLy8gY29uY2VybmluZyB0aGUgaW5pdGlhbCB2YWx1ZSwgaWYgb25lIGlzIG5vdCBwcm92aWRlZFxyXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIC8vIHNlZWsgdG8gdGhlIGZpcnN0IHZhbHVlIGluIHRoZSBhcnJheSwgYWNjb3VudGluZ1xyXG4gICAgICAgICAgICAvLyBmb3IgdGhlIHBvc3NpYmlsaXR5IHRoYXQgaXMgaXMgYSBzcGFyc2UgYXJyYXlcclxuICAgICAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4IGluIHRoaXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBiYXNpcyA9IHRoaXNbaW5kZXgrK107XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoKytpbmRleCA+PSBsZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gd2hpbGUgKDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyByZWR1Y2VcclxuICAgICAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgLy8gYWNjb3VudCBmb3IgdGhlIHBvc3NpYmlsaXR5IHRoYXQgdGhlIGFycmF5IGlzIHNwYXJzZVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggaW4gdGhpcykge1xyXG4gICAgICAgICAgICAgICAgYmFzaXMgPSBjYWxsYmFjayhiYXNpcywgdGhpc1tpbmRleF0sIGluZGV4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYmFzaXM7XHJcbiAgICB9XHJcbik7XHJcblxyXG52YXIgYXJyYXlfaW5kZXhPZiA9IHVuY3VycnlUaGlzKFxyXG4gICAgQXJyYXkucHJvdG90eXBlLmluZGV4T2YgfHwgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgLy8gbm90IGEgdmVyeSBnb29kIHNoaW0sIGJ1dCBnb29kIGVub3VnaCBmb3Igb3VyIG9uZSB1c2Ugb2YgaXRcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKHRoaXNbaV0gPT09IHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9XHJcbik7XHJcblxyXG52YXIgYXJyYXlfbWFwID0gdW5jdXJyeVRoaXMoXHJcbiAgICBBcnJheS5wcm90b3R5cGUubWFwIHx8IGZ1bmN0aW9uIChjYWxsYmFjaywgdGhpc3ApIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIGNvbGxlY3QgPSBbXTtcclxuICAgICAgICBhcnJheV9yZWR1Y2Uoc2VsZiwgZnVuY3Rpb24gKHVuZGVmaW5lZCwgdmFsdWUsIGluZGV4KSB7XHJcbiAgICAgICAgICAgIGNvbGxlY3QucHVzaChjYWxsYmFjay5jYWxsKHRoaXNwLCB2YWx1ZSwgaW5kZXgsIHNlbGYpKTtcclxuICAgICAgICB9LCB2b2lkIDApO1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0O1xyXG4gICAgfVxyXG4pO1xyXG5cclxudmFyIG9iamVjdF9jcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChwcm90b3R5cGUpIHtcclxuICAgIGZ1bmN0aW9uIFR5cGUoKSB7IH1cclxuICAgIFR5cGUucHJvdG90eXBlID0gcHJvdG90eXBlO1xyXG4gICAgcmV0dXJuIG5ldyBUeXBlKCk7XHJcbn07XHJcblxyXG52YXIgb2JqZWN0X2hhc093blByb3BlcnR5ID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSk7XHJcblxyXG52YXIgb2JqZWN0X2tleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICB2YXIga2V5cyA9IFtdO1xyXG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xyXG4gICAgICAgIGlmIChvYmplY3RfaGFzT3duUHJvcGVydHkob2JqZWN0LCBrZXkpKSB7XHJcbiAgICAgICAgICAgIGtleXMucHVzaChrZXkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBrZXlzO1xyXG59O1xyXG5cclxudmFyIG9iamVjdF90b1N0cmluZyA9IHVuY3VycnlUaGlzKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcpO1xyXG5cclxuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIHJldHVybiB2YWx1ZSA9PT0gT2JqZWN0KHZhbHVlKTtcclxufVxyXG5cclxuLy8gZ2VuZXJhdG9yIHJlbGF0ZWQgc2hpbXNcclxuXHJcbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBmdW5jdGlvbiBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpbiBTcGlkZXJNb25rZXkuXHJcbmZ1bmN0aW9uIGlzU3RvcEl0ZXJhdGlvbihleGNlcHRpb24pIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgb2JqZWN0X3RvU3RyaW5nKGV4Y2VwdGlvbikgPT09IFwiW29iamVjdCBTdG9wSXRlcmF0aW9uXVwiIHx8XHJcbiAgICAgICAgZXhjZXB0aW9uIGluc3RhbmNlb2YgUVJldHVyblZhbHVlXHJcbiAgICApO1xyXG59XHJcblxyXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgaGVscGVyIGFuZCBRLnJldHVybiBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpblxyXG4vLyBTcGlkZXJNb25rZXkuXHJcbnZhciBRUmV0dXJuVmFsdWU7XHJcbmlmICh0eXBlb2YgUmV0dXJuVmFsdWUgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgIFFSZXR1cm5WYWx1ZSA9IFJldHVyblZhbHVlO1xyXG59IGVsc2Uge1xyXG4gICAgUVJldHVyblZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gICAgfTtcclxufVxyXG5cclxuLy8gbG9uZyBzdGFjayB0cmFjZXNcclxuXHJcbnZhciBTVEFDS19KVU1QX1NFUEFSQVRPUiA9IFwiRnJvbSBwcmV2aW91cyBldmVudDpcIjtcclxuXHJcbmZ1bmN0aW9uIG1ha2VTdGFja1RyYWNlTG9uZyhlcnJvciwgcHJvbWlzZSkge1xyXG4gICAgLy8gSWYgcG9zc2libGUsIHRyYW5zZm9ybSB0aGUgZXJyb3Igc3RhY2sgdHJhY2UgYnkgcmVtb3ZpbmcgTm9kZSBhbmQgUVxyXG4gICAgLy8gY3J1ZnQsIHRoZW4gY29uY2F0ZW5hdGluZyB3aXRoIHRoZSBzdGFjayB0cmFjZSBvZiBgcHJvbWlzZWAuIFNlZSAjNTcuXHJcbiAgICBpZiAoaGFzU3RhY2tzICYmXHJcbiAgICAgICAgcHJvbWlzZS5zdGFjayAmJlxyXG4gICAgICAgIHR5cGVvZiBlcnJvciA9PT0gXCJvYmplY3RcIiAmJlxyXG4gICAgICAgIGVycm9yICE9PSBudWxsICYmXHJcbiAgICAgICAgZXJyb3Iuc3RhY2sgJiZcclxuICAgICAgICBlcnJvci5zdGFjay5pbmRleE9mKFNUQUNLX0pVTVBfU0VQQVJBVE9SKSA9PT0gLTFcclxuICAgICkge1xyXG4gICAgICAgIHZhciBzdGFja3MgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBwID0gcHJvbWlzZTsgISFwOyBwID0gcC5zb3VyY2UpIHtcclxuICAgICAgICAgICAgaWYgKHAuc3RhY2spIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrcy51bnNoaWZ0KHAuc3RhY2spO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YWNrcy51bnNoaWZ0KGVycm9yLnN0YWNrKTtcclxuXHJcbiAgICAgICAgdmFyIGNvbmNhdGVkU3RhY2tzID0gc3RhY2tzLmpvaW4oXCJcXG5cIiArIFNUQUNLX0pVTVBfU0VQQVJBVE9SICsgXCJcXG5cIik7XHJcbiAgICAgICAgZXJyb3Iuc3RhY2sgPSBmaWx0ZXJTdGFja1N0cmluZyhjb25jYXRlZFN0YWNrcyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbHRlclN0YWNrU3RyaW5nKHN0YWNrU3RyaW5nKSB7XHJcbiAgICB2YXIgbGluZXMgPSBzdGFja1N0cmluZy5zcGxpdChcIlxcblwiKTtcclxuICAgIHZhciBkZXNpcmVkTGluZXMgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB2YXIgbGluZSA9IGxpbmVzW2ldO1xyXG5cclxuICAgICAgICBpZiAoIWlzSW50ZXJuYWxGcmFtZShsaW5lKSAmJiAhaXNOb2RlRnJhbWUobGluZSkgJiYgbGluZSkge1xyXG4gICAgICAgICAgICBkZXNpcmVkTGluZXMucHVzaChsaW5lKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGVzaXJlZExpbmVzLmpvaW4oXCJcXG5cIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzTm9kZUZyYW1lKHN0YWNrTGluZSkge1xyXG4gICAgcmV0dXJuIHN0YWNrTGluZS5pbmRleE9mKFwiKG1vZHVsZS5qczpcIikgIT09IC0xIHx8XHJcbiAgICAgICAgICAgc3RhY2tMaW5lLmluZGV4T2YoXCIobm9kZS5qczpcIikgIT09IC0xO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRGaWxlTmFtZUFuZExpbmVOdW1iZXIoc3RhY2tMaW5lKSB7XHJcbiAgICAvLyBOYW1lZCBmdW5jdGlvbnM6IFwiYXQgZnVuY3Rpb25OYW1lIChmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlcilcIlxyXG4gICAgLy8gSW4gSUUxMCBmdW5jdGlvbiBuYW1lIGNhbiBoYXZlIHNwYWNlcyAoXCJBbm9ueW1vdXMgZnVuY3Rpb25cIikgT19vXHJcbiAgICB2YXIgYXR0ZW1wdDEgPSAvYXQgLisgXFwoKC4rKTooXFxkKyk6KD86XFxkKylcXCkkLy5leGVjKHN0YWNrTGluZSk7XHJcbiAgICBpZiAoYXR0ZW1wdDEpIHtcclxuICAgICAgICByZXR1cm4gW2F0dGVtcHQxWzFdLCBOdW1iZXIoYXR0ZW1wdDFbMl0pXTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBbm9ueW1vdXMgZnVuY3Rpb25zOiBcImF0IGZpbGVuYW1lOmxpbmVOdW1iZXI6Y29sdW1uTnVtYmVyXCJcclxuICAgIHZhciBhdHRlbXB0MiA9IC9hdCAoW14gXSspOihcXGQrKTooPzpcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcclxuICAgIGlmIChhdHRlbXB0Mikge1xyXG4gICAgICAgIHJldHVybiBbYXR0ZW1wdDJbMV0sIE51bWJlcihhdHRlbXB0MlsyXSldO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZpcmVmb3ggc3R5bGU6IFwiZnVuY3Rpb25AZmlsZW5hbWU6bGluZU51bWJlciBvciBAZmlsZW5hbWU6bGluZU51bWJlclwiXHJcbiAgICB2YXIgYXR0ZW1wdDMgPSAvLipAKC4rKTooXFxkKykkLy5leGVjKHN0YWNrTGluZSk7XHJcbiAgICBpZiAoYXR0ZW1wdDMpIHtcclxuICAgICAgICByZXR1cm4gW2F0dGVtcHQzWzFdLCBOdW1iZXIoYXR0ZW1wdDNbMl0pXTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNJbnRlcm5hbEZyYW1lKHN0YWNrTGluZSkge1xyXG4gICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpO1xyXG5cclxuICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBmaWxlTmFtZSA9IGZpbGVOYW1lQW5kTGluZU51bWJlclswXTtcclxuICAgIHZhciBsaW5lTnVtYmVyID0gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzFdO1xyXG5cclxuICAgIHJldHVybiBmaWxlTmFtZSA9PT0gcUZpbGVOYW1lICYmXHJcbiAgICAgICAgbGluZU51bWJlciA+PSBxU3RhcnRpbmdMaW5lICYmXHJcbiAgICAgICAgbGluZU51bWJlciA8PSBxRW5kaW5nTGluZTtcclxufVxyXG5cclxuLy8gZGlzY292ZXIgb3duIGZpbGUgbmFtZSBhbmQgbGluZSBudW1iZXIgcmFuZ2UgZm9yIGZpbHRlcmluZyBzdGFja1xyXG4vLyB0cmFjZXNcclxuZnVuY3Rpb24gY2FwdHVyZUxpbmUoKSB7XHJcbiAgICBpZiAoIWhhc1N0YWNrcykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIHZhciBsaW5lcyA9IGUuc3RhY2suc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgICAgdmFyIGZpcnN0TGluZSA9IGxpbmVzWzBdLmluZGV4T2YoXCJAXCIpID4gMCA/IGxpbmVzWzFdIDogbGluZXNbMl07XHJcbiAgICAgICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihmaXJzdExpbmUpO1xyXG4gICAgICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHFGaWxlTmFtZSA9IGZpbGVOYW1lQW5kTGluZU51bWJlclswXTtcclxuICAgICAgICByZXR1cm4gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzFdO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkZXByZWNhdGUoY2FsbGJhY2ssIG5hbWUsIGFsdGVybmF0aXZlKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gXCJ1bmRlZmluZWRcIiAmJlxyXG4gICAgICAgICAgICB0eXBlb2YgY29uc29sZS53YXJuID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKG5hbWUgKyBcIiBpcyBkZXByZWNhdGVkLCB1c2UgXCIgKyBhbHRlcm5hdGl2ZSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIiBpbnN0ZWFkLlwiLCBuZXcgRXJyb3IoXCJcIikuc3RhY2spO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkoY2FsbGJhY2ssIGFyZ3VtZW50cyk7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vLyBlbmQgb2Ygc2hpbXNcclxuLy8gYmVnaW5uaW5nIG9mIHJlYWwgd29ya1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLCBwYXNzZXMgcHJvbWlzZXMgdGhyb3VnaCwgb3JcclxuICogY29lcmNlcyBwcm9taXNlcyBmcm9tIGRpZmZlcmVudCBzeXN0ZW1zLlxyXG4gKiBAcGFyYW0gdmFsdWUgaW1tZWRpYXRlIHJlZmVyZW5jZSBvciBwcm9taXNlXHJcbiAqL1xyXG5mdW5jdGlvbiBRKHZhbHVlKSB7XHJcbiAgICAvLyBJZiB0aGUgb2JqZWN0IGlzIGFscmVhZHkgYSBQcm9taXNlLCByZXR1cm4gaXQgZGlyZWN0bHkuICBUaGlzIGVuYWJsZXNcclxuICAgIC8vIHRoZSByZXNvbHZlIGZ1bmN0aW9uIHRvIGJvdGggYmUgdXNlZCB0byBjcmVhdGVkIHJlZmVyZW5jZXMgZnJvbSBvYmplY3RzLFxyXG4gICAgLy8gYnV0IHRvIHRvbGVyYWJseSBjb2VyY2Ugbm9uLXByb21pc2VzIHRvIHByb21pc2VzLlxyXG4gICAgaWYgKGlzUHJvbWlzZSh2YWx1ZSkpIHtcclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYXNzaW1pbGF0ZSB0aGVuYWJsZXNcclxuICAgIGlmIChpc1Byb21pc2VBbGlrZSh2YWx1ZSkpIHtcclxuICAgICAgICByZXR1cm4gY29lcmNlKHZhbHVlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGwodmFsdWUpO1xyXG4gICAgfVxyXG59XHJcblEucmVzb2x2ZSA9IFE7XHJcblxyXG4vKipcclxuICogUGVyZm9ybXMgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm4gb2YgdGhlIGV2ZW50IGxvb3AuXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHRhc2tcclxuICovXHJcblEubmV4dFRpY2sgPSBuZXh0VGljaztcclxuXHJcbi8qKlxyXG4gKiBDb250cm9scyB3aGV0aGVyIG9yIG5vdCBsb25nIHN0YWNrIHRyYWNlcyB3aWxsIGJlIG9uXHJcbiAqL1xyXG5RLmxvbmdTdGFja1N1cHBvcnQgPSBmYWxzZTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEge3Byb21pc2UsIHJlc29sdmUsIHJlamVjdH0gb2JqZWN0LlxyXG4gKlxyXG4gKiBgcmVzb2x2ZWAgaXMgYSBjYWxsYmFjayB0byBpbnZva2Ugd2l0aCBhIG1vcmUgcmVzb2x2ZWQgdmFsdWUgZm9yIHRoZVxyXG4gKiBwcm9taXNlLiBUbyBmdWxmaWxsIHRoZSBwcm9taXNlLCBpbnZva2UgYHJlc29sdmVgIHdpdGggYW55IHZhbHVlIHRoYXQgaXNcclxuICogbm90IGEgdGhlbmFibGUuIFRvIHJlamVjdCB0aGUgcHJvbWlzZSwgaW52b2tlIGByZXNvbHZlYCB3aXRoIGEgcmVqZWN0ZWRcclxuICogdGhlbmFibGUsIG9yIGludm9rZSBgcmVqZWN0YCB3aXRoIHRoZSByZWFzb24gZGlyZWN0bHkuIFRvIHJlc29sdmUgdGhlXHJcbiAqIHByb21pc2UgdG8gYW5vdGhlciB0aGVuYWJsZSwgdGh1cyBwdXR0aW5nIGl0IGluIHRoZSBzYW1lIHN0YXRlLCBpbnZva2VcclxuICogYHJlc29sdmVgIHdpdGggdGhhdCBvdGhlciB0aGVuYWJsZS5cclxuICovXHJcblEuZGVmZXIgPSBkZWZlcjtcclxuZnVuY3Rpb24gZGVmZXIoKSB7XHJcbiAgICAvLyBpZiBcIm1lc3NhZ2VzXCIgaXMgYW4gXCJBcnJheVwiLCB0aGF0IGluZGljYXRlcyB0aGF0IHRoZSBwcm9taXNlIGhhcyBub3QgeWV0XHJcbiAgICAvLyBiZWVuIHJlc29sdmVkLiAgSWYgaXQgaXMgXCJ1bmRlZmluZWRcIiwgaXQgaGFzIGJlZW4gcmVzb2x2ZWQuICBFYWNoXHJcbiAgICAvLyBlbGVtZW50IG9mIHRoZSBtZXNzYWdlcyBhcnJheSBpcyBpdHNlbGYgYW4gYXJyYXkgb2YgY29tcGxldGUgYXJndW1lbnRzIHRvXHJcbiAgICAvLyBmb3J3YXJkIHRvIHRoZSByZXNvbHZlZCBwcm9taXNlLiAgV2UgY29lcmNlIHRoZSByZXNvbHV0aW9uIHZhbHVlIHRvIGFcclxuICAgIC8vIHByb21pc2UgdXNpbmcgdGhlIGByZXNvbHZlYCBmdW5jdGlvbiBiZWNhdXNlIGl0IGhhbmRsZXMgYm90aCBmdWxseVxyXG4gICAgLy8gbm9uLXRoZW5hYmxlIHZhbHVlcyBhbmQgb3RoZXIgdGhlbmFibGVzIGdyYWNlZnVsbHkuXHJcbiAgICB2YXIgbWVzc2FnZXMgPSBbXSwgcHJvZ3Jlc3NMaXN0ZW5lcnMgPSBbXSwgcmVzb2x2ZWRQcm9taXNlO1xyXG5cclxuICAgIHZhciBkZWZlcnJlZCA9IG9iamVjdF9jcmVhdGUoZGVmZXIucHJvdG90eXBlKTtcclxuICAgIHZhciBwcm9taXNlID0gb2JqZWN0X2NyZWF0ZShQcm9taXNlLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIG9wZXJhbmRzKSB7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMpO1xyXG4gICAgICAgIGlmIChtZXNzYWdlcykge1xyXG4gICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGFyZ3MpO1xyXG4gICAgICAgICAgICBpZiAob3AgPT09IFwid2hlblwiICYmIG9wZXJhbmRzWzFdKSB7IC8vIHByb2dyZXNzIG9wZXJhbmRcclxuICAgICAgICAgICAgICAgIHByb2dyZXNzTGlzdGVuZXJzLnB1c2gob3BlcmFuZHNbMV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZWRQcm9taXNlLnByb21pc2VEaXNwYXRjaC5hcHBseShyZXNvbHZlZFByb21pc2UsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFhYWCBkZXByZWNhdGVkXHJcbiAgICBwcm9taXNlLnZhbHVlT2YgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbmVhcmVyVmFsdWUgPSBuZWFyZXIocmVzb2x2ZWRQcm9taXNlKTtcclxuICAgICAgICBpZiAoaXNQcm9taXNlKG5lYXJlclZhbHVlKSkge1xyXG4gICAgICAgICAgICByZXNvbHZlZFByb21pc2UgPSBuZWFyZXJWYWx1ZTsgLy8gc2hvcnRlbiBjaGFpblxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmVhcmVyVmFsdWU7XHJcbiAgICB9O1xyXG5cclxuICAgIHByb21pc2UuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoIXJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdGF0ZTogXCJwZW5kaW5nXCIgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc29sdmVkUHJvbWlzZS5pbnNwZWN0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChRLmxvbmdTdGFja1N1cHBvcnQgJiYgaGFzU3RhY2tzKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAvLyBOT1RFOiBkb24ndCB0cnkgdG8gdXNlIGBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZWAgb3IgdHJhbnNmZXIgdGhlXHJcbiAgICAgICAgICAgIC8vIGFjY2Vzc29yIGFyb3VuZDsgdGhhdCBjYXVzZXMgbWVtb3J5IGxlYWtzIGFzIHBlciBHSC0xMTEuIEp1c3RcclxuICAgICAgICAgICAgLy8gcmVpZnkgdGhlIHN0YWNrIHRyYWNlIGFzIGEgc3RyaW5nIEFTQVAuXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vIEF0IHRoZSBzYW1lIHRpbWUsIGN1dCBvZmYgdGhlIGZpcnN0IGxpbmU7IGl0J3MgYWx3YXlzIGp1c3RcclxuICAgICAgICAgICAgLy8gXCJbb2JqZWN0IFByb21pc2VdXFxuXCIsIGFzIHBlciB0aGUgYHRvU3RyaW5nYC5cclxuICAgICAgICAgICAgcHJvbWlzZS5zdGFjayA9IGUuc3RhY2suc3Vic3RyaW5nKGUuc3RhY2suaW5kZXhPZihcIlxcblwiKSArIDEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBOT1RFOiB3ZSBkbyB0aGUgY2hlY2tzIGZvciBgcmVzb2x2ZWRQcm9taXNlYCBpbiBlYWNoIG1ldGhvZCwgaW5zdGVhZCBvZlxyXG4gICAgLy8gY29uc29saWRhdGluZyB0aGVtIGludG8gYGJlY29tZWAsIHNpbmNlIG90aGVyd2lzZSB3ZSdkIGNyZWF0ZSBuZXdcclxuICAgIC8vIHByb21pc2VzIHdpdGggdGhlIGxpbmVzIGBiZWNvbWUod2hhdGV2ZXIodmFsdWUpKWAuIFNlZSBlLmcuIEdILTI1Mi5cclxuXHJcbiAgICBmdW5jdGlvbiBiZWNvbWUobmV3UHJvbWlzZSkge1xyXG4gICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5ld1Byb21pc2U7XHJcbiAgICAgICAgcHJvbWlzZS5zb3VyY2UgPSBuZXdQcm9taXNlO1xyXG5cclxuICAgICAgICBhcnJheV9yZWR1Y2UobWVzc2FnZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIG1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgbmV3UHJvbWlzZS5wcm9taXNlRGlzcGF0Y2guYXBwbHkobmV3UHJvbWlzZSwgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sIHZvaWQgMCk7XHJcblxyXG4gICAgICAgIG1lc3NhZ2VzID0gdm9pZCAwO1xyXG4gICAgICAgIHByb2dyZXNzTGlzdGVuZXJzID0gdm9pZCAwO1xyXG4gICAgfVxyXG5cclxuICAgIGRlZmVycmVkLnByb21pc2UgPSBwcm9taXNlO1xyXG4gICAgZGVmZXJyZWQucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVjb21lKFEodmFsdWUpKTtcclxuICAgIH07XHJcblxyXG4gICAgZGVmZXJyZWQuZnVsZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVjb21lKGZ1bGZpbGwodmFsdWUpKTtcclxuICAgIH07XHJcbiAgICBkZWZlcnJlZC5yZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XHJcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWNvbWUocmVqZWN0KHJlYXNvbikpO1xyXG4gICAgfTtcclxuICAgIGRlZmVycmVkLm5vdGlmeSA9IGZ1bmN0aW9uIChwcm9ncmVzcykge1xyXG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXJyYXlfcmVkdWNlKHByb2dyZXNzTGlzdGVuZXJzLCBmdW5jdGlvbiAodW5kZWZpbmVkLCBwcm9ncmVzc0xpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHByb2dyZXNzTGlzdGVuZXIocHJvZ3Jlc3MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LCB2b2lkIDApO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgTm9kZS1zdHlsZSBjYWxsYmFjayB0aGF0IHdpbGwgcmVzb2x2ZSBvciByZWplY3QgdGhlIGRlZmVycmVkXHJcbiAqIHByb21pc2UuXHJcbiAqIEByZXR1cm5zIGEgbm9kZWJhY2tcclxuICovXHJcbmRlZmVyLnByb3RvdHlwZS5tYWtlTm9kZVJlc29sdmVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChlcnJvciwgdmFsdWUpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgc2VsZi5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcclxuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNlbGYucmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcGFyYW0gcmVzb2x2ZXIge0Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBub3RoaW5nIGFuZCBhY2NlcHRzXHJcbiAqIHRoZSByZXNvbHZlLCByZWplY3QsIGFuZCBub3RpZnkgZnVuY3Rpb25zIGZvciBhIGRlZmVycmVkLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgdGhhdCBtYXkgYmUgcmVzb2x2ZWQgd2l0aCB0aGUgZ2l2ZW4gcmVzb2x2ZSBhbmQgcmVqZWN0XHJcbiAqIGZ1bmN0aW9ucywgb3IgcmVqZWN0ZWQgYnkgYSB0aHJvd24gZXhjZXB0aW9uIGluIHJlc29sdmVyXHJcbiAqL1xyXG5RLlByb21pc2UgPSBwcm9taXNlOyAvLyBFUzZcclxuUS5wcm9taXNlID0gcHJvbWlzZTtcclxuZnVuY3Rpb24gcHJvbWlzZShyZXNvbHZlcikge1xyXG4gICAgaWYgKHR5cGVvZiByZXNvbHZlciAhPT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInJlc29sdmVyIG11c3QgYmUgYSBmdW5jdGlvbi5cIik7XHJcbiAgICB9XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXNvbHZlcihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QsIGRlZmVycmVkLm5vdGlmeSk7XHJcbiAgICB9IGNhdGNoIChyZWFzb24pIHtcclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcclxuICAgIH1cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59XHJcblxyXG5wcm9taXNlLnJhY2UgPSByYWNlOyAvLyBFUzZcclxucHJvbWlzZS5hbGwgPSBhbGw7IC8vIEVTNlxyXG5wcm9taXNlLnJlamVjdCA9IHJlamVjdDsgLy8gRVM2XHJcbnByb21pc2UucmVzb2x2ZSA9IFE7IC8vIEVTNlxyXG5cclxuLy8gWFhYIGV4cGVyaW1lbnRhbC4gIFRoaXMgbWV0aG9kIGlzIGEgd2F5IHRvIGRlbm90ZSB0aGF0IGEgbG9jYWwgdmFsdWUgaXNcclxuLy8gc2VyaWFsaXphYmxlIGFuZCBzaG91bGQgYmUgaW1tZWRpYXRlbHkgZGlzcGF0Y2hlZCB0byBhIHJlbW90ZSB1cG9uIHJlcXVlc3QsXHJcbi8vIGluc3RlYWQgb2YgcGFzc2luZyBhIHJlZmVyZW5jZS5cclxuUS5wYXNzQnlDb3B5ID0gZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgLy9mcmVlemUob2JqZWN0KTtcclxuICAgIC8vcGFzc0J5Q29waWVzLnNldChvYmplY3QsIHRydWUpO1xyXG4gICAgcmV0dXJuIG9iamVjdDtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnBhc3NCeUNvcHkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAvL2ZyZWV6ZShvYmplY3QpO1xyXG4gICAgLy9wYXNzQnlDb3BpZXMuc2V0KG9iamVjdCwgdHJ1ZSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJZiB0d28gcHJvbWlzZXMgZXZlbnR1YWxseSBmdWxmaWxsIHRvIHRoZSBzYW1lIHZhbHVlLCBwcm9taXNlcyB0aGF0IHZhbHVlLFxyXG4gKiBidXQgb3RoZXJ3aXNlIHJlamVjdHMuXHJcbiAqIEBwYXJhbSB4IHtBbnkqfVxyXG4gKiBAcGFyYW0geSB7QW55Kn1cclxuICogQHJldHVybnMge0FueSp9IGEgcHJvbWlzZSBmb3IgeCBhbmQgeSBpZiB0aGV5IGFyZSB0aGUgc2FtZSwgYnV0IGEgcmVqZWN0aW9uXHJcbiAqIG90aGVyd2lzZS5cclxuICpcclxuICovXHJcblEuam9pbiA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICByZXR1cm4gUSh4KS5qb2luKHkpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuam9pbiA9IGZ1bmN0aW9uICh0aGF0KSB7XHJcbiAgICByZXR1cm4gUShbdGhpcywgdGhhdF0pLnNwcmVhZChmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICAgIGlmICh4ID09PSB5KSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IFwiPT09XCIgc2hvdWxkIGJlIE9iamVjdC5pcyBvciBlcXVpdlxyXG4gICAgICAgICAgICByZXR1cm4geDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBqb2luOiBub3QgdGhlIHNhbWU6IFwiICsgeCArIFwiIFwiICsgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSBmaXJzdCBvZiBhbiBhcnJheSBvZiBwcm9taXNlcyB0byBiZWNvbWUgZnVsZmlsbGVkLlxyXG4gKiBAcGFyYW0gYW5zd2VycyB7QXJyYXlbQW55Kl19IHByb21pc2VzIHRvIHJhY2VcclxuICogQHJldHVybnMge0FueSp9IHRoZSBmaXJzdCBwcm9taXNlIHRvIGJlIGZ1bGZpbGxlZFxyXG4gKi9cclxuUS5yYWNlID0gcmFjZTtcclxuZnVuY3Rpb24gcmFjZShhbnN3ZXJQcykge1xyXG4gICAgcmV0dXJuIHByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgLy8gU3dpdGNoIHRvIHRoaXMgb25jZSB3ZSBjYW4gYXNzdW1lIGF0IGxlYXN0IEVTNVxyXG4gICAgICAgIC8vIGFuc3dlclBzLmZvckVhY2goZnVuY3Rpb24oYW5zd2VyUCkge1xyXG4gICAgICAgIC8vICAgICBRKGFuc3dlclApLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAvLyB9KTtcclxuICAgICAgICAvLyBVc2UgdGhpcyBpbiB0aGUgbWVhbnRpbWVcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYW5zd2VyUHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgUShhbnN3ZXJQc1tpXSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5yYWNlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihRLnJhY2UpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBQcm9taXNlIHdpdGggYSBwcm9taXNlIGRlc2NyaXB0b3Igb2JqZWN0IGFuZCBvcHRpb25hbCBmYWxsYmFja1xyXG4gKiBmdW5jdGlvbi4gIFRoZSBkZXNjcmlwdG9yIGNvbnRhaW5zIG1ldGhvZHMgbGlrZSB3aGVuKHJlamVjdGVkKSwgZ2V0KG5hbWUpLFxyXG4gKiBzZXQobmFtZSwgdmFsdWUpLCBwb3N0KG5hbWUsIGFyZ3MpLCBhbmQgZGVsZXRlKG5hbWUpLCB3aGljaCBhbGxcclxuICogcmV0dXJuIGVpdGhlciBhIHZhbHVlLCBhIHByb21pc2UgZm9yIGEgdmFsdWUsIG9yIGEgcmVqZWN0aW9uLiAgVGhlIGZhbGxiYWNrXHJcbiAqIGFjY2VwdHMgdGhlIG9wZXJhdGlvbiBuYW1lLCBhIHJlc29sdmVyLCBhbmQgYW55IGZ1cnRoZXIgYXJndW1lbnRzIHRoYXQgd291bGRcclxuICogaGF2ZSBiZWVuIGZvcndhcmRlZCB0byB0aGUgYXBwcm9wcmlhdGUgbWV0aG9kIGFib3ZlIGhhZCBhIG1ldGhvZCBiZWVuXHJcbiAqIHByb3ZpZGVkIHdpdGggdGhlIHByb3BlciBuYW1lLiAgVGhlIEFQSSBtYWtlcyBubyBndWFyYW50ZWVzIGFib3V0IHRoZSBuYXR1cmVcclxuICogb2YgdGhlIHJldHVybmVkIG9iamVjdCwgYXBhcnQgZnJvbSB0aGF0IGl0IGlzIHVzYWJsZSB3aGVyZWV2ZXIgcHJvbWlzZXMgYXJlXHJcbiAqIGJvdWdodCBhbmQgc29sZC5cclxuICovXHJcblEubWFrZVByb21pc2UgPSBQcm9taXNlO1xyXG5mdW5jdGlvbiBQcm9taXNlKGRlc2NyaXB0b3IsIGZhbGxiYWNrLCBpbnNwZWN0KSB7XHJcbiAgICBpZiAoZmFsbGJhY2sgPT09IHZvaWQgMCkge1xyXG4gICAgICAgIGZhbGxiYWNrID0gZnVuY3Rpb24gKG9wKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgICAgXCJQcm9taXNlIGRvZXMgbm90IHN1cHBvcnQgb3BlcmF0aW9uOiBcIiArIG9wXHJcbiAgICAgICAgICAgICkpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBpZiAoaW5zcGVjdCA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtzdGF0ZTogXCJ1bmtub3duXCJ9O1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHByb21pc2UgPSBvYmplY3RfY3JlYXRlKFByb21pc2UucHJvdG90eXBlKTtcclxuXHJcbiAgICBwcm9taXNlLnByb21pc2VEaXNwYXRjaCA9IGZ1bmN0aW9uIChyZXNvbHZlLCBvcCwgYXJncykge1xyXG4gICAgICAgIHZhciByZXN1bHQ7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGRlc2NyaXB0b3Jbb3BdKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBkZXNjcmlwdG9yW29wXS5hcHBseShwcm9taXNlLCBhcmdzKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbGxiYWNrLmNhbGwocHJvbWlzZSwgb3AsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVzb2x2ZSkge1xyXG4gICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcm9taXNlLmluc3BlY3QgPSBpbnNwZWN0O1xyXG5cclxuICAgIC8vIFhYWCBkZXByZWNhdGVkIGB2YWx1ZU9mYCBhbmQgYGV4Y2VwdGlvbmAgc3VwcG9ydFxyXG4gICAgaWYgKGluc3BlY3QpIHtcclxuICAgICAgICB2YXIgaW5zcGVjdGVkID0gaW5zcGVjdCgpO1xyXG4gICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwicmVqZWN0ZWRcIikge1xyXG4gICAgICAgICAgICBwcm9taXNlLmV4Y2VwdGlvbiA9IGluc3BlY3RlZC5yZWFzb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm9taXNlLnZhbHVlT2YgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBpbnNwZWN0ZWQgPSBpbnNwZWN0KCk7XHJcbiAgICAgICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwicGVuZGluZ1wiIHx8XHJcbiAgICAgICAgICAgICAgICBpbnNwZWN0ZWQuc3RhdGUgPT09IFwicmVqZWN0ZWRcIikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGluc3BlY3RlZC52YWx1ZTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwcm9taXNlO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBcIltvYmplY3QgUHJvbWlzZV1cIjtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbiAoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3NlZCkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIHZhciBkb25lID0gZmFsc2U7ICAgLy8gZW5zdXJlIHRoZSB1bnRydXN0ZWQgcHJvbWlzZSBtYWtlcyBhdCBtb3N0IGFcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlIGNhbGwgdG8gb25lIG9mIHRoZSBjYWxsYmFja3NcclxuXHJcbiAgICBmdW5jdGlvbiBfZnVsZmlsbGVkKHZhbHVlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBmdWxmaWxsZWQgPT09IFwiZnVuY3Rpb25cIiA/IGZ1bGZpbGxlZCh2YWx1ZSkgOiB2YWx1ZTtcclxuICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBfcmVqZWN0ZWQoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiByZWplY3RlZCA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgIG1ha2VTdGFja1RyYWNlTG9uZyhleGNlcHRpb24sIHNlbGYpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdGVkKGV4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKG5ld0V4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXdFeGNlcHRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBfcHJvZ3Jlc3NlZCh2YWx1ZSkge1xyXG4gICAgICAgIHJldHVybiB0eXBlb2YgcHJvZ3Jlc3NlZCA9PT0gXCJmdW5jdGlvblwiID8gcHJvZ3Jlc3NlZCh2YWx1ZSkgOiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2VsZi5wcm9taXNlRGlzcGF0Y2goZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChkb25lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZG9uZSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKF9mdWxmaWxsZWQodmFsdWUpKTtcclxuICAgICAgICB9LCBcIndoZW5cIiwgW2Z1bmN0aW9uIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgaWYgKGRvbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoX3JlamVjdGVkKGV4Y2VwdGlvbikpO1xyXG4gICAgICAgIH1dKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFByb2dyZXNzIHByb3BhZ2F0b3IgbmVlZCB0byBiZSBhdHRhY2hlZCBpbiB0aGUgY3VycmVudCB0aWNrLlxyXG4gICAgc2VsZi5wcm9taXNlRGlzcGF0Y2godm9pZCAwLCBcIndoZW5cIiwgW3ZvaWQgMCwgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIG5ld1ZhbHVlO1xyXG4gICAgICAgIHZhciB0aHJldyA9IGZhbHNlO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIG5ld1ZhbHVlID0gX3Byb2dyZXNzZWQodmFsdWUpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgdGhyZXcgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAoUS5vbmVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRocmV3KSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLm5vdGlmeShuZXdWYWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfV0pO1xyXG5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVycyBhbiBvYnNlcnZlciBvbiBhIHByb21pc2UuXHJcbiAqXHJcbiAqIEd1YXJhbnRlZXM6XHJcbiAqXHJcbiAqIDEuIHRoYXQgZnVsZmlsbGVkIGFuZCByZWplY3RlZCB3aWxsIGJlIGNhbGxlZCBvbmx5IG9uY2UuXHJcbiAqIDIuIHRoYXQgZWl0aGVyIHRoZSBmdWxmaWxsZWQgY2FsbGJhY2sgb3IgdGhlIHJlamVjdGVkIGNhbGxiYWNrIHdpbGwgYmVcclxuICogICAgY2FsbGVkLCBidXQgbm90IGJvdGguXHJcbiAqIDMuIHRoYXQgZnVsZmlsbGVkIGFuZCByZWplY3RlZCB3aWxsIG5vdCBiZSBjYWxsZWQgaW4gdGhpcyB0dXJuLlxyXG4gKlxyXG4gKiBAcGFyYW0gdmFsdWUgICAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgdG8gb2JzZXJ2ZVxyXG4gKiBAcGFyYW0gZnVsZmlsbGVkICBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgZnVsZmlsbGVkIHZhbHVlXHJcbiAqIEBwYXJhbSByZWplY3RlZCAgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZWplY3Rpb24gZXhjZXB0aW9uXHJcbiAqIEBwYXJhbSBwcm9ncmVzc2VkIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgZnJvbSB0aGUgaW52b2tlZCBjYWxsYmFja1xyXG4gKi9cclxuUS53aGVuID0gd2hlbjtcclxuZnVuY3Rpb24gd2hlbih2YWx1ZSwgZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3NlZCkge1xyXG4gICAgcmV0dXJuIFEodmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3NlZCk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnRoZW5SZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHZhbHVlOyB9KTtcclxufTtcclxuXHJcblEudGhlblJlc29sdmUgPSBmdW5jdGlvbiAocHJvbWlzZSwgdmFsdWUpIHtcclxuICAgIHJldHVybiBRKHByb21pc2UpLnRoZW5SZXNvbHZlKHZhbHVlKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnRoZW5SZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICgpIHsgdGhyb3cgcmVhc29uOyB9KTtcclxufTtcclxuXHJcblEudGhlblJlamVjdCA9IGZ1bmN0aW9uIChwcm9taXNlLCByZWFzb24pIHtcclxuICAgIHJldHVybiBRKHByb21pc2UpLnRoZW5SZWplY3QocmVhc29uKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJZiBhbiBvYmplY3QgaXMgbm90IGEgcHJvbWlzZSwgaXQgaXMgYXMgXCJuZWFyXCIgYXMgcG9zc2libGUuXHJcbiAqIElmIGEgcHJvbWlzZSBpcyByZWplY3RlZCwgaXQgaXMgYXMgXCJuZWFyXCIgYXMgcG9zc2libGUgdG9vLlxyXG4gKiBJZiBpdOKAmXMgYSBmdWxmaWxsZWQgcHJvbWlzZSwgdGhlIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5lYXJlci5cclxuICogSWYgaXTigJlzIGEgZGVmZXJyZWQgcHJvbWlzZSBhbmQgdGhlIGRlZmVycmVkIGhhcyBiZWVuIHJlc29sdmVkLCB0aGVcclxuICogcmVzb2x1dGlvbiBpcyBcIm5lYXJlclwiLlxyXG4gKiBAcGFyYW0gb2JqZWN0XHJcbiAqIEByZXR1cm5zIG1vc3QgcmVzb2x2ZWQgKG5lYXJlc3QpIGZvcm0gb2YgdGhlIG9iamVjdFxyXG4gKi9cclxuXHJcbi8vIFhYWCBzaG91bGQgd2UgcmUtZG8gdGhpcz9cclxuUS5uZWFyZXIgPSBuZWFyZXI7XHJcbmZ1bmN0aW9uIG5lYXJlcih2YWx1ZSkge1xyXG4gICAgaWYgKGlzUHJvbWlzZSh2YWx1ZSkpIHtcclxuICAgICAgICB2YXIgaW5zcGVjdGVkID0gdmFsdWUuaW5zcGVjdCgpO1xyXG4gICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGluc3BlY3RlZC52YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBwcm9taXNlLlxyXG4gKiBPdGhlcndpc2UgaXQgaXMgYSBmdWxmaWxsZWQgdmFsdWUuXHJcbiAqL1xyXG5RLmlzUHJvbWlzZSA9IGlzUHJvbWlzZTtcclxuZnVuY3Rpb24gaXNQcm9taXNlKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIGlzT2JqZWN0KG9iamVjdCkgJiZcclxuICAgICAgICB0eXBlb2Ygb2JqZWN0LnByb21pc2VEaXNwYXRjaCA9PT0gXCJmdW5jdGlvblwiICYmXHJcbiAgICAgICAgdHlwZW9mIG9iamVjdC5pbnNwZWN0ID09PSBcImZ1bmN0aW9uXCI7XHJcbn1cclxuXHJcblEuaXNQcm9taXNlQWxpa2UgPSBpc1Byb21pc2VBbGlrZTtcclxuZnVuY3Rpb24gaXNQcm9taXNlQWxpa2Uob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gaXNPYmplY3Qob2JqZWN0KSAmJiB0eXBlb2Ygb2JqZWN0LnRoZW4gPT09IFwiZnVuY3Rpb25cIjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHBlbmRpbmcgcHJvbWlzZSwgbWVhbmluZyBub3RcclxuICogZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxyXG4gKi9cclxuUS5pc1BlbmRpbmcgPSBpc1BlbmRpbmc7XHJcbmZ1bmN0aW9uIGlzUGVuZGluZyhvYmplY3QpIHtcclxuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInBlbmRpbmdcIjtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuaXNQZW5kaW5nID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcInBlbmRpbmdcIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSB2YWx1ZSBvciBmdWxmaWxsZWRcclxuICogcHJvbWlzZS5cclxuICovXHJcblEuaXNGdWxmaWxsZWQgPSBpc0Z1bGZpbGxlZDtcclxuZnVuY3Rpb24gaXNGdWxmaWxsZWQob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gIWlzUHJvbWlzZShvYmplY3QpIHx8IG9iamVjdC5pbnNwZWN0KCkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCI7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmlzRnVsZmlsbGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHJlamVjdGVkIHByb21pc2UuXHJcbiAqL1xyXG5RLmlzUmVqZWN0ZWQgPSBpc1JlamVjdGVkO1xyXG5mdW5jdGlvbiBpc1JlamVjdGVkKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIGlzUHJvbWlzZShvYmplY3QpICYmIG9iamVjdC5pbnNwZWN0KCkuc3RhdGUgPT09IFwicmVqZWN0ZWRcIjtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuaXNSZWplY3RlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiO1xyXG59O1xyXG5cclxuLy8vLyBCRUdJTiBVTkhBTkRMRUQgUkVKRUNUSU9OIFRSQUNLSU5HXHJcblxyXG4vLyBUaGlzIHByb21pc2UgbGlicmFyeSBjb25zdW1lcyBleGNlcHRpb25zIHRocm93biBpbiBoYW5kbGVycyBzbyB0aGV5IGNhbiBiZVxyXG4vLyBoYW5kbGVkIGJ5IGEgc3Vic2VxdWVudCBwcm9taXNlLiAgVGhlIGV4Y2VwdGlvbnMgZ2V0IGFkZGVkIHRvIHRoaXMgYXJyYXkgd2hlblxyXG4vLyB0aGV5IGFyZSBjcmVhdGVkLCBhbmQgcmVtb3ZlZCB3aGVuIHRoZXkgYXJlIGhhbmRsZWQuICBOb3RlIHRoYXQgaW4gRVM2IG9yXHJcbi8vIHNoaW1tZWQgZW52aXJvbm1lbnRzLCB0aGlzIHdvdWxkIG5hdHVyYWxseSBiZSBhIGBTZXRgLlxyXG52YXIgdW5oYW5kbGVkUmVhc29ucyA9IFtdO1xyXG52YXIgdW5oYW5kbGVkUmVqZWN0aW9ucyA9IFtdO1xyXG52YXIgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gdHJ1ZTtcclxuXHJcbmZ1bmN0aW9uIHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpIHtcclxuICAgIHVuaGFuZGxlZFJlYXNvbnMubGVuZ3RoID0gMDtcclxuICAgIHVuaGFuZGxlZFJlamVjdGlvbnMubGVuZ3RoID0gMDtcclxuXHJcbiAgICBpZiAoIXRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucykge1xyXG4gICAgICAgIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IHRydWU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYWNrUmVqZWN0aW9uKHByb21pc2UsIHJlYXNvbikge1xyXG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5wdXNoKHByb21pc2UpO1xyXG4gICAgaWYgKHJlYXNvbiAmJiB0eXBlb2YgcmVhc29uLnN0YWNrICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgdW5oYW5kbGVkUmVhc29ucy5wdXNoKHJlYXNvbi5zdGFjayk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChcIihubyBzdGFjaykgXCIgKyByZWFzb24pO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1bnRyYWNrUmVqZWN0aW9uKHByb21pc2UpIHtcclxuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBhdCA9IGFycmF5X2luZGV4T2YodW5oYW5kbGVkUmVqZWN0aW9ucywgcHJvbWlzZSk7XHJcbiAgICBpZiAoYXQgIT09IC0xKSB7XHJcbiAgICAgICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5zcGxpY2UoYXQsIDEpO1xyXG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMuc3BsaWNlKGF0LCAxKTtcclxuICAgIH1cclxufVxyXG5cclxuUS5yZXNldFVuaGFuZGxlZFJlamVjdGlvbnMgPSByZXNldFVuaGFuZGxlZFJlamVjdGlvbnM7XHJcblxyXG5RLmdldFVuaGFuZGxlZFJlYXNvbnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBNYWtlIGEgY29weSBzbyB0aGF0IGNvbnN1bWVycyBjYW4ndCBpbnRlcmZlcmUgd2l0aCBvdXIgaW50ZXJuYWwgc3RhdGUuXHJcbiAgICByZXR1cm4gdW5oYW5kbGVkUmVhc29ucy5zbGljZSgpO1xyXG59O1xyXG5cclxuUS5zdG9wVW5oYW5kbGVkUmVqZWN0aW9uVHJhY2tpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKTtcclxuICAgIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IGZhbHNlO1xyXG59O1xyXG5cclxucmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCk7XHJcblxyXG4vLy8vIEVORCBVTkhBTkRMRUQgUkVKRUNUSU9OIFRSQUNLSU5HXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIHJlamVjdGVkIHByb21pc2UuXHJcbiAqIEBwYXJhbSByZWFzb24gdmFsdWUgZGVzY3JpYmluZyB0aGUgZmFpbHVyZVxyXG4gKi9cclxuUS5yZWplY3QgPSByZWplY3Q7XHJcbmZ1bmN0aW9uIHJlamVjdChyZWFzb24pIHtcclxuICAgIHZhciByZWplY3Rpb24gPSBQcm9taXNlKHtcclxuICAgICAgICBcIndoZW5cIjogZnVuY3Rpb24gKHJlamVjdGVkKSB7XHJcbiAgICAgICAgICAgIC8vIG5vdGUgdGhhdCB0aGUgZXJyb3IgaGFzIGJlZW4gaGFuZGxlZFxyXG4gICAgICAgICAgICBpZiAocmVqZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIHVudHJhY2tSZWplY3Rpb24odGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQocmVhc29uKSA6IHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgfSwgZnVuY3Rpb24gZmFsbGJhY2soKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LCBmdW5jdGlvbiBpbnNwZWN0KCkge1xyXG4gICAgICAgIHJldHVybiB7IHN0YXRlOiBcInJlamVjdGVkXCIsIHJlYXNvbjogcmVhc29uIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RlIHRoYXQgdGhlIHJlYXNvbiBoYXMgbm90IGJlZW4gaGFuZGxlZC5cclxuICAgIHRyYWNrUmVqZWN0aW9uKHJlamVjdGlvbiwgcmVhc29uKTtcclxuXHJcbiAgICByZXR1cm4gcmVqZWN0aW9uO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIGZ1bGZpbGxlZCBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLlxyXG4gKiBAcGFyYW0gdmFsdWUgaW1tZWRpYXRlIHJlZmVyZW5jZVxyXG4gKi9cclxuUS5mdWxmaWxsID0gZnVsZmlsbDtcclxuZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIFByb21pc2Uoe1xyXG4gICAgICAgIFwid2hlblwiOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiZ2V0XCI6IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZVtuYW1lXTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwic2V0XCI6IGZ1bmN0aW9uIChuYW1lLCByaHMpIHtcclxuICAgICAgICAgICAgdmFsdWVbbmFtZV0gPSByaHM7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbbmFtZV07XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcInBvc3RcIjogZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcclxuICAgICAgICAgICAgLy8gTWFyayBNaWxsZXIgcHJvcG9zZXMgdGhhdCBwb3N0IHdpdGggbm8gbmFtZSBzaG91bGQgYXBwbHkgYVxyXG4gICAgICAgICAgICAvLyBwcm9taXNlZCBmdW5jdGlvbi5cclxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUuYXBwbHkodm9pZCAwLCBhcmdzKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVtuYW1lXS5hcHBseSh2YWx1ZSwgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiYXBwbHlcIjogZnVuY3Rpb24gKHRoaXNwLCBhcmdzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS5hcHBseSh0aGlzcCwgYXJncyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcImtleXNcIjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0X2tleXModmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0sIHZvaWQgMCwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcclxuICAgICAgICByZXR1cm4geyBzdGF0ZTogXCJmdWxmaWxsZWRcIiwgdmFsdWU6IHZhbHVlIH07XHJcbiAgICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoZW5hYmxlcyB0byBRIHByb21pc2VzLlxyXG4gKiBAcGFyYW0gcHJvbWlzZSB0aGVuYWJsZSBwcm9taXNlXHJcbiAqIEByZXR1cm5zIGEgUSBwcm9taXNlXHJcbiAqL1xyXG5mdW5jdGlvbiBjb2VyY2UocHJvbWlzZSkge1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0LCBkZWZlcnJlZC5ub3RpZnkpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59XHJcblxyXG4vKipcclxuICogQW5ub3RhdGVzIGFuIG9iamVjdCBzdWNoIHRoYXQgaXQgd2lsbCBuZXZlciBiZVxyXG4gKiB0cmFuc2ZlcnJlZCBhd2F5IGZyb20gdGhpcyBwcm9jZXNzIG92ZXIgYW55IHByb21pc2VcclxuICogY29tbXVuaWNhdGlvbiBjaGFubmVsLlxyXG4gKiBAcGFyYW0gb2JqZWN0XHJcbiAqIEByZXR1cm5zIHByb21pc2UgYSB3cmFwcGluZyBvZiB0aGF0IG9iamVjdCB0aGF0XHJcbiAqIGFkZGl0aW9uYWxseSByZXNwb25kcyB0byB0aGUgXCJpc0RlZlwiIG1lc3NhZ2VcclxuICogd2l0aG91dCBhIHJlamVjdGlvbi5cclxuICovXHJcblEubWFzdGVyID0gbWFzdGVyO1xyXG5mdW5jdGlvbiBtYXN0ZXIob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gUHJvbWlzZSh7XHJcbiAgICAgICAgXCJpc0RlZlwiOiBmdW5jdGlvbiAoKSB7fVxyXG4gICAgfSwgZnVuY3Rpb24gZmFsbGJhY2sob3AsIGFyZ3MpIHtcclxuICAgICAgICByZXR1cm4gZGlzcGF0Y2gob2JqZWN0LCBvcCwgYXJncyk7XHJcbiAgICB9LCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIFEob2JqZWN0KS5pbnNwZWN0KCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNwcmVhZHMgdGhlIHZhbHVlcyBvZiBhIHByb21pc2VkIGFycmF5IG9mIGFyZ3VtZW50cyBpbnRvIHRoZVxyXG4gKiBmdWxmaWxsbWVudCBjYWxsYmFjay5cclxuICogQHBhcmFtIGZ1bGZpbGxlZCBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIHZhcmlhZGljIGFyZ3VtZW50cyBmcm9tIHRoZVxyXG4gKiBwcm9taXNlZCBhcnJheVxyXG4gKiBAcGFyYW0gcmVqZWN0ZWQgY2FsbGJhY2sgdGhhdCByZWNlaXZlcyB0aGUgZXhjZXB0aW9uIGlmIHRoZSBwcm9taXNlXHJcbiAqIGlzIHJlamVjdGVkLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgb3IgdGhyb3duIGV4Y2VwdGlvbiBvZlxyXG4gKiBlaXRoZXIgY2FsbGJhY2suXHJcbiAqL1xyXG5RLnNwcmVhZCA9IHNwcmVhZDtcclxuZnVuY3Rpb24gc3ByZWFkKHZhbHVlLCBmdWxmaWxsZWQsIHJlamVjdGVkKSB7XHJcbiAgICByZXR1cm4gUSh2YWx1ZSkuc3ByZWFkKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5zcHJlYWQgPSBmdW5jdGlvbiAoZnVsZmlsbGVkLCByZWplY3RlZCkge1xyXG4gICAgcmV0dXJuIHRoaXMuYWxsKCkudGhlbihmdW5jdGlvbiAoYXJyYXkpIHtcclxuICAgICAgICByZXR1cm4gZnVsZmlsbGVkLmFwcGx5KHZvaWQgMCwgYXJyYXkpO1xyXG4gICAgfSwgcmVqZWN0ZWQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoZSBhc3luYyBmdW5jdGlvbiBpcyBhIGRlY29yYXRvciBmb3IgZ2VuZXJhdG9yIGZ1bmN0aW9ucywgdHVybmluZ1xyXG4gKiB0aGVtIGludG8gYXN5bmNocm9ub3VzIGdlbmVyYXRvcnMuICBBbHRob3VnaCBnZW5lcmF0b3JzIGFyZSBvbmx5IHBhcnRcclxuICogb2YgdGhlIG5ld2VzdCBFQ01BU2NyaXB0IDYgZHJhZnRzLCB0aGlzIGNvZGUgZG9lcyBub3QgY2F1c2Ugc3ludGF4XHJcbiAqIGVycm9ycyBpbiBvbGRlciBlbmdpbmVzLiAgVGhpcyBjb2RlIHNob3VsZCBjb250aW51ZSB0byB3b3JrIGFuZCB3aWxsXHJcbiAqIGluIGZhY3QgaW1wcm92ZSBvdmVyIHRpbWUgYXMgdGhlIGxhbmd1YWdlIGltcHJvdmVzLlxyXG4gKlxyXG4gKiBFUzYgZ2VuZXJhdG9ycyBhcmUgY3VycmVudGx5IHBhcnQgb2YgVjggdmVyc2lvbiAzLjE5IHdpdGggdGhlXHJcbiAqIC0taGFybW9ueS1nZW5lcmF0b3JzIHJ1bnRpbWUgZmxhZyBlbmFibGVkLiAgU3BpZGVyTW9ua2V5IGhhcyBoYWQgdGhlbVxyXG4gKiBmb3IgbG9uZ2VyLCBidXQgdW5kZXIgYW4gb2xkZXIgUHl0aG9uLWluc3BpcmVkIGZvcm0uICBUaGlzIGZ1bmN0aW9uXHJcbiAqIHdvcmtzIG9uIGJvdGgga2luZHMgb2YgZ2VuZXJhdG9ycy5cclxuICpcclxuICogRGVjb3JhdGVzIGEgZ2VuZXJhdG9yIGZ1bmN0aW9uIHN1Y2ggdGhhdDpcclxuICogIC0gaXQgbWF5IHlpZWxkIHByb21pc2VzXHJcbiAqICAtIGV4ZWN1dGlvbiB3aWxsIGNvbnRpbnVlIHdoZW4gdGhhdCBwcm9taXNlIGlzIGZ1bGZpbGxlZFxyXG4gKiAgLSB0aGUgdmFsdWUgb2YgdGhlIHlpZWxkIGV4cHJlc3Npb24gd2lsbCBiZSB0aGUgZnVsZmlsbGVkIHZhbHVlXHJcbiAqICAtIGl0IHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlICh3aGVuIHRoZSBnZW5lcmF0b3JcclxuICogICAgc3RvcHMgaXRlcmF0aW5nKVxyXG4gKiAgLSB0aGUgZGVjb3JhdGVkIGZ1bmN0aW9uIHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqICAgIG9mIHRoZSBnZW5lcmF0b3Igb3IgdGhlIGZpcnN0IHJlamVjdGVkIHByb21pc2UgYW1vbmcgdGhvc2VcclxuICogICAgeWllbGRlZC5cclxuICogIC0gaWYgYW4gZXJyb3IgaXMgdGhyb3duIGluIHRoZSBnZW5lcmF0b3IsIGl0IHByb3BhZ2F0ZXMgdGhyb3VnaFxyXG4gKiAgICBldmVyeSBmb2xsb3dpbmcgeWllbGQgdW50aWwgaXQgaXMgY2F1Z2h0LCBvciB1bnRpbCBpdCBlc2NhcGVzXHJcbiAqICAgIHRoZSBnZW5lcmF0b3IgZnVuY3Rpb24gYWx0b2dldGhlciwgYW5kIGlzIHRyYW5zbGF0ZWQgaW50byBhXHJcbiAqICAgIHJlamVjdGlvbiBmb3IgdGhlIHByb21pc2UgcmV0dXJuZWQgYnkgdGhlIGRlY29yYXRlZCBnZW5lcmF0b3IuXHJcbiAqL1xyXG5RLmFzeW5jID0gYXN5bmM7XHJcbmZ1bmN0aW9uIGFzeW5jKG1ha2VHZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgLy8gd2hlbiB2ZXJiIGlzIFwic2VuZFwiLCBhcmcgaXMgYSB2YWx1ZVxyXG4gICAgICAgIC8vIHdoZW4gdmVyYiBpcyBcInRocm93XCIsIGFyZyBpcyBhbiBleGNlcHRpb25cclxuICAgICAgICBmdW5jdGlvbiBjb250aW51ZXIodmVyYiwgYXJnKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQ7XHJcblxyXG4gICAgICAgICAgICAvLyBVbnRpbCBWOCAzLjE5IC8gQ2hyb21pdW0gMjkgaXMgcmVsZWFzZWQsIFNwaWRlck1vbmtleSBpcyB0aGUgb25seVxyXG4gICAgICAgICAgICAvLyBlbmdpbmUgdGhhdCBoYXMgYSBkZXBsb3llZCBiYXNlIG9mIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBnZW5lcmF0b3JzLlxyXG4gICAgICAgICAgICAvLyBIb3dldmVyLCBTTSdzIGdlbmVyYXRvcnMgdXNlIHRoZSBQeXRob24taW5zcGlyZWQgc2VtYW50aWNzIG9mXHJcbiAgICAgICAgICAgIC8vIG91dGRhdGVkIEVTNiBkcmFmdHMuICBXZSB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgRVM2LCBidXQgd2UnZCBhbHNvXHJcbiAgICAgICAgICAgIC8vIGxpa2UgdG8gbWFrZSBpdCBwb3NzaWJsZSB0byB1c2UgZ2VuZXJhdG9ycyBpbiBkZXBsb3llZCBicm93c2Vycywgc29cclxuICAgICAgICAgICAgLy8gd2UgYWxzbyBzdXBwb3J0IFB5dGhvbi1zdHlsZSBnZW5lcmF0b3JzLiAgQXQgc29tZSBwb2ludCB3ZSBjYW4gcmVtb3ZlXHJcbiAgICAgICAgICAgIC8vIHRoaXMgYmxvY2suXHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIFN0b3BJdGVyYXRpb24gPT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICAgICAgICAgIC8vIEVTNiBHZW5lcmF0b3JzXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGdlbmVyYXRvclt2ZXJiXShhcmcpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFEocmVzdWx0LnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdoZW4ocmVzdWx0LnZhbHVlLCBjYWxsYmFjaywgZXJyYmFjayk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBTcGlkZXJNb25rZXkgR2VuZXJhdG9yc1xyXG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IFJlbW92ZSB0aGlzIGNhc2Ugd2hlbiBTTSBkb2VzIEVTNiBnZW5lcmF0b3JzLlxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0b3JbdmVyYl0oYXJnKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1N0b3BJdGVyYXRpb24oZXhjZXB0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUShleGNlcHRpb24udmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gd2hlbihyZXN1bHQsIGNhbGxiYWNrLCBlcnJiYWNrKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZ2VuZXJhdG9yID0gbWFrZUdlbmVyYXRvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBjYWxsYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJuZXh0XCIpO1xyXG4gICAgICAgIHZhciBlcnJiYWNrID0gY29udGludWVyLmJpbmQoY29udGludWVyLCBcInRocm93XCIpO1xyXG4gICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xyXG4gICAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZSBzcGF3biBmdW5jdGlvbiBpcyBhIHNtYWxsIHdyYXBwZXIgYXJvdW5kIGFzeW5jIHRoYXQgaW1tZWRpYXRlbHlcclxuICogY2FsbHMgdGhlIGdlbmVyYXRvciBhbmQgYWxzbyBlbmRzIHRoZSBwcm9taXNlIGNoYWluLCBzbyB0aGF0IGFueVxyXG4gKiB1bmhhbmRsZWQgZXJyb3JzIGFyZSB0aHJvd24gaW5zdGVhZCBvZiBmb3J3YXJkZWQgdG8gdGhlIGVycm9yXHJcbiAqIGhhbmRsZXIuIFRoaXMgaXMgdXNlZnVsIGJlY2F1c2UgaXQncyBleHRyZW1lbHkgY29tbW9uIHRvIHJ1blxyXG4gKiBnZW5lcmF0b3JzIGF0IHRoZSB0b3AtbGV2ZWwgdG8gd29yayB3aXRoIGxpYnJhcmllcy5cclxuICovXHJcblEuc3Bhd24gPSBzcGF3bjtcclxuZnVuY3Rpb24gc3Bhd24obWFrZUdlbmVyYXRvcikge1xyXG4gICAgUS5kb25lKFEuYXN5bmMobWFrZUdlbmVyYXRvcikoKSk7XHJcbn1cclxuXHJcbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBpbnRlcmZhY2Ugb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxyXG4vKipcclxuICogVGhyb3dzIGEgUmV0dXJuVmFsdWUgZXhjZXB0aW9uIHRvIHN0b3AgYW4gYXN5bmNocm9ub3VzIGdlbmVyYXRvci5cclxuICpcclxuICogVGhpcyBpbnRlcmZhY2UgaXMgYSBzdG9wLWdhcCBtZWFzdXJlIHRvIHN1cHBvcnQgZ2VuZXJhdG9yIHJldHVyblxyXG4gKiB2YWx1ZXMgaW4gb2xkZXIgRmlyZWZveC9TcGlkZXJNb25rZXkuICBJbiBicm93c2VycyB0aGF0IHN1cHBvcnQgRVM2XHJcbiAqIGdlbmVyYXRvcnMgbGlrZSBDaHJvbWl1bSAyOSwganVzdCB1c2UgXCJyZXR1cm5cIiBpbiB5b3VyIGdlbmVyYXRvclxyXG4gKiBmdW5jdGlvbnMuXHJcbiAqXHJcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgcmV0dXJuIHZhbHVlIGZvciB0aGUgc3Vycm91bmRpbmcgZ2VuZXJhdG9yXHJcbiAqIEB0aHJvd3MgUmV0dXJuVmFsdWUgZXhjZXB0aW9uIHdpdGggdGhlIHZhbHVlLlxyXG4gKiBAZXhhbXBsZVxyXG4gKiAvLyBFUzYgc3R5bGVcclxuICogUS5hc3luYyhmdW5jdGlvbiogKCkge1xyXG4gKiAgICAgIHZhciBmb28gPSB5aWVsZCBnZXRGb29Qcm9taXNlKCk7XHJcbiAqICAgICAgdmFyIGJhciA9IHlpZWxkIGdldEJhclByb21pc2UoKTtcclxuICogICAgICByZXR1cm4gZm9vICsgYmFyO1xyXG4gKiB9KVxyXG4gKiAvLyBPbGRlciBTcGlkZXJNb25rZXkgc3R5bGVcclxuICogUS5hc3luYyhmdW5jdGlvbiAoKSB7XHJcbiAqICAgICAgdmFyIGZvbyA9IHlpZWxkIGdldEZvb1Byb21pc2UoKTtcclxuICogICAgICB2YXIgYmFyID0geWllbGQgZ2V0QmFyUHJvbWlzZSgpO1xyXG4gKiAgICAgIFEucmV0dXJuKGZvbyArIGJhcik7XHJcbiAqIH0pXHJcbiAqL1xyXG5RW1wicmV0dXJuXCJdID0gX3JldHVybjtcclxuZnVuY3Rpb24gX3JldHVybih2YWx1ZSkge1xyXG4gICAgdGhyb3cgbmV3IFFSZXR1cm5WYWx1ZSh2YWx1ZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGUgcHJvbWlzZWQgZnVuY3Rpb24gZGVjb3JhdG9yIGVuc3VyZXMgdGhhdCBhbnkgcHJvbWlzZSBhcmd1bWVudHNcclxuICogYXJlIHNldHRsZWQgYW5kIHBhc3NlZCBhcyB2YWx1ZXMgKGB0aGlzYCBpcyBhbHNvIHNldHRsZWQgYW5kIHBhc3NlZFxyXG4gKiBhcyBhIHZhbHVlKS4gIEl0IHdpbGwgYWxzbyBlbnN1cmUgdGhhdCB0aGUgcmVzdWx0IG9mIGEgZnVuY3Rpb24gaXNcclxuICogYWx3YXlzIGEgcHJvbWlzZS5cclxuICpcclxuICogQGV4YW1wbGVcclxuICogdmFyIGFkZCA9IFEucHJvbWlzZWQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICogICAgIHJldHVybiBhICsgYjtcclxuICogfSk7XHJcbiAqIGFkZChRKGEpLCBRKEIpKTtcclxuICpcclxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGRlY29yYXRlXHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gYSBmdW5jdGlvbiB0aGF0IGhhcyBiZWVuIGRlY29yYXRlZC5cclxuICovXHJcblEucHJvbWlzZWQgPSBwcm9taXNlZDtcclxuZnVuY3Rpb24gcHJvbWlzZWQoY2FsbGJhY2spIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHNwcmVhZChbdGhpcywgYWxsKGFyZ3VtZW50cyldLCBmdW5jdGlvbiAoc2VsZiwgYXJncykge1xyXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkoc2VsZiwgYXJncyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vKipcclxuICogc2VuZHMgYSBtZXNzYWdlIHRvIGEgdmFsdWUgaW4gYSBmdXR1cmUgdHVyblxyXG4gKiBAcGFyYW0gb2JqZWN0KiB0aGUgcmVjaXBpZW50XHJcbiAqIEBwYXJhbSBvcCB0aGUgbmFtZSBvZiB0aGUgbWVzc2FnZSBvcGVyYXRpb24sIGUuZy4sIFwid2hlblwiLFxyXG4gKiBAcGFyYW0gYXJncyBmdXJ0aGVyIGFyZ3VtZW50cyB0byBiZSBmb3J3YXJkZWQgdG8gdGhlIG9wZXJhdGlvblxyXG4gKiBAcmV0dXJucyByZXN1bHQge1Byb21pc2V9IGEgcHJvbWlzZSBmb3IgdGhlIHJlc3VsdCBvZiB0aGUgb3BlcmF0aW9uXHJcbiAqL1xyXG5RLmRpc3BhdGNoID0gZGlzcGF0Y2g7XHJcbmZ1bmN0aW9uIGRpc3BhdGNoKG9iamVjdCwgb3AsIGFyZ3MpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2gob3AsIGFyZ3MpO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIChvcCwgYXJncykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzZWxmLnByb21pc2VEaXNwYXRjaChkZWZlcnJlZC5yZXNvbHZlLCBvcCwgYXJncyk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIHByb3BlcnR5IHRvIGdldFxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSBwcm9wZXJ0eSB2YWx1ZVxyXG4gKi9cclxuUS5nZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJnZXRcIiwgW2tleV0pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJnZXRcIiwgW2tleV0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIG9iamVjdCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIHByb3BlcnR5IHRvIHNldFxyXG4gKiBAcGFyYW0gdmFsdWUgICAgIG5ldyB2YWx1ZSBvZiBwcm9wZXJ0eVxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICovXHJcblEuc2V0ID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCB2YWx1ZSkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwic2V0XCIsIFtrZXksIHZhbHVlXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVsZXRlcyBhIHByb3BlcnR5IGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XHJcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBwcm9wZXJ0eSB0byBkZWxldGVcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqL1xyXG5RLmRlbCA9IC8vIFhYWCBsZWdhY3lcclxuUVtcImRlbGV0ZVwiXSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5kZWwgPSAvLyBYWFggbGVnYWN5XHJcblByb21pc2UucHJvdG90eXBlW1wiZGVsZXRlXCJdID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJkZWxldGVcIiwgW2tleV0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEludm9rZXMgYSBtZXRob2QgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcclxuICogQHBhcmFtIHZhbHVlICAgICBhIHZhbHVlIHRvIHBvc3QsIHR5cGljYWxseSBhbiBhcnJheSBvZlxyXG4gKiAgICAgICAgICAgICAgICAgIGludm9jYXRpb24gYXJndW1lbnRzIGZvciBwcm9taXNlcyB0aGF0XHJcbiAqICAgICAgICAgICAgICAgICAgYXJlIHVsdGltYXRlbHkgYmFja2VkIHdpdGggYHJlc29sdmVgIHZhbHVlcyxcclxuICogICAgICAgICAgICAgICAgICBhcyBvcHBvc2VkIHRvIHRob3NlIGJhY2tlZCB3aXRoIFVSTHNcclxuICogICAgICAgICAgICAgICAgICB3aGVyZWluIHRoZSBwb3N0ZWQgdmFsdWUgY2FuIGJlIGFueVxyXG4gKiAgICAgICAgICAgICAgICAgIEpTT04gc2VyaWFsaXphYmxlIG9iamVjdC5cclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqL1xyXG4vLyBib3VuZCBsb2NhbGx5IGJlY2F1c2UgaXQgaXMgdXNlZCBieSBvdGhlciBtZXRob2RzXHJcblEubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUS5wb3N0ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgYXJncykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFyZ3NdKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblByb21pc2UucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbiAobmFtZSwgYXJncykge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBhcmdzXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogSW52b2tlcyBhIG1ldGhvZCBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxyXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGludm9jYXRpb24gYXJndW1lbnRzXHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxyXG4gKi9cclxuUS5zZW5kID0gLy8gWFhYIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgcGFybGFuY2VcclxuUS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblEuaW52b2tlID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSAvKi4uLmFyZ3MqLykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMildKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnNlbmQgPSAvLyBYWFggTWFyayBNaWxsZXIncyBwcm9wb3NlZCBwYXJsYW5jZVxyXG5Qcm9taXNlLnByb3RvdHlwZS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblByb21pc2UucHJvdG90eXBlLmludm9rZSA9IGZ1bmN0aW9uIChuYW1lIC8qLi4uYXJncyovKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSldKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcHBsaWVzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSBhcmdzICAgICAgYXJyYXkgb2YgYXBwbGljYXRpb24gYXJndW1lbnRzXHJcbiAqL1xyXG5RLmZhcHBseSA9IGZ1bmN0aW9uIChvYmplY3QsIGFyZ3MpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcmdzXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5mYXBwbHkgPSBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcmdzXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsbHMgdGhlIHByb21pc2VkIGZ1bmN0aW9uIGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgZnVuY3Rpb25cclxuICogQHBhcmFtIC4uLmFyZ3MgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcclxuICovXHJcblFbXCJ0cnlcIl0gPVxyXG5RLmZjYWxsID0gZnVuY3Rpb24gKG9iamVjdCAvKiAuLi5hcmdzKi8pIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5mY2FsbCA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcnJheV9zbGljZShhcmd1bWVudHMpXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQmluZHMgdGhlIHByb21pc2VkIGZ1bmN0aW9uLCB0cmFuc2Zvcm1pbmcgcmV0dXJuIHZhbHVlcyBpbnRvIGEgZnVsZmlsbGVkXHJcbiAqIHByb21pc2UgYW5kIHRocm93biBlcnJvcnMgaW50byBhIHJlamVjdGVkIG9uZS5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxyXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGFwcGxpY2F0aW9uIGFyZ3VtZW50c1xyXG4gKi9cclxuUS5mYmluZCA9IGZ1bmN0aW9uIChvYmplY3QgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBwcm9taXNlID0gUShvYmplY3QpO1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGZib3VuZCgpIHtcclxuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgYXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSlcclxuICAgICAgICBdKTtcclxuICAgIH07XHJcbn07XHJcblByb21pc2UucHJvdG90eXBlLmZiaW5kID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xyXG4gICAgICAgIHJldHVybiBwcm9taXNlLmRpc3BhdGNoKFwiYXBwbHlcIiwgW1xyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxyXG4gICAgICAgIF0pO1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXF1ZXN0cyB0aGUgbmFtZXMgb2YgdGhlIG93bmVkIHByb3BlcnRpZXMgb2YgYSBwcm9taXNlZFxyXG4gKiBvYmplY3QgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUga2V5cyBvZiB0aGUgZXZlbnR1YWxseSBzZXR0bGVkIG9iamVjdFxyXG4gKi9cclxuUS5rZXlzID0gZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImtleXNcIiwgW10pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwia2V5c1wiLCBbXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogVHVybnMgYW4gYXJyYXkgb2YgcHJvbWlzZXMgaW50byBhIHByb21pc2UgZm9yIGFuIGFycmF5LiAgSWYgYW55IG9mXHJcbiAqIHRoZSBwcm9taXNlcyBnZXRzIHJlamVjdGVkLCB0aGUgd2hvbGUgYXJyYXkgaXMgcmVqZWN0ZWQgaW1tZWRpYXRlbHkuXHJcbiAqIEBwYXJhbSB7QXJyYXkqfSBhbiBhcnJheSAob3IgcHJvbWlzZSBmb3IgYW4gYXJyYXkpIG9mIHZhbHVlcyAob3JcclxuICogcHJvbWlzZXMgZm9yIHZhbHVlcylcclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXNcclxuICovXHJcbi8vIEJ5IE1hcmsgTWlsbGVyXHJcbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPXN0cmF3bWFuOmNvbmN1cnJlbmN5JnJldj0xMzA4Nzc2NTIxI2FsbGZ1bGZpbGxlZFxyXG5RLmFsbCA9IGFsbDtcclxuZnVuY3Rpb24gYWxsKHByb21pc2VzKSB7XHJcbiAgICByZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2VzKSB7XHJcbiAgICAgICAgdmFyIGNvdW50RG93biA9IDA7XHJcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgICAgICBhcnJheV9yZWR1Y2UocHJvbWlzZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHByb21pc2UsIGluZGV4KSB7XHJcbiAgICAgICAgICAgIHZhciBzbmFwc2hvdDtcclxuICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgaXNQcm9taXNlKHByb21pc2UpICYmXHJcbiAgICAgICAgICAgICAgICAoc25hcHNob3QgPSBwcm9taXNlLmluc3BlY3QoKSkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCJcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSBzbmFwc2hvdC52YWx1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICsrY291bnREb3duO1xyXG4gICAgICAgICAgICAgICAgd2hlbihcclxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKC0tY291bnREb3duID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0LFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChwcm9ncmVzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5ub3RpZnkoeyBpbmRleDogaW5kZXgsIHZhbHVlOiBwcm9ncmVzcyB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgdm9pZCAwKTtcclxuICAgICAgICBpZiAoY291bnREb3duID09PSAwKSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocHJvbWlzZXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5hbGwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gYWxsKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdhaXRzIGZvciBhbGwgcHJvbWlzZXMgdG8gYmUgc2V0dGxlZCwgZWl0aGVyIGZ1bGZpbGxlZCBvclxyXG4gKiByZWplY3RlZC4gIFRoaXMgaXMgZGlzdGluY3QgZnJvbSBgYWxsYCBzaW5jZSB0aGF0IHdvdWxkIHN0b3BcclxuICogd2FpdGluZyBhdCB0aGUgZmlyc3QgcmVqZWN0aW9uLiAgVGhlIHByb21pc2UgcmV0dXJuZWQgYnlcclxuICogYGFsbFJlc29sdmVkYCB3aWxsIG5ldmVyIGJlIHJlamVjdGVkLlxyXG4gKiBAcGFyYW0gcHJvbWlzZXMgYSBwcm9taXNlIGZvciBhbiBhcnJheSAob3IgYW4gYXJyYXkpIG9mIHByb21pc2VzXHJcbiAqIChvciB2YWx1ZXMpXHJcbiAqIEByZXR1cm4gYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiBwcm9taXNlc1xyXG4gKi9cclxuUS5hbGxSZXNvbHZlZCA9IGRlcHJlY2F0ZShhbGxSZXNvbHZlZCwgXCJhbGxSZXNvbHZlZFwiLCBcImFsbFNldHRsZWRcIik7XHJcbmZ1bmN0aW9uIGFsbFJlc29sdmVkKHByb21pc2VzKSB7XHJcbiAgICByZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2VzKSB7XHJcbiAgICAgICAgcHJvbWlzZXMgPSBhcnJheV9tYXAocHJvbWlzZXMsIFEpO1xyXG4gICAgICAgIHJldHVybiB3aGVuKGFsbChhcnJheV9tYXAocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB3aGVuKHByb21pc2UsIG5vb3AsIG5vb3ApO1xyXG4gICAgICAgIH0pKSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZXM7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuYWxsUmVzb2x2ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gYWxsUmVzb2x2ZWQodGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQHNlZSBQcm9taXNlI2FsbFNldHRsZWRcclxuICovXHJcblEuYWxsU2V0dGxlZCA9IGFsbFNldHRsZWQ7XHJcbmZ1bmN0aW9uIGFsbFNldHRsZWQocHJvbWlzZXMpIHtcclxuICAgIHJldHVybiBRKHByb21pc2VzKS5hbGxTZXR0bGVkKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUdXJucyBhbiBhcnJheSBvZiBwcm9taXNlcyBpbnRvIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgb2YgdGhlaXIgc3RhdGVzIChhc1xyXG4gKiByZXR1cm5lZCBieSBgaW5zcGVjdGApIHdoZW4gdGhleSBoYXZlIGFsbCBzZXR0bGVkLlxyXG4gKiBAcGFyYW0ge0FycmF5W0FueSpdfSB2YWx1ZXMgYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXHJcbiAqIHByb21pc2VzIGZvciB2YWx1ZXMpXHJcbiAqIEByZXR1cm5zIHtBcnJheVtTdGF0ZV19IGFuIGFycmF5IG9mIHN0YXRlcyBmb3IgdGhlIHJlc3BlY3RpdmUgdmFsdWVzLlxyXG4gKi9cclxuUHJvbWlzZS5wcm90b3R5cGUuYWxsU2V0dGxlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHByb21pc2VzKSB7XHJcbiAgICAgICAgcmV0dXJuIGFsbChhcnJheV9tYXAocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHByb21pc2UgPSBRKHByb21pc2UpO1xyXG4gICAgICAgICAgICBmdW5jdGlvbiByZWdhcmRsZXNzKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2UuaW5zcGVjdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4ocmVnYXJkbGVzcywgcmVnYXJkbGVzcyk7XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FwdHVyZXMgdGhlIGZhaWx1cmUgb2YgYSBwcm9taXNlLCBnaXZpbmcgYW4gb3BvcnR1bml0eSB0byByZWNvdmVyXHJcbiAqIHdpdGggYSBjYWxsYmFjay4gIElmIHRoZSBnaXZlbiBwcm9taXNlIGlzIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXHJcbiAqIHByb21pc2UgaXMgZnVsZmlsbGVkLlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgZm9yIHNvbWV0aGluZ1xyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBmdWxmaWxsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlmIHRoZVxyXG4gKiBnaXZlbiBwcm9taXNlIGlzIHJlamVjdGVkXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgY2FsbGJhY2tcclxuICovXHJcblEuZmFpbCA9IC8vIFhYWCBsZWdhY3lcclxuUVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKG9iamVjdCwgcmVqZWN0ZWQpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmZhaWwgPSAvLyBYWFggbGVnYWN5XHJcblByb21pc2UucHJvdG90eXBlW1wiY2F0Y2hcIl0gPSBmdW5jdGlvbiAocmVqZWN0ZWQpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4odm9pZCAwLCByZWplY3RlZCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQXR0YWNoZXMgYSBsaXN0ZW5lciB0aGF0IGNhbiByZXNwb25kIHRvIHByb2dyZXNzIG5vdGlmaWNhdGlvbnMgZnJvbSBhXHJcbiAqIHByb21pc2UncyBvcmlnaW5hdGluZyBkZWZlcnJlZC4gVGhpcyBsaXN0ZW5lciByZWNlaXZlcyB0aGUgZXhhY3QgYXJndW1lbnRzXHJcbiAqIHBhc3NlZCB0byBgYGRlZmVycmVkLm5vdGlmeWBgLlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgZm9yIHNvbWV0aGluZ1xyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byByZWNlaXZlIGFueSBwcm9ncmVzcyBub3RpZmljYXRpb25zXHJcbiAqIEByZXR1cm5zIHRoZSBnaXZlbiBwcm9taXNlLCB1bmNoYW5nZWRcclxuICovXHJcblEucHJvZ3Jlc3MgPSBwcm9ncmVzcztcclxuZnVuY3Rpb24gcHJvZ3Jlc3Mob2JqZWN0LCBwcm9ncmVzc2VkKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLnRoZW4odm9pZCAwLCB2b2lkIDAsIHByb2dyZXNzZWQpO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5wcm9ncmVzcyA9IGZ1bmN0aW9uIChwcm9ncmVzc2VkKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKHZvaWQgMCwgdm9pZCAwLCBwcm9ncmVzc2VkKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQcm92aWRlcyBhbiBvcHBvcnR1bml0eSB0byBvYnNlcnZlIHRoZSBzZXR0bGluZyBvZiBhIHByb21pc2UsXHJcbiAqIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciB0aGUgcHJvbWlzZSBpcyBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuICBGb3J3YXJkc1xyXG4gKiB0aGUgcmVzb2x1dGlvbiB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aGVuIHRoZSBjYWxsYmFjayBpcyBkb25lLlxyXG4gKiBUaGUgY2FsbGJhY2sgY2FuIHJldHVybiBhIHByb21pc2UgdG8gZGVmZXIgY29tcGxldGlvbi5cclxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHRvIG9ic2VydmUgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuXHJcbiAqIHByb21pc2UsIHRha2VzIG5vIGFyZ3VtZW50cy5cclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSB3aGVuXHJcbiAqIGBgZmluYGAgaXMgZG9uZS5cclxuICovXHJcblEuZmluID0gLy8gWFhYIGxlZ2FjeVxyXG5RW1wiZmluYWxseVwiXSA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpW1wiZmluYWxseVwiXShjYWxsYmFjayk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5maW4gPSAvLyBYWFggbGVnYWN5XHJcblByb21pc2UucHJvdG90eXBlW1wiZmluYWxseVwiXSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgY2FsbGJhY2sgPSBRKGNhbGxiYWNrKTtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcclxuICAgICAgICAvLyBUT0RPIGF0dGVtcHQgdG8gcmVjeWNsZSB0aGUgcmVqZWN0aW9uIHdpdGggXCJ0aGlzXCIuXHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRocm93IHJlYXNvbjtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlcm1pbmF0ZXMgYSBjaGFpbiBvZiBwcm9taXNlcywgZm9yY2luZyByZWplY3Rpb25zIHRvIGJlXHJcbiAqIHRocm93biBhcyBleGNlcHRpb25zLlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgYXQgdGhlIGVuZCBvZiBhIGNoYWluIG9mIHByb21pc2VzXHJcbiAqIEByZXR1cm5zIG5vdGhpbmdcclxuICovXHJcblEuZG9uZSA9IGZ1bmN0aW9uIChvYmplY3QsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRvbmUoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykge1xyXG4gICAgdmFyIG9uVW5oYW5kbGVkRXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAvLyBmb3J3YXJkIHRvIGEgZnV0dXJlIHR1cm4gc28gdGhhdCBgYHdoZW5gYFxyXG4gICAgICAgIC8vIGRvZXMgbm90IGNhdGNoIGl0IGFuZCB0dXJuIGl0IGludG8gYSByZWplY3Rpb24uXHJcbiAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBtYWtlU3RhY2tUcmFjZUxvbmcoZXJyb3IsIHByb21pc2UpO1xyXG4gICAgICAgICAgICBpZiAoUS5vbmVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gQXZvaWQgdW5uZWNlc3NhcnkgYG5leHRUaWNrYGluZyB2aWEgYW4gdW5uZWNlc3NhcnkgYHdoZW5gLlxyXG4gICAgdmFyIHByb21pc2UgPSBmdWxmaWxsZWQgfHwgcmVqZWN0ZWQgfHwgcHJvZ3Jlc3MgP1xyXG4gICAgICAgIHRoaXMudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykgOlxyXG4gICAgICAgIHRoaXM7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHByb2Nlc3MgJiYgcHJvY2Vzcy5kb21haW4pIHtcclxuICAgICAgICBvblVuaGFuZGxlZEVycm9yID0gcHJvY2Vzcy5kb21haW4uYmluZChvblVuaGFuZGxlZEVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICBwcm9taXNlLnRoZW4odm9pZCAwLCBvblVuaGFuZGxlZEVycm9yKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXVzZXMgYSBwcm9taXNlIHRvIGJlIHJlamVjdGVkIGlmIGl0IGRvZXMgbm90IGdldCBmdWxmaWxsZWQgYmVmb3JlXHJcbiAqIHNvbWUgbWlsbGlzZWNvbmRzIHRpbWUgb3V0LlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2VcclxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbGxpc2Vjb25kcyB0aW1lb3V0XHJcbiAqIEBwYXJhbSB7QW55Kn0gY3VzdG9tIGVycm9yIG1lc3NhZ2Ugb3IgRXJyb3Igb2JqZWN0IChvcHRpb25hbClcclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSBpZiBpdCBpc1xyXG4gKiBmdWxmaWxsZWQgYmVmb3JlIHRoZSB0aW1lb3V0LCBvdGhlcndpc2UgcmVqZWN0ZWQuXHJcbiAqL1xyXG5RLnRpbWVvdXQgPSBmdW5jdGlvbiAob2JqZWN0LCBtcywgZXJyb3IpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkudGltZW91dChtcywgZXJyb3IpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudGltZW91dCA9IGZ1bmN0aW9uIChtcywgZXJyb3IpIHtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICB2YXIgdGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCFlcnJvciB8fCBcInN0cmluZ1wiID09PSB0eXBlb2YgZXJyb3IpIHtcclxuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoZXJyb3IgfHwgXCJUaW1lZCBvdXQgYWZ0ZXIgXCIgKyBtcyArIFwiIG1zXCIpO1xyXG4gICAgICAgICAgICBlcnJvci5jb2RlID0gXCJFVElNRURPVVRcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcclxuICAgIH0sIG1zKTtcclxuXHJcbiAgICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICB9LCBmdW5jdGlvbiAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICB9LCBkZWZlcnJlZC5ub3RpZnkpO1xyXG5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZ2l2ZW4gdmFsdWUgKG9yIHByb21pc2VkIHZhbHVlKSwgc29tZVxyXG4gKiBtaWxsaXNlY29uZHMgYWZ0ZXIgaXQgcmVzb2x2ZWQuIFBhc3NlcyByZWplY3Rpb25zIGltbWVkaWF0ZWx5LlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2VcclxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbGxpc2Vjb25kc1xyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlIGFmdGVyIG1pbGxpc2Vjb25kc1xyXG4gKiB0aW1lIGhhcyBlbGFwc2VkIHNpbmNlIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlLlxyXG4gKiBJZiB0aGUgZ2l2ZW4gcHJvbWlzZSByZWplY3RzLCB0aGF0IGlzIHBhc3NlZCBpbW1lZGlhdGVseS5cclxuICovXHJcblEuZGVsYXkgPSBmdW5jdGlvbiAob2JqZWN0LCB0aW1lb3V0KSB7XHJcbiAgICBpZiAodGltZW91dCA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgdGltZW91dCA9IG9iamVjdDtcclxuICAgICAgICBvYmplY3QgPSB2b2lkIDA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRlbGF5KHRpbWVvdXQpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAodGltZW91dCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcclxuICAgICAgICB9LCB0aW1lb3V0KTtcclxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBhc3NlcyBhIGNvbnRpbnVhdGlvbiB0byBhIE5vZGUgZnVuY3Rpb24sIHdoaWNoIGlzIGNhbGxlZCB3aXRoIHRoZSBnaXZlblxyXG4gKiBhcmd1bWVudHMgcHJvdmlkZWQgYXMgYW4gYXJyYXksIGFuZCByZXR1cm5zIGEgcHJvbWlzZS5cclxuICpcclxuICogICAgICBRLm5mYXBwbHkoRlMucmVhZEZpbGUsIFtfX2ZpbGVuYW1lXSlcclxuICogICAgICAudGhlbihmdW5jdGlvbiAoY29udGVudCkge1xyXG4gKiAgICAgIH0pXHJcbiAqXHJcbiAqL1xyXG5RLm5mYXBwbHkgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGFyZ3MpIHtcclxuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJncyk7XHJcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICB0aGlzLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogUGFzc2VzIGEgY29udGludWF0aW9uIHRvIGEgTm9kZSBmdW5jdGlvbiwgd2hpY2ggaXMgY2FsbGVkIHdpdGggdGhlIGdpdmVuXHJcbiAqIGFyZ3VtZW50cyBwcm92aWRlZCBpbmRpdmlkdWFsbHksIGFuZCByZXR1cm5zIGEgcHJvbWlzZS5cclxuICogQGV4YW1wbGVcclxuICogUS5uZmNhbGwoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpXHJcbiAqIC50aGVuKGZ1bmN0aW9uIChjb250ZW50KSB7XHJcbiAqIH0pXHJcbiAqXHJcbiAqL1xyXG5RLm5mY2FsbCA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xyXG4gICAgcmV0dXJuIFEoY2FsbGJhY2spLm5mYXBwbHkoYXJncyk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5uZmNhbGwgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgdGhpcy5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyYXBzIGEgTm9kZUpTIGNvbnRpbnVhdGlvbiBwYXNzaW5nIGZ1bmN0aW9uIGFuZCByZXR1cm5zIGFuIGVxdWl2YWxlbnRcclxuICogdmVyc2lvbiB0aGF0IHJldHVybnMgYSBwcm9taXNlLlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBRLm5mYmluZChGUy5yZWFkRmlsZSwgX19maWxlbmFtZSkoXCJ1dGYtOFwiKVxyXG4gKiAudGhlbihjb25zb2xlLmxvZylcclxuICogLmRvbmUoKVxyXG4gKi9cclxuUS5uZmJpbmQgPVxyXG5RLmRlbm9kZWlmeSA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGJhc2VBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xyXG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICAgICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgICAgIFEoY2FsbGJhY2spLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5mYmluZCA9XHJcblByb21pc2UucHJvdG90eXBlLmRlbm9kZWlmeSA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMpO1xyXG4gICAgYXJncy51bnNoaWZ0KHRoaXMpO1xyXG4gICAgcmV0dXJuIFEuZGVub2RlaWZ5LmFwcGx5KHZvaWQgMCwgYXJncyk7XHJcbn07XHJcblxyXG5RLm5iaW5kID0gZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGJhc2VBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAyKTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xyXG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICAgICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkodGhpc3AsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFEoYm91bmQpLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5iaW5kID0gZnVuY3Rpb24gKC8qdGhpc3AsIC4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDApO1xyXG4gICAgYXJncy51bnNoaWZ0KHRoaXMpO1xyXG4gICAgcmV0dXJuIFEubmJpbmQuYXBwbHkodm9pZCAwLCBhcmdzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxscyBhIG1ldGhvZCBvZiBhIE5vZGUtc3R5bGUgb2JqZWN0IHRoYXQgYWNjZXB0cyBhIE5vZGUtc3R5bGVcclxuICogY2FsbGJhY2sgd2l0aCBhIGdpdmVuIGFycmF5IG9mIGFyZ3VtZW50cywgcGx1cyBhIHByb3ZpZGVkIGNhbGxiYWNrLlxyXG4gKiBAcGFyYW0gb2JqZWN0IGFuIG9iamVjdCB0aGF0IGhhcyB0aGUgbmFtZWQgbWV0aG9kXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcclxuICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kOyB0aGUgY2FsbGJhY2tcclxuICogd2lsbCBiZSBwcm92aWRlZCBieSBRIGFuZCBhcHBlbmRlZCB0byB0aGVzZSBhcmd1bWVudHMuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9yIGVycm9yXHJcbiAqL1xyXG5RLm5tYXBwbHkgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5RLm5wb3N0ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgYXJncykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5ucG9zdChuYW1lLCBhcmdzKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5tYXBwbHkgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5Qcm9taXNlLnByb3RvdHlwZS5ucG9zdCA9IGZ1bmN0aW9uIChuYW1lLCBhcmdzKSB7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzIHx8IFtdKTtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxscyBhIG1ldGhvZCBvZiBhIE5vZGUtc3R5bGUgb2JqZWN0IHRoYXQgYWNjZXB0cyBhIE5vZGUtc3R5bGVcclxuICogY2FsbGJhY2ssIGZvcndhcmRpbmcgdGhlIGdpdmVuIHZhcmlhZGljIGFyZ3VtZW50cywgcGx1cyBhIHByb3ZpZGVkXHJcbiAqIGNhbGxiYWNrIGFyZ3VtZW50LlxyXG4gKiBAcGFyYW0gb2JqZWN0IGFuIG9iamVjdCB0aGF0IGhhcyB0aGUgbmFtZWQgbWV0aG9kXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcclxuICogQHBhcmFtIC4uLmFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZDsgdGhlIGNhbGxiYWNrIHdpbGxcclxuICogYmUgcHJvdmlkZWQgYnkgUSBhbmQgYXBwZW5kZWQgdG8gdGhlc2UgYXJndW1lbnRzLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSB2YWx1ZSBvciBlcnJvclxyXG4gKi9cclxuUS5uc2VuZCA9IC8vIFhYWCBCYXNlZCBvbiBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIFwic2VuZFwiXHJcblEubm1jYWxsID0gLy8gWFhYIEJhc2VkIG9uIFwiUmVkc2FuZHJvJ3NcIiBwcm9wb3NhbFxyXG5RLm5pbnZva2UgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDIpO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIG5vZGVBcmdzXSkuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5uc2VuZCA9IC8vIFhYWCBCYXNlZCBvbiBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIFwic2VuZFwiXHJcblByb21pc2UucHJvdG90eXBlLm5tY2FsbCA9IC8vIFhYWCBCYXNlZCBvbiBcIlJlZHNhbmRybydzXCIgcHJvcG9zYWxcclxuUHJvbWlzZS5wcm90b3R5cGUubmludm9rZSA9IGZ1bmN0aW9uIChuYW1lIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBub2RlQXJnc10pLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIElmIGEgZnVuY3Rpb24gd291bGQgbGlrZSB0byBzdXBwb3J0IGJvdGggTm9kZSBjb250aW51YXRpb24tcGFzc2luZy1zdHlsZSBhbmRcclxuICogcHJvbWlzZS1yZXR1cm5pbmctc3R5bGUsIGl0IGNhbiBlbmQgaXRzIGludGVybmFsIHByb21pc2UgY2hhaW4gd2l0aFxyXG4gKiBgbm9kZWlmeShub2RlYmFjaylgLCBmb3J3YXJkaW5nIHRoZSBvcHRpb25hbCBub2RlYmFjayBhcmd1bWVudC4gIElmIHRoZSB1c2VyXHJcbiAqIGVsZWN0cyB0byB1c2UgYSBub2RlYmFjaywgdGhlIHJlc3VsdCB3aWxsIGJlIHNlbnQgdGhlcmUuICBJZiB0aGV5IGRvIG5vdFxyXG4gKiBwYXNzIGEgbm9kZWJhY2ssIHRoZXkgd2lsbCByZWNlaXZlIHRoZSByZXN1bHQgcHJvbWlzZS5cclxuICogQHBhcmFtIG9iamVjdCBhIHJlc3VsdCAob3IgYSBwcm9taXNlIGZvciBhIHJlc3VsdClcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gbm9kZWJhY2sgYSBOb2RlLmpzLXN0eWxlIGNhbGxiYWNrXHJcbiAqIEByZXR1cm5zIGVpdGhlciB0aGUgcHJvbWlzZSBvciBub3RoaW5nXHJcbiAqL1xyXG5RLm5vZGVpZnkgPSBub2RlaWZ5O1xyXG5mdW5jdGlvbiBub2RlaWZ5KG9iamVjdCwgbm9kZWJhY2spIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkubm9kZWlmeShub2RlYmFjayk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLm5vZGVpZnkgPSBmdW5jdGlvbiAobm9kZWJhY2spIHtcclxuICAgIGlmIChub2RlYmFjaykge1xyXG4gICAgICAgIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgbm9kZWJhY2sobnVsbCwgdmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgbm9kZWJhY2soZXJyb3IpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyBBbGwgY29kZSBiZWZvcmUgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzLlxyXG52YXIgcUVuZGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xyXG5cclxucmV0dXJuIFE7XHJcblxyXG59KTtcclxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIlpiaTdnYlwiKSkiLCIvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vXG4vLyBBeG9uIEJyaWRnZSBBUEkgRnJhbWV3b3JrXG4vL1xuLy8gQXV0aG9yZWQgYnk6ICAgQXhvbiBJbnRlcmFjdGl2ZVxuLy9cbi8vIExhc3QgTW9kaWZpZWQ6IEp1bmUgNCwgMjAxNFxuLy9cbi8vIERlcGVuZGVuY2llczogIGNyeXB0by1qcyAoaHR0cHM6Ly9naXRodWIuY29tL2V2YW52b3NiZXJnL2NyeXB0by1qcylcbi8vICAgICAgICAgICAgICAgIGpRdWVyeSAxLjExLjEgKGh0dHA6Ly9qcXVlcnkuY29tLylcbi8vICAgICAgICAgICAgICAgIGpzb24zIChodHRwczovL2dpdGh1Yi5jb20vYmVzdGllanMvanNvbjMpXG4vLyAgICAgICAgICAgICAgICBqU3RvcmFnZSAoaHR0cHM6Ly9naXRodWIuY29tL2FuZHJpczkvalN0b3JhZ2UpXG4vL1xuLy8gKioqIEhpc3RvcnkgKioqXG4vL1xuLy8gVmVyc2lvbiAgICBEYXRlICAgICAgICAgICAgICAgICAgTm90ZXNcbi8vID09PT09PT09PSAgPT09PT09PT09PT09PT09PT09PT0gID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIDAuMSAgICAgICAgSnVuZSA0LCAyMDE0ICAgICAgICAgIEZpcnN0IHN0YWJsZSB2ZXJzaW9uLiBcbi8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuLy8gUmVxdWlyZSB0aGUgcm9vdCBBeG9uQnJpZGdlIG1vZHVsZVxuLy92YXIgQnJpZGdlQ2xpZW50ID0gcmVxdWlyZSggJy4vQnJpZGdlQ2xpZW50JyApO1xuXG52YXIgYnJpZGdlID0gcmVxdWlyZSggJy4vQnJpZGdlJyApO1xubW9kdWxlLmV4cG9ydHMgPSBuZXcgYnJpZGdlKCk7XG4iXX0=
(10)
});
