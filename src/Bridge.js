// Include dependencies
var jquery = require( 'include/jquery-1.11.0' );
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
module.exports = function ( apiURL, apiTimeout ) {

  // [PRIVATE] identity
  // The Identity object used to track the user and create requests signed with 
  // appropriate HMAC hash values.
  var identity = null;

  // [PRIVATE] clearIdentity()
  // Sets the current Identity object to null so it gets garbage collected and cannot be used 
  // to validate requests going forward.
  var clearIdentity = function () {

    identity = null;

  };

  // [PRIVATE] setIdentity()
  // Sets the current Identity object to a new instance given a user's email and password.
  var setIdentity = function ( email, password ) {

    identity = new Identity( email, password );

  };

  // [PRIVATE] hasIdentity()
  // Returns whether or not an the Identity object is currently assigned.
  var hasIdentity = function () {

    return ( identity !== null );

  };

  var self = {

    // [PUBLIC] user
    // The User object returned by the the database relating to the current identity.
    user: null,

    // [PUBLIC] url
    // The URL path to the API to be bridged. This URL must be written so that the final 
    // character is a forward-slash (e.g. https://peir.axoninteractive.ca/api/1.0/).
    url: apiURL,

    // [PUBLIC] timeout
    // The timeout period for requests (in milliseconds).
    timeout: apiTimeout,

    // [PUBLIC] loginFailureCallback
    // The callback to call when a login() request returns a failure response.
    // Signature: function ( user, jqXHR, errorThrown, textStatus ) {}
    loginFailureCallback: null,

    // [PUBLIC] loginSuccessCallback
    // The callback to call when a login() request returns a success response.
    // Signature: function ( user, data, textStatus, jqXHR ) {}
    loginSuccessCallback: null,

    // [PUBLIC] logoutCallback
    // The callback to call when a logout() call occurs.
    // Signature: function ( user ) {}
    logoutCallback: null,

    // [PUBLIC] requestCallback
    // The callback to call when a request() call occurs, but before it is sent.
    // Signature: function ( user, method, resource, payload ) {}
    requestCallback: null,

    // [PUBLIC] build()
    // Creates an entirely new Bridge object to replace this one. Use this carefully!
    // This is primarily used for startup, but AxonBridge isn't actually an AxonBridge object
    // to begin with. This has the same function signature to be consistent.
    build: function ( apiURL, apiTimeout ) {

      AxonBridge = new Bridge( apiURL, apiTimeout );

    },

    // [PUBLIC] login()
    // Log in a user with the given email/password pair. This creates a new Identity object
    // to sign requests for authentication and performs an initial request to the server to
    // send a login package.
    login: function ( email, password, storeLocally ) {

      // Configure an Identity object with the user's credentials.
      setIdentity( email, password );

      // Request to the API to send a login package.
      self.request( 'GET', 'login', {} )
        .done( function ( data, textStatus, jqXHR ) {

          // Set the user object with the content of the response body to signify that
          // the user is logged in and we're ready to move on.
          self.user = data.body.content;

          // Store this identity to local storage, if that was requested.
          // [SECURITY NOTE 1] storeLocally should be set based on user input, by asking whether
          // the user is on a private computer or not. This is can be considered a tolerable
          // security risk as long as the user is on a private computer that they trust or manage
          // themselves. However, on a public machine this is probably a security risk, and the
          // user should be able to decline this convencience in favour of security, regardless
          // of whether they are on a public machine or not.
          if ( storeLocally ) {

            // Store the bridge
            jQuery.jStorage.set( 'axon-bridge', JSON.stringify( {
              url: self.url,
              timeout: self.timeout
            } ) );
            jQuery.jStorage.setTTL( 'axon-bridge', 86400000 ); // Expire in 1 day.

            // Store the user
            jQuery.jStorage.set( 'axon-bridge-identity', JSON.stringify( {
              email: email,
              password: CryptoJS.SHA256( password )
            } ) );
            jQuery.jStorage.setTTL( 'axon-bridge-identity', 86400000 ); // Expire in 1 day.

          }

          // Handle any custom success behaviour programmed by the user.
          if ( typeof self.loginSuccessCallback === "function" ) {
            self.loginSuccessCallback( self.user, data, textStatus, jqXHR );
          }

        }  )
        .fail( function ( jqXHR, textStatus, errorThrown ) {

          // Handle any custom failure behaviour programmed by the user.
          if ( typeof self.loginFailureCallback === "function" ) {
            self.loginFailureCallback( self.user, jqXHR, textStatus, errorThrown );
          }

          // Set the user object to null to signify that the user is logged out still.
          self.user = null;

        } );

    },

    // [PUBLIC] logout()
    // Set the user object to null and clear the Identity object user to sign requests for
    // authentication purposes, so that the logged-out user's credentials can't still be
    // user to authorize requests.
    logout: function () {

      // Handle custom behaviour programmed by the user.
      if ( typeof self.logoutCallback === "function" ) {
        self.logoutCallback( self.user );
      }

      // Delete the Identity object to preserve the user's password security.
      clearIdentity();

      // Clear the identity from local storage to preserve the user's password security.
      // If no identity is stored, this will do nothing.
      jQuery.jStorage.deleteKey( 'axon-bridge-identity' );

      // Clear the user so Bridge reports that it is logged out.
      self.user = null;

    },

    // [PUBLIC] isLoggedIn()
    // Check if there is currently a user object set. If no user object is set, then none
    // was returned from the login attempt (and the user is still logged out) or the user 
    // logged out manually.
    isLoggedIn: function () {

      return ( self.user !== null );

    },

    // [PUBLIC] request()
    // Sends an XHR request using jQuery.ajax() to the given API resource using the given 
    // HTTP method. The HTTP request body will be set to the JSON.stringify()ed request 
    // that is generated by the Identity object set to perform HMAC signing.
    // Returns a jQuery jqZHR object. See http://api.jquery.com/jQuery.ajax/#jqXHR.
    // If no Identity is set, sendRequest() returns null, indicating no request was sent.
    request: function ( method, resource, payload ) {

      // Handle custom behaviour programmed by the user.
      if ( typeof self.requestCallback === "function" ) {
        self.requestCallback( self.user, method, resource, payload );
      }

      if ( hasIdentity() === false ) {
        return null;
      }
      return jQuery.ajax( {
        'type': method,
        'url': self.url + resource,
        'data': JSON.stringify( identity.createRequest( payload ) ),
        'contentType': 'application/json',
        'headers': {
          'Accept': 'application/json'
        },
        'timeout': self.timeout,
        'async': true,
      } );

    }

  };

  return self;

};
