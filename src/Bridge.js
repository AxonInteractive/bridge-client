// Include dependencies
var CryptoEncHex = require( './include/crypto-js/enc-hex' );
var CryptoSha256 = require( './include/crypto-js/sha256' );
var Q = require( './include/q' );
var Identity = require( './Identity' );

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
      1: "",
      2: "",
      3: "",
      4: "",
      5: "",
      6: "",
      7: "",
      8: "",
      9: "",
     10: "",
     11: "",
     12: "",
     13: "",
     14: "",
     15: "",
     16: "",
     17: "",
     18: "",
     19: "",
     20: "",
     21: "",
     22: "",
     23: "",
     24: "",
     25: "",
     26: "",
     27: "",
     28: "",
     29: "",
    101: "No user is signed in. This action can only be completed when logged in.",
    102: "The response from the server was badly formed. Please try again.",
    103: "The server did not respond. Check your internet connection.",
    104: "No user identity was found in local storage. Aborting automatic login."
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
