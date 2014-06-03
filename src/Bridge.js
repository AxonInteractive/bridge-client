// Include dependencies
var json3 = require( 'include/json3' );
var jstorage = require( 'include/jstorage' );
var sha256 = require( 'include/sha256' );
var Identity = require( 'Identity' );

// [Bridge Constructor]
// The Bridge object is the global object through which other applications will 
// communicate with the bridged API resources. It provides a simple surface API for logging
// in and logging out users as well as sending requests to the API. Internally, it handles
// all of the request authentication necessary for the API without exposing the user's
// account password to outside scrutiny (and even scrutiny from other local applications
// to a significant extent).
module.exports = function () {

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

  // [PRIVATE] internalLogin()
  // Log in a user with the given email/password pair. This creates a new Identity object
  // to sign requests for authentication and performs an initial request to the server to
  // send a login package. This is private so that the dontHashPassword option is hidden.
  var internalLogin = function ( email, password, useLocalStorage, dontHashPassword ) {

    // Notify the user that login() has been called.
    if ( typeof self.onLoginCalled === 'function' ) {
      self.onLoginCalled( email, useLocalStorage );
    }

    // Set whether or not the Bridge should store user credentials and Bridge configuration
    // to local storage.
    self.useLocalStorage = useLocalStorage;

    // Configure an Identity object with the user's credentials.
    setIdentity( email, password, dontHashPassword );

    // Request a login package from the server
    AxonBridge.request( 'GET', 'login', {} )
      .done( function ( data, textStatus, jqXHR ) {

        // Set the user object using the user data that was returned, as long as the data
        // in the response is well-formed.
        if ( typeof data !== 'object' || 
          typeof data.content !== 'object' || 
          typeof data.content.user !== 'object'|| 
          typeof data.content.additionalData !== 'object' ) {
          
          // Notify the user of the login error and stop handling this here.
          var error = { status: 417, message: '417 (Expectation Failed) Malformed login package data.' };
          if ( typeof self.onLoginError === 'function' ) {
            self.onLoginError( data, error );
          }
          return;

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

          // Decide whether or not to hash the password again
          var hashedPassword = ( dontHashPassword === true ) ? password :
            CryptoJS.SHA256( password )
            .toString( CryptoJS.enc.Hex );

          // Store the user
          jQuery.jStorage.set( 'axon-bridge-identity', JSON.stringify( {
            email: email,
            password: hashedPassword
          } ) );
          jQuery.jStorage.setTTL( 'axon-bridge-identity', 86400000 ); // Expire in 1 day.

        }

        // Notify the user of the successful login.
        if ( typeof self.onLoginSuccess === 'function' ) {
          self.onLoginSuccess( data );
        }

      } )
      .fail( function ( jqXHR, textStatus, errorThrown ) {

        // Reject the obvious error codes
        var error = AxonBridge.isErrorCodeResponse( jqXHR );
        if ( error !== null ) {

          // Report the error code and message
          console.error( "BRIDGE | Login | " + error.status.toString() + " >> " + error.message );

          // Clear the user credentials, since they didn't work anyway.
          clearUser();

          // Notify the user of the login error.
          if ( typeof self.onLoginError === 'function' ) {
            self.onLoginError( error );
          }

        } else // Connection timeout
        {

          // Report the communication failure
          console.error( "BRIDGE | Login | Error >> No response from the server." );

          // Clear the user credentials, since they didn't work anyway.
          clearUser();

          // Notify the user of the failure to connect to the server.
          if ( typeof self.onLoginTimeout === 'function' ) {
            self.onLoginTimeout();
          }

        }

      } );

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

  // [PUBLIC] onLoginCalled()
  // The callback to call when the login() function is called.
  // Signature: function ( email, useLocalStorage ) {}
  self.onLoginCalled = null;

  // [PUBLIC] onLoginError()
  // The callback to call when an error HTTP status code is returned by a login() request or when
  // the data received back from the API is malformed.
  // Signature: function ( error ) {}
  self.onLoginError = null;

  // [PUBLIC] onLoginTimeout()
  // The callback to call when a login() request comes back as having failed (couldn't connect).
  // Signature: function () {}
  self.onLoginTimeout = null;

  // [PUBLIC] onLoginSuccess()
  // The callback to call when a HTTP status 200 is received back from the server and the data is 
  // valid for a login() request.
  // Signature: function ( data ) {}
  self.onLoginSuccess = null;

  // [PUBLIC] loginErrorCallback()
  // The callback to call when the logout() function is called.
  // Signature: function () {}
  self.onLogoutCalled = null;

  // [PUBLIC] requestCallback()
  // The callback to call when a request() call occurs, but before it is sent.
  // Signature: function ( method, resource, payload ) {}
  self.onRequestPresend = null;


  ///////////////
  // FUNCTIONS //
  ///////////////

  // [PUBLIC] init()
  // Configure theb Bridge with a new URL and timeout.
  self.init = function ( url, timeout ) {

    self.url = url;
    self.timeout = timeout;

  };

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
          message: '404 (Resource Not Found) >> The resource you requested does not exist.'
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

  // [PUBLIC] login()
  // The public login() function used to hide internalLogin().
  self.login = function ( email, password, useLocalStorage ) {

    internalLogin( email, password, useLocalStorage, false );

  };

  // [PUBLIC] loginAsStoredIdentity()
  // Checks the browser's local storage for an existing user and performs a login request
  // using the stored credentials if one is found. Returns true if a login request was sent
  // and false if no login request was sent.
  self.loginAsStoredIdentity = function () {

    // Check if an identity is in local storage to use for authentication.
    var storedIdentity = jQuery.jStorage.get( 'axon-bridge-identity', null );
    if ( storedIdentity !== null ) {

      var parsedIdentity = JSON.parse( storedIdentity );

      //console.log( parsedIdentity );
      //console.log( parsedIdentity.email );
      //console.log( parsedIdentity.password );

      // Send a login request
      internalLogin( parsedIdentity.email, parsedIdentity.password, true, true );

      // Return true, having sent the login request
      return true;

    }

    // No login request was sent
    return false;

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
    jQuery.jStorage.deleteKey( 'axon-bridge-identity' );

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

    // Notify the user of the request being ready to send.
    if ( typeof self.onRequestPresend === "function" ) {
      self.onRequestPresend( method, resource, payload );
    }

    // If not identity is set, ignore the request
    if ( hasIdentity() === false ) {
      console.warn( "Request cannot be sent. No user is logged into Bridge." );
      return null;
    }

    // Build the payloadString to be sent along with the message.
    // Note: If this is a GET request, prepend 'payload=' since the data is sent in the 
    // query string.
    var payloadString = ( method.toUpperCase() === 'GET' ) ? 'payload=' : '';
    payloadString += JSON.stringify( identity.createRequest( payload ) );

    // Send the request
    return jQuery.ajax( {
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
    } );

  };

  return self;

};