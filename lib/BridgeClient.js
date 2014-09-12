!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Bridge=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
// Include dependencies
var CryptoEncHex = _dereq_( './include/crypto-js/enc-hex' );
var CryptoSha256 = _dereq_( './include/crypto-js/sha256' );
var Q = _dereq_( './include/q' );
var Identity = _dereq_( './Identity' );

// Configure Q to provide promise stack traces in full.
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

  /////////////////////////////////////////////////////////////////////////////////////////////////
  // PRIVATE //////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////
  // PROPERTIES //
  ////////////////

  // [PRIVATE] identity
  // The Identity object used to track the user and create requests signed with
  // appropriate HMAC hash values.
  var identity = null;

  // [PRIVATE] Log Levels
  // A series of pseudo-constant log level strings used by the reject() function.
  var LOG_LEVEL_ERROR = 1;
  var LOG_LEVEL_WARNING = 2;
  var LOG_LEVEL_DEBUG = 3;

  // [PRIVATE] Error Codes
  // A series of pseudo-constant error codes used by the Bridge Client to classify errors.
  var ERROR_CODE_NULL_IDENTITY = 101;
  var ERROR_CODE_MALFORMED_RESPONSE = 102;
  var ERROR_CODE_REQUEST_TIMEOUT = 103;
  var ERROR_CODE_NO_STORED_IDENTITY = 104;

  // [PRIVATE] Error Code Explanations
  // A map of error codes (keys) to error code explanations (values).
  var ERROR_CODE_EXPLANATIONS = {
      1: "The request sent to the server was badly formed. Ensure that your Bridge Client and Bridge Server versions match.",
      2: "The server encountered an error while querying the database. Ensure that your database server is running.",
      3: "A user is already registered with this email account.",
      4: "The server rejected an anonymous request because it may have been tempered with or intercepted.",
      5: "The supplied password is incorrect.",
      6: "Your email account has not yet been verified. Please check your email and complete the registration process.",
      7: "The supplied email address is invalid.",
      8: "The supplied first name is invalid (must be at least 2 characters in length)",
      9: "The HMAC security signature supplied with this request was badly formed.",
     10: "The supplied last name is invalid (must be at least 2 characters in length)",
     11: "The SHA-256 hashed password supplied with this request was badly formed. This does NOT mean that your password is invalid, but that an internal error occurred.",
     12: "The time supplied with this request was badly formed (must be in ISO format)",
     13: "The user hash supplied with this request was badly formed.",
     14: "The requested action requires that you be logged in as a registered user.",
     15: "The request failed because a Bridge Server extension has called a service module before Bridge could validate the request (too early in middleware chain).",
     16: "The supplied application data object could not be parsed as valid JSON.",
     17: "The user with the supplied email was not found in the database.",
     18: "An unknown error occurred in the server. Please contact the server administrator.",
     19: "The request sent to the server did not contain the \"Bridge\" header, and could not be authenticated.",
     20: "The Bridge header of the request could not be parsed as valid JSON.",
     21: "The request cannot be completed because this user is not authorized to perform this action.",
     22: "The requested content cannot be accessed anonymously. Please login to a valid user account.",
     23: "The request was badly formed.",
     24: "This request must be performed anonymously. Please log out and try again.",
    101: "No user identity is available for authentication. This action can only be completed when logged in.",
    102: "The response from the server was badly formed. Ensure that your Bridge Client and Bridge Server versions match.",
    103: "The server did not respond. Check your internet connection and confirm that your Bridge Server is running.",
    104: "No user identity was found in your browser's local storage. Aborting automatic login attempt."
  };




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
  // Clears the current user object assigned to the Bridge.
  var clearUser = function () {

    // Set the user and additional data objects to null
    self.user = null;

  };

  // [PRIVATE] hasIdentity()
  // Returns whether or not an the Identity object is currently assigned.
  var hasIdentity = function () {

    return ( identity !== null );

  };

  // [PRIVATE] resolve()
  // The generic handler for all Bridge promise resolutions.
  var resolve = function ( name, deferred, data ) {

    // Log the success to the console.
    if ( self.debug === true ) {
      console.log( "BRIDGE | " + name + " | " + JSON.stringify( data ) );
    }

    // Resolve the deferred.
    deferred.resolve( data );

  };

  // [PRIVATE] reject()
  // The generic handler for all Bridge promise rejections.
  var reject = function ( name, deferred, data, logLevel ) {

    // Log the error to the console.
    if ( self.debug === true ) {

      // Assemble the string to output to the console
      var printStr = "BRIDGE | " + name + " | " + data.status + " >> Code " + data.errorCode +
        ": " + self.decodeError( data.errorCode );

      // Choose the log level to output this as (ERROR if none or unknown value).
      switch ( logLevel ) {
        case LOG_LEVEL_DEBUG:
          console.log( printStr );
          break;
        case LOG_LEVEL_WARNING:
          console.warn( printStr );
          break;
        default:
          console.error( printStr );
          break;
      }
    }

    // Reject the deferred.
    deferred.reject( data );

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
    var deferred = Q.defer();

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
      reject( "Request", deferred, {
        status: 200,
        errorCode: ERROR_CODE_NULL_IDENTITY
      } );
      return deferred.promise;
    }

    // Create and sign the request header to attach to the XHR request.
    var signedHeader = requestIdentity.createHeader( payload );

    // Send the request
    self.createRequest( method, self.baseUrl + resource, signedHeader )
      .then( function ( data ) {

        // If the resBody isn't an object, fail right now.
        if ( typeof data !== 'object' ) {
          reject( "Request", deferred, {
            status: 200,
            errorCode: ERROR_CODE_NULL_IDENTITY
          } );
          return;
        }

        // Notify the user of the request about to be sent.
        if ( typeof self.onRequestCalled === "function" ) {
          self.onRequestCalled( method, resource, signedHeader );
        }

        // Resolve the deferred.
        resolve( "Request", deferred, data );

      },
      function ( data ) {

        // Reject the deferred.
        reject( "Request", deferred, data );

      } );

    // Return the promise object to the caller.
    return deferred.promise;

  };

  // [PRIVATE] requestChangePasswordPrivate()
  // Ask the server to change the password of the currently logged-in user. This operation requires
  // the user's current password to be supplied and creates a temporary Identity object to send the
  // request for a password change to verify that another individual didn't just hop onto a logged-
  // in computer and change a user's password while they were away from their computer.
  var requestChangePasswordPrivate = function ( oldPassword, newPassword ) {

    // Notify the user of the changePassword call occurring.
    if ( typeof self.onFChangePassword === "function" ) {
      self.onChangePassword();
    }

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = Q.defer();

    // Check is the user is logged in before attempting to change their password.
    if ( !self.isLoggedIn() ) {
      reject( "Change Password", deferred, {
        status: 200,
        errorCode: ERROR_CODE_NULL_IDENTITY
      } );
      return deferred.promise;
    }

    // Hash the user's passwords.
    var oldHashedPassword = CryptoSha256( oldPassword )
      .toString( CryptoEncHex );
    var newHashedPassword = CryptoSha256( newPassword )
      .toString( CryptoEncHex );

    // Clear the unencrypted passwords from memory.
    oldPassword = null;
    newPassword = null;

    // Build the payload object to send with the request.
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
    requestPrivate( 'PUT', 'users', payload, tempIdentity )
      .then( function ( data ) {

          // Check that the content type (Message) is formatted correctly.
          if ( typeof data.content.message !== 'string' ) {
            reject( "Change Password", deferred, {
              status: 200,
              errorCode: ERROR_CODE_MALFORMED_RESPONSE
            } );
            return;
          }

          // Set Bridge's identity object using the new password, since future requests will need to
          // be signed with the new user credentials.
          setIdentity( identity.email, newHashedPassword, true );

          // Resolve the deferred.
          resolve( "Change Password", deferred, data );

        },
        function ( data ) {

          // Reject the deferred.
          reject( "Change Password", deferred, data );

        }
    );

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
    var deferred = Q.defer();

    // Build the payload object to send with the request
    var payload = {
      "message": email
    };

    // Create a temporary Identity object with a blank password.
    var tempIdentity = new Identity( '', '', true );

    // Send the request
    requestPrivate( 'PUT', 'forgot-password', payload, tempIdentity )
      .then( function ( data ) {

          // Check that the content type (Message) is formatted correctly.
          if ( typeof data.content.message !== 'string' ) {
            reject( "Forgot Password", deferred, {
              status: 200,
              errorCode: ERROR_CODE_MALFORMED_RESPONSE
            } );
            return;
          }

          // Resolve the deferred.
          resolve( "Forgot Password", deferred, data );

        },
        function ( data ) {

          // Reject the deferred.
          reject( "Forgot Password", deferred, data );

        }
    );

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
      CryptoSha256( password )
      .toString( CryptoEncHex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = Q.defer();

    // This request uses an empty payload
    var payload = {};

    // Set whether or not the Bridge should store user credentials and Bridge configuration
    // to local storage.
    self.useLocalStorage = useLocalStorage;

    // Configure an Identity object with the user's credentials.
    setIdentity( email, hashedPassword, true );

    // Send the request
    requestPrivate( 'GET', 'login', payload )
      .then( function ( data ) {

          // Check that the content type (Login Package) is formatted correctly.
          if ( typeof data.content.user !== 'object' ) {
            reject( "Login", deferred, {
              status: 200,
              errorCode: ERROR_CODE_MALFORMED_RESPONSE
            } );
            return;
          }

          // Set the user object using the user data that was returned
          setUser( data.content.user );

          // Store this identity to local storage, if that was requested.
          // [SECURITY NOTE 1] useLocalStorage should be set based on user input, by asking whether
          // the user is on a private computer or not. This is can be considered a tolerable
          // security risk as long as the user is on a private computer that they trust or manage
          // themselves. However, on a public machine this is probably a security risk, and the
          // user should be able to decline this convenience in favour of security, regardless
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

          // Resolve the deferred.
          resolve( "Login", deferred, data );

        },
        function ( data ) {

          // Clear the user credentials, since they didn't work anyway.
          clearUser();

          // Handle the failure
          reject( "Login", deferred, data );

        }
    );

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
    var hashedPassword = CryptoSha256( password )
      .toString( CryptoEncHex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = Q.defer();

    // Build the payload object to send with the request
    var payload = {
      "hash": hash,
      "message": hashedPassword
    };

    // Create a temporary an Identity object with a blank password.
    var tempIdentity = new Identity( '', '', true );

    // Send the request
    requestPrivate( 'PUT', 'recover-password', payload, tempIdentity )
      .then( function ( data ) {

          // Check that the content type (Message) is formatted correctly.
          if ( typeof data.content.message !== 'string' ) {
            reject( "Recover Password", deferred, {
              status: 200,
              errorCode: ERROR_CODE_MALFORMED_RESPONSE
            } );
            return;
          }

          // Resolve the deferred.
          resolve( "Recover Password", deferred, data );

        },
        function ( data ) {

          // Reject the deferred.
          reject( "Recover Password", deferred, data );

        } );

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
    var hashedPassword = CryptoSha256( password )
      .toString( CryptoEncHex );

    // Clear the unencrypted password from memory
    password = null;

    // Create a deferred object to return so the end-user can handle success/failure conveniently.
    var deferred = Q.defer();

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
    requestPrivate( 'POST', 'users', payload, tempIdentity )
      .then( function ( data ) {

          // Check that the content type (Message) is formatted correctly.
          if ( typeof data.content.message !== 'string' ) {
            reject( "Register", deferred, {
              status: 200,
              errorCode: ERROR_CODE_MALFORMED_RESPONSE
            } );
            return;
          }

          // Resolve the deferred.
          resolve( "Register", deferred, data );

        },
        function ( data ) {

          // Reject the deferred.
          reject( "Register", deferred, data );

        } );

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
    var deferred = Q.defer();

    // Build the payload object to send with the request
    var payload = {
      "hash": hash
    };

    // Create a temporary an Identity object with a blank password.
    var tempIdentity = new Identity( '', '', true );

    // Send the request
    requestPrivate( 'PUT', 'verify-email', payload, tempIdentity )
      .then( function ( data ) {

          // Check that the content type (Message) is formatted correctly.
          if ( typeof data.content.message !== 'string' ) {
            reject( "Verify Email", deferred, {
              status: 200,
              errorCode: ERROR_CODE_MALFORMED_RESPONSE
            } );
            return;
          }

          // Resolve the deferred.
          resolve( "Verify Email", deferred, data );

        },
        function ( data ) {

          // Reject the deferred.
          reject( "Verify Email", deferred, data );

        } );

    // Return the deferred object so the end-user can handle errors as they choose.
    return deferred.promise;

  };

  // [PRIVATE] setIdentity()
  // Sets the current Identity object to a new instance given a user's email and password.
  var setIdentity = function ( email, password, dontHashPassword ) {

    identity = new Identity( email, password, dontHashPassword );

  };

  // [PRIVATE] setUser
  // Sets the current user object.
  var setUser = function ( user ) {

    // Set the user and additional data objects
    self.user = user;

  };


  /////////////////////////////////////////////////////////////////////////////////////////////////
  // PUBLIC ///////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////

  ////////////////
  // PROPERTIES //
  ////////////////

  // [PUBLIC] debug
  // If set to true, Bridge will log errors and warnings to the console when they occur.
  self.debug = false;

  // [PUBLIC] baseUrl
  // This URL is automatically appended to the beginning of all requests. This URL should end with
  // a forward slash (/) so that any resources and filters can be appended after it.
  self.baseUrl = '';

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
  self.createRequest = function ( method, url, signedHeader ) {

    // Create a new XhrHttpRequest and a Q deferred to wrap it.
    var xhr = new XMLHttpRequest();
    var deferred = Q.defer();

    // Configure the XHR request
    xhr.open( method.toUpperCase(), url, true );
    xhr.setRequestHeader( 'Accept', 'application/json' );
    xhr.setRequestHeader( 'Bridge', JSON.stringify( signedHeader ) );

    // Assign the callback for all onreadystatechange XHR events
    xhr.onreadystatechange = function () {
      // Only when the XHR state transitions to completed
      if ( xhr.readyState === 4 ) {
        if ( typeof xhr.responseText === 'string' ) {
          try {
            var data = JSON.parse( xhr.responseText );
            if ( self.isErrorCodeResponse( xhr.status ) ) {
              deferred.reject( data.content );
            }
            else {
              deferred.resolve( data );
            }
          } catch ( e ) {
            deferred.reject( {
              status: xhr.status,
              errorCode: ERROR_CODE_MALFORMED_RESPONSE
            } );
          }
        } else if ( typeof xhr.responseText === 'object' ) {
          deferred.resolve( xhr.responseText );
        } else {
          deferred.reject( {
            status: xhr.status,
            errorCode: ERROR_CODE_MALFORMED_RESPONSE
          } );
        }
      }
    };

    // Assign the callback for all onerror XHR events
    xhr.onerror = function () {
      if ( typeof xhr.responseText === 'string' ) {
        try {
          deferred.reject( JSON.parse( xhr.responseText ) );
        } catch ( e ) {
          deferred.reject( {
            status: xhr.status,
            errorCode: ERROR_CODE_MALFORMED_RESPONSE
          } );
        }
      } else if ( typeof xhr.responseText === 'object' ) {
        deferred.reject( xhr.responseText.content );
      } else {
        deferred.reject( {
          status: xhr.status,
          errorCode: ERROR_CODE_MALFORMED_RESPONSE
        } );
      }
    };

    // Assign the callback for all ontimeout XHR events
    xhr.ontimeout = function () {
      deferred.reject( {
        status: 0,
        errorCode: ERROR_CODE_REQUEST_TIMEOUT
      } );
    };

    // Send the request out into the network
    xhr.send();

    // Return the promise object to the caller
    return deferred.promise;

  };

  // [PUBLIC] createRequestHeader()
  // Returns a new request header wrapped around the payload passed in.
  self.createRequestHeader = function ( payload ) {
    return ( hasIdentity() ) ? identity.createHeader( payload ) : {};
  };

  // [PUBLIC] isErrorCodeResponse()
  // Returns whether or not the status code received back from the server is 400 or greater. It is
  // generally assumed that such an HTTP status code can be considered to be an error.
  self.isErrorCodeResponse = function ( status ) {
    return ( status >= 400 );
  };

  // [PUBLIC] decodeError()
  // Returns a string that provides human-understandable information about the type of error
  // encountered by Bridge This input to this function should be the errorCode field of an
  // error object received back from the server for an HTTP status code of 400 or greater. These
  // codes may also originate from the client. Client error codes use the numbers 101 and up.
  self.decodeError = function ( errorCode ) {
    var result = ERROR_CODE_EXPLANATIONS[ errorCode ];
    if ( typeof result === 'undefined' ) {
      return "Unknown error code. You may need to update your bridge-client package.";
    }
    return result;
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
    var deferred = Q.defer();

    // Notify the user of the logout action.
    if ( typeof self.onLogoutCalled === 'function' ) {
      self.onLogoutCalled();
    }

    // Delete the Identity and User objects to preserve the user's password/data security.
    clearIdentity();
    clearUser();

    // Clear the identity from local storage to preserve the user's password security.
    // If no identity is stored, this will do nothing.
    localStorage.removeItem( 'bridge-client-identity' );

    // Resolve the promise since this operation cannot fail
    deferred.resolve();
    return deferred.promise;

  };

  // [PUBLIC] request()
  // Sends an XHR request using a default JavaScript XmlHttpRequest object to the given API
  // resource using the given HTTP method. The HTTP request body will be set to the
  // JSON.stringify()ed request that is generated by the Identity object set to perform HMAC
  // signing.
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

    // Use the stored identity to authenticate if possible.
    var storedIdentity = localStorage.getItem( 'bridge-client-identity' );
    if ( storedIdentity !== null ) {
      var parsedIdentity = JSON.parse( storedIdentity );
      if ( self.debug === true ) {
        console.log( "Stored identity: " + JSON.stringify( parsedIdentity ) );
      }
      return requestLoginPrivate( parsedIdentity.email, parsedIdentity.password, true, true );
    }

    // No stored identity was found, so we will return a rejected promise so we can handle failure.
    var deferred = Q.defer();
    reject(
      "Login Stored Identity",
      deferred,
      {
        status: 200,
        errorCode: ERROR_CODE_NO_STORED_IDENTITY
      },
      LOG_LEVEL_WARNING
    );
    return deferred.promise;

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

},{"./Identity":2,"./include/crypto-js/enc-hex":4,"./include/crypto-js/sha256":7,"./include/q":8}],2:[function(_dereq_,module,exports){
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
},{"./include/crypto-js/enc-hex":4,"./include/crypto-js/hmac-sha256":5,"./include/crypto-js/sha256":7}],3:[function(_dereq_,module,exports){
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
},{}],4:[function(_dereq_,module,exports){
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
},{"./core":3}],5:[function(_dereq_,module,exports){
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
},{"./core":3,"./hmac":6,"./sha256":7}],6:[function(_dereq_,module,exports){
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
},{"./core":3}],7:[function(_dereq_,module,exports){
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
},{"./core":3}],8:[function(_dereq_,module,exports){
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

}).call(this,_dereq_("gzNCgL"))
},{"gzNCgL":10}],9:[function(_dereq_,module,exports){
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

},{"./Bridge":1}],10:[function(_dereq_,module,exports){
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

},{}]},{},[9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJjOlxcRGV2ZWxvcG1lbnRcXF9CaXRidWNrZXRcXHBlaXJcXGNsaWVudFxcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L3BlaXIvY2xpZW50L2Jvd2VyX2NvbXBvbmVudHMvYnJpZGdlLWNsaWVudC9zcmMvQnJpZGdlLmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9wZWlyL2NsaWVudC9ib3dlcl9jb21wb25lbnRzL2JyaWRnZS1jbGllbnQvc3JjL0lkZW50aXR5LmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9wZWlyL2NsaWVudC9ib3dlcl9jb21wb25lbnRzL2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvY3J5cHRvLWpzL2NvcmUuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L3BlaXIvY2xpZW50L2Jvd2VyX2NvbXBvbmVudHMvYnJpZGdlLWNsaWVudC9zcmMvaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleC5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvcGVpci9jbGllbnQvYm93ZXJfY29tcG9uZW50cy9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2NyeXB0by1qcy9obWFjLXNoYTI1Ni5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvcGVpci9jbGllbnQvYm93ZXJfY29tcG9uZW50cy9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2NyeXB0by1qcy9obWFjLmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9wZWlyL2NsaWVudC9ib3dlcl9jb21wb25lbnRzL2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1Ni5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvcGVpci9jbGllbnQvYm93ZXJfY29tcG9uZW50cy9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL3EuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L3BlaXIvY2xpZW50L2Jvd2VyX2NvbXBvbmVudHMvYnJpZGdlLWNsaWVudC9zcmMvaW5kZXguanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L3BlaXIvY2xpZW50L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNzZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4dUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3QzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gSW5jbHVkZSBkZXBlbmRlbmNpZXNcclxudmFyIENyeXB0b0VuY0hleCA9IHJlcXVpcmUoICcuL2luY2x1ZGUvY3J5cHRvLWpzL2VuYy1oZXgnICk7XHJcbnZhciBDcnlwdG9TaGEyNTYgPSByZXF1aXJlKCAnLi9pbmNsdWRlL2NyeXB0by1qcy9zaGEyNTYnICk7XHJcbnZhciBRID0gcmVxdWlyZSggJy4vaW5jbHVkZS9xJyApO1xyXG52YXIgSWRlbnRpdHkgPSByZXF1aXJlKCAnLi9JZGVudGl0eScgKTtcclxuXHJcbi8vIENvbmZpZ3VyZSBRIHRvIHByb3ZpZGUgcHJvbWlzZSBzdGFjayB0cmFjZXMgaW4gZnVsbC5cclxuUS5sb25nU3RhY2tTdXBwb3J0ID0gdHJ1ZTtcclxuXHJcbi8vIFtCcmlkZ2UgQ29uc3RydWN0b3JdXHJcbi8vIFRoZSBCcmlkZ2Ugb2JqZWN0IGlzIHRoZSBnbG9iYWwgb2JqZWN0IHRocm91Z2ggd2hpY2ggb3RoZXIgYXBwbGljYXRpb25zIHdpbGxcclxuLy8gY29tbXVuaWNhdGUgd2l0aCB0aGUgYnJpZGdlZCBBUEkgcmVzb3VyY2VzLiBJdCBwcm92aWRlcyBhIHNpbXBsZSBzdXJmYWNlIEFQSSBmb3IgbG9nZ2luZ1xyXG4vLyBpbiBhbmQgbG9nZ2luZyBvdXQgdXNlcnMgYXMgd2VsbCBhcyBzZW5kaW5nIHJlcXVlc3RzIHRvIHRoZSBBUEkuIEludGVybmFsbHksIGl0IGhhbmRsZXNcclxuLy8gYWxsIG9mIHRoZSByZXF1ZXN0IGF1dGhlbnRpY2F0aW9uIG5lY2Vzc2FyeSBmb3IgdGhlIEFQSSB3aXRob3V0IGV4cG9zaW5nIHRoZSB1c2VyJ3NcclxuLy8gYWNjb3VudCBwYXNzd29yZCB0byBvdXRzaWRlIHNjcnV0aW55IChhbmQgZXZlbiBzY3J1dGlueSBmcm9tIG90aGVyIGxvY2FsIGFwcGxpY2F0aW9uc1xyXG4vLyB0byBhIHNpZ25pZmljYW50IGV4dGVudCkuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIFRoZSBvYmplY3QgdG8gYmUgcmV0dXJuZWQgZnJvbSB0aGUgZmFjdG9yeVxyXG4gIHZhciBzZWxmID0ge307XHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAvLyBQUklWQVRFIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gUFJPUEVSVElFUyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLy8gW1BSSVZBVEVdIGlkZW50aXR5XHJcbiAgLy8gVGhlIElkZW50aXR5IG9iamVjdCB1c2VkIHRvIHRyYWNrIHRoZSB1c2VyIGFuZCBjcmVhdGUgcmVxdWVzdHMgc2lnbmVkIHdpdGhcclxuICAvLyBhcHByb3ByaWF0ZSBITUFDIGhhc2ggdmFsdWVzLlxyXG4gIHZhciBpZGVudGl0eSA9IG51bGw7XHJcblxyXG4gIC8vIFtQUklWQVRFXSBMb2cgTGV2ZWxzXHJcbiAgLy8gQSBzZXJpZXMgb2YgcHNldWRvLWNvbnN0YW50IGxvZyBsZXZlbCBzdHJpbmdzIHVzZWQgYnkgdGhlIHJlamVjdCgpIGZ1bmN0aW9uLlxyXG4gIHZhciBMT0dfTEVWRUxfRVJST1IgPSAxO1xyXG4gIHZhciBMT0dfTEVWRUxfV0FSTklORyA9IDI7XHJcbiAgdmFyIExPR19MRVZFTF9ERUJVRyA9IDM7XHJcblxyXG4gIC8vIFtQUklWQVRFXSBFcnJvciBDb2Rlc1xyXG4gIC8vIEEgc2VyaWVzIG9mIHBzZXVkby1jb25zdGFudCBlcnJvciBjb2RlcyB1c2VkIGJ5IHRoZSBCcmlkZ2UgQ2xpZW50IHRvIGNsYXNzaWZ5IGVycm9ycy5cclxuICB2YXIgRVJST1JfQ09ERV9OVUxMX0lERU5USVRZID0gMTAxO1xyXG4gIHZhciBFUlJPUl9DT0RFX01BTEZPUk1FRF9SRVNQT05TRSA9IDEwMjtcclxuICB2YXIgRVJST1JfQ09ERV9SRVFVRVNUX1RJTUVPVVQgPSAxMDM7XHJcbiAgdmFyIEVSUk9SX0NPREVfTk9fU1RPUkVEX0lERU5USVRZID0gMTA0O1xyXG5cclxuICAvLyBbUFJJVkFURV0gRXJyb3IgQ29kZSBFeHBsYW5hdGlvbnNcclxuICAvLyBBIG1hcCBvZiBlcnJvciBjb2RlcyAoa2V5cykgdG8gZXJyb3IgY29kZSBleHBsYW5hdGlvbnMgKHZhbHVlcykuXHJcbiAgdmFyIEVSUk9SX0NPREVfRVhQTEFOQVRJT05TID0ge1xyXG4gICAgICAxOiBcIlRoZSByZXF1ZXN0IHNlbnQgdG8gdGhlIHNlcnZlciB3YXMgYmFkbHkgZm9ybWVkLiBFbnN1cmUgdGhhdCB5b3VyIEJyaWRnZSBDbGllbnQgYW5kIEJyaWRnZSBTZXJ2ZXIgdmVyc2lvbnMgbWF0Y2guXCIsXHJcbiAgICAgIDI6IFwiVGhlIHNlcnZlciBlbmNvdW50ZXJlZCBhbiBlcnJvciB3aGlsZSBxdWVyeWluZyB0aGUgZGF0YWJhc2UuIEVuc3VyZSB0aGF0IHlvdXIgZGF0YWJhc2Ugc2VydmVyIGlzIHJ1bm5pbmcuXCIsXHJcbiAgICAgIDM6IFwiQSB1c2VyIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIHRoaXMgZW1haWwgYWNjb3VudC5cIixcclxuICAgICAgNDogXCJUaGUgc2VydmVyIHJlamVjdGVkIGFuIGFub255bW91cyByZXF1ZXN0IGJlY2F1c2UgaXQgbWF5IGhhdmUgYmVlbiB0ZW1wZXJlZCB3aXRoIG9yIGludGVyY2VwdGVkLlwiLFxyXG4gICAgICA1OiBcIlRoZSBzdXBwbGllZCBwYXNzd29yZCBpcyBpbmNvcnJlY3QuXCIsXHJcbiAgICAgIDY6IFwiWW91ciBlbWFpbCBhY2NvdW50IGhhcyBub3QgeWV0IGJlZW4gdmVyaWZpZWQuIFBsZWFzZSBjaGVjayB5b3VyIGVtYWlsIGFuZCBjb21wbGV0ZSB0aGUgcmVnaXN0cmF0aW9uIHByb2Nlc3MuXCIsXHJcbiAgICAgIDc6IFwiVGhlIHN1cHBsaWVkIGVtYWlsIGFkZHJlc3MgaXMgaW52YWxpZC5cIixcclxuICAgICAgODogXCJUaGUgc3VwcGxpZWQgZmlyc3QgbmFtZSBpcyBpbnZhbGlkIChtdXN0IGJlIGF0IGxlYXN0IDIgY2hhcmFjdGVycyBpbiBsZW5ndGgpXCIsXHJcbiAgICAgIDk6IFwiVGhlIEhNQUMgc2VjdXJpdHkgc2lnbmF0dXJlIHN1cHBsaWVkIHdpdGggdGhpcyByZXF1ZXN0IHdhcyBiYWRseSBmb3JtZWQuXCIsXHJcbiAgICAgMTA6IFwiVGhlIHN1cHBsaWVkIGxhc3QgbmFtZSBpcyBpbnZhbGlkIChtdXN0IGJlIGF0IGxlYXN0IDIgY2hhcmFjdGVycyBpbiBsZW5ndGgpXCIsXHJcbiAgICAgMTE6IFwiVGhlIFNIQS0yNTYgaGFzaGVkIHBhc3N3b3JkIHN1cHBsaWVkIHdpdGggdGhpcyByZXF1ZXN0IHdhcyBiYWRseSBmb3JtZWQuIFRoaXMgZG9lcyBOT1QgbWVhbiB0aGF0IHlvdXIgcGFzc3dvcmQgaXMgaW52YWxpZCwgYnV0IHRoYXQgYW4gaW50ZXJuYWwgZXJyb3Igb2NjdXJyZWQuXCIsXHJcbiAgICAgMTI6IFwiVGhlIHRpbWUgc3VwcGxpZWQgd2l0aCB0aGlzIHJlcXVlc3Qgd2FzIGJhZGx5IGZvcm1lZCAobXVzdCBiZSBpbiBJU08gZm9ybWF0KVwiLFxyXG4gICAgIDEzOiBcIlRoZSB1c2VyIGhhc2ggc3VwcGxpZWQgd2l0aCB0aGlzIHJlcXVlc3Qgd2FzIGJhZGx5IGZvcm1lZC5cIixcclxuICAgICAxNDogXCJUaGUgcmVxdWVzdGVkIGFjdGlvbiByZXF1aXJlcyB0aGF0IHlvdSBiZSBsb2dnZWQgaW4gYXMgYSByZWdpc3RlcmVkIHVzZXIuXCIsXHJcbiAgICAgMTU6IFwiVGhlIHJlcXVlc3QgZmFpbGVkIGJlY2F1c2UgYSBCcmlkZ2UgU2VydmVyIGV4dGVuc2lvbiBoYXMgY2FsbGVkIGEgc2VydmljZSBtb2R1bGUgYmVmb3JlIEJyaWRnZSBjb3VsZCB2YWxpZGF0ZSB0aGUgcmVxdWVzdCAodG9vIGVhcmx5IGluIG1pZGRsZXdhcmUgY2hhaW4pLlwiLFxyXG4gICAgIDE2OiBcIlRoZSBzdXBwbGllZCBhcHBsaWNhdGlvbiBkYXRhIG9iamVjdCBjb3VsZCBub3QgYmUgcGFyc2VkIGFzIHZhbGlkIEpTT04uXCIsXHJcbiAgICAgMTc6IFwiVGhlIHVzZXIgd2l0aCB0aGUgc3VwcGxpZWQgZW1haWwgd2FzIG5vdCBmb3VuZCBpbiB0aGUgZGF0YWJhc2UuXCIsXHJcbiAgICAgMTg6IFwiQW4gdW5rbm93biBlcnJvciBvY2N1cnJlZCBpbiB0aGUgc2VydmVyLiBQbGVhc2UgY29udGFjdCB0aGUgc2VydmVyIGFkbWluaXN0cmF0b3IuXCIsXHJcbiAgICAgMTk6IFwiVGhlIHJlcXVlc3Qgc2VudCB0byB0aGUgc2VydmVyIGRpZCBub3QgY29udGFpbiB0aGUgXFxcIkJyaWRnZVxcXCIgaGVhZGVyLCBhbmQgY291bGQgbm90IGJlIGF1dGhlbnRpY2F0ZWQuXCIsXHJcbiAgICAgMjA6IFwiVGhlIEJyaWRnZSBoZWFkZXIgb2YgdGhlIHJlcXVlc3QgY291bGQgbm90IGJlIHBhcnNlZCBhcyB2YWxpZCBKU09OLlwiLFxyXG4gICAgIDIxOiBcIlRoZSByZXF1ZXN0IGNhbm5vdCBiZSBjb21wbGV0ZWQgYmVjYXVzZSB0aGlzIHVzZXIgaXMgbm90IGF1dGhvcml6ZWQgdG8gcGVyZm9ybSB0aGlzIGFjdGlvbi5cIixcclxuICAgICAyMjogXCJUaGUgcmVxdWVzdGVkIGNvbnRlbnQgY2Fubm90IGJlIGFjY2Vzc2VkIGFub255bW91c2x5LiBQbGVhc2UgbG9naW4gdG8gYSB2YWxpZCB1c2VyIGFjY291bnQuXCIsXHJcbiAgICAgMjM6IFwiVGhlIHJlcXVlc3Qgd2FzIGJhZGx5IGZvcm1lZC5cIixcclxuICAgICAyNDogXCJUaGlzIHJlcXVlc3QgbXVzdCBiZSBwZXJmb3JtZWQgYW5vbnltb3VzbHkuIFBsZWFzZSBsb2cgb3V0IGFuZCB0cnkgYWdhaW4uXCIsXHJcbiAgICAxMDE6IFwiTm8gdXNlciBpZGVudGl0eSBpcyBhdmFpbGFibGUgZm9yIGF1dGhlbnRpY2F0aW9uLiBUaGlzIGFjdGlvbiBjYW4gb25seSBiZSBjb21wbGV0ZWQgd2hlbiBsb2dnZWQgaW4uXCIsXHJcbiAgICAxMDI6IFwiVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciB3YXMgYmFkbHkgZm9ybWVkLiBFbnN1cmUgdGhhdCB5b3VyIEJyaWRnZSBDbGllbnQgYW5kIEJyaWRnZSBTZXJ2ZXIgdmVyc2lvbnMgbWF0Y2guXCIsXHJcbiAgICAxMDM6IFwiVGhlIHNlcnZlciBkaWQgbm90IHJlc3BvbmQuIENoZWNrIHlvdXIgaW50ZXJuZXQgY29ubmVjdGlvbiBhbmQgY29uZmlybSB0aGF0IHlvdXIgQnJpZGdlIFNlcnZlciBpcyBydW5uaW5nLlwiLFxyXG4gICAgMTA0OiBcIk5vIHVzZXIgaWRlbnRpdHkgd2FzIGZvdW5kIGluIHlvdXIgYnJvd3NlcidzIGxvY2FsIHN0b3JhZ2UuIEFib3J0aW5nIGF1dG9tYXRpYyBsb2dpbiBhdHRlbXB0LlwiXHJcbiAgfTtcclxuXHJcblxyXG5cclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gRlVOQ1RJT05TIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8vIFtQUklWQVRFXSBjbGVhcklkZW50aXR5KClcclxuICAvLyBTZXRzIHRoZSBjdXJyZW50IElkZW50aXR5IG9iamVjdCB0byBudWxsIHNvIGl0IGdldHMgZ2FyYmFnZSBjb2xsZWN0ZWQgYW5kIGNhbm5vdCBiZSB1c2VkXHJcbiAgLy8gdG8gdmFsaWRhdGUgcmVxdWVzdHMgZ29pbmcgZm9yd2FyZC5cclxuICB2YXIgY2xlYXJJZGVudGl0eSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICBpZGVudGl0eSA9IG51bGw7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQUklWQVRFXSBjbGVhclVzZXJcclxuICAvLyBDbGVhcnMgdGhlIGN1cnJlbnQgdXNlciBvYmplY3QgYXNzaWduZWQgdG8gdGhlIEJyaWRnZS5cclxuICB2YXIgY2xlYXJVc2VyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIC8vIFNldCB0aGUgdXNlciBhbmQgYWRkaXRpb25hbCBkYXRhIG9iamVjdHMgdG8gbnVsbFxyXG4gICAgc2VsZi51c2VyID0gbnVsbDtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIGhhc0lkZW50aXR5KClcclxuICAvLyBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IGFuIHRoZSBJZGVudGl0eSBvYmplY3QgaXMgY3VycmVudGx5IGFzc2lnbmVkLlxyXG4gIHZhciBoYXNJZGVudGl0eSA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICByZXR1cm4gKCBpZGVudGl0eSAhPT0gbnVsbCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVzb2x2ZSgpXHJcbiAgLy8gVGhlIGdlbmVyaWMgaGFuZGxlciBmb3IgYWxsIEJyaWRnZSBwcm9taXNlIHJlc29sdXRpb25zLlxyXG4gIHZhciByZXNvbHZlID0gZnVuY3Rpb24gKCBuYW1lLCBkZWZlcnJlZCwgZGF0YSApIHtcclxuXHJcbiAgICAvLyBMb2cgdGhlIHN1Y2Nlc3MgdG8gdGhlIGNvbnNvbGUuXHJcbiAgICBpZiAoIHNlbGYuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IFwiICsgbmFtZSArIFwiIHwgXCIgKyBKU09OLnN0cmluZ2lmeSggZGF0YSApICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmVzb2x2ZSB0aGUgZGVmZXJyZWQuXHJcbiAgICBkZWZlcnJlZC5yZXNvbHZlKCBkYXRhICk7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQUklWQVRFXSByZWplY3QoKVxyXG4gIC8vIFRoZSBnZW5lcmljIGhhbmRsZXIgZm9yIGFsbCBCcmlkZ2UgcHJvbWlzZSByZWplY3Rpb25zLlxyXG4gIHZhciByZWplY3QgPSBmdW5jdGlvbiAoIG5hbWUsIGRlZmVycmVkLCBkYXRhLCBsb2dMZXZlbCApIHtcclxuXHJcbiAgICAvLyBMb2cgdGhlIGVycm9yIHRvIHRoZSBjb25zb2xlLlxyXG4gICAgaWYgKCBzZWxmLmRlYnVnID09PSB0cnVlICkge1xyXG5cclxuICAgICAgLy8gQXNzZW1ibGUgdGhlIHN0cmluZyB0byBvdXRwdXQgdG8gdGhlIGNvbnNvbGVcclxuICAgICAgdmFyIHByaW50U3RyID0gXCJCUklER0UgfCBcIiArIG5hbWUgKyBcIiB8IFwiICsgZGF0YS5zdGF0dXMgKyBcIiA+PiBDb2RlIFwiICsgZGF0YS5lcnJvckNvZGUgK1xyXG4gICAgICAgIFwiOiBcIiArIHNlbGYuZGVjb2RlRXJyb3IoIGRhdGEuZXJyb3JDb2RlICk7XHJcblxyXG4gICAgICAvLyBDaG9vc2UgdGhlIGxvZyBsZXZlbCB0byBvdXRwdXQgdGhpcyBhcyAoRVJST1IgaWYgbm9uZSBvciB1bmtub3duIHZhbHVlKS5cclxuICAgICAgc3dpdGNoICggbG9nTGV2ZWwgKSB7XHJcbiAgICAgICAgY2FzZSBMT0dfTEVWRUxfREVCVUc6XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyggcHJpbnRTdHIgKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgTE9HX0xFVkVMX1dBUk5JTkc6XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oIHByaW50U3RyICk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgY29uc29sZS5lcnJvciggcHJpbnRTdHIgKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmVqZWN0IHRoZSBkZWZlcnJlZC5cclxuICAgIGRlZmVycmVkLnJlamVjdCggZGF0YSApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdFByaXZhdGUoKVxyXG4gIC8vIFRoaXMgZnVuY3Rpb24gcHJvdmlkZXMgdGhlIGJhc2ljIGZ1bmN0aW9uYWxpdHkgdXNlZCBieSBhbGwgb2YgdGhlIEJyaWRnZSBDbGllbnQncyBpbnRlcm5hbFxyXG4gIC8vIHJlcXVlc3QgZnVuY3Rpb24gY2FsbHMuIEl0IHBlcmZvcm1zIGFuIFhIUiByZXF1ZXN0IHRvIHRoZSBBUEkgc2VydmVyIGF0IHRoZSBzcGVjaWZpZWQgcmVzb3VyY2VcclxuICAvLyBhbmQgcmV0dXJuIGEgalF1ZXJ5IERlZmVycmVkIG9iamVjdCAuIElmIHRoaXMgcmV0dXJucyBudWxsLCB0aGUgcmVxdWVzdCBjb3VsZCBub3QgYmUgc2VudFxyXG4gIC8vIGJlY2F1c2Ugbm8gdXNlciBjcmVkZW50aWFscyB3ZXJlIGF2YWlsYWJsZSB0byBzaWduIHRoZSByZXF1ZXN0LlxyXG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgcmVzcG9uc2libGUgZm9yIGhhbmRsaW5nIGFsbCBnZW5lcmljIEJyaWRnZSBlcnJvcnMuXHJcbiAgdmFyIHJlcXVlc3RQcml2YXRlID0gZnVuY3Rpb24gKCBtZXRob2QsIHJlc291cmNlLCBwYXlsb2FkLCB0ZW1wSWRlbnRpdHkgKSB7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgb2JqZWN0IHRvIHByb3ZpZGUgYSBjb252ZW5pZW50IHdheSBmb3IgdGhlIGNhbGxlciB0byBoYW5kbGUgc3VjY2VzcyBhbmRcclxuICAgIC8vIGZhaWx1cmUuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcblxyXG4gICAgLy8gSWYgYSB0ZW1wb3JhcnkgaWRlbnRpdHkgd2FzIHByb3ZpZGVkLCB1c2UgaXQgKGV2ZW4gaWYgYW4gaWRlbnRpdHkgaXMgc2V0IGluIEJyaWRnZSkuXHJcbiAgICB2YXIgcmVxdWVzdElkZW50aXR5ID0gbnVsbDtcclxuICAgIGlmICggdGVtcElkZW50aXR5ICE9PSBudWxsICYmIHR5cGVvZiB0ZW1wSWRlbnRpdHkgIT09ICd1bmRlZmluZWQnICkge1xyXG4gICAgICByZXF1ZXN0SWRlbnRpdHkgPSB0ZW1wSWRlbnRpdHk7XHJcbiAgICB9XHJcbiAgICAvLyBJZiBhbiBpZGVudGl0eSBpcyBzZXQgaW4gQnJpZGdlLCB1c2UgaXQuXHJcbiAgICBlbHNlIGlmICggaGFzSWRlbnRpdHkoKSA9PT0gdHJ1ZSApIHtcclxuICAgICAgcmVxdWVzdElkZW50aXR5ID0gaWRlbnRpdHk7XHJcbiAgICB9XHJcbiAgICAvLyBObyBpZGVudGl0eSBpcyBhdmFpbGFibGUuIFRoZSByZXF1ZXN0IGNhbid0IGJlIHNlbnQuXHJcbiAgICBlbHNlIHtcclxuICAgICAgcmVqZWN0KCBcIlJlcXVlc3RcIiwgZGVmZXJyZWQsIHtcclxuICAgICAgICBzdGF0dXM6IDIwMCxcclxuICAgICAgICBlcnJvckNvZGU6IEVSUk9SX0NPREVfTlVMTF9JREVOVElUWVxyXG4gICAgICB9ICk7XHJcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBhbmQgc2lnbiB0aGUgcmVxdWVzdCBoZWFkZXIgdG8gYXR0YWNoIHRvIHRoZSBYSFIgcmVxdWVzdC5cclxuICAgIHZhciBzaWduZWRIZWFkZXIgPSByZXF1ZXN0SWRlbnRpdHkuY3JlYXRlSGVhZGVyKCBwYXlsb2FkICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgc2VsZi5jcmVhdGVSZXF1ZXN0KCBtZXRob2QsIHNlbGYuYmFzZVVybCArIHJlc291cmNlLCBzaWduZWRIZWFkZXIgKVxyXG4gICAgICAudGhlbiggZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgICAvLyBJZiB0aGUgcmVzQm9keSBpc24ndCBhbiBvYmplY3QsIGZhaWwgcmlnaHQgbm93LlxyXG4gICAgICAgIGlmICggdHlwZW9mIGRhdGEgIT09ICdvYmplY3QnICkge1xyXG4gICAgICAgICAgcmVqZWN0KCBcIlJlcXVlc3RcIiwgZGVmZXJyZWQsIHtcclxuICAgICAgICAgICAgc3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICAgIGVycm9yQ29kZTogRVJST1JfQ09ERV9OVUxMX0lERU5USVRZXHJcbiAgICAgICAgICB9ICk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBOb3RpZnkgdGhlIHVzZXIgb2YgdGhlIHJlcXVlc3QgYWJvdXQgdG8gYmUgc2VudC5cclxuICAgICAgICBpZiAoIHR5cGVvZiBzZWxmLm9uUmVxdWVzdENhbGxlZCA9PT0gXCJmdW5jdGlvblwiICkge1xyXG4gICAgICAgICAgc2VsZi5vblJlcXVlc3RDYWxsZWQoIG1ldGhvZCwgcmVzb3VyY2UsIHNpZ25lZEhlYWRlciApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVzb2x2ZSB0aGUgZGVmZXJyZWQuXHJcbiAgICAgICAgcmVzb2x2ZSggXCJSZXF1ZXN0XCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgICB9LFxyXG4gICAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAgIC8vIFJlamVjdCB0aGUgZGVmZXJyZWQuXHJcbiAgICAgICAgcmVqZWN0KCBcIlJlcXVlc3RcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICAgIH0gKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIHByb21pc2Ugb2JqZWN0IHRvIHRoZSBjYWxsZXIuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIHJlcXVlc3RDaGFuZ2VQYXNzd29yZFByaXZhdGUoKVxyXG4gIC8vIEFzayB0aGUgc2VydmVyIHRvIGNoYW5nZSB0aGUgcGFzc3dvcmQgb2YgdGhlIGN1cnJlbnRseSBsb2dnZWQtaW4gdXNlci4gVGhpcyBvcGVyYXRpb24gcmVxdWlyZXNcclxuICAvLyB0aGUgdXNlcidzIGN1cnJlbnQgcGFzc3dvcmQgdG8gYmUgc3VwcGxpZWQgYW5kIGNyZWF0ZXMgYSB0ZW1wb3JhcnkgSWRlbnRpdHkgb2JqZWN0IHRvIHNlbmQgdGhlXHJcbiAgLy8gcmVxdWVzdCBmb3IgYSBwYXNzd29yZCBjaGFuZ2UgdG8gdmVyaWZ5IHRoYXQgYW5vdGhlciBpbmRpdmlkdWFsIGRpZG4ndCBqdXN0IGhvcCBvbnRvIGEgbG9nZ2VkLVxyXG4gIC8vIGluIGNvbXB1dGVyIGFuZCBjaGFuZ2UgYSB1c2VyJ3MgcGFzc3dvcmQgd2hpbGUgdGhleSB3ZXJlIGF3YXkgZnJvbSB0aGVpciBjb21wdXRlci5cclxuICB2YXIgcmVxdWVzdENoYW5nZVBhc3N3b3JkUHJpdmF0ZSA9IGZ1bmN0aW9uICggb2xkUGFzc3dvcmQsIG5ld1Bhc3N3b3JkICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgY2hhbmdlUGFzc3dvcmQgY2FsbCBvY2N1cnJpbmcuXHJcbiAgICBpZiAoIHR5cGVvZiBzZWxmLm9uRkNoYW5nZVBhc3N3b3JkID09PSBcImZ1bmN0aW9uXCIgKSB7XHJcbiAgICAgIHNlbGYub25DaGFuZ2VQYXNzd29yZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byByZXR1cm4gc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgc3VjY2Vzcy9mYWlsdXJlIGNvbnZlbmllbnRseS5cclxuICAgIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuXHJcbiAgICAvLyBDaGVjayBpcyB0aGUgdXNlciBpcyBsb2dnZWQgaW4gYmVmb3JlIGF0dGVtcHRpbmcgdG8gY2hhbmdlIHRoZWlyIHBhc3N3b3JkLlxyXG4gICAgaWYgKCAhc2VsZi5pc0xvZ2dlZEluKCkgKSB7XHJcbiAgICAgIHJlamVjdCggXCJDaGFuZ2UgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIHtcclxuICAgICAgICBzdGF0dXM6IDIwMCxcclxuICAgICAgICBlcnJvckNvZGU6IEVSUk9SX0NPREVfTlVMTF9JREVOVElUWVxyXG4gICAgICB9ICk7XHJcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEhhc2ggdGhlIHVzZXIncyBwYXNzd29yZHMuXHJcbiAgICB2YXIgb2xkSGFzaGVkUGFzc3dvcmQgPSBDcnlwdG9TaGEyNTYoIG9sZFBhc3N3b3JkIClcclxuICAgICAgLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKTtcclxuICAgIHZhciBuZXdIYXNoZWRQYXNzd29yZCA9IENyeXB0b1NoYTI1NiggbmV3UGFzc3dvcmQgKVxyXG4gICAgICAudG9TdHJpbmcoIENyeXB0b0VuY0hleCApO1xyXG5cclxuICAgIC8vIENsZWFyIHRoZSB1bmVuY3J5cHRlZCBwYXNzd29yZHMgZnJvbSBtZW1vcnkuXHJcbiAgICBvbGRQYXNzd29yZCA9IG51bGw7XHJcbiAgICBuZXdQYXNzd29yZCA9IG51bGw7XHJcblxyXG4gICAgLy8gQnVpbGQgdGhlIHBheWxvYWQgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdC5cclxuICAgIHZhciBwYXlsb2FkID0ge1xyXG4gICAgICBcImFwcERhdGFcIjoge30sXHJcbiAgICAgIFwiZW1haWxcIjogJycsXHJcbiAgICAgIFwiZmlyc3ROYW1lXCI6ICcnLFxyXG4gICAgICBcImxhc3ROYW1lXCI6ICcnLFxyXG4gICAgICBcInBhc3N3b3JkXCI6IG5ld0hhc2hlZFBhc3N3b3JkXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSBhIHRlbXBvcmFyeSBJZGVudGl0eSBvYmplY3Qgd2l0aCB0aGUgdXNlcidzIGNyZWRlbnRpYWxzLCB1c2luZyB0aGUgcGFzc3dvcmRcclxuICAgIC8vIHJlY2VpdmVkIGFzIGEgcGFyYW1ldGVyIHRvIGRvdWJsZS1jb25maXJtIHRoZSB1c2VyJ3MgaWRlbnRpdHkgaW1tZWRpYXRlbHkgYmVmb3JlIHRoZXlcclxuICAgIC8vIGNoYW5nZSB0aGVpciBhY2NvdW50IHBhc3N3b3JkLlxyXG4gICAgdmFyIHRlbXBJZGVudGl0eSA9IG5ldyBJZGVudGl0eSggaWRlbnRpdHkuZW1haWwsIG9sZEhhc2hlZFBhc3N3b3JkLCB0cnVlICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdFByaXZhdGUoICdQVVQnLCAndXNlcnMnLCBwYXlsb2FkLCB0ZW1wSWRlbnRpdHkgKVxyXG4gICAgICAudGhlbiggZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgICAgIC8vIENoZWNrIHRoYXQgdGhlIGNvbnRlbnQgdHlwZSAoTWVzc2FnZSkgaXMgZm9ybWF0dGVkIGNvcnJlY3RseS5cclxuICAgICAgICAgIGlmICggdHlwZW9mIGRhdGEuY29udGVudC5tZXNzYWdlICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICAgICAgcmVqZWN0KCBcIkNoYW5nZSBQYXNzd29yZFwiLCBkZWZlcnJlZCwge1xyXG4gICAgICAgICAgICAgIHN0YXR1czogMjAwLFxyXG4gICAgICAgICAgICAgIGVycm9yQ29kZTogRVJST1JfQ09ERV9NQUxGT1JNRURfUkVTUE9OU0VcclxuICAgICAgICAgICAgfSApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gU2V0IEJyaWRnZSdzIGlkZW50aXR5IG9iamVjdCB1c2luZyB0aGUgbmV3IHBhc3N3b3JkLCBzaW5jZSBmdXR1cmUgcmVxdWVzdHMgd2lsbCBuZWVkIHRvXHJcbiAgICAgICAgICAvLyBiZSBzaWduZWQgd2l0aCB0aGUgbmV3IHVzZXIgY3JlZGVudGlhbHMuXHJcbiAgICAgICAgICBzZXRJZGVudGl0eSggaWRlbnRpdHkuZW1haWwsIG5ld0hhc2hlZFBhc3N3b3JkLCB0cnVlICk7XHJcblxyXG4gICAgICAgICAgLy8gUmVzb2x2ZSB0aGUgZGVmZXJyZWQuXHJcbiAgICAgICAgICByZXNvbHZlKCBcIkNoYW5nZSBQYXNzd29yZFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgICAvLyBSZWplY3QgdGhlIGRlZmVycmVkLlxyXG4gICAgICAgICAgcmVqZWN0KCBcIkNoYW5nZSBQYXNzd29yZFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdEZvcmdvdFBhc3N3b3JkUHJpdmF0ZSgpXHJcbiAgLy8gQXNrIHRoZSBzZXJ2ZXIgdG8gc2V0IHRoZSB1c2VyIGludG8gcmVjb3Zlcnkgc3RhdGUgZm9yIGEgc2hvcnQgcGVyaW9kIG9mIHRpbWUgYW5kIHNlbmQgYW5cclxuICAvLyBhY2NvdW50IHJlY292ZXJ5IGVtYWlsIHRvIHRoZSBlbWFpbCBhY2NvdW50IHByb3ZpZGVkIGhlcmUsIGFzIGxvbmcgYXMgaXQgaWRlbnRpZmllcyBhIHVzZXJcclxuICAvLyBpbiB0aGUgZGF0YWJhc2UuXHJcbiAgdmFyIHJlcXVlc3RGb3Jnb3RQYXNzd29yZFByaXZhdGUgPSBmdW5jdGlvbiAoIGVtYWlsICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgZm9yZ290UGFzc3dvcmQgY2FsbCBvY2N1cnJpbmcuXHJcbiAgICBpZiAoIHR5cGVvZiBzZWxmLm9uRm9yZ290UGFzc3dvcmQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vbkZvcmdvdFBhc3N3b3JkKCBlbWFpbCApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byByZXR1cm4gc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgc3VjY2Vzcy9mYWlsdXJlIGNvbnZlbmllbnRseS5cclxuICAgIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuXHJcbiAgICAvLyBCdWlsZCB0aGUgcGF5bG9hZCBvYmplY3QgdG8gc2VuZCB3aXRoIHRoZSByZXF1ZXN0XHJcbiAgICB2YXIgcGF5bG9hZCA9IHtcclxuICAgICAgXCJtZXNzYWdlXCI6IGVtYWlsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBJZGVudGl0eSBvYmplY3Qgd2l0aCBhIGJsYW5rIHBhc3N3b3JkLlxyXG4gICAgdmFyIHRlbXBJZGVudGl0eSA9IG5ldyBJZGVudGl0eSggJycsICcnLCB0cnVlICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdFByaXZhdGUoICdQVVQnLCAnZm9yZ290LXBhc3N3b3JkJywgcGF5bG9hZCwgdGVtcElkZW50aXR5IClcclxuICAgICAgLnRoZW4oIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgICAvLyBDaGVjayB0aGF0IHRoZSBjb250ZW50IHR5cGUgKE1lc3NhZ2UpIGlzIGZvcm1hdHRlZCBjb3JyZWN0bHkuXHJcbiAgICAgICAgICBpZiAoIHR5cGVvZiBkYXRhLmNvbnRlbnQubWVzc2FnZSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICAgIHJlamVjdCggXCJGb3Jnb3QgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIHtcclxuICAgICAgICAgICAgICBzdGF0dXM6IDIwMCxcclxuICAgICAgICAgICAgICBlcnJvckNvZGU6IEVSUk9SX0NPREVfTUFMRk9STUVEX1JFU1BPTlNFXHJcbiAgICAgICAgICAgIH0gKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFJlc29sdmUgdGhlIGRlZmVycmVkLlxyXG4gICAgICAgICAgcmVzb2x2ZSggXCJGb3Jnb3QgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAgICAgLy8gUmVqZWN0IHRoZSBkZWZlcnJlZC5cclxuICAgICAgICAgIHJlamVjdCggXCJGb3Jnb3QgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGRlZmVycmVkIG9iamVjdCBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBlcnJvcnMgYXMgdGhleSBjaG9vc2UuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIHJlcXVlc3RMb2dpblByaXZhdGUoKVxyXG4gIC8vIExvZyBpbiBhIHVzZXIgd2l0aCB0aGUgZ2l2ZW4gZW1haWwvcGFzc3dvcmQgcGFpci4gVGhpcyBjcmVhdGVzIGEgbmV3IElkZW50aXR5IG9iamVjdFxyXG4gIC8vIHRvIHNpZ24gcmVxdWVzdHMgZm9yIGF1dGhlbnRpY2F0aW9uIGFuZCBwZXJmb3JtcyBhbiBpbml0aWFsIHJlcXVlc3QgdG8gdGhlIHNlcnZlciB0b1xyXG4gIC8vIHNlbmQgYSBsb2dpbiBwYWNrYWdlLlxyXG4gIHZhciByZXF1ZXN0TG9naW5Qcml2YXRlID0gZnVuY3Rpb24gKCBlbWFpbCwgcGFzc3dvcmQsIHVzZUxvY2FsU3RvcmFnZSwgZG9udEhhc2hQYXNzd29yZCApIHtcclxuXHJcbiAgICAvLyBOb3RpZnkgdGhlIHVzZXIgb2YgdGhlIGxvZ2luIGNhbGwgb2NjdXJyaW5nLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vbkxvZ2luQ2FsbGVkID09PSBcImZ1bmN0aW9uXCIgKSB7XHJcbiAgICAgIHNlbGYub25Mb2dpbkNhbGxlZCggZW1haWwsIHVzZUxvY2FsU3RvcmFnZSApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEhhc2ggdGhlIHVzZXIncyBwYXNzd29yZFxyXG4gICAgdmFyIGhhc2hlZFBhc3N3b3JkID0gKCBkb250SGFzaFBhc3N3b3JkID09PSB0cnVlICkgPyBwYXNzd29yZCA6XHJcbiAgICAgIENyeXB0b1NoYTI1NiggcGFzc3dvcmQgKVxyXG4gICAgICAudG9TdHJpbmcoIENyeXB0b0VuY0hleCApO1xyXG5cclxuICAgIC8vIENsZWFyIHRoZSB1bmVuY3J5cHRlZCBwYXNzd29yZCBmcm9tIG1lbW9yeVxyXG4gICAgcGFzc3dvcmQgPSBudWxsO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIGRlZmVycmVkIG9iamVjdCB0byByZXR1cm4gc28gdGhlIGVuZC11c2VyIGNhbiBoYW5kbGUgc3VjY2Vzcy9mYWlsdXJlIGNvbnZlbmllbnRseS5cclxuICAgIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuXHJcbiAgICAvLyBUaGlzIHJlcXVlc3QgdXNlcyBhbiBlbXB0eSBwYXlsb2FkXHJcbiAgICB2YXIgcGF5bG9hZCA9IHt9O1xyXG5cclxuICAgIC8vIFNldCB3aGV0aGVyIG9yIG5vdCB0aGUgQnJpZGdlIHNob3VsZCBzdG9yZSB1c2VyIGNyZWRlbnRpYWxzIGFuZCBCcmlkZ2UgY29uZmlndXJhdGlvblxyXG4gICAgLy8gdG8gbG9jYWwgc3RvcmFnZS5cclxuICAgIHNlbGYudXNlTG9jYWxTdG9yYWdlID0gdXNlTG9jYWxTdG9yYWdlO1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSBhbiBJZGVudGl0eSBvYmplY3Qgd2l0aCB0aGUgdXNlcidzIGNyZWRlbnRpYWxzLlxyXG4gICAgc2V0SWRlbnRpdHkoIGVtYWlsLCBoYXNoZWRQYXNzd29yZCwgdHJ1ZSApO1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3RQcml2YXRlKCAnR0VUJywgJ2xvZ2luJywgcGF5bG9hZCApXHJcbiAgICAgIC50aGVuKCBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgY29udGVudCB0eXBlIChMb2dpbiBQYWNrYWdlKSBpcyBmb3JtYXR0ZWQgY29ycmVjdGx5LlxyXG4gICAgICAgICAgaWYgKCB0eXBlb2YgZGF0YS5jb250ZW50LnVzZXIgIT09ICdvYmplY3QnICkge1xyXG4gICAgICAgICAgICByZWplY3QoIFwiTG9naW5cIiwgZGVmZXJyZWQsIHtcclxuICAgICAgICAgICAgICBzdGF0dXM6IDIwMCxcclxuICAgICAgICAgICAgICBlcnJvckNvZGU6IEVSUk9SX0NPREVfTUFMRk9STUVEX1JFU1BPTlNFXHJcbiAgICAgICAgICAgIH0gKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFNldCB0aGUgdXNlciBvYmplY3QgdXNpbmcgdGhlIHVzZXIgZGF0YSB0aGF0IHdhcyByZXR1cm5lZFxyXG4gICAgICAgICAgc2V0VXNlciggZGF0YS5jb250ZW50LnVzZXIgKTtcclxuXHJcbiAgICAgICAgICAvLyBTdG9yZSB0aGlzIGlkZW50aXR5IHRvIGxvY2FsIHN0b3JhZ2UsIGlmIHRoYXQgd2FzIHJlcXVlc3RlZC5cclxuICAgICAgICAgIC8vIFtTRUNVUklUWSBOT1RFIDFdIHVzZUxvY2FsU3RvcmFnZSBzaG91bGQgYmUgc2V0IGJhc2VkIG9uIHVzZXIgaW5wdXQsIGJ5IGFza2luZyB3aGV0aGVyXHJcbiAgICAgICAgICAvLyB0aGUgdXNlciBpcyBvbiBhIHByaXZhdGUgY29tcHV0ZXIgb3Igbm90LiBUaGlzIGlzIGNhbiBiZSBjb25zaWRlcmVkIGEgdG9sZXJhYmxlXHJcbiAgICAgICAgICAvLyBzZWN1cml0eSByaXNrIGFzIGxvbmcgYXMgdGhlIHVzZXIgaXMgb24gYSBwcml2YXRlIGNvbXB1dGVyIHRoYXQgdGhleSB0cnVzdCBvciBtYW5hZ2VcclxuICAgICAgICAgIC8vIHRoZW1zZWx2ZXMuIEhvd2V2ZXIsIG9uIGEgcHVibGljIG1hY2hpbmUgdGhpcyBpcyBwcm9iYWJseSBhIHNlY3VyaXR5IHJpc2ssIGFuZCB0aGVcclxuICAgICAgICAgIC8vIHVzZXIgc2hvdWxkIGJlIGFibGUgdG8gZGVjbGluZSB0aGlzIGNvbnZlbmllbmNlIGluIGZhdm91ciBvZiBzZWN1cml0eSwgcmVnYXJkbGVzc1xyXG4gICAgICAgICAgLy8gb2Ygd2hldGhlciB0aGV5IGFyZSBvbiBhIHB1YmxpYyBtYWNoaW5lIG9yIG5vdC5cclxuICAgICAgICAgIGlmICggc2VsZi51c2VMb2NhbFN0b3JhZ2UgKSB7XHJcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCAnYnJpZGdlLWNsaWVudC1pZGVudGl0eScsIEpTT04uc3RyaW5naWZ5KCB7XHJcbiAgICAgICAgICAgICAgJ3R0bCc6IDg2NDAwMDAwLCAvLyBFeHBpcmUgaW4gMSBkYXlcclxuICAgICAgICAgICAgICAnbm93JzogbmV3IERhdGUoKSwgLy8gRnJvbSBub3dcclxuICAgICAgICAgICAgICAndmFsdWUnOiB7IC8vIFN0b3JlIHRoaXMgZGF0YVxyXG4gICAgICAgICAgICAgICAgXCJlbWFpbFwiOiBlbWFpbCxcclxuICAgICAgICAgICAgICAgIFwicGFzc3dvcmRcIjogaGFzaGVkUGFzc3dvcmRcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gKSApO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFJlc29sdmUgdGhlIGRlZmVycmVkLlxyXG4gICAgICAgICAgcmVzb2x2ZSggXCJMb2dpblwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgICAvLyBDbGVhciB0aGUgdXNlciBjcmVkZW50aWFscywgc2luY2UgdGhleSBkaWRuJ3Qgd29yayBhbnl3YXkuXHJcbiAgICAgICAgICBjbGVhclVzZXIoKTtcclxuXHJcbiAgICAgICAgICAvLyBIYW5kbGUgdGhlIGZhaWx1cmVcclxuICAgICAgICAgIHJlamVjdCggXCJMb2dpblwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdFJlY292ZXJQYXNzd29yZFByaXZhdGUoKVxyXG4gIC8vIFRvIGJlIGNhbGxlZCBieSB0aGUgcGFnZSBhdCB0aGUgYWRkcmVzcyB3aGljaCBhbiBhY2NvdW50IHJlY292ZXJ5IGVtYWlsIGxpbmtzIHRoZSB1c2VyXHJcbiAgLy8gdG8uIFRoZXkgd2lsbCBoYXZlIGVudGVyZWQgdGhlaXIgbmV3IHBhc3N3b3JkIHRvIGFuIGlucHV0IGZpZWxkLCBhbmQgdGhlIGVtYWlsIGFuZCBoYXNoIHdpbGxcclxuICAvLyBoYXZlIGJlZW4gbWFkZSBhdmFpbGFibGUgdG8gdGhlIHBhZ2UgaW4gdGhlIHF1ZXJ5IHN0cmluZyBvZiB0aGUgVVJMLlxyXG4gIHZhciByZXF1ZXN0UmVjb3ZlclBhc3N3b3JkUHJpdmF0ZSA9IGZ1bmN0aW9uICggcGFzc3dvcmQsIGhhc2ggKSB7XHJcblxyXG4gICAgLy8gTm90aWZ5IHRoZSB1c2VyIG9mIHRoZSByZWNvdmVyIHBhc3N3b3JkIGNhbGwgb2NjdXJyaW5nLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vblJlY292ZXJQYXNzd29yZENhbGxlZCA9PT0gXCJmdW5jdGlvblwiICkge1xyXG4gICAgICBzZWxmLm9uUmVjb3ZlclBhc3N3b3JkQ2FsbGVkKCBoYXNoICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSGFzaCB0aGUgdXNlcidzIHBhc3N3b3JkXHJcbiAgICB2YXIgaGFzaGVkUGFzc3dvcmQgPSBDcnlwdG9TaGEyNTYoIHBhc3N3b3JkIClcclxuICAgICAgLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKTtcclxuXHJcbiAgICAvLyBDbGVhciB0aGUgdW5lbmNyeXB0ZWQgcGFzc3dvcmQgZnJvbSBtZW1vcnlcclxuICAgIHBhc3N3b3JkID0gbnVsbDtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBkZWZlcnJlZCBvYmplY3QgdG8gcmV0dXJuIHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIHN1Y2Nlc3MvZmFpbHVyZSBjb252ZW5pZW50bHkuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcblxyXG4gICAgLy8gQnVpbGQgdGhlIHBheWxvYWQgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdFxyXG4gICAgdmFyIHBheWxvYWQgPSB7XHJcbiAgICAgIFwiaGFzaFwiOiBoYXNoLFxyXG4gICAgICBcIm1lc3NhZ2VcIjogaGFzaGVkUGFzc3dvcmRcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgdGVtcG9yYXJ5IGFuIElkZW50aXR5IG9iamVjdCB3aXRoIGEgYmxhbmsgcGFzc3dvcmQuXHJcbiAgICB2YXIgdGVtcElkZW50aXR5ID0gbmV3IElkZW50aXR5KCAnJywgJycsIHRydWUgKTtcclxuXHJcbiAgICAvLyBTZW5kIHRoZSByZXF1ZXN0XHJcbiAgICByZXF1ZXN0UHJpdmF0ZSggJ1BVVCcsICdyZWNvdmVyLXBhc3N3b3JkJywgcGF5bG9hZCwgdGVtcElkZW50aXR5IClcclxuICAgICAgLnRoZW4oIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgICAvLyBDaGVjayB0aGF0IHRoZSBjb250ZW50IHR5cGUgKE1lc3NhZ2UpIGlzIGZvcm1hdHRlZCBjb3JyZWN0bHkuXHJcbiAgICAgICAgICBpZiAoIHR5cGVvZiBkYXRhLmNvbnRlbnQubWVzc2FnZSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICAgIHJlamVjdCggXCJSZWNvdmVyIFBhc3N3b3JkXCIsIGRlZmVycmVkLCB7XHJcbiAgICAgICAgICAgICAgc3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICAgICAgZXJyb3JDb2RlOiBFUlJPUl9DT0RFX01BTEZPUk1FRF9SRVNQT05TRVxyXG4gICAgICAgICAgICB9ICk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBSZXNvbHZlIHRoZSBkZWZlcnJlZC5cclxuICAgICAgICAgIHJlc29sdmUoIFwiUmVjb3ZlciBQYXNzd29yZFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgICAvLyBSZWplY3QgdGhlIGRlZmVycmVkLlxyXG4gICAgICAgICAgcmVqZWN0KCBcIlJlY292ZXIgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICAgICAgfSApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdFJlZ2lzdGVyUHJpdmF0ZSgpXHJcbiAgLy8gUmVnaXN0ZXIgaW4gYSB1c2VyIHdpdGggdGhlIGdpdmVuIGVtYWlsL3Bhc3N3b3JkIHBhaXIsIG5hbWUsIGFuZCBhcHBsaWNhdGlvbi1zcGVjaWZpYyBkYXRhLlxyXG4gIC8vIFRoaXMgZG9lcyBjcmVhdGVzIGFuIElkZW50aXR5IG9iamVjdCBmb3IgdGhlIHVzZXIgdG8gc2lnbiB0aGUgcmVnaXN0cmF0aW9uIHJlcXVlc3QncyBITUFDLFxyXG4gIC8vIGhvd2V2ZXIgdGhlIHBhc3N3b3JkIGlzIHRyYW5zbWl0dGVkIGluIHRoZSBjb250ZW50IG9mIHRoZSBtZXNzYWdlIChTSEEtMjU2IGVuY3J5cHRlZCksIHNvXHJcbiAgLy8gdGhlb3JldGljYWxseSBhbiBpbnRlcmNlcHRvciBvZiB0aGlzIG1lc3NhZ2UgY291bGQgcmVjb25zdHJ1Y3QgdGhlIEhNQUMgYW5kIGZhbHNpZnkgYSByZXF1ZXN0XHJcbiAgLy8gdG8gdGhlIHNlcnZlciB0aGUgcmVxdWVzdCBpcyBtYWRlIHdpdGhvdXQgdXNpbmcgSFRUUFMgcHJvdG9jb2wgYW5kIGdpdmVuIGVub3VnaCBwZXJzaXN0ZW5jZVxyXG4gIC8vIG9uIHRoZSBwYXJ0IG9mIHRoZSBhdHRhY2tlci5cclxuICB2YXIgcmVxdWVzdFJlZ2lzdGVyUHJpdmF0ZSA9IGZ1bmN0aW9uICggZW1haWwsIHBhc3N3b3JkLCBmaXJzdE5hbWUsIGxhc3ROYW1lLCBhcHBEYXRhICkge1xyXG5cclxuICAgIC8vIE5vdGlmeSB0aGUgdXNlciBvZiB0aGUgcmVnaXN0ZXIgY2FsbCBvY2N1cnJpbmcuXHJcbiAgICBpZiAoIHR5cGVvZiBzZWxmLm9uUmVnaXN0ZXJDYWxsZWQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vblJlZ2lzdGVyQ2FsbGVkKCBlbWFpbCwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgYXBwRGF0YSApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEhhc2ggdGhlIHVzZXIncyBwYXNzd29yZFxyXG4gICAgdmFyIGhhc2hlZFBhc3N3b3JkID0gQ3J5cHRvU2hhMjU2KCBwYXNzd29yZCApXHJcbiAgICAgIC50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICk7XHJcblxyXG4gICAgLy8gQ2xlYXIgdGhlIHVuZW5jcnlwdGVkIHBhc3N3b3JkIGZyb20gbWVtb3J5XHJcbiAgICBwYXNzd29yZCA9IG51bGw7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgb2JqZWN0IHRvIHJldHVybiBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBzdWNjZXNzL2ZhaWx1cmUgY29udmVuaWVudGx5LlxyXG4gICAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG5cclxuICAgIC8vIEJ1aWxkIHRoZSBwYXlsb2FkIG9iamVjdCB0byBzZW5kIHdpdGggdGhlIHJlcXVlc3RcclxuICAgIHZhciBwYXlsb2FkID0ge1xyXG4gICAgICBcImFwcERhdGFcIjogYXBwRGF0YSxcclxuICAgICAgXCJlbWFpbFwiOiBlbWFpbCxcclxuICAgICAgXCJmaXJzdE5hbWVcIjogZmlyc3ROYW1lLFxyXG4gICAgICBcImxhc3ROYW1lXCI6IGxhc3ROYW1lLFxyXG4gICAgICBcInBhc3N3b3JkXCI6IGhhc2hlZFBhc3N3b3JkXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENyZWF0ZSBhIHRlbXBvcmFyeSBhbiBJZGVudGl0eSBvYmplY3Qgd2l0aCBhIGJsYW5rIHBhc3N3b3JkLlxyXG4gICAgdmFyIHRlbXBJZGVudGl0eSA9IG5ldyBJZGVudGl0eSggJycsICcnLCB0cnVlICk7XHJcblxyXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxyXG4gICAgcmVxdWVzdFByaXZhdGUoICdQT1NUJywgJ3VzZXJzJywgcGF5bG9hZCwgdGVtcElkZW50aXR5IClcclxuICAgICAgLnRoZW4oIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgICAvLyBDaGVjayB0aGF0IHRoZSBjb250ZW50IHR5cGUgKE1lc3NhZ2UpIGlzIGZvcm1hdHRlZCBjb3JyZWN0bHkuXHJcbiAgICAgICAgICBpZiAoIHR5cGVvZiBkYXRhLmNvbnRlbnQubWVzc2FnZSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgICAgIHJlamVjdCggXCJSZWdpc3RlclwiLCBkZWZlcnJlZCwge1xyXG4gICAgICAgICAgICAgIHN0YXR1czogMjAwLFxyXG4gICAgICAgICAgICAgIGVycm9yQ29kZTogRVJST1JfQ09ERV9NQUxGT1JNRURfUkVTUE9OU0VcclxuICAgICAgICAgICAgfSApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gUmVzb2x2ZSB0aGUgZGVmZXJyZWQuXHJcbiAgICAgICAgICByZXNvbHZlKCBcIlJlZ2lzdGVyXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgICAgIC8vIFJlamVjdCB0aGUgZGVmZXJyZWQuXHJcbiAgICAgICAgICByZWplY3QoIFwiUmVnaXN0ZXJcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICAgICAgfSApO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgZGVmZXJyZWQgb2JqZWN0IHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIGVycm9ycyBhcyB0aGV5IGNob29zZS5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gcmVxdWVzdFZlcmlmeUVtYWlsUHJpdmF0ZSgpXHJcbiAgLy8gVG8gYmUgY2FsbGVkIGJ5IHRoZSBwYWdlIHRoZSBhdCBhZGRyZXNzIHdoaWNoIGFuIGVtYWlsIHZlcmlmaWNhdGlvbiBlbWFpbCBsaW5rcyB0aGUgdXNlciB0by5cclxuICAvLyBUaGUgdXNlciB3aWxsIGJlIHNlbnQgdG8gdGhpcyBwYWdlIHdpdGggdGhlaXIgZW1haWwgYW5kIGEgaGFzaCBpbiB0aGUgcXVlcnkgc3RyaW5nIG9mIHRoZSBVUkwuXHJcbiAgdmFyIHJlcXVlc3RWZXJpZnlFbWFpbFByaXZhdGUgPSBmdW5jdGlvbiAoIGhhc2ggKSB7XHJcblxyXG4gICAgLy8gTm90aWZ5IHRoZSB1c2VyIG9mIHRoZSB2ZXJpZnkgZW1haWwgY2FsbCBvY2N1cnJpbmcuXHJcbiAgICBpZiAoIHR5cGVvZiBzZWxmLm9uVmVyaWZ5RW1haWxDYWxsZWQgPT09IFwiZnVuY3Rpb25cIiApIHtcclxuICAgICAgc2VsZi5vblZlcmlmeUVtYWlsQ2FsbGVkKCBoYXNoICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgZGVmZXJyZWQgb2JqZWN0IHRvIHJldHVybiBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBzdWNjZXNzL2ZhaWx1cmUgY29udmVuaWVudGx5LlxyXG4gICAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG5cclxuICAgIC8vIEJ1aWxkIHRoZSBwYXlsb2FkIG9iamVjdCB0byBzZW5kIHdpdGggdGhlIHJlcXVlc3RcclxuICAgIHZhciBwYXlsb2FkID0ge1xyXG4gICAgICBcImhhc2hcIjogaGFzaFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSB0ZW1wb3JhcnkgYW4gSWRlbnRpdHkgb2JqZWN0IHdpdGggYSBibGFuayBwYXNzd29yZC5cclxuICAgIHZhciB0ZW1wSWRlbnRpdHkgPSBuZXcgSWRlbnRpdHkoICcnLCAnJywgdHJ1ZSApO1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcclxuICAgIHJlcXVlc3RQcml2YXRlKCAnUFVUJywgJ3ZlcmlmeS1lbWFpbCcsIHBheWxvYWQsIHRlbXBJZGVudGl0eSApXHJcbiAgICAgIC50aGVuKCBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgY29udGVudCB0eXBlIChNZXNzYWdlKSBpcyBmb3JtYXR0ZWQgY29ycmVjdGx5LlxyXG4gICAgICAgICAgaWYgKCB0eXBlb2YgZGF0YS5jb250ZW50Lm1lc3NhZ2UgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgICAgICByZWplY3QoIFwiVmVyaWZ5IEVtYWlsXCIsIGRlZmVycmVkLCB7XHJcbiAgICAgICAgICAgICAgc3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICAgICAgZXJyb3JDb2RlOiBFUlJPUl9DT0RFX01BTEZPUk1FRF9SRVNQT05TRVxyXG4gICAgICAgICAgICB9ICk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBSZXNvbHZlIHRoZSBkZWZlcnJlZC5cclxuICAgICAgICAgIHJlc29sdmUoIFwiVmVyaWZ5IEVtYWlsXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgICAgIC8vIFJlamVjdCB0aGUgZGVmZXJyZWQuXHJcbiAgICAgICAgICByZWplY3QoIFwiVmVyaWZ5IEVtYWlsXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgICAgIH0gKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGRlZmVycmVkIG9iamVjdCBzbyB0aGUgZW5kLXVzZXIgY2FuIGhhbmRsZSBlcnJvcnMgYXMgdGhleSBjaG9vc2UuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BSSVZBVEVdIHNldElkZW50aXR5KClcclxuICAvLyBTZXRzIHRoZSBjdXJyZW50IElkZW50aXR5IG9iamVjdCB0byBhIG5ldyBpbnN0YW5jZSBnaXZlbiBhIHVzZXIncyBlbWFpbCBhbmQgcGFzc3dvcmQuXHJcbiAgdmFyIHNldElkZW50aXR5ID0gZnVuY3Rpb24gKCBlbWFpbCwgcGFzc3dvcmQsIGRvbnRIYXNoUGFzc3dvcmQgKSB7XHJcblxyXG4gICAgaWRlbnRpdHkgPSBuZXcgSWRlbnRpdHkoIGVtYWlsLCBwYXNzd29yZCwgZG9udEhhc2hQYXNzd29yZCApO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFJJVkFURV0gc2V0VXNlclxyXG4gIC8vIFNldHMgdGhlIGN1cnJlbnQgdXNlciBvYmplY3QuXHJcbiAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoIHVzZXIgKSB7XHJcblxyXG4gICAgLy8gU2V0IHRoZSB1c2VyIGFuZCBhZGRpdGlvbmFsIGRhdGEgb2JqZWN0c1xyXG4gICAgc2VsZi51c2VyID0gdXNlcjtcclxuXHJcbiAgfTtcclxuXHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAvLyBQVUJMSUMgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gUFJPUEVSVElFUyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLy8gW1BVQkxJQ10gZGVidWdcclxuICAvLyBJZiBzZXQgdG8gdHJ1ZSwgQnJpZGdlIHdpbGwgbG9nIGVycm9ycyBhbmQgd2FybmluZ3MgdG8gdGhlIGNvbnNvbGUgd2hlbiB0aGV5IG9jY3VyLlxyXG4gIHNlbGYuZGVidWcgPSBmYWxzZTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gYmFzZVVybFxyXG4gIC8vIFRoaXMgVVJMIGlzIGF1dG9tYXRpY2FsbHkgYXBwZW5kZWQgdG8gdGhlIGJlZ2lubmluZyBvZiBhbGwgcmVxdWVzdHMuIFRoaXMgVVJMIHNob3VsZCBlbmQgd2l0aFxyXG4gIC8vIGEgZm9yd2FyZCBzbGFzaCAoLykgc28gdGhhdCBhbnkgcmVzb3VyY2VzIGFuZCBmaWx0ZXJzIGNhbiBiZSBhcHBlbmRlZCBhZnRlciBpdC5cclxuICBzZWxmLmJhc2VVcmwgPSAnJztcclxuXHJcbiAgLy8gW1BVQkxJQ10gdXNlTG9jYWxTdG9yYWdlXHJcbiAgLy8gV2hldGhlciBvciBub3QgdXNlciBjcmVkZW50aWFscyBhbmQgQnJpZGdlIGNvbmZpZ3VyYXRpb24gd2lsbCBiZSBwZXJzaXN0ZWQgdG8gbG9jYWwgc3RvcmFnZS5cclxuICBzZWxmLnVzZUxvY2FsU3RvcmFnZSA9IGZhbHNlO1xyXG5cclxuICAvLyBbUFVCTElDXSB1c2VyXHJcbiAgLy8gVGhlIFVzZXIgb2JqZWN0IHJldHVybmVkIGJ5IHRoZSB0aGUgZGF0YWJhc2UgcmVsYXRpbmcgdG8gdGhlIGN1cnJlbnQgaWRlbnRpdHkuXHJcbiAgc2VsZi51c2VyID0gbnVsbDtcclxuXHJcblxyXG4gIC8vLy8vLy8vLy8vL1xyXG4gIC8vIEVWRU5UUyAvL1xyXG4gIC8vLy8vLy8vLy8vL1xyXG5cclxuICAvLyBbUFVCTElDXSBvbkNoYW5nZVBhc3N3b3JkQ2FsbGVkKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSByZXF1ZXN0Q2hhbmdlUGFzc3dvcmQoKSBmdW5jdGlvbiBpcyBjYWxsZWQuXHJcbiAgLy8gU2lnbmF0dXJlOiBmdW5jdGlvbiAoKSB7fVxyXG4gIHNlbGYub25DaGFuZ2VQYXNzd29yZENhbGxlZCA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIG9uRm9yZ290UGFzc3dvcmRDYWxsZWQoKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gdGhlIHJlcXVlc3RGb3Jnb3RQYXNzd29yZCgpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggZW1haWwgKSB7fVxyXG4gIHNlbGYub25Gb3Jnb3RQYXNzd29yZENhbGxlZCA9IG51bGw7XHJcblxyXG4gIC8vIFtQVUJMSUNdIG9uTG9naW5DYWxsZWQoKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gdGhlIHJlcXVlc3RMb2dpbigpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggZW1haWwsIHVzZUxvY2FsU3RvcmFnZSApIHt9XHJcbiAgc2VsZi5vbkxvZ2luQ2FsbGVkID0gbnVsbDtcclxuXHJcbiAgLy8gW1BVQkxJQ10gbG9naW5FcnJvckNhbGxiYWNrKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSBsb2dvdXQoKSBmdW5jdGlvbiBpcyBjYWxsZWQuXHJcbiAgLy8gU2lnbmF0dXJlOiBmdW5jdGlvbiAoKSB7fVxyXG4gIHNlbGYub25Mb2dvdXRDYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSBvblJlY292ZXJQYXNzd29yZENhbGxlZCgpXHJcbiAgLy8gVGhlIGNhbGxiYWNrIHRvIGNhbGwgd2hlbiB0aGUgcmVxdWVzdFJlY292ZXJQYXNzd29yZCgpIGZ1bmN0aW9uIGlzIGNhbGxlZC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggZW1haWwsIGhhc2ggKSB7fVxyXG4gIHNlbGYub25SZWNvdmVyUGFzc3dvcmRDYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSBvblJlZ2lzdGVyQ2FsbGVkKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSByZXF1ZXN0UmVnaXN0ZXIoKSBmdW5jdGlvbiBpcyBjYWxsZWQuXHJcbiAgLy8gU2lnbmF0dXJlOiBmdW5jdGlvbiAoIGVtYWlsLCBmaXJzdE5hbWUsIGxhc3ROYW1lLCBhcHBEYXRhICkge31cclxuICBzZWxmLm9uUmVnaXN0ZXJDYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0Q2FsbGJhY2soKVxyXG4gIC8vIFRoZSBjYWxsYmFjayB0byBjYWxsIHdoZW4gYSByZXF1ZXN0KCkgY2FsbCBvY2N1cnMsIGJ1dCBiZWZvcmUgaXQgaXMgc2VudC5cclxuICAvLyBTaWduYXR1cmU6IGZ1bmN0aW9uICggbWV0aG9kLCByZXNvdXJjZSwgcGF5bG9hZCApIHt9XHJcbiAgc2VsZi5vblJlcXVlc3RDYWxsZWQgPSBudWxsO1xyXG5cclxuICAvLyBbUFVCTElDXSBvblZlcmlmeUVtYWlsQ2FsbGVkKClcclxuICAvLyBUaGUgY2FsbGJhY2sgdG8gY2FsbCB3aGVuIHRoZSByZXF1ZXN0VmVyaWZ5RW1haWwoKSBmdW5jdGlvbiBpcyBjYWxsZWQuXHJcbiAgLy8gU2lnbmF0dXJlOiBmdW5jdGlvbiAoIGVtYWlsLCBoYXNoICkge31cclxuICBzZWxmLm9uVmVyaWZ5RW1haWxDYWxsZWQgPSBudWxsO1xyXG5cclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gRlVOQ1RJT05TIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8vIFtQVUJMSUNdIGNyZWF0ZVJlcXVlc3QoKVxyXG4gIC8vIFRoaXMgZnVuY3Rpb24gcHJvdmlkZXMgdGhlIGxvd2VzdC1sZXZlbCBpbnRlcmZhY2UgdG8gdGhlIFhIUiBmdW5jdGlvbmFsaXR5IHRoYXQgdGhlIEJyaWRnZVxyXG4gIC8vIENsaWVudCBpcyBvcGVyYXRpbmcgb24gdG9wIG9mLiBUaGlzIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIG9ubHkgZm9yIGlzc3VpbmcgYSByZXF1ZXN0IGFuZFxyXG4gIC8vIHJldHVybmluZyBhIFEgcHJvbWlzZSBhbmQgaG9va2luZyB1cCB0aGUgcmVzb2x2ZSgpIGFuZCByZWplY3QoKSBtZXRob2RzIHRvIHRoZSByZXN1bHRzIG9mIHRoZVxyXG4gIC8vIFhIUiByZXF1ZXN0LlxyXG4gIC8vIE5vdGU6IEFueSBmdW5jdGlvbiBhc3NpZ25lZCB0byB0aGlzIHZhcmlhYmxlIG11c3QgYWNjZXB0IHRoZSBzYW1lIDMgYXJndW1lbnRzLCBhbmQgaXQgbXVzdFxyXG4gIC8vIHJldHVybiBhIHByb21pc2UgdGhhdCBtYXRjaGVzIHRoZSBRIHByb21pc2UgaW50ZXJmYWNlIChtdXN0IGhhdmUgdGhlbigpIGFuZCBjYXRjaCgpIGF0IGxlYXN0KS5cclxuICBzZWxmLmNyZWF0ZVJlcXVlc3QgPSBmdW5jdGlvbiAoIG1ldGhvZCwgdXJsLCBzaWduZWRIZWFkZXIgKSB7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgbmV3IFhockh0dHBSZXF1ZXN0IGFuZCBhIFEgZGVmZXJyZWQgdG8gd3JhcCBpdC5cclxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuXHJcbiAgICAvLyBDb25maWd1cmUgdGhlIFhIUiByZXF1ZXN0XHJcbiAgICB4aHIub3BlbiggbWV0aG9kLnRvVXBwZXJDYXNlKCksIHVybCwgdHJ1ZSApO1xyXG4gICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoICdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicgKTtcclxuICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCAnQnJpZGdlJywgSlNPTi5zdHJpbmdpZnkoIHNpZ25lZEhlYWRlciApICk7XHJcblxyXG4gICAgLy8gQXNzaWduIHRoZSBjYWxsYmFjayBmb3IgYWxsIG9ucmVhZHlzdGF0ZWNoYW5nZSBYSFIgZXZlbnRzXHJcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAvLyBPbmx5IHdoZW4gdGhlIFhIUiBzdGF0ZSB0cmFuc2l0aW9ucyB0byBjb21wbGV0ZWRcclxuICAgICAgaWYgKCB4aHIucmVhZHlTdGF0ZSA9PT0gNCApIHtcclxuICAgICAgICBpZiAoIHR5cGVvZiB4aHIucmVzcG9uc2VUZXh0ID09PSAnc3RyaW5nJyApIHtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHZhciBkYXRhID0gSlNPTi5wYXJzZSggeGhyLnJlc3BvbnNlVGV4dCApO1xyXG4gICAgICAgICAgICBpZiAoIHNlbGYuaXNFcnJvckNvZGVSZXNwb25zZSggeGhyLnN0YXR1cyApICkge1xyXG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCggZGF0YS5jb250ZW50ICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSggZGF0YSApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGNhdGNoICggZSApIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCB7XHJcbiAgICAgICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxyXG4gICAgICAgICAgICAgIGVycm9yQ29kZTogRVJST1JfQ09ERV9NQUxGT1JNRURfUkVTUE9OU0VcclxuICAgICAgICAgICAgfSApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoIHR5cGVvZiB4aHIucmVzcG9uc2VUZXh0ID09PSAnb2JqZWN0JyApIHtcclxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoIHhoci5yZXNwb25zZVRleHQgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCB7XHJcbiAgICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcclxuICAgICAgICAgICAgZXJyb3JDb2RlOiBFUlJPUl9DT0RFX01BTEZPUk1FRF9SRVNQT05TRVxyXG4gICAgICAgICAgfSApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBc3NpZ24gdGhlIGNhbGxiYWNrIGZvciBhbGwgb25lcnJvciBYSFIgZXZlbnRzXHJcbiAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgaWYgKCB0eXBlb2YgeGhyLnJlc3BvbnNlVGV4dCA9PT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCggSlNPTi5wYXJzZSggeGhyLnJlc3BvbnNlVGV4dCApICk7XHJcbiAgICAgICAgfSBjYXRjaCAoIGUgKSB7XHJcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoIHtcclxuICAgICAgICAgICAgc3RhdHVzOiB4aHIuc3RhdHVzLFxyXG4gICAgICAgICAgICBlcnJvckNvZGU6IEVSUk9SX0NPREVfTUFMRk9STUVEX1JFU1BPTlNFXHJcbiAgICAgICAgICB9ICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKCB0eXBlb2YgeGhyLnJlc3BvbnNlVGV4dCA9PT0gJ29iamVjdCcgKSB7XHJcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KCB4aHIucmVzcG9uc2VUZXh0LmNvbnRlbnQgKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QoIHtcclxuICAgICAgICAgIHN0YXR1czogeGhyLnN0YXR1cyxcclxuICAgICAgICAgIGVycm9yQ29kZTogRVJST1JfQ09ERV9NQUxGT1JNRURfUkVTUE9OU0VcclxuICAgICAgICB9ICk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gQXNzaWduIHRoZSBjYWxsYmFjayBmb3IgYWxsIG9udGltZW91dCBYSFIgZXZlbnRzXHJcbiAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICBkZWZlcnJlZC5yZWplY3QoIHtcclxuICAgICAgICBzdGF0dXM6IDAsXHJcbiAgICAgICAgZXJyb3JDb2RlOiBFUlJPUl9DT0RFX1JFUVVFU1RfVElNRU9VVFxyXG4gICAgICB9ICk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3Qgb3V0IGludG8gdGhlIG5ldHdvcmtcclxuICAgIHhoci5zZW5kKCk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSBwcm9taXNlIG9iamVjdCB0byB0aGUgY2FsbGVyXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHJcbiAgfTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gY3JlYXRlUmVxdWVzdEhlYWRlcigpXHJcbiAgLy8gUmV0dXJucyBhIG5ldyByZXF1ZXN0IGhlYWRlciB3cmFwcGVkIGFyb3VuZCB0aGUgcGF5bG9hZCBwYXNzZWQgaW4uXHJcbiAgc2VsZi5jcmVhdGVSZXF1ZXN0SGVhZGVyID0gZnVuY3Rpb24gKCBwYXlsb2FkICkge1xyXG4gICAgcmV0dXJuICggaGFzSWRlbnRpdHkoKSApID8gaWRlbnRpdHkuY3JlYXRlSGVhZGVyKCBwYXlsb2FkICkgOiB7fTtcclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSBpc0Vycm9yQ29kZVJlc3BvbnNlKClcclxuICAvLyBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBzdGF0dXMgY29kZSByZWNlaXZlZCBiYWNrIGZyb20gdGhlIHNlcnZlciBpcyA0MDAgb3IgZ3JlYXRlci4gSXQgaXNcclxuICAvLyBnZW5lcmFsbHkgYXNzdW1lZCB0aGF0IHN1Y2ggYW4gSFRUUCBzdGF0dXMgY29kZSBjYW4gYmUgY29uc2lkZXJlZCB0byBiZSBhbiBlcnJvci5cclxuICBzZWxmLmlzRXJyb3JDb2RlUmVzcG9uc2UgPSBmdW5jdGlvbiAoIHN0YXR1cyApIHtcclxuICAgIHJldHVybiAoIHN0YXR1cyA+PSA0MDAgKTtcclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSBkZWNvZGVFcnJvcigpXHJcbiAgLy8gUmV0dXJucyBhIHN0cmluZyB0aGF0IHByb3ZpZGVzIGh1bWFuLXVuZGVyc3RhbmRhYmxlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB0eXBlIG9mIGVycm9yXHJcbiAgLy8gZW5jb3VudGVyZWQgYnkgQnJpZGdlIFRoaXMgaW5wdXQgdG8gdGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgdGhlIGVycm9yQ29kZSBmaWVsZCBvZiBhblxyXG4gIC8vIGVycm9yIG9iamVjdCByZWNlaXZlZCBiYWNrIGZyb20gdGhlIHNlcnZlciBmb3IgYW4gSFRUUCBzdGF0dXMgY29kZSBvZiA0MDAgb3IgZ3JlYXRlci4gVGhlc2VcclxuICAvLyBjb2RlcyBtYXkgYWxzbyBvcmlnaW5hdGUgZnJvbSB0aGUgY2xpZW50LiBDbGllbnQgZXJyb3IgY29kZXMgdXNlIHRoZSBudW1iZXJzIDEwMSBhbmQgdXAuXHJcbiAgc2VsZi5kZWNvZGVFcnJvciA9IGZ1bmN0aW9uICggZXJyb3JDb2RlICkge1xyXG4gICAgdmFyIHJlc3VsdCA9IEVSUk9SX0NPREVfRVhQTEFOQVRJT05TWyBlcnJvckNvZGUgXTtcclxuICAgIGlmICggdHlwZW9mIHJlc3VsdCA9PT0gJ3VuZGVmaW5lZCcgKSB7XHJcbiAgICAgIHJldHVybiBcIlVua25vd24gZXJyb3IgY29kZS4gWW91IG1heSBuZWVkIHRvIHVwZGF0ZSB5b3VyIGJyaWRnZS1jbGllbnQgcGFja2FnZS5cIjtcclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbiAgfTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gaXNMb2dnZWRJbigpXHJcbiAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgY3VycmVudGx5IGEgdXNlciBvYmplY3Qgc2V0LiBJZiBubyB1c2VyIG9iamVjdCBpcyBzZXQsIHRoZW4gbm9uZVxyXG4gIC8vIHdhcyByZXR1cm5lZCBmcm9tIHRoZSBsb2dpbiBhdHRlbXB0IChhbmQgdGhlIHVzZXIgaXMgc3RpbGwgbG9nZ2VkIG91dCkgb3IgdGhlIHVzZXJcclxuICAvLyBsb2dnZWQgb3V0IG1hbnVhbGx5LlxyXG4gIHNlbGYuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiAoIHNlbGYudXNlciAhPT0gbnVsbCApO1xyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIGxvZ291dCgpXHJcbiAgLy8gU2V0IHRoZSB1c2VyIG9iamVjdCB0byBudWxsIGFuZCBjbGVhciB0aGUgSWRlbnRpdHkgb2JqZWN0IHVzZXIgdG8gc2lnbiByZXF1ZXN0cyBmb3JcclxuICAvLyBhdXRoZW50aWNhdGlvbiBwdXJwb3Nlcywgc28gdGhhdCB0aGUgbG9nZ2VkLW91dCB1c2VyJ3MgY3JlZGVudGlhbHMgY2FuJ3Qgc3RpbGwgYmVcclxuICAvLyB1c2VyIHRvIGF1dGhvcml6ZSByZXF1ZXN0cy5cclxuICBzZWxmLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBkZWZlcnJlZCBvYmplY3QgdG8gcmV0dXJuIHNvIHRoZSBlbmQtdXNlciBjYW4gaGFuZGxlIHN1Y2Nlc3MvZmFpbHVyZSBjb252ZW5pZW50bHkuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcblxyXG4gICAgLy8gTm90aWZ5IHRoZSB1c2VyIG9mIHRoZSBsb2dvdXQgYWN0aW9uLlxyXG4gICAgaWYgKCB0eXBlb2Ygc2VsZi5vbkxvZ291dENhbGxlZCA9PT0gJ2Z1bmN0aW9uJyApIHtcclxuICAgICAgc2VsZi5vbkxvZ291dENhbGxlZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERlbGV0ZSB0aGUgSWRlbnRpdHkgYW5kIFVzZXIgb2JqZWN0cyB0byBwcmVzZXJ2ZSB0aGUgdXNlcidzIHBhc3N3b3JkL2RhdGEgc2VjdXJpdHkuXHJcbiAgICBjbGVhcklkZW50aXR5KCk7XHJcbiAgICBjbGVhclVzZXIoKTtcclxuXHJcbiAgICAvLyBDbGVhciB0aGUgaWRlbnRpdHkgZnJvbSBsb2NhbCBzdG9yYWdlIHRvIHByZXNlcnZlIHRoZSB1c2VyJ3MgcGFzc3dvcmQgc2VjdXJpdHkuXHJcbiAgICAvLyBJZiBubyBpZGVudGl0eSBpcyBzdG9yZWQsIHRoaXMgd2lsbCBkbyBub3RoaW5nLlxyXG4gICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oICdicmlkZ2UtY2xpZW50LWlkZW50aXR5JyApO1xyXG5cclxuICAgIC8vIFJlc29sdmUgdGhlIHByb21pc2Ugc2luY2UgdGhpcyBvcGVyYXRpb24gY2Fubm90IGZhaWxcclxuICAgIGRlZmVycmVkLnJlc29sdmUoKTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0KClcclxuICAvLyBTZW5kcyBhbiBYSFIgcmVxdWVzdCB1c2luZyBhIGRlZmF1bHQgSmF2YVNjcmlwdCBYbWxIdHRwUmVxdWVzdCBvYmplY3QgdG8gdGhlIGdpdmVuIEFQSVxyXG4gIC8vIHJlc291cmNlIHVzaW5nIHRoZSBnaXZlbiBIVFRQIG1ldGhvZC4gVGhlIEhUVFAgcmVxdWVzdCBib2R5IHdpbGwgYmUgc2V0IHRvIHRoZVxyXG4gIC8vIEpTT04uc3RyaW5naWZ5KCllZCByZXF1ZXN0IHRoYXQgaXMgZ2VuZXJhdGVkIGJ5IHRoZSBJZGVudGl0eSBvYmplY3Qgc2V0IHRvIHBlcmZvcm0gSE1BQ1xyXG4gIC8vIHNpZ25pbmcuXHJcbiAgLy8gUmV0dXJucyB0aGUgWGhySHR0cFJlcXVlc3Qgb2JqZWN0IHRoYXQgdGhlIHJlcXVlc3QgcmVwcmVzZW50cy5cclxuICAvLyBJZiBubyBJZGVudGl0eSBpcyBzZXQsIHNlbmRSZXF1ZXN0KCkgcmV0dXJucyBudWxsLCBpbmRpY2F0aW5nIG5vIHJlcXVlc3Qgd2FzIHNlbnQuXHJcbiAgc2VsZi5yZXF1ZXN0ID0gZnVuY3Rpb24gKCBtZXRob2QsIHJlc291cmNlLCBwYXlsb2FkICkge1xyXG4gICAgcmV0dXJuIHJlcXVlc3RQcml2YXRlKCBtZXRob2QsIHJlc291cmNlLCBwYXlsb2FkLCBudWxsICk7XHJcbiAgfTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gcmVxdWVzdENoYW5nZVBhc3N3b3JkKClcclxuICAvLyBUaGUgcHVibGljIHJlcXVlc3RDaGFuZ2VQYXNzd29yZCgpIGZ1bmN0aW9uIHVzZWQgdG8gaGlkZSByZXF1ZXN0Q2hhbmdlUGFzc3dvcmRQcml2YXRlKCkuXHJcbiAgc2VsZi5yZXF1ZXN0Q2hhbmdlUGFzc3dvcmQgPSBmdW5jdGlvbiAoIG9sZFBhc3N3b3JkLCBuZXdQYXNzd29yZCApIHtcclxuICAgIHJldHVybiByZXF1ZXN0Q2hhbmdlUGFzc3dvcmRQcml2YXRlKCBvbGRQYXNzd29yZCwgbmV3UGFzc3dvcmQgKTtcclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0Rm9yZ290UGFzc3dvcmQoKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdEZvcmdvdFBhc3N3b3JkKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RGb3Jnb3RQYXNzd29yZFByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RGb3Jnb3RQYXNzd29yZCA9IGZ1bmN0aW9uICggZW1haWwgKSB7XHJcbiAgICByZXR1cm4gcmVxdWVzdEZvcmdvdFBhc3N3b3JkUHJpdmF0ZSggZW1haWwgKTtcclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0TG9naW4oKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdExvZ2luKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RMb2dpblByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RMb2dpbiA9IGZ1bmN0aW9uICggZW1haWwsIHBhc3N3b3JkLCB1c2VMb2NhbFN0b3JhZ2UgKSB7XHJcbiAgICByZXR1cm4gcmVxdWVzdExvZ2luUHJpdmF0ZSggZW1haWwsIHBhc3N3b3JkLCB1c2VMb2NhbFN0b3JhZ2UsIGZhbHNlICk7XHJcbiAgfTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gcmVxdWVzdExvZ2luU3RvcmVkSWRlbnRpdHkoKVxyXG4gIC8vIENoZWNrcyB0aGUgYnJvd3NlcidzIGxvY2FsIHN0b3JhZ2UgZm9yIGFuIGV4aXN0aW5nIHVzZXIgYW5kIHBlcmZvcm1zIGEgbG9naW4gcmVxdWVzdFxyXG4gIC8vIHVzaW5nIHRoZSBzdG9yZWQgY3JlZGVudGlhbHMgaWYgb25lIGlzIGZvdW5kLiBSZXR1cm5zIGEgalF1ZXJ5IERlZmVycmVkIG9iamVjdCBpZiBhIGxvZ2luXHJcbiAgLy8gcmVxdWVzdCB3YXMgc2VudCBhbmQgbnVsbCBpZiBubyBzdG9yZWQgaWRlbnRpdHkgd2FzIGZvdW5kIC8gbG9naW4gcmVxdWVzdCB3YXMgc2VudC5cclxuICBzZWxmLnJlcXVlc3RMb2dpblN0b3JlZElkZW50aXR5ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIC8vIFVzZSB0aGUgc3RvcmVkIGlkZW50aXR5IHRvIGF1dGhlbnRpY2F0ZSBpZiBwb3NzaWJsZS5cclxuICAgIHZhciBzdG9yZWRJZGVudGl0eSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCAnYnJpZGdlLWNsaWVudC1pZGVudGl0eScgKTtcclxuICAgIGlmICggc3RvcmVkSWRlbnRpdHkgIT09IG51bGwgKSB7XHJcbiAgICAgIHZhciBwYXJzZWRJZGVudGl0eSA9IEpTT04ucGFyc2UoIHN0b3JlZElkZW50aXR5ICk7XHJcbiAgICAgIGlmICggc2VsZi5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyggXCJTdG9yZWQgaWRlbnRpdHk6IFwiICsgSlNPTi5zdHJpbmdpZnkoIHBhcnNlZElkZW50aXR5ICkgKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVxdWVzdExvZ2luUHJpdmF0ZSggcGFyc2VkSWRlbnRpdHkuZW1haWwsIHBhcnNlZElkZW50aXR5LnBhc3N3b3JkLCB0cnVlLCB0cnVlICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTm8gc3RvcmVkIGlkZW50aXR5IHdhcyBmb3VuZCwgc28gd2Ugd2lsbCByZXR1cm4gYSByZWplY3RlZCBwcm9taXNlIHNvIHdlIGNhbiBoYW5kbGUgZmFpbHVyZS5cclxuICAgIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICAgIHJlamVjdChcclxuICAgICAgXCJMb2dpbiBTdG9yZWQgSWRlbnRpdHlcIixcclxuICAgICAgZGVmZXJyZWQsXHJcbiAgICAgIHtcclxuICAgICAgICBzdGF0dXM6IDIwMCxcclxuICAgICAgICBlcnJvckNvZGU6IEVSUk9SX0NPREVfTk9fU1RPUkVEX0lERU5USVRZXHJcbiAgICAgIH0sXHJcbiAgICAgIExPR19MRVZFTF9XQVJOSU5HXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblxyXG4gIH07XHJcblxyXG4gIC8vIFtQVUJMSUNdIHJlcXVlc3RSZWNvdmVyUGFzc3dvcmQoKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdFJlY292ZXJQYXNzd29yZCgpIGZ1bmN0aW9uIHVzZWQgdG8gaGlkZSByZXF1ZXN0UmVjb3ZlclBhc3N3b3JkUHJpdmF0ZSgpLlxyXG4gIHNlbGYucmVxdWVzdFJlY292ZXJQYXNzd29yZCA9IGZ1bmN0aW9uICggcGFzc3dvcmQsIGhhc2ggKSB7XHJcbiAgICByZXR1cm4gcmVxdWVzdFJlY292ZXJQYXNzd29yZFByaXZhdGUoIHBhc3N3b3JkLCBoYXNoICk7XHJcbiAgfTtcclxuXHJcbiAgLy8gW1BVQkxJQ10gcmVxdWVzdFJlZ2lzdGVyKClcclxuICAvLyBUaGUgcHVibGljIHJlcXVlc3RSZWdpc3RlcigpIGZ1bmN0aW9uIHVzZWQgdG8gaGlkZSByZXF1ZXN0UmVnaXN0ZXJQcml2YXRlKCkuXHJcbiAgc2VsZi5yZXF1ZXN0UmVnaXN0ZXIgPSBmdW5jdGlvbiAoIGVtYWlsLCBwYXNzd29yZCwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgYXBwRGF0YSApIHtcclxuICAgIHJldHVybiByZXF1ZXN0UmVnaXN0ZXJQcml2YXRlKCBlbWFpbCwgcGFzc3dvcmQsIGZpcnN0TmFtZSwgbGFzdE5hbWUsIGFwcERhdGEgKTtcclxuICB9O1xyXG5cclxuICAvLyBbUFVCTElDXSByZXF1ZXN0VmVyaWZ5RW1haWwoKVxyXG4gIC8vIFRoZSBwdWJsaWMgcmVxdWVzdFZlcmlmeUVtYWlsKCkgZnVuY3Rpb24gdXNlZCB0byBoaWRlIHJlcXVlc3RWZXJpZnlFbWFpbFByaXZhdGUoKS5cclxuICBzZWxmLnJlcXVlc3RWZXJpZnlFbWFpbCA9IGZ1bmN0aW9uICggaGFzaCApIHtcclxuICAgIHJldHVybiByZXF1ZXN0VmVyaWZ5RW1haWxQcml2YXRlKCBoYXNoICk7XHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHNlbGY7XHJcblxyXG59O1xyXG4iLCIvLyBJbmNsdWRlIGRlcGVuZGVuY2llc1xyXG52YXIgQ3J5cHRvRW5jSGV4ID0gcmVxdWlyZSggJy4vaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleCcgKTtcclxudmFyIENyeXB0b0htYWNTaGEyNTYgPSByZXF1aXJlKCAnLi9pbmNsdWRlL2NyeXB0by1qcy9obWFjLXNoYTI1NicgKTtcclxudmFyIENyeXB0b1NoYTI1NiA9IHJlcXVpcmUoICcuL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1NicgKTtcclxuXHJcbi8vIFtJZGVudGl0eSBDb25zdHJ1Y3Rvcl1cclxuLy8gVGhlIElkZW50aXR5IG9iamVjdCByZXByZXNlbnRzIGFuIGVtYWlsL3Bhc3N3b3JkIHBhaXIgdXNlZCBhcyBpZGVudGlmaWNhdGlvbiB3aXRoIHRoZVxyXG4vLyBkYXRhYmFzZSB0byBwcm92aWRlIGF1dGhlbmljYXRpb24gZm9yIHJlcXVlc3RzLiBUaGUgSWRlbnRpdHkgaXMgdXNlZCBhcyBhIHJlcXVlc3QgZmFjdG9yeVxyXG4vLyB0byBjcmVhdGUgcmVxdWVzdHMgdGhhdCB3aWxsIGF1dGhlbnRpY2F0ZSB0aGUgd2l0aCB0aGUgc2VydmVyIHNlY3VyZWx5LlxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICggZW1haWwsIHBhc3N3b3JkLCBkb250SGFzaFBhc3N3b3JkICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIFRoZSBvYmplY3QgdG8gYmUgcmV0dXJuZWQgZnJvbSB0aGUgZmFjdG9yeVxyXG4gIHZhciBzZWxmID0ge307XHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vIFBSSVZBVEUgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gUFJPUEVSVElFUyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLy8gW1BSSVZBVEVdIGhhc2hlZFBhc3N3b3JkXHJcbiAgLy8gVGhlIFNIQS0yNTYgZW5jb2RlZCBzdHJpbmcgZ2VuZXJhdGVkIGJ5IGhhc2hpbmcgdGhlIGdpdmVuIHBhc3N3b3JkLiBcclxuICAvLyBbU0VDVVJJVFkgTk9URSAxXSBCeSBoYXNoaW5nIHRoZSBwYXNzd29yZCB3ZSBzdG9yZSBpbiBtZW1vcnkgYW5kIGtlZXBpbmcgaXQgbG9jYWwgdG8gXHJcbiAgLy8gdGhpcyBmdW5jdGlvbiwgd2UgcHJvdGVjdCB0aGUgdXNlcidzIHBhc3N3b3JkIGZyb20gc2NydXRpbnkgZnJvbSBvdGhlciBsb2NhbCBhcHBsaWNhdGlvbnMuXHJcbiAgLy8gVGhlIHBhc3N3b3JkIHN1cHBsaWVkIGFzIGEgY29uc3RydWN0b3IgYXJndW1lbnQgd2lsbCBhbHNvIGJlIG51bGxlZCBzbyB0aGF0IGl0IGlzIG5vdCBrZXB0IFxyXG4gIC8vIGluIGFwcGxpY2F0aW9uIG1lbW9yeSBlaXRoZXIsIHNvIHRoYXQgdGhlIG9yaWdpbmFsIHBhc3N3b3JkIGluZm9ybWF0aW9uIGlzIGxvc3QuXHJcbiAgLy8gW1NFQ1VSSVRZIE5PVEUgNF0gSWYgZG9udEhhc2hQYXNzd29yZCBpcyBzZXQgdG8gdHJ1ZSwgdGhpcyBoYXNoaW5nIHByb2Nlc3MgaXMgc2tpcHBlZC4gVGhpcyBcclxuICAvLyBmZWF0dXJlIGV4aXN0cyB0byBhbGxvdyBwYXNzd29yZHMgc3RvcmVkIGluIGxvY2FsIHN0b3JhZ2UgdG8gYmUgdXNlZCBmb3IgYXV0aGVudGljYXRpb24sIHNpbmNlIFxyXG4gIC8vIHRoZXkgaGF2ZSBhbHJlYWR5IGJlZW4gaGFzZWQgaW4gdGhpcyB3YXkuIERPIE5PVCBVU0UgVEhJUyBGT1IgQU5ZVEhJTkcgRUxTRSFcclxuICB2YXIgaGFzaGVkUGFzc3dvcmQgPSAoIGRvbnRIYXNoUGFzc3dvcmQgPT09IHRydWUgKSA/IHBhc3N3b3JkIDogXHJcbiAgICBDcnlwdG9TaGEyNTYoIHBhc3N3b3JkICkudG9TdHJpbmcoIENyeXB0b0VuY0hleCApO1xyXG5cclxuICAvLyBbU0VDVVJJVFkgTk9URSAyXSBUaGUgdXNlcidzIGdpdmVuIHBhc3N3b3JkIHNob3VsZCBiZSBmb3Jnb3R0ZW4gb25jZSBpdCBoYXMgYmVlbiBoYXNoZWQuXHJcbiAgLy8gQWx0aG91Z2ggdGhlIHBhc3N3b3JkIGlzIGxvY2FsIHRvIHRoaXMgY29uc3RydWN0b3IsIGl0IGlzIGJldHRlciB0aGF0IGl0IG5vdCBldmVuIGJlIFxyXG4gIC8vIGF2YWlsYWJsZSBpbiBtZW1vcnkgb25jZSBpdCBoYXMgYmVlbiBoYXNoZWQsIHNpbmNlIHRoZSBoYXNoZWQgcGFzc3dvcmQgaXMgbXVjaCBtb3JlIFxyXG4gIC8vIGRpZmZpY3VsdCB0byByZWNvdmVyIGluIGl0cyBvcmlnaW5hbCBmb3JtLlxyXG4gIHBhc3N3b3JkID0gbnVsbDtcclxuXHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vIEZVTkNUSU9OUyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLyBbUFJJVkFURV0gaG1hY1NpZ25IZWFkZXIoKVxyXG4gIC8vIFJldHVybnMgdGhlIGdpdmVuIHJlcXVlc3Qgb2JqZWN0IGFmdGVyIGFkZGluZyB0aGUgXCJobWFjXCIgcHJvcGVydHkgdG8gaXQgYW5kIHNldHRpbmcgXCJobWFjXCIgXHJcbiAgLy8gYnkgdXNpbmcgdGhlIHVzZXIncyBwYXNzd29yZCBhcyBhIFNIQS0yNTYgSE1BQyBoYXNoaW5nIHNlY3JldC5cclxuICAvLyBbU0VDVVJJVFkgTk9URSAzXSBUaGUgSE1BQyBzdHJpbmcgaXMgYSBoZXggdmFsdWUsIDY0IGNoYXJhY3RlcnMgaW4gbGVuZ3RoLiBJdCBpcyBjcmVhdGVkIFxyXG4gIC8vIGJ5IGNvbmNhdGVuYXRpbmcgdGhlIEpTT04uc3RyaW5naWZ5KCllZCByZXF1ZXN0IGNvbnRlbnQsIHRoZSByZXF1ZXN0IGVtYWlsLCBhbmQgdGhlIHJlcXVlc3QgXHJcbiAgLy8gdGltZSB0b2dldGhlciwgYW5kIGhhc2hpbmcgdGhlIHJlc3VsdCB1c2luZyBoYXNoZWRQYXNzd29yZCBhcyBhIHNhbHQuIFxyXG4gIC8vXHJcbiAgLy8gUHNldWRvY29kZTpcclxuICAvLyB0b0hhc2ggPSBSZXF1ZXN0IENvbnRlbnQgSlNPTiArIFJlcXVlc3QgRW1haWwgKyBSZXF1ZXN0IFRpbWUgSlNPTlxyXG4gIC8vIHNhbHQgPSBoYXNoZWRQYXNzd29yZFxyXG4gIC8vIGhtYWNTdHJpbmcgPSBDcnlwdG9TaGEyNTYoIHRvSGFzaCwgc2FsdCApXHJcbiAgLy8gcmVxdWVzdC5obWFjID0gaG1hY1N0cmluZ1xyXG4gIC8vIFxyXG4gIC8vIEJ5IHBlcmZvcm1pbmcgdGhlIHNhbWUgb3BlcmF0aW9uIG9uIHRoZSBkYXRhLCB0aGUgc2VydmVyIGNhbiBjb25maXJtIHRoYXQgdGhlIEhNQUMgc3RyaW5ncyBcclxuICAvLyBhcmUgaWRlbnRpY2FsIGFuZCBhdXRob3JpemUgdGhlIHJlcXVlc3QuXHJcbiAgdmFyIGhtYWNTaWduSGVhZGVyID0gZnVuY3Rpb24gKCByZXFCb2R5ICkge1xyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgY29uY2F0ZW5hdGVkIHN0cmluZyB0byBiZSBoYXNoZWQgYXMgdGhlIEhNQUNcclxuICAgIHZhciBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkoIHJlcUJvZHkuY29udGVudCApO1xyXG4gICAgdmFyIGVtYWlsID0gcmVxQm9keS5lbWFpbDtcclxuICAgIHZhciB0aW1lID0gcmVxQm9keS50aW1lLnRvSVNPU3RyaW5nKCk7XHJcbiAgICB2YXIgY29uY2F0ID0gY29udGVudCArIGVtYWlsICsgdGltZTtcclxuXHJcbiAgICAvLyBBZGQgdGhlICdobWFjJyBwcm9wZXJ0eSB0byB0aGUgcmVxdWVzdCB3aXRoIGEgdmFsdWUgY29tcHV0ZWQgYnkgc2FsdGluZyB0aGUgY29uY2F0IHdpdGggdGhlXHJcbiAgICAvLyB1c2VyJ3MgaGFzaGVkUGFzc3dvcmQuXHJcbiAgICAvLyBbQ0FSRUZVTF0gaGFzaGVkUGFzc3dvcmQgc2hvdWxkIGJlIGEgc3RyaW5nLiBJZiBpdCBpc24ndCwgdGVycmlibGUgdGhpbmdzIFdJTEwgaGFwcGVuIVxyXG4gICAgcmVxQm9keS5obWFjID0gQ3J5cHRvSG1hY1NoYTI1NiggY29uY2F0LCBoYXNoZWRQYXNzd29yZCApLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKTtcclxuXHJcbiAgICBpZiAoIEJyaWRnZS5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgY29uc29sZS5sb2coICc9PT0gSE1BQyBTaWduaW5nIFByb2Nlc3MgPT09JyApO1xyXG4gICAgICBjb25zb2xlLmxvZyggJ0hhc2hwYXNzOiBcIicgKyBoYXNoZWRQYXNzd29yZCArICdcIicgKTtcclxuICAgICAgY29uc29sZS5sb2coICdDb250ZW50OiBcIicgKyBjb250ZW50ICsgJ1wiJyApO1xyXG4gICAgICBjb25zb2xlLmxvZyggJ0VtYWlsOiBcIicgKyBlbWFpbCArICdcIicgKTtcclxuICAgICAgY29uc29sZS5sb2coICdUaW1lOiBcIicgKyB0aW1lICsgJ1wiJyApO1xyXG4gICAgICBjb25zb2xlLmxvZyggJ0NvbmNhdDogXCInICsgY29uY2F0ICsgJ1wiJyApO1xyXG4gICAgICBjb25zb2xlLmxvZyggJ0hNQUM6IFwiJyArIHJlcUJvZHkuaG1hYyArICdcIicgKTtcclxuICAgICAgY29uc29sZS5sb2coICc9PT09PT09PT09PT09PT09PT09PT09PT09PT09JyApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXFCb2R5O1xyXG5cclxuICB9O1xyXG5cclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gUFVCTElDIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy9cclxuICAvLyBQUk9QRVJUSUVTIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvLyBbUFVCTElDXSBlbWFpbFxyXG4gIC8vIFRoZSBlbWFpbCB1c2VkIHRvIGlkZW50aWZ5IHRoZSB1c2VyIHdpdGhpbiB0aGUgZGF0YWJhc2UuXHJcbiAgc2VsZi5lbWFpbCA9IGVtYWlsO1xyXG5cclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gRlVOQ1RJT05TIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8vIFtQVUJMSUNdIGNyZWF0ZUhlYWRlcigpXHJcbiAgLy8gUmV0dXJucyBhIG5ldyByZXF1ZXN0LCBnaXZlbiB0aGUgY29udGVudCBwYXlsb2FkIG9mIHRoZSByZXF1ZXN0IGFzIGFuIG9iamVjdC4gVXRpbGl6ZXNcclxuICAvLyBobWFjU2lnbkhlYWRlcigpIHRvIHdyYXAgdGhlIGdpdmVuIHBheWxvYWQgaW4gYW4gYXBwcm9wcmlhdGUgaGVhZGVyIHRvIHZhbGlkYXRlIGFnYWluc3QgdGhlXHJcbiAgLy8gc2VydmVyLXNpZGUgYXV0aG9yaXphdGlvbiBzY2hlbWUgKGFzc3VtaW5nIHRoZSB1c2VyIGNyZWRlbnRpYWxzIGFyZSBjb3JyZWN0KS5cclxuICBzZWxmLmNyZWF0ZUhlYWRlciA9IGZ1bmN0aW9uICggcGF5bG9hZCApIHtcclxuXHJcbiAgICByZXR1cm4gaG1hY1NpZ25IZWFkZXIoIHtcclxuICAgICAgJ2NvbnRlbnQnOiBwYXlsb2FkLFxyXG4gICAgICAnZW1haWwnOiBlbWFpbCxcclxuICAgICAgJ3RpbWUnOiBuZXcgRGF0ZSgpXHJcbiAgICB9ICk7XHJcblxyXG4gIH07XHJcblxyXG4gIHJldHVybiBzZWxmO1xyXG5cclxufTsiLCI7KGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcblx0aWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XHJcblx0XHQvLyBDb21tb25KU1xyXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZmFjdG9yeSgpO1xyXG5cdH1cclxuXHRlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xyXG5cdFx0Ly8gQU1EXHJcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdC8vIEdsb2JhbCAoYnJvd3NlcilcclxuXHRcdHJvb3QuQ3J5cHRvSlMgPSBmYWN0b3J5KCk7XHJcblx0fVxyXG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcclxuXHJcblx0LyoqXHJcblx0ICogQ3J5cHRvSlMgY29yZSBjb21wb25lbnRzLlxyXG5cdCAqL1xyXG5cdHZhciBDcnlwdG9KUyA9IENyeXB0b0pTIHx8IChmdW5jdGlvbiAoTWF0aCwgdW5kZWZpbmVkKSB7XHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBDcnlwdG9KUyBuYW1lc3BhY2UuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgQyA9IHt9O1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIExpYnJhcnkgbmFtZXNwYWNlLlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIENfbGliID0gQy5saWIgPSB7fTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBCYXNlIG9iamVjdCBmb3IgcHJvdG90eXBhbCBpbmhlcml0YW5jZS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBCYXNlID0gQ19saWIuQmFzZSA9IChmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICBmdW5jdGlvbiBGKCkge31cclxuXHJcblx0ICAgICAgICByZXR1cm4ge1xyXG5cdCAgICAgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICAgICAqIENyZWF0ZXMgYSBuZXcgb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSB0aGlzIG9iamVjdC5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvdmVycmlkZXMgUHJvcGVydGllcyB0byBjb3B5IGludG8gdGhlIG5ldyBvYmplY3QuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBuZXcgb2JqZWN0LlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqICAgICB2YXIgTXlUeXBlID0gQ3J5cHRvSlMubGliLkJhc2UuZXh0ZW5kKHtcclxuXHQgICAgICAgICAgICAgKiAgICAgICAgIGZpZWxkOiAndmFsdWUnLFxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogICAgICAgICBtZXRob2Q6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAgKiAgICAgICAgIH1cclxuXHQgICAgICAgICAgICAgKiAgICAgfSk7XHJcblx0ICAgICAgICAgICAgICovXHJcblx0ICAgICAgICAgICAgZXh0ZW5kOiBmdW5jdGlvbiAob3ZlcnJpZGVzKSB7XHJcblx0ICAgICAgICAgICAgICAgIC8vIFNwYXduXHJcblx0ICAgICAgICAgICAgICAgIEYucHJvdG90eXBlID0gdGhpcztcclxuXHQgICAgICAgICAgICAgICAgdmFyIHN1YnR5cGUgPSBuZXcgRigpO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgLy8gQXVnbWVudFxyXG5cdCAgICAgICAgICAgICAgICBpZiAob3ZlcnJpZGVzKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICBzdWJ0eXBlLm1peEluKG92ZXJyaWRlcyk7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkZWZhdWx0IGluaXRpYWxpemVyXHJcblx0ICAgICAgICAgICAgICAgIGlmICghc3VidHlwZS5oYXNPd25Qcm9wZXJ0eSgnaW5pdCcpKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICBzdWJ0eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICAgICAgc3VidHlwZS4kc3VwZXIuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgfTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZXIncyBwcm90b3R5cGUgaXMgdGhlIHN1YnR5cGUgb2JqZWN0XHJcblx0ICAgICAgICAgICAgICAgIHN1YnR5cGUuaW5pdC5wcm90b3R5cGUgPSBzdWJ0eXBlO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgLy8gUmVmZXJlbmNlIHN1cGVydHlwZVxyXG5cdCAgICAgICAgICAgICAgICBzdWJ0eXBlLiRzdXBlciA9IHRoaXM7XHJcblxyXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gc3VidHlwZTtcclxuXHQgICAgICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgICAgICAvKipcclxuXHQgICAgICAgICAgICAgKiBFeHRlbmRzIHRoaXMgb2JqZWN0IGFuZCBydW5zIHRoZSBpbml0IG1ldGhvZC5cclxuXHQgICAgICAgICAgICAgKiBBcmd1bWVudHMgdG8gY3JlYXRlKCkgd2lsbCBiZSBwYXNzZWQgdG8gaW5pdCgpLlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgbmV3IG9iamVjdC5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiAgICAgdmFyIGluc3RhbmNlID0gTXlUeXBlLmNyZWF0ZSgpO1xyXG5cdCAgICAgICAgICAgICAqL1xyXG5cdCAgICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2UgPSB0aGlzLmV4dGVuZCgpO1xyXG5cdCAgICAgICAgICAgICAgICBpbnN0YW5jZS5pbml0LmFwcGx5KGluc3RhbmNlLCBhcmd1bWVudHMpO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG5cdCAgICAgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICAgICAqIEluaXRpYWxpemVzIGEgbmV3bHkgY3JlYXRlZCBvYmplY3QuXHJcblx0ICAgICAgICAgICAgICogT3ZlcnJpZGUgdGhpcyBtZXRob2QgdG8gYWRkIHNvbWUgbG9naWMgd2hlbiB5b3VyIG9iamVjdHMgYXJlIGNyZWF0ZWQuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogICAgIHZhciBNeVR5cGUgPSBDcnlwdG9KUy5saWIuQmFzZS5leHRlbmQoe1xyXG5cdCAgICAgICAgICAgICAqICAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgICAqICAgICAgICAgICAgIC8vIC4uLlxyXG5cdCAgICAgICAgICAgICAqICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgICAqICAgICB9KTtcclxuXHQgICAgICAgICAgICAgKi9cclxuXHQgICAgICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAgICAgLyoqXHJcblx0ICAgICAgICAgICAgICogQ29waWVzIHByb3BlcnRpZXMgaW50byB0aGlzIG9iamVjdC5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcm9wZXJ0aWVzIFRoZSBwcm9wZXJ0aWVzIHRvIG1peCBpbi5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiAgICAgTXlUeXBlLm1peEluKHtcclxuXHQgICAgICAgICAgICAgKiAgICAgICAgIGZpZWxkOiAndmFsdWUnXHJcblx0ICAgICAgICAgICAgICogICAgIH0pO1xyXG5cdCAgICAgICAgICAgICAqL1xyXG5cdCAgICAgICAgICAgIG1peEluOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xyXG5cdCAgICAgICAgICAgICAgICBmb3IgKHZhciBwcm9wZXJ0eU5hbWUgaW4gcHJvcGVydGllcykge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcHJvcGVydHlOYW1lXSA9IHByb3BlcnRpZXNbcHJvcGVydHlOYW1lXTtcclxuXHQgICAgICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAgICAgLy8gSUUgd29uJ3QgY29weSB0b1N0cmluZyB1c2luZyB0aGUgbG9vcCBhYm92ZVxyXG5cdCAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eSgndG9TdHJpbmcnKSkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdGhpcy50b1N0cmluZyA9IHByb3BlcnRpZXMudG9TdHJpbmc7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgICAgICAvKipcclxuXHQgICAgICAgICAgICAgKiBDcmVhdGVzIGEgY29weSBvZiB0aGlzIG9iamVjdC5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIGNsb25lLlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqICAgICB2YXIgY2xvbmUgPSBpbnN0YW5jZS5jbG9uZSgpO1xyXG5cdCAgICAgICAgICAgICAqL1xyXG5cdCAgICAgICAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXQucHJvdG90eXBlLmV4dGVuZCh0aGlzKTtcclxuXHQgICAgICAgICAgICB9XHJcblx0ICAgICAgICB9O1xyXG5cdCAgICB9KCkpO1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIEFuIGFycmF5IG9mIDMyLWJpdCB3b3Jkcy5cclxuXHQgICAgICpcclxuXHQgICAgICogQHByb3BlcnR5IHtBcnJheX0gd29yZHMgVGhlIGFycmF5IG9mIDMyLWJpdCB3b3Jkcy5cclxuXHQgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IHNpZ0J5dGVzIFRoZSBudW1iZXIgb2Ygc2lnbmlmaWNhbnQgYnl0ZXMgaW4gdGhpcyB3b3JkIGFycmF5LlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIFdvcmRBcnJheSA9IENfbGliLldvcmRBcnJheSA9IEJhc2UuZXh0ZW5kKHtcclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogSW5pdGlhbGl6ZXMgYSBuZXdseSBjcmVhdGVkIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtBcnJheX0gd29yZHMgKE9wdGlvbmFsKSBBbiBhcnJheSBvZiAzMi1iaXQgd29yZHMuXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gc2lnQnl0ZXMgKE9wdGlvbmFsKSBUaGUgbnVtYmVyIG9mIHNpZ25pZmljYW50IGJ5dGVzIGluIHRoZSB3b3Jkcy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMubGliLldvcmRBcnJheS5jcmVhdGUoKTtcclxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMubGliLldvcmRBcnJheS5jcmVhdGUoWzB4MDAwMTAyMDMsIDB4MDQwNTA2MDddKTtcclxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMubGliLldvcmRBcnJheS5jcmVhdGUoWzB4MDAwMTAyMDMsIDB4MDQwNTA2MDddLCA2KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgaW5pdDogZnVuY3Rpb24gKHdvcmRzLCBzaWdCeXRlcykge1xyXG5cdCAgICAgICAgICAgIHdvcmRzID0gdGhpcy53b3JkcyA9IHdvcmRzIHx8IFtdO1xyXG5cclxuXHQgICAgICAgICAgICBpZiAoc2lnQnl0ZXMgIT0gdW5kZWZpbmVkKSB7XHJcblx0ICAgICAgICAgICAgICAgIHRoaXMuc2lnQnl0ZXMgPSBzaWdCeXRlcztcclxuXHQgICAgICAgICAgICB9IGVsc2Uge1xyXG5cdCAgICAgICAgICAgICAgICB0aGlzLnNpZ0J5dGVzID0gd29yZHMubGVuZ3RoICogNDtcclxuXHQgICAgICAgICAgICB9XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29udmVydHMgdGhpcyB3b3JkIGFycmF5IHRvIGEgc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7RW5jb2Rlcn0gZW5jb2RlciAoT3B0aW9uYWwpIFRoZSBlbmNvZGluZyBzdHJhdGVneSB0byB1c2UuIERlZmF1bHQ6IENyeXB0b0pTLmVuYy5IZXhcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBzdHJpbmdpZmllZCB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBzdHJpbmcgPSB3b3JkQXJyYXkgKyAnJztcclxuXHQgICAgICAgICAqICAgICB2YXIgc3RyaW5nID0gd29yZEFycmF5LnRvU3RyaW5nKCk7XHJcblx0ICAgICAgICAgKiAgICAgdmFyIHN0cmluZyA9IHdvcmRBcnJheS50b1N0cmluZyhDcnlwdG9KUy5lbmMuVXRmOCk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoZW5jb2Rlcikge1xyXG5cdCAgICAgICAgICAgIHJldHVybiAoZW5jb2RlciB8fCBIZXgpLnN0cmluZ2lmeSh0aGlzKTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb25jYXRlbmF0ZXMgYSB3b3JkIGFycmF5IHRvIHRoaXMgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheX0gd29yZEFycmF5IFRoZSB3b3JkIGFycmF5IHRvIGFwcGVuZC5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoaXMgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB3b3JkQXJyYXkxLmNvbmNhdCh3b3JkQXJyYXkyKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgY29uY2F0OiBmdW5jdGlvbiAod29yZEFycmF5KSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXHJcblx0ICAgICAgICAgICAgdmFyIHRoaXNXb3JkcyA9IHRoaXMud29yZHM7XHJcblx0ICAgICAgICAgICAgdmFyIHRoYXRXb3JkcyA9IHdvcmRBcnJheS53b3JkcztcclxuXHQgICAgICAgICAgICB2YXIgdGhpc1NpZ0J5dGVzID0gdGhpcy5zaWdCeXRlcztcclxuXHQgICAgICAgICAgICB2YXIgdGhhdFNpZ0J5dGVzID0gd29yZEFycmF5LnNpZ0J5dGVzO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDbGFtcCBleGNlc3MgYml0c1xyXG5cdCAgICAgICAgICAgIHRoaXMuY2xhbXAoKTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ29uY2F0XHJcblx0ICAgICAgICAgICAgaWYgKHRoaXNTaWdCeXRlcyAlIDQpIHtcclxuXHQgICAgICAgICAgICAgICAgLy8gQ29weSBvbmUgYnl0ZSBhdCBhIHRpbWVcclxuXHQgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGF0U2lnQnl0ZXM7IGkrKykge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIHRoYXRCeXRlID0gKHRoYXRXb3Jkc1tpID4+PiAyXSA+Pj4gKDI0IC0gKGkgJSA0KSAqIDgpKSAmIDB4ZmY7XHJcblx0ICAgICAgICAgICAgICAgICAgICB0aGlzV29yZHNbKHRoaXNTaWdCeXRlcyArIGkpID4+PiAyXSB8PSB0aGF0Qnl0ZSA8PCAoMjQgLSAoKHRoaXNTaWdCeXRlcyArIGkpICUgNCkgKiA4KTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH0gZWxzZSBpZiAodGhhdFdvcmRzLmxlbmd0aCA+IDB4ZmZmZikge1xyXG5cdCAgICAgICAgICAgICAgICAvLyBDb3B5IG9uZSB3b3JkIGF0IGEgdGltZVxyXG5cdCAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoYXRTaWdCeXRlczsgaSArPSA0KSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICB0aGlzV29yZHNbKHRoaXNTaWdCeXRlcyArIGkpID4+PiAyXSA9IHRoYXRXb3Jkc1tpID4+PiAyXTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH0gZWxzZSB7XHJcblx0ICAgICAgICAgICAgICAgIC8vIENvcHkgYWxsIHdvcmRzIGF0IG9uY2VcclxuXHQgICAgICAgICAgICAgICAgdGhpc1dvcmRzLnB1c2guYXBwbHkodGhpc1dvcmRzLCB0aGF0V29yZHMpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB0aGlzLnNpZ0J5dGVzICs9IHRoYXRTaWdCeXRlcztcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ2hhaW5hYmxlXHJcblx0ICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogUmVtb3ZlcyBpbnNpZ25pZmljYW50IGJpdHMuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgd29yZEFycmF5LmNsYW1wKCk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGNsYW1wOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXHJcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gdGhpcy53b3JkcztcclxuXHQgICAgICAgICAgICB2YXIgc2lnQnl0ZXMgPSB0aGlzLnNpZ0J5dGVzO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDbGFtcFxyXG5cdCAgICAgICAgICAgIHdvcmRzW3NpZ0J5dGVzID4+PiAyXSAmPSAweGZmZmZmZmZmIDw8ICgzMiAtIChzaWdCeXRlcyAlIDQpICogOCk7XHJcblx0ICAgICAgICAgICAgd29yZHMubGVuZ3RoID0gTWF0aC5jZWlsKHNpZ0J5dGVzIC8gNCk7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ3JlYXRlcyBhIGNvcHkgb2YgdGhpcyB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIGNsb25lLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBjbG9uZSA9IHdvcmRBcnJheS5jbG9uZSgpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIHZhciBjbG9uZSA9IEJhc2UuY2xvbmUuY2FsbCh0aGlzKTtcclxuXHQgICAgICAgICAgICBjbG9uZS53b3JkcyA9IHRoaXMud29yZHMuc2xpY2UoMCk7XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBjbG9uZTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDcmVhdGVzIGEgd29yZCBhcnJheSBmaWxsZWQgd2l0aCByYW5kb20gYnl0ZXMuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IG5CeXRlcyBUaGUgbnVtYmVyIG9mIHJhbmRvbSBieXRlcyB0byBnZW5lcmF0ZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSByYW5kb20gd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmxpYi5Xb3JkQXJyYXkucmFuZG9tKDE2KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgcmFuZG9tOiBmdW5jdGlvbiAobkJ5dGVzKSB7XHJcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gW107XHJcblxyXG5cdCAgICAgICAgICAgIHZhciByID0gKGZ1bmN0aW9uIChtX3cpIHtcclxuXHQgICAgICAgICAgICAgICAgdmFyIG1fdyA9IG1fdztcclxuXHQgICAgICAgICAgICAgICAgdmFyIG1feiA9IDB4M2FkZTY4YjE7XHJcblx0ICAgICAgICAgICAgICAgIHZhciBtYXNrID0gMHhmZmZmZmZmZjtcclxuXHJcblx0ICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICBtX3ogPSAoMHg5MDY5ICogKG1feiAmIDB4RkZGRikgKyAobV96ID4+IDB4MTApKSAmIG1hc2s7XHJcblx0ICAgICAgICAgICAgICAgICAgICBtX3cgPSAoMHg0NjUwICogKG1fdyAmIDB4RkZGRikgKyAobV93ID4+IDB4MTApKSAmIG1hc2s7XHJcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gKChtX3ogPDwgMHgxMCkgKyBtX3cpICYgbWFzaztcclxuXHQgICAgICAgICAgICAgICAgICAgIHJlc3VsdCAvPSAweDEwMDAwMDAwMDtcclxuXHQgICAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSAwLjU7XHJcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0ICogKE1hdGgucmFuZG9tKCkgPiAuNSA/IDEgOiAtMSk7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB9KTtcclxuXHJcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIHJjYWNoZTsgaSA8IG5CeXRlczsgaSArPSA0KSB7XHJcblx0ICAgICAgICAgICAgICAgIHZhciBfciA9IHIoKHJjYWNoZSB8fCBNYXRoLnJhbmRvbSgpKSAqIDB4MTAwMDAwMDAwKTtcclxuXHJcblx0ICAgICAgICAgICAgICAgIHJjYWNoZSA9IF9yKCkgKiAweDNhZGU2N2I3O1xyXG5cdCAgICAgICAgICAgICAgICB3b3Jkcy5wdXNoKChfcigpICogMHgxMDAwMDAwMDApIHwgMCk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRBcnJheS5pbml0KHdvcmRzLCBuQnl0ZXMpO1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9KTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBFbmNvZGVyIG5hbWVzcGFjZS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBDX2VuYyA9IEMuZW5jID0ge307XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogSGV4IGVuY29kaW5nIHN0cmF0ZWd5LlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIEhleCA9IENfZW5jLkhleCA9IHtcclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29udmVydHMgYSB3b3JkIGFycmF5IHRvIGEgaGV4IHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheX0gd29yZEFycmF5IFRoZSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGhleCBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBoZXhTdHJpbmcgPSBDcnlwdG9KUy5lbmMuSGV4LnN0cmluZ2lmeSh3b3JkQXJyYXkpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBzdHJpbmdpZnk6IGZ1bmN0aW9uICh3b3JkQXJyYXkpIHtcclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcclxuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSB3b3JkQXJyYXkud29yZHM7XHJcblx0ICAgICAgICAgICAgdmFyIHNpZ0J5dGVzID0gd29yZEFycmF5LnNpZ0J5dGVzO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDb252ZXJ0XHJcblx0ICAgICAgICAgICAgdmFyIGhleENoYXJzID0gW107XHJcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWdCeXRlczsgaSsrKSB7XHJcblx0ICAgICAgICAgICAgICAgIHZhciBiaXRlID0gKHdvcmRzW2kgPj4+IDJdID4+PiAoMjQgLSAoaSAlIDQpICogOCkpICYgMHhmZjtcclxuXHQgICAgICAgICAgICAgICAgaGV4Q2hhcnMucHVzaCgoYml0ZSA+Pj4gNCkudG9TdHJpbmcoMTYpKTtcclxuXHQgICAgICAgICAgICAgICAgaGV4Q2hhcnMucHVzaCgoYml0ZSAmIDB4MGYpLnRvU3RyaW5nKDE2KSk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICByZXR1cm4gaGV4Q2hhcnMuam9pbignJyk7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29udmVydHMgYSBoZXggc3RyaW5nIHRvIGEgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGV4U3RyIFRoZSBoZXggc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5lbmMuSGV4LnBhcnNlKGhleFN0cmluZyk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHBhcnNlOiBmdW5jdGlvbiAoaGV4U3RyKSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRcclxuXHQgICAgICAgICAgICB2YXIgaGV4U3RyTGVuZ3RoID0gaGV4U3RyLmxlbmd0aDtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ29udmVydFxyXG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IFtdO1xyXG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGV4U3RyTGVuZ3RoOyBpICs9IDIpIHtcclxuXHQgICAgICAgICAgICAgICAgd29yZHNbaSA+Pj4gM10gfD0gcGFyc2VJbnQoaGV4U3RyLnN1YnN0cihpLCAyKSwgMTYpIDw8ICgyNCAtIChpICUgOCkgKiA0KTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBuZXcgV29yZEFycmF5LmluaXQod29yZHMsIGhleFN0ckxlbmd0aCAvIDIpO1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9O1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIExhdGluMSBlbmNvZGluZyBzdHJhdGVneS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBMYXRpbjEgPSBDX2VuYy5MYXRpbjEgPSB7XHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgd29yZCBhcnJheSB0byBhIExhdGluMSBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl9IHdvcmRBcnJheSBUaGUgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBMYXRpbjEgc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgbGF0aW4xU3RyaW5nID0gQ3J5cHRvSlMuZW5jLkxhdGluMS5zdHJpbmdpZnkod29yZEFycmF5KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgc3RyaW5naWZ5OiBmdW5jdGlvbiAod29yZEFycmF5KSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXHJcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gd29yZEFycmF5LndvcmRzO1xyXG5cdCAgICAgICAgICAgIHZhciBzaWdCeXRlcyA9IHdvcmRBcnJheS5zaWdCeXRlcztcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ29udmVydFxyXG5cdCAgICAgICAgICAgIHZhciBsYXRpbjFDaGFycyA9IFtdO1xyXG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2lnQnl0ZXM7IGkrKykge1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgYml0ZSA9ICh3b3Jkc1tpID4+PiAyXSA+Pj4gKDI0IC0gKGkgJSA0KSAqIDgpKSAmIDB4ZmY7XHJcblx0ICAgICAgICAgICAgICAgIGxhdGluMUNoYXJzLnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZShiaXRlKSk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICByZXR1cm4gbGF0aW4xQ2hhcnMuam9pbignJyk7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29udmVydHMgYSBMYXRpbjEgc3RyaW5nIHRvIGEgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGF0aW4xU3RyIFRoZSBMYXRpbjEgc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5lbmMuTGF0aW4xLnBhcnNlKGxhdGluMVN0cmluZyk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHBhcnNlOiBmdW5jdGlvbiAobGF0aW4xU3RyKSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRcclxuXHQgICAgICAgICAgICB2YXIgbGF0aW4xU3RyTGVuZ3RoID0gbGF0aW4xU3RyLmxlbmd0aDtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ29udmVydFxyXG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IFtdO1xyXG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGF0aW4xU3RyTGVuZ3RoOyBpKyspIHtcclxuXHQgICAgICAgICAgICAgICAgd29yZHNbaSA+Pj4gMl0gfD0gKGxhdGluMVN0ci5jaGFyQ29kZUF0KGkpICYgMHhmZikgPDwgKDI0IC0gKGkgJSA0KSAqIDgpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkQXJyYXkuaW5pdCh3b3JkcywgbGF0aW4xU3RyTGVuZ3RoKTtcclxuXHQgICAgICAgIH1cclxuXHQgICAgfTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBVVEYtOCBlbmNvZGluZyBzdHJhdGVneS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBVdGY4ID0gQ19lbmMuVXRmOCA9IHtcclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29udmVydHMgYSB3b3JkIGFycmF5IHRvIGEgVVRGLTggc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fSB3b3JkQXJyYXkgVGhlIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgVVRGLTggc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgdXRmOFN0cmluZyA9IENyeXB0b0pTLmVuYy5VdGY4LnN0cmluZ2lmeSh3b3JkQXJyYXkpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBzdHJpbmdpZnk6IGZ1bmN0aW9uICh3b3JkQXJyYXkpIHtcclxuXHQgICAgICAgICAgICB0cnkge1xyXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShMYXRpbjEuc3RyaW5naWZ5KHdvcmRBcnJheSkpKTtcclxuXHQgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcblx0ICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWFsZm9ybWVkIFVURi04IGRhdGEnKTtcclxuXHQgICAgICAgICAgICB9XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29udmVydHMgYSBVVEYtOCBzdHJpbmcgdG8gYSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1dGY4U3RyIFRoZSBVVEYtOCBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmVuYy5VdGY4LnBhcnNlKHV0ZjhTdHJpbmcpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBwYXJzZTogZnVuY3Rpb24gKHV0ZjhTdHIpIHtcclxuXHQgICAgICAgICAgICByZXR1cm4gTGF0aW4xLnBhcnNlKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudCh1dGY4U3RyKSkpO1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9O1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIEFic3RyYWN0IGJ1ZmZlcmVkIGJsb2NrIGFsZ29yaXRobSB0ZW1wbGF0ZS5cclxuXHQgICAgICpcclxuXHQgICAgICogVGhlIHByb3BlcnR5IGJsb2NrU2l6ZSBtdXN0IGJlIGltcGxlbWVudGVkIGluIGEgY29uY3JldGUgc3VidHlwZS5cclxuXHQgICAgICpcclxuXHQgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IF9taW5CdWZmZXJTaXplIFRoZSBudW1iZXIgb2YgYmxvY2tzIHRoYXQgc2hvdWxkIGJlIGtlcHQgdW5wcm9jZXNzZWQgaW4gdGhlIGJ1ZmZlci4gRGVmYXVsdDogMFxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIEJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0gPSBDX2xpYi5CdWZmZXJlZEJsb2NrQWxnb3JpdGhtID0gQmFzZS5leHRlbmQoe1xyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBSZXNldHMgdGhpcyBibG9jayBhbGdvcml0aG0ncyBkYXRhIGJ1ZmZlciB0byBpdHMgaW5pdGlhbCBzdGF0ZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLnJlc2V0KCk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgLy8gSW5pdGlhbCB2YWx1ZXNcclxuXHQgICAgICAgICAgICB0aGlzLl9kYXRhID0gbmV3IFdvcmRBcnJheS5pbml0KCk7XHJcblx0ICAgICAgICAgICAgdGhpcy5fbkRhdGFCeXRlcyA9IDA7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQWRkcyBuZXcgZGF0YSB0byB0aGlzIGJsb2NrIGFsZ29yaXRobSdzIGJ1ZmZlci5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IGRhdGEgVGhlIGRhdGEgdG8gYXBwZW5kLiBTdHJpbmdzIGFyZSBjb252ZXJ0ZWQgdG8gYSBXb3JkQXJyYXkgdXNpbmcgVVRGLTguXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5fYXBwZW5kKCdkYXRhJyk7XHJcblx0ICAgICAgICAgKiAgICAgYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5fYXBwZW5kKHdvcmRBcnJheSk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIF9hcHBlbmQ6IGZ1bmN0aW9uIChkYXRhKSB7XHJcblx0ICAgICAgICAgICAgLy8gQ29udmVydCBzdHJpbmcgdG8gV29yZEFycmF5LCBlbHNlIGFzc3VtZSBXb3JkQXJyYXkgYWxyZWFkeVxyXG5cdCAgICAgICAgICAgIGlmICh0eXBlb2YgZGF0YSA9PSAnc3RyaW5nJykge1xyXG5cdCAgICAgICAgICAgICAgICBkYXRhID0gVXRmOC5wYXJzZShkYXRhKTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIC8vIEFwcGVuZFxyXG5cdCAgICAgICAgICAgIHRoaXMuX2RhdGEuY29uY2F0KGRhdGEpO1xyXG5cdCAgICAgICAgICAgIHRoaXMuX25EYXRhQnl0ZXMgKz0gZGF0YS5zaWdCeXRlcztcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBQcm9jZXNzZXMgYXZhaWxhYmxlIGRhdGEgYmxvY2tzLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIFRoaXMgbWV0aG9kIGludm9rZXMgX2RvUHJvY2Vzc0Jsb2NrKG9mZnNldCksIHdoaWNoIG11c3QgYmUgaW1wbGVtZW50ZWQgYnkgYSBjb25jcmV0ZSBzdWJ0eXBlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gZG9GbHVzaCBXaGV0aGVyIGFsbCBibG9ja3MgYW5kIHBhcnRpYWwgYmxvY2tzIHNob3VsZCBiZSBwcm9jZXNzZWQuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgcHJvY2Vzc2VkIGRhdGEuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIHByb2Nlc3NlZERhdGEgPSBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLl9wcm9jZXNzKCk7XHJcblx0ICAgICAgICAgKiAgICAgdmFyIHByb2Nlc3NlZERhdGEgPSBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLl9wcm9jZXNzKCEhJ2ZsdXNoJyk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIF9wcm9jZXNzOiBmdW5jdGlvbiAoZG9GbHVzaCkge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YTtcclxuXHQgICAgICAgICAgICB2YXIgZGF0YVdvcmRzID0gZGF0YS53b3JkcztcclxuXHQgICAgICAgICAgICB2YXIgZGF0YVNpZ0J5dGVzID0gZGF0YS5zaWdCeXRlcztcclxuXHQgICAgICAgICAgICB2YXIgYmxvY2tTaXplID0gdGhpcy5ibG9ja1NpemU7XHJcblx0ICAgICAgICAgICAgdmFyIGJsb2NrU2l6ZUJ5dGVzID0gYmxvY2tTaXplICogNDtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ291bnQgYmxvY2tzIHJlYWR5XHJcblx0ICAgICAgICAgICAgdmFyIG5CbG9ja3NSZWFkeSA9IGRhdGFTaWdCeXRlcyAvIGJsb2NrU2l6ZUJ5dGVzO1xyXG5cdCAgICAgICAgICAgIGlmIChkb0ZsdXNoKSB7XHJcblx0ICAgICAgICAgICAgICAgIC8vIFJvdW5kIHVwIHRvIGluY2x1ZGUgcGFydGlhbCBibG9ja3NcclxuXHQgICAgICAgICAgICAgICAgbkJsb2Nrc1JlYWR5ID0gTWF0aC5jZWlsKG5CbG9ja3NSZWFkeSk7XHJcblx0ICAgICAgICAgICAgfSBlbHNlIHtcclxuXHQgICAgICAgICAgICAgICAgLy8gUm91bmQgZG93biB0byBpbmNsdWRlIG9ubHkgZnVsbCBibG9ja3MsXHJcblx0ICAgICAgICAgICAgICAgIC8vIGxlc3MgdGhlIG51bWJlciBvZiBibG9ja3MgdGhhdCBtdXN0IHJlbWFpbiBpbiB0aGUgYnVmZmVyXHJcblx0ICAgICAgICAgICAgICAgIG5CbG9ja3NSZWFkeSA9IE1hdGgubWF4KChuQmxvY2tzUmVhZHkgfCAwKSAtIHRoaXMuX21pbkJ1ZmZlclNpemUsIDApO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgLy8gQ291bnQgd29yZHMgcmVhZHlcclxuXHQgICAgICAgICAgICB2YXIgbldvcmRzUmVhZHkgPSBuQmxvY2tzUmVhZHkgKiBibG9ja1NpemU7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvdW50IGJ5dGVzIHJlYWR5XHJcblx0ICAgICAgICAgICAgdmFyIG5CeXRlc1JlYWR5ID0gTWF0aC5taW4obldvcmRzUmVhZHkgKiA0LCBkYXRhU2lnQnl0ZXMpO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBQcm9jZXNzIGJsb2Nrc1xyXG5cdCAgICAgICAgICAgIGlmIChuV29yZHNSZWFkeSkge1xyXG5cdCAgICAgICAgICAgICAgICBmb3IgKHZhciBvZmZzZXQgPSAwOyBvZmZzZXQgPCBuV29yZHNSZWFkeTsgb2Zmc2V0ICs9IGJsb2NrU2l6ZSkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgLy8gUGVyZm9ybSBjb25jcmV0ZS1hbGdvcml0aG0gbG9naWNcclxuXHQgICAgICAgICAgICAgICAgICAgIHRoaXMuX2RvUHJvY2Vzc0Jsb2NrKGRhdGFXb3Jkcywgb2Zmc2V0KTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHByb2Nlc3NlZCB3b3Jkc1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgcHJvY2Vzc2VkV29yZHMgPSBkYXRhV29yZHMuc3BsaWNlKDAsIG5Xb3Jkc1JlYWR5KTtcclxuXHQgICAgICAgICAgICAgICAgZGF0YS5zaWdCeXRlcyAtPSBuQnl0ZXNSZWFkeTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFJldHVybiBwcm9jZXNzZWQgd29yZHNcclxuXHQgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRBcnJheS5pbml0KHByb2Nlc3NlZFdvcmRzLCBuQnl0ZXNSZWFkeSk7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ3JlYXRlcyBhIGNvcHkgb2YgdGhpcyBvYmplY3QuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgY2xvbmUuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIGNsb25lID0gYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5jbG9uZSgpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIHZhciBjbG9uZSA9IEJhc2UuY2xvbmUuY2FsbCh0aGlzKTtcclxuXHQgICAgICAgICAgICBjbG9uZS5fZGF0YSA9IHRoaXMuX2RhdGEuY2xvbmUoKTtcclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIGNsb25lO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICBfbWluQnVmZmVyU2l6ZTogMFxyXG5cdCAgICB9KTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBBYnN0cmFjdCBoYXNoZXIgdGVtcGxhdGUuXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBibG9ja1NpemUgVGhlIG51bWJlciBvZiAzMi1iaXQgd29yZHMgdGhpcyBoYXNoZXIgb3BlcmF0ZXMgb24uIERlZmF1bHQ6IDE2ICg1MTIgYml0cylcclxuXHQgICAgICovXHJcblx0ICAgIHZhciBIYXNoZXIgPSBDX2xpYi5IYXNoZXIgPSBCdWZmZXJlZEJsb2NrQWxnb3JpdGhtLmV4dGVuZCh7XHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbmZpZ3VyYXRpb24gb3B0aW9ucy5cclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgY2ZnOiBCYXNlLmV4dGVuZCgpLFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogSW5pdGlhbGl6ZXMgYSBuZXdseSBjcmVhdGVkIGhhc2hlci5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gY2ZnIChPcHRpb25hbCkgVGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyB0byB1c2UgZm9yIHRoaXMgaGFzaCBjb21wdXRhdGlvbi5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgaGFzaGVyID0gQ3J5cHRvSlMuYWxnby5TSEEyNTYuY3JlYXRlKCk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGluaXQ6IGZ1bmN0aW9uIChjZmcpIHtcclxuXHQgICAgICAgICAgICAvLyBBcHBseSBjb25maWcgZGVmYXVsdHNcclxuXHQgICAgICAgICAgICB0aGlzLmNmZyA9IHRoaXMuY2ZnLmV4dGVuZChjZmcpO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBTZXQgaW5pdGlhbCB2YWx1ZXNcclxuXHQgICAgICAgICAgICB0aGlzLnJlc2V0KCk7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogUmVzZXRzIHRoaXMgaGFzaGVyIHRvIGl0cyBpbml0aWFsIHN0YXRlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIGhhc2hlci5yZXNldCgpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICByZXNldDogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIC8vIFJlc2V0IGRhdGEgYnVmZmVyXHJcblx0ICAgICAgICAgICAgQnVmZmVyZWRCbG9ja0FsZ29yaXRobS5yZXNldC5jYWxsKHRoaXMpO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbmNyZXRlLWhhc2hlciBsb2dpY1xyXG5cdCAgICAgICAgICAgIHRoaXMuX2RvUmVzZXQoKTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBVcGRhdGVzIHRoaXMgaGFzaGVyIHdpdGggYSBtZXNzYWdlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gbWVzc2FnZVVwZGF0ZSBUaGUgbWVzc2FnZSB0byBhcHBlbmQuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7SGFzaGVyfSBUaGlzIGhhc2hlci5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICBoYXNoZXIudXBkYXRlKCdtZXNzYWdlJyk7XHJcblx0ICAgICAgICAgKiAgICAgaGFzaGVyLnVwZGF0ZSh3b3JkQXJyYXkpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChtZXNzYWdlVXBkYXRlKSB7XHJcblx0ICAgICAgICAgICAgLy8gQXBwZW5kXHJcblx0ICAgICAgICAgICAgdGhpcy5fYXBwZW5kKG1lc3NhZ2VVcGRhdGUpO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGhhc2hcclxuXHQgICAgICAgICAgICB0aGlzLl9wcm9jZXNzKCk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENoYWluYWJsZVxyXG5cdCAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIEZpbmFsaXplcyB0aGUgaGFzaCBjb21wdXRhdGlvbi5cclxuXHQgICAgICAgICAqIE5vdGUgdGhhdCB0aGUgZmluYWxpemUgb3BlcmF0aW9uIGlzIGVmZmVjdGl2ZWx5IGEgZGVzdHJ1Y3RpdmUsIHJlYWQtb25jZSBvcGVyYXRpb24uXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlVXBkYXRlIChPcHRpb25hbCkgQSBmaW5hbCBtZXNzYWdlIHVwZGF0ZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBoYXNoLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBoYXNoID0gaGFzaGVyLmZpbmFsaXplKCk7XHJcblx0ICAgICAgICAgKiAgICAgdmFyIGhhc2ggPSBoYXNoZXIuZmluYWxpemUoJ21lc3NhZ2UnKTtcclxuXHQgICAgICAgICAqICAgICB2YXIgaGFzaCA9IGhhc2hlci5maW5hbGl6ZSh3b3JkQXJyYXkpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBmaW5hbGl6ZTogZnVuY3Rpb24gKG1lc3NhZ2VVcGRhdGUpIHtcclxuXHQgICAgICAgICAgICAvLyBGaW5hbCBtZXNzYWdlIHVwZGF0ZVxyXG5cdCAgICAgICAgICAgIGlmIChtZXNzYWdlVXBkYXRlKSB7XHJcblx0ICAgICAgICAgICAgICAgIHRoaXMuX2FwcGVuZChtZXNzYWdlVXBkYXRlKTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFBlcmZvcm0gY29uY3JldGUtaGFzaGVyIGxvZ2ljXHJcblx0ICAgICAgICAgICAgdmFyIGhhc2ggPSB0aGlzLl9kb0ZpbmFsaXplKCk7XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBoYXNoO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICBibG9ja1NpemU6IDUxMi8zMixcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENyZWF0ZXMgYSBzaG9ydGN1dCBmdW5jdGlvbiB0byBhIGhhc2hlcidzIG9iamVjdCBpbnRlcmZhY2UuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtIYXNoZXJ9IGhhc2hlciBUaGUgaGFzaGVyIHRvIGNyZWF0ZSBhIGhlbHBlciBmb3IuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBzaG9ydGN1dCBmdW5jdGlvbi5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIFNIQTI1NiA9IENyeXB0b0pTLmxpYi5IYXNoZXIuX2NyZWF0ZUhlbHBlcihDcnlwdG9KUy5hbGdvLlNIQTI1Nik7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIF9jcmVhdGVIZWxwZXI6IGZ1bmN0aW9uIChoYXNoZXIpIHtcclxuXHQgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG1lc3NhZ2UsIGNmZykge1xyXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gbmV3IGhhc2hlci5pbml0KGNmZykuZmluYWxpemUobWVzc2FnZSk7XHJcblx0ICAgICAgICAgICAgfTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDcmVhdGVzIGEgc2hvcnRjdXQgZnVuY3Rpb24gdG8gdGhlIEhNQUMncyBvYmplY3QgaW50ZXJmYWNlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7SGFzaGVyfSBoYXNoZXIgVGhlIGhhc2hlciB0byB1c2UgaW4gdGhpcyBITUFDIGhlbHBlci5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIHNob3J0Y3V0IGZ1bmN0aW9uLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgSG1hY1NIQTI1NiA9IENyeXB0b0pTLmxpYi5IYXNoZXIuX2NyZWF0ZUhtYWNIZWxwZXIoQ3J5cHRvSlMuYWxnby5TSEEyNTYpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBfY3JlYXRlSG1hY0hlbHBlcjogZnVuY3Rpb24gKGhhc2hlcikge1xyXG5cdCAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAobWVzc2FnZSwga2V5KSB7XHJcblx0ICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ19hbGdvLkhNQUMuaW5pdChoYXNoZXIsIGtleSkuZmluYWxpemUobWVzc2FnZSk7XHJcblx0ICAgICAgICAgICAgfTtcclxuXHQgICAgICAgIH1cclxuXHQgICAgfSk7XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogQWxnb3JpdGhtIG5hbWVzcGFjZS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBDX2FsZ28gPSBDLmFsZ28gPSB7fTtcclxuXHJcblx0ICAgIHJldHVybiBDO1xyXG5cdH0oTWF0aCkpO1xyXG5cclxuXHJcblx0cmV0dXJuIENyeXB0b0pTO1xyXG5cclxufSkpOyIsIjsoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcclxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuXHRcdC8vIENvbW1vbkpTXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCIuL2NvcmVcIikpO1xyXG5cdH1cclxuXHRlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xyXG5cdFx0Ly8gQU1EXHJcblx0XHRkZWZpbmUoW1wiLi9jb3JlXCJdLCBmYWN0b3J5KTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHQvLyBHbG9iYWwgKGJyb3dzZXIpXHJcblx0XHRmYWN0b3J5KHJvb3QuQ3J5cHRvSlMpO1xyXG5cdH1cclxufSh0aGlzLCBmdW5jdGlvbiAoQ3J5cHRvSlMpIHtcclxuXHJcblx0cmV0dXJuIENyeXB0b0pTLmVuYy5IZXg7XHJcblxyXG59KSk7IiwiOyhmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSwgdW5kZWYpIHtcclxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuXHRcdC8vIENvbW1vbkpTXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCIuL2NvcmVcIiksIHJlcXVpcmUoXCIuL3NoYTI1NlwiKSwgcmVxdWlyZShcIi4vaG1hY1wiKSk7XHJcblx0fVxyXG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XHJcblx0XHQvLyBBTURcclxuXHRcdGRlZmluZShbXCIuL2NvcmVcIiwgXCIuL3NoYTI1NlwiLCBcIi4vaG1hY1wiXSwgZmFjdG9yeSk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Ly8gR2xvYmFsIChicm93c2VyKVxyXG5cdFx0ZmFjdG9yeShyb290LkNyeXB0b0pTKTtcclxuXHR9XHJcbn0odGhpcywgZnVuY3Rpb24gKENyeXB0b0pTKSB7XHJcblxyXG5cdHJldHVybiBDcnlwdG9KUy5IbWFjU0hBMjU2O1xyXG5cclxufSkpOyIsIjsoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcclxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuXHRcdC8vIENvbW1vbkpTXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCIuL2NvcmVcIikpO1xyXG5cdH1cclxuXHRlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xyXG5cdFx0Ly8gQU1EXHJcblx0XHRkZWZpbmUoW1wiLi9jb3JlXCJdLCBmYWN0b3J5KTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHQvLyBHbG9iYWwgKGJyb3dzZXIpXHJcblx0XHRmYWN0b3J5KHJvb3QuQ3J5cHRvSlMpO1xyXG5cdH1cclxufSh0aGlzLCBmdW5jdGlvbiAoQ3J5cHRvSlMpIHtcclxuXHJcblx0KGZ1bmN0aW9uICgpIHtcclxuXHQgICAgLy8gU2hvcnRjdXRzXHJcblx0ICAgIHZhciBDID0gQ3J5cHRvSlM7XHJcblx0ICAgIHZhciBDX2xpYiA9IEMubGliO1xyXG5cdCAgICB2YXIgQmFzZSA9IENfbGliLkJhc2U7XHJcblx0ICAgIHZhciBDX2VuYyA9IEMuZW5jO1xyXG5cdCAgICB2YXIgVXRmOCA9IENfZW5jLlV0Zjg7XHJcblx0ICAgIHZhciBDX2FsZ28gPSBDLmFsZ287XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogSE1BQyBhbGdvcml0aG0uXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgSE1BQyA9IENfYWxnby5ITUFDID0gQmFzZS5leHRlbmQoe1xyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBJbml0aWFsaXplcyBhIG5ld2x5IGNyZWF0ZWQgSE1BQy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge0hhc2hlcn0gaGFzaGVyIFRoZSBoYXNoIGFsZ29yaXRobSB0byB1c2UuXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IGtleSBUaGUgc2VjcmV0IGtleS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgaG1hY0hhc2hlciA9IENyeXB0b0pTLmFsZ28uSE1BQy5jcmVhdGUoQ3J5cHRvSlMuYWxnby5TSEEyNTYsIGtleSk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGluaXQ6IGZ1bmN0aW9uIChoYXNoZXIsIGtleSkge1xyXG5cdCAgICAgICAgICAgIC8vIEluaXQgaGFzaGVyXHJcblx0ICAgICAgICAgICAgaGFzaGVyID0gdGhpcy5faGFzaGVyID0gbmV3IGhhc2hlci5pbml0KCk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnQgc3RyaW5nIHRvIFdvcmRBcnJheSwgZWxzZSBhc3N1bWUgV29yZEFycmF5IGFscmVhZHlcclxuXHQgICAgICAgICAgICBpZiAodHlwZW9mIGtleSA9PSAnc3RyaW5nJykge1xyXG5cdCAgICAgICAgICAgICAgICBrZXkgPSBVdGY4LnBhcnNlKGtleSk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcclxuXHQgICAgICAgICAgICB2YXIgaGFzaGVyQmxvY2tTaXplID0gaGFzaGVyLmJsb2NrU2l6ZTtcclxuXHQgICAgICAgICAgICB2YXIgaGFzaGVyQmxvY2tTaXplQnl0ZXMgPSBoYXNoZXJCbG9ja1NpemUgKiA0O1xyXG5cclxuXHQgICAgICAgICAgICAvLyBBbGxvdyBhcmJpdHJhcnkgbGVuZ3RoIGtleXNcclxuXHQgICAgICAgICAgICBpZiAoa2V5LnNpZ0J5dGVzID4gaGFzaGVyQmxvY2tTaXplQnl0ZXMpIHtcclxuXHQgICAgICAgICAgICAgICAga2V5ID0gaGFzaGVyLmZpbmFsaXplKGtleSk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAvLyBDbGFtcCBleGNlc3MgYml0c1xyXG5cdCAgICAgICAgICAgIGtleS5jbGFtcCgpO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDbG9uZSBrZXkgZm9yIGlubmVyIGFuZCBvdXRlciBwYWRzXHJcblx0ICAgICAgICAgICAgdmFyIG9LZXkgPSB0aGlzLl9vS2V5ID0ga2V5LmNsb25lKCk7XHJcblx0ICAgICAgICAgICAgdmFyIGlLZXkgPSB0aGlzLl9pS2V5ID0ga2V5LmNsb25lKCk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICAgICAgICAgIHZhciBvS2V5V29yZHMgPSBvS2V5LndvcmRzO1xyXG5cdCAgICAgICAgICAgIHZhciBpS2V5V29yZHMgPSBpS2V5LndvcmRzO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBYT1Iga2V5cyB3aXRoIHBhZCBjb25zdGFudHNcclxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhhc2hlckJsb2NrU2l6ZTsgaSsrKSB7XHJcblx0ICAgICAgICAgICAgICAgIG9LZXlXb3Jkc1tpXSBePSAweDVjNWM1YzVjO1xyXG5cdCAgICAgICAgICAgICAgICBpS2V5V29yZHNbaV0gXj0gMHgzNjM2MzYzNjtcclxuXHQgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgb0tleS5zaWdCeXRlcyA9IGlLZXkuc2lnQnl0ZXMgPSBoYXNoZXJCbG9ja1NpemVCeXRlcztcclxuXHJcblx0ICAgICAgICAgICAgLy8gU2V0IGluaXRpYWwgdmFsdWVzXHJcblx0ICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIFJlc2V0cyB0aGlzIEhNQUMgdG8gaXRzIGluaXRpYWwgc3RhdGUuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgaG1hY0hhc2hlci5yZXNldCgpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICByZXNldDogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0XHJcblx0ICAgICAgICAgICAgdmFyIGhhc2hlciA9IHRoaXMuX2hhc2hlcjtcclxuXHJcblx0ICAgICAgICAgICAgLy8gUmVzZXRcclxuXHQgICAgICAgICAgICBoYXNoZXIucmVzZXQoKTtcclxuXHQgICAgICAgICAgICBoYXNoZXIudXBkYXRlKHRoaXMuX2lLZXkpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIFVwZGF0ZXMgdGhpcyBITUFDIHdpdGggYSBtZXNzYWdlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gbWVzc2FnZVVwZGF0ZSBUaGUgbWVzc2FnZSB0byBhcHBlbmQuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7SE1BQ30gVGhpcyBITUFDIGluc3RhbmNlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIGhtYWNIYXNoZXIudXBkYXRlKCdtZXNzYWdlJyk7XHJcblx0ICAgICAgICAgKiAgICAgaG1hY0hhc2hlci51cGRhdGUod29yZEFycmF5KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAobWVzc2FnZVVwZGF0ZSkge1xyXG5cdCAgICAgICAgICAgIHRoaXMuX2hhc2hlci51cGRhdGUobWVzc2FnZVVwZGF0ZSk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENoYWluYWJsZVxyXG5cdCAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIEZpbmFsaXplcyB0aGUgSE1BQyBjb21wdXRhdGlvbi5cclxuXHQgICAgICAgICAqIE5vdGUgdGhhdCB0aGUgZmluYWxpemUgb3BlcmF0aW9uIGlzIGVmZmVjdGl2ZWx5IGEgZGVzdHJ1Y3RpdmUsIHJlYWQtb25jZSBvcGVyYXRpb24uXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlVXBkYXRlIChPcHRpb25hbCkgQSBmaW5hbCBtZXNzYWdlIHVwZGF0ZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBITUFDLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBobWFjID0gaG1hY0hhc2hlci5maW5hbGl6ZSgpO1xyXG5cdCAgICAgICAgICogICAgIHZhciBobWFjID0gaG1hY0hhc2hlci5maW5hbGl6ZSgnbWVzc2FnZScpO1xyXG5cdCAgICAgICAgICogICAgIHZhciBobWFjID0gaG1hY0hhc2hlci5maW5hbGl6ZSh3b3JkQXJyYXkpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBmaW5hbGl6ZTogZnVuY3Rpb24gKG1lc3NhZ2VVcGRhdGUpIHtcclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dFxyXG5cdCAgICAgICAgICAgIHZhciBoYXNoZXIgPSB0aGlzLl9oYXNoZXI7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvbXB1dGUgSE1BQ1xyXG5cdCAgICAgICAgICAgIHZhciBpbm5lckhhc2ggPSBoYXNoZXIuZmluYWxpemUobWVzc2FnZVVwZGF0ZSk7XHJcblx0ICAgICAgICAgICAgaGFzaGVyLnJlc2V0KCk7XHJcblx0ICAgICAgICAgICAgdmFyIGhtYWMgPSBoYXNoZXIuZmluYWxpemUodGhpcy5fb0tleS5jbG9uZSgpLmNvbmNhdChpbm5lckhhc2gpKTtcclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIGhtYWM7XHJcblx0ICAgICAgICB9XHJcblx0ICAgIH0pO1xyXG5cdH0oKSk7XHJcblxyXG5cclxufSkpOyIsIjsoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcclxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuXHRcdC8vIENvbW1vbkpTXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCIuL2NvcmVcIikpO1xyXG5cdH1cclxuXHRlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xyXG5cdFx0Ly8gQU1EXHJcblx0XHRkZWZpbmUoW1wiLi9jb3JlXCJdLCBmYWN0b3J5KTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHQvLyBHbG9iYWwgKGJyb3dzZXIpXHJcblx0XHRmYWN0b3J5KHJvb3QuQ3J5cHRvSlMpO1xyXG5cdH1cclxufSh0aGlzLCBmdW5jdGlvbiAoQ3J5cHRvSlMpIHtcclxuXHJcblx0KGZ1bmN0aW9uIChNYXRoKSB7XHJcblx0ICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICB2YXIgQyA9IENyeXB0b0pTO1xyXG5cdCAgICB2YXIgQ19saWIgPSBDLmxpYjtcclxuXHQgICAgdmFyIFdvcmRBcnJheSA9IENfbGliLldvcmRBcnJheTtcclxuXHQgICAgdmFyIEhhc2hlciA9IENfbGliLkhhc2hlcjtcclxuXHQgICAgdmFyIENfYWxnbyA9IEMuYWxnbztcclxuXHJcblx0ICAgIC8vIEluaXRpYWxpemF0aW9uIGFuZCByb3VuZCBjb25zdGFudHMgdGFibGVzXHJcblx0ICAgIHZhciBIID0gW107XHJcblx0ICAgIHZhciBLID0gW107XHJcblxyXG5cdCAgICAvLyBDb21wdXRlIGNvbnN0YW50c1xyXG5cdCAgICAoZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgZnVuY3Rpb24gaXNQcmltZShuKSB7XHJcblx0ICAgICAgICAgICAgdmFyIHNxcnROID0gTWF0aC5zcXJ0KG4pO1xyXG5cdCAgICAgICAgICAgIGZvciAodmFyIGZhY3RvciA9IDI7IGZhY3RvciA8PSBzcXJ0TjsgZmFjdG9yKyspIHtcclxuXHQgICAgICAgICAgICAgICAgaWYgKCEobiAlIGZhY3RvcikpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblx0ICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgZnVuY3Rpb24gZ2V0RnJhY3Rpb25hbEJpdHMobikge1xyXG5cdCAgICAgICAgICAgIHJldHVybiAoKG4gLSAobiB8IDApKSAqIDB4MTAwMDAwMDAwKSB8IDA7XHJcblx0ICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgdmFyIG4gPSAyO1xyXG5cdCAgICAgICAgdmFyIG5QcmltZSA9IDA7XHJcblx0ICAgICAgICB3aGlsZSAoblByaW1lIDwgNjQpIHtcclxuXHQgICAgICAgICAgICBpZiAoaXNQcmltZShuKSkge1xyXG5cdCAgICAgICAgICAgICAgICBpZiAoblByaW1lIDwgOCkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgSFtuUHJpbWVdID0gZ2V0RnJhY3Rpb25hbEJpdHMoTWF0aC5wb3cobiwgMSAvIDIpKTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgICAgICBLW25QcmltZV0gPSBnZXRGcmFjdGlvbmFsQml0cyhNYXRoLnBvdyhuLCAxIC8gMykpO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgblByaW1lKys7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICBuKys7XHJcblx0ICAgICAgICB9XHJcblx0ICAgIH0oKSk7XHJcblxyXG5cdCAgICAvLyBSZXVzYWJsZSBvYmplY3RcclxuXHQgICAgdmFyIFcgPSBbXTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBTSEEtMjU2IGhhc2ggYWxnb3JpdGhtLlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIFNIQTI1NiA9IENfYWxnby5TSEEyNTYgPSBIYXNoZXIuZXh0ZW5kKHtcclxuXHQgICAgICAgIF9kb1Jlc2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgdGhpcy5faGFzaCA9IG5ldyBXb3JkQXJyYXkuaW5pdChILnNsaWNlKDApKTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgX2RvUHJvY2Vzc0Jsb2NrOiBmdW5jdGlvbiAoTSwgb2Zmc2V0KSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRcclxuXHQgICAgICAgICAgICB2YXIgSCA9IHRoaXMuX2hhc2gud29yZHM7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFdvcmtpbmcgdmFyaWFibGVzXHJcblx0ICAgICAgICAgICAgdmFyIGEgPSBIWzBdO1xyXG5cdCAgICAgICAgICAgIHZhciBiID0gSFsxXTtcclxuXHQgICAgICAgICAgICB2YXIgYyA9IEhbMl07XHJcblx0ICAgICAgICAgICAgdmFyIGQgPSBIWzNdO1xyXG5cdCAgICAgICAgICAgIHZhciBlID0gSFs0XTtcclxuXHQgICAgICAgICAgICB2YXIgZiA9IEhbNV07XHJcblx0ICAgICAgICAgICAgdmFyIGcgPSBIWzZdO1xyXG5cdCAgICAgICAgICAgIHZhciBoID0gSFs3XTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ29tcHV0YXRpb25cclxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcclxuXHQgICAgICAgICAgICAgICAgaWYgKGkgPCAxNikge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgV1tpXSA9IE1bb2Zmc2V0ICsgaV0gfCAwO1xyXG5cdCAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGdhbW1hMHggPSBXW2kgLSAxNV07XHJcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgZ2FtbWEwICA9ICgoZ2FtbWEweCA8PCAyNSkgfCAoZ2FtbWEweCA+Pj4gNykpICBeXHJcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgoZ2FtbWEweCA8PCAxNCkgfCAoZ2FtbWEweCA+Pj4gMTgpKSBeXHJcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZ2FtbWEweCA+Pj4gMyk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGdhbW1hMXggPSBXW2kgLSAyXTtcclxuXHQgICAgICAgICAgICAgICAgICAgIHZhciBnYW1tYTEgID0gKChnYW1tYTF4IDw8IDE1KSB8IChnYW1tYTF4ID4+PiAxNykpIF5cclxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKChnYW1tYTF4IDw8IDEzKSB8IChnYW1tYTF4ID4+PiAxOSkpIF5cclxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChnYW1tYTF4ID4+PiAxMCk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICAgICAgV1tpXSA9IGdhbW1hMCArIFdbaSAtIDddICsgZ2FtbWExICsgV1tpIC0gMTZdO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgICAgICB2YXIgY2ggID0gKGUgJiBmKSBeICh+ZSAmIGcpO1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgbWFqID0gKGEgJiBiKSBeIChhICYgYykgXiAoYiAmIGMpO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgdmFyIHNpZ21hMCA9ICgoYSA8PCAzMCkgfCAoYSA+Pj4gMikpIF4gKChhIDw8IDE5KSB8IChhID4+PiAxMykpIF4gKChhIDw8IDEwKSB8IChhID4+PiAyMikpO1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgc2lnbWExID0gKChlIDw8IDI2KSB8IChlID4+PiA2KSkgXiAoKGUgPDwgMjEpIHwgKGUgPj4+IDExKSkgXiAoKGUgPDwgNykgIHwgKGUgPj4+IDI1KSk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICB2YXIgdDEgPSBoICsgc2lnbWExICsgY2ggKyBLW2ldICsgV1tpXTtcclxuXHQgICAgICAgICAgICAgICAgdmFyIHQyID0gc2lnbWEwICsgbWFqO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgaCA9IGc7XHJcblx0ICAgICAgICAgICAgICAgIGcgPSBmO1xyXG5cdCAgICAgICAgICAgICAgICBmID0gZTtcclxuXHQgICAgICAgICAgICAgICAgZSA9IChkICsgdDEpIHwgMDtcclxuXHQgICAgICAgICAgICAgICAgZCA9IGM7XHJcblx0ICAgICAgICAgICAgICAgIGMgPSBiO1xyXG5cdCAgICAgICAgICAgICAgICBiID0gYTtcclxuXHQgICAgICAgICAgICAgICAgYSA9ICh0MSArIHQyKSB8IDA7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAvLyBJbnRlcm1lZGlhdGUgaGFzaCB2YWx1ZVxyXG5cdCAgICAgICAgICAgIEhbMF0gPSAoSFswXSArIGEpIHwgMDtcclxuXHQgICAgICAgICAgICBIWzFdID0gKEhbMV0gKyBiKSB8IDA7XHJcblx0ICAgICAgICAgICAgSFsyXSA9IChIWzJdICsgYykgfCAwO1xyXG5cdCAgICAgICAgICAgIEhbM10gPSAoSFszXSArIGQpIHwgMDtcclxuXHQgICAgICAgICAgICBIWzRdID0gKEhbNF0gKyBlKSB8IDA7XHJcblx0ICAgICAgICAgICAgSFs1XSA9IChIWzVdICsgZikgfCAwO1xyXG5cdCAgICAgICAgICAgIEhbNl0gPSAoSFs2XSArIGcpIHwgMDtcclxuXHQgICAgICAgICAgICBIWzddID0gKEhbN10gKyBoKSB8IDA7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIF9kb0ZpbmFsaXplOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXHJcblx0ICAgICAgICAgICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhO1xyXG5cdCAgICAgICAgICAgIHZhciBkYXRhV29yZHMgPSBkYXRhLndvcmRzO1xyXG5cclxuXHQgICAgICAgICAgICB2YXIgbkJpdHNUb3RhbCA9IHRoaXMuX25EYXRhQnl0ZXMgKiA4O1xyXG5cdCAgICAgICAgICAgIHZhciBuQml0c0xlZnQgPSBkYXRhLnNpZ0J5dGVzICogODtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQWRkIHBhZGRpbmdcclxuXHQgICAgICAgICAgICBkYXRhV29yZHNbbkJpdHNMZWZ0ID4+PiA1XSB8PSAweDgwIDw8ICgyNCAtIG5CaXRzTGVmdCAlIDMyKTtcclxuXHQgICAgICAgICAgICBkYXRhV29yZHNbKCgobkJpdHNMZWZ0ICsgNjQpID4+PiA5KSA8PCA0KSArIDE0XSA9IE1hdGguZmxvb3IobkJpdHNUb3RhbCAvIDB4MTAwMDAwMDAwKTtcclxuXHQgICAgICAgICAgICBkYXRhV29yZHNbKCgobkJpdHNMZWZ0ICsgNjQpID4+PiA5KSA8PCA0KSArIDE1XSA9IG5CaXRzVG90YWw7XHJcblx0ICAgICAgICAgICAgZGF0YS5zaWdCeXRlcyA9IGRhdGFXb3Jkcy5sZW5ndGggKiA0O1xyXG5cclxuXHQgICAgICAgICAgICAvLyBIYXNoIGZpbmFsIGJsb2Nrc1xyXG5cdCAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gUmV0dXJuIGZpbmFsIGNvbXB1dGVkIGhhc2hcclxuXHQgICAgICAgICAgICByZXR1cm4gdGhpcy5faGFzaDtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICB2YXIgY2xvbmUgPSBIYXNoZXIuY2xvbmUuY2FsbCh0aGlzKTtcclxuXHQgICAgICAgICAgICBjbG9uZS5faGFzaCA9IHRoaXMuX2hhc2guY2xvbmUoKTtcclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIGNsb25lO1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9KTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBTaG9ydGN1dCBmdW5jdGlvbiB0byB0aGUgaGFzaGVyJ3Mgb2JqZWN0IGludGVyZmFjZS5cclxuXHQgICAgICpcclxuXHQgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGhhc2guXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIGhhc2guXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBzdGF0aWNcclxuXHQgICAgICpcclxuXHQgICAgICogQGV4YW1wbGVcclxuXHQgICAgICpcclxuXHQgICAgICogICAgIHZhciBoYXNoID0gQ3J5cHRvSlMuU0hBMjU2KCdtZXNzYWdlJyk7XHJcblx0ICAgICAqICAgICB2YXIgaGFzaCA9IENyeXB0b0pTLlNIQTI1Nih3b3JkQXJyYXkpO1xyXG5cdCAgICAgKi9cclxuXHQgICAgQy5TSEEyNTYgPSBIYXNoZXIuX2NyZWF0ZUhlbHBlcihTSEEyNTYpO1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIFNob3J0Y3V0IGZ1bmN0aW9uIHRvIHRoZSBITUFDJ3Mgb2JqZWN0IGludGVyZmFjZS5cclxuXHQgICAgICpcclxuXHQgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGhhc2guXHJcblx0ICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30ga2V5IFRoZSBzZWNyZXQga2V5LlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBITUFDLlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAc3RhdGljXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAqXHJcblx0ICAgICAqICAgICB2YXIgaG1hYyA9IENyeXB0b0pTLkhtYWNTSEEyNTYobWVzc2FnZSwga2V5KTtcclxuXHQgICAgICovXHJcblx0ICAgIEMuSG1hY1NIQTI1NiA9IEhhc2hlci5fY3JlYXRlSG1hY0hlbHBlcihTSEEyNTYpO1xyXG5cdH0oTWF0aCkpO1xyXG5cclxuXHJcblx0cmV0dXJuIENyeXB0b0pTLlNIQTI1NjtcclxuXHJcbn0pKTsiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gdmltOnRzPTQ6c3RzPTQ6c3c9NDpcclxuLyohXHJcbiAqXHJcbiAqIENvcHlyaWdodCAyMDA5LTIwMTIgS3JpcyBLb3dhbCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVFxyXG4gKiBsaWNlbnNlIGZvdW5kIGF0IGh0dHA6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xL3Jhdy9tYXN0ZXIvTElDRU5TRVxyXG4gKlxyXG4gKiBXaXRoIHBhcnRzIGJ5IFR5bGVyIENsb3NlXHJcbiAqIENvcHlyaWdodCAyMDA3LTIwMDkgVHlsZXIgQ2xvc2UgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBNSVQgWCBsaWNlbnNlIGZvdW5kXHJcbiAqIGF0IGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UuaHRtbFxyXG4gKiBGb3JrZWQgYXQgcmVmX3NlbmQuanMgdmVyc2lvbjogMjAwOS0wNS0xMVxyXG4gKlxyXG4gKiBXaXRoIHBhcnRzIGJ5IE1hcmsgTWlsbGVyXHJcbiAqIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xyXG4gICAgLy8gVHVybiBvZmYgc3RyaWN0IG1vZGUgZm9yIHRoaXMgZnVuY3Rpb24gc28gd2UgY2FuIGFzc2lnbiB0byBnbG9iYWwuUVxyXG4gICAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cclxuXHJcbiAgICAvLyBUaGlzIGZpbGUgd2lsbCBmdW5jdGlvbiBwcm9wZXJseSBhcyBhIDxzY3JpcHQ+IHRhZywgb3IgYSBtb2R1bGVcclxuICAgIC8vIHVzaW5nIENvbW1vbkpTIGFuZCBOb2RlSlMgb3IgUmVxdWlyZUpTIG1vZHVsZSBmb3JtYXRzLiAgSW5cclxuICAgIC8vIENvbW1vbi9Ob2RlL1JlcXVpcmVKUywgdGhlIG1vZHVsZSBleHBvcnRzIHRoZSBRIEFQSSBhbmQgd2hlblxyXG4gICAgLy8gZXhlY3V0ZWQgYXMgYSBzaW1wbGUgPHNjcmlwdD4sIGl0IGNyZWF0ZXMgYSBRIGdsb2JhbCBpbnN0ZWFkLlxyXG5cclxuICAgIC8vIE1vbnRhZ2UgUmVxdWlyZVxyXG4gICAgaWYgKHR5cGVvZiBib290c3RyYXAgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIGJvb3RzdHJhcChcInByb21pc2VcIiwgZGVmaW5pdGlvbik7XHJcblxyXG4gICAgLy8gQ29tbW9uSlNcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcclxuXHJcbiAgICAvLyBSZXF1aXJlSlNcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoZGVmaW5pdGlvbik7XHJcblxyXG4gICAgLy8gU0VTIChTZWN1cmUgRWNtYVNjcmlwdClcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNlcyAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgIGlmICghc2VzLm9rKCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNlcy5tYWtlUSA9IGRlZmluaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgIC8vIDxzY3JpcHQ+XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIFEgPSBkZWZpbml0aW9uKCk7XHJcbiAgICB9XHJcblxyXG59KShmdW5jdGlvbiAoKSB7XHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGhhc1N0YWNrcyA9IGZhbHNlO1xyXG50cnkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbn0gY2F0Y2ggKGUpIHtcclxuICAgIGhhc1N0YWNrcyA9ICEhZS5zdGFjaztcclxufVxyXG5cclxuLy8gQWxsIGNvZGUgYWZ0ZXIgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzIHJlcG9ydGVkXHJcbi8vIGJ5IFEuXHJcbnZhciBxU3RhcnRpbmdMaW5lID0gY2FwdHVyZUxpbmUoKTtcclxudmFyIHFGaWxlTmFtZTtcclxuXHJcbi8vIHNoaW1zXHJcblxyXG4vLyB1c2VkIGZvciBmYWxsYmFjayBpbiBcImFsbFJlc29sdmVkXCJcclxudmFyIG5vb3AgPSBmdW5jdGlvbiAoKSB7fTtcclxuXHJcbi8vIFVzZSB0aGUgZmFzdGVzdCBwb3NzaWJsZSBtZWFucyB0byBleGVjdXRlIGEgdGFzayBpbiBhIGZ1dHVyZSB0dXJuXHJcbi8vIG9mIHRoZSBldmVudCBsb29wLlxyXG52YXIgbmV4dFRpY2sgPShmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBsaW5rZWQgbGlzdCBvZiB0YXNrcyAoc2luZ2xlLCB3aXRoIGhlYWQgbm9kZSlcclxuICAgIHZhciBoZWFkID0ge3Rhc2s6IHZvaWQgMCwgbmV4dDogbnVsbH07XHJcbiAgICB2YXIgdGFpbCA9IGhlYWQ7XHJcbiAgICB2YXIgZmx1c2hpbmcgPSBmYWxzZTtcclxuICAgIHZhciByZXF1ZXN0VGljayA9IHZvaWQgMDtcclxuICAgIHZhciBpc05vZGVKUyA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIGZsdXNoKCkge1xyXG4gICAgICAgIC8qIGpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xyXG5cclxuICAgICAgICB3aGlsZSAoaGVhZC5uZXh0KSB7XHJcbiAgICAgICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XHJcbiAgICAgICAgICAgIHZhciB0YXNrID0gaGVhZC50YXNrO1xyXG4gICAgICAgICAgICBoZWFkLnRhc2sgPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHZhciBkb21haW4gPSBoZWFkLmRvbWFpbjtcclxuXHJcbiAgICAgICAgICAgIGlmIChkb21haW4pIHtcclxuICAgICAgICAgICAgICAgIGhlYWQuZG9tYWluID0gdm9pZCAwO1xyXG4gICAgICAgICAgICAgICAgZG9tYWluLmVudGVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0YXNrKCk7XHJcblxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSlMpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJbiBub2RlLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBjb25zaWRlcmVkIGZhdGFsIGVycm9ycy5cclxuICAgICAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIHN5bmNocm9ub3VzbHkgdG8gaW50ZXJydXB0IGZsdXNoaW5nIVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY29udGludWF0aW9uIGlmIHRoZSB1bmNhdWdodCBleGNlcHRpb24gaXMgc3VwcHJlc3NlZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGxpc3RlbmluZyBcInVuY2F1Z2h0RXhjZXB0aW9uXCIgZXZlbnRzIChhcyBkb21haW5zIGRvZXMpLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlIGluIG5leHQgZXZlbnQgdG8gYXZvaWQgdGljayByZWN1cnNpb24uXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb21haW4uZXhpdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZsdXNoLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbWFpbi5lbnRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEluIGJyb3dzZXJzLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBub3QgZmF0YWwuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBhc3luY2hyb25vdXNseSB0byBhdm9pZCBzbG93LWRvd25zLlxyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGRvbWFpbikge1xyXG4gICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZmx1c2hpbmcgPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBuZXh0VGljayA9IGZ1bmN0aW9uICh0YXNrKSB7XHJcbiAgICAgICAgdGFpbCA9IHRhaWwubmV4dCA9IHtcclxuICAgICAgICAgICAgdGFzazogdGFzayxcclxuICAgICAgICAgICAgZG9tYWluOiBpc05vZGVKUyAmJiBwcm9jZXNzLmRvbWFpbixcclxuICAgICAgICAgICAgbmV4dDogbnVsbFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICghZmx1c2hpbmcpIHtcclxuICAgICAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICByZXF1ZXN0VGljaygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2Nlc3MubmV4dFRpY2spIHtcclxuICAgICAgICAvLyBOb2RlLmpzIGJlZm9yZSAwLjkuIE5vdGUgdGhhdCBzb21lIGZha2UtTm9kZSBlbnZpcm9ubWVudHMsIGxpa2UgdGhlXHJcbiAgICAgICAgLy8gTW9jaGEgdGVzdCBydW5uZXIsIGludHJvZHVjZSBhIGBwcm9jZXNzYCBnbG9iYWwgd2l0aG91dCBhIGBuZXh0VGlja2AuXHJcbiAgICAgICAgaXNOb2RlSlMgPSB0cnVlO1xyXG5cclxuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIC8vIEluIElFMTAsIE5vZGUuanMgMC45Kywgb3IgaHR0cHM6Ly9naXRodWIuY29tL05vYmxlSlMvc2V0SW1tZWRpYXRlXHJcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSBzZXRJbW1lZGlhdGUuYmluZCh3aW5kb3csIGZsdXNoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbHVzaCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgLy8gbW9kZXJuIGJyb3dzZXJzXHJcbiAgICAgICAgLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcclxuICAgICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xyXG4gICAgICAgIC8vIEF0IGxlYXN0IFNhZmFyaSBWZXJzaW9uIDYuMC41ICg4NTM2LjMwLjEpIGludGVybWl0dGVudGx5IGNhbm5vdCBjcmVhdGVcclxuICAgICAgICAvLyB3b3JraW5nIG1lc3NhZ2UgcG9ydHMgdGhlIGZpcnN0IHRpbWUgYSBwYWdlIGxvYWRzLlxyXG4gICAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXF1ZXN0VGljayA9IHJlcXVlc3RQb3J0VGljaztcclxuICAgICAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcclxuICAgICAgICAgICAgZmx1c2goKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHZhciByZXF1ZXN0UG9ydFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIC8vIE9wZXJhIHJlcXVpcmVzIHVzIHRvIHByb3ZpZGUgYSBtZXNzYWdlIHBheWxvYWQsIHJlZ2FyZGxlc3Mgb2ZcclxuICAgICAgICAgICAgLy8gd2hldGhlciB3ZSB1c2UgaXQuXHJcbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XHJcbiAgICAgICAgICAgIHJlcXVlc3RQb3J0VGljaygpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBvbGQgYnJvd3NlcnNcclxuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV4dFRpY2s7XHJcbn0pKCk7XHJcblxyXG4vLyBBdHRlbXB0IHRvIG1ha2UgZ2VuZXJpY3Mgc2FmZSBpbiB0aGUgZmFjZSBvZiBkb3duc3RyZWFtXHJcbi8vIG1vZGlmaWNhdGlvbnMuXHJcbi8vIFRoZXJlIGlzIG5vIHNpdHVhdGlvbiB3aGVyZSB0aGlzIGlzIG5lY2Vzc2FyeS5cclxuLy8gSWYgeW91IG5lZWQgYSBzZWN1cml0eSBndWFyYW50ZWUsIHRoZXNlIHByaW1vcmRpYWxzIG5lZWQgdG8gYmVcclxuLy8gZGVlcGx5IGZyb3plbiBhbnl3YXksIGFuZCBpZiB5b3UgZG9u4oCZdCBuZWVkIGEgc2VjdXJpdHkgZ3VhcmFudGVlLFxyXG4vLyB0aGlzIGlzIGp1c3QgcGxhaW4gcGFyYW5vaWQuXHJcbi8vIEhvd2V2ZXIsIHRoaXMgKiptaWdodCoqIGhhdmUgdGhlIG5pY2Ugc2lkZS1lZmZlY3Qgb2YgcmVkdWNpbmcgdGhlIHNpemUgb2ZcclxuLy8gdGhlIG1pbmlmaWVkIGNvZGUgYnkgcmVkdWNpbmcgeC5jYWxsKCkgdG8gbWVyZWx5IHgoKVxyXG4vLyBTZWUgTWFyayBNaWxsZXLigJlzIGV4cGxhbmF0aW9uIG9mIHdoYXQgdGhpcyBkb2VzLlxyXG4vLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1jb252ZW50aW9uczpzYWZlX21ldGFfcHJvZ3JhbW1pbmdcclxudmFyIGNhbGwgPSBGdW5jdGlvbi5jYWxsO1xyXG5mdW5jdGlvbiB1bmN1cnJ5VGhpcyhmKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBjYWxsLmFwcGx5KGYsIGFyZ3VtZW50cyk7XHJcbiAgICB9O1xyXG59XHJcbi8vIFRoaXMgaXMgZXF1aXZhbGVudCwgYnV0IHNsb3dlcjpcclxuLy8gdW5jdXJyeVRoaXMgPSBGdW5jdGlvbl9iaW5kLmJpbmQoRnVuY3Rpb25fYmluZC5jYWxsKTtcclxuLy8gaHR0cDovL2pzcGVyZi5jb20vdW5jdXJyeXRoaXNcclxuXHJcbnZhciBhcnJheV9zbGljZSA9IHVuY3VycnlUaGlzKEFycmF5LnByb3RvdHlwZS5zbGljZSk7XHJcblxyXG52YXIgYXJyYXlfcmVkdWNlID0gdW5jdXJyeVRoaXMoXHJcbiAgICBBcnJheS5wcm90b3R5cGUucmVkdWNlIHx8IGZ1bmN0aW9uIChjYWxsYmFjaywgYmFzaXMpIHtcclxuICAgICAgICB2YXIgaW5kZXggPSAwLFxyXG4gICAgICAgICAgICBsZW5ndGggPSB0aGlzLmxlbmd0aDtcclxuICAgICAgICAvLyBjb25jZXJuaW5nIHRoZSBpbml0aWFsIHZhbHVlLCBpZiBvbmUgaXMgbm90IHByb3ZpZGVkXHJcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgLy8gc2VlayB0byB0aGUgZmlyc3QgdmFsdWUgaW4gdGhlIGFycmF5LCBhY2NvdW50aW5nXHJcbiAgICAgICAgICAgIC8vIGZvciB0aGUgcG9zc2liaWxpdHkgdGhhdCBpcyBpcyBhIHNwYXJzZSBhcnJheVxyXG4gICAgICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggaW4gdGhpcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGJhc2lzID0gdGhpc1tpbmRleCsrXTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICgrK2luZGV4ID49IGxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSB3aGlsZSAoMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHJlZHVjZVxyXG4gICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAvLyBhY2NvdW50IGZvciB0aGUgcG9zc2liaWxpdHkgdGhhdCB0aGUgYXJyYXkgaXMgc3BhcnNlXHJcbiAgICAgICAgICAgIGlmIChpbmRleCBpbiB0aGlzKSB7XHJcbiAgICAgICAgICAgICAgICBiYXNpcyA9IGNhbGxiYWNrKGJhc2lzLCB0aGlzW2luZGV4XSwgaW5kZXgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBiYXNpcztcclxuICAgIH1cclxuKTtcclxuXHJcbnZhciBhcnJheV9pbmRleE9mID0gdW5jdXJyeVRoaXMoXHJcbiAgICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiB8fCBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAvLyBub3QgYSB2ZXJ5IGdvb2Qgc2hpbSwgYnV0IGdvb2QgZW5vdWdoIGZvciBvdXIgb25lIHVzZSBvZiBpdFxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAodGhpc1tpXSA9PT0gdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgIH1cclxuKTtcclxuXHJcbnZhciBhcnJheV9tYXAgPSB1bmN1cnJ5VGhpcyhcclxuICAgIEFycmF5LnByb3RvdHlwZS5tYXAgfHwgZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgY29sbGVjdCA9IFtdO1xyXG4gICAgICAgIGFycmF5X3JlZHVjZShzZWxmLCBmdW5jdGlvbiAodW5kZWZpbmVkLCB2YWx1ZSwgaW5kZXgpIHtcclxuICAgICAgICAgICAgY29sbGVjdC5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBpbmRleCwgc2VsZikpO1xyXG4gICAgICAgIH0sIHZvaWQgMCk7XHJcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Q7XHJcbiAgICB9XHJcbik7XHJcblxyXG52YXIgb2JqZWN0X2NyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSkge1xyXG4gICAgZnVuY3Rpb24gVHlwZSgpIHsgfVxyXG4gICAgVHlwZS5wcm90b3R5cGUgPSBwcm90b3R5cGU7XHJcbiAgICByZXR1cm4gbmV3IFR5cGUoKTtcclxufTtcclxuXHJcbnZhciBvYmplY3RfaGFzT3duUHJvcGVydHkgPSB1bmN1cnJ5VGhpcyhPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcclxuXHJcbnZhciBvYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgIHZhciBrZXlzID0gW107XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XHJcbiAgICAgICAgaWYgKG9iamVjdF9oYXNPd25Qcm9wZXJ0eShvYmplY3QsIGtleSkpIHtcclxuICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGtleXM7XHJcbn07XHJcblxyXG52YXIgb2JqZWN0X3RvU3RyaW5nID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyk7XHJcblxyXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHZhbHVlID09PSBPYmplY3QodmFsdWUpO1xyXG59XHJcblxyXG4vLyBnZW5lcmF0b3IgcmVsYXRlZCBzaGltc1xyXG5cclxuLy8gRklYTUU6IFJlbW92ZSB0aGlzIGZ1bmN0aW9uIG9uY2UgRVM2IGdlbmVyYXRvcnMgYXJlIGluIFNwaWRlck1vbmtleS5cclxuZnVuY3Rpb24gaXNTdG9wSXRlcmF0aW9uKGV4Y2VwdGlvbikge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICBvYmplY3RfdG9TdHJpbmcoZXhjZXB0aW9uKSA9PT0gXCJbb2JqZWN0IFN0b3BJdGVyYXRpb25dXCIgfHxcclxuICAgICAgICBleGNlcHRpb24gaW5zdGFuY2VvZiBRUmV0dXJuVmFsdWVcclxuICAgICk7XHJcbn1cclxuXHJcbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBoZWxwZXIgYW5kIFEucmV0dXJuIG9uY2UgRVM2IGdlbmVyYXRvcnMgYXJlIGluXHJcbi8vIFNwaWRlck1vbmtleS5cclxudmFyIFFSZXR1cm5WYWx1ZTtcclxuaWYgKHR5cGVvZiBSZXR1cm5WYWx1ZSAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgUVJldHVyblZhbHVlID0gUmV0dXJuVmFsdWU7XHJcbn0gZWxzZSB7XHJcbiAgICBRUmV0dXJuVmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vLyBsb25nIHN0YWNrIHRyYWNlc1xyXG5cclxudmFyIFNUQUNLX0pVTVBfU0VQQVJBVE9SID0gXCJGcm9tIHByZXZpb3VzIGV2ZW50OlwiO1xyXG5cclxuZnVuY3Rpb24gbWFrZVN0YWNrVHJhY2VMb25nKGVycm9yLCBwcm9taXNlKSB7XHJcbiAgICAvLyBJZiBwb3NzaWJsZSwgdHJhbnNmb3JtIHRoZSBlcnJvciBzdGFjayB0cmFjZSBieSByZW1vdmluZyBOb2RlIGFuZCBRXHJcbiAgICAvLyBjcnVmdCwgdGhlbiBjb25jYXRlbmF0aW5nIHdpdGggdGhlIHN0YWNrIHRyYWNlIG9mIGBwcm9taXNlYC4gU2VlICM1Ny5cclxuICAgIGlmIChoYXNTdGFja3MgJiZcclxuICAgICAgICBwcm9taXNlLnN0YWNrICYmXHJcbiAgICAgICAgdHlwZW9mIGVycm9yID09PSBcIm9iamVjdFwiICYmXHJcbiAgICAgICAgZXJyb3IgIT09IG51bGwgJiZcclxuICAgICAgICBlcnJvci5zdGFjayAmJlxyXG4gICAgICAgIGVycm9yLnN0YWNrLmluZGV4T2YoU1RBQ0tfSlVNUF9TRVBBUkFUT1IpID09PSAtMVxyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHN0YWNrcyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIHAgPSBwcm9taXNlOyAhIXA7IHAgPSBwLnNvdXJjZSkge1xyXG4gICAgICAgICAgICBpZiAocC5zdGFjaykge1xyXG4gICAgICAgICAgICAgICAgc3RhY2tzLnVuc2hpZnQocC5zdGFjayk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhY2tzLnVuc2hpZnQoZXJyb3Iuc3RhY2spO1xyXG5cclxuICAgICAgICB2YXIgY29uY2F0ZWRTdGFja3MgPSBzdGFja3Muam9pbihcIlxcblwiICsgU1RBQ0tfSlVNUF9TRVBBUkFUT1IgKyBcIlxcblwiKTtcclxuICAgICAgICBlcnJvci5zdGFjayA9IGZpbHRlclN0YWNrU3RyaW5nKGNvbmNhdGVkU3RhY2tzKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmlsdGVyU3RhY2tTdHJpbmcoc3RhY2tTdHJpbmcpIHtcclxuICAgIHZhciBsaW5lcyA9IHN0YWNrU3RyaW5nLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgdmFyIGRlc2lyZWRMaW5lcyA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciBsaW5lID0gbGluZXNbaV07XHJcblxyXG4gICAgICAgIGlmICghaXNJbnRlcm5hbEZyYW1lKGxpbmUpICYmICFpc05vZGVGcmFtZShsaW5lKSAmJiBsaW5lKSB7XHJcbiAgICAgICAgICAgIGRlc2lyZWRMaW5lcy5wdXNoKGxpbmUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBkZXNpcmVkTGluZXMuam9pbihcIlxcblwiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNOb2RlRnJhbWUoc3RhY2tMaW5lKSB7XHJcbiAgICByZXR1cm4gc3RhY2tMaW5lLmluZGV4T2YoXCIobW9kdWxlLmpzOlwiKSAhPT0gLTEgfHxcclxuICAgICAgICAgICBzdGFja0xpbmUuaW5kZXhPZihcIihub2RlLmpzOlwiKSAhPT0gLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpIHtcclxuICAgIC8vIE5hbWVkIGZ1bmN0aW9uczogXCJhdCBmdW5jdGlvbk5hbWUgKGZpbGVuYW1lOmxpbmVOdW1iZXI6Y29sdW1uTnVtYmVyKVwiXHJcbiAgICAvLyBJbiBJRTEwIGZ1bmN0aW9uIG5hbWUgY2FuIGhhdmUgc3BhY2VzIChcIkFub255bW91cyBmdW5jdGlvblwiKSBPX29cclxuICAgIHZhciBhdHRlbXB0MSA9IC9hdCAuKyBcXCgoLispOihcXGQrKTooPzpcXGQrKVxcKSQvLmV4ZWMoc3RhY2tMaW5lKTtcclxuICAgIGlmIChhdHRlbXB0MSkge1xyXG4gICAgICAgIHJldHVybiBbYXR0ZW1wdDFbMV0sIE51bWJlcihhdHRlbXB0MVsyXSldO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFub255bW91cyBmdW5jdGlvbnM6IFwiYXQgZmlsZW5hbWU6bGluZU51bWJlcjpjb2x1bW5OdW1iZXJcIlxyXG4gICAgdmFyIGF0dGVtcHQyID0gL2F0IChbXiBdKyk6KFxcZCspOig/OlxcZCspJC8uZXhlYyhzdGFja0xpbmUpO1xyXG4gICAgaWYgKGF0dGVtcHQyKSB7XHJcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0MlsxXSwgTnVtYmVyKGF0dGVtcHQyWzJdKV07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRmlyZWZveCBzdHlsZTogXCJmdW5jdGlvbkBmaWxlbmFtZTpsaW5lTnVtYmVyIG9yIEBmaWxlbmFtZTpsaW5lTnVtYmVyXCJcclxuICAgIHZhciBhdHRlbXB0MyA9IC8uKkAoLispOihcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcclxuICAgIGlmIChhdHRlbXB0Mykge1xyXG4gICAgICAgIHJldHVybiBbYXR0ZW1wdDNbMV0sIE51bWJlcihhdHRlbXB0M1syXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0ludGVybmFsRnJhbWUoc3RhY2tMaW5lKSB7XHJcbiAgICB2YXIgZmlsZU5hbWVBbmRMaW5lTnVtYmVyID0gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKHN0YWNrTGluZSk7XHJcblxyXG4gICAgaWYgKCFmaWxlTmFtZUFuZExpbmVOdW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGZpbGVOYW1lID0gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzBdO1xyXG4gICAgdmFyIGxpbmVOdW1iZXIgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMV07XHJcblxyXG4gICAgcmV0dXJuIGZpbGVOYW1lID09PSBxRmlsZU5hbWUgJiZcclxuICAgICAgICBsaW5lTnVtYmVyID49IHFTdGFydGluZ0xpbmUgJiZcclxuICAgICAgICBsaW5lTnVtYmVyIDw9IHFFbmRpbmdMaW5lO1xyXG59XHJcblxyXG4vLyBkaXNjb3ZlciBvd24gZmlsZSBuYW1lIGFuZCBsaW5lIG51bWJlciByYW5nZSBmb3IgZmlsdGVyaW5nIHN0YWNrXHJcbi8vIHRyYWNlc1xyXG5mdW5jdGlvbiBjYXB0dXJlTGluZSgpIHtcclxuICAgIGlmICghaGFzU3RhY2tzKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgdmFyIGxpbmVzID0gZS5zdGFjay5zcGxpdChcIlxcblwiKTtcclxuICAgICAgICB2YXIgZmlyc3RMaW5lID0gbGluZXNbMF0uaW5kZXhPZihcIkBcIikgPiAwID8gbGluZXNbMV0gOiBsaW5lc1syXTtcclxuICAgICAgICB2YXIgZmlsZU5hbWVBbmRMaW5lTnVtYmVyID0gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKGZpcnN0TGluZSk7XHJcbiAgICAgICAgaWYgKCFmaWxlTmFtZUFuZExpbmVOdW1iZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcUZpbGVOYW1lID0gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzBdO1xyXG4gICAgICAgIHJldHVybiBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlcHJlY2F0ZShjYWxsYmFjaywgbmFtZSwgYWx0ZXJuYXRpdmUpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSBcInVuZGVmaW5lZFwiICYmXHJcbiAgICAgICAgICAgIHR5cGVvZiBjb25zb2xlLndhcm4gPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4obmFtZSArIFwiIGlzIGRlcHJlY2F0ZWQsIHVzZSBcIiArIGFsdGVybmF0aXZlICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiIGluc3RlYWQuXCIsIG5ldyBFcnJvcihcIlwiKS5zdGFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShjYWxsYmFjaywgYXJndW1lbnRzKTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8vIGVuZCBvZiBzaGltc1xyXG4vLyBiZWdpbm5pbmcgb2YgcmVhbCB3b3JrXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIHByb21pc2UgZm9yIGFuIGltbWVkaWF0ZSByZWZlcmVuY2UsIHBhc3NlcyBwcm9taXNlcyB0aHJvdWdoLCBvclxyXG4gKiBjb2VyY2VzIHByb21pc2VzIGZyb20gZGlmZmVyZW50IHN5c3RlbXMuXHJcbiAqIEBwYXJhbSB2YWx1ZSBpbW1lZGlhdGUgcmVmZXJlbmNlIG9yIHByb21pc2VcclxuICovXHJcbmZ1bmN0aW9uIFEodmFsdWUpIHtcclxuICAgIC8vIElmIHRoZSBvYmplY3QgaXMgYWxyZWFkeSBhIFByb21pc2UsIHJldHVybiBpdCBkaXJlY3RseS4gIFRoaXMgZW5hYmxlc1xyXG4gICAgLy8gdGhlIHJlc29sdmUgZnVuY3Rpb24gdG8gYm90aCBiZSB1c2VkIHRvIGNyZWF0ZWQgcmVmZXJlbmNlcyBmcm9tIG9iamVjdHMsXHJcbiAgICAvLyBidXQgdG8gdG9sZXJhYmx5IGNvZXJjZSBub24tcHJvbWlzZXMgdG8gcHJvbWlzZXMuXHJcbiAgICBpZiAoaXNQcm9taXNlKHZhbHVlKSkge1xyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhc3NpbWlsYXRlIHRoZW5hYmxlc1xyXG4gICAgaWYgKGlzUHJvbWlzZUFsaWtlKHZhbHVlKSkge1xyXG4gICAgICAgIHJldHVybiBjb2VyY2UodmFsdWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gZnVsZmlsbCh2YWx1ZSk7XHJcbiAgICB9XHJcbn1cclxuUS5yZXNvbHZlID0gUTtcclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtcyBhIHRhc2sgaW4gYSBmdXR1cmUgdHVybiBvZiB0aGUgZXZlbnQgbG9vcC5cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gdGFza1xyXG4gKi9cclxuUS5uZXh0VGljayA9IG5leHRUaWNrO1xyXG5cclxuLyoqXHJcbiAqIENvbnRyb2xzIHdoZXRoZXIgb3Igbm90IGxvbmcgc3RhY2sgdHJhY2VzIHdpbGwgYmUgb25cclxuICovXHJcblEubG9uZ1N0YWNrU3VwcG9ydCA9IGZhbHNlO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSB7cHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0fSBvYmplY3QuXHJcbiAqXHJcbiAqIGByZXNvbHZlYCBpcyBhIGNhbGxiYWNrIHRvIGludm9rZSB3aXRoIGEgbW9yZSByZXNvbHZlZCB2YWx1ZSBmb3IgdGhlXHJcbiAqIHByb21pc2UuIFRvIGZ1bGZpbGwgdGhlIHByb21pc2UsIGludm9rZSBgcmVzb2x2ZWAgd2l0aCBhbnkgdmFsdWUgdGhhdCBpc1xyXG4gKiBub3QgYSB0aGVuYWJsZS4gVG8gcmVqZWN0IHRoZSBwcm9taXNlLCBpbnZva2UgYHJlc29sdmVgIHdpdGggYSByZWplY3RlZFxyXG4gKiB0aGVuYWJsZSwgb3IgaW52b2tlIGByZWplY3RgIHdpdGggdGhlIHJlYXNvbiBkaXJlY3RseS4gVG8gcmVzb2x2ZSB0aGVcclxuICogcHJvbWlzZSB0byBhbm90aGVyIHRoZW5hYmxlLCB0aHVzIHB1dHRpbmcgaXQgaW4gdGhlIHNhbWUgc3RhdGUsIGludm9rZVxyXG4gKiBgcmVzb2x2ZWAgd2l0aCB0aGF0IG90aGVyIHRoZW5hYmxlLlxyXG4gKi9cclxuUS5kZWZlciA9IGRlZmVyO1xyXG5mdW5jdGlvbiBkZWZlcigpIHtcclxuICAgIC8vIGlmIFwibWVzc2FnZXNcIiBpcyBhbiBcIkFycmF5XCIsIHRoYXQgaW5kaWNhdGVzIHRoYXQgdGhlIHByb21pc2UgaGFzIG5vdCB5ZXRcclxuICAgIC8vIGJlZW4gcmVzb2x2ZWQuICBJZiBpdCBpcyBcInVuZGVmaW5lZFwiLCBpdCBoYXMgYmVlbiByZXNvbHZlZC4gIEVhY2hcclxuICAgIC8vIGVsZW1lbnQgb2YgdGhlIG1lc3NhZ2VzIGFycmF5IGlzIGl0c2VsZiBhbiBhcnJheSBvZiBjb21wbGV0ZSBhcmd1bWVudHMgdG9cclxuICAgIC8vIGZvcndhcmQgdG8gdGhlIHJlc29sdmVkIHByb21pc2UuICBXZSBjb2VyY2UgdGhlIHJlc29sdXRpb24gdmFsdWUgdG8gYVxyXG4gICAgLy8gcHJvbWlzZSB1c2luZyB0aGUgYHJlc29sdmVgIGZ1bmN0aW9uIGJlY2F1c2UgaXQgaGFuZGxlcyBib3RoIGZ1bGx5XHJcbiAgICAvLyBub24tdGhlbmFibGUgdmFsdWVzIGFuZCBvdGhlciB0aGVuYWJsZXMgZ3JhY2VmdWxseS5cclxuICAgIHZhciBtZXNzYWdlcyA9IFtdLCBwcm9ncmVzc0xpc3RlbmVycyA9IFtdLCByZXNvbHZlZFByb21pc2U7XHJcblxyXG4gICAgdmFyIGRlZmVycmVkID0gb2JqZWN0X2NyZWF0ZShkZWZlci5wcm90b3R5cGUpO1xyXG4gICAgdmFyIHByb21pc2UgPSBvYmplY3RfY3JlYXRlKFByb21pc2UucHJvdG90eXBlKTtcclxuXHJcbiAgICBwcm9taXNlLnByb21pc2VEaXNwYXRjaCA9IGZ1bmN0aW9uIChyZXNvbHZlLCBvcCwgb3BlcmFuZHMpIHtcclxuICAgICAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2VzLnB1c2goYXJncyk7XHJcbiAgICAgICAgICAgIGlmIChvcCA9PT0gXCJ3aGVuXCIgJiYgb3BlcmFuZHNbMV0pIHsgLy8gcHJvZ3Jlc3Mgb3BlcmFuZFxyXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcnMucHVzaChvcGVyYW5kc1sxXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlZFByb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KHJlc29sdmVkUHJvbWlzZSwgYXJncyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gWFhYIGRlcHJlY2F0ZWRcclxuICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAobWVzc2FnZXMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBuZWFyZXJWYWx1ZSA9IG5lYXJlcihyZXNvbHZlZFByb21pc2UpO1xyXG4gICAgICAgIGlmIChpc1Byb21pc2UobmVhcmVyVmFsdWUpKSB7XHJcbiAgICAgICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5lYXJlclZhbHVlOyAvLyBzaG9ydGVuIGNoYWluXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZWFyZXJWYWx1ZTtcclxuICAgIH07XHJcblxyXG4gICAgcHJvbWlzZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghcmVzb2x2ZWRQcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXRlOiBcInBlbmRpbmdcIiB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzb2x2ZWRQcm9taXNlLmluc3BlY3QoKTtcclxuICAgIH07XHJcblxyXG4gICAgaWYgKFEubG9uZ1N0YWNrU3VwcG9ydCAmJiBoYXNTdGFja3MpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIC8vIE5PVEU6IGRvbid0IHRyeSB0byB1c2UgYEVycm9yLmNhcHR1cmVTdGFja1RyYWNlYCBvciB0cmFuc2ZlciB0aGVcclxuICAgICAgICAgICAgLy8gYWNjZXNzb3IgYXJvdW5kOyB0aGF0IGNhdXNlcyBtZW1vcnkgbGVha3MgYXMgcGVyIEdILTExMS4gSnVzdFxyXG4gICAgICAgICAgICAvLyByZWlmeSB0aGUgc3RhY2sgdHJhY2UgYXMgYSBzdHJpbmcgQVNBUC5cclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gQXQgdGhlIHNhbWUgdGltZSwgY3V0IG9mZiB0aGUgZmlyc3QgbGluZTsgaXQncyBhbHdheXMganVzdFxyXG4gICAgICAgICAgICAvLyBcIltvYmplY3QgUHJvbWlzZV1cXG5cIiwgYXMgcGVyIHRoZSBgdG9TdHJpbmdgLlxyXG4gICAgICAgICAgICBwcm9taXNlLnN0YWNrID0gZS5zdGFjay5zdWJzdHJpbmcoZS5zdGFjay5pbmRleE9mKFwiXFxuXCIpICsgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIE5PVEU6IHdlIGRvIHRoZSBjaGVja3MgZm9yIGByZXNvbHZlZFByb21pc2VgIGluIGVhY2ggbWV0aG9kLCBpbnN0ZWFkIG9mXHJcbiAgICAvLyBjb25zb2xpZGF0aW5nIHRoZW0gaW50byBgYmVjb21lYCwgc2luY2Ugb3RoZXJ3aXNlIHdlJ2QgY3JlYXRlIG5ld1xyXG4gICAgLy8gcHJvbWlzZXMgd2l0aCB0aGUgbGluZXMgYGJlY29tZSh3aGF0ZXZlcih2YWx1ZSkpYC4gU2VlIGUuZy4gR0gtMjUyLlxyXG5cclxuICAgIGZ1bmN0aW9uIGJlY29tZShuZXdQcm9taXNlKSB7XHJcbiAgICAgICAgcmVzb2x2ZWRQcm9taXNlID0gbmV3UHJvbWlzZTtcclxuICAgICAgICBwcm9taXNlLnNvdXJjZSA9IG5ld1Byb21pc2U7XHJcblxyXG4gICAgICAgIGFycmF5X3JlZHVjZShtZXNzYWdlcywgZnVuY3Rpb24gKHVuZGVmaW5lZCwgbWVzc2FnZSkge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdQcm9taXNlLnByb21pc2VEaXNwYXRjaC5hcHBseShuZXdQcm9taXNlLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSwgdm9pZCAwKTtcclxuXHJcbiAgICAgICAgbWVzc2FnZXMgPSB2b2lkIDA7XHJcbiAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcnMgPSB2b2lkIDA7XHJcbiAgICB9XHJcblxyXG4gICAgZGVmZXJyZWQucHJvbWlzZSA9IHByb21pc2U7XHJcbiAgICBkZWZlcnJlZC5yZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWNvbWUoUSh2YWx1ZSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBkZWZlcnJlZC5mdWxmaWxsID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWNvbWUoZnVsZmlsbCh2YWx1ZSkpO1xyXG4gICAgfTtcclxuICAgIGRlZmVycmVkLnJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcclxuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlY29tZShyZWplY3QocmVhc29uKSk7XHJcbiAgICB9O1xyXG4gICAgZGVmZXJyZWQubm90aWZ5ID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XHJcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcnJheV9yZWR1Y2UocHJvZ3Jlc3NMaXN0ZW5lcnMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHByb2dyZXNzTGlzdGVuZXIpIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcihwcm9ncmVzcyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sIHZvaWQgMCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBkZWZlcnJlZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBOb2RlLXN0eWxlIGNhbGxiYWNrIHRoYXQgd2lsbCByZXNvbHZlIG9yIHJlamVjdCB0aGUgZGVmZXJyZWRcclxuICogcHJvbWlzZS5cclxuICogQHJldHVybnMgYSBub2RlYmFja1xyXG4gKi9cclxuZGVmZXIucHJvdG90eXBlLm1ha2VOb2RlUmVzb2x2ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKGVycm9yLCB2YWx1ZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBzZWxmLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICBzZWxmLnJlc29sdmUoYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSByZXNvbHZlciB7RnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIG5vdGhpbmcgYW5kIGFjY2VwdHNcclxuICogdGhlIHJlc29sdmUsIHJlamVjdCwgYW5kIG5vdGlmeSBmdW5jdGlvbnMgZm9yIGEgZGVmZXJyZWQuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IG1heSBiZSByZXNvbHZlZCB3aXRoIHRoZSBnaXZlbiByZXNvbHZlIGFuZCByZWplY3RcclxuICogZnVuY3Rpb25zLCBvciByZWplY3RlZCBieSBhIHRocm93biBleGNlcHRpb24gaW4gcmVzb2x2ZXJcclxuICovXHJcblEuUHJvbWlzZSA9IHByb21pc2U7IC8vIEVTNlxyXG5RLnByb21pc2UgPSBwcm9taXNlO1xyXG5mdW5jdGlvbiBwcm9taXNlKHJlc29sdmVyKSB7XHJcbiAgICBpZiAodHlwZW9mIHJlc29sdmVyICE9PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicmVzb2x2ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiKTtcclxuICAgIH1cclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJlc29sdmVyKGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCwgZGVmZXJyZWQubm90aWZ5KTtcclxuICAgIH0gY2F0Y2ggKHJlYXNvbikge1xyXG4gICAgICAgIGRlZmVycmVkLnJlamVjdChyZWFzb24pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn1cclxuXHJcbnByb21pc2UucmFjZSA9IHJhY2U7IC8vIEVTNlxyXG5wcm9taXNlLmFsbCA9IGFsbDsgLy8gRVM2XHJcbnByb21pc2UucmVqZWN0ID0gcmVqZWN0OyAvLyBFUzZcclxucHJvbWlzZS5yZXNvbHZlID0gUTsgLy8gRVM2XHJcblxyXG4vLyBYWFggZXhwZXJpbWVudGFsLiAgVGhpcyBtZXRob2QgaXMgYSB3YXkgdG8gZGVub3RlIHRoYXQgYSBsb2NhbCB2YWx1ZSBpc1xyXG4vLyBzZXJpYWxpemFibGUgYW5kIHNob3VsZCBiZSBpbW1lZGlhdGVseSBkaXNwYXRjaGVkIHRvIGEgcmVtb3RlIHVwb24gcmVxdWVzdCxcclxuLy8gaW5zdGVhZCBvZiBwYXNzaW5nIGEgcmVmZXJlbmNlLlxyXG5RLnBhc3NCeUNvcHkgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAvL2ZyZWV6ZShvYmplY3QpO1xyXG4gICAgLy9wYXNzQnlDb3BpZXMuc2V0KG9iamVjdCwgdHJ1ZSk7XHJcbiAgICByZXR1cm4gb2JqZWN0O1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUucGFzc0J5Q29weSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vZnJlZXplKG9iamVjdCk7XHJcbiAgICAvL3Bhc3NCeUNvcGllcy5zZXQob2JqZWN0LCB0cnVlKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIElmIHR3byBwcm9taXNlcyBldmVudHVhbGx5IGZ1bGZpbGwgdG8gdGhlIHNhbWUgdmFsdWUsIHByb21pc2VzIHRoYXQgdmFsdWUsXHJcbiAqIGJ1dCBvdGhlcndpc2UgcmVqZWN0cy5cclxuICogQHBhcmFtIHgge0FueSp9XHJcbiAqIEBwYXJhbSB5IHtBbnkqfVxyXG4gKiBAcmV0dXJucyB7QW55Kn0gYSBwcm9taXNlIGZvciB4IGFuZCB5IGlmIHRoZXkgYXJlIHRoZSBzYW1lLCBidXQgYSByZWplY3Rpb25cclxuICogb3RoZXJ3aXNlLlxyXG4gKlxyXG4gKi9cclxuUS5qb2luID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgIHJldHVybiBRKHgpLmpvaW4oeSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5qb2luID0gZnVuY3Rpb24gKHRoYXQpIHtcclxuICAgIHJldHVybiBRKFt0aGlzLCB0aGF0XSkuc3ByZWFkKGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICAgICAgaWYgKHggPT09IHkpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogXCI9PT1cIiBzaG91bGQgYmUgT2JqZWN0LmlzIG9yIGVxdWl2XHJcbiAgICAgICAgICAgIHJldHVybiB4O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGpvaW46IG5vdCB0aGUgc2FtZTogXCIgKyB4ICsgXCIgXCIgKyB5KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIGZpcnN0IG9mIGFuIGFycmF5IG9mIHByb21pc2VzIHRvIGJlY29tZSBmdWxmaWxsZWQuXHJcbiAqIEBwYXJhbSBhbnN3ZXJzIHtBcnJheVtBbnkqXX0gcHJvbWlzZXMgdG8gcmFjZVxyXG4gKiBAcmV0dXJucyB7QW55Kn0gdGhlIGZpcnN0IHByb21pc2UgdG8gYmUgZnVsZmlsbGVkXHJcbiAqL1xyXG5RLnJhY2UgPSByYWNlO1xyXG5mdW5jdGlvbiByYWNlKGFuc3dlclBzKSB7XHJcbiAgICByZXR1cm4gcHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAvLyBTd2l0Y2ggdG8gdGhpcyBvbmNlIHdlIGNhbiBhc3N1bWUgYXQgbGVhc3QgRVM1XHJcbiAgICAgICAgLy8gYW5zd2VyUHMuZm9yRWFjaChmdW5jdGlvbihhbnN3ZXJQKSB7XHJcbiAgICAgICAgLy8gICAgIFEoYW5zd2VyUCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIC8vIH0pO1xyXG4gICAgICAgIC8vIFVzZSB0aGlzIGluIHRoZSBtZWFudGltZVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhbnN3ZXJQcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICBRKGFuc3dlclBzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnJhY2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKFEucmFjZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIFByb21pc2Ugd2l0aCBhIHByb21pc2UgZGVzY3JpcHRvciBvYmplY3QgYW5kIG9wdGlvbmFsIGZhbGxiYWNrXHJcbiAqIGZ1bmN0aW9uLiAgVGhlIGRlc2NyaXB0b3IgY29udGFpbnMgbWV0aG9kcyBsaWtlIHdoZW4ocmVqZWN0ZWQpLCBnZXQobmFtZSksXHJcbiAqIHNldChuYW1lLCB2YWx1ZSksIHBvc3QobmFtZSwgYXJncyksIGFuZCBkZWxldGUobmFtZSksIHdoaWNoIGFsbFxyXG4gKiByZXR1cm4gZWl0aGVyIGEgdmFsdWUsIGEgcHJvbWlzZSBmb3IgYSB2YWx1ZSwgb3IgYSByZWplY3Rpb24uICBUaGUgZmFsbGJhY2tcclxuICogYWNjZXB0cyB0aGUgb3BlcmF0aW9uIG5hbWUsIGEgcmVzb2x2ZXIsIGFuZCBhbnkgZnVydGhlciBhcmd1bWVudHMgdGhhdCB3b3VsZFxyXG4gKiBoYXZlIGJlZW4gZm9yd2FyZGVkIHRvIHRoZSBhcHByb3ByaWF0ZSBtZXRob2QgYWJvdmUgaGFkIGEgbWV0aG9kIGJlZW5cclxuICogcHJvdmlkZWQgd2l0aCB0aGUgcHJvcGVyIG5hbWUuICBUaGUgQVBJIG1ha2VzIG5vIGd1YXJhbnRlZXMgYWJvdXQgdGhlIG5hdHVyZVxyXG4gKiBvZiB0aGUgcmV0dXJuZWQgb2JqZWN0LCBhcGFydCBmcm9tIHRoYXQgaXQgaXMgdXNhYmxlIHdoZXJlZXZlciBwcm9taXNlcyBhcmVcclxuICogYm91Z2h0IGFuZCBzb2xkLlxyXG4gKi9cclxuUS5tYWtlUHJvbWlzZSA9IFByb21pc2U7XHJcbmZ1bmN0aW9uIFByb21pc2UoZGVzY3JpcHRvciwgZmFsbGJhY2ssIGluc3BlY3QpIHtcclxuICAgIGlmIChmYWxsYmFjayA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgZmFsbGJhY2sgPSBmdW5jdGlvbiAob3ApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgICBcIlByb21pc2UgZG9lcyBub3Qgc3VwcG9ydCBvcGVyYXRpb246IFwiICsgb3BcclxuICAgICAgICAgICAgKSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIGlmIChpbnNwZWN0ID09PSB2b2lkIDApIHtcclxuICAgICAgICBpbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge3N0YXRlOiBcInVua25vd25cIn07XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xyXG5cclxuICAgIHByb21pc2UucHJvbWlzZURpc3BhdGNoID0gZnVuY3Rpb24gKHJlc29sdmUsIG9wLCBhcmdzKSB7XHJcbiAgICAgICAgdmFyIHJlc3VsdDtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZGVzY3JpcHRvcltvcF0pIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGRlc2NyaXB0b3Jbb3BdLmFwcGx5KHByb21pc2UsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsbGJhY2suY2FsbChwcm9taXNlLCBvcCwgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgcmVzdWx0ID0gcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyZXNvbHZlKSB7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHByb21pc2UuaW5zcGVjdCA9IGluc3BlY3Q7XHJcblxyXG4gICAgLy8gWFhYIGRlcHJlY2F0ZWQgYHZhbHVlT2ZgIGFuZCBgZXhjZXB0aW9uYCBzdXBwb3J0XHJcbiAgICBpZiAoaW5zcGVjdCkge1xyXG4gICAgICAgIHZhciBpbnNwZWN0ZWQgPSBpbnNwZWN0KCk7XHJcbiAgICAgICAgaWYgKGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiKSB7XHJcbiAgICAgICAgICAgIHByb21pc2UuZXhjZXB0aW9uID0gaW5zcGVjdGVkLnJlYXNvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGluc3BlY3RlZCA9IGluc3BlY3QoKTtcclxuICAgICAgICAgICAgaWYgKGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJwZW5kaW5nXCIgfHxcclxuICAgICAgICAgICAgICAgIGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdGVkLnZhbHVlO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHByb21pc2U7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIFwiW29iamVjdCBQcm9taXNlXVwiO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgdmFyIGRvbmUgPSBmYWxzZTsgICAvLyBlbnN1cmUgdGhlIHVudHJ1c3RlZCBwcm9taXNlIG1ha2VzIGF0IG1vc3QgYVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGUgY2FsbCB0byBvbmUgb2YgdGhlIGNhbGxiYWNrc1xyXG5cclxuICAgIGZ1bmN0aW9uIF9mdWxmaWxsZWQodmFsdWUpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGZ1bGZpbGxlZCA9PT0gXCJmdW5jdGlvblwiID8gZnVsZmlsbGVkKHZhbHVlKSA6IHZhbHVlO1xyXG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIF9yZWplY3RlZChleGNlcHRpb24pIHtcclxuICAgICAgICBpZiAodHlwZW9mIHJlamVjdGVkID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGV4Y2VwdGlvbiwgc2VsZik7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0ZWQoZXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAobmV3RXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ld0V4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIF9wcm9ncmVzc2VkKHZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBwcm9ncmVzc2VkID09PSBcImZ1bmN0aW9uXCIgPyBwcm9ncmVzc2VkKHZhbHVlKSA6IHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzZWxmLnByb21pc2VEaXNwYXRjaChmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGRvbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoX2Z1bGZpbGxlZCh2YWx1ZSkpO1xyXG4gICAgICAgIH0sIFwid2hlblwiLCBbZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICBpZiAoZG9uZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfcmVqZWN0ZWQoZXhjZXB0aW9uKSk7XHJcbiAgICAgICAgfV0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHJvZ3Jlc3MgcHJvcGFnYXRvciBuZWVkIHRvIGJlIGF0dGFjaGVkIGluIHRoZSBjdXJyZW50IHRpY2suXHJcbiAgICBzZWxmLnByb21pc2VEaXNwYXRjaCh2b2lkIDAsIFwid2hlblwiLCBbdm9pZCAwLCBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB2YXIgbmV3VmFsdWU7XHJcbiAgICAgICAgdmFyIHRocmV3ID0gZmFsc2U7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbmV3VmFsdWUgPSBfcHJvZ3Jlc3NlZCh2YWx1ZSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICB0aHJldyA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIFEub25lcnJvcihlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhyZXcpIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQubm90aWZ5KG5ld1ZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICB9XSk7XHJcblxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVnaXN0ZXJzIGFuIG9ic2VydmVyIG9uIGEgcHJvbWlzZS5cclxuICpcclxuICogR3VhcmFudGVlczpcclxuICpcclxuICogMS4gdGhhdCBmdWxmaWxsZWQgYW5kIHJlamVjdGVkIHdpbGwgYmUgY2FsbGVkIG9ubHkgb25jZS5cclxuICogMi4gdGhhdCBlaXRoZXIgdGhlIGZ1bGZpbGxlZCBjYWxsYmFjayBvciB0aGUgcmVqZWN0ZWQgY2FsbGJhY2sgd2lsbCBiZVxyXG4gKiAgICBjYWxsZWQsIGJ1dCBub3QgYm90aC5cclxuICogMy4gdGhhdCBmdWxmaWxsZWQgYW5kIHJlamVjdGVkIHdpbGwgbm90IGJlIGNhbGxlZCBpbiB0aGlzIHR1cm4uXHJcbiAqXHJcbiAqIEBwYXJhbSB2YWx1ZSAgICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSB0byBvYnNlcnZlXHJcbiAqIEBwYXJhbSBmdWxmaWxsZWQgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBmdWxmaWxsZWQgdmFsdWVcclxuICogQHBhcmFtIHJlamVjdGVkICAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlamVjdGlvbiBleGNlcHRpb25cclxuICogQHBhcmFtIHByb2dyZXNzZWQgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGFueSBwcm9ncmVzcyBub3RpZmljYXRpb25zXHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSBmcm9tIHRoZSBpbnZva2VkIGNhbGxiYWNrXHJcbiAqL1xyXG5RLndoZW4gPSB3aGVuO1xyXG5mdW5jdGlvbiB3aGVuKHZhbHVlLCBmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKSB7XHJcbiAgICByZXR1cm4gUSh2YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudGhlblJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKCkgeyByZXR1cm4gdmFsdWU7IH0pO1xyXG59O1xyXG5cclxuUS50aGVuUmVzb2x2ZSA9IGZ1bmN0aW9uIChwcm9taXNlLCB2YWx1ZSkge1xyXG4gICAgcmV0dXJuIFEocHJvbWlzZSkudGhlblJlc29sdmUodmFsdWUpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudGhlblJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKCkgeyB0aHJvdyByZWFzb247IH0pO1xyXG59O1xyXG5cclxuUS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHByb21pc2UsIHJlYXNvbikge1xyXG4gICAgcmV0dXJuIFEocHJvbWlzZSkudGhlblJlamVjdChyZWFzb24pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIElmIGFuIG9iamVjdCBpcyBub3QgYSBwcm9taXNlLCBpdCBpcyBhcyBcIm5lYXJcIiBhcyBwb3NzaWJsZS5cclxuICogSWYgYSBwcm9taXNlIGlzIHJlamVjdGVkLCBpdCBpcyBhcyBcIm5lYXJcIiBhcyBwb3NzaWJsZSB0b28uXHJcbiAqIElmIGl04oCZcyBhIGZ1bGZpbGxlZCBwcm9taXNlLCB0aGUgZnVsZmlsbG1lbnQgdmFsdWUgaXMgbmVhcmVyLlxyXG4gKiBJZiBpdOKAmXMgYSBkZWZlcnJlZCBwcm9taXNlIGFuZCB0aGUgZGVmZXJyZWQgaGFzIGJlZW4gcmVzb2x2ZWQsIHRoZVxyXG4gKiByZXNvbHV0aW9uIGlzIFwibmVhcmVyXCIuXHJcbiAqIEBwYXJhbSBvYmplY3RcclxuICogQHJldHVybnMgbW9zdCByZXNvbHZlZCAobmVhcmVzdCkgZm9ybSBvZiB0aGUgb2JqZWN0XHJcbiAqL1xyXG5cclxuLy8gWFhYIHNob3VsZCB3ZSByZS1kbyB0aGlzP1xyXG5RLm5lYXJlciA9IG5lYXJlcjtcclxuZnVuY3Rpb24gbmVhcmVyKHZhbHVlKSB7XHJcbiAgICBpZiAoaXNQcm9taXNlKHZhbHVlKSkge1xyXG4gICAgICAgIHZhciBpbnNwZWN0ZWQgPSB2YWx1ZS5pbnNwZWN0KCk7XHJcbiAgICAgICAgaWYgKGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdGVkLnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHByb21pc2UuXHJcbiAqIE90aGVyd2lzZSBpdCBpcyBhIGZ1bGZpbGxlZCB2YWx1ZS5cclxuICovXHJcblEuaXNQcm9taXNlID0gaXNQcm9taXNlO1xyXG5mdW5jdGlvbiBpc1Byb21pc2Uob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gaXNPYmplY3Qob2JqZWN0KSAmJlxyXG4gICAgICAgIHR5cGVvZiBvYmplY3QucHJvbWlzZURpc3BhdGNoID09PSBcImZ1bmN0aW9uXCIgJiZcclxuICAgICAgICB0eXBlb2Ygb2JqZWN0Lmluc3BlY3QgPT09IFwiZnVuY3Rpb25cIjtcclxufVxyXG5cclxuUS5pc1Byb21pc2VBbGlrZSA9IGlzUHJvbWlzZUFsaWtlO1xyXG5mdW5jdGlvbiBpc1Byb21pc2VBbGlrZShvYmplY3QpIHtcclxuICAgIHJldHVybiBpc09iamVjdChvYmplY3QpICYmIHR5cGVvZiBvYmplY3QudGhlbiA9PT0gXCJmdW5jdGlvblwiO1xyXG59XHJcblxyXG4vKipcclxuICogQHJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGEgcGVuZGluZyBwcm9taXNlLCBtZWFuaW5nIG5vdFxyXG4gKiBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXHJcbiAqL1xyXG5RLmlzUGVuZGluZyA9IGlzUGVuZGluZztcclxuZnVuY3Rpb24gaXNQZW5kaW5nKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIGlzUHJvbWlzZShvYmplY3QpICYmIG9iamVjdC5pbnNwZWN0KCkuc3RhdGUgPT09IFwicGVuZGluZ1wiO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5pc1BlbmRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwicGVuZGluZ1wiO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHZhbHVlIG9yIGZ1bGZpbGxlZFxyXG4gKiBwcm9taXNlLlxyXG4gKi9cclxuUS5pc0Z1bGZpbGxlZCA9IGlzRnVsZmlsbGVkO1xyXG5mdW5jdGlvbiBpc0Z1bGZpbGxlZChvYmplY3QpIHtcclxuICAgIHJldHVybiAhaXNQcm9taXNlKG9iamVjdCkgfHwgb2JqZWN0Lmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIjtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuaXNGdWxmaWxsZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCI7XHJcbn07XHJcblxyXG4vKipcclxuICogQHJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGEgcmVqZWN0ZWQgcHJvbWlzZS5cclxuICovXHJcblEuaXNSZWplY3RlZCA9IGlzUmVqZWN0ZWQ7XHJcbmZ1bmN0aW9uIGlzUmVqZWN0ZWQob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gaXNQcm9taXNlKG9iamVjdCkgJiYgb2JqZWN0Lmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5pc1JlamVjdGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XHJcbn07XHJcblxyXG4vLy8vIEJFR0lOIFVOSEFORExFRCBSRUpFQ1RJT04gVFJBQ0tJTkdcclxuXHJcbi8vIFRoaXMgcHJvbWlzZSBsaWJyYXJ5IGNvbnN1bWVzIGV4Y2VwdGlvbnMgdGhyb3duIGluIGhhbmRsZXJzIHNvIHRoZXkgY2FuIGJlXHJcbi8vIGhhbmRsZWQgYnkgYSBzdWJzZXF1ZW50IHByb21pc2UuICBUaGUgZXhjZXB0aW9ucyBnZXQgYWRkZWQgdG8gdGhpcyBhcnJheSB3aGVuXHJcbi8vIHRoZXkgYXJlIGNyZWF0ZWQsIGFuZCByZW1vdmVkIHdoZW4gdGhleSBhcmUgaGFuZGxlZC4gIE5vdGUgdGhhdCBpbiBFUzYgb3JcclxuLy8gc2hpbW1lZCBlbnZpcm9ubWVudHMsIHRoaXMgd291bGQgbmF0dXJhbGx5IGJlIGEgYFNldGAuXHJcbnZhciB1bmhhbmRsZWRSZWFzb25zID0gW107XHJcbnZhciB1bmhhbmRsZWRSZWplY3Rpb25zID0gW107XHJcbnZhciB0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMgPSB0cnVlO1xyXG5cclxuZnVuY3Rpb24gcmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCkge1xyXG4gICAgdW5oYW5kbGVkUmVhc29ucy5sZW5ndGggPSAwO1xyXG4gICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5sZW5ndGggPSAwO1xyXG5cclxuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XHJcbiAgICAgICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhY2tSZWplY3Rpb24ocHJvbWlzZSwgcmVhc29uKSB7XHJcbiAgICBpZiAoIXRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB1bmhhbmRsZWRSZWplY3Rpb25zLnB1c2gocHJvbWlzZSk7XHJcbiAgICBpZiAocmVhc29uICYmIHR5cGVvZiByZWFzb24uc3RhY2sgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnB1c2gocmVhc29uLnN0YWNrKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdW5oYW5kbGVkUmVhc29ucy5wdXNoKFwiKG5vIHN0YWNrKSBcIiArIHJlYXNvbik7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVudHJhY2tSZWplY3Rpb24ocHJvbWlzZSkge1xyXG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGF0ID0gYXJyYXlfaW5kZXhPZih1bmhhbmRsZWRSZWplY3Rpb25zLCBwcm9taXNlKTtcclxuICAgIGlmIChhdCAhPT0gLTEpIHtcclxuICAgICAgICB1bmhhbmRsZWRSZWplY3Rpb25zLnNwbGljZShhdCwgMSk7XHJcbiAgICAgICAgdW5oYW5kbGVkUmVhc29ucy5zcGxpY2UoYXQsIDEpO1xyXG4gICAgfVxyXG59XHJcblxyXG5RLnJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucyA9IHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucztcclxuXHJcblEuZ2V0VW5oYW5kbGVkUmVhc29ucyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIE1ha2UgYSBjb3B5IHNvIHRoYXQgY29uc3VtZXJzIGNhbid0IGludGVyZmVyZSB3aXRoIG91ciBpbnRlcm5hbCBzdGF0ZS5cclxuICAgIHJldHVybiB1bmhhbmRsZWRSZWFzb25zLnNsaWNlKCk7XHJcbn07XHJcblxyXG5RLnN0b3BVbmhhbmRsZWRSZWplY3Rpb25UcmFja2luZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpO1xyXG4gICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gZmFsc2U7XHJcbn07XHJcblxyXG5yZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKTtcclxuXHJcbi8vLy8gRU5EIFVOSEFORExFRCBSRUpFQ1RJT04gVFJBQ0tJTkdcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgcmVqZWN0ZWQgcHJvbWlzZS5cclxuICogQHBhcmFtIHJlYXNvbiB2YWx1ZSBkZXNjcmliaW5nIHRoZSBmYWlsdXJlXHJcbiAqL1xyXG5RLnJlamVjdCA9IHJlamVjdDtcclxuZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xyXG4gICAgdmFyIHJlamVjdGlvbiA9IFByb21pc2Uoe1xyXG4gICAgICAgIFwid2hlblwiOiBmdW5jdGlvbiAocmVqZWN0ZWQpIHtcclxuICAgICAgICAgICAgLy8gbm90ZSB0aGF0IHRoZSBlcnJvciBoYXMgYmVlbiBoYW5kbGVkXHJcbiAgICAgICAgICAgIGlmIChyZWplY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgdW50cmFja1JlamVjdGlvbih0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0ZWQgPyByZWplY3RlZChyZWFzb24pIDogdGhpcztcclxuICAgICAgICB9XHJcbiAgICB9LCBmdW5jdGlvbiBmYWxsYmFjaygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sIGZ1bmN0aW9uIGluc3BlY3QoKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwicmVqZWN0ZWRcIiwgcmVhc29uOiByZWFzb24gfTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGUgdGhhdCB0aGUgcmVhc29uIGhhcyBub3QgYmVlbiBoYW5kbGVkLlxyXG4gICAgdHJhY2tSZWplY3Rpb24ocmVqZWN0aW9uLCByZWFzb24pO1xyXG5cclxuICAgIHJldHVybiByZWplY3Rpb247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgZnVsZmlsbGVkIHByb21pc2UgZm9yIGFuIGltbWVkaWF0ZSByZWZlcmVuY2UuXHJcbiAqIEBwYXJhbSB2YWx1ZSBpbW1lZGlhdGUgcmVmZXJlbmNlXHJcbiAqL1xyXG5RLmZ1bGZpbGwgPSBmdWxmaWxsO1xyXG5mdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gUHJvbWlzZSh7XHJcbiAgICAgICAgXCJ3aGVuXCI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJnZXRcIjogZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlW25hbWVdO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJzZXRcIjogZnVuY3Rpb24gKG5hbWUsIHJocykge1xyXG4gICAgICAgICAgICB2YWx1ZVtuYW1lXSA9IHJocztcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiZGVsZXRlXCI6IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB2YWx1ZVtuYW1lXTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwicG9zdFwiOiBmdW5jdGlvbiAobmFtZSwgYXJncykge1xyXG4gICAgICAgICAgICAvLyBNYXJrIE1pbGxlciBwcm9wb3NlcyB0aGF0IHBvc3Qgd2l0aCBubyBuYW1lIHNob3VsZCBhcHBseSBhXHJcbiAgICAgICAgICAgIC8vIHByb21pc2VkIGZ1bmN0aW9uLlxyXG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gbnVsbCB8fCBuYW1lID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5hcHBseSh2b2lkIDAsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlW25hbWVdLmFwcGx5KHZhbHVlLCBhcmdzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJhcHBseVwiOiBmdW5jdGlvbiAodGhpc3AsIGFyZ3MpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmFwcGx5KHRoaXNwLCBhcmdzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwia2V5c1wiOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3Rfa2V5cyh2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSwgdm9pZCAwLCBmdW5jdGlvbiBpbnNwZWN0KCkge1xyXG4gICAgICAgIHJldHVybiB7IHN0YXRlOiBcImZ1bGZpbGxlZFwiLCB2YWx1ZTogdmFsdWUgfTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhlbmFibGVzIHRvIFEgcHJvbWlzZXMuXHJcbiAqIEBwYXJhbSBwcm9taXNlIHRoZW5hYmxlIHByb21pc2VcclxuICogQHJldHVybnMgYSBRIHByb21pc2VcclxuICovXHJcbmZ1bmN0aW9uIGNvZXJjZShwcm9taXNlKSB7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHByb21pc2UudGhlbihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QsIGRlZmVycmVkLm5vdGlmeSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBbm5vdGF0ZXMgYW4gb2JqZWN0IHN1Y2ggdGhhdCBpdCB3aWxsIG5ldmVyIGJlXHJcbiAqIHRyYW5zZmVycmVkIGF3YXkgZnJvbSB0aGlzIHByb2Nlc3Mgb3ZlciBhbnkgcHJvbWlzZVxyXG4gKiBjb21tdW5pY2F0aW9uIGNoYW5uZWwuXHJcbiAqIEBwYXJhbSBvYmplY3RcclxuICogQHJldHVybnMgcHJvbWlzZSBhIHdyYXBwaW5nIG9mIHRoYXQgb2JqZWN0IHRoYXRcclxuICogYWRkaXRpb25hbGx5IHJlc3BvbmRzIHRvIHRoZSBcImlzRGVmXCIgbWVzc2FnZVxyXG4gKiB3aXRob3V0IGEgcmVqZWN0aW9uLlxyXG4gKi9cclxuUS5tYXN0ZXIgPSBtYXN0ZXI7XHJcbmZ1bmN0aW9uIG1hc3RlcihvYmplY3QpIHtcclxuICAgIHJldHVybiBQcm9taXNlKHtcclxuICAgICAgICBcImlzRGVmXCI6IGZ1bmN0aW9uICgpIHt9XHJcbiAgICB9LCBmdW5jdGlvbiBmYWxsYmFjayhvcCwgYXJncykge1xyXG4gICAgICAgIHJldHVybiBkaXNwYXRjaChvYmplY3QsIG9wLCBhcmdzKTtcclxuICAgIH0sIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gUShvYmplY3QpLmluc3BlY3QoKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogU3ByZWFkcyB0aGUgdmFsdWVzIG9mIGEgcHJvbWlzZWQgYXJyYXkgb2YgYXJndW1lbnRzIGludG8gdGhlXHJcbiAqIGZ1bGZpbGxtZW50IGNhbGxiYWNrLlxyXG4gKiBAcGFyYW0gZnVsZmlsbGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdmFyaWFkaWMgYXJndW1lbnRzIGZyb20gdGhlXHJcbiAqIHByb21pc2VkIGFycmF5XHJcbiAqIEBwYXJhbSByZWplY3RlZCBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIHRoZSBleGNlcHRpb24gaWYgdGhlIHByb21pc2VcclxuICogaXMgcmVqZWN0ZWQuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSBvciB0aHJvd24gZXhjZXB0aW9uIG9mXHJcbiAqIGVpdGhlciBjYWxsYmFjay5cclxuICovXHJcblEuc3ByZWFkID0gc3ByZWFkO1xyXG5mdW5jdGlvbiBzcHJlYWQodmFsdWUsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQpIHtcclxuICAgIHJldHVybiBRKHZhbHVlKS5zcHJlYWQoZnVsZmlsbGVkLCByZWplY3RlZCk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnNwcmVhZCA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkKSB7XHJcbiAgICByZXR1cm4gdGhpcy5hbGwoKS50aGVuKGZ1bmN0aW9uIChhcnJheSkge1xyXG4gICAgICAgIHJldHVybiBmdWxmaWxsZWQuYXBwbHkodm9pZCAwLCBhcnJheSk7XHJcbiAgICB9LCByZWplY3RlZCk7XHJcbn07XHJcblxyXG4vKipcclxuICogVGhlIGFzeW5jIGZ1bmN0aW9uIGlzIGEgZGVjb3JhdG9yIGZvciBnZW5lcmF0b3IgZnVuY3Rpb25zLCB0dXJuaW5nXHJcbiAqIHRoZW0gaW50byBhc3luY2hyb25vdXMgZ2VuZXJhdG9ycy4gIEFsdGhvdWdoIGdlbmVyYXRvcnMgYXJlIG9ubHkgcGFydFxyXG4gKiBvZiB0aGUgbmV3ZXN0IEVDTUFTY3JpcHQgNiBkcmFmdHMsIHRoaXMgY29kZSBkb2VzIG5vdCBjYXVzZSBzeW50YXhcclxuICogZXJyb3JzIGluIG9sZGVyIGVuZ2luZXMuICBUaGlzIGNvZGUgc2hvdWxkIGNvbnRpbnVlIHRvIHdvcmsgYW5kIHdpbGxcclxuICogaW4gZmFjdCBpbXByb3ZlIG92ZXIgdGltZSBhcyB0aGUgbGFuZ3VhZ2UgaW1wcm92ZXMuXHJcbiAqXHJcbiAqIEVTNiBnZW5lcmF0b3JzIGFyZSBjdXJyZW50bHkgcGFydCBvZiBWOCB2ZXJzaW9uIDMuMTkgd2l0aCB0aGVcclxuICogLS1oYXJtb255LWdlbmVyYXRvcnMgcnVudGltZSBmbGFnIGVuYWJsZWQuICBTcGlkZXJNb25rZXkgaGFzIGhhZCB0aGVtXHJcbiAqIGZvciBsb25nZXIsIGJ1dCB1bmRlciBhbiBvbGRlciBQeXRob24taW5zcGlyZWQgZm9ybS4gIFRoaXMgZnVuY3Rpb25cclxuICogd29ya3Mgb24gYm90aCBraW5kcyBvZiBnZW5lcmF0b3JzLlxyXG4gKlxyXG4gKiBEZWNvcmF0ZXMgYSBnZW5lcmF0b3IgZnVuY3Rpb24gc3VjaCB0aGF0OlxyXG4gKiAgLSBpdCBtYXkgeWllbGQgcHJvbWlzZXNcclxuICogIC0gZXhlY3V0aW9uIHdpbGwgY29udGludWUgd2hlbiB0aGF0IHByb21pc2UgaXMgZnVsZmlsbGVkXHJcbiAqICAtIHRoZSB2YWx1ZSBvZiB0aGUgeWllbGQgZXhwcmVzc2lvbiB3aWxsIGJlIHRoZSBmdWxmaWxsZWQgdmFsdWVcclxuICogIC0gaXQgcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgKHdoZW4gdGhlIGdlbmVyYXRvclxyXG4gKiAgICBzdG9wcyBpdGVyYXRpbmcpXHJcbiAqICAtIHRoZSBkZWNvcmF0ZWQgZnVuY3Rpb24gcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICogICAgb2YgdGhlIGdlbmVyYXRvciBvciB0aGUgZmlyc3QgcmVqZWN0ZWQgcHJvbWlzZSBhbW9uZyB0aG9zZVxyXG4gKiAgICB5aWVsZGVkLlxyXG4gKiAgLSBpZiBhbiBlcnJvciBpcyB0aHJvd24gaW4gdGhlIGdlbmVyYXRvciwgaXQgcHJvcGFnYXRlcyB0aHJvdWdoXHJcbiAqICAgIGV2ZXJ5IGZvbGxvd2luZyB5aWVsZCB1bnRpbCBpdCBpcyBjYXVnaHQsIG9yIHVudGlsIGl0IGVzY2FwZXNcclxuICogICAgdGhlIGdlbmVyYXRvciBmdW5jdGlvbiBhbHRvZ2V0aGVyLCBhbmQgaXMgdHJhbnNsYXRlZCBpbnRvIGFcclxuICogICAgcmVqZWN0aW9uIGZvciB0aGUgcHJvbWlzZSByZXR1cm5lZCBieSB0aGUgZGVjb3JhdGVkIGdlbmVyYXRvci5cclxuICovXHJcblEuYXN5bmMgPSBhc3luYztcclxuZnVuY3Rpb24gYXN5bmMobWFrZUdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAvLyB3aGVuIHZlcmIgaXMgXCJzZW5kXCIsIGFyZyBpcyBhIHZhbHVlXHJcbiAgICAgICAgLy8gd2hlbiB2ZXJiIGlzIFwidGhyb3dcIiwgYXJnIGlzIGFuIGV4Y2VwdGlvblxyXG4gICAgICAgIGZ1bmN0aW9uIGNvbnRpbnVlcih2ZXJiLCBhcmcpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdDtcclxuXHJcbiAgICAgICAgICAgIC8vIFVudGlsIFY4IDMuMTkgLyBDaHJvbWl1bSAyOSBpcyByZWxlYXNlZCwgU3BpZGVyTW9ua2V5IGlzIHRoZSBvbmx5XHJcbiAgICAgICAgICAgIC8vIGVuZ2luZSB0aGF0IGhhcyBhIGRlcGxveWVkIGJhc2Ugb2YgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IGdlbmVyYXRvcnMuXHJcbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIFNNJ3MgZ2VuZXJhdG9ycyB1c2UgdGhlIFB5dGhvbi1pbnNwaXJlZCBzZW1hbnRpY3Mgb2ZcclxuICAgICAgICAgICAgLy8gb3V0ZGF0ZWQgRVM2IGRyYWZ0cy4gIFdlIHdvdWxkIGxpa2UgdG8gc3VwcG9ydCBFUzYsIGJ1dCB3ZSdkIGFsc29cclxuICAgICAgICAgICAgLy8gbGlrZSB0byBtYWtlIGl0IHBvc3NpYmxlIHRvIHVzZSBnZW5lcmF0b3JzIGluIGRlcGxveWVkIGJyb3dzZXJzLCBzb1xyXG4gICAgICAgICAgICAvLyB3ZSBhbHNvIHN1cHBvcnQgUHl0aG9uLXN0eWxlIGdlbmVyYXRvcnMuICBBdCBzb21lIHBvaW50IHdlIGNhbiByZW1vdmVcclxuICAgICAgICAgICAgLy8gdGhpcyBibG9jay5cclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgU3RvcEl0ZXJhdGlvbiA9PT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgLy8gRVM2IEdlbmVyYXRvcnNcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZ2VuZXJhdG9yW3ZlcmJdKGFyZyk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LmRvbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUShyZXN1bHQudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gd2hlbihyZXN1bHQudmFsdWUsIGNhbGxiYWNrLCBlcnJiYWNrKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFNwaWRlck1vbmtleSBHZW5lcmF0b3JzXHJcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogUmVtb3ZlIHRoaXMgY2FzZSB3aGVuIFNNIGRvZXMgRVM2IGdlbmVyYXRvcnMuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGdlbmVyYXRvclt2ZXJiXShhcmcpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU3RvcEl0ZXJhdGlvbihleGNlcHRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBRKGV4Y2VwdGlvbi52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB3aGVuKHJlc3VsdCwgY2FsbGJhY2ssIGVycmJhY2spO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnZW5lcmF0b3IgPSBtYWtlR2VuZXJhdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gY29udGludWVyLmJpbmQoY29udGludWVyLCBcIm5leHRcIik7XHJcbiAgICAgICAgdmFyIGVycmJhY2sgPSBjb250aW51ZXIuYmluZChjb250aW51ZXIsIFwidGhyb3dcIik7XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vKipcclxuICogVGhlIHNwYXduIGZ1bmN0aW9uIGlzIGEgc21hbGwgd3JhcHBlciBhcm91bmQgYXN5bmMgdGhhdCBpbW1lZGlhdGVseVxyXG4gKiBjYWxscyB0aGUgZ2VuZXJhdG9yIGFuZCBhbHNvIGVuZHMgdGhlIHByb21pc2UgY2hhaW4sIHNvIHRoYXQgYW55XHJcbiAqIHVuaGFuZGxlZCBlcnJvcnMgYXJlIHRocm93biBpbnN0ZWFkIG9mIGZvcndhcmRlZCB0byB0aGUgZXJyb3JcclxuICogaGFuZGxlci4gVGhpcyBpcyB1c2VmdWwgYmVjYXVzZSBpdCdzIGV4dHJlbWVseSBjb21tb24gdG8gcnVuXHJcbiAqIGdlbmVyYXRvcnMgYXQgdGhlIHRvcC1sZXZlbCB0byB3b3JrIHdpdGggbGlicmFyaWVzLlxyXG4gKi9cclxuUS5zcGF3biA9IHNwYXduO1xyXG5mdW5jdGlvbiBzcGF3bihtYWtlR2VuZXJhdG9yKSB7XHJcbiAgICBRLmRvbmUoUS5hc3luYyhtYWtlR2VuZXJhdG9yKSgpKTtcclxufVxyXG5cclxuLy8gRklYTUU6IFJlbW92ZSB0aGlzIGludGVyZmFjZSBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpbiBTcGlkZXJNb25rZXkuXHJcbi8qKlxyXG4gKiBUaHJvd3MgYSBSZXR1cm5WYWx1ZSBleGNlcHRpb24gdG8gc3RvcCBhbiBhc3luY2hyb25vdXMgZ2VuZXJhdG9yLlxyXG4gKlxyXG4gKiBUaGlzIGludGVyZmFjZSBpcyBhIHN0b3AtZ2FwIG1lYXN1cmUgdG8gc3VwcG9ydCBnZW5lcmF0b3IgcmV0dXJuXHJcbiAqIHZhbHVlcyBpbiBvbGRlciBGaXJlZm94L1NwaWRlck1vbmtleS4gIEluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBFUzZcclxuICogZ2VuZXJhdG9ycyBsaWtlIENocm9taXVtIDI5LCBqdXN0IHVzZSBcInJldHVyblwiIGluIHlvdXIgZ2VuZXJhdG9yXHJcbiAqIGZ1bmN0aW9ucy5cclxuICpcclxuICogQHBhcmFtIHZhbHVlIHRoZSByZXR1cm4gdmFsdWUgZm9yIHRoZSBzdXJyb3VuZGluZyBnZW5lcmF0b3JcclxuICogQHRocm93cyBSZXR1cm5WYWx1ZSBleGNlcHRpb24gd2l0aCB0aGUgdmFsdWUuXHJcbiAqIEBleGFtcGxlXHJcbiAqIC8vIEVTNiBzdHlsZVxyXG4gKiBRLmFzeW5jKGZ1bmN0aW9uKiAoKSB7XHJcbiAqICAgICAgdmFyIGZvbyA9IHlpZWxkIGdldEZvb1Byb21pc2UoKTtcclxuICogICAgICB2YXIgYmFyID0geWllbGQgZ2V0QmFyUHJvbWlzZSgpO1xyXG4gKiAgICAgIHJldHVybiBmb28gKyBiYXI7XHJcbiAqIH0pXHJcbiAqIC8vIE9sZGVyIFNwaWRlck1vbmtleSBzdHlsZVxyXG4gKiBRLmFzeW5jKGZ1bmN0aW9uICgpIHtcclxuICogICAgICB2YXIgZm9vID0geWllbGQgZ2V0Rm9vUHJvbWlzZSgpO1xyXG4gKiAgICAgIHZhciBiYXIgPSB5aWVsZCBnZXRCYXJQcm9taXNlKCk7XHJcbiAqICAgICAgUS5yZXR1cm4oZm9vICsgYmFyKTtcclxuICogfSlcclxuICovXHJcblFbXCJyZXR1cm5cIl0gPSBfcmV0dXJuO1xyXG5mdW5jdGlvbiBfcmV0dXJuKHZhbHVlKSB7XHJcbiAgICB0aHJvdyBuZXcgUVJldHVyblZhbHVlKHZhbHVlKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZSBwcm9taXNlZCBmdW5jdGlvbiBkZWNvcmF0b3IgZW5zdXJlcyB0aGF0IGFueSBwcm9taXNlIGFyZ3VtZW50c1xyXG4gKiBhcmUgc2V0dGxlZCBhbmQgcGFzc2VkIGFzIHZhbHVlcyAoYHRoaXNgIGlzIGFsc28gc2V0dGxlZCBhbmQgcGFzc2VkXHJcbiAqIGFzIGEgdmFsdWUpLiAgSXQgd2lsbCBhbHNvIGVuc3VyZSB0aGF0IHRoZSByZXN1bHQgb2YgYSBmdW5jdGlvbiBpc1xyXG4gKiBhbHdheXMgYSBwcm9taXNlLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiB2YXIgYWRkID0gUS5wcm9taXNlZChmdW5jdGlvbiAoYSwgYikge1xyXG4gKiAgICAgcmV0dXJuIGEgKyBiO1xyXG4gKiB9KTtcclxuICogYWRkKFEoYSksIFEoQikpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gZGVjb3JhdGVcclxuICogQHJldHVybnMge2Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRoYXQgaGFzIGJlZW4gZGVjb3JhdGVkLlxyXG4gKi9cclxuUS5wcm9taXNlZCA9IHByb21pc2VkO1xyXG5mdW5jdGlvbiBwcm9taXNlZChjYWxsYmFjaykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gc3ByZWFkKFt0aGlzLCBhbGwoYXJndW1lbnRzKV0sIGZ1bmN0aW9uIChzZWxmLCBhcmdzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShzZWxmLCBhcmdzKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBzZW5kcyBhIG1lc3NhZ2UgdG8gYSB2YWx1ZSBpbiBhIGZ1dHVyZSB0dXJuXHJcbiAqIEBwYXJhbSBvYmplY3QqIHRoZSByZWNpcGllbnRcclxuICogQHBhcmFtIG9wIHRoZSBuYW1lIG9mIHRoZSBtZXNzYWdlIG9wZXJhdGlvbiwgZS5nLiwgXCJ3aGVuXCIsXHJcbiAqIEBwYXJhbSBhcmdzIGZ1cnRoZXIgYXJndW1lbnRzIHRvIGJlIGZvcndhcmRlZCB0byB0aGUgb3BlcmF0aW9uXHJcbiAqIEByZXR1cm5zIHJlc3VsdCB7UHJvbWlzZX0gYSBwcm9taXNlIGZvciB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb25cclxuICovXHJcblEuZGlzcGF0Y2ggPSBkaXNwYXRjaDtcclxuZnVuY3Rpb24gZGlzcGF0Y2gob2JqZWN0LCBvcCwgYXJncykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChvcCwgYXJncyk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24gKG9wLCBhcmdzKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKGRlZmVycmVkLnJlc29sdmUsIG9wLCBhcmdzKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZ2V0XHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHByb3BlcnR5IHZhbHVlXHJcbiAqL1xyXG5RLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImdldFwiLCBba2V5XSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImdldFwiLCBba2V5XSk7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3Igb2JqZWN0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gc2V0XHJcbiAqIEBwYXJhbSB2YWx1ZSAgICAgbmV3IHZhbHVlIG9mIHByb3BlcnR5XHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxyXG4gKi9cclxuUS5zZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwic2V0XCIsIFtrZXksIHZhbHVlXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJzZXRcIiwgW2tleSwgdmFsdWVdKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWxldGVzIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIHByb3BlcnR5IHRvIGRlbGV0ZVxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICovXHJcblEuZGVsID0gLy8gWFhYIGxlZ2FjeVxyXG5RW1wiZGVsZXRlXCJdID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiZGVsZXRlXCIsIFtrZXldKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmRlbCA9IC8vIFhYWCBsZWdhY3lcclxuUHJvbWlzZS5wcm90b3R5cGVbXCJkZWxldGVcIl0gPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XHJcbn07XHJcblxyXG4vKipcclxuICogSW52b2tlcyBhIG1ldGhvZCBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxyXG4gKiBAcGFyYW0gdmFsdWUgICAgIGEgdmFsdWUgdG8gcG9zdCwgdHlwaWNhbGx5IGFuIGFycmF5IG9mXHJcbiAqICAgICAgICAgICAgICAgICAgaW52b2NhdGlvbiBhcmd1bWVudHMgZm9yIHByb21pc2VzIHRoYXRcclxuICogICAgICAgICAgICAgICAgICBhcmUgdWx0aW1hdGVseSBiYWNrZWQgd2l0aCBgcmVzb2x2ZWAgdmFsdWVzLFxyXG4gKiAgICAgICAgICAgICAgICAgIGFzIG9wcG9zZWQgdG8gdGhvc2UgYmFja2VkIHdpdGggVVJMc1xyXG4gKiAgICAgICAgICAgICAgICAgIHdoZXJlaW4gdGhlIHBvc3RlZCB2YWx1ZSBjYW4gYmUgYW55XHJcbiAqICAgICAgICAgICAgICAgICAgSlNPTiBzZXJpYWxpemFibGUgb2JqZWN0LlxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICovXHJcbi8vIGJvdW5kIGxvY2FsbHkgYmVjYXVzZSBpdCBpcyB1c2VkIGJ5IG90aGVyIG1ldGhvZHNcclxuUS5tYXBwbHkgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5RLnBvc3QgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCBhcmdzKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUHJvbWlzZS5wcm90b3R5cGUucG9zdCA9IGZ1bmN0aW9uIChuYW1lLCBhcmdzKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFyZ3NdKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJbnZva2VzIGEgbWV0aG9kIGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XHJcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBtZXRob2QgdG8gaW52b2tlXHJcbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgaW52b2NhdGlvbiBhcmd1bWVudHNcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqL1xyXG5RLnNlbmQgPSAvLyBYWFggTWFyayBNaWxsZXIncyBwcm9wb3NlZCBwYXJsYW5jZVxyXG5RLm1jYWxsID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUS5pbnZva2UgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lIC8qLi4uYXJncyovKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAyKV0pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuc2VuZCA9IC8vIFhYWCBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIHBhcmxhbmNlXHJcblByb21pc2UucHJvdG90eXBlLm1jYWxsID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUHJvbWlzZS5wcm90b3R5cGUuaW52b2tlID0gZnVuY3Rpb24gKG5hbWUgLyouLi5hcmdzKi8pIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFwcGxpZXMgdGhlIHByb21pc2VkIGZ1bmN0aW9uIGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgZnVuY3Rpb25cclxuICogQHBhcmFtIGFyZ3MgICAgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcclxuICovXHJcblEuZmFwcGx5ID0gZnVuY3Rpb24gKG9iamVjdCwgYXJncykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFyZ3NdKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFyZ3NdKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxscyB0aGUgcHJvbWlzZWQgZnVuY3Rpb24gaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxyXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGFwcGxpY2F0aW9uIGFyZ3VtZW50c1xyXG4gKi9cclxuUVtcInRyeVwiXSA9XHJcblEuZmNhbGwgPSBmdW5jdGlvbiAob2JqZWN0IC8qIC4uLmFyZ3MqLykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSldKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmZjYWxsID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFycmF5X3NsaWNlKGFyZ3VtZW50cyldKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBCaW5kcyB0aGUgcHJvbWlzZWQgZnVuY3Rpb24sIHRyYW5zZm9ybWluZyByZXR1cm4gdmFsdWVzIGludG8gYSBmdWxmaWxsZWRcclxuICogcHJvbWlzZSBhbmQgdGhyb3duIGVycm9ycyBpbnRvIGEgcmVqZWN0ZWQgb25lLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgYXBwbGljYXRpb24gYXJndW1lbnRzXHJcbiAqL1xyXG5RLmZiaW5kID0gZnVuY3Rpb24gKG9iamVjdCAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIHByb21pc2UgPSBRKG9iamVjdCk7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xyXG4gICAgICAgIHJldHVybiBwcm9taXNlLmRpc3BhdGNoKFwiYXBwbHlcIiwgW1xyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxyXG4gICAgICAgIF0pO1xyXG4gICAgfTtcclxufTtcclxuUHJvbWlzZS5wcm90b3R5cGUuZmJpbmQgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBwcm9taXNlID0gdGhpcztcclxuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcclxuICAgIHJldHVybiBmdW5jdGlvbiBmYm91bmQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2UuZGlzcGF0Y2goXCJhcHBseVwiLCBbXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpXHJcbiAgICAgICAgXSk7XHJcbiAgICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlcXVlc3RzIHRoZSBuYW1lcyBvZiB0aGUgb3duZWQgcHJvcGVydGllcyBvZiBhIHByb21pc2VkXHJcbiAqIG9iamVjdCBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSBrZXlzIG9mIHRoZSBldmVudHVhbGx5IHNldHRsZWQgb2JqZWN0XHJcbiAqL1xyXG5RLmtleXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwia2V5c1wiLCBbXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJrZXlzXCIsIFtdKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUdXJucyBhbiBhcnJheSBvZiBwcm9taXNlcyBpbnRvIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkuICBJZiBhbnkgb2ZcclxuICogdGhlIHByb21pc2VzIGdldHMgcmVqZWN0ZWQsIHRoZSB3aG9sZSBhcnJheSBpcyByZWplY3RlZCBpbW1lZGlhdGVseS5cclxuICogQHBhcmFtIHtBcnJheSp9IGFuIGFycmF5IChvciBwcm9taXNlIGZvciBhbiBhcnJheSkgb2YgdmFsdWVzIChvclxyXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlc1xyXG4gKi9cclxuLy8gQnkgTWFyayBNaWxsZXJcclxuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9c3RyYXdtYW46Y29uY3VycmVuY3kmcmV2PTEzMDg3NzY1MjEjYWxsZnVsZmlsbGVkXHJcblEuYWxsID0gYWxsO1xyXG5mdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcclxuICAgIHJldHVybiB3aGVuKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZXMpIHtcclxuICAgICAgICB2YXIgY291bnREb3duID0gMDtcclxuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgICAgIGFycmF5X3JlZHVjZShwcm9taXNlcywgZnVuY3Rpb24gKHVuZGVmaW5lZCwgcHJvbWlzZSwgaW5kZXgpIHtcclxuICAgICAgICAgICAgdmFyIHNuYXBzaG90O1xyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICBpc1Byb21pc2UocHJvbWlzZSkgJiZcclxuICAgICAgICAgICAgICAgIChzbmFwc2hvdCA9IHByb21pc2UuaW5zcGVjdCgpKS5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIlxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIHByb21pc2VzW2luZGV4XSA9IHNuYXBzaG90LnZhbHVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgKytjb3VudERvd247XHJcbiAgICAgICAgICAgICAgICB3aGVuKFxyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2VzW2luZGV4XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudERvd24gPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocHJvbWlzZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHByb2dyZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLm5vdGlmeSh7IGluZGV4OiBpbmRleCwgdmFsdWU6IHByb2dyZXNzIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCB2b2lkIDApO1xyXG4gICAgICAgIGlmIChjb3VudERvd24gPT09IDApIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwcm9taXNlcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmFsbCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBhbGwodGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogV2FpdHMgZm9yIGFsbCBwcm9taXNlcyB0byBiZSBzZXR0bGVkLCBlaXRoZXIgZnVsZmlsbGVkIG9yXHJcbiAqIHJlamVjdGVkLiAgVGhpcyBpcyBkaXN0aW5jdCBmcm9tIGBhbGxgIHNpbmNlIHRoYXQgd291bGQgc3RvcFxyXG4gKiB3YWl0aW5nIGF0IHRoZSBmaXJzdCByZWplY3Rpb24uICBUaGUgcHJvbWlzZSByZXR1cm5lZCBieVxyXG4gKiBgYWxsUmVzb2x2ZWRgIHdpbGwgbmV2ZXIgYmUgcmVqZWN0ZWQuXHJcbiAqIEBwYXJhbSBwcm9taXNlcyBhIHByb21pc2UgZm9yIGFuIGFycmF5IChvciBhbiBhcnJheSkgb2YgcHJvbWlzZXNcclxuICogKG9yIHZhbHVlcylcclxuICogQHJldHVybiBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHByb21pc2VzXHJcbiAqL1xyXG5RLmFsbFJlc29sdmVkID0gZGVwcmVjYXRlKGFsbFJlc29sdmVkLCBcImFsbFJlc29sdmVkXCIsIFwiYWxsU2V0dGxlZFwiKTtcclxuZnVuY3Rpb24gYWxsUmVzb2x2ZWQocHJvbWlzZXMpIHtcclxuICAgIHJldHVybiB3aGVuKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZXMpIHtcclxuICAgICAgICBwcm9taXNlcyA9IGFycmF5X21hcChwcm9taXNlcywgUSk7XHJcbiAgICAgICAgcmV0dXJuIHdoZW4oYWxsKGFycmF5X21hcChwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHdoZW4ocHJvbWlzZSwgbm9vcCwgbm9vcCk7XHJcbiAgICAgICAgfSkpLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlcztcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5hbGxSZXNvbHZlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBhbGxSZXNvbHZlZCh0aGlzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAc2VlIFByb21pc2UjYWxsU2V0dGxlZFxyXG4gKi9cclxuUS5hbGxTZXR0bGVkID0gYWxsU2V0dGxlZDtcclxuZnVuY3Rpb24gYWxsU2V0dGxlZChwcm9taXNlcykge1xyXG4gICAgcmV0dXJuIFEocHJvbWlzZXMpLmFsbFNldHRsZWQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR1cm5zIGFuIGFycmF5IG9mIHByb21pc2VzIGludG8gYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiB0aGVpciBzdGF0ZXMgKGFzXHJcbiAqIHJldHVybmVkIGJ5IGBpbnNwZWN0YCkgd2hlbiB0aGV5IGhhdmUgYWxsIHNldHRsZWQuXHJcbiAqIEBwYXJhbSB7QXJyYXlbQW55Kl19IHZhbHVlcyBhbiBhcnJheSAob3IgcHJvbWlzZSBmb3IgYW4gYXJyYXkpIG9mIHZhbHVlcyAob3JcclxuICogcHJvbWlzZXMgZm9yIHZhbHVlcylcclxuICogQHJldHVybnMge0FycmF5W1N0YXRlXX0gYW4gYXJyYXkgb2Ygc3RhdGVzIGZvciB0aGUgcmVzcGVjdGl2ZSB2YWx1ZXMuXHJcbiAqL1xyXG5Qcm9taXNlLnByb3RvdHlwZS5hbGxTZXR0bGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAocHJvbWlzZXMpIHtcclxuICAgICAgICByZXR1cm4gYWxsKGFycmF5X21hcChwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2UpIHtcclxuICAgICAgICAgICAgcHJvbWlzZSA9IFEocHJvbWlzZSk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlZ2FyZGxlc3MoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZS5pbnNwZWN0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbihyZWdhcmRsZXNzLCByZWdhcmRsZXNzKTtcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXB0dXJlcyB0aGUgZmFpbHVyZSBvZiBhIHByb21pc2UsIGdpdmluZyBhbiBvcG9ydHVuaXR5IHRvIHJlY292ZXJcclxuICogd2l0aCBhIGNhbGxiYWNrLiAgSWYgdGhlIGdpdmVuIHByb21pc2UgaXMgZnVsZmlsbGVkLCB0aGUgcmV0dXJuZWRcclxuICogcHJvbWlzZSBpcyBmdWxmaWxsZWQuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBmb3Igc29tZXRoaW5nXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHRvIGZ1bGZpbGwgdGhlIHJldHVybmVkIHByb21pc2UgaWYgdGhlXHJcbiAqIGdpdmVuIHByb21pc2UgaXMgcmVqZWN0ZWRcclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBjYWxsYmFja1xyXG4gKi9cclxuUS5mYWlsID0gLy8gWFhYIGxlZ2FjeVxyXG5RW1wiY2F0Y2hcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCByZWplY3RlZCkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS50aGVuKHZvaWQgMCwgcmVqZWN0ZWQpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZmFpbCA9IC8vIFhYWCBsZWdhY3lcclxuUHJvbWlzZS5wcm90b3R5cGVbXCJjYXRjaFwiXSA9IGZ1bmN0aW9uIChyZWplY3RlZCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBdHRhY2hlcyBhIGxpc3RlbmVyIHRoYXQgY2FuIHJlc3BvbmQgdG8gcHJvZ3Jlc3Mgbm90aWZpY2F0aW9ucyBmcm9tIGFcclxuICogcHJvbWlzZSdzIG9yaWdpbmF0aW5nIGRlZmVycmVkLiBUaGlzIGxpc3RlbmVyIHJlY2VpdmVzIHRoZSBleGFjdCBhcmd1bWVudHNcclxuICogcGFzc2VkIHRvIGBgZGVmZXJyZWQubm90aWZ5YGAuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBmb3Igc29tZXRoaW5nXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHRvIHJlY2VpdmUgYW55IHByb2dyZXNzIG5vdGlmaWNhdGlvbnNcclxuICogQHJldHVybnMgdGhlIGdpdmVuIHByb21pc2UsIHVuY2hhbmdlZFxyXG4gKi9cclxuUS5wcm9ncmVzcyA9IHByb2dyZXNzO1xyXG5mdW5jdGlvbiBwcm9ncmVzcyhvYmplY3QsIHByb2dyZXNzZWQpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkudGhlbih2b2lkIDAsIHZvaWQgMCwgcHJvZ3Jlc3NlZCk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnByb2dyZXNzID0gZnVuY3Rpb24gKHByb2dyZXNzZWQpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4odm9pZCAwLCB2b2lkIDAsIHByb2dyZXNzZWQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFByb3ZpZGVzIGFuIG9wcG9ydHVuaXR5IHRvIG9ic2VydmUgdGhlIHNldHRsaW5nIG9mIGEgcHJvbWlzZSxcclxuICogcmVnYXJkbGVzcyBvZiB3aGV0aGVyIHRoZSBwcm9taXNlIGlzIGZ1bGZpbGxlZCBvciByZWplY3RlZC4gIEZvcndhcmRzXHJcbiAqIHRoZSByZXNvbHV0aW9uIHRvIHRoZSByZXR1cm5lZCBwcm9taXNlIHdoZW4gdGhlIGNhbGxiYWNrIGlzIGRvbmUuXHJcbiAqIFRoZSBjYWxsYmFjayBjYW4gcmV0dXJuIGEgcHJvbWlzZSB0byBkZWZlciBjb21wbGV0aW9uLlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2VcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gb2JzZXJ2ZSB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW5cclxuICogcHJvbWlzZSwgdGFrZXMgbm8gYXJndW1lbnRzLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlIHdoZW5cclxuICogYGBmaW5gYCBpcyBkb25lLlxyXG4gKi9cclxuUS5maW4gPSAvLyBYWFggbGVnYWN5XHJcblFbXCJmaW5hbGx5XCJdID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcclxuICAgIHJldHVybiBRKG9iamVjdClbXCJmaW5hbGx5XCJdKGNhbGxiYWNrKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmZpbiA9IC8vIFhYWCBsZWdhY3lcclxuUHJvbWlzZS5wcm90b3R5cGVbXCJmaW5hbGx5XCJdID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICBjYWxsYmFjayA9IFEoY2FsbGJhY2spO1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gY2FsbGJhY2suZmNhbGwoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xyXG4gICAgICAgIC8vIFRPRE8gYXR0ZW1wdCB0byByZWN5Y2xlIHRoZSByZWplY3Rpb24gd2l0aCBcInRoaXNcIi5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2suZmNhbGwoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhyb3cgcmVhc29uO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogVGVybWluYXRlcyBhIGNoYWluIG9mIHByb21pc2VzLCBmb3JjaW5nIHJlamVjdGlvbnMgdG8gYmVcclxuICogdGhyb3duIGFzIGV4Y2VwdGlvbnMuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBhdCB0aGUgZW5kIG9mIGEgY2hhaW4gb2YgcHJvbWlzZXNcclxuICogQHJldHVybnMgbm90aGluZ1xyXG4gKi9cclxuUS5kb25lID0gZnVuY3Rpb24gKG9iamVjdCwgZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZG9uZShmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcyk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKSB7XHJcbiAgICB2YXIgb25VbmhhbmRsZWRFcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgIC8vIGZvcndhcmQgdG8gYSBmdXR1cmUgdHVybiBzbyB0aGF0IGBgd2hlbmBgXHJcbiAgICAgICAgLy8gZG9lcyBub3QgY2F0Y2ggaXQgYW5kIHR1cm4gaXQgaW50byBhIHJlamVjdGlvbi5cclxuICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIG1ha2VTdGFja1RyYWNlTG9uZyhlcnJvciwgcHJvbWlzZSk7XHJcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIFEub25lcnJvcihlcnJvcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBdm9pZCB1bm5lY2Vzc2FyeSBgbmV4dFRpY2tgaW5nIHZpYSBhbiB1bm5lY2Vzc2FyeSBgd2hlbmAuXHJcbiAgICB2YXIgcHJvbWlzZSA9IGZ1bGZpbGxlZCB8fCByZWplY3RlZCB8fCBwcm9ncmVzcyA/XHJcbiAgICAgICAgdGhpcy50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKSA6XHJcbiAgICAgICAgdGhpcztcclxuXHJcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgcHJvY2VzcyAmJiBwcm9jZXNzLmRvbWFpbikge1xyXG4gICAgICAgIG9uVW5oYW5kbGVkRXJyb3IgPSBwcm9jZXNzLmRvbWFpbi5iaW5kKG9uVW5oYW5kbGVkRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb21pc2UudGhlbih2b2lkIDAsIG9uVW5oYW5kbGVkRXJyb3IpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhdXNlcyBhIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQgaWYgaXQgZG9lcyBub3QgZ2V0IGZ1bGZpbGxlZCBiZWZvcmVcclxuICogc29tZSBtaWxsaXNlY29uZHMgdGltZSBvdXQuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbWlsbGlzZWNvbmRzIHRpbWVvdXRcclxuICogQHBhcmFtIHtBbnkqfSBjdXN0b20gZXJyb3IgbWVzc2FnZSBvciBFcnJvciBvYmplY3QgKG9wdGlvbmFsKVxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlIGlmIGl0IGlzXHJcbiAqIGZ1bGZpbGxlZCBiZWZvcmUgdGhlIHRpbWVvdXQsIG90aGVyd2lzZSByZWplY3RlZC5cclxuICovXHJcblEudGltZW91dCA9IGZ1bmN0aW9uIChvYmplY3QsIG1zLCBlcnJvcikge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS50aW1lb3V0KG1zLCBlcnJvcik7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24gKG1zLCBlcnJvcikge1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIHZhciB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoIWVycm9yIHx8IFwic3RyaW5nXCIgPT09IHR5cGVvZiBlcnJvcikge1xyXG4gICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihlcnJvciB8fCBcIlRpbWVkIG91dCBhZnRlciBcIiArIG1zICsgXCIgbXNcIik7XHJcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPSBcIkVUSU1FRE9VVFwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgfSwgbXMpO1xyXG5cclxuICAgIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcclxuICAgIH0sIGZ1bmN0aW9uIChleGNlcHRpb24pIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcclxuICAgIH0sIGRlZmVycmVkLm5vdGlmeSk7XHJcblxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSBnaXZlbiB2YWx1ZSAob3IgcHJvbWlzZWQgdmFsdWUpLCBzb21lXHJcbiAqIG1pbGxpc2Vjb25kcyBhZnRlciBpdCByZXNvbHZlZC4gUGFzc2VzIHJlamVjdGlvbnMgaW1tZWRpYXRlbHkuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbWlsbGlzZWNvbmRzXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UgYWZ0ZXIgbWlsbGlzZWNvbmRzXHJcbiAqIHRpbWUgaGFzIGVsYXBzZWQgc2luY2UgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UuXHJcbiAqIElmIHRoZSBnaXZlbiBwcm9taXNlIHJlamVjdHMsIHRoYXQgaXMgcGFzc2VkIGltbWVkaWF0ZWx5LlxyXG4gKi9cclxuUS5kZWxheSA9IGZ1bmN0aW9uIChvYmplY3QsIHRpbWVvdXQpIHtcclxuICAgIGlmICh0aW1lb3V0ID09PSB2b2lkIDApIHtcclxuICAgICAgICB0aW1lb3V0ID0gb2JqZWN0O1xyXG4gICAgICAgIG9iamVjdCA9IHZvaWQgMDtcclxuICAgIH1cclxuICAgIHJldHVybiBRKG9iamVjdCkuZGVsYXkodGltZW91dCk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5kZWxheSA9IGZ1bmN0aW9uICh0aW1lb3V0KSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xyXG4gICAgICAgIH0sIHRpbWVvdXQpO1xyXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogUGFzc2VzIGEgY29udGludWF0aW9uIHRvIGEgTm9kZSBmdW5jdGlvbiwgd2hpY2ggaXMgY2FsbGVkIHdpdGggdGhlIGdpdmVuXHJcbiAqIGFyZ3VtZW50cyBwcm92aWRlZCBhcyBhbiBhcnJheSwgYW5kIHJldHVybnMgYSBwcm9taXNlLlxyXG4gKlxyXG4gKiAgICAgIFEubmZhcHBseShGUy5yZWFkRmlsZSwgW19fZmlsZW5hbWVdKVxyXG4gKiAgICAgIC50aGVuKGZ1bmN0aW9uIChjb250ZW50KSB7XHJcbiAqICAgICAgfSlcclxuICpcclxuICovXHJcblEubmZhcHBseSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYXJncykge1xyXG4gICAgcmV0dXJuIFEoY2FsbGJhY2spLm5mYXBwbHkoYXJncyk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5uZmFwcGx5ID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIHRoaXMuZmFwcGx5KG5vZGVBcmdzKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQYXNzZXMgYSBjb250aW51YXRpb24gdG8gYSBOb2RlIGZ1bmN0aW9uLCB3aGljaCBpcyBjYWxsZWQgd2l0aCB0aGUgZ2l2ZW5cclxuICogYXJndW1lbnRzIHByb3ZpZGVkIGluZGl2aWR1YWxseSwgYW5kIHJldHVybnMgYSBwcm9taXNlLlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBRLm5mY2FsbChGUy5yZWFkRmlsZSwgX19maWxlbmFtZSlcclxuICogLnRoZW4oZnVuY3Rpb24gKGNvbnRlbnQpIHtcclxuICogfSlcclxuICpcclxuICovXHJcblEubmZjYWxsID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XHJcbiAgICByZXR1cm4gUShjYWxsYmFjaykubmZhcHBseShhcmdzKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5mY2FsbCA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICB0aGlzLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JhcHMgYSBOb2RlSlMgY29udGludWF0aW9uIHBhc3NpbmcgZnVuY3Rpb24gYW5kIHJldHVybnMgYW4gZXF1aXZhbGVudFxyXG4gKiB2ZXJzaW9uIHRoYXQgcmV0dXJucyBhIHByb21pc2UuXHJcbiAqIEBleGFtcGxlXHJcbiAqIFEubmZiaW5kKEZTLnJlYWRGaWxlLCBfX2ZpbGVuYW1lKShcInV0Zi04XCIpXHJcbiAqIC50aGVuKGNvbnNvbGUubG9nKVxyXG4gKiAuZG9uZSgpXHJcbiAqL1xyXG5RLm5mYmluZCA9XHJcblEuZGVub2RlaWZ5ID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYmFzZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgbm9kZUFyZ3MgPSBiYXNlQXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSk7XHJcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICAgICAgUShjYWxsYmFjaykuZmFwcGx5KG5vZGVBcmdzKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICB9O1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubmZiaW5kID1cclxuUHJvbWlzZS5wcm90b3R5cGUuZGVub2RlaWZ5ID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XHJcbiAgICBhcmdzLnVuc2hpZnQodGhpcyk7XHJcbiAgICByZXR1cm4gUS5kZW5vZGVpZnkuYXBwbHkodm9pZCAwLCBhcmdzKTtcclxufTtcclxuXHJcblEubmJpbmQgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNwIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYmFzZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDIpO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgbm9kZUFyZ3MgPSBiYXNlQXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSk7XHJcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICAgICAgZnVuY3Rpb24gYm91bmQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseSh0aGlzcCwgYXJndW1lbnRzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgUShib3VuZCkuZmFwcGx5KG5vZGVBcmdzKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICB9O1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubmJpbmQgPSBmdW5jdGlvbiAoLyp0aGlzcCwgLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMCk7XHJcbiAgICBhcmdzLnVuc2hpZnQodGhpcyk7XHJcbiAgICByZXR1cm4gUS5uYmluZC5hcHBseSh2b2lkIDAsIGFyZ3MpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGxzIGEgbWV0aG9kIG9mIGEgTm9kZS1zdHlsZSBvYmplY3QgdGhhdCBhY2NlcHRzIGEgTm9kZS1zdHlsZVxyXG4gKiBjYWxsYmFjayB3aXRoIGEgZ2l2ZW4gYXJyYXkgb2YgYXJndW1lbnRzLCBwbHVzIGEgcHJvdmlkZWQgY2FsbGJhY2suXHJcbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgbWV0aG9kIG9mIG9iamVjdFxyXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBtZXRob2Q7IHRoZSBjYWxsYmFja1xyXG4gKiB3aWxsIGJlIHByb3ZpZGVkIGJ5IFEgYW5kIGFwcGVuZGVkIHRvIHRoZXNlIGFyZ3VtZW50cy5cclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgdmFsdWUgb3IgZXJyb3JcclxuICovXHJcblEubm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblEubnBvc3QgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCBhcmdzKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLm5wb3N0KG5hbWUsIGFyZ3MpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblByb21pc2UucHJvdG90eXBlLm5wb3N0ID0gZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3MgfHwgW10pO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBub2RlQXJnc10pLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGxzIGEgbWV0aG9kIG9mIGEgTm9kZS1zdHlsZSBvYmplY3QgdGhhdCBhY2NlcHRzIGEgTm9kZS1zdHlsZVxyXG4gKiBjYWxsYmFjaywgZm9yd2FyZGluZyB0aGUgZ2l2ZW4gdmFyaWFkaWMgYXJndW1lbnRzLCBwbHVzIGEgcHJvdmlkZWRcclxuICogY2FsbGJhY2sgYXJndW1lbnQuXHJcbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgbWV0aG9kIG9mIG9iamVjdFxyXG4gKiBAcGFyYW0gLi4uYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kOyB0aGUgY2FsbGJhY2sgd2lsbFxyXG4gKiBiZSBwcm92aWRlZCBieSBRIGFuZCBhcHBlbmRlZCB0byB0aGVzZSBhcmd1bWVudHMuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9yIGVycm9yXHJcbiAqL1xyXG5RLm5zZW5kID0gLy8gWFhYIEJhc2VkIG9uIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgXCJzZW5kXCJcclxuUS5ubWNhbGwgPSAvLyBYWFggQmFzZWQgb24gXCJSZWRzYW5kcm8nc1wiIHByb3Bvc2FsXHJcblEubmludm9rZSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5zZW5kID0gLy8gWFhYIEJhc2VkIG9uIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgXCJzZW5kXCJcclxuUHJvbWlzZS5wcm90b3R5cGUubm1jYWxsID0gLy8gWFhYIEJhc2VkIG9uIFwiUmVkc2FuZHJvJ3NcIiBwcm9wb3NhbFxyXG5Qcm9taXNlLnByb3RvdHlwZS5uaW52b2tlID0gZnVuY3Rpb24gKG5hbWUgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIG5vZGVBcmdzXSkuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogSWYgYSBmdW5jdGlvbiB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgYm90aCBOb2RlIGNvbnRpbnVhdGlvbi1wYXNzaW5nLXN0eWxlIGFuZFxyXG4gKiBwcm9taXNlLXJldHVybmluZy1zdHlsZSwgaXQgY2FuIGVuZCBpdHMgaW50ZXJuYWwgcHJvbWlzZSBjaGFpbiB3aXRoXHJcbiAqIGBub2RlaWZ5KG5vZGViYWNrKWAsIGZvcndhcmRpbmcgdGhlIG9wdGlvbmFsIG5vZGViYWNrIGFyZ3VtZW50LiAgSWYgdGhlIHVzZXJcclxuICogZWxlY3RzIHRvIHVzZSBhIG5vZGViYWNrLCB0aGUgcmVzdWx0IHdpbGwgYmUgc2VudCB0aGVyZS4gIElmIHRoZXkgZG8gbm90XHJcbiAqIHBhc3MgYSBub2RlYmFjaywgdGhleSB3aWxsIHJlY2VpdmUgdGhlIHJlc3VsdCBwcm9taXNlLlxyXG4gKiBAcGFyYW0gb2JqZWN0IGEgcmVzdWx0IChvciBhIHByb21pc2UgZm9yIGEgcmVzdWx0KVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBub2RlYmFjayBhIE5vZGUuanMtc3R5bGUgY2FsbGJhY2tcclxuICogQHJldHVybnMgZWl0aGVyIHRoZSBwcm9taXNlIG9yIG5vdGhpbmdcclxuICovXHJcblEubm9kZWlmeSA9IG5vZGVpZnk7XHJcbmZ1bmN0aW9uIG5vZGVpZnkob2JqZWN0LCBub2RlYmFjaykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5ub2RlaWZ5KG5vZGViYWNrKTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubm9kZWlmeSA9IGZ1bmN0aW9uIChub2RlYmFjaykge1xyXG4gICAgaWYgKG5vZGViYWNrKSB7XHJcbiAgICAgICAgdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlYmFjayhudWxsLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlYmFjayhlcnJvcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufTtcclxuXHJcbi8vIEFsbCBjb2RlIGJlZm9yZSB0aGlzIHBvaW50IHdpbGwgYmUgZmlsdGVyZWQgZnJvbSBzdGFjayB0cmFjZXMuXHJcbnZhciBxRW5kaW5nTGluZSA9IGNhcHR1cmVMaW5lKCk7XHJcblxyXG5yZXR1cm4gUTtcclxuXHJcbn0pO1xyXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiZ3pOQ2dMXCIpKSIsIi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4vL1xyXG4vLyBBeG9uIEJyaWRnZSBBUEkgRnJhbWV3b3JrXHJcbi8vXHJcbi8vIEF1dGhvcmVkIGJ5OiAgIEF4b24gSW50ZXJhY3RpdmVcclxuLy9cclxuLy8gTGFzdCBNb2RpZmllZDogSnVuZSA0LCAyMDE0XHJcbi8vXHJcbi8vIERlcGVuZGVuY2llczogIGNyeXB0by1qcyAoaHR0cHM6Ly9naXRodWIuY29tL2V2YW52b3NiZXJnL2NyeXB0by1qcylcclxuLy8gICAgICAgICAgICAgICAgalF1ZXJ5IDEuMTEuMSAoaHR0cDovL2pxdWVyeS5jb20vKVxyXG4vLyAgICAgICAgICAgICAgICBqc29uMyAoaHR0cHM6Ly9naXRodWIuY29tL2Jlc3RpZWpzL2pzb24zKVxyXG4vLyAgICAgICAgICAgICAgICBqU3RvcmFnZSAoaHR0cHM6Ly9naXRodWIuY29tL2FuZHJpczkvalN0b3JhZ2UpXHJcbi8vXHJcbi8vICoqKiBIaXN0b3J5ICoqKlxyXG4vL1xyXG4vLyBWZXJzaW9uICAgIERhdGUgICAgICAgICAgICAgICAgICBOb3Rlc1xyXG4vLyA9PT09PT09PT0gID09PT09PT09PT09PT09PT09PT09ICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbi8vIDAuMSAgICAgICAgSnVuZSA0LCAyMDE0ICAgICAgICAgIEZpcnN0IHN0YWJsZSB2ZXJzaW9uLiBcclxuLy9cclxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4vLyBSZXF1aXJlIHRoZSByb290IEF4b25CcmlkZ2UgbW9kdWxlXHJcbi8vdmFyIEJyaWRnZUNsaWVudCA9IHJlcXVpcmUoICcuL0JyaWRnZUNsaWVudCcgKTtcclxuXHJcbnZhciBicmlkZ2UgPSByZXF1aXJlKCAnLi9CcmlkZ2UnICk7XHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IGJyaWRnZSgpO1xyXG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
(9)
});
