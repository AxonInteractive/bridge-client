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
( function () {

  'use strict';

  // Import Bridge core functionality
  var core = _dereq_( './core' );
  var errors = _dereq_( './errors' );

  // Import Bridge API commands
  var authenticate      = _dereq_( './commands/authenticate' );
  var deauthenticate    = _dereq_( './commands/deauthenticate' );
  var forgotPassword    = _dereq_( './commands/forgotPassword' );
  var loadUser          = _dereq_( './commands/loadUser' );
  var login             = _dereq_( './commands/login' );
  var logout            = _dereq_( './commands/logout' );
  var recoverPassword   = _dereq_( './commands/recoverPassword' );
  var register          = _dereq_( './commands/register' );
  var saveUser          = _dereq_( './commands/saveUser' );
  var verifyEmail       = _dereq_( './commands/verifyEmail' );

  /**
   *
   * @global        Bridge
   *
   * @description   The Bridge global.
   *
   * @type          {Object}
   *
   * @property {Function} getDebug            This function returns the debug mode of Bridge.
   *
   * @property {Function} setDebug            This function sets the debug mode of Bridge.
   *
   * @property {Function} getErrors           This function returns the errors module from which all
   *                                          of the error types that Bridge uses to enumerate
   *                                          failures are visible.
   *
   * @property {Function} getIsAuthenticated  This function returns whether or not the current
   *                                          session has been authenticated by the API server.
   *
   * @property {Function} getIsUserLoggedIn   Checks to see if the session is authenticated and that
   *                                          the user profile object is set. Both both are true,
   *                                          the user is considered to be logged in.
   *
   * @property {Function} getIsUserModified   Checks to see if the user object has been changed
   *                                          since the last time that getUserProfile() was called
   *                                          to get a fresh copy. This is helpful warn users that
   *                                          there are changes that must be saved.
   *
   * @property {Function} getRememberMe       This function returns the current "remember me" state
   *                                          of the application.
   *
   * @property {Function} getUser             This function returns the user profile object that you
   *                                          should use in your app that get be fetched from the
   *                                          API with getUserProfile() and updated on the API using
   *                                          updateUserProfile().
   *
   * @property {Function} onRequestCalled     A callback function that allows you to attach special
   *                                          behaviour to every request call made by Bridge. This
   *                                          callback captures the HTTP method, URL, and the
   *                                          payload of each outgoing request before it is sent and
   *                                          gives you the opportunity to modify requests, if
   *                                          necessary.
   *
   * @property {Function} authenticate        Makes an API call to request authentication. If the
   *                                          request is successful, a Bridge authentication cookie
   *                                          is set in the browser to identify the user from now
   *                                          on.
   *
   * @property {Function} deauthenticate      Makes an API call to request deauthentication. If the
   *                                          request is successful, the Bridge authentication
   *                                          cookie is set to expire immediately, and all session
   *                                          variables in Bridge are reset.
   *
   * @property {Function} forgotPassword      Makes an API call to request a password recovery email
   *                                          be sent to the given email address. recoverPassword()
   *                                          represents the completion of the recovery process.
   *
   * @property {Function} loadUser            Makes an API call to fetch an up-to-date copy of the
   *                                          user's profile. If this request is successful, the
   *                                          user object will be overwritten with a fresh copy.
   *
   * @property {Function} login               A convenience function that first authenticates the
   *                                          user and then goes on to fetch their user profile, if
   *                                          successful.
   *
   * @property {Function} logout              An alias for deauthenticate(). It does exactly the
   *                                          same thing.
   *
   * @property {Function} recoverPassword     Makes an API call to complete the password recovery
   *                                          process started by calling forgotPassword(). The user
   *                                          submits a new password and a unique hash sent to their
   *                                          email account to authorize the password change.
   *
   * @property {Function} register            Makes an API call to register a new user account. The
   *                                          user provides their email, password, first name, last
   *                                          name and an app-specific object that can store any
   *                                          additional data that your app requires. If email
   *                                          verification is enabled in the Bridge Server, then an
   *                                          email will be sent to the user's email address with a
   *                                          URL to follow to complete their registration. Their
   *                                          registration is completed by calling verifyEmail().
   *
   * @property {Function} request             This is the most general-purpose function for making
   *                                          API calls available to you. It takes the HTTP method,
   *                                          URL, and payload of your request and transmits it. You
   *                                          get a Q promise in return that you can use to handle
   *                                          success and failure of your request, whatever it may
   *                                          be.
   *
   * @property {Function} saveUser            Makes an API call to submit the current user object to
   *                                          the database as the up-to-date copy. If successful,
   *                                          the user's profile in the database will be updated.
   *
   * @property {Function} verifyEmail         Makes an API call to complete the registration process
   *                                          started by calling register(). The user must supply a
   *                                          unique hash that was sent to their email address in
   *                                          order to verify their email address and authorize the
   *                                          activation of their account (if the Bridge Server has
   *                                          email verification enabled).
   *
   * @property {Function} sendRequest         This function is the lowest-level implementation of
   *                                          XHR behaviour within Bridge. By default, it is
   *                                          configured to use the XmlHttpRequest object in JS to
   *                                          send requests, but can be overridden by another
   *                                          function of your own creation, as long as it is of the
   *                                          same signature. This is useful if you want to make a
   *                                          plugin for Bridge to interface with another library or
   *                                          framework such as AngularJS.
   *
   */
  module.exports = {

    // Getters/Setters for Properties
    getDebug            : function () {
                            return core.debug;
                          },
    setDebug            : function ( value ) {
                            core.debug = value;
                          },
    getErrors           : function () {
                            return errors;
                          },
    getIsAuthenticated  : function () {
                            return core.isAuthenticated;
                          },
    getIsUserLoggedIn   : function () {
                            return core.isUserLoggedIn();
                          },
    getIsUserModified   : function () {
                            return core.isUserModified();
                          },
    getRememberMe       : function () {
                            return core.rememberMe;
                          },
    getUser             : function () {
                            return core.user;
                          },

    // Callbacks
    onRequestCalled     : core.onRequestCalled,

    // Commands
    authenticate        : authenticate,
    deauthenticate      : deauthenticate,
    forgotPassword      : forgotPassword,
    loadUser            : loadUser,
    login               : login,
    logout              : logout,
    recoverPassword     : recoverPassword,
    register            : register,
    request             : core.request,
    saveUser            : saveUser,
    verifyEmail         : verifyEmail,

    // XHR Interface
    sendRequest         : core.sendRequest

  };

} )();

},{"./commands/authenticate":3,"./commands/deauthenticate":4,"./commands/forgotPassword":5,"./commands/loadUser":6,"./commands/login":7,"./commands/logout":8,"./commands/recoverPassword":9,"./commands/register":10,"./commands/saveUser":11,"./commands/verifyEmail":12,"./core":13,"./errors":14}],3:[function(_dereq_,module,exports){
/**
 * @module  authenticate
 */
/* global exports: true */
var CryptoEncHex = _dereq_( '../include/crypto-js/enc-hex' );
var CryptoSha256 = _dereq_( '../include/crypto-js/sha256' );
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );

/**
 *
 * @public
 *
 * @function      authenticate [POST]
 *
 * @description   Ask the server to validate the current session by sending an authorization cookie
 *                that will identify the authenticated user. The cookie received from the server
 *                will operate under the same domain policy and the "HttpOnly" restriction to
 *                prevent XSS attacks from stealing user authentication tokens and masquerading as
 *                authenticated users.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @param         {String} email        The user's email address.
 *
 * @param         {String} password     The user's password (not hashed yet).
 *
 * @param         {Boolean} rememberMe  A boolean indicating whether or not the user would like to
 *                                      be automatically logged-in in the future. If rememberMe is
 *                                      set to false, the authentication cookie sent by the server
 *                                      will expire when the current browser session ends. If this
 *                                      is set to true, it will expire after a period of time
 *                                      defined by the Bridge server config file (default 2 weeks).
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function authenticate( apiUrl, email, password, rememberMe ) {

  'use strict';

  // Build the request payload (hash the password with SHA256).
  var payload = {
    email: email,
    password: CryptoSha256( password ).toString( CryptoEncHex ),
    rememberMe: rememberMe
  };

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'POST', core.stripTrailingSlash( apiUrl ) + '/authenticate', payload ).then(

    // Request was resolved /////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Authenticate", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // Set the session as being authenticated and store the "remember me" state.
      core.isAuthenticated = true;
      core.rememberMe = rememberMe;

      // If the response format is valid, resolve the request with the response data object.
      core.resolve( "Authenticate", deferred, data );

    },
    /////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected /////////////////////////////////////////////////////////////////////
    function ( error ) {

      // If the response failed, reject the request with the error object passed up from below.
      core.reject( "Authenticate", deferred, error );

    }
    /////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../core":13,"../errors":14,"../include/crypto-js/enc-hex":16,"../include/crypto-js/sha256":17,"../include/q":18}],4:[function(_dereq_,module,exports){
/**
 * @module  authenticate
 */
/* global exports: true */
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );

/**
 *
 * @public
 *
 * @function      deauthenticate [DELETE]
 *
 * @description   Ask the server to invalidate the current session by expiring the authentication
 *                cookie used by this client. This is necessary rather than setting the auth cookie
 *                in JavaScript directly because the Bridge server imposes the "HttpOnly"
 *                restriction upon the authorization cookie to prevent an XSS attack from hijacking
 *                a user's session token and masquerading as the authenticated user.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function authenticate( apiUrl ) {

  'use strict';

  // Build and empty request payload (don't need to send anything).
  var payload = {};

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'DELETE', core.stripTrailingSlash( apiUrl ) + '/deauthenticate', payload ).then(

    // Request was resolved /////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Deauthenticate", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // Reset the session to clear all user data
      core.resetSession();

      // If the response format is valid, resolve the request with the response data object.
      core.resolve( "Deauthenticate", deferred, data );

    },
    /////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected /////////////////////////////////////////////////////////////////////
    function ( error ) {

      // If the response failed, reject the request with the error object passed up from below.
      core.reject( "Deauthenticate", deferred, error );

    }
    /////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../core":13,"../errors":14,"../include/q":18}],5:[function(_dereq_,module,exports){
/**
 * @module  forgotPassword
 */
/* global exports: true */
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );

/**
 *
 * @public
 *
 * @function      forgotPassword [PUT]
 *
 * @description   Ask the server to set the user into recovery state for a short period of time
 *                and send an account recovery email to the email account provided here.
 *
 * @param         {String} apiUrl   The base URL of the API to send this request to. It doesn't
 *                                  matter whether the trailing forward-slash is left on or not
 *                                  because either case is handled appropriately.
 *
 * @param         {String} email    The user's email address.
 *
 * @returns       {Promise}         A q.js promise object.
 *
 */
module.exports = function forgotPassword( apiUrl, email ) {

  'use strict';

  // Build the request payload.
  var payload = {
    email: email
  };

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'PUT', core.stripTrailingSlash( apiUrl ) + '/forgot-password', payload ).then(

    // Request  was resolved //////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Forgot Password", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // If the request was successful, resolve the request with the response data.
      core.resolve( "Forgot Password", deferred, data );

    },
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected ///////////////////////////////////////////////////////////////////////
    function ( error ) {

      // If the request failed, reject the request with the error object passed up from below.
      core.reject( "Forgot Password", deferred, error );

    }
    ///////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../core":13,"../errors":14,"../include/q":18}],6:[function(_dereq_,module,exports){
/**
 * @module  getUserProfile
 */
/* global exports: true */
var CryptoEncHex = _dereq_( '../include/crypto-js/enc-hex' );
var CryptoSha256 = _dereq_( '../include/crypto-js/sha256' );
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );

/**
 *
 * @public
 *
 * @function      loadUser [GET]
 *
 * @description   Ask the server to fetch the current copy of the currently logged-in user's profile
 *                from the database and set it as Bridge's user profile object. This WILL overwrite
 *                any unsaved changes to the existing user profile object.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function loadUser( apiUrl ) {

  'use strict';

  // Build and empty request payload (don't need to send anything).
  var payload = {};

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'GET', core.stripTrailingSlash( apiUrl ) + '/user', payload ).then(

    // Request was resolved /////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( !( data instanceof Object ) ) {
        core.reject( "Load User", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // Assign the user profile as the user object.
      // Note: JSON stringify()ing the user profile keeps a static copy we can compare against.
      core.user = data;
      core.unchangedUser = JSON.stringify( data );

      // If the response format is valid, resolve the request with the response data object.
      core.resolve( "Load User", deferred, data );

    },
    /////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected /////////////////////////////////////////////////////////////////////
    function ( error ) {

      // If the response failed, reject the request with the error object passed up from below.
      core.reject( "Load User", deferred, error );

    }
    /////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../core":13,"../errors":14,"../include/crypto-js/enc-hex":16,"../include/crypto-js/sha256":17,"../include/q":18}],7:[function(_dereq_,module,exports){
/**
 * @module  login
 */
/* global exports: true */
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );
var authenticate = _dereq_( '../commands/authenticate' );
var loadUser = _dereq_( '../commands/loadUser' );

/**
 *
 * @public
 *
 * @function      login [authenticate >> loadUser]
 *
 * @description   Ask the server to authenticate the user given their email and password, and
 *                follow the authentication (if successful) with a request for the user's profile.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @param         {String} email        The user's email address.
 *
 * @param         {String} password     The user's password (not hashed yet).
 *
 * @param         {Boolean} rememberMe  A boolean indicating whether or not the user would like to
 *                                      have a long expiry date or not. If this is true, then the
 *                                      Bridge server will return an auth token with an expiry
 *                                      on the order of 2 weeks (but can be modified in the server
 *                                      settings). If false, the expiry will only be about 6
 *                                      hours (again, this is configurable).
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function login( apiUrl, email, password, rememberMe ) {

  'use strict';

  // Send an authentication request.
  var deferred = Q.defer();
  authenticate( apiUrl, email, password, rememberMe ).then(

    // Authenticate was resolved //////////////////////////////////////////////////////////////////
    function ( data ) {

      // If authentication was successful, send a request to fetch the user's profile.
      loadUser( apiUrl, email ).then(
        function ( data ) {

          // If fetching the user profile is successful, resolve the request with the response data.
          core.resolve( "Login", deferred, data );

        },
        function ( error ) {

          // If fetching the user profile failed, reject the request with the error object.
          core.reject( "Login", deferred, error );

        }
      );

    },
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // Authenticate was rejected //////////////////////////////////////////////////////////////////
    function ( error ) {

      // If authentication failed, reject the request with the error object passed up from below.
      core.reject( "Login", deferred, error );

    }
    ///////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../commands/authenticate":3,"../commands/loadUser":6,"../core":13,"../errors":14,"../include/q":18}],8:[function(_dereq_,module,exports){
/**
 * @module  login
 */
/* global exports: true */
var deauthenticate = _dereq_( '../commands/deauthenticate' );

/**
 *
 * @public
 *
 * @function      logout [deauthenticate (alias)]
 *
 * @description   Ask the server to invalidate the current session by expiring the authentication
 *                cookie used by this client. This function is merely an alias for deauthenticate()
 *                such that login and logout form a logical pair of operations for API consistency.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = deauthenticate;

},{"../commands/deauthenticate":4}],9:[function(_dereq_,module,exports){
/**
 * @module  recoverPassword
 */
/* global exports: true */
var CryptoEncHex = _dereq_( '../include/crypto-js/enc-hex' );
var CryptoSha256 = _dereq_( '../include/crypto-js/sha256' );
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );

/**
 *
 * @public
 *
 * @function      recoverPassword [PUT]
 *
 * @description   Ask the server to set the password of the user account associated with the
 *                provided recovery hash that was sent to the user's email address.
 *
 * @param         {String} apiUrl     The base URL of the API to send this request to. It doesn't
 *                                    matter whether the trailing forward-slash is left on or not
 *                                    because either case is handled appropriately.
 *
 * @param         {String} password   A new password to assign for the user.
 *
 * @param         {String} hash       The hash string that was sent to the user in the password
 *                                    recovery email.
 *
 * @returns       {Promise}           A q.js promise object.
 */
module.exports = function recoverPassword( apiUrl, password, hash ) {

  'use strict';

  // Build the request payload (hash the password with SHA256).
  var payload = {
    hash: hash,
    password: CryptoSha256( password ).toString( CryptoEncHex )
  };

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'PUT', core.stripTrailingSlash( apiUrl ) + '/recover-password', payload ).then(

    // Request  was resolved //////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Recover Password", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // If the request was successful, resolve the request with the response data.
      core.resolve( "Recover Password", deferred, data );

    },
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected ///////////////////////////////////////////////////////////////////////
    function ( error ) {

      // If the request failed, reject the request with the error object passed up from below.
      core.reject( "Recover Password", deferred, error );

    }
    ///////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../core":13,"../errors":14,"../include/crypto-js/enc-hex":16,"../include/crypto-js/sha256":17,"../include/q":18}],10:[function(_dereq_,module,exports){
/**
 * @module  register
 */
/* global exports: true */
var CryptoEncHex = _dereq_( '../include/crypto-js/enc-hex' );
var CryptoSha256 = _dereq_( '../include/crypto-js/sha256' );
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );
var login = _dereq_( '../commands/login' );

/**
 *
 * @public
 *
 * @function      register [POST users >> login]
 *
 * @description   Ask the server to register a user with the given email/password pair, name, and
 *                application-specific data. The password is transmitted in the content of the
 *                message SHA-256 encrypted to protect the user's password to a minimal extent
 *                even under insecure connections.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @param         {String} email        The user's email address.
 *
 * @param         {String} password     The user's password (not yet hashed).
 *
 * @param         {String} firstName    The user's first name.
 *
 * @param         {String} lastName     The user's last name.
 *
 * @param         {String} appData      A JSON.stringify()ed JavaScript object of any application-
 *                                      specific data to store for this user.
 *
 * @returns       {Promise}           A q.js promise object.
 *
 */
module.exports = function register( apiUrl, email, password, firstName, lastName, appData ) {

  'use strict';

  // Build the request payload (hash the password with SHA256).
  var payload = {
    "appData": appData,
    "email": email,
    "firstName": firstName,
    "lastName": lastName,
    "password": CryptoSha256( password ).toString( CryptoEncHex ),
  };

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'POST', core.stripTrailingSlash( apiUrl ) + '/user', payload ).then(

    // Request was resolved ///////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Register", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // If the user login is successful, resolve the request with the response data.
      core.resolve( "Register", deferred, data );

    },
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected ///////////////////////////////////////////////////////////////////////
    function ( error ) {

      // If registration failed, reject the request with the error object passed up from below.
      core.reject( "Register", deferred, error );

    }
    ///////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../commands/login":7,"../core":13,"../errors":14,"../include/crypto-js/enc-hex":16,"../include/crypto-js/sha256":17,"../include/q":18}],11:[function(_dereq_,module,exports){
/**
 * @module  updateUserProfile
 */
/* global exports: true */
var CryptoEncHex = _dereq_( '../include/crypto-js/enc-hex' );
var CryptoSha256 = _dereq_( '../include/crypto-js/sha256' );
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );
var authenticate = _dereq_( '../commands/authenticate' );

/**
 *
 * @public
 *
 * @function      saveUser [PUT]
 *
 * @description   Ask the server to save the user profile of the currently logged-in user to the
 *                API server's database. This operation requires the user's current password to be
 *                supplied to re-authenticate the user if they intend to change their password.
 *
 * @param         {String} apiUrl           The base URL of the API to send this request to. It
 *                                          doesn't matter whether the trailing forward-slash is
 *                                          left on or not because either case is handled
 *                                          appropriately.
 *
 * @param         {String} currentPassword  [OPTIONAL] The user's current password (not yet hashed),
 *                                          if they would like to change their password.
 *
 * @param         {String} newPassword      [OPTIONAL] The password the user would like to change to
 *                                          (not yet hashed).
 *
 * @returns       {Promise}                 A q.js promise object.
 *
 */
module.exports = function saveUser( apiUrl, currentPassword, newPassword ) {

  'use strict';

  // Check that the user object is set, because we will need to access its properties.
  // If it isn't, reject the request with a new error object indicating that no user object is set.
  var deferred = Q.defer();
  if ( !core.user ) {
    core.reject( "Save User", deferred, new errors.BridgeError( errors.NO_USER_PROFILE ) );
    return;
  }

  // Set the payload to the user profile object, and include the current and new passwords as
  // additional properties if the user intend to change their password.
  var payload = core.user;
  if ( currentPassword ) {
    payload.currentPassword = CryptoSha256( currentPassword ).toString( CryptoEncHex );
  }
  if ( newPassword ) {
    payload.password = CryptoSha256( newPassword ).toString( CryptoEncHex );
  }

  // Send the request and handle the response.
  core.request( 'PUT', core.stripTrailingSlash( apiUrl ) + '/user', payload ).then(
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Save User", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // If updating the user profile is successful, update the unchanged user to match and
      // resolve the request with the response data.
      core.unchangedUser = JSON.stringify( core.user );
      core.resolve( "Save User", deferred, data );

    },
    function ( error ) {

      // If updating the user profile failed, reject the request with the error object.
      core.reject( "Save User", deferred, error );

    }
  );

  return deferred.promise;
};

},{"../commands/authenticate":3,"../core":13,"../errors":14,"../include/crypto-js/enc-hex":16,"../include/crypto-js/sha256":17,"../include/q":18}],12:[function(_dereq_,module,exports){
/**
 * @module  verifyEmail
 */
/* global exports: true */
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );

/**
 *
 * @public
 *
 * @function      verifyEmail [PUT]
 *
 * @description   Ask the server to mark a user's account has having a verified email address
 *                by looking up their account using the provided account verification hash that
 *                was sent to the user's email address.
 *
 * @param         {String} apiUrl   The base URL of the API to send this request to. It doesn't
 *                                  matter whether the trailing forward-slash is left on or not
 *                                  because either case is handled appropriately.
 *
 * @param         {String} hash     The hash string that was sent to the user in the account
 *                                  verification email.
 *
 * @returns       {Promise}       A q.js promise object.
 *
 */
module.exports = function verifyEmail( apiUrl, hash ) {

  'use strict';

  // Build the request payload.
  var payload = {
    hash: hash
  };

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'PUT', core.stripTrailingSlash( apiUrl ) + '/verify-email', payload ).then(

    // Request  was resolved //////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Verify Email", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // If the request was successful, resolve the request with the response data.
      core.resolve( "Verify Email", deferred, data );

    },
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected ///////////////////////////////////////////////////////////////////////
    function ( error ) {

      // If the request failed, reject the request with the error object passed up from below.
      core.reject( "Verify Email", deferred, error );

    }
    ///////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../core":13,"../errors":14,"../include/q":18}],13:[function(_dereq_,module,exports){
/**
 * @module  core
 */
var Q = _dereq_( './include/q' );
var errors = _dereq_( './errors.js' );

// Include the sendRequest function import as an export
exports.sendRequest = _dereq_( './plugins/Default.js' );

// Configure Q to provide promise stack traces in full.
Q.longStackSupport = true;

( function () {

  'use strict';

  /////////////////
  // Properties //
  ///////////////

  /**
   * @private
   * @property {String} AUTH_COOKIE_NAME  The name of the Bridge authentication cookie in the
   *                                      browser's cookie store.
   */
  var AUTH_COOKIE_NAME = 'BridgeAuth';

  /**
   * @public
   * @property {Boolean}  debug  A flag to enable extra console logging for debugging purposes.
   */
  exports.debug = false;

  /**
   * @public
   * @property {Boolean}  isAuthenticated  Whether or not the current session has been
   *                                       authenticated by the API server.
   */
  exports.isAuthenticated = false;

  /**
   * @public
   * @property {Boolean}  rememberMe  Whether or not the user selected the remember me option.
   */
  exports.rememberMe = false;

  /**
   * @public
   * @property {String}  unchangedUser  The JSON.stringify()ed user profile object as it was when it
   *                                    was set by a call to getUserProfile().
   */
  exports.unchangedUser = '';

  /**
   * @public
   * @property {User}  user  The user profile object that is modifiable by users of Bridge.
   */
  exports.user = null;

  ///////////////////////
  // Helper Functions //
  /////////////////////

  /**
   *
   * @public
   *
   * @function      isUserLoggedIn
   *
   * @description   Returns whether or not a user is logged in by checking first, if there is an
   *                existing authentication cookie for the session and in the user object is set.
   *
   * @return        {Boolean} Whether or not a user object exists and is authenticated.
   *
   */
  exports.isUserLoggedIn = function isLoggedIn () {
    // Note: Using ternary here because a raw AND returns Object, since that's truthy enough.
    return ( exports.isAuthenticated && exports.user ) ? true : false;
  };

  /**
   *
   * @public
   *
   * @function      isUserModified
   *
   * @description   Returns whether or not the current user profile has been changed since a user
   *                profile was last fetched from the server.
   *
   * @return {Boolean} Whether or not the user profile has been modified since that last time a user
   *                   profile was last fetched from the server. Returns false if no user profile
   *                   has been set.
   *
   */
  exports.isUserModified = function isUserModified () {
    return JSON.stringify( exports.user ) !== exports.unchangedUser;
  };

  /**
   *
   * @public
   *
   * @function      resetSession
   *
   * @description   Clears the isAuthenticated flag, the "remember me" flag, the user profile object
   *                and the unchangedUser string, such that the session information is completely
   *                forgotten by the Bridge client and it believes that it is not authenticated and
   *                has no user info. The browser will still hold the authentication cookie in its
   *                cookie store, however, so the app is still authenticated if this is called
   *                without making a deauthenticate() call first (typically this is called by
   *                deauthenticate() to clear the session after clearing the auth cookie).
   *
   * @return {undefined}
   *
   */
  exports.resetSession = function resetSession () {
    exports.isAuthenticated = false;
    exports.rememberMe = false;
    exports.user = null;
    exports.unchangedUser = '';
  };

  /**
   *
   * @public
   *
   * @function      stripTrailingSlash
   *
   * @description   Removes a trailing forward-slash from the provided string.
   *
   * @param  {String} str   A string that may have a trailing forward slash.
   *
   * @return {String}       The same as the input, but having no trailing forward-slash.
   *
   */
  exports.stripTrailingSlash = function stripTrailingSlash ( str ) {
    // Note: String.substr() behaves differently from String.substring() here! Don't change this!
    return ( str.substr( -1 ) === '/' ) ? str.substr( 0, str.length - 1 ) : str;
  };

  ///////////////
  // Requests //
  /////////////

  /**
   * @public
   *
   * @callback      onRequestCalled
   *
   * @description   A function callback that can be used to modify requests before they are sent by
   *                Bridge. Override this function with your own implementation to have it be called
   *                before each request to the API.
   *
   * @param         {String} method     The HTTP verb/action to use for the request.
   *
   * @param         {String} url        The resource at the base API URL to query. The base API
   *                                    URL (baseUrl) is prepended to this string. The specified
   *                                    resource should NOT have a leading slash, as baseUrl is
   *                                    expected to have a trailing slash.
   *
   * @param         {Object} data       The data object to send with the request. This can be used
   *                                    to describe query arguments such as filters and ordering, or
   *                                    to contain data to be stored in the Bridge database.
   *
   * @return {undefined}
   *
   */
  exports.onRequestCalled = function onRequestCalled ( method, url, data ) {
    // Do nothing until overridden by an implementor
  };

  /**
   *
   * @public
   *
   * @function     resolve
   *
   * @description  Resolves the provided deferred and returns the provided data.
   *
   * @param  {String} name        An identifier to use when printing debug information.
   *
   * @param  {Deferred} deferred  The Q deferred object to resolve.
   *
   * @param  {Object} data        The object to return with the resolution.
   *
   * @return {undefined}
   *
   */
  exports.resolve = function resolve ( name, deferred, data ) {
    if ( exports.debug === true ) {
      console.log( "BRIDGE | " + name + " | " + JSON.stringify( data ) );
    }
    deferred.resolve( data );
  };

  /**
   *
   * @public
   *
   * @function     reject
   *
   * @description  Rejects the provided deferred and returns the provided data.
   *
   * @param  {String} name        An identifier to use when printing debug information.
   *
   * @param  {Deferred} deferred  The Q deferred object to resolve.
   *
   * @param  {Object} error       The object to return with the rejection.
   *
   * @return {undefined}
   *
   */
  exports.reject = function reject ( name, deferred, error ) {
    if ( exports.debug === true ) {
      console.error( "BRIDGE | " + name + " | " + error.status + " >> Code " + error.errorCode +
        ": " + errors.getExplanation( error.errorCode ) );
    }
    deferred.reject( error );
  };

  /**
   *
   * @public
   *
   * @function      request
   *
   * @description   Sends an XHR request using the createRequest() function. The message payload is
   *                JSON.stringify()ed and packaged into an HTTP header called "Bridge". The cookie
   *                to use for authentication on the server is kept in an HTTP header called "Auth".
   *
   * @param         {String} method     The HTTP verb/action to use for the request. Capitalization
   *                                    doesn't matter as it will be capitalized automatically.
   *
   * @param         {String} url        The exact URL of the resource to query.
   *
   * @param         {Object} data       The data object to send with the request. This can be used
   *                                    to describe query arguments such as filters and ordering, or
   *                                    to contain data to be stored in the Bridge database.
   *
   * @returns       {Promise}           A q.js promise object.
   *
   */
  exports.request = function request ( method, url, data ) {

    // Call the onRequestCalled callback, if one is registered.
    if ( exports.onRequestCalled ) {
      exports.onRequestCalled( method, url, data );
    }

    // Call sendRequest() to handle the XHR in whatever way it has been configured to.
    // Note: Creating 2 deferred objects here: 1 for this, 1 for sendRequest.
    var deferred = Q.defer();
    exports.sendRequest( Q.defer(), method.toUpperCase(), url, data ).then(

      // Request was resolved /////////////////////////////////////////////////////////////////////
      function ( data ) {

        // If the response format is valid, resolve the request with the response data object.
        exports.resolve( "Request", deferred, data );

      },
      /////////////////////////////////////////////////////////////////////////////////////////////

      // Request was rejected /////////////////////////////////////////////////////////////////////
      function ( error ) {

        // If the response failed, reject the request with the error object passed up from below.
        exports.reject( "Request", deferred, error );

      }
      /////////////////////////////////////////////////////////////////////////////////////////////

    );

    return deferred.promise;

  };

} )();

},{"./errors.js":14,"./include/q":18,"./plugins/Default.js":19}],14:[function(_dereq_,module,exports){
/**
 * @module  errors
 */

/**
 * @public
 * @constant      ERROR_CODE_MALFORMED_RESPONSE
 * @description   An error code indicating that the response returned from the server is either the
 *                wrong data type or is formatted incorrectly.
 * @type          {Number}
 */
exports.MALFORMED_RESPONSE = 101;

/**
 * @public
 * @constant      ERROR_CODE_NETWORK_ERROR
 * @description   An error code indicating that the response failed due to an error at the network
 *                level, but was not a timeout.
 * @type          {Number}
 */
exports.NETWORK_ERROR = 102;

/**
 * @public
 * @constant      REQUEST_TIMEOUT
 * @description   An error code indicating that the response did not get a response from the server
 *                within the XHR's timeout period.
 * @type          {Number}
 */
exports.REQUEST_TIMEOUT = 103;

/**
 * @public
 * @constant      NO_USER_PROFILE
 * @description   An error code indicating that no user profile is set, meaning that many commands
 *                will be unable to get access to the information they need to function.
 * @type          {Number}
 */
exports.NO_USER_PROFILE = 104;

/**
 * @private
 * @enum EXPLANATIONS
 * @description   A map of error codes (keys) to error code explanations (values).
 * @type {Map}
 */
var EXPLANATIONS = {
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
  101: "The response from the server was badly formed. Ensure that your Bridge Client and Bridge Server versions match.",
  102: "The response failed or was incomplete due to a network error.",
  103: "The server did not respond. Check your internet connection and confirm that your Bridge Server is running.",
  104: "No user profile is currently loaded. You must login before you can continue."
};

/**
 *
 * @public
 *
 * @function      getExplanation
 *
 * @description   Returns a string interpretation of the error code, targeted at explaining
 *                the nature of the error to the end-developer. It is advised that these errors
 *                be re-interpreted for the user by the implementing application.
 *
 * @param  {Number} errorCode   The integer-valued error code to interpret.
 *
 * @return {String}             A string interpretation of the error code.
 *
 */
exports.getExplanation = function getExplanation( errorCode ) {
  'use strict';
  return EXPLANATIONS[ errorCode ] ||
    "Unknown error. You may need to update your Bridge Client and/or Bridge Server version.";
};

/**
 *
 * @public
 *
 * @constructor   BridgeError
 *
 * @description   The BridgeError constructor creates a new BridgeError instance and returns it. The
 *                caller is expected to precede the call with the "new" keyword.
 *
 * @param  {Number} errorCode   The integer-valued error code to interpret.
 *
 * @return {BridgeError}        A BridgeError object.
 *
 */
exports.BridgeError = function BridgeError( errorCode ) {
  'use strict';
  this.status = 200;
  this.errorCode = errorCode;
  this.message = exports.getExplanation( errorCode );
};

},{}],15:[function(_dereq_,module,exports){
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
},{}],16:[function(_dereq_,module,exports){
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
},{"./core":15}],17:[function(_dereq_,module,exports){
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
},{"./core":15}],18:[function(_dereq_,module,exports){
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
},{"Zbi7gb":1}],19:[function(_dereq_,module,exports){
/* global exports: true */
var errors = _dereq_( '../errors' );

/**
 *
 * @module        sendRequest
 *
 * @description   This function provides the lowest-level interface to the XHR functionality that
 *                the Bridge Client is operating on top of. This function is responsible only for
 *                issuing a request and returning a Q promise and hooking up the resolve() and
 *                reject() methods to the results of the XHR request.
 *                This function can be overridden to use some other service than XmlHttpRequests
 *                by the end-developer. If you plan to do this, we advice that you make a plugin
 *                for the Bridge Client to formalize your specialized behaviour. Ensure that the
 *                overriding function adhered to the same signature and returns a Q promise.
 *
 * @param         {Deferred} deferred   A Q deferred object that the end-developer must use to
 *                                      either resolve or reject in response to the request either
 *                                      failing or completing successfully.
 *
 * @param         {String} method       The HTTP verb/action to use for the request.
 *
 * @param         {String} url          The exact URL of the resource to query.
 *
 * @param         {Object} data         The data object to send with the request. This can be used
 *                                      to describe query arguments such as filters and ordering,
 *                                      or to contain data to be stored in the Bridge database.
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function sendRequest( deferred, method, url, data ) {

  'use strict';

  var xhr = new XMLHttpRequest();

  xhr.open( method.toUpperCase(), url, true );
  xhr.setRequestHeader( 'Accept', 'application/json' );
  xhr.setRequestHeader( 'Bridge', JSON.stringify( data ) );

  xhr.onreadystatechange = function () {
    if ( xhr.readyState === 4 ) {
      try {

        // Attempt to parse the response as JSON.
        var data = JSON.parse( xhr.responseText );

        // If an error status is reported, reject the request with the response's' error object.
        if ( xhr.status >= 400 ) {
          deferred.reject( data.content );
        }

        // Otherwise, resolve the request with the response object.
        deferred.resolve( data.content );

      }
      catch ( e ) {

        // If the response can't be parsed as JSON, reject the request with a new error object that
        // describes the response as malformed.
        deferred.reject( new errors.BridgeError( errors.MALFORMED_RESPONSE ) );

      }
    }
  };

  xhr.onerror = function () {

    // If the request failed due to a network error, reject the request with a new error object that
    // describes that the failure was due to a network error.
    deferred.reject( new errors.BridgeError( errors.NETWORK_ERROR ) );

  };

  xhr.ontimeout = function () {

    // If the request timed out, reject the request with a new error object that describes that the
    // failure was due to a timeout.
    deferred.reject( new errors.BridgeError( errors.REQUEST_TIMEOUT ) );

  };

  xhr.send();

  return deferred.promise;

};

},{"../errors":14}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJjOlxcRGV2ZWxvcG1lbnRcXF9CaXRidWNrZXRcXGJyaWRnZS1jbGllbnRcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL0JyaWRnZUNsaWVudC5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvYXV0aGVudGljYXRlLmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9kZWF1dGhlbnRpY2F0ZS5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvZm9yZ290UGFzc3dvcmQuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL2NvbW1hbmRzL2xvYWRVc2VyLmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9sb2dpbi5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvbG9nb3V0LmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9yZWNvdmVyUGFzc3dvcmQuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL2NvbW1hbmRzL3JlZ2lzdGVyLmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9zYXZlVXNlci5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvdmVyaWZ5RW1haWwuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL2NvcmUuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL2Vycm9ycy5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvaW5jbHVkZS9jcnlwdG8tanMvY29yZS5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleC5qcyIsImM6L0RldmVsb3BtZW50L19CaXRidWNrZXQvYnJpZGdlLWNsaWVudC9zcmMvaW5jbHVkZS9jcnlwdG8tanMvc2hhMjU2LmpzIiwiYzovRGV2ZWxvcG1lbnQvX0JpdGJ1Y2tldC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL3EuanMiLCJjOi9EZXZlbG9wbWVudC9fQml0YnVja2V0L2JyaWRnZS1jbGllbnQvc3JjL3BsdWdpbnMvRGVmYXVsdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeHVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdDNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIiggZnVuY3Rpb24gKCkge1xuXG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBJbXBvcnQgQnJpZGdlIGNvcmUgZnVuY3Rpb25hbGl0eVxuICB2YXIgY29yZSA9IHJlcXVpcmUoICcuL2NvcmUnICk7XG4gIHZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi9lcnJvcnMnICk7XG5cbiAgLy8gSW1wb3J0IEJyaWRnZSBBUEkgY29tbWFuZHNcbiAgdmFyIGF1dGhlbnRpY2F0ZSAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvYXV0aGVudGljYXRlJyApO1xuICB2YXIgZGVhdXRoZW50aWNhdGUgICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9kZWF1dGhlbnRpY2F0ZScgKTtcbiAgdmFyIGZvcmdvdFBhc3N3b3JkICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvZm9yZ290UGFzc3dvcmQnICk7XG4gIHZhciBsb2FkVXNlciAgICAgICAgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL2xvYWRVc2VyJyApO1xuICB2YXIgbG9naW4gICAgICAgICAgICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9sb2dpbicgKTtcbiAgdmFyIGxvZ291dCAgICAgICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvbG9nb3V0JyApO1xuICB2YXIgcmVjb3ZlclBhc3N3b3JkICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9yZWNvdmVyUGFzc3dvcmQnICk7XG4gIHZhciByZWdpc3RlciAgICAgICAgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL3JlZ2lzdGVyJyApO1xuICB2YXIgc2F2ZVVzZXIgICAgICAgICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9zYXZlVXNlcicgKTtcbiAgdmFyIHZlcmlmeUVtYWlsICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvdmVyaWZ5RW1haWwnICk7XG5cbiAgLyoqXG4gICAqXG4gICAqIEBnbG9iYWwgICAgICAgIEJyaWRnZVxuICAgKlxuICAgKiBAZGVzY3JpcHRpb24gICBUaGUgQnJpZGdlIGdsb2JhbC5cbiAgICpcbiAgICogQHR5cGUgICAgICAgICAge09iamVjdH1cbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZ2V0RGVidWcgICAgICAgICAgICBUaGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIGRlYnVnIG1vZGUgb2YgQnJpZGdlLlxuICAgKlxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBzZXREZWJ1ZyAgICAgICAgICAgIFRoaXMgZnVuY3Rpb24gc2V0cyB0aGUgZGVidWcgbW9kZSBvZiBCcmlkZ2UuXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGdldEVycm9ycyAgICAgICAgICAgVGhpcyBmdW5jdGlvbiByZXR1cm5zIHRoZSBlcnJvcnMgbW9kdWxlIGZyb20gd2hpY2ggYWxsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2YgdGhlIGVycm9yIHR5cGVzIHRoYXQgQnJpZGdlIHVzZXMgdG8gZW51bWVyYXRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFpbHVyZXMgYXJlIHZpc2libGUuXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGdldElzQXV0aGVudGljYXRlZCAgVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBjdXJyZW50XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbiBoYXMgYmVlbiBhdXRoZW50aWNhdGVkIGJ5IHRoZSBBUEkgc2VydmVyLlxuICAgKlxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXRJc1VzZXJMb2dnZWRJbiAgIENoZWNrcyB0byBzZWUgaWYgdGhlIHNlc3Npb24gaXMgYXV0aGVudGljYXRlZCBhbmQgdGhhdFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSB1c2VyIHByb2ZpbGUgb2JqZWN0IGlzIHNldC4gQm90aCBib3RoIGFyZSB0cnVlLFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSB1c2VyIGlzIGNvbnNpZGVyZWQgdG8gYmUgbG9nZ2VkIGluLlxuICAgKlxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXRJc1VzZXJNb2RpZmllZCAgIENoZWNrcyB0byBzZWUgaWYgdGhlIHVzZXIgb2JqZWN0IGhhcyBiZWVuIGNoYW5nZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoYXQgZ2V0VXNlclByb2ZpbGUoKSB3YXMgY2FsbGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZ2V0IGEgZnJlc2ggY29weS4gVGhpcyBpcyBoZWxwZnVsIHdhcm4gdXNlcnMgdGhhdFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZXJlIGFyZSBjaGFuZ2VzIHRoYXQgbXVzdCBiZSBzYXZlZC5cbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZ2V0UmVtZW1iZXJNZSAgICAgICBUaGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIGN1cnJlbnQgXCJyZW1lbWJlciBtZVwiIHN0YXRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2YgdGhlIGFwcGxpY2F0aW9uLlxuICAgKlxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXRVc2VyICAgICAgICAgICAgIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgdXNlciBwcm9maWxlIG9iamVjdCB0aGF0IHlvdVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNob3VsZCB1c2UgaW4geW91ciBhcHAgdGhhdCBnZXQgYmUgZmV0Y2hlZCBmcm9tIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEFQSSB3aXRoIGdldFVzZXJQcm9maWxlKCkgYW5kIHVwZGF0ZWQgb24gdGhlIEFQSSB1c2luZ1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVVzZXJQcm9maWxlKCkuXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IG9uUmVxdWVzdENhbGxlZCAgICAgQSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IGFsbG93cyB5b3UgdG8gYXR0YWNoIHNwZWNpYWxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWhhdmlvdXIgdG8gZXZlcnkgcmVxdWVzdCBjYWxsIG1hZGUgYnkgQnJpZGdlLiBUaGlzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgY2FwdHVyZXMgdGhlIEhUVFAgbWV0aG9kLCBVUkwsIGFuZCB0aGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXlsb2FkIG9mIGVhY2ggb3V0Z29pbmcgcmVxdWVzdCBiZWZvcmUgaXQgaXMgc2VudCBhbmRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnaXZlcyB5b3UgdGhlIG9wcG9ydHVuaXR5IHRvIG1vZGlmeSByZXF1ZXN0cywgaWZcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZWNlc3NhcnkuXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGF1dGhlbnRpY2F0ZSAgICAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gcmVxdWVzdCBhdXRoZW50aWNhdGlvbi4gSWYgdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdCBpcyBzdWNjZXNzZnVsLCBhIEJyaWRnZSBhdXRoZW50aWNhdGlvbiBjb29raWVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpcyBzZXQgaW4gdGhlIGJyb3dzZXIgdG8gaWRlbnRpZnkgdGhlIHVzZXIgZnJvbSBub3dcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbi5cbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZGVhdXRoZW50aWNhdGUgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byByZXF1ZXN0IGRlYXV0aGVudGljYXRpb24uIElmIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QgaXMgc3VjY2Vzc2Z1bCwgdGhlIEJyaWRnZSBhdXRoZW50aWNhdGlvblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvb2tpZSBpcyBzZXQgdG8gZXhwaXJlIGltbWVkaWF0ZWx5LCBhbmQgYWxsIHNlc3Npb25cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXMgaW4gQnJpZGdlIGFyZSByZXNldC5cbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZm9yZ290UGFzc3dvcmQgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byByZXF1ZXN0IGEgcGFzc3dvcmQgcmVjb3ZlcnkgZW1haWxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZSBzZW50IHRvIHRoZSBnaXZlbiBlbWFpbCBhZGRyZXNzLiByZWNvdmVyUGFzc3dvcmQoKVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcHJlc2VudHMgdGhlIGNvbXBsZXRpb24gb2YgdGhlIHJlY292ZXJ5IHByb2Nlc3MuXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGxvYWRVc2VyICAgICAgICAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gZmV0Y2ggYW4gdXAtdG8tZGF0ZSBjb3B5IG9mIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIncyBwcm9maWxlLiBJZiB0aGlzIHJlcXVlc3QgaXMgc3VjY2Vzc2Z1bCwgdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlciBvYmplY3Qgd2lsbCBiZSBvdmVyd3JpdHRlbiB3aXRoIGEgZnJlc2ggY29weS5cbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gbG9naW4gICAgICAgICAgICAgICBBIGNvbnZlbmllbmNlIGZ1bmN0aW9uIHRoYXQgZmlyc3QgYXV0aGVudGljYXRlcyB0aGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyIGFuZCB0aGVuIGdvZXMgb24gdG8gZmV0Y2ggdGhlaXIgdXNlciBwcm9maWxlLCBpZlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NmdWwuXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGxvZ291dCAgICAgICAgICAgICAgQW4gYWxpYXMgZm9yIGRlYXV0aGVudGljYXRlKCkuIEl0IGRvZXMgZXhhY3RseSB0aGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYW1lIHRoaW5nLlxuICAgKlxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSByZWNvdmVyUGFzc3dvcmQgICAgIE1ha2VzIGFuIEFQSSBjYWxsIHRvIGNvbXBsZXRlIHRoZSBwYXNzd29yZCByZWNvdmVyeVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3Mgc3RhcnRlZCBieSBjYWxsaW5nIGZvcmdvdFBhc3N3b3JkKCkuIFRoZSB1c2VyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0cyBhIG5ldyBwYXNzd29yZCBhbmQgYSB1bmlxdWUgaGFzaCBzZW50IHRvIHRoZWlyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1haWwgYWNjb3VudCB0byBhdXRob3JpemUgdGhlIHBhc3N3b3JkIGNoYW5nZS5cbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gcmVnaXN0ZXIgICAgICAgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byByZWdpc3RlciBhIG5ldyB1c2VyIGFjY291bnQuIFRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIgcHJvdmlkZXMgdGhlaXIgZW1haWwsIHBhc3N3b3JkLCBmaXJzdCBuYW1lLCBsYXN0XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSBhbmQgYW4gYXBwLXNwZWNpZmljIG9iamVjdCB0aGF0IGNhbiBzdG9yZSBhbnlcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsIGRhdGEgdGhhdCB5b3VyIGFwcCByZXF1aXJlcy4gSWYgZW1haWxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb24gaXMgZW5hYmxlZCBpbiB0aGUgQnJpZGdlIFNlcnZlciwgdGhlbiBhblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtYWlsIHdpbGwgYmUgc2VudCB0byB0aGUgdXNlcidzIGVtYWlsIGFkZHJlc3Mgd2l0aCBhXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVVJMIHRvIGZvbGxvdyB0byBjb21wbGV0ZSB0aGVpciByZWdpc3RyYXRpb24uIFRoZWlyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uIGlzIGNvbXBsZXRlZCBieSBjYWxsaW5nIHZlcmlmeUVtYWlsKCkuXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHJlcXVlc3QgICAgICAgICAgICAgVGhpcyBpcyB0aGUgbW9zdCBnZW5lcmFsLXB1cnBvc2UgZnVuY3Rpb24gZm9yIG1ha2luZ1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEFQSSBjYWxscyBhdmFpbGFibGUgdG8geW91LiBJdCB0YWtlcyB0aGUgSFRUUCBtZXRob2QsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVVJMLCBhbmQgcGF5bG9hZCBvZiB5b3VyIHJlcXVlc3QgYW5kIHRyYW5zbWl0cyBpdC4gWW91XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0IGEgUSBwcm9taXNlIGluIHJldHVybiB0aGF0IHlvdSBjYW4gdXNlIHRvIGhhbmRsZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3MgYW5kIGZhaWx1cmUgb2YgeW91ciByZXF1ZXN0LCB3aGF0ZXZlciBpdCBtYXlcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZS5cbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gc2F2ZVVzZXIgICAgICAgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byBzdWJtaXQgdGhlIGN1cnJlbnQgdXNlciBvYmplY3QgdG9cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgZGF0YWJhc2UgYXMgdGhlIHVwLXRvLWRhdGUgY29weS4gSWYgc3VjY2Vzc2Z1bCxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgdXNlcidzIHByb2ZpbGUgaW4gdGhlIGRhdGFiYXNlIHdpbGwgYmUgdXBkYXRlZC5cbiAgICpcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gdmVyaWZ5RW1haWwgICAgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byBjb21wbGV0ZSB0aGUgcmVnaXN0cmF0aW9uIHByb2Nlc3NcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydGVkIGJ5IGNhbGxpbmcgcmVnaXN0ZXIoKS4gVGhlIHVzZXIgbXVzdCBzdXBwbHkgYVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuaXF1ZSBoYXNoIHRoYXQgd2FzIHNlbnQgdG8gdGhlaXIgZW1haWwgYWRkcmVzcyBpblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yZGVyIHRvIHZlcmlmeSB0aGVpciBlbWFpbCBhZGRyZXNzIGFuZCBhdXRob3JpemUgdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZhdGlvbiBvZiB0aGVpciBhY2NvdW50IChpZiB0aGUgQnJpZGdlIFNlcnZlciBoYXNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbWFpbCB2ZXJpZmljYXRpb24gZW5hYmxlZCkuXG4gICAqXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHNlbmRSZXF1ZXN0ICAgICAgICAgVGhpcyBmdW5jdGlvbiBpcyB0aGUgbG93ZXN0LWxldmVsIGltcGxlbWVudGF0aW9uIG9mXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgWEhSIGJlaGF2aW91ciB3aXRoaW4gQnJpZGdlLiBCeSBkZWZhdWx0LCBpdCBpc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyZWQgdG8gdXNlIHRoZSBYbWxIdHRwUmVxdWVzdCBvYmplY3QgaW4gSlMgdG9cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZW5kIHJlcXVlc3RzLCBidXQgY2FuIGJlIG92ZXJyaWRkZW4gYnkgYW5vdGhlclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9mIHlvdXIgb3duIGNyZWF0aW9uLCBhcyBsb25nIGFzIGl0IGlzIG9mIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhbWUgc2lnbmF0dXJlLiBUaGlzIGlzIHVzZWZ1bCBpZiB5b3Ugd2FudCB0byBtYWtlIGFcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbHVnaW4gZm9yIEJyaWRnZSB0byBpbnRlcmZhY2Ugd2l0aCBhbm90aGVyIGxpYnJhcnkgb3JcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZXdvcmsgc3VjaCBhcyBBbmd1bGFySlMuXG4gICAqXG4gICAqL1xuICBtb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8vIEdldHRlcnMvU2V0dGVycyBmb3IgUHJvcGVydGllc1xuICAgIGdldERlYnVnICAgICAgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvcmUuZGVidWc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgc2V0RGVidWcgICAgICAgICAgICA6IGZ1bmN0aW9uICggdmFsdWUgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29yZS5kZWJ1ZyA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgIGdldEVycm9ycyAgICAgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycm9ycztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICBnZXRJc0F1dGhlbnRpY2F0ZWQgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3JlLmlzQXV0aGVudGljYXRlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICBnZXRJc1VzZXJMb2dnZWRJbiAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3JlLmlzVXNlckxvZ2dlZEluKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgZ2V0SXNVc2VyTW9kaWZpZWQgICA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29yZS5pc1VzZXJNb2RpZmllZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgIGdldFJlbWVtYmVyTWUgICAgICAgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvcmUucmVtZW1iZXJNZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICBnZXRVc2VyICAgICAgICAgICAgIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3JlLnVzZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAvLyBDYWxsYmFja3NcbiAgICBvblJlcXVlc3RDYWxsZWQgICAgIDogY29yZS5vblJlcXVlc3RDYWxsZWQsXG5cbiAgICAvLyBDb21tYW5kc1xuICAgIGF1dGhlbnRpY2F0ZSAgICAgICAgOiBhdXRoZW50aWNhdGUsXG4gICAgZGVhdXRoZW50aWNhdGUgICAgICA6IGRlYXV0aGVudGljYXRlLFxuICAgIGZvcmdvdFBhc3N3b3JkICAgICAgOiBmb3Jnb3RQYXNzd29yZCxcbiAgICBsb2FkVXNlciAgICAgICAgICAgIDogbG9hZFVzZXIsXG4gICAgbG9naW4gICAgICAgICAgICAgICA6IGxvZ2luLFxuICAgIGxvZ291dCAgICAgICAgICAgICAgOiBsb2dvdXQsXG4gICAgcmVjb3ZlclBhc3N3b3JkICAgICA6IHJlY292ZXJQYXNzd29yZCxcbiAgICByZWdpc3RlciAgICAgICAgICAgIDogcmVnaXN0ZXIsXG4gICAgcmVxdWVzdCAgICAgICAgICAgICA6IGNvcmUucmVxdWVzdCxcbiAgICBzYXZlVXNlciAgICAgICAgICAgIDogc2F2ZVVzZXIsXG4gICAgdmVyaWZ5RW1haWwgICAgICAgICA6IHZlcmlmeUVtYWlsLFxuXG4gICAgLy8gWEhSIEludGVyZmFjZVxuICAgIHNlbmRSZXF1ZXN0ICAgICAgICAgOiBjb3JlLnNlbmRSZXF1ZXN0XG5cbiAgfTtcblxufSApKCk7XG4iLCIvKipcclxuICogQG1vZHVsZSAgYXV0aGVudGljYXRlXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgQ3J5cHRvRW5jSGV4ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL2VuYy1oZXgnICk7XHJcbnZhciBDcnlwdG9TaGEyNTYgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvc2hhMjU2JyApO1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgYXV0aGVudGljYXRlIFtQT1NUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byB2YWxpZGF0ZSB0aGUgY3VycmVudCBzZXNzaW9uIGJ5IHNlbmRpbmcgYW4gYXV0aG9yaXphdGlvbiBjb29raWVcclxuICogICAgICAgICAgICAgICAgdGhhdCB3aWxsIGlkZW50aWZ5IHRoZSBhdXRoZW50aWNhdGVkIHVzZXIuIFRoZSBjb29raWUgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyXHJcbiAqICAgICAgICAgICAgICAgIHdpbGwgb3BlcmF0ZSB1bmRlciB0aGUgc2FtZSBkb21haW4gcG9saWN5IGFuZCB0aGUgXCJIdHRwT25seVwiIHJlc3RyaWN0aW9uIHRvXHJcbiAqICAgICAgICAgICAgICAgIHByZXZlbnQgWFNTIGF0dGFja3MgZnJvbSBzdGVhbGluZyB1c2VyIGF1dGhlbnRpY2F0aW9uIHRva2VucyBhbmQgbWFzcXVlcmFkaW5nIGFzXHJcbiAqICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0ZWQgdXNlcnMuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXQgZG9lc24ndFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBlbWFpbCAgICAgICAgVGhlIHVzZXIncyBlbWFpbCBhZGRyZXNzLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBwYXNzd29yZCAgICAgVGhlIHVzZXIncyBwYXNzd29yZCAobm90IGhhc2hlZCB5ZXQpLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7Qm9vbGVhbn0gcmVtZW1iZXJNZSAgQSBib29sZWFuIGluZGljYXRpbmcgd2hldGhlciBvciBub3QgdGhlIHVzZXIgd291bGQgbGlrZSB0b1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmUgYXV0b21hdGljYWxseSBsb2dnZWQtaW4gaW4gdGhlIGZ1dHVyZS4gSWYgcmVtZW1iZXJNZSBpc1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0IHRvIGZhbHNlLCB0aGUgYXV0aGVudGljYXRpb24gY29va2llIHNlbnQgYnkgdGhlIHNlcnZlclxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCBleHBpcmUgd2hlbiB0aGUgY3VycmVudCBicm93c2VyIHNlc3Npb24gZW5kcy4gSWYgdGhpc1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXMgc2V0IHRvIHRydWUsIGl0IHdpbGwgZXhwaXJlIGFmdGVyIGEgcGVyaW9kIG9mIHRpbWVcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluZWQgYnkgdGhlIEJyaWRnZSBzZXJ2ZXIgY29uZmlnIGZpbGUgKGRlZmF1bHQgMiB3ZWVrcykuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZSggYXBpVXJsLCBlbWFpbCwgcGFzc3dvcmQsIHJlbWVtYmVyTWUgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgdGhlIHJlcXVlc3QgcGF5bG9hZCAoaGFzaCB0aGUgcGFzc3dvcmQgd2l0aCBTSEEyNTYpLlxyXG4gIHZhciBwYXlsb2FkID0ge1xyXG4gICAgZW1haWw6IGVtYWlsLFxyXG4gICAgcGFzc3dvcmQ6IENyeXB0b1NoYTI1NiggcGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICksXHJcbiAgICByZW1lbWJlck1lOiByZW1lbWJlck1lXHJcbiAgfTtcclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgY29yZS5yZXF1ZXN0KCAnUE9TVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvYXV0aGVudGljYXRlJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSB0aGUgc3RydWN0dXJlIG9mIHRoZSByZXNwb25zZSwgYW5kIGlmIGludmFsaWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGFcclxuICAgICAgLy8gbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgaWYgKCB0eXBlb2YoIGRhdGEgKSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgY29yZS5yZWplY3QoIFwiQXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTUFMRk9STUVEX1JFU1BPTlNFICkgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNldCB0aGUgc2Vzc2lvbiBhcyBiZWluZyBhdXRoZW50aWNhdGVkIGFuZCBzdG9yZSB0aGUgXCJyZW1lbWJlciBtZVwiIHN0YXRlLlxyXG4gICAgICBjb3JlLmlzQXV0aGVudGljYXRlZCA9IHRydWU7XHJcbiAgICAgIGNvcmUucmVtZW1iZXJNZSA9IHJlbWVtYmVyTWU7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgZm9ybWF0IGlzIHZhbGlkLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb2JqZWN0LlxyXG4gICAgICBjb3JlLnJlc29sdmUoIFwiQXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIkF1dGhlbnRpY2F0ZVwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGF1dGhlbnRpY2F0ZVxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGRlYXV0aGVudGljYXRlIFtERUxFVEVdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIGludmFsaWRhdGUgdGhlIGN1cnJlbnQgc2Vzc2lvbiBieSBleHBpcmluZyB0aGUgYXV0aGVudGljYXRpb25cclxuICogICAgICAgICAgICAgICAgY29va2llIHVzZWQgYnkgdGhpcyBjbGllbnQuIFRoaXMgaXMgbmVjZXNzYXJ5IHJhdGhlciB0aGFuIHNldHRpbmcgdGhlIGF1dGggY29va2llXHJcbiAqICAgICAgICAgICAgICAgIGluIEphdmFTY3JpcHQgZGlyZWN0bHkgYmVjYXVzZSB0aGUgQnJpZGdlIHNlcnZlciBpbXBvc2VzIHRoZSBcIkh0dHBPbmx5XCJcclxuICogICAgICAgICAgICAgICAgcmVzdHJpY3Rpb24gdXBvbiB0aGUgYXV0aG9yaXphdGlvbiBjb29raWUgdG8gcHJldmVudCBhbiBYU1MgYXR0YWNrIGZyb20gaGlqYWNraW5nXHJcbiAqICAgICAgICAgICAgICAgIGEgdXNlcidzIHNlc3Npb24gdG9rZW4gYW5kIG1hc3F1ZXJhZGluZyBhcyB0aGUgYXV0aGVudGljYXRlZCB1c2VyLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXV0aGVudGljYXRlKCBhcGlVcmwgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgYW5kIGVtcHR5IHJlcXVlc3QgcGF5bG9hZCAoZG9uJ3QgbmVlZCB0byBzZW5kIGFueXRoaW5nKS5cclxuICB2YXIgcGF5bG9hZCA9IHt9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBjb3JlLnJlcXVlc3QoICdERUxFVEUnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL2RlYXV0aGVudGljYXRlJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSB0aGUgc3RydWN0dXJlIG9mIHRoZSByZXNwb25zZSwgYW5kIGlmIGludmFsaWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGFcclxuICAgICAgLy8gbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgaWYgKCB0eXBlb2YoIGRhdGEgKSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgY29yZS5yZWplY3QoIFwiRGVhdXRoZW50aWNhdGVcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gUmVzZXQgdGhlIHNlc3Npb24gdG8gY2xlYXIgYWxsIHVzZXIgZGF0YVxyXG4gICAgICBjb3JlLnJlc2V0U2Vzc2lvbigpO1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZvcm1hdCBpcyB2YWxpZCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9iamVjdC5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIkRlYXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIkRlYXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgZm9yZ290UGFzc3dvcmRcclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBRID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvcScgKTtcclxudmFyIGNvcmUgPSByZXF1aXJlKCAnLi4vY29yZScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICBmb3Jnb3RQYXNzd29yZCBbUFVUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byBzZXQgdGhlIHVzZXIgaW50byByZWNvdmVyeSBzdGF0ZSBmb3IgYSBzaG9ydCBwZXJpb2Qgb2YgdGltZVxyXG4gKiAgICAgICAgICAgICAgICBhbmQgc2VuZCBhbiBhY2NvdW50IHJlY292ZXJ5IGVtYWlsIHRvIHRoZSBlbWFpbCBhY2NvdW50IHByb3ZpZGVkIGhlcmUuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBlbWFpbCAgICBUaGUgdXNlcidzIGVtYWlsIGFkZHJlc3MuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yZ290UGFzc3dvcmQoIGFwaVVybCwgZW1haWwgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgdGhlIHJlcXVlc3QgcGF5bG9hZC5cclxuICB2YXIgcGF5bG9hZCA9IHtcclxuICAgIGVtYWlsOiBlbWFpbFxyXG4gIH07XHJcblxyXG4gIC8vIFNlbmQgdGhlIHJlcXVlc3QgYW5kIGhhbmRsZSB0aGUgcmVzcG9uc2UuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gIGNvcmUucmVxdWVzdCggJ1BVVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvZm9yZ290LXBhc3N3b3JkJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCAgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJGb3Jnb3QgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIkZvcmdvdCBQYXNzd29yZFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgIH0sXHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3QgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJGb3Jnb3QgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGdldFVzZXJQcm9maWxlXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgQ3J5cHRvRW5jSGV4ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL2VuYy1oZXgnICk7XHJcbnZhciBDcnlwdG9TaGEyNTYgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvc2hhMjU2JyApO1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgbG9hZFVzZXIgW0dFVF1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gZmV0Y2ggdGhlIGN1cnJlbnQgY29weSBvZiB0aGUgY3VycmVudGx5IGxvZ2dlZC1pbiB1c2VyJ3MgcHJvZmlsZVxyXG4gKiAgICAgICAgICAgICAgICBmcm9tIHRoZSBkYXRhYmFzZSBhbmQgc2V0IGl0IGFzIEJyaWRnZSdzIHVzZXIgcHJvZmlsZSBvYmplY3QuIFRoaXMgV0lMTCBvdmVyd3JpdGVcclxuICogICAgICAgICAgICAgICAgYW55IHVuc2F2ZWQgY2hhbmdlcyB0byB0aGUgZXhpc3RpbmcgdXNlciBwcm9maWxlIG9iamVjdC5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgICAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXR0ZXIgd2hldGhlciB0aGUgdHJhaWxpbmcgZm9yd2FyZC1zbGFzaCBpcyBsZWZ0IG9uIG9yIG5vdFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGxvYWRVc2VyKCBhcGlVcmwgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgYW5kIGVtcHR5IHJlcXVlc3QgcGF5bG9hZCAoZG9uJ3QgbmVlZCB0byBzZW5kIGFueXRoaW5nKS5cclxuICB2YXIgcGF5bG9hZCA9IHt9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBjb3JlLnJlcXVlc3QoICdHRVQnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL3VzZXInLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoICEoIGRhdGEgaW5zdGFuY2VvZiBPYmplY3QgKSApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJMb2FkIFVzZXJcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQXNzaWduIHRoZSB1c2VyIHByb2ZpbGUgYXMgdGhlIHVzZXIgb2JqZWN0LlxyXG4gICAgICAvLyBOb3RlOiBKU09OIHN0cmluZ2lmeSgpaW5nIHRoZSB1c2VyIHByb2ZpbGUga2VlcHMgYSBzdGF0aWMgY29weSB3ZSBjYW4gY29tcGFyZSBhZ2FpbnN0LlxyXG4gICAgICBjb3JlLnVzZXIgPSBkYXRhO1xyXG4gICAgICBjb3JlLnVuY2hhbmdlZFVzZXIgPSBKU09OLnN0cmluZ2lmeSggZGF0YSApO1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZvcm1hdCBpcyB2YWxpZCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9iamVjdC5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIkxvYWQgVXNlclwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgIH0sXHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJMb2FkIFVzZXJcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICk7XHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICBsb2dpblxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxudmFyIGF1dGhlbnRpY2F0ZSA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9hdXRoZW50aWNhdGUnICk7XHJcbnZhciBsb2FkVXNlciA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9sb2FkVXNlcicgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGxvZ2luIFthdXRoZW50aWNhdGUgPj4gbG9hZFVzZXJdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIGF1dGhlbnRpY2F0ZSB0aGUgdXNlciBnaXZlbiB0aGVpciBlbWFpbCBhbmQgcGFzc3dvcmQsIGFuZFxyXG4gKiAgICAgICAgICAgICAgICBmb2xsb3cgdGhlIGF1dGhlbnRpY2F0aW9uIChpZiBzdWNjZXNzZnVsKSB3aXRoIGEgcmVxdWVzdCBmb3IgdGhlIHVzZXIncyBwcm9maWxlLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gZW1haWwgICAgICAgIFRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gcGFzc3dvcmQgICAgIFRoZSB1c2VyJ3MgcGFzc3dvcmQgKG5vdCBoYXNoZWQgeWV0KS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge0Jvb2xlYW59IHJlbWVtYmVyTWUgIEEgYm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdvdWxkIGxpa2UgdG9cclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhdmUgYSBsb25nIGV4cGlyeSBkYXRlIG9yIG5vdC4gSWYgdGhpcyBpcyB0cnVlLCB0aGVuIHRoZVxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQnJpZGdlIHNlcnZlciB3aWxsIHJldHVybiBhbiBhdXRoIHRva2VuIHdpdGggYW4gZXhwaXJ5XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbiB0aGUgb3JkZXIgb2YgMiB3ZWVrcyAoYnV0IGNhbiBiZSBtb2RpZmllZCBpbiB0aGUgc2VydmVyXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncykuIElmIGZhbHNlLCB0aGUgZXhwaXJ5IHdpbGwgb25seSBiZSBhYm91dCA2XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VycyAoYWdhaW4sIHRoaXMgaXMgY29uZmlndXJhYmxlKS5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbG9naW4oIGFwaVVybCwgZW1haWwsIHBhc3N3b3JkLCByZW1lbWJlck1lICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIFNlbmQgYW4gYXV0aGVudGljYXRpb24gcmVxdWVzdC5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgYXV0aGVudGljYXRlKCBhcGlVcmwsIGVtYWlsLCBwYXNzd29yZCwgcmVtZW1iZXJNZSApLnRoZW4oXHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRlIHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIElmIGF1dGhlbnRpY2F0aW9uIHdhcyBzdWNjZXNzZnVsLCBzZW5kIGEgcmVxdWVzdCB0byBmZXRjaCB0aGUgdXNlcidzIHByb2ZpbGUuXHJcbiAgICAgIGxvYWRVc2VyKCBhcGlVcmwsIGVtYWlsICkudGhlbihcclxuICAgICAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAgICAgLy8gSWYgZmV0Y2hpbmcgdGhlIHVzZXIgcHJvZmlsZSBpcyBzdWNjZXNzZnVsLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEuXHJcbiAgICAgICAgICBjb3JlLnJlc29sdmUoIFwiTG9naW5cIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgICAgIC8vIElmIGZldGNoaW5nIHRoZSB1c2VyIHByb2ZpbGUgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0LlxyXG4gICAgICAgICAgY29yZS5yZWplY3QoIFwiTG9naW5cIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGUgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIGF1dGhlbnRpY2F0aW9uIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgY29yZS5yZWplY3QoIFwiTG9naW5cIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGxvZ2luXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgZGVhdXRoZW50aWNhdGUgPSByZXF1aXJlKCAnLi4vY29tbWFuZHMvZGVhdXRoZW50aWNhdGUnICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICBsb2dvdXQgW2RlYXV0aGVudGljYXRlIChhbGlhcyldXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIGludmFsaWRhdGUgdGhlIGN1cnJlbnQgc2Vzc2lvbiBieSBleHBpcmluZyB0aGUgYXV0aGVudGljYXRpb25cclxuICogICAgICAgICAgICAgICAgY29va2llIHVzZWQgYnkgdGhpcyBjbGllbnQuIFRoaXMgZnVuY3Rpb24gaXMgbWVyZWx5IGFuIGFsaWFzIGZvciBkZWF1dGhlbnRpY2F0ZSgpXHJcbiAqICAgICAgICAgICAgICAgIHN1Y2ggdGhhdCBsb2dpbiBhbmQgbG9nb3V0IGZvcm0gYSBsb2dpY2FsIHBhaXIgb2Ygb3BlcmF0aW9ucyBmb3IgQVBJIGNvbnNpc3RlbmN5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZGVhdXRoZW50aWNhdGU7XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICByZWNvdmVyUGFzc3dvcmRcclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBDcnlwdG9FbmNIZXggPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleCcgKTtcclxudmFyIENyeXB0b1NoYTI1NiA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL2NyeXB0by1qcy9zaGEyNTYnICk7XHJcbnZhciBRID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvcScgKTtcclxudmFyIGNvcmUgPSByZXF1aXJlKCAnLi4vY29yZScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICByZWNvdmVyUGFzc3dvcmQgW1BVVF1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gc2V0IHRoZSBwYXNzd29yZCBvZiB0aGUgdXNlciBhY2NvdW50IGFzc29jaWF0ZWQgd2l0aCB0aGVcclxuICogICAgICAgICAgICAgICAgcHJvdmlkZWQgcmVjb3ZlcnkgaGFzaCB0aGF0IHdhcyBzZW50IHRvIHRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXQgZG9lc24ndFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IHBhc3N3b3JkICAgQSBuZXcgcGFzc3dvcmQgdG8gYXNzaWduIGZvciB0aGUgdXNlci5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gaGFzaCAgICAgICBUaGUgaGFzaCBzdHJpbmcgdGhhdCB3YXMgc2VudCB0byB0aGUgdXNlciBpbiB0aGUgcGFzc3dvcmRcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNvdmVyeSBlbWFpbC5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJlY292ZXJQYXNzd29yZCggYXBpVXJsLCBwYXNzd29yZCwgaGFzaCApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBCdWlsZCB0aGUgcmVxdWVzdCBwYXlsb2FkIChoYXNoIHRoZSBwYXNzd29yZCB3aXRoIFNIQTI1NikuXHJcbiAgdmFyIHBheWxvYWQgPSB7XHJcbiAgICBoYXNoOiBoYXNoLFxyXG4gICAgcGFzc3dvcmQ6IENyeXB0b1NoYTI1NiggcGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4IClcclxuICB9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBjb3JlLnJlcXVlc3QoICdQVVQnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL3JlY292ZXItcGFzc3dvcmQnLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0ICB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgdGhlIHN0cnVjdHVyZSBvZiB0aGUgcmVzcG9uc2UsIGFuZCBpZiBpbnZhbGlkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhXHJcbiAgICAgIC8vIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBpcyBtYWxmb3JtZWQuXHJcbiAgICAgIGlmICggdHlwZW9mKCBkYXRhICkgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIGNvcmUucmVqZWN0KCBcIlJlY292ZXIgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIlJlY292ZXIgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXF1ZXN0IGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgY29yZS5yZWplY3QoIFwiUmVjb3ZlciBQYXNzd29yZFwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgcmVnaXN0ZXJcclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBDcnlwdG9FbmNIZXggPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleCcgKTtcclxudmFyIENyeXB0b1NoYTI1NiA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL2NyeXB0by1qcy9zaGEyNTYnICk7XHJcbnZhciBRID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvcScgKTtcclxudmFyIGNvcmUgPSByZXF1aXJlKCAnLi4vY29yZScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcbnZhciBsb2dpbiA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9sb2dpbicgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIHJlZ2lzdGVyIFtQT1NUIHVzZXJzID4+IGxvZ2luXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byByZWdpc3RlciBhIHVzZXIgd2l0aCB0aGUgZ2l2ZW4gZW1haWwvcGFzc3dvcmQgcGFpciwgbmFtZSwgYW5kXHJcbiAqICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLXNwZWNpZmljIGRhdGEuIFRoZSBwYXNzd29yZCBpcyB0cmFuc21pdHRlZCBpbiB0aGUgY29udGVudCBvZiB0aGVcclxuICogICAgICAgICAgICAgICAgbWVzc2FnZSBTSEEtMjU2IGVuY3J5cHRlZCB0byBwcm90ZWN0IHRoZSB1c2VyJ3MgcGFzc3dvcmQgdG8gYSBtaW5pbWFsIGV4dGVudFxyXG4gKiAgICAgICAgICAgICAgICBldmVuIHVuZGVyIGluc2VjdXJlIGNvbm5lY3Rpb25zLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gZW1haWwgICAgICAgIFRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gcGFzc3dvcmQgICAgIFRoZSB1c2VyJ3MgcGFzc3dvcmQgKG5vdCB5ZXQgaGFzaGVkKS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gZmlyc3ROYW1lICAgIFRoZSB1c2VyJ3MgZmlyc3QgbmFtZS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gbGFzdE5hbWUgICAgIFRoZSB1c2VyJ3MgbGFzdCBuYW1lLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcHBEYXRhICAgICAgQSBKU09OLnN0cmluZ2lmeSgpZWQgSmF2YVNjcmlwdCBvYmplY3Qgb2YgYW55IGFwcGxpY2F0aW9uLVxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWMgZGF0YSB0byBzdG9yZSBmb3IgdGhpcyB1c2VyLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcmVnaXN0ZXIoIGFwaVVybCwgZW1haWwsIHBhc3N3b3JkLCBmaXJzdE5hbWUsIGxhc3ROYW1lLCBhcHBEYXRhICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIEJ1aWxkIHRoZSByZXF1ZXN0IHBheWxvYWQgKGhhc2ggdGhlIHBhc3N3b3JkIHdpdGggU0hBMjU2KS5cclxuICB2YXIgcGF5bG9hZCA9IHtcclxuICAgIFwiYXBwRGF0YVwiOiBhcHBEYXRhLFxyXG4gICAgXCJlbWFpbFwiOiBlbWFpbCxcclxuICAgIFwiZmlyc3ROYW1lXCI6IGZpcnN0TmFtZSxcclxuICAgIFwibGFzdE5hbWVcIjogbGFzdE5hbWUsXHJcbiAgICBcInBhc3N3b3JkXCI6IENyeXB0b1NoYTI1NiggcGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICksXHJcbiAgfTtcclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgY29yZS5yZXF1ZXN0KCAnUE9TVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvdXNlcicsIHBheWxvYWQgKS50aGVuKFxyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSB0aGUgc3RydWN0dXJlIG9mIHRoZSByZXNwb25zZSwgYW5kIGlmIGludmFsaWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGFcclxuICAgICAgLy8gbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgaWYgKCB0eXBlb2YoIGRhdGEgKSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgY29yZS5yZWplY3QoIFwiUmVnaXN0ZXJcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHVzZXIgbG9naW4gaXMgc3VjY2Vzc2Z1bCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhLlxyXG4gICAgICBjb3JlLnJlc29sdmUoIFwiUmVnaXN0ZXJcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHJlZ2lzdHJhdGlvbiBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIlJlZ2lzdGVyXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICk7XHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICB1cGRhdGVVc2VyUHJvZmlsZVxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIENyeXB0b0VuY0hleCA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL2NyeXB0by1qcy9lbmMtaGV4JyApO1xyXG52YXIgQ3J5cHRvU2hhMjU2ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1NicgKTtcclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxudmFyIGF1dGhlbnRpY2F0ZSA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9hdXRoZW50aWNhdGUnICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICBzYXZlVXNlciBbUFVUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byBzYXZlIHRoZSB1c2VyIHByb2ZpbGUgb2YgdGhlIGN1cnJlbnRseSBsb2dnZWQtaW4gdXNlciB0byB0aGVcclxuICogICAgICAgICAgICAgICAgQVBJIHNlcnZlcidzIGRhdGFiYXNlLiBUaGlzIG9wZXJhdGlvbiByZXF1aXJlcyB0aGUgdXNlcidzIGN1cnJlbnQgcGFzc3dvcmQgdG8gYmVcclxuICogICAgICAgICAgICAgICAgc3VwcGxpZWQgdG8gcmUtYXV0aGVudGljYXRlIHRoZSB1c2VyIGlmIHRoZXkgaW50ZW5kIHRvIGNoYW5nZSB0aGVpciBwYXNzd29yZC5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgICAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXRcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2Vzbid0IG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdCBvbiBvciBub3QgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gY3VycmVudFBhc3N3b3JkICBbT1BUSU9OQUxdIFRoZSB1c2VyJ3MgY3VycmVudCBwYXNzd29yZCAobm90IHlldCBoYXNoZWQpLFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIHRoZXkgd291bGQgbGlrZSB0byBjaGFuZ2UgdGhlaXIgcGFzc3dvcmQuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IG5ld1Bhc3N3b3JkICAgICAgW09QVElPTkFMXSBUaGUgcGFzc3dvcmQgdGhlIHVzZXIgd291bGQgbGlrZSB0byBjaGFuZ2UgdG9cclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobm90IHlldCBoYXNoZWQpLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2F2ZVVzZXIoIGFwaVVybCwgY3VycmVudFBhc3N3b3JkLCBuZXdQYXNzd29yZCApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBDaGVjayB0aGF0IHRoZSB1c2VyIG9iamVjdCBpcyBzZXQsIGJlY2F1c2Ugd2Ugd2lsbCBuZWVkIHRvIGFjY2VzcyBpdHMgcHJvcGVydGllcy5cclxuICAvLyBJZiBpdCBpc24ndCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYSBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCBubyB1c2VyIG9iamVjdCBpcyBzZXQuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gIGlmICggIWNvcmUudXNlciApIHtcclxuICAgIGNvcmUucmVqZWN0KCBcIlNhdmUgVXNlclwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk5PX1VTRVJfUFJPRklMRSApICk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICAvLyBTZXQgdGhlIHBheWxvYWQgdG8gdGhlIHVzZXIgcHJvZmlsZSBvYmplY3QsIGFuZCBpbmNsdWRlIHRoZSBjdXJyZW50IGFuZCBuZXcgcGFzc3dvcmRzIGFzXHJcbiAgLy8gYWRkaXRpb25hbCBwcm9wZXJ0aWVzIGlmIHRoZSB1c2VyIGludGVuZCB0byBjaGFuZ2UgdGhlaXIgcGFzc3dvcmQuXHJcbiAgdmFyIHBheWxvYWQgPSBjb3JlLnVzZXI7XHJcbiAgaWYgKCBjdXJyZW50UGFzc3dvcmQgKSB7XHJcbiAgICBwYXlsb2FkLmN1cnJlbnRQYXNzd29yZCA9IENyeXB0b1NoYTI1NiggY3VycmVudFBhc3N3b3JkICkudG9TdHJpbmcoIENyeXB0b0VuY0hleCApO1xyXG4gIH1cclxuICBpZiAoIG5ld1Bhc3N3b3JkICkge1xyXG4gICAgcGF5bG9hZC5wYXNzd29yZCA9IENyeXB0b1NoYTI1NiggbmV3UGFzc3dvcmQgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICk7XHJcbiAgfVxyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIGNvcmUucmVxdWVzdCggJ1BVVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvdXNlcicsIHBheWxvYWQgKS50aGVuKFxyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgdGhlIHN0cnVjdHVyZSBvZiB0aGUgcmVzcG9uc2UsIGFuZCBpZiBpbnZhbGlkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhXHJcbiAgICAgIC8vIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBpcyBtYWxmb3JtZWQuXHJcbiAgICAgIGlmICggdHlwZW9mKCBkYXRhICkgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIGNvcmUucmVqZWN0KCBcIlNhdmUgVXNlclwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk1BTEZPUk1FRF9SRVNQT05TRSApICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB1cGRhdGluZyB0aGUgdXNlciBwcm9maWxlIGlzIHN1Y2Nlc3NmdWwsIHVwZGF0ZSB0aGUgdW5jaGFuZ2VkIHVzZXIgdG8gbWF0Y2ggYW5kXHJcbiAgICAgIC8vIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS51bmNoYW5nZWRVc2VyID0gSlNPTi5zdHJpbmdpZnkoIGNvcmUudXNlciApO1xyXG4gICAgICBjb3JlLnJlc29sdmUoIFwiU2F2ZSBVc2VyXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiB1cGRhdGluZyB0aGUgdXNlciBwcm9maWxlIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdC5cclxuICAgICAgY29yZS5yZWplY3QoIFwiU2F2ZSBVc2VyXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICApO1xyXG5cclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIHZlcmlmeUVtYWlsXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgdmVyaWZ5RW1haWwgW1BVVF1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gbWFyayBhIHVzZXIncyBhY2NvdW50IGhhcyBoYXZpbmcgYSB2ZXJpZmllZCBlbWFpbCBhZGRyZXNzXHJcbiAqICAgICAgICAgICAgICAgIGJ5IGxvb2tpbmcgdXAgdGhlaXIgYWNjb3VudCB1c2luZyB0aGUgcHJvdmlkZWQgYWNjb3VudCB2ZXJpZmljYXRpb24gaGFzaCB0aGF0XHJcbiAqICAgICAgICAgICAgICAgIHdhcyBzZW50IHRvIHRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGhhc2ggICAgIFRoZSBoYXNoIHN0cmluZyB0aGF0IHdhcyBzZW50IHRvIHRoZSB1c2VyIGluIHRoZSBhY2NvdW50XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbiBlbWFpbC5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdmVyaWZ5RW1haWwoIGFwaVVybCwgaGFzaCApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBCdWlsZCB0aGUgcmVxdWVzdCBwYXlsb2FkLlxyXG4gIHZhciBwYXlsb2FkID0ge1xyXG4gICAgaGFzaDogaGFzaFxyXG4gIH07XHJcblxyXG4gIC8vIFNlbmQgdGhlIHJlcXVlc3QgYW5kIGhhbmRsZSB0aGUgcmVzcG9uc2UuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gIGNvcmUucmVxdWVzdCggJ1BVVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvdmVyaWZ5LWVtYWlsJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCAgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJWZXJpZnkgRW1haWxcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIlZlcmlmeSBFbWFpbFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgIH0sXHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3QgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJWZXJpZnkgRW1haWxcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGNvcmVcclxuICovXHJcbnZhciBRID0gcmVxdWlyZSggJy4vaW5jbHVkZS9xJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4vZXJyb3JzLmpzJyApO1xyXG5cclxuLy8gSW5jbHVkZSB0aGUgc2VuZFJlcXVlc3QgZnVuY3Rpb24gaW1wb3J0IGFzIGFuIGV4cG9ydFxyXG5leHBvcnRzLnNlbmRSZXF1ZXN0ID0gcmVxdWlyZSggJy4vcGx1Z2lucy9EZWZhdWx0LmpzJyApO1xyXG5cclxuLy8gQ29uZmlndXJlIFEgdG8gcHJvdmlkZSBwcm9taXNlIHN0YWNrIHRyYWNlcyBpbiBmdWxsLlxyXG5RLmxvbmdTdGFja1N1cHBvcnQgPSB0cnVlO1xyXG5cclxuKCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy9cclxuICAvLyBQcm9wZXJ0aWVzIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8qKlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQHByb3BlcnR5IHtTdHJpbmd9IEFVVEhfQ09PS0lFX05BTUUgIFRoZSBuYW1lIG9mIHRoZSBCcmlkZ2UgYXV0aGVudGljYXRpb24gY29va2llIGluIHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicm93c2VyJ3MgY29va2llIHN0b3JlLlxyXG4gICAqL1xyXG4gIHZhciBBVVRIX0NPT0tJRV9OQU1FID0gJ0JyaWRnZUF1dGgnO1xyXG5cclxuICAvKipcclxuICAgKiBAcHVibGljXHJcbiAgICogQHByb3BlcnR5IHtCb29sZWFufSAgZGVidWcgIEEgZmxhZyB0byBlbmFibGUgZXh0cmEgY29uc29sZSBsb2dnaW5nIGZvciBkZWJ1Z2dpbmcgcHVycG9zZXMuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5kZWJ1ZyA9IGZhbHNlO1xyXG5cclxuICAvKipcclxuICAgKiBAcHVibGljXHJcbiAgICogQHByb3BlcnR5IHtCb29sZWFufSAgaXNBdXRoZW50aWNhdGVkICBXaGV0aGVyIG9yIG5vdCB0aGUgY3VycmVudCBzZXNzaW9uIGhhcyBiZWVuXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGVkIGJ5IHRoZSBBUEkgc2VydmVyLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuaXNBdXRoZW50aWNhdGVkID0gZmFsc2U7XHJcblxyXG4gIC8qKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKiBAcHJvcGVydHkge0Jvb2xlYW59ICByZW1lbWJlck1lICBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciBzZWxlY3RlZCB0aGUgcmVtZW1iZXIgbWUgb3B0aW9uLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucmVtZW1iZXJNZSA9IGZhbHNlO1xyXG5cclxuICAvKipcclxuICAgKiBAcHVibGljXHJcbiAgICogQHByb3BlcnR5IHtTdHJpbmd9ICB1bmNoYW5nZWRVc2VyICBUaGUgSlNPTi5zdHJpbmdpZnkoKWVkIHVzZXIgcHJvZmlsZSBvYmplY3QgYXMgaXQgd2FzIHdoZW4gaXRcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdhcyBzZXQgYnkgYSBjYWxsIHRvIGdldFVzZXJQcm9maWxlKCkuXHJcbiAgICovXHJcbiAgZXhwb3J0cy51bmNoYW5nZWRVc2VyID0gJyc7XHJcblxyXG4gIC8qKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKiBAcHJvcGVydHkge1VzZXJ9ICB1c2VyICBUaGUgdXNlciBwcm9maWxlIG9iamVjdCB0aGF0IGlzIG1vZGlmaWFibGUgYnkgdXNlcnMgb2YgQnJpZGdlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMudXNlciA9IG51bGw7XHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gSGVscGVyIEZ1bmN0aW9ucyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIGlzVXNlckxvZ2dlZEluXHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gICBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IGEgdXNlciBpcyBsb2dnZWQgaW4gYnkgY2hlY2tpbmcgZmlyc3QsIGlmIHRoZXJlIGlzIGFuXHJcbiAgICogICAgICAgICAgICAgICAgZXhpc3RpbmcgYXV0aGVudGljYXRpb24gY29va2llIGZvciB0aGUgc2Vzc2lvbiBhbmQgaW4gdGhlIHVzZXIgb2JqZWN0IGlzIHNldC5cclxuICAgKlxyXG4gICAqIEByZXR1cm4gICAgICAgIHtCb29sZWFufSBXaGV0aGVyIG9yIG5vdCBhIHVzZXIgb2JqZWN0IGV4aXN0cyBhbmQgaXMgYXV0aGVudGljYXRlZC5cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuaXNVc2VyTG9nZ2VkSW4gPSBmdW5jdGlvbiBpc0xvZ2dlZEluICgpIHtcclxuICAgIC8vIE5vdGU6IFVzaW5nIHRlcm5hcnkgaGVyZSBiZWNhdXNlIGEgcmF3IEFORCByZXR1cm5zIE9iamVjdCwgc2luY2UgdGhhdCdzIHRydXRoeSBlbm91Z2guXHJcbiAgICByZXR1cm4gKCBleHBvcnRzLmlzQXV0aGVudGljYXRlZCAmJiBleHBvcnRzLnVzZXIgKSA/IHRydWUgOiBmYWxzZTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIGlzVXNlck1vZGlmaWVkXHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gICBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBjdXJyZW50IHVzZXIgcHJvZmlsZSBoYXMgYmVlbiBjaGFuZ2VkIHNpbmNlIGEgdXNlclxyXG4gICAqICAgICAgICAgICAgICAgIHByb2ZpbGUgd2FzIGxhc3QgZmV0Y2hlZCBmcm9tIHRoZSBzZXJ2ZXIuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtCb29sZWFufSBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciBwcm9maWxlIGhhcyBiZWVuIG1vZGlmaWVkIHNpbmNlIHRoYXQgbGFzdCB0aW1lIGEgdXNlclxyXG4gICAqICAgICAgICAgICAgICAgICAgIHByb2ZpbGUgd2FzIGxhc3QgZmV0Y2hlZCBmcm9tIHRoZSBzZXJ2ZXIuIFJldHVybnMgZmFsc2UgaWYgbm8gdXNlciBwcm9maWxlXHJcbiAgICogICAgICAgICAgICAgICAgICAgaGFzIGJlZW4gc2V0LlxyXG4gICAqXHJcbiAgICovXHJcbiAgZXhwb3J0cy5pc1VzZXJNb2RpZmllZCA9IGZ1bmN0aW9uIGlzVXNlck1vZGlmaWVkICgpIHtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSggZXhwb3J0cy51c2VyICkgIT09IGV4cG9ydHMudW5jaGFuZ2VkVXNlcjtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIHJlc2V0U2Vzc2lvblxyXG4gICAqXHJcbiAgICogQGRlc2NyaXB0aW9uICAgQ2xlYXJzIHRoZSBpc0F1dGhlbnRpY2F0ZWQgZmxhZywgdGhlIFwicmVtZW1iZXIgbWVcIiBmbGFnLCB0aGUgdXNlciBwcm9maWxlIG9iamVjdFxyXG4gICAqICAgICAgICAgICAgICAgIGFuZCB0aGUgdW5jaGFuZ2VkVXNlciBzdHJpbmcsIHN1Y2ggdGhhdCB0aGUgc2Vzc2lvbiBpbmZvcm1hdGlvbiBpcyBjb21wbGV0ZWx5XHJcbiAgICogICAgICAgICAgICAgICAgZm9yZ290dGVuIGJ5IHRoZSBCcmlkZ2UgY2xpZW50IGFuZCBpdCBiZWxpZXZlcyB0aGF0IGl0IGlzIG5vdCBhdXRoZW50aWNhdGVkIGFuZFxyXG4gICAqICAgICAgICAgICAgICAgIGhhcyBubyB1c2VyIGluZm8uIFRoZSBicm93c2VyIHdpbGwgc3RpbGwgaG9sZCB0aGUgYXV0aGVudGljYXRpb24gY29va2llIGluIGl0c1xyXG4gICAqICAgICAgICAgICAgICAgIGNvb2tpZSBzdG9yZSwgaG93ZXZlciwgc28gdGhlIGFwcCBpcyBzdGlsbCBhdXRoZW50aWNhdGVkIGlmIHRoaXMgaXMgY2FsbGVkXHJcbiAgICogICAgICAgICAgICAgICAgd2l0aG91dCBtYWtpbmcgYSBkZWF1dGhlbnRpY2F0ZSgpIGNhbGwgZmlyc3QgKHR5cGljYWxseSB0aGlzIGlzIGNhbGxlZCBieVxyXG4gICAqICAgICAgICAgICAgICAgIGRlYXV0aGVudGljYXRlKCkgdG8gY2xlYXIgdGhlIHNlc3Npb24gYWZ0ZXIgY2xlYXJpbmcgdGhlIGF1dGggY29va2llKS5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge3VuZGVmaW5lZH1cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucmVzZXRTZXNzaW9uID0gZnVuY3Rpb24gcmVzZXRTZXNzaW9uICgpIHtcclxuICAgIGV4cG9ydHMuaXNBdXRoZW50aWNhdGVkID0gZmFsc2U7XHJcbiAgICBleHBvcnRzLnJlbWVtYmVyTWUgPSBmYWxzZTtcclxuICAgIGV4cG9ydHMudXNlciA9IG51bGw7XHJcbiAgICBleHBvcnRzLnVuY2hhbmdlZFVzZXIgPSAnJztcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIHN0cmlwVHJhaWxpbmdTbGFzaFxyXG4gICAqXHJcbiAgICogQGRlc2NyaXB0aW9uICAgUmVtb3ZlcyBhIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggZnJvbSB0aGUgcHJvdmlkZWQgc3RyaW5nLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7U3RyaW5nfSBzdHIgICBBIHN0cmluZyB0aGF0IG1heSBoYXZlIGEgdHJhaWxpbmcgZm9yd2FyZCBzbGFzaC5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgVGhlIHNhbWUgYXMgdGhlIGlucHV0LCBidXQgaGF2aW5nIG5vIHRyYWlsaW5nIGZvcndhcmQtc2xhc2guXHJcbiAgICpcclxuICAgKi9cclxuICBleHBvcnRzLnN0cmlwVHJhaWxpbmdTbGFzaCA9IGZ1bmN0aW9uIHN0cmlwVHJhaWxpbmdTbGFzaCAoIHN0ciApIHtcclxuICAgIC8vIE5vdGU6IFN0cmluZy5zdWJzdHIoKSBiZWhhdmVzIGRpZmZlcmVudGx5IGZyb20gU3RyaW5nLnN1YnN0cmluZygpIGhlcmUhIERvbid0IGNoYW5nZSB0aGlzIVxyXG4gICAgcmV0dXJuICggc3RyLnN1YnN0ciggLTEgKSA9PT0gJy8nICkgPyBzdHIuc3Vic3RyKCAwLCBzdHIubGVuZ3RoIC0gMSApIDogc3RyO1xyXG4gIH07XHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vIFJlcXVlc3RzIC8vXHJcbiAgLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvKipcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAY2FsbGJhY2sgICAgICBvblJlcXVlc3RDYWxsZWRcclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgIEEgZnVuY3Rpb24gY2FsbGJhY2sgdGhhdCBjYW4gYmUgdXNlZCB0byBtb2RpZnkgcmVxdWVzdHMgYmVmb3JlIHRoZXkgYXJlIHNlbnQgYnlcclxuICAgKiAgICAgICAgICAgICAgICBCcmlkZ2UuIE92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gd2l0aCB5b3VyIG93biBpbXBsZW1lbnRhdGlvbiB0byBoYXZlIGl0IGJlIGNhbGxlZFxyXG4gICAqICAgICAgICAgICAgICAgIGJlZm9yZSBlYWNoIHJlcXVlc3QgdG8gdGhlIEFQSS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IG1ldGhvZCAgICAgVGhlIEhUVFAgdmVyYi9hY3Rpb24gdG8gdXNlIGZvciB0aGUgcmVxdWVzdC5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IHVybCAgICAgICAgVGhlIHJlc291cmNlIGF0IHRoZSBiYXNlIEFQSSBVUkwgdG8gcXVlcnkuIFRoZSBiYXNlIEFQSVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVVJMIChiYXNlVXJsKSBpcyBwcmVwZW5kZWQgdG8gdGhpcyBzdHJpbmcuIFRoZSBzcGVjaWZpZWRcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlIHNob3VsZCBOT1QgaGF2ZSBhIGxlYWRpbmcgc2xhc2gsIGFzIGJhc2VVcmwgaXNcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkIHRvIGhhdmUgYSB0cmFpbGluZyBzbGFzaC5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAgICAgICAgIHtPYmplY3R9IGRhdGEgICAgICAgVGhlIGRhdGEgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdC4gVGhpcyBjYW4gYmUgdXNlZFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZGVzY3JpYmUgcXVlcnkgYXJndW1lbnRzIHN1Y2ggYXMgZmlsdGVycyBhbmQgb3JkZXJpbmcsIG9yXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBjb250YWluIGRhdGEgdG8gYmUgc3RvcmVkIGluIHRoZSBCcmlkZ2UgZGF0YWJhc2UuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHt1bmRlZmluZWR9XHJcbiAgICpcclxuICAgKi9cclxuICBleHBvcnRzLm9uUmVxdWVzdENhbGxlZCA9IGZ1bmN0aW9uIG9uUmVxdWVzdENhbGxlZCAoIG1ldGhvZCwgdXJsLCBkYXRhICkge1xyXG4gICAgLy8gRG8gbm90aGluZyB1bnRpbCBvdmVycmlkZGVuIGJ5IGFuIGltcGxlbWVudG9yXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICpcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAZnVuY3Rpb24gICAgIHJlc29sdmVcclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgUmVzb2x2ZXMgdGhlIHByb3ZpZGVkIGRlZmVycmVkIGFuZCByZXR1cm5zIHRoZSBwcm92aWRlZCBkYXRhLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7U3RyaW5nfSBuYW1lICAgICAgICBBbiBpZGVudGlmaWVyIHRvIHVzZSB3aGVuIHByaW50aW5nIGRlYnVnIGluZm9ybWF0aW9uLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7RGVmZXJyZWR9IGRlZmVycmVkICBUaGUgUSBkZWZlcnJlZCBvYmplY3QgdG8gcmVzb2x2ZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge09iamVjdH0gZGF0YSAgICAgICAgVGhlIG9iamVjdCB0byByZXR1cm4gd2l0aCB0aGUgcmVzb2x1dGlvbi5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge3VuZGVmaW5lZH1cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uIHJlc29sdmUgKCBuYW1lLCBkZWZlcnJlZCwgZGF0YSApIHtcclxuICAgIGlmICggZXhwb3J0cy5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgY29uc29sZS5sb2coIFwiQlJJREdFIHwgXCIgKyBuYW1lICsgXCIgfCBcIiArIEpTT04uc3RyaW5naWZ5KCBkYXRhICkgKTtcclxuICAgIH1cclxuICAgIGRlZmVycmVkLnJlc29sdmUoIGRhdGEgKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgcmVqZWN0XHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gIFJlamVjdHMgdGhlIHByb3ZpZGVkIGRlZmVycmVkIGFuZCByZXR1cm5zIHRoZSBwcm92aWRlZCBkYXRhLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7U3RyaW5nfSBuYW1lICAgICAgICBBbiBpZGVudGlmaWVyIHRvIHVzZSB3aGVuIHByaW50aW5nIGRlYnVnIGluZm9ybWF0aW9uLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7RGVmZXJyZWR9IGRlZmVycmVkICBUaGUgUSBkZWZlcnJlZCBvYmplY3QgdG8gcmVzb2x2ZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge09iamVjdH0gZXJyb3IgICAgICAgVGhlIG9iamVjdCB0byByZXR1cm4gd2l0aCB0aGUgcmVqZWN0aW9uLlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7dW5kZWZpbmVkfVxyXG4gICAqXHJcbiAgICovXHJcbiAgZXhwb3J0cy5yZWplY3QgPSBmdW5jdGlvbiByZWplY3QgKCBuYW1lLCBkZWZlcnJlZCwgZXJyb3IgKSB7XHJcbiAgICBpZiAoIGV4cG9ydHMuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgXCIgKyBuYW1lICsgXCIgfCBcIiArIGVycm9yLnN0YXR1cyArIFwiID4+IENvZGUgXCIgKyBlcnJvci5lcnJvckNvZGUgK1xyXG4gICAgICAgIFwiOiBcIiArIGVycm9ycy5nZXRFeHBsYW5hdGlvbiggZXJyb3IuZXJyb3JDb2RlICkgKTtcclxuICAgIH1cclxuICAgIGRlZmVycmVkLnJlamVjdCggZXJyb3IgKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIHJlcXVlc3RcclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgIFNlbmRzIGFuIFhIUiByZXF1ZXN0IHVzaW5nIHRoZSBjcmVhdGVSZXF1ZXN0KCkgZnVuY3Rpb24uIFRoZSBtZXNzYWdlIHBheWxvYWQgaXNcclxuICAgKiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSgpZWQgYW5kIHBhY2thZ2VkIGludG8gYW4gSFRUUCBoZWFkZXIgY2FsbGVkIFwiQnJpZGdlXCIuIFRoZSBjb29raWVcclxuICAgKiAgICAgICAgICAgICAgICB0byB1c2UgZm9yIGF1dGhlbnRpY2F0aW9uIG9uIHRoZSBzZXJ2ZXIgaXMga2VwdCBpbiBhbiBIVFRQIGhlYWRlciBjYWxsZWQgXCJBdXRoXCIuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBtZXRob2QgICAgIFRoZSBIVFRQIHZlcmIvYWN0aW9uIHRvIHVzZSBmb3IgdGhlIHJlcXVlc3QuIENhcGl0YWxpemF0aW9uXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2Vzbid0IG1hdHRlciBhcyBpdCB3aWxsIGJlIGNhcGl0YWxpemVkIGF1dG9tYXRpY2FsbHkuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSB1cmwgICAgICAgIFRoZSBleGFjdCBVUkwgb2YgdGhlIHJlc291cmNlIHRvIHF1ZXJ5LlxyXG4gICAqXHJcbiAgICogQHBhcmFtICAgICAgICAge09iamVjdH0gZGF0YSAgICAgICBUaGUgZGF0YSBvYmplY3QgdG8gc2VuZCB3aXRoIHRoZSByZXF1ZXN0LiBUaGlzIGNhbiBiZSB1c2VkXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBkZXNjcmliZSBxdWVyeSBhcmd1bWVudHMgc3VjaCBhcyBmaWx0ZXJzIGFuZCBvcmRlcmluZywgb3JcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGNvbnRhaW4gZGF0YSB0byBiZSBzdG9yZWQgaW4gdGhlIEJyaWRnZSBkYXRhYmFzZS5cclxuICAgKlxyXG4gICAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gICAqXHJcbiAgICovXHJcbiAgZXhwb3J0cy5yZXF1ZXN0ID0gZnVuY3Rpb24gcmVxdWVzdCAoIG1ldGhvZCwgdXJsLCBkYXRhICkge1xyXG5cclxuICAgIC8vIENhbGwgdGhlIG9uUmVxdWVzdENhbGxlZCBjYWxsYmFjaywgaWYgb25lIGlzIHJlZ2lzdGVyZWQuXHJcbiAgICBpZiAoIGV4cG9ydHMub25SZXF1ZXN0Q2FsbGVkICkge1xyXG4gICAgICBleHBvcnRzLm9uUmVxdWVzdENhbGxlZCggbWV0aG9kLCB1cmwsIGRhdGEgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDYWxsIHNlbmRSZXF1ZXN0KCkgdG8gaGFuZGxlIHRoZSBYSFIgaW4gd2hhdGV2ZXIgd2F5IGl0IGhhcyBiZWVuIGNvbmZpZ3VyZWQgdG8uXHJcbiAgICAvLyBOb3RlOiBDcmVhdGluZyAyIGRlZmVycmVkIG9iamVjdHMgaGVyZTogMSBmb3IgdGhpcywgMSBmb3Igc2VuZFJlcXVlc3QuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgICBleHBvcnRzLnNlbmRSZXF1ZXN0KCBRLmRlZmVyKCksIG1ldGhvZC50b1VwcGVyQ2FzZSgpLCB1cmwsIGRhdGEgKS50aGVuKFxyXG5cclxuICAgICAgLy8gUmVxdWVzdCB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZvcm1hdCBpcyB2YWxpZCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9iamVjdC5cclxuICAgICAgICBleHBvcnRzLnJlc29sdmUoIFwiUmVxdWVzdFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgfSxcclxuICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgICAvLyBSZXF1ZXN0IHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgICBleHBvcnRzLnJlamVjdCggXCJSZXF1ZXN0XCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgICAgfVxyXG4gICAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxuICB9O1xyXG5cclxufSApKCk7XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICBlcnJvcnNcclxuICovXHJcblxyXG4vKipcclxuICogQHB1YmxpY1xyXG4gKiBAY29uc3RhbnQgICAgICBFUlJPUl9DT0RFX01BTEZPUk1FRF9SRVNQT05TRVxyXG4gKiBAZGVzY3JpcHRpb24gICBBbiBlcnJvciBjb2RlIGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgcmV0dXJuZWQgZnJvbSB0aGUgc2VydmVyIGlzIGVpdGhlciB0aGVcclxuICogICAgICAgICAgICAgICAgd3JvbmcgZGF0YSB0eXBlIG9yIGlzIGZvcm1hdHRlZCBpbmNvcnJlY3RseS5cclxuICogQHR5cGUgICAgICAgICAge051bWJlcn1cclxuICovXHJcbmV4cG9ydHMuTUFMRk9STUVEX1JFU1BPTlNFID0gMTAxO1xyXG5cclxuLyoqXHJcbiAqIEBwdWJsaWNcclxuICogQGNvbnN0YW50ICAgICAgRVJST1JfQ09ERV9ORVRXT1JLX0VSUk9SXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFuIGVycm9yIGNvZGUgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBmYWlsZWQgZHVlIHRvIGFuIGVycm9yIGF0IHRoZSBuZXR3b3JrXHJcbiAqICAgICAgICAgICAgICAgIGxldmVsLCBidXQgd2FzIG5vdCBhIHRpbWVvdXQuXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLk5FVFdPUktfRVJST1IgPSAxMDI7XHJcblxyXG4vKipcclxuICogQHB1YmxpY1xyXG4gKiBAY29uc3RhbnQgICAgICBSRVFVRVNUX1RJTUVPVVRcclxuICogQGRlc2NyaXB0aW9uICAgQW4gZXJyb3IgY29kZSBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGRpZCBub3QgZ2V0IGEgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyXHJcbiAqICAgICAgICAgICAgICAgIHdpdGhpbiB0aGUgWEhSJ3MgdGltZW91dCBwZXJpb2QuXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLlJFUVVFU1RfVElNRU9VVCA9IDEwMztcclxuXHJcbi8qKlxyXG4gKiBAcHVibGljXHJcbiAqIEBjb25zdGFudCAgICAgIE5PX1VTRVJfUFJPRklMRVxyXG4gKiBAZGVzY3JpcHRpb24gICBBbiBlcnJvciBjb2RlIGluZGljYXRpbmcgdGhhdCBubyB1c2VyIHByb2ZpbGUgaXMgc2V0LCBtZWFuaW5nIHRoYXQgbWFueSBjb21tYW5kc1xyXG4gKiAgICAgICAgICAgICAgICB3aWxsIGJlIHVuYWJsZSB0byBnZXQgYWNjZXNzIHRvIHRoZSBpbmZvcm1hdGlvbiB0aGV5IG5lZWQgdG8gZnVuY3Rpb24uXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLk5PX1VTRVJfUFJPRklMRSA9IDEwNDtcclxuXHJcbi8qKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAZW51bSBFWFBMQU5BVElPTlNcclxuICogQGRlc2NyaXB0aW9uICAgQSBtYXAgb2YgZXJyb3IgY29kZXMgKGtleXMpIHRvIGVycm9yIGNvZGUgZXhwbGFuYXRpb25zICh2YWx1ZXMpLlxyXG4gKiBAdHlwZSB7TWFwfVxyXG4gKi9cclxudmFyIEVYUExBTkFUSU9OUyA9IHtcclxuICAxOiBcIlRoZSByZXF1ZXN0IHNlbnQgdG8gdGhlIHNlcnZlciB3YXMgYmFkbHkgZm9ybWVkLiBFbnN1cmUgdGhhdCB5b3VyIEJyaWRnZSBDbGllbnQgYW5kIEJyaWRnZSBTZXJ2ZXIgdmVyc2lvbnMgbWF0Y2guXCIsXHJcbiAgMjogXCJUaGUgc2VydmVyIGVuY291bnRlcmVkIGFuIGVycm9yIHdoaWxlIHF1ZXJ5aW5nIHRoZSBkYXRhYmFzZS4gRW5zdXJlIHRoYXQgeW91ciBkYXRhYmFzZSBzZXJ2ZXIgaXMgcnVubmluZy5cIixcclxuICAzOiBcIkEgdXNlciBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQgd2l0aCB0aGlzIGVtYWlsIGFjY291bnQuXCIsXHJcbiAgNDogXCJUaGUgc2VydmVyIHJlamVjdGVkIGFuIGFub255bW91cyByZXF1ZXN0IGJlY2F1c2UgaXQgbWF5IGhhdmUgYmVlbiB0ZW1wZXJlZCB3aXRoIG9yIGludGVyY2VwdGVkLlwiLFxyXG4gIDU6IFwiVGhlIHN1cHBsaWVkIHBhc3N3b3JkIGlzIGluY29ycmVjdC5cIixcclxuICA2OiBcIllvdXIgZW1haWwgYWNjb3VudCBoYXMgbm90IHlldCBiZWVuIHZlcmlmaWVkLiBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCBhbmQgY29tcGxldGUgdGhlIHJlZ2lzdHJhdGlvbiBwcm9jZXNzLlwiLFxyXG4gIDc6IFwiVGhlIHN1cHBsaWVkIGVtYWlsIGFkZHJlc3MgaXMgaW52YWxpZC5cIixcclxuICA4OiBcIlRoZSBzdXBwbGllZCBmaXJzdCBuYW1lIGlzIGludmFsaWQgKG11c3QgYmUgYXQgbGVhc3QgMiBjaGFyYWN0ZXJzIGluIGxlbmd0aClcIixcclxuICA5OiBcIlRoZSBITUFDIHNlY3VyaXR5IHNpZ25hdHVyZSBzdXBwbGllZCB3aXRoIHRoaXMgcmVxdWVzdCB3YXMgYmFkbHkgZm9ybWVkLlwiLFxyXG4gIDEwOiBcIlRoZSBzdXBwbGllZCBsYXN0IG5hbWUgaXMgaW52YWxpZCAobXVzdCBiZSBhdCBsZWFzdCAyIGNoYXJhY3RlcnMgaW4gbGVuZ3RoKVwiLFxyXG4gIDExOiBcIlRoZSBTSEEtMjU2IGhhc2hlZCBwYXNzd29yZCBzdXBwbGllZCB3aXRoIHRoaXMgcmVxdWVzdCB3YXMgYmFkbHkgZm9ybWVkLiBUaGlzIGRvZXMgTk9UIG1lYW4gdGhhdCB5b3VyIHBhc3N3b3JkIGlzIGludmFsaWQsIGJ1dCB0aGF0IGFuIGludGVybmFsIGVycm9yIG9jY3VycmVkLlwiLFxyXG4gIDEyOiBcIlRoZSB0aW1lIHN1cHBsaWVkIHdpdGggdGhpcyByZXF1ZXN0IHdhcyBiYWRseSBmb3JtZWQgKG11c3QgYmUgaW4gSVNPIGZvcm1hdClcIixcclxuICAxMzogXCJUaGUgdXNlciBoYXNoIHN1cHBsaWVkIHdpdGggdGhpcyByZXF1ZXN0IHdhcyBiYWRseSBmb3JtZWQuXCIsXHJcbiAgMTQ6IFwiVGhlIHJlcXVlc3RlZCBhY3Rpb24gcmVxdWlyZXMgdGhhdCB5b3UgYmUgbG9nZ2VkIGluIGFzIGEgcmVnaXN0ZXJlZCB1c2VyLlwiLFxyXG4gIDE1OiBcIlRoZSByZXF1ZXN0IGZhaWxlZCBiZWNhdXNlIGEgQnJpZGdlIFNlcnZlciBleHRlbnNpb24gaGFzIGNhbGxlZCBhIHNlcnZpY2UgbW9kdWxlIGJlZm9yZSBCcmlkZ2UgY291bGQgdmFsaWRhdGUgdGhlIHJlcXVlc3QgKHRvbyBlYXJseSBpbiBtaWRkbGV3YXJlIGNoYWluKS5cIixcclxuICAxNjogXCJUaGUgc3VwcGxpZWQgYXBwbGljYXRpb24gZGF0YSBvYmplY3QgY291bGQgbm90IGJlIHBhcnNlZCBhcyB2YWxpZCBKU09OLlwiLFxyXG4gIDE3OiBcIlRoZSB1c2VyIHdpdGggdGhlIHN1cHBsaWVkIGVtYWlsIHdhcyBub3QgZm91bmQgaW4gdGhlIGRhdGFiYXNlLlwiLFxyXG4gIDE4OiBcIkFuIHVua25vd24gZXJyb3Igb2NjdXJyZWQgaW4gdGhlIHNlcnZlci4gUGxlYXNlIGNvbnRhY3QgdGhlIHNlcnZlciBhZG1pbmlzdHJhdG9yLlwiLFxyXG4gIDE5OiBcIlRoZSByZXF1ZXN0IHNlbnQgdG8gdGhlIHNlcnZlciBkaWQgbm90IGNvbnRhaW4gdGhlIFxcXCJCcmlkZ2VcXFwiIGhlYWRlciwgYW5kIGNvdWxkIG5vdCBiZSBhdXRoZW50aWNhdGVkLlwiLFxyXG4gIDIwOiBcIlRoZSBCcmlkZ2UgaGVhZGVyIG9mIHRoZSByZXF1ZXN0IGNvdWxkIG5vdCBiZSBwYXJzZWQgYXMgdmFsaWQgSlNPTi5cIixcclxuICAyMTogXCJUaGUgcmVxdWVzdCBjYW5ub3QgYmUgY29tcGxldGVkIGJlY2F1c2UgdGhpcyB1c2VyIGlzIG5vdCBhdXRob3JpemVkIHRvIHBlcmZvcm0gdGhpcyBhY3Rpb24uXCIsXHJcbiAgMjI6IFwiVGhlIHJlcXVlc3RlZCBjb250ZW50IGNhbm5vdCBiZSBhY2Nlc3NlZCBhbm9ueW1vdXNseS4gUGxlYXNlIGxvZ2luIHRvIGEgdmFsaWQgdXNlciBhY2NvdW50LlwiLFxyXG4gIDIzOiBcIlRoZSByZXF1ZXN0IHdhcyBiYWRseSBmb3JtZWQuXCIsXHJcbiAgMjQ6IFwiVGhpcyByZXF1ZXN0IG11c3QgYmUgcGVyZm9ybWVkIGFub255bW91c2x5LiBQbGVhc2UgbG9nIG91dCBhbmQgdHJ5IGFnYWluLlwiLFxyXG4gIDEwMTogXCJUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIHdhcyBiYWRseSBmb3JtZWQuIEVuc3VyZSB0aGF0IHlvdXIgQnJpZGdlIENsaWVudCBhbmQgQnJpZGdlIFNlcnZlciB2ZXJzaW9ucyBtYXRjaC5cIixcclxuICAxMDI6IFwiVGhlIHJlc3BvbnNlIGZhaWxlZCBvciB3YXMgaW5jb21wbGV0ZSBkdWUgdG8gYSBuZXR3b3JrIGVycm9yLlwiLFxyXG4gIDEwMzogXCJUaGUgc2VydmVyIGRpZCBub3QgcmVzcG9uZC4gQ2hlY2sgeW91ciBpbnRlcm5ldCBjb25uZWN0aW9uIGFuZCBjb25maXJtIHRoYXQgeW91ciBCcmlkZ2UgU2VydmVyIGlzIHJ1bm5pbmcuXCIsXHJcbiAgMTA0OiBcIk5vIHVzZXIgcHJvZmlsZSBpcyBjdXJyZW50bHkgbG9hZGVkLiBZb3UgbXVzdCBsb2dpbiBiZWZvcmUgeW91IGNhbiBjb250aW51ZS5cIlxyXG59O1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgZ2V0RXhwbGFuYXRpb25cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgUmV0dXJucyBhIHN0cmluZyBpbnRlcnByZXRhdGlvbiBvZiB0aGUgZXJyb3IgY29kZSwgdGFyZ2V0ZWQgYXQgZXhwbGFpbmluZ1xyXG4gKiAgICAgICAgICAgICAgICB0aGUgbmF0dXJlIG9mIHRoZSBlcnJvciB0byB0aGUgZW5kLWRldmVsb3Blci4gSXQgaXMgYWR2aXNlZCB0aGF0IHRoZXNlIGVycm9yc1xyXG4gKiAgICAgICAgICAgICAgICBiZSByZS1pbnRlcnByZXRlZCBmb3IgdGhlIHVzZXIgYnkgdGhlIGltcGxlbWVudGluZyBhcHBsaWNhdGlvbi5cclxuICpcclxuICogQHBhcmFtICB7TnVtYmVyfSBlcnJvckNvZGUgICBUaGUgaW50ZWdlci12YWx1ZWQgZXJyb3IgY29kZSB0byBpbnRlcnByZXQuXHJcbiAqXHJcbiAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICAgQSBzdHJpbmcgaW50ZXJwcmV0YXRpb24gb2YgdGhlIGVycm9yIGNvZGUuXHJcbiAqXHJcbiAqL1xyXG5leHBvcnRzLmdldEV4cGxhbmF0aW9uID0gZnVuY3Rpb24gZ2V0RXhwbGFuYXRpb24oIGVycm9yQ29kZSApIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgcmV0dXJuIEVYUExBTkFUSU9OU1sgZXJyb3JDb2RlIF0gfHxcclxuICAgIFwiVW5rbm93biBlcnJvci4gWW91IG1heSBuZWVkIHRvIHVwZGF0ZSB5b3VyIEJyaWRnZSBDbGllbnQgYW5kL29yIEJyaWRnZSBTZXJ2ZXIgdmVyc2lvbi5cIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBjb25zdHJ1Y3RvciAgIEJyaWRnZUVycm9yXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIFRoZSBCcmlkZ2VFcnJvciBjb25zdHJ1Y3RvciBjcmVhdGVzIGEgbmV3IEJyaWRnZUVycm9yIGluc3RhbmNlIGFuZCByZXR1cm5zIGl0LiBUaGVcclxuICogICAgICAgICAgICAgICAgY2FsbGVyIGlzIGV4cGVjdGVkIHRvIHByZWNlZGUgdGhlIGNhbGwgd2l0aCB0aGUgXCJuZXdcIiBrZXl3b3JkLlxyXG4gKlxyXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGVycm9yQ29kZSAgIFRoZSBpbnRlZ2VyLXZhbHVlZCBlcnJvciBjb2RlIHRvIGludGVycHJldC5cclxuICpcclxuICogQHJldHVybiB7QnJpZGdlRXJyb3J9ICAgICAgICBBIEJyaWRnZUVycm9yIG9iamVjdC5cclxuICpcclxuICovXHJcbmV4cG9ydHMuQnJpZGdlRXJyb3IgPSBmdW5jdGlvbiBCcmlkZ2VFcnJvciggZXJyb3JDb2RlICkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuICB0aGlzLnN0YXR1cyA9IDIwMDtcclxuICB0aGlzLmVycm9yQ29kZSA9IGVycm9yQ29kZTtcclxuICB0aGlzLm1lc3NhZ2UgPSBleHBvcnRzLmdldEV4cGxhbmF0aW9uKCBlcnJvckNvZGUgKTtcclxufTtcclxuIiwiOyhmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcblx0XHQvLyBDb21tb25KU1xuXHRcdG1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0fVxuXHRlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIEFNRFxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ly8gR2xvYmFsIChicm93c2VyKVxuXHRcdHJvb3QuQ3J5cHRvSlMgPSBmYWN0b3J5KCk7XG5cdH1cbn0odGhpcywgZnVuY3Rpb24gKCkge1xuXG5cdC8qKlxuXHQgKiBDcnlwdG9KUyBjb3JlIGNvbXBvbmVudHMuXG5cdCAqL1xuXHR2YXIgQ3J5cHRvSlMgPSBDcnlwdG9KUyB8fCAoZnVuY3Rpb24gKE1hdGgsIHVuZGVmaW5lZCkge1xuXHQgICAgLyoqXG5cdCAgICAgKiBDcnlwdG9KUyBuYW1lc3BhY2UuXG5cdCAgICAgKi9cblx0ICAgIHZhciBDID0ge307XG5cblx0ICAgIC8qKlxuXHQgICAgICogTGlicmFyeSBuYW1lc3BhY2UuXG5cdCAgICAgKi9cblx0ICAgIHZhciBDX2xpYiA9IEMubGliID0ge307XG5cblx0ICAgIC8qKlxuXHQgICAgICogQmFzZSBvYmplY3QgZm9yIHByb3RvdHlwYWwgaW5oZXJpdGFuY2UuXG5cdCAgICAgKi9cblx0ICAgIHZhciBCYXNlID0gQ19saWIuQmFzZSA9IChmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgZnVuY3Rpb24gRigpIHt9XG5cblx0ICAgICAgICByZXR1cm4ge1xuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBvYmplY3QgdGhhdCBpbmhlcml0cyBmcm9tIHRoaXMgb2JqZWN0LlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3ZlcnJpZGVzIFByb3BlcnRpZXMgdG8gY29weSBpbnRvIHRoZSBuZXcgb2JqZWN0LlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBuZXcgb2JqZWN0LlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqICAgICB2YXIgTXlUeXBlID0gQ3J5cHRvSlMubGliLkJhc2UuZXh0ZW5kKHtcblx0ICAgICAgICAgICAgICogICAgICAgICBmaWVsZDogJ3ZhbHVlJyxcblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogICAgICAgICBtZXRob2Q6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgICogICAgICAgICB9XG5cdCAgICAgICAgICAgICAqICAgICB9KTtcblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIGV4dGVuZDogZnVuY3Rpb24gKG92ZXJyaWRlcykge1xuXHQgICAgICAgICAgICAgICAgLy8gU3Bhd25cblx0ICAgICAgICAgICAgICAgIEYucHJvdG90eXBlID0gdGhpcztcblx0ICAgICAgICAgICAgICAgIHZhciBzdWJ0eXBlID0gbmV3IEYoKTtcblxuXHQgICAgICAgICAgICAgICAgLy8gQXVnbWVudFxuXHQgICAgICAgICAgICAgICAgaWYgKG92ZXJyaWRlcykge1xuXHQgICAgICAgICAgICAgICAgICAgIHN1YnR5cGUubWl4SW4ob3ZlcnJpZGVzKTtcblx0ICAgICAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGRlZmF1bHQgaW5pdGlhbGl6ZXJcblx0ICAgICAgICAgICAgICAgIGlmICghc3VidHlwZS5oYXNPd25Qcm9wZXJ0eSgnaW5pdCcpKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgc3VidHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICBzdWJ0eXBlLiRzdXBlci5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdCAgICAgICAgICAgICAgICAgICAgfTtcblx0ICAgICAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZXIncyBwcm90b3R5cGUgaXMgdGhlIHN1YnR5cGUgb2JqZWN0XG5cdCAgICAgICAgICAgICAgICBzdWJ0eXBlLmluaXQucHJvdG90eXBlID0gc3VidHlwZTtcblxuXHQgICAgICAgICAgICAgICAgLy8gUmVmZXJlbmNlIHN1cGVydHlwZVxuXHQgICAgICAgICAgICAgICAgc3VidHlwZS4kc3VwZXIgPSB0aGlzO1xuXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gc3VidHlwZTtcblx0ICAgICAgICAgICAgfSxcblxuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogRXh0ZW5kcyB0aGlzIG9iamVjdCBhbmQgcnVucyB0aGUgaW5pdCBtZXRob2QuXG5cdCAgICAgICAgICAgICAqIEFyZ3VtZW50cyB0byBjcmVhdGUoKSB3aWxsIGJlIHBhc3NlZCB0byBpbml0KCkuXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIG5ldyBvYmplY3QuXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqIEBzdGF0aWNcblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogICAgIHZhciBpbnN0YW5jZSA9IE15VHlwZS5jcmVhdGUoKTtcblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlID0gdGhpcy5leHRlbmQoKTtcblx0ICAgICAgICAgICAgICAgIGluc3RhbmNlLmluaXQuYXBwbHkoaW5zdGFuY2UsIGFyZ3VtZW50cyk7XG5cblx0ICAgICAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZTtcblx0ICAgICAgICAgICAgfSxcblxuXHQgICAgICAgICAgICAvKipcblx0ICAgICAgICAgICAgICogSW5pdGlhbGl6ZXMgYSBuZXdseSBjcmVhdGVkIG9iamVjdC5cblx0ICAgICAgICAgICAgICogT3ZlcnJpZGUgdGhpcyBtZXRob2QgdG8gYWRkIHNvbWUgbG9naWMgd2hlbiB5b3VyIG9iamVjdHMgYXJlIGNyZWF0ZWQuXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqICAgICB2YXIgTXlUeXBlID0gQ3J5cHRvSlMubGliLkJhc2UuZXh0ZW5kKHtcblx0ICAgICAgICAgICAgICogICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAqICAgICAgICAgICAgIC8vIC4uLlxuXHQgICAgICAgICAgICAgKiAgICAgICAgIH1cblx0ICAgICAgICAgICAgICogICAgIH0pO1xuXHQgICAgICAgICAgICAgKi9cblx0ICAgICAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICB9LFxuXG5cdCAgICAgICAgICAgIC8qKlxuXHQgICAgICAgICAgICAgKiBDb3BpZXMgcHJvcGVydGllcyBpbnRvIHRoaXMgb2JqZWN0LlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gcHJvcGVydGllcyBUaGUgcHJvcGVydGllcyB0byBtaXggaW4uXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICAgICAqXG5cdCAgICAgICAgICAgICAqICAgICBNeVR5cGUubWl4SW4oe1xuXHQgICAgICAgICAgICAgKiAgICAgICAgIGZpZWxkOiAndmFsdWUnXG5cdCAgICAgICAgICAgICAqICAgICB9KTtcblx0ICAgICAgICAgICAgICovXG5cdCAgICAgICAgICAgIG1peEluOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xuXHQgICAgICAgICAgICAgICAgZm9yICh2YXIgcHJvcGVydHlOYW1lIGluIHByb3BlcnRpZXMpIHtcblx0ICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcHJvcGVydHlOYW1lXSA9IHByb3BlcnRpZXNbcHJvcGVydHlOYW1lXTtcblx0ICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgIC8vIElFIHdvbid0IGNvcHkgdG9TdHJpbmcgdXNpbmcgdGhlIGxvb3AgYWJvdmVcblx0ICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KCd0b1N0cmluZycpKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdGhpcy50b1N0cmluZyA9IHByb3BlcnRpZXMudG9TdHJpbmc7XG5cdCAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIH0sXG5cblx0ICAgICAgICAgICAgLyoqXG5cdCAgICAgICAgICAgICAqIENyZWF0ZXMgYSBjb3B5IG9mIHRoaXMgb2JqZWN0LlxuXHQgICAgICAgICAgICAgKlxuXHQgICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBjbG9uZS5cblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgICAgICpcblx0ICAgICAgICAgICAgICogICAgIHZhciBjbG9uZSA9IGluc3RhbmNlLmNsb25lKCk7XG5cdCAgICAgICAgICAgICAqL1xuXHQgICAgICAgICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdC5wcm90b3R5cGUuZXh0ZW5kKHRoaXMpO1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfTtcblx0ICAgIH0oKSk7XG5cblx0ICAgIC8qKlxuXHQgICAgICogQW4gYXJyYXkgb2YgMzItYml0IHdvcmRzLlxuXHQgICAgICpcblx0ICAgICAqIEBwcm9wZXJ0eSB7QXJyYXl9IHdvcmRzIFRoZSBhcnJheSBvZiAzMi1iaXQgd29yZHMuXG5cdCAgICAgKiBAcHJvcGVydHkge251bWJlcn0gc2lnQnl0ZXMgVGhlIG51bWJlciBvZiBzaWduaWZpY2FudCBieXRlcyBpbiB0aGlzIHdvcmQgYXJyYXkuXG5cdCAgICAgKi9cblx0ICAgIHZhciBXb3JkQXJyYXkgPSBDX2xpYi5Xb3JkQXJyYXkgPSBCYXNlLmV4dGVuZCh7XG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogSW5pdGlhbGl6ZXMgYSBuZXdseSBjcmVhdGVkIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB3b3JkcyAoT3B0aW9uYWwpIEFuIGFycmF5IG9mIDMyLWJpdCB3b3Jkcy5cblx0ICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gc2lnQnl0ZXMgKE9wdGlvbmFsKSBUaGUgbnVtYmVyIG9mIHNpZ25pZmljYW50IGJ5dGVzIGluIHRoZSB3b3Jkcy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmxpYi5Xb3JkQXJyYXkuY3JlYXRlKCk7XG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5saWIuV29yZEFycmF5LmNyZWF0ZShbMHgwMDAxMDIwMywgMHgwNDA1MDYwN10pO1xuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMubGliLldvcmRBcnJheS5jcmVhdGUoWzB4MDAwMTAyMDMsIDB4MDQwNTA2MDddLCA2KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBpbml0OiBmdW5jdGlvbiAod29yZHMsIHNpZ0J5dGVzKSB7XG5cdCAgICAgICAgICAgIHdvcmRzID0gdGhpcy53b3JkcyA9IHdvcmRzIHx8IFtdO1xuXG5cdCAgICAgICAgICAgIGlmIChzaWdCeXRlcyAhPSB1bmRlZmluZWQpIHtcblx0ICAgICAgICAgICAgICAgIHRoaXMuc2lnQnl0ZXMgPSBzaWdCeXRlcztcblx0ICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgIHRoaXMuc2lnQnl0ZXMgPSB3b3Jkcy5sZW5ndGggKiA0O1xuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENvbnZlcnRzIHRoaXMgd29yZCBhcnJheSB0byBhIHN0cmluZy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7RW5jb2Rlcn0gZW5jb2RlciAoT3B0aW9uYWwpIFRoZSBlbmNvZGluZyBzdHJhdGVneSB0byB1c2UuIERlZmF1bHQ6IENyeXB0b0pTLmVuYy5IZXhcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIHN0cmluZ2lmaWVkIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBzdHJpbmcgPSB3b3JkQXJyYXkgKyAnJztcblx0ICAgICAgICAgKiAgICAgdmFyIHN0cmluZyA9IHdvcmRBcnJheS50b1N0cmluZygpO1xuXHQgICAgICAgICAqICAgICB2YXIgc3RyaW5nID0gd29yZEFycmF5LnRvU3RyaW5nKENyeXB0b0pTLmVuYy5VdGY4KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKGVuY29kZXIpIHtcblx0ICAgICAgICAgICAgcmV0dXJuIChlbmNvZGVyIHx8IEhleCkuc3RyaW5naWZ5KHRoaXMpO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBDb25jYXRlbmF0ZXMgYSB3b3JkIGFycmF5IHRvIHRoaXMgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fSB3b3JkQXJyYXkgVGhlIHdvcmQgYXJyYXkgdG8gYXBwZW5kLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGlzIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHdvcmRBcnJheTEuY29uY2F0KHdvcmRBcnJheTIpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIGNvbmNhdDogZnVuY3Rpb24gKHdvcmRBcnJheSkge1xuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcblx0ICAgICAgICAgICAgdmFyIHRoaXNXb3JkcyA9IHRoaXMud29yZHM7XG5cdCAgICAgICAgICAgIHZhciB0aGF0V29yZHMgPSB3b3JkQXJyYXkud29yZHM7XG5cdCAgICAgICAgICAgIHZhciB0aGlzU2lnQnl0ZXMgPSB0aGlzLnNpZ0J5dGVzO1xuXHQgICAgICAgICAgICB2YXIgdGhhdFNpZ0J5dGVzID0gd29yZEFycmF5LnNpZ0J5dGVzO1xuXG5cdCAgICAgICAgICAgIC8vIENsYW1wIGV4Y2VzcyBiaXRzXG5cdCAgICAgICAgICAgIHRoaXMuY2xhbXAoKTtcblxuXHQgICAgICAgICAgICAvLyBDb25jYXRcblx0ICAgICAgICAgICAgaWYgKHRoaXNTaWdCeXRlcyAlIDQpIHtcblx0ICAgICAgICAgICAgICAgIC8vIENvcHkgb25lIGJ5dGUgYXQgYSB0aW1lXG5cdCAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoYXRTaWdCeXRlczsgaSsrKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIHRoYXRCeXRlID0gKHRoYXRXb3Jkc1tpID4+PiAyXSA+Pj4gKDI0IC0gKGkgJSA0KSAqIDgpKSAmIDB4ZmY7XG5cdCAgICAgICAgICAgICAgICAgICAgdGhpc1dvcmRzWyh0aGlzU2lnQnl0ZXMgKyBpKSA+Pj4gMl0gfD0gdGhhdEJ5dGUgPDwgKDI0IC0gKCh0aGlzU2lnQnl0ZXMgKyBpKSAlIDQpICogOCk7XG5cdCAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIH0gZWxzZSBpZiAodGhhdFdvcmRzLmxlbmd0aCA+IDB4ZmZmZikge1xuXHQgICAgICAgICAgICAgICAgLy8gQ29weSBvbmUgd29yZCBhdCBhIHRpbWVcblx0ICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhhdFNpZ0J5dGVzOyBpICs9IDQpIHtcblx0ICAgICAgICAgICAgICAgICAgICB0aGlzV29yZHNbKHRoaXNTaWdCeXRlcyArIGkpID4+PiAyXSA9IHRoYXRXb3Jkc1tpID4+PiAyXTtcblx0ICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgIC8vIENvcHkgYWxsIHdvcmRzIGF0IG9uY2Vcblx0ICAgICAgICAgICAgICAgIHRoaXNXb3Jkcy5wdXNoLmFwcGx5KHRoaXNXb3JkcywgdGhhdFdvcmRzKTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB0aGlzLnNpZ0J5dGVzICs9IHRoYXRTaWdCeXRlcztcblxuXHQgICAgICAgICAgICAvLyBDaGFpbmFibGVcblx0ICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIFJlbW92ZXMgaW5zaWduaWZpY2FudCBiaXRzLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB3b3JkQXJyYXkuY2xhbXAoKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBjbGFtcDogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gdGhpcy53b3Jkcztcblx0ICAgICAgICAgICAgdmFyIHNpZ0J5dGVzID0gdGhpcy5zaWdCeXRlcztcblxuXHQgICAgICAgICAgICAvLyBDbGFtcFxuXHQgICAgICAgICAgICB3b3Jkc1tzaWdCeXRlcyA+Pj4gMl0gJj0gMHhmZmZmZmZmZiA8PCAoMzIgLSAoc2lnQnl0ZXMgJSA0KSAqIDgpO1xuXHQgICAgICAgICAgICB3b3Jkcy5sZW5ndGggPSBNYXRoLmNlaWwoc2lnQnl0ZXMgLyA0KTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ3JlYXRlcyBhIGNvcHkgb2YgdGhpcyB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgY2xvbmUuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBjbG9uZSA9IHdvcmRBcnJheS5jbG9uZSgpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgIHZhciBjbG9uZSA9IEJhc2UuY2xvbmUuY2FsbCh0aGlzKTtcblx0ICAgICAgICAgICAgY2xvbmUud29yZHMgPSB0aGlzLndvcmRzLnNsaWNlKDApO1xuXG5cdCAgICAgICAgICAgIHJldHVybiBjbG9uZTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ3JlYXRlcyBhIHdvcmQgYXJyYXkgZmlsbGVkIHdpdGggcmFuZG9tIGJ5dGVzLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IG5CeXRlcyBUaGUgbnVtYmVyIG9mIHJhbmRvbSBieXRlcyB0byBnZW5lcmF0ZS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHJhbmRvbSB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHN0YXRpY1xuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMubGliLldvcmRBcnJheS5yYW5kb20oMTYpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIHJhbmRvbTogZnVuY3Rpb24gKG5CeXRlcykge1xuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSBbXTtcblxuXHQgICAgICAgICAgICB2YXIgciA9IChmdW5jdGlvbiAobV93KSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgbV93ID0gbV93O1xuXHQgICAgICAgICAgICAgICAgdmFyIG1feiA9IDB4M2FkZTY4YjE7XG5cdCAgICAgICAgICAgICAgICB2YXIgbWFzayA9IDB4ZmZmZmZmZmY7XG5cblx0ICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgbV96ID0gKDB4OTA2OSAqIChtX3ogJiAweEZGRkYpICsgKG1feiA+PiAweDEwKSkgJiBtYXNrO1xuXHQgICAgICAgICAgICAgICAgICAgIG1fdyA9ICgweDQ2NTAgKiAobV93ICYgMHhGRkZGKSArIChtX3cgPj4gMHgxMCkpICYgbWFzaztcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gKChtX3ogPDwgMHgxMCkgKyBtX3cpICYgbWFzaztcblx0ICAgICAgICAgICAgICAgICAgICByZXN1bHQgLz0gMHgxMDAwMDAwMDA7XG5cdCAgICAgICAgICAgICAgICAgICAgcmVzdWx0ICs9IDAuNTtcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0ICogKE1hdGgucmFuZG9tKCkgPiAuNSA/IDEgOiAtMSk7XG5cdCAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgIH0pO1xuXG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCByY2FjaGU7IGkgPCBuQnl0ZXM7IGkgKz0gNCkge1xuXHQgICAgICAgICAgICAgICAgdmFyIF9yID0gcigocmNhY2hlIHx8IE1hdGgucmFuZG9tKCkpICogMHgxMDAwMDAwMDApO1xuXG5cdCAgICAgICAgICAgICAgICByY2FjaGUgPSBfcigpICogMHgzYWRlNjdiNztcblx0ICAgICAgICAgICAgICAgIHdvcmRzLnB1c2goKF9yKCkgKiAweDEwMDAwMDAwMCkgfCAwKTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIHJldHVybiBuZXcgV29yZEFycmF5LmluaXQod29yZHMsIG5CeXRlcyk7XG5cdCAgICAgICAgfVxuXHQgICAgfSk7XG5cblx0ICAgIC8qKlxuXHQgICAgICogRW5jb2RlciBuYW1lc3BhY2UuXG5cdCAgICAgKi9cblx0ICAgIHZhciBDX2VuYyA9IEMuZW5jID0ge307XG5cblx0ICAgIC8qKlxuXHQgICAgICogSGV4IGVuY29kaW5nIHN0cmF0ZWd5LlxuXHQgICAgICovXG5cdCAgICB2YXIgSGV4ID0gQ19lbmMuSGV4ID0ge1xuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgd29yZCBhcnJheSB0byBhIGhleCBzdHJpbmcuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheX0gd29yZEFycmF5IFRoZSB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgaGV4IHN0cmluZy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBzdGF0aWNcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgdmFyIGhleFN0cmluZyA9IENyeXB0b0pTLmVuYy5IZXguc3RyaW5naWZ5KHdvcmRBcnJheSk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgc3RyaW5naWZ5OiBmdW5jdGlvbiAod29yZEFycmF5KSB7XG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSB3b3JkQXJyYXkud29yZHM7XG5cdCAgICAgICAgICAgIHZhciBzaWdCeXRlcyA9IHdvcmRBcnJheS5zaWdCeXRlcztcblxuXHQgICAgICAgICAgICAvLyBDb252ZXJ0XG5cdCAgICAgICAgICAgIHZhciBoZXhDaGFycyA9IFtdO1xuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpZ0J5dGVzOyBpKyspIHtcblx0ICAgICAgICAgICAgICAgIHZhciBiaXRlID0gKHdvcmRzW2kgPj4+IDJdID4+PiAoMjQgLSAoaSAlIDQpICogOCkpICYgMHhmZjtcblx0ICAgICAgICAgICAgICAgIGhleENoYXJzLnB1c2goKGJpdGUgPj4+IDQpLnRvU3RyaW5nKDE2KSk7XG5cdCAgICAgICAgICAgICAgICBoZXhDaGFycy5wdXNoKChiaXRlICYgMHgwZikudG9TdHJpbmcoMTYpKTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIHJldHVybiBoZXhDaGFycy5qb2luKCcnKTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ29udmVydHMgYSBoZXggc3RyaW5nIHRvIGEgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoZXhTdHIgVGhlIGhleCBzdHJpbmcuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHN0YXRpY1xuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMuZW5jLkhleC5wYXJzZShoZXhTdHJpbmcpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIHBhcnNlOiBmdW5jdGlvbiAoaGV4U3RyKSB7XG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0XG5cdCAgICAgICAgICAgIHZhciBoZXhTdHJMZW5ndGggPSBoZXhTdHIubGVuZ3RoO1xuXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnRcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gW107XG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaGV4U3RyTGVuZ3RoOyBpICs9IDIpIHtcblx0ICAgICAgICAgICAgICAgIHdvcmRzW2kgPj4+IDNdIHw9IHBhcnNlSW50KGhleFN0ci5zdWJzdHIoaSwgMiksIDE2KSA8PCAoMjQgLSAoaSAlIDgpICogNCk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRBcnJheS5pbml0KHdvcmRzLCBoZXhTdHJMZW5ndGggLyAyKTtcblx0ICAgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICAvKipcblx0ICAgICAqIExhdGluMSBlbmNvZGluZyBzdHJhdGVneS5cblx0ICAgICAqL1xuXHQgICAgdmFyIExhdGluMSA9IENfZW5jLkxhdGluMSA9IHtcblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIHdvcmQgYXJyYXkgdG8gYSBMYXRpbjEgc3RyaW5nLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl9IHdvcmRBcnJheSBUaGUgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIExhdGluMSBzdHJpbmcuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBsYXRpbjFTdHJpbmcgPSBDcnlwdG9KUy5lbmMuTGF0aW4xLnN0cmluZ2lmeSh3b3JkQXJyYXkpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIHN0cmluZ2lmeTogZnVuY3Rpb24gKHdvcmRBcnJheSkge1xuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gd29yZEFycmF5LndvcmRzO1xuXHQgICAgICAgICAgICB2YXIgc2lnQnl0ZXMgPSB3b3JkQXJyYXkuc2lnQnl0ZXM7XG5cblx0ICAgICAgICAgICAgLy8gQ29udmVydFxuXHQgICAgICAgICAgICB2YXIgbGF0aW4xQ2hhcnMgPSBbXTtcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWdCeXRlczsgaSsrKSB7XG5cdCAgICAgICAgICAgICAgICB2YXIgYml0ZSA9ICh3b3Jkc1tpID4+PiAyXSA+Pj4gKDI0IC0gKGkgJSA0KSAqIDgpKSAmIDB4ZmY7XG5cdCAgICAgICAgICAgICAgICBsYXRpbjFDaGFycy5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoYml0ZSkpO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgcmV0dXJuIGxhdGluMUNoYXJzLmpvaW4oJycpO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIExhdGluMSBzdHJpbmcgdG8gYSB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGxhdGluMVN0ciBUaGUgTGF0aW4xIHN0cmluZy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5lbmMuTGF0aW4xLnBhcnNlKGxhdGluMVN0cmluZyk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgcGFyc2U6IGZ1bmN0aW9uIChsYXRpbjFTdHIpIHtcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRcblx0ICAgICAgICAgICAgdmFyIGxhdGluMVN0ckxlbmd0aCA9IGxhdGluMVN0ci5sZW5ndGg7XG5cblx0ICAgICAgICAgICAgLy8gQ29udmVydFxuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSBbXTtcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXRpbjFTdHJMZW5ndGg7IGkrKykge1xuXHQgICAgICAgICAgICAgICAgd29yZHNbaSA+Pj4gMl0gfD0gKGxhdGluMVN0ci5jaGFyQ29kZUF0KGkpICYgMHhmZikgPDwgKDI0IC0gKGkgJSA0KSAqIDgpO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkQXJyYXkuaW5pdCh3b3JkcywgbGF0aW4xU3RyTGVuZ3RoKTtcblx0ICAgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICAvKipcblx0ICAgICAqIFVURi04IGVuY29kaW5nIHN0cmF0ZWd5LlxuXHQgICAgICovXG5cdCAgICB2YXIgVXRmOCA9IENfZW5jLlV0ZjggPSB7XG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ29udmVydHMgYSB3b3JkIGFycmF5IHRvIGEgVVRGLTggc3RyaW5nLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl9IHdvcmRBcnJheSBUaGUgd29yZCBhcnJheS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIFVURi04IHN0cmluZy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBzdGF0aWNcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgdmFyIHV0ZjhTdHJpbmcgPSBDcnlwdG9KUy5lbmMuVXRmOC5zdHJpbmdpZnkod29yZEFycmF5KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBzdHJpbmdpZnk6IGZ1bmN0aW9uICh3b3JkQXJyYXkpIHtcblx0ICAgICAgICAgICAgdHJ5IHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKExhdGluMS5zdHJpbmdpZnkod29yZEFycmF5KSkpO1xuXHQgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG5cdCAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01hbGZvcm1lZCBVVEYtOCBkYXRhJyk7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ29udmVydHMgYSBVVEYtOCBzdHJpbmcgdG8gYSB3b3JkIGFycmF5LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHV0ZjhTdHIgVGhlIFVURi04IHN0cmluZy5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHdvcmQgYXJyYXkuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5lbmMuVXRmOC5wYXJzZSh1dGY4U3RyaW5nKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBwYXJzZTogZnVuY3Rpb24gKHV0ZjhTdHIpIHtcblx0ICAgICAgICAgICAgcmV0dXJuIExhdGluMS5wYXJzZSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQodXRmOFN0cikpKTtcblx0ICAgICAgICB9XG5cdCAgICB9O1xuXG5cdCAgICAvKipcblx0ICAgICAqIEFic3RyYWN0IGJ1ZmZlcmVkIGJsb2NrIGFsZ29yaXRobSB0ZW1wbGF0ZS5cblx0ICAgICAqXG5cdCAgICAgKiBUaGUgcHJvcGVydHkgYmxvY2tTaXplIG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gYSBjb25jcmV0ZSBzdWJ0eXBlLlxuXHQgICAgICpcblx0ICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBfbWluQnVmZmVyU2l6ZSBUaGUgbnVtYmVyIG9mIGJsb2NrcyB0aGF0IHNob3VsZCBiZSBrZXB0IHVucHJvY2Vzc2VkIGluIHRoZSBidWZmZXIuIERlZmF1bHQ6IDBcblx0ICAgICAqL1xuXHQgICAgdmFyIEJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0gPSBDX2xpYi5CdWZmZXJlZEJsb2NrQWxnb3JpdGhtID0gQmFzZS5leHRlbmQoe1xuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIFJlc2V0cyB0aGlzIGJsb2NrIGFsZ29yaXRobSdzIGRhdGEgYnVmZmVyIHRvIGl0cyBpbml0aWFsIHN0YXRlLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLnJlc2V0KCk7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgLy8gSW5pdGlhbCB2YWx1ZXNcblx0ICAgICAgICAgICAgdGhpcy5fZGF0YSA9IG5ldyBXb3JkQXJyYXkuaW5pdCgpO1xuXHQgICAgICAgICAgICB0aGlzLl9uRGF0YUJ5dGVzID0gMDtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQWRkcyBuZXcgZGF0YSB0byB0aGlzIGJsb2NrIGFsZ29yaXRobSdzIGJ1ZmZlci5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gZGF0YSBUaGUgZGF0YSB0byBhcHBlbmQuIFN0cmluZ3MgYXJlIGNvbnZlcnRlZCB0byBhIFdvcmRBcnJheSB1c2luZyBVVEYtOC5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5fYXBwZW5kKCdkYXRhJyk7XG5cdCAgICAgICAgICogICAgIGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uX2FwcGVuZCh3b3JkQXJyYXkpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIF9hcHBlbmQ6IGZ1bmN0aW9uIChkYXRhKSB7XG5cdCAgICAgICAgICAgIC8vIENvbnZlcnQgc3RyaW5nIHRvIFdvcmRBcnJheSwgZWxzZSBhc3N1bWUgV29yZEFycmF5IGFscmVhZHlcblx0ICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09ICdzdHJpbmcnKSB7XG5cdCAgICAgICAgICAgICAgICBkYXRhID0gVXRmOC5wYXJzZShkYXRhKTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIC8vIEFwcGVuZFxuXHQgICAgICAgICAgICB0aGlzLl9kYXRhLmNvbmNhdChkYXRhKTtcblx0ICAgICAgICAgICAgdGhpcy5fbkRhdGFCeXRlcyArPSBkYXRhLnNpZ0J5dGVzO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBQcm9jZXNzZXMgYXZhaWxhYmxlIGRhdGEgYmxvY2tzLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogVGhpcyBtZXRob2QgaW52b2tlcyBfZG9Qcm9jZXNzQmxvY2sob2Zmc2V0KSwgd2hpY2ggbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBhIGNvbmNyZXRlIHN1YnR5cGUuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGRvRmx1c2ggV2hldGhlciBhbGwgYmxvY2tzIGFuZCBwYXJ0aWFsIGJsb2NrcyBzaG91bGQgYmUgcHJvY2Vzc2VkLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgcHJvY2Vzc2VkIGRhdGEuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBwcm9jZXNzZWREYXRhID0gYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5fcHJvY2VzcygpO1xuXHQgICAgICAgICAqICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9IGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uX3Byb2Nlc3MoISEnZmx1c2gnKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBfcHJvY2VzczogZnVuY3Rpb24gKGRvRmx1c2gpIHtcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXG5cdCAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YTtcblx0ICAgICAgICAgICAgdmFyIGRhdGFXb3JkcyA9IGRhdGEud29yZHM7XG5cdCAgICAgICAgICAgIHZhciBkYXRhU2lnQnl0ZXMgPSBkYXRhLnNpZ0J5dGVzO1xuXHQgICAgICAgICAgICB2YXIgYmxvY2tTaXplID0gdGhpcy5ibG9ja1NpemU7XG5cdCAgICAgICAgICAgIHZhciBibG9ja1NpemVCeXRlcyA9IGJsb2NrU2l6ZSAqIDQ7XG5cblx0ICAgICAgICAgICAgLy8gQ291bnQgYmxvY2tzIHJlYWR5XG5cdCAgICAgICAgICAgIHZhciBuQmxvY2tzUmVhZHkgPSBkYXRhU2lnQnl0ZXMgLyBibG9ja1NpemVCeXRlcztcblx0ICAgICAgICAgICAgaWYgKGRvRmx1c2gpIHtcblx0ICAgICAgICAgICAgICAgIC8vIFJvdW5kIHVwIHRvIGluY2x1ZGUgcGFydGlhbCBibG9ja3Ncblx0ICAgICAgICAgICAgICAgIG5CbG9ja3NSZWFkeSA9IE1hdGguY2VpbChuQmxvY2tzUmVhZHkpO1xuXHQgICAgICAgICAgICB9IGVsc2Uge1xuXHQgICAgICAgICAgICAgICAgLy8gUm91bmQgZG93biB0byBpbmNsdWRlIG9ubHkgZnVsbCBibG9ja3MsXG5cdCAgICAgICAgICAgICAgICAvLyBsZXNzIHRoZSBudW1iZXIgb2YgYmxvY2tzIHRoYXQgbXVzdCByZW1haW4gaW4gdGhlIGJ1ZmZlclxuXHQgICAgICAgICAgICAgICAgbkJsb2Nrc1JlYWR5ID0gTWF0aC5tYXgoKG5CbG9ja3NSZWFkeSB8IDApIC0gdGhpcy5fbWluQnVmZmVyU2l6ZSwgMCk7XG5cdCAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAvLyBDb3VudCB3b3JkcyByZWFkeVxuXHQgICAgICAgICAgICB2YXIgbldvcmRzUmVhZHkgPSBuQmxvY2tzUmVhZHkgKiBibG9ja1NpemU7XG5cblx0ICAgICAgICAgICAgLy8gQ291bnQgYnl0ZXMgcmVhZHlcblx0ICAgICAgICAgICAgdmFyIG5CeXRlc1JlYWR5ID0gTWF0aC5taW4obldvcmRzUmVhZHkgKiA0LCBkYXRhU2lnQnl0ZXMpO1xuXG5cdCAgICAgICAgICAgIC8vIFByb2Nlc3MgYmxvY2tzXG5cdCAgICAgICAgICAgIGlmIChuV29yZHNSZWFkeSkge1xuXHQgICAgICAgICAgICAgICAgZm9yICh2YXIgb2Zmc2V0ID0gMDsgb2Zmc2V0IDwgbldvcmRzUmVhZHk7IG9mZnNldCArPSBibG9ja1NpemUpIHtcblx0ICAgICAgICAgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbmNyZXRlLWFsZ29yaXRobSBsb2dpY1xuXHQgICAgICAgICAgICAgICAgICAgIHRoaXMuX2RvUHJvY2Vzc0Jsb2NrKGRhdGFXb3Jkcywgb2Zmc2V0KTtcblx0ICAgICAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHByb2Nlc3NlZCB3b3Jkc1xuXHQgICAgICAgICAgICAgICAgdmFyIHByb2Nlc3NlZFdvcmRzID0gZGF0YVdvcmRzLnNwbGljZSgwLCBuV29yZHNSZWFkeSk7XG5cdCAgICAgICAgICAgICAgICBkYXRhLnNpZ0J5dGVzIC09IG5CeXRlc1JlYWR5O1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgLy8gUmV0dXJuIHByb2Nlc3NlZCB3b3Jkc1xuXHQgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRBcnJheS5pbml0KHByb2Nlc3NlZFdvcmRzLCBuQnl0ZXNSZWFkeSk7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENyZWF0ZXMgYSBjb3B5IG9mIHRoaXMgb2JqZWN0LlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgY2xvbmUuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBjbG9uZSA9IGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uY2xvbmUoKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICB2YXIgY2xvbmUgPSBCYXNlLmNsb25lLmNhbGwodGhpcyk7XG5cdCAgICAgICAgICAgIGNsb25lLl9kYXRhID0gdGhpcy5fZGF0YS5jbG9uZSgpO1xuXG5cdCAgICAgICAgICAgIHJldHVybiBjbG9uZTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgX21pbkJ1ZmZlclNpemU6IDBcblx0ICAgIH0pO1xuXG5cdCAgICAvKipcblx0ICAgICAqIEFic3RyYWN0IGhhc2hlciB0ZW1wbGF0ZS5cblx0ICAgICAqXG5cdCAgICAgKiBAcHJvcGVydHkge251bWJlcn0gYmxvY2tTaXplIFRoZSBudW1iZXIgb2YgMzItYml0IHdvcmRzIHRoaXMgaGFzaGVyIG9wZXJhdGVzIG9uLiBEZWZhdWx0OiAxNiAoNTEyIGJpdHMpXG5cdCAgICAgKi9cblx0ICAgIHZhciBIYXNoZXIgPSBDX2xpYi5IYXNoZXIgPSBCdWZmZXJlZEJsb2NrQWxnb3JpdGhtLmV4dGVuZCh7XG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ29uZmlndXJhdGlvbiBvcHRpb25zLlxuXHQgICAgICAgICAqL1xuXHQgICAgICAgIGNmZzogQmFzZS5leHRlbmQoKSxcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIEluaXRpYWxpemVzIGEgbmV3bHkgY3JlYXRlZCBoYXNoZXIuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gY2ZnIChPcHRpb25hbCkgVGhlIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyB0byB1c2UgZm9yIHRoaXMgaGFzaCBjb21wdXRhdGlvbi5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgdmFyIGhhc2hlciA9IENyeXB0b0pTLmFsZ28uU0hBMjU2LmNyZWF0ZSgpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIGluaXQ6IGZ1bmN0aW9uIChjZmcpIHtcblx0ICAgICAgICAgICAgLy8gQXBwbHkgY29uZmlnIGRlZmF1bHRzXG5cdCAgICAgICAgICAgIHRoaXMuY2ZnID0gdGhpcy5jZmcuZXh0ZW5kKGNmZyk7XG5cblx0ICAgICAgICAgICAgLy8gU2V0IGluaXRpYWwgdmFsdWVzXG5cdCAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogUmVzZXRzIHRoaXMgaGFzaGVyIHRvIGl0cyBpbml0aWFsIHN0YXRlLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQGV4YW1wbGVcblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqICAgICBoYXNoZXIucmVzZXQoKTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICByZXNldDogZnVuY3Rpb24gKCkge1xuXHQgICAgICAgICAgICAvLyBSZXNldCBkYXRhIGJ1ZmZlclxuXHQgICAgICAgICAgICBCdWZmZXJlZEJsb2NrQWxnb3JpdGhtLnJlc2V0LmNhbGwodGhpcyk7XG5cblx0ICAgICAgICAgICAgLy8gUGVyZm9ybSBjb25jcmV0ZS1oYXNoZXIgbG9naWNcblx0ICAgICAgICAgICAgdGhpcy5fZG9SZXNldCgpO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICAvKipcblx0ICAgICAgICAgKiBVcGRhdGVzIHRoaXMgaGFzaGVyIHdpdGggYSBtZXNzYWdlLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlVXBkYXRlIFRoZSBtZXNzYWdlIHRvIGFwcGVuZC5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge0hhc2hlcn0gVGhpcyBoYXNoZXIuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIGhhc2hlci51cGRhdGUoJ21lc3NhZ2UnKTtcblx0ICAgICAgICAgKiAgICAgaGFzaGVyLnVwZGF0ZSh3b3JkQXJyYXkpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKG1lc3NhZ2VVcGRhdGUpIHtcblx0ICAgICAgICAgICAgLy8gQXBwZW5kXG5cdCAgICAgICAgICAgIHRoaXMuX2FwcGVuZChtZXNzYWdlVXBkYXRlKTtcblxuXHQgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGhhc2hcblx0ICAgICAgICAgICAgdGhpcy5fcHJvY2VzcygpO1xuXG5cdCAgICAgICAgICAgIC8vIENoYWluYWJsZVxuXHQgICAgICAgICAgICByZXR1cm4gdGhpcztcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogRmluYWxpemVzIHRoZSBoYXNoIGNvbXB1dGF0aW9uLlxuXHQgICAgICAgICAqIE5vdGUgdGhhdCB0aGUgZmluYWxpemUgb3BlcmF0aW9uIGlzIGVmZmVjdGl2ZWx5IGEgZGVzdHJ1Y3RpdmUsIHJlYWQtb25jZSBvcGVyYXRpb24uXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IG1lc3NhZ2VVcGRhdGUgKE9wdGlvbmFsKSBBIGZpbmFsIG1lc3NhZ2UgdXBkYXRlLlxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgaGFzaC5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBleGFtcGxlXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiAgICAgdmFyIGhhc2ggPSBoYXNoZXIuZmluYWxpemUoKTtcblx0ICAgICAgICAgKiAgICAgdmFyIGhhc2ggPSBoYXNoZXIuZmluYWxpemUoJ21lc3NhZ2UnKTtcblx0ICAgICAgICAgKiAgICAgdmFyIGhhc2ggPSBoYXNoZXIuZmluYWxpemUod29yZEFycmF5KTtcblx0ICAgICAgICAgKi9cblx0ICAgICAgICBmaW5hbGl6ZTogZnVuY3Rpb24gKG1lc3NhZ2VVcGRhdGUpIHtcblx0ICAgICAgICAgICAgLy8gRmluYWwgbWVzc2FnZSB1cGRhdGVcblx0ICAgICAgICAgICAgaWYgKG1lc3NhZ2VVcGRhdGUpIHtcblx0ICAgICAgICAgICAgICAgIHRoaXMuX2FwcGVuZChtZXNzYWdlVXBkYXRlKTtcblx0ICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgIC8vIFBlcmZvcm0gY29uY3JldGUtaGFzaGVyIGxvZ2ljXG5cdCAgICAgICAgICAgIHZhciBoYXNoID0gdGhpcy5fZG9GaW5hbGl6ZSgpO1xuXG5cdCAgICAgICAgICAgIHJldHVybiBoYXNoO1xuXHQgICAgICAgIH0sXG5cblx0ICAgICAgICBibG9ja1NpemU6IDUxMi8zMixcblxuXHQgICAgICAgIC8qKlxuXHQgICAgICAgICAqIENyZWF0ZXMgYSBzaG9ydGN1dCBmdW5jdGlvbiB0byBhIGhhc2hlcidzIG9iamVjdCBpbnRlcmZhY2UuXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAcGFyYW0ge0hhc2hlcn0gaGFzaGVyIFRoZSBoYXNoZXIgdG8gY3JlYXRlIGEgaGVscGVyIGZvci5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgc2hvcnRjdXQgZnVuY3Rpb24uXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBTSEEyNTYgPSBDcnlwdG9KUy5saWIuSGFzaGVyLl9jcmVhdGVIZWxwZXIoQ3J5cHRvSlMuYWxnby5TSEEyNTYpO1xuXHQgICAgICAgICAqL1xuXHQgICAgICAgIF9jcmVhdGVIZWxwZXI6IGZ1bmN0aW9uIChoYXNoZXIpIHtcblx0ICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChtZXNzYWdlLCBjZmcpIHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiBuZXcgaGFzaGVyLmluaXQoY2ZnKS5maW5hbGl6ZShtZXNzYWdlKTtcblx0ICAgICAgICAgICAgfTtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgLyoqXG5cdCAgICAgICAgICogQ3JlYXRlcyBhIHNob3J0Y3V0IGZ1bmN0aW9uIHRvIHRoZSBITUFDJ3Mgb2JqZWN0IGludGVyZmFjZS5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEBwYXJhbSB7SGFzaGVyfSBoYXNoZXIgVGhlIGhhc2hlciB0byB1c2UgaW4gdGhpcyBITUFDIGhlbHBlci5cblx0ICAgICAgICAgKlxuXHQgICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgc2hvcnRjdXQgZnVuY3Rpb24uXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAc3RhdGljXG5cdCAgICAgICAgICpcblx0ICAgICAgICAgKiBAZXhhbXBsZVxuXHQgICAgICAgICAqXG5cdCAgICAgICAgICogICAgIHZhciBIbWFjU0hBMjU2ID0gQ3J5cHRvSlMubGliLkhhc2hlci5fY3JlYXRlSG1hY0hlbHBlcihDcnlwdG9KUy5hbGdvLlNIQTI1Nik7XG5cdCAgICAgICAgICovXG5cdCAgICAgICAgX2NyZWF0ZUhtYWNIZWxwZXI6IGZ1bmN0aW9uIChoYXNoZXIpIHtcblx0ICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChtZXNzYWdlLCBrZXkpIHtcblx0ICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQ19hbGdvLkhNQUMuaW5pdChoYXNoZXIsIGtleSkuZmluYWxpemUobWVzc2FnZSk7XG5cdCAgICAgICAgICAgIH07XG5cdCAgICAgICAgfVxuXHQgICAgfSk7XG5cblx0ICAgIC8qKlxuXHQgICAgICogQWxnb3JpdGhtIG5hbWVzcGFjZS5cblx0ICAgICAqL1xuXHQgICAgdmFyIENfYWxnbyA9IEMuYWxnbyA9IHt9O1xuXG5cdCAgICByZXR1cm4gQztcblx0fShNYXRoKSk7XG5cblxuXHRyZXR1cm4gQ3J5cHRvSlM7XG5cbn0pKTsiLCI7KGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuXHRcdC8vIENvbW1vbkpTXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKFwiLi9jb3JlXCIpKTtcblx0fVxuXHRlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuXHRcdC8vIEFNRFxuXHRcdGRlZmluZShbXCIuL2NvcmVcIl0sIGZhY3RvcnkpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdC8vIEdsb2JhbCAoYnJvd3Nlcilcblx0XHRmYWN0b3J5KHJvb3QuQ3J5cHRvSlMpO1xuXHR9XG59KHRoaXMsIGZ1bmN0aW9uIChDcnlwdG9KUykge1xuXG5cdHJldHVybiBDcnlwdG9KUy5lbmMuSGV4O1xuXG59KSk7IiwiOyhmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcblx0XHQvLyBDb21tb25KU1xuXHRcdG1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZShcIi4vY29yZVwiKSk7XG5cdH1cblx0ZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcblx0XHQvLyBBTURcblx0XHRkZWZpbmUoW1wiLi9jb3JlXCJdLCBmYWN0b3J5KTtcblx0fVxuXHRlbHNlIHtcblx0XHQvLyBHbG9iYWwgKGJyb3dzZXIpXG5cdFx0ZmFjdG9yeShyb290LkNyeXB0b0pTKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAoQ3J5cHRvSlMpIHtcblxuXHQoZnVuY3Rpb24gKE1hdGgpIHtcblx0ICAgIC8vIFNob3J0Y3V0c1xuXHQgICAgdmFyIEMgPSBDcnlwdG9KUztcblx0ICAgIHZhciBDX2xpYiA9IEMubGliO1xuXHQgICAgdmFyIFdvcmRBcnJheSA9IENfbGliLldvcmRBcnJheTtcblx0ICAgIHZhciBIYXNoZXIgPSBDX2xpYi5IYXNoZXI7XG5cdCAgICB2YXIgQ19hbGdvID0gQy5hbGdvO1xuXG5cdCAgICAvLyBJbml0aWFsaXphdGlvbiBhbmQgcm91bmQgY29uc3RhbnRzIHRhYmxlc1xuXHQgICAgdmFyIEggPSBbXTtcblx0ICAgIHZhciBLID0gW107XG5cblx0ICAgIC8vIENvbXB1dGUgY29uc3RhbnRzXG5cdCAgICAoZnVuY3Rpb24gKCkge1xuXHQgICAgICAgIGZ1bmN0aW9uIGlzUHJpbWUobikge1xuXHQgICAgICAgICAgICB2YXIgc3FydE4gPSBNYXRoLnNxcnQobik7XG5cdCAgICAgICAgICAgIGZvciAodmFyIGZhY3RvciA9IDI7IGZhY3RvciA8PSBzcXJ0TjsgZmFjdG9yKyspIHtcblx0ICAgICAgICAgICAgICAgIGlmICghKG4gJSBmYWN0b3IpKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuXHQgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgcmV0dXJuIHRydWU7XG5cdCAgICAgICAgfVxuXG5cdCAgICAgICAgZnVuY3Rpb24gZ2V0RnJhY3Rpb25hbEJpdHMobikge1xuXHQgICAgICAgICAgICByZXR1cm4gKChuIC0gKG4gfCAwKSkgKiAweDEwMDAwMDAwMCkgfCAwO1xuXHQgICAgICAgIH1cblxuXHQgICAgICAgIHZhciBuID0gMjtcblx0ICAgICAgICB2YXIgblByaW1lID0gMDtcblx0ICAgICAgICB3aGlsZSAoblByaW1lIDwgNjQpIHtcblx0ICAgICAgICAgICAgaWYgKGlzUHJpbWUobikpIHtcblx0ICAgICAgICAgICAgICAgIGlmIChuUHJpbWUgPCA4KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgSFtuUHJpbWVdID0gZ2V0RnJhY3Rpb25hbEJpdHMoTWF0aC5wb3cobiwgMSAvIDIpKTtcblx0ICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgIEtbblByaW1lXSA9IGdldEZyYWN0aW9uYWxCaXRzKE1hdGgucG93KG4sIDEgLyAzKSk7XG5cblx0ICAgICAgICAgICAgICAgIG5QcmltZSsrO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgbisrO1xuXHQgICAgICAgIH1cblx0ICAgIH0oKSk7XG5cblx0ICAgIC8vIFJldXNhYmxlIG9iamVjdFxuXHQgICAgdmFyIFcgPSBbXTtcblxuXHQgICAgLyoqXG5cdCAgICAgKiBTSEEtMjU2IGhhc2ggYWxnb3JpdGhtLlxuXHQgICAgICovXG5cdCAgICB2YXIgU0hBMjU2ID0gQ19hbGdvLlNIQTI1NiA9IEhhc2hlci5leHRlbmQoe1xuXHQgICAgICAgIF9kb1Jlc2V0OiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgIHRoaXMuX2hhc2ggPSBuZXcgV29yZEFycmF5LmluaXQoSC5zbGljZSgwKSk7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIF9kb1Byb2Nlc3NCbG9jazogZnVuY3Rpb24gKE0sIG9mZnNldCkge1xuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dFxuXHQgICAgICAgICAgICB2YXIgSCA9IHRoaXMuX2hhc2gud29yZHM7XG5cblx0ICAgICAgICAgICAgLy8gV29ya2luZyB2YXJpYWJsZXNcblx0ICAgICAgICAgICAgdmFyIGEgPSBIWzBdO1xuXHQgICAgICAgICAgICB2YXIgYiA9IEhbMV07XG5cdCAgICAgICAgICAgIHZhciBjID0gSFsyXTtcblx0ICAgICAgICAgICAgdmFyIGQgPSBIWzNdO1xuXHQgICAgICAgICAgICB2YXIgZSA9IEhbNF07XG5cdCAgICAgICAgICAgIHZhciBmID0gSFs1XTtcblx0ICAgICAgICAgICAgdmFyIGcgPSBIWzZdO1xuXHQgICAgICAgICAgICB2YXIgaCA9IEhbN107XG5cblx0ICAgICAgICAgICAgLy8gQ29tcHV0YXRpb25cblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XG5cdCAgICAgICAgICAgICAgICBpZiAoaSA8IDE2KSB7XG5cdCAgICAgICAgICAgICAgICAgICAgV1tpXSA9IE1bb2Zmc2V0ICsgaV0gfCAwO1xuXHQgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgZ2FtbWEweCA9IFdbaSAtIDE1XTtcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgZ2FtbWEwICA9ICgoZ2FtbWEweCA8PCAyNSkgfCAoZ2FtbWEweCA+Pj4gNykpICBeXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKGdhbW1hMHggPDwgMTQpIHwgKGdhbW1hMHggPj4+IDE4KSkgXlxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChnYW1tYTB4ID4+PiAzKTtcblxuXHQgICAgICAgICAgICAgICAgICAgIHZhciBnYW1tYTF4ID0gV1tpIC0gMl07XG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGdhbW1hMSAgPSAoKGdhbW1hMXggPDwgMTUpIHwgKGdhbW1hMXggPj4+IDE3KSkgXlxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKChnYW1tYTF4IDw8IDEzKSB8IChnYW1tYTF4ID4+PiAxOSkpIF5cblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZ2FtbWExeCA+Pj4gMTApO1xuXG5cdCAgICAgICAgICAgICAgICAgICAgV1tpXSA9IGdhbW1hMCArIFdbaSAtIDddICsgZ2FtbWExICsgV1tpIC0gMTZdO1xuXHQgICAgICAgICAgICAgICAgfVxuXG5cdCAgICAgICAgICAgICAgICB2YXIgY2ggID0gKGUgJiBmKSBeICh+ZSAmIGcpO1xuXHQgICAgICAgICAgICAgICAgdmFyIG1haiA9IChhICYgYikgXiAoYSAmIGMpIF4gKGIgJiBjKTtcblxuXHQgICAgICAgICAgICAgICAgdmFyIHNpZ21hMCA9ICgoYSA8PCAzMCkgfCAoYSA+Pj4gMikpIF4gKChhIDw8IDE5KSB8IChhID4+PiAxMykpIF4gKChhIDw8IDEwKSB8IChhID4+PiAyMikpO1xuXHQgICAgICAgICAgICAgICAgdmFyIHNpZ21hMSA9ICgoZSA8PCAyNikgfCAoZSA+Pj4gNikpIF4gKChlIDw8IDIxKSB8IChlID4+PiAxMSkpIF4gKChlIDw8IDcpICB8IChlID4+PiAyNSkpO1xuXG5cdCAgICAgICAgICAgICAgICB2YXIgdDEgPSBoICsgc2lnbWExICsgY2ggKyBLW2ldICsgV1tpXTtcblx0ICAgICAgICAgICAgICAgIHZhciB0MiA9IHNpZ21hMCArIG1hajtcblxuXHQgICAgICAgICAgICAgICAgaCA9IGc7XG5cdCAgICAgICAgICAgICAgICBnID0gZjtcblx0ICAgICAgICAgICAgICAgIGYgPSBlO1xuXHQgICAgICAgICAgICAgICAgZSA9IChkICsgdDEpIHwgMDtcblx0ICAgICAgICAgICAgICAgIGQgPSBjO1xuXHQgICAgICAgICAgICAgICAgYyA9IGI7XG5cdCAgICAgICAgICAgICAgICBiID0gYTtcblx0ICAgICAgICAgICAgICAgIGEgPSAodDEgKyB0MikgfCAwO1xuXHQgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgLy8gSW50ZXJtZWRpYXRlIGhhc2ggdmFsdWVcblx0ICAgICAgICAgICAgSFswXSA9IChIWzBdICsgYSkgfCAwO1xuXHQgICAgICAgICAgICBIWzFdID0gKEhbMV0gKyBiKSB8IDA7XG5cdCAgICAgICAgICAgIEhbMl0gPSAoSFsyXSArIGMpIHwgMDtcblx0ICAgICAgICAgICAgSFszXSA9IChIWzNdICsgZCkgfCAwO1xuXHQgICAgICAgICAgICBIWzRdID0gKEhbNF0gKyBlKSB8IDA7XG5cdCAgICAgICAgICAgIEhbNV0gPSAoSFs1XSArIGYpIHwgMDtcblx0ICAgICAgICAgICAgSFs2XSA9IChIWzZdICsgZykgfCAwO1xuXHQgICAgICAgICAgICBIWzddID0gKEhbN10gKyBoKSB8IDA7XG5cdCAgICAgICAgfSxcblxuXHQgICAgICAgIF9kb0ZpbmFsaXplOiBmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xuXHQgICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGE7XG5cdCAgICAgICAgICAgIHZhciBkYXRhV29yZHMgPSBkYXRhLndvcmRzO1xuXG5cdCAgICAgICAgICAgIHZhciBuQml0c1RvdGFsID0gdGhpcy5fbkRhdGFCeXRlcyAqIDg7XG5cdCAgICAgICAgICAgIHZhciBuQml0c0xlZnQgPSBkYXRhLnNpZ0J5dGVzICogODtcblxuXHQgICAgICAgICAgICAvLyBBZGQgcGFkZGluZ1xuXHQgICAgICAgICAgICBkYXRhV29yZHNbbkJpdHNMZWZ0ID4+PiA1XSB8PSAweDgwIDw8ICgyNCAtIG5CaXRzTGVmdCAlIDMyKTtcblx0ICAgICAgICAgICAgZGF0YVdvcmRzWygoKG5CaXRzTGVmdCArIDY0KSA+Pj4gOSkgPDwgNCkgKyAxNF0gPSBNYXRoLmZsb29yKG5CaXRzVG90YWwgLyAweDEwMDAwMDAwMCk7XG5cdCAgICAgICAgICAgIGRhdGFXb3Jkc1soKChuQml0c0xlZnQgKyA2NCkgPj4+IDkpIDw8IDQpICsgMTVdID0gbkJpdHNUb3RhbDtcblx0ICAgICAgICAgICAgZGF0YS5zaWdCeXRlcyA9IGRhdGFXb3Jkcy5sZW5ndGggKiA0O1xuXG5cdCAgICAgICAgICAgIC8vIEhhc2ggZmluYWwgYmxvY2tzXG5cdCAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcblxuXHQgICAgICAgICAgICAvLyBSZXR1cm4gZmluYWwgY29tcHV0ZWQgaGFzaFxuXHQgICAgICAgICAgICByZXR1cm4gdGhpcy5faGFzaDtcblx0ICAgICAgICB9LFxuXG5cdCAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcblx0ICAgICAgICAgICAgdmFyIGNsb25lID0gSGFzaGVyLmNsb25lLmNhbGwodGhpcyk7XG5cdCAgICAgICAgICAgIGNsb25lLl9oYXNoID0gdGhpcy5faGFzaC5jbG9uZSgpO1xuXG5cdCAgICAgICAgICAgIHJldHVybiBjbG9uZTtcblx0ICAgICAgICB9XG5cdCAgICB9KTtcblxuXHQgICAgLyoqXG5cdCAgICAgKiBTaG9ydGN1dCBmdW5jdGlvbiB0byB0aGUgaGFzaGVyJ3Mgb2JqZWN0IGludGVyZmFjZS5cblx0ICAgICAqXG5cdCAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gaGFzaC5cblx0ICAgICAqXG5cdCAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBoYXNoLlxuXHQgICAgICpcblx0ICAgICAqIEBzdGF0aWNcblx0ICAgICAqXG5cdCAgICAgKiBAZXhhbXBsZVxuXHQgICAgICpcblx0ICAgICAqICAgICB2YXIgaGFzaCA9IENyeXB0b0pTLlNIQTI1NignbWVzc2FnZScpO1xuXHQgICAgICogICAgIHZhciBoYXNoID0gQ3J5cHRvSlMuU0hBMjU2KHdvcmRBcnJheSk7XG5cdCAgICAgKi9cblx0ICAgIEMuU0hBMjU2ID0gSGFzaGVyLl9jcmVhdGVIZWxwZXIoU0hBMjU2KTtcblxuXHQgICAgLyoqXG5cdCAgICAgKiBTaG9ydGN1dCBmdW5jdGlvbiB0byB0aGUgSE1BQydzIG9iamVjdCBpbnRlcmZhY2UuXG5cdCAgICAgKlxuXHQgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGhhc2guXG5cdCAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IGtleSBUaGUgc2VjcmV0IGtleS5cblx0ICAgICAqXG5cdCAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBITUFDLlxuXHQgICAgICpcblx0ICAgICAqIEBzdGF0aWNcblx0ICAgICAqXG5cdCAgICAgKiBAZXhhbXBsZVxuXHQgICAgICpcblx0ICAgICAqICAgICB2YXIgaG1hYyA9IENyeXB0b0pTLkhtYWNTSEEyNTYobWVzc2FnZSwga2V5KTtcblx0ICAgICAqL1xuXHQgICAgQy5IbWFjU0hBMjU2ID0gSGFzaGVyLl9jcmVhdGVIbWFjSGVscGVyKFNIQTI1Nik7XG5cdH0oTWF0aCkpO1xuXG5cblx0cmV0dXJuIENyeXB0b0pTLlNIQTI1NjtcblxufSkpOyIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyB2aW06dHM9NDpzdHM9NDpzdz00OlxyXG4vKiFcclxuICpcclxuICogQ29weXJpZ2h0IDIwMDktMjAxMiBLcmlzIEtvd2FsIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgTUlUXHJcbiAqIGxpY2Vuc2UgZm91bmQgYXQgaHR0cDovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3EvcmF3L21hc3Rlci9MSUNFTlNFXHJcbiAqXHJcbiAqIFdpdGggcGFydHMgYnkgVHlsZXIgQ2xvc2VcclxuICogQ29weXJpZ2h0IDIwMDctMjAwOSBUeWxlciBDbG9zZSB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVCBYIGxpY2Vuc2UgZm91bmRcclxuICogYXQgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5odG1sXHJcbiAqIEZvcmtlZCBhdCByZWZfc2VuZC5qcyB2ZXJzaW9uOiAyMDA5LTA1LTExXHJcbiAqXHJcbiAqIFdpdGggcGFydHMgYnkgTWFyayBNaWxsZXJcclxuICogQ29weXJpZ2h0IChDKSAyMDExIEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uIChkZWZpbml0aW9uKSB7XHJcbiAgICAvLyBUdXJuIG9mZiBzdHJpY3QgbW9kZSBmb3IgdGhpcyBmdW5jdGlvbiBzbyB3ZSBjYW4gYXNzaWduIHRvIGdsb2JhbC5RXHJcbiAgICAvKiBqc2hpbnQgc3RyaWN0OiBmYWxzZSAqL1xyXG5cclxuICAgIC8vIFRoaXMgZmlsZSB3aWxsIGZ1bmN0aW9uIHByb3Blcmx5IGFzIGEgPHNjcmlwdD4gdGFnLCBvciBhIG1vZHVsZVxyXG4gICAgLy8gdXNpbmcgQ29tbW9uSlMgYW5kIE5vZGVKUyBvciBSZXF1aXJlSlMgbW9kdWxlIGZvcm1hdHMuICBJblxyXG4gICAgLy8gQ29tbW9uL05vZGUvUmVxdWlyZUpTLCB0aGUgbW9kdWxlIGV4cG9ydHMgdGhlIFEgQVBJIGFuZCB3aGVuXHJcbiAgICAvLyBleGVjdXRlZCBhcyBhIHNpbXBsZSA8c2NyaXB0PiwgaXQgY3JlYXRlcyBhIFEgZ2xvYmFsIGluc3RlYWQuXHJcblxyXG4gICAgLy8gTW9udGFnZSBSZXF1aXJlXHJcbiAgICBpZiAodHlwZW9mIGJvb3RzdHJhcCA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgYm9vdHN0cmFwKFwicHJvbWlzZVwiLCBkZWZpbml0aW9uKTtcclxuXHJcbiAgICAvLyBDb21tb25KU1xyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xyXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpO1xyXG5cclxuICAgIC8vIFJlcXVpcmVKU1xyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShkZWZpbml0aW9uKTtcclxuXHJcbiAgICAvLyBTRVMgKFNlY3VyZSBFY21hU2NyaXB0KVxyXG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc2VzICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgaWYgKCFzZXMub2soKSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2VzLm1ha2VRID0gZGVmaW5pdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgLy8gPHNjcmlwdD5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgUSA9IGRlZmluaXRpb24oKTtcclxuICAgIH1cclxuXHJcbn0pKGZ1bmN0aW9uICgpIHtcclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgaGFzU3RhY2tzID0gZmFsc2U7XHJcbnRyeSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcclxufSBjYXRjaCAoZSkge1xyXG4gICAgaGFzU3RhY2tzID0gISFlLnN0YWNrO1xyXG59XHJcblxyXG4vLyBBbGwgY29kZSBhZnRlciB0aGlzIHBvaW50IHdpbGwgYmUgZmlsdGVyZWQgZnJvbSBzdGFjayB0cmFjZXMgcmVwb3J0ZWRcclxuLy8gYnkgUS5cclxudmFyIHFTdGFydGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xyXG52YXIgcUZpbGVOYW1lO1xyXG5cclxuLy8gc2hpbXNcclxuXHJcbi8vIHVzZWQgZm9yIGZhbGxiYWNrIGluIFwiYWxsUmVzb2x2ZWRcIlxyXG52YXIgbm9vcCA9IGZ1bmN0aW9uICgpIHt9O1xyXG5cclxuLy8gVXNlIHRoZSBmYXN0ZXN0IHBvc3NpYmxlIG1lYW5zIHRvIGV4ZWN1dGUgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm5cclxuLy8gb2YgdGhlIGV2ZW50IGxvb3AuXHJcbnZhciBuZXh0VGljayA9KGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIGxpbmtlZCBsaXN0IG9mIHRhc2tzIChzaW5nbGUsIHdpdGggaGVhZCBub2RlKVxyXG4gICAgdmFyIGhlYWQgPSB7dGFzazogdm9pZCAwLCBuZXh0OiBudWxsfTtcclxuICAgIHZhciB0YWlsID0gaGVhZDtcclxuICAgIHZhciBmbHVzaGluZyA9IGZhbHNlO1xyXG4gICAgdmFyIHJlcXVlc3RUaWNrID0gdm9pZCAwO1xyXG4gICAgdmFyIGlzTm9kZUpTID0gZmFsc2U7XHJcblxyXG4gICAgZnVuY3Rpb24gZmx1c2goKSB7XHJcbiAgICAgICAgLyoganNoaW50IGxvb3BmdW5jOiB0cnVlICovXHJcblxyXG4gICAgICAgIHdoaWxlIChoZWFkLm5leHQpIHtcclxuICAgICAgICAgICAgaGVhZCA9IGhlYWQubmV4dDtcclxuICAgICAgICAgICAgdmFyIHRhc2sgPSBoZWFkLnRhc2s7XHJcbiAgICAgICAgICAgIGhlYWQudGFzayA9IHZvaWQgMDtcclxuICAgICAgICAgICAgdmFyIGRvbWFpbiA9IGhlYWQuZG9tYWluO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRvbWFpbikge1xyXG4gICAgICAgICAgICAgICAgaGVhZC5kb21haW4gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHRhc2soKTtcclxuXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpc05vZGVKUykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEluIG5vZGUsIHVuY2F1Z2h0IGV4Y2VwdGlvbnMgYXJlIGNvbnNpZGVyZWQgZmF0YWwgZXJyb3JzLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLXRocm93IHRoZW0gc3luY2hyb25vdXNseSB0byBpbnRlcnJ1cHQgZmx1c2hpbmchXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBjb250aW51YXRpb24gaWYgdGhlIHVuY2F1Z2h0IGV4Y2VwdGlvbiBpcyBzdXBwcmVzc2VkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbGlzdGVuaW5nIFwidW5jYXVnaHRFeGNlcHRpb25cIiBldmVudHMgKGFzIGRvbWFpbnMgZG9lcykuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29udGludWUgaW4gbmV4dCBldmVudCB0byBhdm9pZCB0aWNrIHJlY3Vyc2lvbi5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9tYWluLmVudGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlO1xyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSW4gYnJvd3NlcnMsIHVuY2F1Z2h0IGV4Y2VwdGlvbnMgYXJlIG5vdCBmYXRhbC5cclxuICAgICAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIHNsb3ctZG93bnMuXHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICBkb21haW4uZXhpdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmbHVzaGluZyA9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIG5leHRUaWNrID0gZnVuY3Rpb24gKHRhc2spIHtcclxuICAgICAgICB0YWlsID0gdGFpbC5uZXh0ID0ge1xyXG4gICAgICAgICAgICB0YXNrOiB0YXNrLFxyXG4gICAgICAgICAgICBkb21haW46IGlzTm9kZUpTICYmIHByb2Nlc3MuZG9tYWluLFxyXG4gICAgICAgICAgICBuZXh0OiBudWxsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKCFmbHVzaGluZykge1xyXG4gICAgICAgICAgICBmbHVzaGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2Vzcy5uZXh0VGljaykge1xyXG4gICAgICAgIC8vIE5vZGUuanMgYmVmb3JlIDAuOS4gTm90ZSB0aGF0IHNvbWUgZmFrZS1Ob2RlIGVudmlyb25tZW50cywgbGlrZSB0aGVcclxuICAgICAgICAvLyBNb2NoYSB0ZXN0IHJ1bm5lciwgaW50cm9kdWNlIGEgYHByb2Nlc3NgIGdsb2JhbCB3aXRob3V0IGEgYG5leHRUaWNrYC5cclxuICAgICAgICBpc05vZGVKUyA9IHRydWU7XHJcblxyXG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgLy8gSW4gSUUxMCwgTm9kZS5qcyAwLjkrLCBvciBodHRwczovL2dpdGh1Yi5jb20vTm9ibGVKUy9zZXRJbW1lZGlhdGVcclxuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICByZXF1ZXN0VGljayA9IHNldEltbWVkaWF0ZS5iaW5kKHdpbmRvdywgZmx1c2gpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgc2V0SW1tZWRpYXRlKGZsdXNoKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICAvLyBtb2Rlcm4gYnJvd3NlcnNcclxuICAgICAgICAvLyBodHRwOi8vd3d3Lm5vbmJsb2NraW5nLmlvLzIwMTEvMDYvd2luZG93bmV4dHRpY2suaHRtbFxyXG4gICAgICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XHJcbiAgICAgICAgLy8gQXQgbGVhc3QgU2FmYXJpIFZlcnNpb24gNi4wLjUgKDg1MzYuMzAuMSkgaW50ZXJtaXR0ZW50bHkgY2Fubm90IGNyZWF0ZVxyXG4gICAgICAgIC8vIHdvcmtpbmcgbWVzc2FnZSBwb3J0cyB0aGUgZmlyc3QgdGltZSBhIHBhZ2UgbG9hZHMuXHJcbiAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gcmVxdWVzdFBvcnRUaWNrO1xyXG4gICAgICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZsdXNoO1xyXG4gICAgICAgICAgICBmbHVzaCgpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdmFyIHJlcXVlc3RQb3J0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgLy8gT3BlcmEgcmVxdWlyZXMgdXMgdG8gcHJvdmlkZSBhIG1lc3NhZ2UgcGF5bG9hZCwgcmVnYXJkbGVzcyBvZlxyXG4gICAgICAgICAgICAvLyB3aGV0aGVyIHdlIHVzZSBpdC5cclxuICAgICAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZsdXNoLCAwKTtcclxuICAgICAgICAgICAgcmVxdWVzdFBvcnRUaWNrKCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIG9sZCBicm93c2Vyc1xyXG4gICAgICAgIHJlcXVlc3RUaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZsdXNoLCAwKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXh0VGljaztcclxufSkoKTtcclxuXHJcbi8vIEF0dGVtcHQgdG8gbWFrZSBnZW5lcmljcyBzYWZlIGluIHRoZSBmYWNlIG9mIGRvd25zdHJlYW1cclxuLy8gbW9kaWZpY2F0aW9ucy5cclxuLy8gVGhlcmUgaXMgbm8gc2l0dWF0aW9uIHdoZXJlIHRoaXMgaXMgbmVjZXNzYXJ5LlxyXG4vLyBJZiB5b3UgbmVlZCBhIHNlY3VyaXR5IGd1YXJhbnRlZSwgdGhlc2UgcHJpbW9yZGlhbHMgbmVlZCB0byBiZVxyXG4vLyBkZWVwbHkgZnJvemVuIGFueXdheSwgYW5kIGlmIHlvdSBkb27igJl0IG5lZWQgYSBzZWN1cml0eSBndWFyYW50ZWUsXHJcbi8vIHRoaXMgaXMganVzdCBwbGFpbiBwYXJhbm9pZC5cclxuLy8gSG93ZXZlciwgdGhpcyAqKm1pZ2h0KiogaGF2ZSB0aGUgbmljZSBzaWRlLWVmZmVjdCBvZiByZWR1Y2luZyB0aGUgc2l6ZSBvZlxyXG4vLyB0aGUgbWluaWZpZWQgY29kZSBieSByZWR1Y2luZyB4LmNhbGwoKSB0byBtZXJlbHkgeCgpXHJcbi8vIFNlZSBNYXJrIE1pbGxlcuKAmXMgZXhwbGFuYXRpb24gb2Ygd2hhdCB0aGlzIGRvZXMuXHJcbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWNvbnZlbnRpb25zOnNhZmVfbWV0YV9wcm9ncmFtbWluZ1xyXG52YXIgY2FsbCA9IEZ1bmN0aW9uLmNhbGw7XHJcbmZ1bmN0aW9uIHVuY3VycnlUaGlzKGYpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIGNhbGwuYXBwbHkoZiwgYXJndW1lbnRzKTtcclxuICAgIH07XHJcbn1cclxuLy8gVGhpcyBpcyBlcXVpdmFsZW50LCBidXQgc2xvd2VyOlxyXG4vLyB1bmN1cnJ5VGhpcyA9IEZ1bmN0aW9uX2JpbmQuYmluZChGdW5jdGlvbl9iaW5kLmNhbGwpO1xyXG4vLyBodHRwOi8vanNwZXJmLmNvbS91bmN1cnJ5dGhpc1xyXG5cclxudmFyIGFycmF5X3NsaWNlID0gdW5jdXJyeVRoaXMoQXJyYXkucHJvdG90eXBlLnNsaWNlKTtcclxuXHJcbnZhciBhcnJheV9yZWR1Y2UgPSB1bmN1cnJ5VGhpcyhcclxuICAgIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UgfHwgZnVuY3Rpb24gKGNhbGxiYWNrLCBiYXNpcykge1xyXG4gICAgICAgIHZhciBpbmRleCA9IDAsXHJcbiAgICAgICAgICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoO1xyXG4gICAgICAgIC8vIGNvbmNlcm5pbmcgdGhlIGluaXRpYWwgdmFsdWUsIGlmIG9uZSBpcyBub3QgcHJvdmlkZWRcclxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAvLyBzZWVrIHRvIHRoZSBmaXJzdCB2YWx1ZSBpbiB0aGUgYXJyYXksIGFjY291bnRpbmdcclxuICAgICAgICAgICAgLy8gZm9yIHRoZSBwb3NzaWJpbGl0eSB0aGF0IGlzIGlzIGEgc3BhcnNlIGFycmF5XHJcbiAgICAgICAgICAgIGRvIHtcclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCBpbiB0aGlzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFzaXMgPSB0aGlzW2luZGV4KytdO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCsraW5kZXggPj0gbGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IHdoaWxlICgxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gcmVkdWNlXHJcbiAgICAgICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIC8vIGFjY291bnQgZm9yIHRoZSBwb3NzaWJpbGl0eSB0aGF0IHRoZSBhcnJheSBpcyBzcGFyc2VcclxuICAgICAgICAgICAgaWYgKGluZGV4IGluIHRoaXMpIHtcclxuICAgICAgICAgICAgICAgIGJhc2lzID0gY2FsbGJhY2soYmFzaXMsIHRoaXNbaW5kZXhdLCBpbmRleCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGJhc2lzO1xyXG4gICAgfVxyXG4pO1xyXG5cclxudmFyIGFycmF5X2luZGV4T2YgPSB1bmN1cnJ5VGhpcyhcclxuICAgIEFycmF5LnByb3RvdHlwZS5pbmRleE9mIHx8IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIC8vIG5vdCBhIHZlcnkgZ29vZCBzaGltLCBidXQgZ29vZCBlbm91Z2ggZm9yIG91ciBvbmUgdXNlIG9mIGl0XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzW2ldID09PSB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgfVxyXG4pO1xyXG5cclxudmFyIGFycmF5X21hcCA9IHVuY3VycnlUaGlzKFxyXG4gICAgQXJyYXkucHJvdG90eXBlLm1hcCB8fCBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNwKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBjb2xsZWN0ID0gW107XHJcbiAgICAgICAgYXJyYXlfcmVkdWNlKHNlbGYsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHZhbHVlLCBpbmRleCkge1xyXG4gICAgICAgICAgICBjb2xsZWN0LnB1c2goY2FsbGJhY2suY2FsbCh0aGlzcCwgdmFsdWUsIGluZGV4LCBzZWxmKSk7XHJcbiAgICAgICAgfSwgdm9pZCAwKTtcclxuICAgICAgICByZXR1cm4gY29sbGVjdDtcclxuICAgIH1cclxuKTtcclxuXHJcbnZhciBvYmplY3RfY3JlYXRlID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbiAocHJvdG90eXBlKSB7XHJcbiAgICBmdW5jdGlvbiBUeXBlKCkgeyB9XHJcbiAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcclxuICAgIHJldHVybiBuZXcgVHlwZSgpO1xyXG59O1xyXG5cclxudmFyIG9iamVjdF9oYXNPd25Qcm9wZXJ0eSA9IHVuY3VycnlUaGlzKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkpO1xyXG5cclxudmFyIG9iamVjdF9rZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgdmFyIGtleXMgPSBbXTtcclxuICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcclxuICAgICAgICBpZiAob2JqZWN0X2hhc093blByb3BlcnR5KG9iamVjdCwga2V5KSkge1xyXG4gICAgICAgICAgICBrZXlzLnB1c2goa2V5KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4ga2V5cztcclxufTtcclxuXHJcbnZhciBvYmplY3RfdG9TdHJpbmcgPSB1bmN1cnJ5VGhpcyhPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nKTtcclxuXHJcbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdmFsdWUgPT09IE9iamVjdCh2YWx1ZSk7XHJcbn1cclxuXHJcbi8vIGdlbmVyYXRvciByZWxhdGVkIHNoaW1zXHJcblxyXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgZnVuY3Rpb24gb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxyXG5mdW5jdGlvbiBpc1N0b3BJdGVyYXRpb24oZXhjZXB0aW9uKSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICAgIG9iamVjdF90b1N0cmluZyhleGNlcHRpb24pID09PSBcIltvYmplY3QgU3RvcEl0ZXJhdGlvbl1cIiB8fFxyXG4gICAgICAgIGV4Y2VwdGlvbiBpbnN0YW5jZW9mIFFSZXR1cm5WYWx1ZVxyXG4gICAgKTtcclxufVxyXG5cclxuLy8gRklYTUU6IFJlbW92ZSB0aGlzIGhlbHBlciBhbmQgUS5yZXR1cm4gb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW5cclxuLy8gU3BpZGVyTW9ua2V5LlxyXG52YXIgUVJldHVyblZhbHVlO1xyXG5pZiAodHlwZW9mIFJldHVyblZhbHVlICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICBRUmV0dXJuVmFsdWUgPSBSZXR1cm5WYWx1ZTtcclxufSBlbHNlIHtcclxuICAgIFFSZXR1cm5WYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8vIGxvbmcgc3RhY2sgdHJhY2VzXHJcblxyXG52YXIgU1RBQ0tfSlVNUF9TRVBBUkFUT1IgPSBcIkZyb20gcHJldmlvdXMgZXZlbnQ6XCI7XHJcblxyXG5mdW5jdGlvbiBtYWtlU3RhY2tUcmFjZUxvbmcoZXJyb3IsIHByb21pc2UpIHtcclxuICAgIC8vIElmIHBvc3NpYmxlLCB0cmFuc2Zvcm0gdGhlIGVycm9yIHN0YWNrIHRyYWNlIGJ5IHJlbW92aW5nIE5vZGUgYW5kIFFcclxuICAgIC8vIGNydWZ0LCB0aGVuIGNvbmNhdGVuYXRpbmcgd2l0aCB0aGUgc3RhY2sgdHJhY2Ugb2YgYHByb21pc2VgLiBTZWUgIzU3LlxyXG4gICAgaWYgKGhhc1N0YWNrcyAmJlxyXG4gICAgICAgIHByb21pc2Uuc3RhY2sgJiZcclxuICAgICAgICB0eXBlb2YgZXJyb3IgPT09IFwib2JqZWN0XCIgJiZcclxuICAgICAgICBlcnJvciAhPT0gbnVsbCAmJlxyXG4gICAgICAgIGVycm9yLnN0YWNrICYmXHJcbiAgICAgICAgZXJyb3Iuc3RhY2suaW5kZXhPZihTVEFDS19KVU1QX1NFUEFSQVRPUikgPT09IC0xXHJcbiAgICApIHtcclxuICAgICAgICB2YXIgc3RhY2tzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgcCA9IHByb21pc2U7ICEhcDsgcCA9IHAuc291cmNlKSB7XHJcbiAgICAgICAgICAgIGlmIChwLnN0YWNrKSB7XHJcbiAgICAgICAgICAgICAgICBzdGFja3MudW5zaGlmdChwLnN0YWNrKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBzdGFja3MudW5zaGlmdChlcnJvci5zdGFjayk7XHJcblxyXG4gICAgICAgIHZhciBjb25jYXRlZFN0YWNrcyA9IHN0YWNrcy5qb2luKFwiXFxuXCIgKyBTVEFDS19KVU1QX1NFUEFSQVRPUiArIFwiXFxuXCIpO1xyXG4gICAgICAgIGVycm9yLnN0YWNrID0gZmlsdGVyU3RhY2tTdHJpbmcoY29uY2F0ZWRTdGFja3MpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaWx0ZXJTdGFja1N0cmluZyhzdGFja1N0cmluZykge1xyXG4gICAgdmFyIGxpbmVzID0gc3RhY2tTdHJpbmcuc3BsaXQoXCJcXG5cIik7XHJcbiAgICB2YXIgZGVzaXJlZExpbmVzID0gW107XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgdmFyIGxpbmUgPSBsaW5lc1tpXTtcclxuXHJcbiAgICAgICAgaWYgKCFpc0ludGVybmFsRnJhbWUobGluZSkgJiYgIWlzTm9kZUZyYW1lKGxpbmUpICYmIGxpbmUpIHtcclxuICAgICAgICAgICAgZGVzaXJlZExpbmVzLnB1c2gobGluZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRlc2lyZWRMaW5lcy5qb2luKFwiXFxuXCIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc05vZGVGcmFtZShzdGFja0xpbmUpIHtcclxuICAgIHJldHVybiBzdGFja0xpbmUuaW5kZXhPZihcIihtb2R1bGUuanM6XCIpICE9PSAtMSB8fFxyXG4gICAgICAgICAgIHN0YWNrTGluZS5pbmRleE9mKFwiKG5vZGUuanM6XCIpICE9PSAtMTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKHN0YWNrTGluZSkge1xyXG4gICAgLy8gTmFtZWQgZnVuY3Rpb25zOiBcImF0IGZ1bmN0aW9uTmFtZSAoZmlsZW5hbWU6bGluZU51bWJlcjpjb2x1bW5OdW1iZXIpXCJcclxuICAgIC8vIEluIElFMTAgZnVuY3Rpb24gbmFtZSBjYW4gaGF2ZSBzcGFjZXMgKFwiQW5vbnltb3VzIGZ1bmN0aW9uXCIpIE9fb1xyXG4gICAgdmFyIGF0dGVtcHQxID0gL2F0IC4rIFxcKCguKyk6KFxcZCspOig/OlxcZCspXFwpJC8uZXhlYyhzdGFja0xpbmUpO1xyXG4gICAgaWYgKGF0dGVtcHQxKSB7XHJcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0MVsxXSwgTnVtYmVyKGF0dGVtcHQxWzJdKV07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQW5vbnltb3VzIGZ1bmN0aW9uczogXCJhdCBmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlclwiXHJcbiAgICB2YXIgYXR0ZW1wdDIgPSAvYXQgKFteIF0rKTooXFxkKyk6KD86XFxkKykkLy5leGVjKHN0YWNrTGluZSk7XHJcbiAgICBpZiAoYXR0ZW1wdDIpIHtcclxuICAgICAgICByZXR1cm4gW2F0dGVtcHQyWzFdLCBOdW1iZXIoYXR0ZW1wdDJbMl0pXTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGaXJlZm94IHN0eWxlOiBcImZ1bmN0aW9uQGZpbGVuYW1lOmxpbmVOdW1iZXIgb3IgQGZpbGVuYW1lOmxpbmVOdW1iZXJcIlxyXG4gICAgdmFyIGF0dGVtcHQzID0gLy4qQCguKyk6KFxcZCspJC8uZXhlYyhzdGFja0xpbmUpO1xyXG4gICAgaWYgKGF0dGVtcHQzKSB7XHJcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0M1sxXSwgTnVtYmVyKGF0dGVtcHQzWzJdKV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzSW50ZXJuYWxGcmFtZShzdGFja0xpbmUpIHtcclxuICAgIHZhciBmaWxlTmFtZUFuZExpbmVOdW1iZXIgPSBnZXRGaWxlTmFtZUFuZExpbmVOdW1iZXIoc3RhY2tMaW5lKTtcclxuXHJcbiAgICBpZiAoIWZpbGVOYW1lQW5kTGluZU51bWJlcikge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZmlsZU5hbWUgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMF07XHJcbiAgICB2YXIgbGluZU51bWJlciA9IGZpbGVOYW1lQW5kTGluZU51bWJlclsxXTtcclxuXHJcbiAgICByZXR1cm4gZmlsZU5hbWUgPT09IHFGaWxlTmFtZSAmJlxyXG4gICAgICAgIGxpbmVOdW1iZXIgPj0gcVN0YXJ0aW5nTGluZSAmJlxyXG4gICAgICAgIGxpbmVOdW1iZXIgPD0gcUVuZGluZ0xpbmU7XHJcbn1cclxuXHJcbi8vIGRpc2NvdmVyIG93biBmaWxlIG5hbWUgYW5kIGxpbmUgbnVtYmVyIHJhbmdlIGZvciBmaWx0ZXJpbmcgc3RhY2tcclxuLy8gdHJhY2VzXHJcbmZ1bmN0aW9uIGNhcHR1cmVMaW5lKCkge1xyXG4gICAgaWYgKCFoYXNTdGFja3MpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICB2YXIgbGluZXMgPSBlLnN0YWNrLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgICAgIHZhciBmaXJzdExpbmUgPSBsaW5lc1swXS5pbmRleE9mKFwiQFwiKSA+IDAgPyBsaW5lc1sxXSA6IGxpbmVzWzJdO1xyXG4gICAgICAgIHZhciBmaWxlTmFtZUFuZExpbmVOdW1iZXIgPSBnZXRGaWxlTmFtZUFuZExpbmVOdW1iZXIoZmlyc3RMaW5lKTtcclxuICAgICAgICBpZiAoIWZpbGVOYW1lQW5kTGluZU51bWJlcikge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBxRmlsZU5hbWUgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMF07XHJcbiAgICAgICAgcmV0dXJuIGZpbGVOYW1lQW5kTGluZU51bWJlclsxXTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGVwcmVjYXRlKGNhbGxiYWNrLCBuYW1lLCBhbHRlcm5hdGl2ZSkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09IFwidW5kZWZpbmVkXCIgJiZcclxuICAgICAgICAgICAgdHlwZW9mIGNvbnNvbGUud2FybiA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihuYW1lICsgXCIgaXMgZGVwcmVjYXRlZCwgdXNlIFwiICsgYWx0ZXJuYXRpdmUgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgXCIgaW5zdGVhZC5cIiwgbmV3IEVycm9yKFwiXCIpLnN0YWNrKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KGNhbGxiYWNrLCBhcmd1bWVudHMpO1xyXG4gICAgfTtcclxufVxyXG5cclxuLy8gZW5kIG9mIHNoaW1zXHJcbi8vIGJlZ2lubmluZyBvZiByZWFsIHdvcmtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgcHJvbWlzZSBmb3IgYW4gaW1tZWRpYXRlIHJlZmVyZW5jZSwgcGFzc2VzIHByb21pc2VzIHRocm91Z2gsIG9yXHJcbiAqIGNvZXJjZXMgcHJvbWlzZXMgZnJvbSBkaWZmZXJlbnQgc3lzdGVtcy5cclxuICogQHBhcmFtIHZhbHVlIGltbWVkaWF0ZSByZWZlcmVuY2Ugb3IgcHJvbWlzZVxyXG4gKi9cclxuZnVuY3Rpb24gUSh2YWx1ZSkge1xyXG4gICAgLy8gSWYgdGhlIG9iamVjdCBpcyBhbHJlYWR5IGEgUHJvbWlzZSwgcmV0dXJuIGl0IGRpcmVjdGx5LiAgVGhpcyBlbmFibGVzXHJcbiAgICAvLyB0aGUgcmVzb2x2ZSBmdW5jdGlvbiB0byBib3RoIGJlIHVzZWQgdG8gY3JlYXRlZCByZWZlcmVuY2VzIGZyb20gb2JqZWN0cyxcclxuICAgIC8vIGJ1dCB0byB0b2xlcmFibHkgY29lcmNlIG5vbi1wcm9taXNlcyB0byBwcm9taXNlcy5cclxuICAgIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGFzc2ltaWxhdGUgdGhlbmFibGVzXHJcbiAgICBpZiAoaXNQcm9taXNlQWxpa2UodmFsdWUpKSB7XHJcbiAgICAgICAgcmV0dXJuIGNvZXJjZSh2YWx1ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBmdWxmaWxsKHZhbHVlKTtcclxuICAgIH1cclxufVxyXG5RLnJlc29sdmUgPSBRO1xyXG5cclxuLyoqXHJcbiAqIFBlcmZvcm1zIGEgdGFzayBpbiBhIGZ1dHVyZSB0dXJuIG9mIHRoZSBldmVudCBsb29wLlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB0YXNrXHJcbiAqL1xyXG5RLm5leHRUaWNrID0gbmV4dFRpY2s7XHJcblxyXG4vKipcclxuICogQ29udHJvbHMgd2hldGhlciBvciBub3QgbG9uZyBzdGFjayB0cmFjZXMgd2lsbCBiZSBvblxyXG4gKi9cclxuUS5sb25nU3RhY2tTdXBwb3J0ID0gZmFsc2U7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIHtwcm9taXNlLCByZXNvbHZlLCByZWplY3R9IG9iamVjdC5cclxuICpcclxuICogYHJlc29sdmVgIGlzIGEgY2FsbGJhY2sgdG8gaW52b2tlIHdpdGggYSBtb3JlIHJlc29sdmVkIHZhbHVlIGZvciB0aGVcclxuICogcHJvbWlzZS4gVG8gZnVsZmlsbCB0aGUgcHJvbWlzZSwgaW52b2tlIGByZXNvbHZlYCB3aXRoIGFueSB2YWx1ZSB0aGF0IGlzXHJcbiAqIG5vdCBhIHRoZW5hYmxlLiBUbyByZWplY3QgdGhlIHByb21pc2UsIGludm9rZSBgcmVzb2x2ZWAgd2l0aCBhIHJlamVjdGVkXHJcbiAqIHRoZW5hYmxlLCBvciBpbnZva2UgYHJlamVjdGAgd2l0aCB0aGUgcmVhc29uIGRpcmVjdGx5LiBUbyByZXNvbHZlIHRoZVxyXG4gKiBwcm9taXNlIHRvIGFub3RoZXIgdGhlbmFibGUsIHRodXMgcHV0dGluZyBpdCBpbiB0aGUgc2FtZSBzdGF0ZSwgaW52b2tlXHJcbiAqIGByZXNvbHZlYCB3aXRoIHRoYXQgb3RoZXIgdGhlbmFibGUuXHJcbiAqL1xyXG5RLmRlZmVyID0gZGVmZXI7XHJcbmZ1bmN0aW9uIGRlZmVyKCkge1xyXG4gICAgLy8gaWYgXCJtZXNzYWdlc1wiIGlzIGFuIFwiQXJyYXlcIiwgdGhhdCBpbmRpY2F0ZXMgdGhhdCB0aGUgcHJvbWlzZSBoYXMgbm90IHlldFxyXG4gICAgLy8gYmVlbiByZXNvbHZlZC4gIElmIGl0IGlzIFwidW5kZWZpbmVkXCIsIGl0IGhhcyBiZWVuIHJlc29sdmVkLiAgRWFjaFxyXG4gICAgLy8gZWxlbWVudCBvZiB0aGUgbWVzc2FnZXMgYXJyYXkgaXMgaXRzZWxmIGFuIGFycmF5IG9mIGNvbXBsZXRlIGFyZ3VtZW50cyB0b1xyXG4gICAgLy8gZm9yd2FyZCB0byB0aGUgcmVzb2x2ZWQgcHJvbWlzZS4gIFdlIGNvZXJjZSB0aGUgcmVzb2x1dGlvbiB2YWx1ZSB0byBhXHJcbiAgICAvLyBwcm9taXNlIHVzaW5nIHRoZSBgcmVzb2x2ZWAgZnVuY3Rpb24gYmVjYXVzZSBpdCBoYW5kbGVzIGJvdGggZnVsbHlcclxuICAgIC8vIG5vbi10aGVuYWJsZSB2YWx1ZXMgYW5kIG90aGVyIHRoZW5hYmxlcyBncmFjZWZ1bGx5LlxyXG4gICAgdmFyIG1lc3NhZ2VzID0gW10sIHByb2dyZXNzTGlzdGVuZXJzID0gW10sIHJlc29sdmVkUHJvbWlzZTtcclxuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBvYmplY3RfY3JlYXRlKGRlZmVyLnByb3RvdHlwZSk7XHJcbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xyXG5cclxuICAgIHByb21pc2UucHJvbWlzZURpc3BhdGNoID0gZnVuY3Rpb24gKHJlc29sdmUsIG9wLCBvcGVyYW5kcykge1xyXG4gICAgICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcclxuICAgICAgICBpZiAobWVzc2FnZXMpIHtcclxuICAgICAgICAgICAgbWVzc2FnZXMucHVzaChhcmdzKTtcclxuICAgICAgICAgICAgaWYgKG9wID09PSBcIndoZW5cIiAmJiBvcGVyYW5kc1sxXSkgeyAvLyBwcm9ncmVzcyBvcGVyYW5kXHJcbiAgICAgICAgICAgICAgICBwcm9ncmVzc0xpc3RlbmVycy5wdXNoKG9wZXJhbmRzWzFdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmVkUHJvbWlzZS5wcm9taXNlRGlzcGF0Y2guYXBwbHkocmVzb2x2ZWRQcm9taXNlLCBhcmdzKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBYWFggZGVwcmVjYXRlZFxyXG4gICAgcHJvbWlzZS52YWx1ZU9mID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmIChtZXNzYWdlcykge1xyXG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG5lYXJlclZhbHVlID0gbmVhcmVyKHJlc29sdmVkUHJvbWlzZSk7XHJcbiAgICAgICAgaWYgKGlzUHJvbWlzZShuZWFyZXJWYWx1ZSkpIHtcclxuICAgICAgICAgICAgcmVzb2x2ZWRQcm9taXNlID0gbmVhcmVyVmFsdWU7IC8vIHNob3J0ZW4gY2hhaW5cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5lYXJlclZhbHVlO1xyXG4gICAgfTtcclxuXHJcbiAgICBwcm9taXNlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCFyZXNvbHZlZFByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwicGVuZGluZ1wiIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXNvbHZlZFByb21pc2UuaW5zcGVjdCgpO1xyXG4gICAgfTtcclxuXHJcbiAgICBpZiAoUS5sb25nU3RhY2tTdXBwb3J0ICYmIGhhc1N0YWNrcykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgLy8gTk9URTogZG9uJ3QgdHJ5IHRvIHVzZSBgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2VgIG9yIHRyYW5zZmVyIHRoZVxyXG4gICAgICAgICAgICAvLyBhY2Nlc3NvciBhcm91bmQ7IHRoYXQgY2F1c2VzIG1lbW9yeSBsZWFrcyBhcyBwZXIgR0gtMTExLiBKdXN0XHJcbiAgICAgICAgICAgIC8vIHJlaWZ5IHRoZSBzdGFjayB0cmFjZSBhcyBhIHN0cmluZyBBU0FQLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyBBdCB0aGUgc2FtZSB0aW1lLCBjdXQgb2ZmIHRoZSBmaXJzdCBsaW5lOyBpdCdzIGFsd2F5cyBqdXN0XHJcbiAgICAgICAgICAgIC8vIFwiW29iamVjdCBQcm9taXNlXVxcblwiLCBhcyBwZXIgdGhlIGB0b1N0cmluZ2AuXHJcbiAgICAgICAgICAgIHByb21pc2Uuc3RhY2sgPSBlLnN0YWNrLnN1YnN0cmluZyhlLnN0YWNrLmluZGV4T2YoXCJcXG5cIikgKyAxKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTk9URTogd2UgZG8gdGhlIGNoZWNrcyBmb3IgYHJlc29sdmVkUHJvbWlzZWAgaW4gZWFjaCBtZXRob2QsIGluc3RlYWQgb2ZcclxuICAgIC8vIGNvbnNvbGlkYXRpbmcgdGhlbSBpbnRvIGBiZWNvbWVgLCBzaW5jZSBvdGhlcndpc2Ugd2UnZCBjcmVhdGUgbmV3XHJcbiAgICAvLyBwcm9taXNlcyB3aXRoIHRoZSBsaW5lcyBgYmVjb21lKHdoYXRldmVyKHZhbHVlKSlgLiBTZWUgZS5nLiBHSC0yNTIuXHJcblxyXG4gICAgZnVuY3Rpb24gYmVjb21lKG5ld1Byb21pc2UpIHtcclxuICAgICAgICByZXNvbHZlZFByb21pc2UgPSBuZXdQcm9taXNlO1xyXG4gICAgICAgIHByb21pc2Uuc291cmNlID0gbmV3UHJvbWlzZTtcclxuXHJcbiAgICAgICAgYXJyYXlfcmVkdWNlKG1lc3NhZ2VzLCBmdW5jdGlvbiAodW5kZWZpbmVkLCBtZXNzYWdlKSB7XHJcbiAgICAgICAgICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Byb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KG5ld1Byb21pc2UsIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LCB2b2lkIDApO1xyXG5cclxuICAgICAgICBtZXNzYWdlcyA9IHZvaWQgMDtcclxuICAgICAgICBwcm9ncmVzc0xpc3RlbmVycyA9IHZvaWQgMDtcclxuICAgIH1cclxuXHJcbiAgICBkZWZlcnJlZC5wcm9taXNlID0gcHJvbWlzZTtcclxuICAgIGRlZmVycmVkLnJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlY29tZShRKHZhbHVlKSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGRlZmVycmVkLmZ1bGZpbGwgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlY29tZShmdWxmaWxsKHZhbHVlKSk7XHJcbiAgICB9O1xyXG4gICAgZGVmZXJyZWQucmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xyXG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVjb21lKHJlamVjdChyZWFzb24pKTtcclxuICAgIH07XHJcbiAgICBkZWZlcnJlZC5ub3RpZnkgPSBmdW5jdGlvbiAocHJvZ3Jlc3MpIHtcclxuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFycmF5X3JlZHVjZShwcm9ncmVzc0xpc3RlbmVycywgZnVuY3Rpb24gKHVuZGVmaW5lZCwgcHJvZ3Jlc3NMaXN0ZW5lcikge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9ncmVzc0xpc3RlbmVyKHByb2dyZXNzKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSwgdm9pZCAwKTtcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIGRlZmVycmVkO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIE5vZGUtc3R5bGUgY2FsbGJhY2sgdGhhdCB3aWxsIHJlc29sdmUgb3IgcmVqZWN0IHRoZSBkZWZlcnJlZFxyXG4gKiBwcm9taXNlLlxyXG4gKiBAcmV0dXJucyBhIG5vZGViYWNrXHJcbiAqL1xyXG5kZWZlci5wcm90b3R5cGUubWFrZU5vZGVSZXNvbHZlciA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHJldHVybiBmdW5jdGlvbiAoZXJyb3IsIHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHNlbGYucmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgIHNlbGYucmVzb2x2ZShhcnJheV9zbGljZShhcmd1bWVudHMsIDEpKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZWxmLnJlc29sdmUodmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQHBhcmFtIHJlc29sdmVyIHtGdW5jdGlvbn0gYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgbm90aGluZyBhbmQgYWNjZXB0c1xyXG4gKiB0aGUgcmVzb2x2ZSwgcmVqZWN0LCBhbmQgbm90aWZ5IGZ1bmN0aW9ucyBmb3IgYSBkZWZlcnJlZC5cclxuICogQHJldHVybnMgYSBwcm9taXNlIHRoYXQgbWF5IGJlIHJlc29sdmVkIHdpdGggdGhlIGdpdmVuIHJlc29sdmUgYW5kIHJlamVjdFxyXG4gKiBmdW5jdGlvbnMsIG9yIHJlamVjdGVkIGJ5IGEgdGhyb3duIGV4Y2VwdGlvbiBpbiByZXNvbHZlclxyXG4gKi9cclxuUS5Qcm9taXNlID0gcHJvbWlzZTsgLy8gRVM2XHJcblEucHJvbWlzZSA9IHByb21pc2U7XHJcbmZ1bmN0aW9uIHByb21pc2UocmVzb2x2ZXIpIHtcclxuICAgIGlmICh0eXBlb2YgcmVzb2x2ZXIgIT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJyZXNvbHZlciBtdXN0IGJlIGEgZnVuY3Rpb24uXCIpO1xyXG4gICAgfVxyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgcmVzb2x2ZXIoZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0LCBkZWZlcnJlZC5ub3RpZnkpO1xyXG4gICAgfSBjYXRjaCAocmVhc29uKSB7XHJcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJlYXNvbik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufVxyXG5cclxucHJvbWlzZS5yYWNlID0gcmFjZTsgLy8gRVM2XHJcbnByb21pc2UuYWxsID0gYWxsOyAvLyBFUzZcclxucHJvbWlzZS5yZWplY3QgPSByZWplY3Q7IC8vIEVTNlxyXG5wcm9taXNlLnJlc29sdmUgPSBROyAvLyBFUzZcclxuXHJcbi8vIFhYWCBleHBlcmltZW50YWwuICBUaGlzIG1ldGhvZCBpcyBhIHdheSB0byBkZW5vdGUgdGhhdCBhIGxvY2FsIHZhbHVlIGlzXHJcbi8vIHNlcmlhbGl6YWJsZSBhbmQgc2hvdWxkIGJlIGltbWVkaWF0ZWx5IGRpc3BhdGNoZWQgdG8gYSByZW1vdGUgdXBvbiByZXF1ZXN0LFxyXG4vLyBpbnN0ZWFkIG9mIHBhc3NpbmcgYSByZWZlcmVuY2UuXHJcblEucGFzc0J5Q29weSA9IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgIC8vZnJlZXplKG9iamVjdCk7XHJcbiAgICAvL3Bhc3NCeUNvcGllcy5zZXQob2JqZWN0LCB0cnVlKTtcclxuICAgIHJldHVybiBvYmplY3Q7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5wYXNzQnlDb3B5ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgLy9mcmVlemUob2JqZWN0KTtcclxuICAgIC8vcGFzc0J5Q29waWVzLnNldChvYmplY3QsIHRydWUpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogSWYgdHdvIHByb21pc2VzIGV2ZW50dWFsbHkgZnVsZmlsbCB0byB0aGUgc2FtZSB2YWx1ZSwgcHJvbWlzZXMgdGhhdCB2YWx1ZSxcclxuICogYnV0IG90aGVyd2lzZSByZWplY3RzLlxyXG4gKiBAcGFyYW0geCB7QW55Kn1cclxuICogQHBhcmFtIHkge0FueSp9XHJcbiAqIEByZXR1cm5zIHtBbnkqfSBhIHByb21pc2UgZm9yIHggYW5kIHkgaWYgdGhleSBhcmUgdGhlIHNhbWUsIGJ1dCBhIHJlamVjdGlvblxyXG4gKiBvdGhlcndpc2UuXHJcbiAqXHJcbiAqL1xyXG5RLmpvaW4gPSBmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgcmV0dXJuIFEoeCkuam9pbih5KTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmpvaW4gPSBmdW5jdGlvbiAodGhhdCkge1xyXG4gICAgcmV0dXJuIFEoW3RoaXMsIHRoYXRdKS5zcHJlYWQoZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgICAgICBpZiAoeCA9PT0geSkge1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBcIj09PVwiIHNob3VsZCBiZSBPYmplY3QuaXMgb3IgZXF1aXZcclxuICAgICAgICAgICAgcmV0dXJuIHg7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgam9pbjogbm90IHRoZSBzYW1lOiBcIiArIHggKyBcIiBcIiArIHkpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZmlyc3Qgb2YgYW4gYXJyYXkgb2YgcHJvbWlzZXMgdG8gYmVjb21lIGZ1bGZpbGxlZC5cclxuICogQHBhcmFtIGFuc3dlcnMge0FycmF5W0FueSpdfSBwcm9taXNlcyB0byByYWNlXHJcbiAqIEByZXR1cm5zIHtBbnkqfSB0aGUgZmlyc3QgcHJvbWlzZSB0byBiZSBmdWxmaWxsZWRcclxuICovXHJcblEucmFjZSA9IHJhY2U7XHJcbmZ1bmN0aW9uIHJhY2UoYW5zd2VyUHMpIHtcclxuICAgIHJldHVybiBwcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIC8vIFN3aXRjaCB0byB0aGlzIG9uY2Ugd2UgY2FuIGFzc3VtZSBhdCBsZWFzdCBFUzVcclxuICAgICAgICAvLyBhbnN3ZXJQcy5mb3JFYWNoKGZ1bmN0aW9uKGFuc3dlclApIHtcclxuICAgICAgICAvLyAgICAgUShhbnN3ZXJQKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgLy8gVXNlIHRoaXMgaW4gdGhlIG1lYW50aW1lXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFuc3dlclBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIFEoYW5zd2VyUHNbaV0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUucmFjZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oUS5yYWNlKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgUHJvbWlzZSB3aXRoIGEgcHJvbWlzZSBkZXNjcmlwdG9yIG9iamVjdCBhbmQgb3B0aW9uYWwgZmFsbGJhY2tcclxuICogZnVuY3Rpb24uICBUaGUgZGVzY3JpcHRvciBjb250YWlucyBtZXRob2RzIGxpa2Ugd2hlbihyZWplY3RlZCksIGdldChuYW1lKSxcclxuICogc2V0KG5hbWUsIHZhbHVlKSwgcG9zdChuYW1lLCBhcmdzKSwgYW5kIGRlbGV0ZShuYW1lKSwgd2hpY2ggYWxsXHJcbiAqIHJldHVybiBlaXRoZXIgYSB2YWx1ZSwgYSBwcm9taXNlIGZvciBhIHZhbHVlLCBvciBhIHJlamVjdGlvbi4gIFRoZSBmYWxsYmFja1xyXG4gKiBhY2NlcHRzIHRoZSBvcGVyYXRpb24gbmFtZSwgYSByZXNvbHZlciwgYW5kIGFueSBmdXJ0aGVyIGFyZ3VtZW50cyB0aGF0IHdvdWxkXHJcbiAqIGhhdmUgYmVlbiBmb3J3YXJkZWQgdG8gdGhlIGFwcHJvcHJpYXRlIG1ldGhvZCBhYm92ZSBoYWQgYSBtZXRob2QgYmVlblxyXG4gKiBwcm92aWRlZCB3aXRoIHRoZSBwcm9wZXIgbmFtZS4gIFRoZSBBUEkgbWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCB0aGUgbmF0dXJlXHJcbiAqIG9mIHRoZSByZXR1cm5lZCBvYmplY3QsIGFwYXJ0IGZyb20gdGhhdCBpdCBpcyB1c2FibGUgd2hlcmVldmVyIHByb21pc2VzIGFyZVxyXG4gKiBib3VnaHQgYW5kIHNvbGQuXHJcbiAqL1xyXG5RLm1ha2VQcm9taXNlID0gUHJvbWlzZTtcclxuZnVuY3Rpb24gUHJvbWlzZShkZXNjcmlwdG9yLCBmYWxsYmFjaywgaW5zcGVjdCkge1xyXG4gICAgaWYgKGZhbGxiYWNrID09PSB2b2lkIDApIHtcclxuICAgICAgICBmYWxsYmFjayA9IGZ1bmN0aW9uIChvcCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihcclxuICAgICAgICAgICAgICAgIFwiUHJvbWlzZSBkb2VzIG5vdCBzdXBwb3J0IG9wZXJhdGlvbjogXCIgKyBvcFxyXG4gICAgICAgICAgICApKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgaWYgKGluc3BlY3QgPT09IHZvaWQgMCkge1xyXG4gICAgICAgIGluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7c3RhdGU6IFwidW5rbm93blwifTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwcm9taXNlID0gb2JqZWN0X2NyZWF0ZShQcm9taXNlLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIGFyZ3MpIHtcclxuICAgICAgICB2YXIgcmVzdWx0O1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChkZXNjcmlwdG9yW29wXSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZGVzY3JpcHRvcltvcF0uYXBwbHkocHJvbWlzZSwgYXJncyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxsYmFjay5jYWxsKHByb21pc2UsIG9wLCBhcmdzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICByZXN1bHQgPSByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHJlc29sdmUpIHtcclxuICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgcHJvbWlzZS5pbnNwZWN0ID0gaW5zcGVjdDtcclxuXHJcbiAgICAvLyBYWFggZGVwcmVjYXRlZCBgdmFsdWVPZmAgYW5kIGBleGNlcHRpb25gIHN1cHBvcnRcclxuICAgIGlmIChpbnNwZWN0KSB7XHJcbiAgICAgICAgdmFyIGluc3BlY3RlZCA9IGluc3BlY3QoKTtcclxuICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcInJlamVjdGVkXCIpIHtcclxuICAgICAgICAgICAgcHJvbWlzZS5leGNlcHRpb24gPSBpbnNwZWN0ZWQucmVhc29uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvbWlzZS52YWx1ZU9mID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgaW5zcGVjdGVkID0gaW5zcGVjdCgpO1xyXG4gICAgICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcInBlbmRpbmdcIiB8fFxyXG4gICAgICAgICAgICAgICAgaW5zcGVjdGVkLnN0YXRlID09PSBcInJlamVjdGVkXCIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBpbnNwZWN0ZWQudmFsdWU7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcHJvbWlzZTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gXCJbb2JqZWN0IFByb21pc2VdXCI7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICB2YXIgZG9uZSA9IGZhbHNlOyAgIC8vIGVuc3VyZSB0aGUgdW50cnVzdGVkIHByb21pc2UgbWFrZXMgYXQgbW9zdCBhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNpbmdsZSBjYWxsIHRvIG9uZSBvZiB0aGUgY2FsbGJhY2tzXHJcblxyXG4gICAgZnVuY3Rpb24gX2Z1bGZpbGxlZCh2YWx1ZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlb2YgZnVsZmlsbGVkID09PSBcImZ1bmN0aW9uXCIgPyBmdWxmaWxsZWQodmFsdWUpIDogdmFsdWU7XHJcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gX3JlamVjdGVkKGV4Y2VwdGlvbikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgcmVqZWN0ZWQgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICBtYWtlU3RhY2tUcmFjZUxvbmcoZXhjZXB0aW9uLCBzZWxmKTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3RlZChleGNlcHRpb24pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChuZXdFeGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3RXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gX3Byb2dyZXNzZWQodmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gdHlwZW9mIHByb2dyZXNzZWQgPT09IFwiZnVuY3Rpb25cIiA/IHByb2dyZXNzZWQodmFsdWUpIDogdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoZG9uZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfZnVsZmlsbGVkKHZhbHVlKSk7XHJcbiAgICAgICAgfSwgXCJ3aGVuXCIsIFtmdW5jdGlvbiAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgIGlmIChkb25lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZG9uZSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKF9yZWplY3RlZChleGNlcHRpb24pKTtcclxuICAgICAgICB9XSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQcm9ncmVzcyBwcm9wYWdhdG9yIG5lZWQgdG8gYmUgYXR0YWNoZWQgaW4gdGhlIGN1cnJlbnQgdGljay5cclxuICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKHZvaWQgMCwgXCJ3aGVuXCIsIFt2b2lkIDAsIGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHZhciBuZXdWYWx1ZTtcclxuICAgICAgICB2YXIgdGhyZXcgPSBmYWxzZTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBuZXdWYWx1ZSA9IF9wcm9ncmVzc2VkKHZhbHVlKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIHRocmV3ID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKFEub25lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgUS5vbmVycm9yKGUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKCF0aHJldykge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5ub3RpZnkobmV3VmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1dKTtcclxuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWdpc3RlcnMgYW4gb2JzZXJ2ZXIgb24gYSBwcm9taXNlLlxyXG4gKlxyXG4gKiBHdWFyYW50ZWVzOlxyXG4gKlxyXG4gKiAxLiB0aGF0IGZ1bGZpbGxlZCBhbmQgcmVqZWN0ZWQgd2lsbCBiZSBjYWxsZWQgb25seSBvbmNlLlxyXG4gKiAyLiB0aGF0IGVpdGhlciB0aGUgZnVsZmlsbGVkIGNhbGxiYWNrIG9yIHRoZSByZWplY3RlZCBjYWxsYmFjayB3aWxsIGJlXHJcbiAqICAgIGNhbGxlZCwgYnV0IG5vdCBib3RoLlxyXG4gKiAzLiB0aGF0IGZ1bGZpbGxlZCBhbmQgcmVqZWN0ZWQgd2lsbCBub3QgYmUgY2FsbGVkIGluIHRoaXMgdHVybi5cclxuICpcclxuICogQHBhcmFtIHZhbHVlICAgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIHRvIG9ic2VydmVcclxuICogQHBhcmFtIGZ1bGZpbGxlZCAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIGZ1bGZpbGxlZCB2YWx1ZVxyXG4gKiBAcGFyYW0gcmVqZWN0ZWQgICBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgcmVqZWN0aW9uIGV4Y2VwdGlvblxyXG4gKiBAcGFyYW0gcHJvZ3Jlc3NlZCBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gYW55IHByb2dyZXNzIG5vdGlmaWNhdGlvbnNcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIGZyb20gdGhlIGludm9rZWQgY2FsbGJhY2tcclxuICovXHJcblEud2hlbiA9IHdoZW47XHJcbmZ1bmN0aW9uIHdoZW4odmFsdWUsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpIHtcclxuICAgIHJldHVybiBRKHZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzZWQpO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuUmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAoKSB7IHJldHVybiB2YWx1ZTsgfSk7XHJcbn07XHJcblxyXG5RLnRoZW5SZXNvbHZlID0gZnVuY3Rpb24gKHByb21pc2UsIHZhbHVlKSB7XHJcbiAgICByZXR1cm4gUShwcm9taXNlKS50aGVuUmVzb2x2ZSh2YWx1ZSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHJlYXNvbikge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAoKSB7IHRocm93IHJlYXNvbjsgfSk7XHJcbn07XHJcblxyXG5RLnRoZW5SZWplY3QgPSBmdW5jdGlvbiAocHJvbWlzZSwgcmVhc29uKSB7XHJcbiAgICByZXR1cm4gUShwcm9taXNlKS50aGVuUmVqZWN0KHJlYXNvbik7XHJcbn07XHJcblxyXG4vKipcclxuICogSWYgYW4gb2JqZWN0IGlzIG5vdCBhIHByb21pc2UsIGl0IGlzIGFzIFwibmVhclwiIGFzIHBvc3NpYmxlLlxyXG4gKiBJZiBhIHByb21pc2UgaXMgcmVqZWN0ZWQsIGl0IGlzIGFzIFwibmVhclwiIGFzIHBvc3NpYmxlIHRvby5cclxuICogSWYgaXTigJlzIGEgZnVsZmlsbGVkIHByb21pc2UsIHRoZSBmdWxmaWxsbWVudCB2YWx1ZSBpcyBuZWFyZXIuXHJcbiAqIElmIGl04oCZcyBhIGRlZmVycmVkIHByb21pc2UgYW5kIHRoZSBkZWZlcnJlZCBoYXMgYmVlbiByZXNvbHZlZCwgdGhlXHJcbiAqIHJlc29sdXRpb24gaXMgXCJuZWFyZXJcIi5cclxuICogQHBhcmFtIG9iamVjdFxyXG4gKiBAcmV0dXJucyBtb3N0IHJlc29sdmVkIChuZWFyZXN0KSBmb3JtIG9mIHRoZSBvYmplY3RcclxuICovXHJcblxyXG4vLyBYWFggc2hvdWxkIHdlIHJlLWRvIHRoaXM/XHJcblEubmVhcmVyID0gbmVhcmVyO1xyXG5mdW5jdGlvbiBuZWFyZXIodmFsdWUpIHtcclxuICAgIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XHJcbiAgICAgICAgdmFyIGluc3BlY3RlZCA9IHZhbHVlLmluc3BlY3QoKTtcclxuICAgICAgICBpZiAoaW5zcGVjdGVkLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBpbnNwZWN0ZWQudmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59XHJcblxyXG4vKipcclxuICogQHJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGEgcHJvbWlzZS5cclxuICogT3RoZXJ3aXNlIGl0IGlzIGEgZnVsZmlsbGVkIHZhbHVlLlxyXG4gKi9cclxuUS5pc1Byb21pc2UgPSBpc1Byb21pc2U7XHJcbmZ1bmN0aW9uIGlzUHJvbWlzZShvYmplY3QpIHtcclxuICAgIHJldHVybiBpc09iamVjdChvYmplY3QpICYmXHJcbiAgICAgICAgdHlwZW9mIG9iamVjdC5wcm9taXNlRGlzcGF0Y2ggPT09IFwiZnVuY3Rpb25cIiAmJlxyXG4gICAgICAgIHR5cGVvZiBvYmplY3QuaW5zcGVjdCA9PT0gXCJmdW5jdGlvblwiO1xyXG59XHJcblxyXG5RLmlzUHJvbWlzZUFsaWtlID0gaXNQcm9taXNlQWxpa2U7XHJcbmZ1bmN0aW9uIGlzUHJvbWlzZUFsaWtlKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIGlzT2JqZWN0KG9iamVjdCkgJiYgdHlwZW9mIG9iamVjdC50aGVuID09PSBcImZ1bmN0aW9uXCI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBwZW5kaW5nIHByb21pc2UsIG1lYW5pbmcgbm90XHJcbiAqIGZ1bGZpbGxlZCBvciByZWplY3RlZC5cclxuICovXHJcblEuaXNQZW5kaW5nID0gaXNQZW5kaW5nO1xyXG5mdW5jdGlvbiBpc1BlbmRpbmcob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gaXNQcm9taXNlKG9iamVjdCkgJiYgb2JqZWN0Lmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJwZW5kaW5nXCI7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmlzUGVuZGluZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJwZW5kaW5nXCI7XHJcbn07XHJcblxyXG4vKipcclxuICogQHJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGEgdmFsdWUgb3IgZnVsZmlsbGVkXHJcbiAqIHByb21pc2UuXHJcbiAqL1xyXG5RLmlzRnVsZmlsbGVkID0gaXNGdWxmaWxsZWQ7XHJcbmZ1bmN0aW9uIGlzRnVsZmlsbGVkKG9iamVjdCkge1xyXG4gICAgcmV0dXJuICFpc1Byb21pc2Uob2JqZWN0KSB8fCBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5pc0Z1bGZpbGxlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSByZWplY3RlZCBwcm9taXNlLlxyXG4gKi9cclxuUS5pc1JlamVjdGVkID0gaXNSZWplY3RlZDtcclxuZnVuY3Rpb24gaXNSZWplY3RlZChvYmplY3QpIHtcclxuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmlzUmVqZWN0ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwicmVqZWN0ZWRcIjtcclxufTtcclxuXHJcbi8vLy8gQkVHSU4gVU5IQU5ETEVEIFJFSkVDVElPTiBUUkFDS0lOR1xyXG5cclxuLy8gVGhpcyBwcm9taXNlIGxpYnJhcnkgY29uc3VtZXMgZXhjZXB0aW9ucyB0aHJvd24gaW4gaGFuZGxlcnMgc28gdGhleSBjYW4gYmVcclxuLy8gaGFuZGxlZCBieSBhIHN1YnNlcXVlbnQgcHJvbWlzZS4gIFRoZSBleGNlcHRpb25zIGdldCBhZGRlZCB0byB0aGlzIGFycmF5IHdoZW5cclxuLy8gdGhleSBhcmUgY3JlYXRlZCwgYW5kIHJlbW92ZWQgd2hlbiB0aGV5IGFyZSBoYW5kbGVkLiAgTm90ZSB0aGF0IGluIEVTNiBvclxyXG4vLyBzaGltbWVkIGVudmlyb25tZW50cywgdGhpcyB3b3VsZCBuYXR1cmFsbHkgYmUgYSBgU2V0YC5cclxudmFyIHVuaGFuZGxlZFJlYXNvbnMgPSBbXTtcclxudmFyIHVuaGFuZGxlZFJlamVjdGlvbnMgPSBbXTtcclxudmFyIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IHRydWU7XHJcblxyXG5mdW5jdGlvbiByZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKSB7XHJcbiAgICB1bmhhbmRsZWRSZWFzb25zLmxlbmd0aCA9IDA7XHJcbiAgICB1bmhhbmRsZWRSZWplY3Rpb25zLmxlbmd0aCA9IDA7XHJcblxyXG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcclxuICAgICAgICB0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMgPSB0cnVlO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFja1JlamVjdGlvbihwcm9taXNlLCByZWFzb24pIHtcclxuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHVuaGFuZGxlZFJlamVjdGlvbnMucHVzaChwcm9taXNlKTtcclxuICAgIGlmIChyZWFzb24gJiYgdHlwZW9mIHJlYXNvbi5zdGFjayAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChyZWFzb24uc3RhY2spO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnB1c2goXCIobm8gc3RhY2spIFwiICsgcmVhc29uKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdW50cmFja1JlamVjdGlvbihwcm9taXNlKSB7XHJcbiAgICBpZiAoIXRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgYXQgPSBhcnJheV9pbmRleE9mKHVuaGFuZGxlZFJlamVjdGlvbnMsIHByb21pc2UpO1xyXG4gICAgaWYgKGF0ICE9PSAtMSkge1xyXG4gICAgICAgIHVuaGFuZGxlZFJlamVjdGlvbnMuc3BsaWNlKGF0LCAxKTtcclxuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnNwbGljZShhdCwgMSk7XHJcbiAgICB9XHJcbn1cclxuXHJcblEucmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zID0gcmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zO1xyXG5cclxuUS5nZXRVbmhhbmRsZWRSZWFzb25zID0gZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gTWFrZSBhIGNvcHkgc28gdGhhdCBjb25zdW1lcnMgY2FuJ3QgaW50ZXJmZXJlIHdpdGggb3VyIGludGVybmFsIHN0YXRlLlxyXG4gICAgcmV0dXJuIHVuaGFuZGxlZFJlYXNvbnMuc2xpY2UoKTtcclxufTtcclxuXHJcblEuc3RvcFVuaGFuZGxlZFJlamVjdGlvblRyYWNraW5nID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCk7XHJcbiAgICB0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMgPSBmYWxzZTtcclxufTtcclxuXHJcbnJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpO1xyXG5cclxuLy8vLyBFTkQgVU5IQU5ETEVEIFJFSkVDVElPTiBUUkFDS0lOR1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSByZWplY3RlZCBwcm9taXNlLlxyXG4gKiBAcGFyYW0gcmVhc29uIHZhbHVlIGRlc2NyaWJpbmcgdGhlIGZhaWx1cmVcclxuICovXHJcblEucmVqZWN0ID0gcmVqZWN0O1xyXG5mdW5jdGlvbiByZWplY3QocmVhc29uKSB7XHJcbiAgICB2YXIgcmVqZWN0aW9uID0gUHJvbWlzZSh7XHJcbiAgICAgICAgXCJ3aGVuXCI6IGZ1bmN0aW9uIChyZWplY3RlZCkge1xyXG4gICAgICAgICAgICAvLyBub3RlIHRoYXQgdGhlIGVycm9yIGhhcyBiZWVuIGhhbmRsZWRcclxuICAgICAgICAgICAgaWYgKHJlamVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICB1bnRyYWNrUmVqZWN0aW9uKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZWplY3RlZCA/IHJlamVjdGVkKHJlYXNvbikgOiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgIH0sIGZ1bmN0aW9uIGZhbGxiYWNrKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcclxuICAgICAgICByZXR1cm4geyBzdGF0ZTogXCJyZWplY3RlZFwiLCByZWFzb246IHJlYXNvbiB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTm90ZSB0aGF0IHRoZSByZWFzb24gaGFzIG5vdCBiZWVuIGhhbmRsZWQuXHJcbiAgICB0cmFja1JlamVjdGlvbihyZWplY3Rpb24sIHJlYXNvbik7XHJcblxyXG4gICAgcmV0dXJuIHJlamVjdGlvbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBmdWxmaWxsZWQgcHJvbWlzZSBmb3IgYW4gaW1tZWRpYXRlIHJlZmVyZW5jZS5cclxuICogQHBhcmFtIHZhbHVlIGltbWVkaWF0ZSByZWZlcmVuY2VcclxuICovXHJcblEuZnVsZmlsbCA9IGZ1bGZpbGw7XHJcbmZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHtcclxuICAgIHJldHVybiBQcm9taXNlKHtcclxuICAgICAgICBcIndoZW5cIjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcImdldFwiOiBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVbbmFtZV07XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcInNldFwiOiBmdW5jdGlvbiAobmFtZSwgcmhzKSB7XHJcbiAgICAgICAgICAgIHZhbHVlW25hbWVdID0gcmhzO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJkZWxldGVcIjogZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgICAgICAgICAgZGVsZXRlIHZhbHVlW25hbWVdO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJwb3N0XCI6IGZ1bmN0aW9uIChuYW1lLCBhcmdzKSB7XHJcbiAgICAgICAgICAgIC8vIE1hcmsgTWlsbGVyIHByb3Bvc2VzIHRoYXQgcG9zdCB3aXRoIG5vIG5hbWUgc2hvdWxkIGFwcGx5IGFcclxuICAgICAgICAgICAgLy8gcHJvbWlzZWQgZnVuY3Rpb24uXHJcbiAgICAgICAgICAgIGlmIChuYW1lID09PSBudWxsIHx8IG5hbWUgPT09IHZvaWQgMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmFwcGx5KHZvaWQgMCwgYXJncyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWVbbmFtZV0uYXBwbHkodmFsdWUsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcImFwcGx5XCI6IGZ1bmN0aW9uICh0aGlzcCwgYXJncykge1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWUuYXBwbHkodGhpc3AsIGFyZ3MpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJrZXlzXCI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdF9rZXlzKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICB9LCB2b2lkIDAsIGZ1bmN0aW9uIGluc3BlY3QoKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwiZnVsZmlsbGVkXCIsIHZhbHVlOiB2YWx1ZSB9O1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGVuYWJsZXMgdG8gUSBwcm9taXNlcy5cclxuICogQHBhcmFtIHByb21pc2UgdGhlbmFibGUgcHJvbWlzZVxyXG4gKiBAcmV0dXJucyBhIFEgcHJvbWlzZVxyXG4gKi9cclxuZnVuY3Rpb24gY29lcmNlKHByb21pc2UpIHtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcHJvbWlzZS50aGVuKGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCwgZGVmZXJyZWQubm90aWZ5KTtcclxuICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFubm90YXRlcyBhbiBvYmplY3Qgc3VjaCB0aGF0IGl0IHdpbGwgbmV2ZXIgYmVcclxuICogdHJhbnNmZXJyZWQgYXdheSBmcm9tIHRoaXMgcHJvY2VzcyBvdmVyIGFueSBwcm9taXNlXHJcbiAqIGNvbW11bmljYXRpb24gY2hhbm5lbC5cclxuICogQHBhcmFtIG9iamVjdFxyXG4gKiBAcmV0dXJucyBwcm9taXNlIGEgd3JhcHBpbmcgb2YgdGhhdCBvYmplY3QgdGhhdFxyXG4gKiBhZGRpdGlvbmFsbHkgcmVzcG9uZHMgdG8gdGhlIFwiaXNEZWZcIiBtZXNzYWdlXHJcbiAqIHdpdGhvdXQgYSByZWplY3Rpb24uXHJcbiAqL1xyXG5RLm1hc3RlciA9IG1hc3RlcjtcclxuZnVuY3Rpb24gbWFzdGVyKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIFByb21pc2Uoe1xyXG4gICAgICAgIFwiaXNEZWZcIjogZnVuY3Rpb24gKCkge31cclxuICAgIH0sIGZ1bmN0aW9uIGZhbGxiYWNrKG9wLCBhcmdzKSB7XHJcbiAgICAgICAgcmV0dXJuIGRpc3BhdGNoKG9iamVjdCwgb3AsIGFyZ3MpO1xyXG4gICAgfSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBRKG9iamVjdCkuaW5zcGVjdCgpO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTcHJlYWRzIHRoZSB2YWx1ZXMgb2YgYSBwcm9taXNlZCBhcnJheSBvZiBhcmd1bWVudHMgaW50byB0aGVcclxuICogZnVsZmlsbG1lbnQgY2FsbGJhY2suXHJcbiAqIEBwYXJhbSBmdWxmaWxsZWQgY2FsbGJhY2sgdGhhdCByZWNlaXZlcyB2YXJpYWRpYyBhcmd1bWVudHMgZnJvbSB0aGVcclxuICogcHJvbWlzZWQgYXJyYXlcclxuICogQHBhcmFtIHJlamVjdGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdGhlIGV4Y2VwdGlvbiBpZiB0aGUgcHJvbWlzZVxyXG4gKiBpcyByZWplY3RlZC5cclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIG9yIHRocm93biBleGNlcHRpb24gb2ZcclxuICogZWl0aGVyIGNhbGxiYWNrLlxyXG4gKi9cclxuUS5zcHJlYWQgPSBzcHJlYWQ7XHJcbmZ1bmN0aW9uIHNwcmVhZCh2YWx1ZSwgZnVsZmlsbGVkLCByZWplY3RlZCkge1xyXG4gICAgcmV0dXJuIFEodmFsdWUpLnNwcmVhZChmdWxmaWxsZWQsIHJlamVjdGVkKTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuc3ByZWFkID0gZnVuY3Rpb24gKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpIHtcclxuICAgIHJldHVybiB0aGlzLmFsbCgpLnRoZW4oZnVuY3Rpb24gKGFycmF5KSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGxlZC5hcHBseSh2b2lkIDAsIGFycmF5KTtcclxuICAgIH0sIHJlamVjdGVkKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUaGUgYXN5bmMgZnVuY3Rpb24gaXMgYSBkZWNvcmF0b3IgZm9yIGdlbmVyYXRvciBmdW5jdGlvbnMsIHR1cm5pbmdcclxuICogdGhlbSBpbnRvIGFzeW5jaHJvbm91cyBnZW5lcmF0b3JzLiAgQWx0aG91Z2ggZ2VuZXJhdG9ycyBhcmUgb25seSBwYXJ0XHJcbiAqIG9mIHRoZSBuZXdlc3QgRUNNQVNjcmlwdCA2IGRyYWZ0cywgdGhpcyBjb2RlIGRvZXMgbm90IGNhdXNlIHN5bnRheFxyXG4gKiBlcnJvcnMgaW4gb2xkZXIgZW5naW5lcy4gIFRoaXMgY29kZSBzaG91bGQgY29udGludWUgdG8gd29yayBhbmQgd2lsbFxyXG4gKiBpbiBmYWN0IGltcHJvdmUgb3ZlciB0aW1lIGFzIHRoZSBsYW5ndWFnZSBpbXByb3Zlcy5cclxuICpcclxuICogRVM2IGdlbmVyYXRvcnMgYXJlIGN1cnJlbnRseSBwYXJ0IG9mIFY4IHZlcnNpb24gMy4xOSB3aXRoIHRoZVxyXG4gKiAtLWhhcm1vbnktZ2VuZXJhdG9ycyBydW50aW1lIGZsYWcgZW5hYmxlZC4gIFNwaWRlck1vbmtleSBoYXMgaGFkIHRoZW1cclxuICogZm9yIGxvbmdlciwgYnV0IHVuZGVyIGFuIG9sZGVyIFB5dGhvbi1pbnNwaXJlZCBmb3JtLiAgVGhpcyBmdW5jdGlvblxyXG4gKiB3b3JrcyBvbiBib3RoIGtpbmRzIG9mIGdlbmVyYXRvcnMuXHJcbiAqXHJcbiAqIERlY29yYXRlcyBhIGdlbmVyYXRvciBmdW5jdGlvbiBzdWNoIHRoYXQ6XHJcbiAqICAtIGl0IG1heSB5aWVsZCBwcm9taXNlc1xyXG4gKiAgLSBleGVjdXRpb24gd2lsbCBjb250aW51ZSB3aGVuIHRoYXQgcHJvbWlzZSBpcyBmdWxmaWxsZWRcclxuICogIC0gdGhlIHZhbHVlIG9mIHRoZSB5aWVsZCBleHByZXNzaW9uIHdpbGwgYmUgdGhlIGZ1bGZpbGxlZCB2YWx1ZVxyXG4gKiAgLSBpdCByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSAod2hlbiB0aGUgZ2VuZXJhdG9yXHJcbiAqICAgIHN0b3BzIGl0ZXJhdGluZylcclxuICogIC0gdGhlIGRlY29yYXRlZCBmdW5jdGlvbiByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxyXG4gKiAgICBvZiB0aGUgZ2VuZXJhdG9yIG9yIHRoZSBmaXJzdCByZWplY3RlZCBwcm9taXNlIGFtb25nIHRob3NlXHJcbiAqICAgIHlpZWxkZWQuXHJcbiAqICAtIGlmIGFuIGVycm9yIGlzIHRocm93biBpbiB0aGUgZ2VuZXJhdG9yLCBpdCBwcm9wYWdhdGVzIHRocm91Z2hcclxuICogICAgZXZlcnkgZm9sbG93aW5nIHlpZWxkIHVudGlsIGl0IGlzIGNhdWdodCwgb3IgdW50aWwgaXQgZXNjYXBlc1xyXG4gKiAgICB0aGUgZ2VuZXJhdG9yIGZ1bmN0aW9uIGFsdG9nZXRoZXIsIGFuZCBpcyB0cmFuc2xhdGVkIGludG8gYVxyXG4gKiAgICByZWplY3Rpb24gZm9yIHRoZSBwcm9taXNlIHJldHVybmVkIGJ5IHRoZSBkZWNvcmF0ZWQgZ2VuZXJhdG9yLlxyXG4gKi9cclxuUS5hc3luYyA9IGFzeW5jO1xyXG5mdW5jdGlvbiBhc3luYyhtYWtlR2VuZXJhdG9yKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIC8vIHdoZW4gdmVyYiBpcyBcInNlbmRcIiwgYXJnIGlzIGEgdmFsdWVcclxuICAgICAgICAvLyB3aGVuIHZlcmIgaXMgXCJ0aHJvd1wiLCBhcmcgaXMgYW4gZXhjZXB0aW9uXHJcbiAgICAgICAgZnVuY3Rpb24gY29udGludWVyKHZlcmIsIGFyZykge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0O1xyXG5cclxuICAgICAgICAgICAgLy8gVW50aWwgVjggMy4xOSAvIENocm9taXVtIDI5IGlzIHJlbGVhc2VkLCBTcGlkZXJNb25rZXkgaXMgdGhlIG9ubHlcclxuICAgICAgICAgICAgLy8gZW5naW5lIHRoYXQgaGFzIGEgZGVwbG95ZWQgYmFzZSBvZiBicm93c2VycyB0aGF0IHN1cHBvcnQgZ2VuZXJhdG9ycy5cclxuICAgICAgICAgICAgLy8gSG93ZXZlciwgU00ncyBnZW5lcmF0b3JzIHVzZSB0aGUgUHl0aG9uLWluc3BpcmVkIHNlbWFudGljcyBvZlxyXG4gICAgICAgICAgICAvLyBvdXRkYXRlZCBFUzYgZHJhZnRzLiAgV2Ugd291bGQgbGlrZSB0byBzdXBwb3J0IEVTNiwgYnV0IHdlJ2QgYWxzb1xyXG4gICAgICAgICAgICAvLyBsaWtlIHRvIG1ha2UgaXQgcG9zc2libGUgdG8gdXNlIGdlbmVyYXRvcnMgaW4gZGVwbG95ZWQgYnJvd3NlcnMsIHNvXHJcbiAgICAgICAgICAgIC8vIHdlIGFsc28gc3VwcG9ydCBQeXRob24tc3R5bGUgZ2VuZXJhdG9ycy4gIEF0IHNvbWUgcG9pbnQgd2UgY2FuIHJlbW92ZVxyXG4gICAgICAgICAgICAvLyB0aGlzIGJsb2NrLlxyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBTdG9wSXRlcmF0aW9uID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBFUzYgR2VuZXJhdG9yc1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0b3JbdmVyYl0oYXJnKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuZG9uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBRKHJlc3VsdC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB3aGVuKHJlc3VsdC52YWx1ZSwgY2FsbGJhY2ssIGVycmJhY2spO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gU3BpZGVyTW9ua2V5IEdlbmVyYXRvcnNcclxuICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBSZW1vdmUgdGhpcyBjYXNlIHdoZW4gU00gZG9lcyBFUzYgZ2VuZXJhdG9ycy5cclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZ2VuZXJhdG9yW3ZlcmJdKGFyZyk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNTdG9wSXRlcmF0aW9uKGV4Y2VwdGlvbikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFEoZXhjZXB0aW9uLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHdoZW4ocmVzdWx0LCBjYWxsYmFjaywgZXJyYmFjayk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGdlbmVyYXRvciA9IG1ha2VHZW5lcmF0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBjb250aW51ZXIuYmluZChjb250aW51ZXIsIFwibmV4dFwiKTtcclxuICAgICAgICB2YXIgZXJyYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJ0aHJvd1wiKTtcclxuICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGUgc3Bhd24gZnVuY3Rpb24gaXMgYSBzbWFsbCB3cmFwcGVyIGFyb3VuZCBhc3luYyB0aGF0IGltbWVkaWF0ZWx5XHJcbiAqIGNhbGxzIHRoZSBnZW5lcmF0b3IgYW5kIGFsc28gZW5kcyB0aGUgcHJvbWlzZSBjaGFpbiwgc28gdGhhdCBhbnlcclxuICogdW5oYW5kbGVkIGVycm9ycyBhcmUgdGhyb3duIGluc3RlYWQgb2YgZm9yd2FyZGVkIHRvIHRoZSBlcnJvclxyXG4gKiBoYW5kbGVyLiBUaGlzIGlzIHVzZWZ1bCBiZWNhdXNlIGl0J3MgZXh0cmVtZWx5IGNvbW1vbiB0byBydW5cclxuICogZ2VuZXJhdG9ycyBhdCB0aGUgdG9wLWxldmVsIHRvIHdvcmsgd2l0aCBsaWJyYXJpZXMuXHJcbiAqL1xyXG5RLnNwYXduID0gc3Bhd247XHJcbmZ1bmN0aW9uIHNwYXduKG1ha2VHZW5lcmF0b3IpIHtcclxuICAgIFEuZG9uZShRLmFzeW5jKG1ha2VHZW5lcmF0b3IpKCkpO1xyXG59XHJcblxyXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgaW50ZXJmYWNlIG9uY2UgRVM2IGdlbmVyYXRvcnMgYXJlIGluIFNwaWRlck1vbmtleS5cclxuLyoqXHJcbiAqIFRocm93cyBhIFJldHVyblZhbHVlIGV4Y2VwdGlvbiB0byBzdG9wIGFuIGFzeW5jaHJvbm91cyBnZW5lcmF0b3IuXHJcbiAqXHJcbiAqIFRoaXMgaW50ZXJmYWNlIGlzIGEgc3RvcC1nYXAgbWVhc3VyZSB0byBzdXBwb3J0IGdlbmVyYXRvciByZXR1cm5cclxuICogdmFsdWVzIGluIG9sZGVyIEZpcmVmb3gvU3BpZGVyTW9ua2V5LiAgSW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEVTNlxyXG4gKiBnZW5lcmF0b3JzIGxpa2UgQ2hyb21pdW0gMjksIGp1c3QgdXNlIFwicmV0dXJuXCIgaW4geW91ciBnZW5lcmF0b3JcclxuICogZnVuY3Rpb25zLlxyXG4gKlxyXG4gKiBAcGFyYW0gdmFsdWUgdGhlIHJldHVybiB2YWx1ZSBmb3IgdGhlIHN1cnJvdW5kaW5nIGdlbmVyYXRvclxyXG4gKiBAdGhyb3dzIFJldHVyblZhbHVlIGV4Y2VwdGlvbiB3aXRoIHRoZSB2YWx1ZS5cclxuICogQGV4YW1wbGVcclxuICogLy8gRVM2IHN0eWxlXHJcbiAqIFEuYXN5bmMoZnVuY3Rpb24qICgpIHtcclxuICogICAgICB2YXIgZm9vID0geWllbGQgZ2V0Rm9vUHJvbWlzZSgpO1xyXG4gKiAgICAgIHZhciBiYXIgPSB5aWVsZCBnZXRCYXJQcm9taXNlKCk7XHJcbiAqICAgICAgcmV0dXJuIGZvbyArIGJhcjtcclxuICogfSlcclxuICogLy8gT2xkZXIgU3BpZGVyTW9ua2V5IHN0eWxlXHJcbiAqIFEuYXN5bmMoZnVuY3Rpb24gKCkge1xyXG4gKiAgICAgIHZhciBmb28gPSB5aWVsZCBnZXRGb29Qcm9taXNlKCk7XHJcbiAqICAgICAgdmFyIGJhciA9IHlpZWxkIGdldEJhclByb21pc2UoKTtcclxuICogICAgICBRLnJldHVybihmb28gKyBiYXIpO1xyXG4gKiB9KVxyXG4gKi9cclxuUVtcInJldHVyblwiXSA9IF9yZXR1cm47XHJcbmZ1bmN0aW9uIF9yZXR1cm4odmFsdWUpIHtcclxuICAgIHRocm93IG5ldyBRUmV0dXJuVmFsdWUodmFsdWUpO1xyXG59XHJcblxyXG4vKipcclxuICogVGhlIHByb21pc2VkIGZ1bmN0aW9uIGRlY29yYXRvciBlbnN1cmVzIHRoYXQgYW55IHByb21pc2UgYXJndW1lbnRzXHJcbiAqIGFyZSBzZXR0bGVkIGFuZCBwYXNzZWQgYXMgdmFsdWVzIChgdGhpc2AgaXMgYWxzbyBzZXR0bGVkIGFuZCBwYXNzZWRcclxuICogYXMgYSB2YWx1ZSkuICBJdCB3aWxsIGFsc28gZW5zdXJlIHRoYXQgdGhlIHJlc3VsdCBvZiBhIGZ1bmN0aW9uIGlzXHJcbiAqIGFsd2F5cyBhIHByb21pc2UuXHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIHZhciBhZGQgPSBRLnByb21pc2VkKGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAqICAgICByZXR1cm4gYSArIGI7XHJcbiAqIH0pO1xyXG4gKiBhZGQoUShhKSwgUShCKSk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0byBkZWNvcmF0ZVxyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCBoYXMgYmVlbiBkZWNvcmF0ZWQuXHJcbiAqL1xyXG5RLnByb21pc2VkID0gcHJvbWlzZWQ7XHJcbmZ1bmN0aW9uIHByb21pc2VkKGNhbGxiYWNrKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBzcHJlYWQoW3RoaXMsIGFsbChhcmd1bWVudHMpXSwgZnVuY3Rpb24gKHNlbGYsIGFyZ3MpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHNlbGYsIGFyZ3MpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIHNlbmRzIGEgbWVzc2FnZSB0byBhIHZhbHVlIGluIGEgZnV0dXJlIHR1cm5cclxuICogQHBhcmFtIG9iamVjdCogdGhlIHJlY2lwaWVudFxyXG4gKiBAcGFyYW0gb3AgdGhlIG5hbWUgb2YgdGhlIG1lc3NhZ2Ugb3BlcmF0aW9uLCBlLmcuLCBcIndoZW5cIixcclxuICogQHBhcmFtIGFyZ3MgZnVydGhlciBhcmd1bWVudHMgdG8gYmUgZm9yd2FyZGVkIHRvIHRoZSBvcGVyYXRpb25cclxuICogQHJldHVybnMgcmVzdWx0IHtQcm9taXNlfSBhIHByb21pc2UgZm9yIHRoZSByZXN1bHQgb2YgdGhlIG9wZXJhdGlvblxyXG4gKi9cclxuUS5kaXNwYXRjaCA9IGRpc3BhdGNoO1xyXG5mdW5jdGlvbiBkaXNwYXRjaChvYmplY3QsIG9wLCBhcmdzKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKG9wLCBhcmdzKTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZGlzcGF0Y2ggPSBmdW5jdGlvbiAob3AsIGFyZ3MpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2VsZi5wcm9taXNlRGlzcGF0Y2goZGVmZXJyZWQucmVzb2x2ZSwgb3AsIGFyZ3MpO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXRzIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XHJcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBwcm9wZXJ0eSB0byBnZXRcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcHJvcGVydHkgdmFsdWVcclxuICovXHJcblEuZ2V0ID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiZ2V0XCIsIFtrZXldKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwiZ2V0XCIsIFtrZXldKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciBvYmplY3Qgb2JqZWN0XHJcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBwcm9wZXJ0eSB0byBzZXRcclxuICogQHBhcmFtIHZhbHVlICAgICBuZXcgdmFsdWUgb2YgcHJvcGVydHlcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqL1xyXG5RLnNldCA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSwgdmFsdWUpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJzZXRcIiwgW2tleSwgdmFsdWVdKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlbGV0ZXMgYSBwcm9wZXJ0eSBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZGVsZXRlXHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxyXG4gKi9cclxuUS5kZWwgPSAvLyBYWFggbGVnYWN5XHJcblFbXCJkZWxldGVcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJkZWxldGVcIiwgW2tleV0pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZGVsID0gLy8gWFhYIGxlZ2FjeVxyXG5Qcm9taXNlLnByb3RvdHlwZVtcImRlbGV0ZVwiXSA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwiZGVsZXRlXCIsIFtrZXldKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJbnZva2VzIGEgbWV0aG9kIGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XHJcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBtZXRob2QgdG8gaW52b2tlXHJcbiAqIEBwYXJhbSB2YWx1ZSAgICAgYSB2YWx1ZSB0byBwb3N0LCB0eXBpY2FsbHkgYW4gYXJyYXkgb2ZcclxuICogICAgICAgICAgICAgICAgICBpbnZvY2F0aW9uIGFyZ3VtZW50cyBmb3IgcHJvbWlzZXMgdGhhdFxyXG4gKiAgICAgICAgICAgICAgICAgIGFyZSB1bHRpbWF0ZWx5IGJhY2tlZCB3aXRoIGByZXNvbHZlYCB2YWx1ZXMsXHJcbiAqICAgICAgICAgICAgICAgICAgYXMgb3Bwb3NlZCB0byB0aG9zZSBiYWNrZWQgd2l0aCBVUkxzXHJcbiAqICAgICAgICAgICAgICAgICAgd2hlcmVpbiB0aGUgcG9zdGVkIHZhbHVlIGNhbiBiZSBhbnlcclxuICogICAgICAgICAgICAgICAgICBKU09OIHNlcmlhbGl6YWJsZSBvYmplY3QuXHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxyXG4gKi9cclxuLy8gYm91bmQgbG9jYWxseSBiZWNhdXNlIGl0IGlzIHVzZWQgYnkgb3RoZXIgbWV0aG9kc1xyXG5RLm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblEucG9zdCA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIGFyZ3MpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBhcmdzXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5tYXBwbHkgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5Qcm9taXNlLnByb3RvdHlwZS5wb3N0ID0gZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEludm9rZXMgYSBtZXRob2QgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcclxuICogQHBhcmFtIC4uLmFyZ3MgICBhcnJheSBvZiBpbnZvY2F0aW9uIGFyZ3VtZW50c1xyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICovXHJcblEuc2VuZCA9IC8vIFhYWCBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIHBhcmxhbmNlXHJcblEubWNhbGwgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5RLmludm9rZSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUgLyouLi5hcmdzKi8pIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBhcnJheV9zbGljZShhcmd1bWVudHMsIDIpXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5zZW5kID0gLy8gWFhYIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgcGFybGFuY2VcclxuUHJvbWlzZS5wcm90b3R5cGUubWNhbGwgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5Qcm9taXNlLnByb3RvdHlwZS5pbnZva2UgPSBmdW5jdGlvbiAobmFtZSAvKi4uLmFyZ3MqLykge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQXBwbGllcyB0aGUgcHJvbWlzZWQgZnVuY3Rpb24gaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxyXG4gKiBAcGFyYW0gYXJncyAgICAgIGFycmF5IG9mIGFwcGxpY2F0aW9uIGFyZ3VtZW50c1xyXG4gKi9cclxuUS5mYXBwbHkgPSBmdW5jdGlvbiAob2JqZWN0LCBhcmdzKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiYXBwbHlcIiwgW3ZvaWQgMCwgYXJnc10pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZmFwcGx5ID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwiYXBwbHlcIiwgW3ZvaWQgMCwgYXJnc10pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGxzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgYXBwbGljYXRpb24gYXJndW1lbnRzXHJcbiAqL1xyXG5RW1widHJ5XCJdID1cclxuUS5mY2FsbCA9IGZ1bmN0aW9uIChvYmplY3QgLyogLi4uYXJncyovKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiYXBwbHlcIiwgW3ZvaWQgMCwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZmNhbGwgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwiYXBwbHlcIiwgW3ZvaWQgMCwgYXJyYXlfc2xpY2UoYXJndW1lbnRzKV0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEJpbmRzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiwgdHJhbnNmb3JtaW5nIHJldHVybiB2YWx1ZXMgaW50byBhIGZ1bGZpbGxlZFxyXG4gKiBwcm9taXNlIGFuZCB0aHJvd24gZXJyb3JzIGludG8gYSByZWplY3RlZCBvbmUuXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgZnVuY3Rpb25cclxuICogQHBhcmFtIC4uLmFyZ3MgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcclxuICovXHJcblEuZmJpbmQgPSBmdW5jdGlvbiAob2JqZWN0IC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgcHJvbWlzZSA9IFEob2JqZWN0KTtcclxuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcclxuICAgIHJldHVybiBmdW5jdGlvbiBmYm91bmQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2UuZGlzcGF0Y2goXCJhcHBseVwiLCBbXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpXHJcbiAgICAgICAgXSk7XHJcbiAgICB9O1xyXG59O1xyXG5Qcm9taXNlLnByb3RvdHlwZS5mYmluZCA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIHByb21pc2UgPSB0aGlzO1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMpO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGZib3VuZCgpIHtcclxuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgYXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSlcclxuICAgICAgICBdKTtcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogUmVxdWVzdHMgdGhlIG5hbWVzIG9mIHRoZSBvd25lZCBwcm9wZXJ0aWVzIG9mIGEgcHJvbWlzZWRcclxuICogb2JqZWN0IGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIGtleXMgb2YgdGhlIGV2ZW50dWFsbHkgc2V0dGxlZCBvYmplY3RcclxuICovXHJcblEua2V5cyA9IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJrZXlzXCIsIFtdKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImtleXNcIiwgW10pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFR1cm5zIGFuIGFycmF5IG9mIHByb21pc2VzIGludG8gYSBwcm9taXNlIGZvciBhbiBhcnJheS4gIElmIGFueSBvZlxyXG4gKiB0aGUgcHJvbWlzZXMgZ2V0cyByZWplY3RlZCwgdGhlIHdob2xlIGFycmF5IGlzIHJlamVjdGVkIGltbWVkaWF0ZWx5LlxyXG4gKiBAcGFyYW0ge0FycmF5Kn0gYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXHJcbiAqIHByb21pc2VzIGZvciB2YWx1ZXMpXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgb2YgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVzXHJcbiAqL1xyXG4vLyBCeSBNYXJrIE1pbGxlclxyXG4vLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1zdHJhd21hbjpjb25jdXJyZW5jeSZyZXY9MTMwODc3NjUyMSNhbGxmdWxmaWxsZWRcclxuUS5hbGwgPSBhbGw7XHJcbmZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xyXG4gICAgcmV0dXJuIHdoZW4ocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlcykge1xyXG4gICAgICAgIHZhciBjb3VudERvd24gPSAwO1xyXG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICAgICAgYXJyYXlfcmVkdWNlKHByb21pc2VzLCBmdW5jdGlvbiAodW5kZWZpbmVkLCBwcm9taXNlLCBpbmRleCkge1xyXG4gICAgICAgICAgICB2YXIgc25hcHNob3Q7XHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgIGlzUHJvbWlzZShwcm9taXNlKSAmJlxyXG4gICAgICAgICAgICAgICAgKHNuYXBzaG90ID0gcHJvbWlzZS5pbnNwZWN0KCkpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgcHJvbWlzZXNbaW5kZXhdID0gc25hcHNob3QudmFsdWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICArK2NvdW50RG93bjtcclxuICAgICAgICAgICAgICAgIHdoZW4oXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSxcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXNbaW5kZXhdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgtLWNvdW50RG93biA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwcm9taXNlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdCxcclxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAocHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQubm90aWZ5KHsgaW5kZXg6IGluZGV4LCB2YWx1ZTogcHJvZ3Jlc3MgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIHZvaWQgMCk7XHJcbiAgICAgICAgaWYgKGNvdW50RG93biA9PT0gMCkge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICB9KTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuYWxsID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIGFsbCh0aGlzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXYWl0cyBmb3IgYWxsIHByb21pc2VzIHRvIGJlIHNldHRsZWQsIGVpdGhlciBmdWxmaWxsZWQgb3JcclxuICogcmVqZWN0ZWQuICBUaGlzIGlzIGRpc3RpbmN0IGZyb20gYGFsbGAgc2luY2UgdGhhdCB3b3VsZCBzdG9wXHJcbiAqIHdhaXRpbmcgYXQgdGhlIGZpcnN0IHJlamVjdGlvbi4gIFRoZSBwcm9taXNlIHJldHVybmVkIGJ5XHJcbiAqIGBhbGxSZXNvbHZlZGAgd2lsbCBuZXZlciBiZSByZWplY3RlZC5cclxuICogQHBhcmFtIHByb21pc2VzIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgKG9yIGFuIGFycmF5KSBvZiBwcm9taXNlc1xyXG4gKiAob3IgdmFsdWVzKVxyXG4gKiBAcmV0dXJuIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgb2YgcHJvbWlzZXNcclxuICovXHJcblEuYWxsUmVzb2x2ZWQgPSBkZXByZWNhdGUoYWxsUmVzb2x2ZWQsIFwiYWxsUmVzb2x2ZWRcIiwgXCJhbGxTZXR0bGVkXCIpO1xyXG5mdW5jdGlvbiBhbGxSZXNvbHZlZChwcm9taXNlcykge1xyXG4gICAgcmV0dXJuIHdoZW4ocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlcykge1xyXG4gICAgICAgIHByb21pc2VzID0gYXJyYXlfbWFwKHByb21pc2VzLCBRKTtcclxuICAgICAgICByZXR1cm4gd2hlbihhbGwoYXJyYXlfbWFwKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gd2hlbihwcm9taXNlLCBub29wLCBub29wKTtcclxuICAgICAgICB9KSksIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2VzO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmFsbFJlc29sdmVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIGFsbFJlc29sdmVkKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBzZWUgUHJvbWlzZSNhbGxTZXR0bGVkXHJcbiAqL1xyXG5RLmFsbFNldHRsZWQgPSBhbGxTZXR0bGVkO1xyXG5mdW5jdGlvbiBhbGxTZXR0bGVkKHByb21pc2VzKSB7XHJcbiAgICByZXR1cm4gUShwcm9taXNlcykuYWxsU2V0dGxlZCgpO1xyXG59XHJcblxyXG4vKipcclxuICogVHVybnMgYW4gYXJyYXkgb2YgcHJvbWlzZXMgaW50byBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHRoZWlyIHN0YXRlcyAoYXNcclxuICogcmV0dXJuZWQgYnkgYGluc3BlY3RgKSB3aGVuIHRoZXkgaGF2ZSBhbGwgc2V0dGxlZC5cclxuICogQHBhcmFtIHtBcnJheVtBbnkqXX0gdmFsdWVzIGFuIGFycmF5IChvciBwcm9taXNlIGZvciBhbiBhcnJheSkgb2YgdmFsdWVzIChvclxyXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxyXG4gKiBAcmV0dXJucyB7QXJyYXlbU3RhdGVdfSBhbiBhcnJheSBvZiBzdGF0ZXMgZm9yIHRoZSByZXNwZWN0aXZlIHZhbHVlcy5cclxuICovXHJcblByb21pc2UucHJvdG90eXBlLmFsbFNldHRsZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uIChwcm9taXNlcykge1xyXG4gICAgICAgIHJldHVybiBhbGwoYXJyYXlfbWFwKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZSkge1xyXG4gICAgICAgICAgICBwcm9taXNlID0gUShwcm9taXNlKTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gcmVnYXJkbGVzcygpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlLmluc3BlY3QoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuKHJlZ2FyZGxlc3MsIHJlZ2FyZGxlc3MpO1xyXG4gICAgICAgIH0pKTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhcHR1cmVzIHRoZSBmYWlsdXJlIG9mIGEgcHJvbWlzZSwgZ2l2aW5nIGFuIG9wb3J0dW5pdHkgdG8gcmVjb3ZlclxyXG4gKiB3aXRoIGEgY2FsbGJhY2suICBJZiB0aGUgZ2l2ZW4gcHJvbWlzZSBpcyBmdWxmaWxsZWQsIHRoZSByZXR1cm5lZFxyXG4gKiBwcm9taXNlIGlzIGZ1bGZpbGxlZC5cclxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlIGZvciBzb21ldGhpbmdcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gZnVsZmlsbCB0aGUgcmV0dXJuZWQgcHJvbWlzZSBpZiB0aGVcclxuICogZ2l2ZW4gcHJvbWlzZSBpcyByZWplY3RlZFxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGNhbGxiYWNrXHJcbiAqL1xyXG5RLmZhaWwgPSAvLyBYWFggbGVnYWN5XHJcblFbXCJjYXRjaFwiXSA9IGZ1bmN0aW9uIChvYmplY3QsIHJlamVjdGVkKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLnRoZW4odm9pZCAwLCByZWplY3RlZCk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5mYWlsID0gLy8gWFhYIGxlZ2FjeVxyXG5Qcm9taXNlLnByb3RvdHlwZVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKHJlamVjdGVkKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKHZvaWQgMCwgcmVqZWN0ZWQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEF0dGFjaGVzIGEgbGlzdGVuZXIgdGhhdCBjYW4gcmVzcG9uZCB0byBwcm9ncmVzcyBub3RpZmljYXRpb25zIGZyb20gYVxyXG4gKiBwcm9taXNlJ3Mgb3JpZ2luYXRpbmcgZGVmZXJyZWQuIFRoaXMgbGlzdGVuZXIgcmVjZWl2ZXMgdGhlIGV4YWN0IGFyZ3VtZW50c1xyXG4gKiBwYXNzZWQgdG8gYGBkZWZlcnJlZC5ub3RpZnlgYC5cclxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlIGZvciBzb21ldGhpbmdcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gcmVjZWl2ZSBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xyXG4gKiBAcmV0dXJucyB0aGUgZ2l2ZW4gcHJvbWlzZSwgdW5jaGFuZ2VkXHJcbiAqL1xyXG5RLnByb2dyZXNzID0gcHJvZ3Jlc3M7XHJcbmZ1bmN0aW9uIHByb2dyZXNzKG9iamVjdCwgcHJvZ3Jlc3NlZCkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS50aGVuKHZvaWQgMCwgdm9pZCAwLCBwcm9ncmVzc2VkKTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUucHJvZ3Jlc3MgPSBmdW5jdGlvbiAocHJvZ3Jlc3NlZCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHZvaWQgMCwgcHJvZ3Jlc3NlZCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUHJvdmlkZXMgYW4gb3Bwb3J0dW5pdHkgdG8gb2JzZXJ2ZSB0aGUgc2V0dGxpbmcgb2YgYSBwcm9taXNlLFxyXG4gKiByZWdhcmRsZXNzIG9mIHdoZXRoZXIgdGhlIHByb21pc2UgaXMgZnVsZmlsbGVkIG9yIHJlamVjdGVkLiAgRm9yd2FyZHNcclxuICogdGhlIHJlc29sdXRpb24gdG8gdGhlIHJldHVybmVkIHByb21pc2Ugd2hlbiB0aGUgY2FsbGJhY2sgaXMgZG9uZS5cclxuICogVGhlIGNhbGxiYWNrIGNhbiByZXR1cm4gYSBwcm9taXNlIHRvIGRlZmVyIGNvbXBsZXRpb24uXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBvYnNlcnZlIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlblxyXG4gKiBwcm9taXNlLCB0YWtlcyBubyBhcmd1bWVudHMuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2Ugd2hlblxyXG4gKiBgYGZpbmBgIGlzIGRvbmUuXHJcbiAqL1xyXG5RLmZpbiA9IC8vIFhYWCBsZWdhY3lcclxuUVtcImZpbmFsbHlcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCBjYWxsYmFjaykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KVtcImZpbmFsbHlcIl0oY2FsbGJhY2spO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZmluID0gLy8gWFhYIGxlZ2FjeVxyXG5Qcm9taXNlLnByb3RvdHlwZVtcImZpbmFsbHlcIl0gPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuICAgIGNhbGxiYWNrID0gUShjYWxsYmFjayk7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHJldHVybiBjYWxsYmFjay5mY2FsbCgpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9LCBmdW5jdGlvbiAocmVhc29uKSB7XHJcbiAgICAgICAgLy8gVE9ETyBhdHRlbXB0IHRvIHJlY3ljbGUgdGhlIHJlamVjdGlvbiB3aXRoIFwidGhpc1wiLlxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjay5mY2FsbCgpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aHJvdyByZWFzb247XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUZXJtaW5hdGVzIGEgY2hhaW4gb2YgcHJvbWlzZXMsIGZvcmNpbmcgcmVqZWN0aW9ucyB0byBiZVxyXG4gKiB0aHJvd24gYXMgZXhjZXB0aW9ucy5cclxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlIGF0IHRoZSBlbmQgb2YgYSBjaGFpbiBvZiBwcm9taXNlc1xyXG4gKiBAcmV0dXJucyBub3RoaW5nXHJcbiAqL1xyXG5RLmRvbmUgPSBmdW5jdGlvbiAob2JqZWN0LCBmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kb25lKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmRvbmUgPSBmdW5jdGlvbiAoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIHtcclxuICAgIHZhciBvblVuaGFuZGxlZEVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgLy8gZm9yd2FyZCB0byBhIGZ1dHVyZSB0dXJuIHNvIHRoYXQgYGB3aGVuYGBcclxuICAgICAgICAvLyBkb2VzIG5vdCBjYXRjaCBpdCBhbmQgdHVybiBpdCBpbnRvIGEgcmVqZWN0aW9uLlxyXG4gICAgICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGVycm9yLCBwcm9taXNlKTtcclxuICAgICAgICAgICAgaWYgKFEub25lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgUS5vbmVycm9yKGVycm9yKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEF2b2lkIHVubmVjZXNzYXJ5IGBuZXh0VGlja2BpbmcgdmlhIGFuIHVubmVjZXNzYXJ5IGB3aGVuYC5cclxuICAgIHZhciBwcm9taXNlID0gZnVsZmlsbGVkIHx8IHJlamVjdGVkIHx8IHByb2dyZXNzID9cclxuICAgICAgICB0aGlzLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIDpcclxuICAgICAgICB0aGlzO1xyXG5cclxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIiAmJiBwcm9jZXNzICYmIHByb2Nlc3MuZG9tYWluKSB7XHJcbiAgICAgICAgb25VbmhhbmRsZWRFcnJvciA9IHByb2Nlc3MuZG9tYWluLmJpbmQob25VbmhhbmRsZWRFcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgcHJvbWlzZS50aGVuKHZvaWQgMCwgb25VbmhhbmRsZWRFcnJvcik7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2F1c2VzIGEgcHJvbWlzZSB0byBiZSByZWplY3RlZCBpZiBpdCBkb2VzIG5vdCBnZXQgZnVsZmlsbGVkIGJlZm9yZVxyXG4gKiBzb21lIG1pbGxpc2Vjb25kcyB0aW1lIG91dC5cclxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtaWxsaXNlY29uZHMgdGltZW91dFxyXG4gKiBAcGFyYW0ge0FueSp9IGN1c3RvbSBlcnJvciBtZXNzYWdlIG9yIEVycm9yIG9iamVjdCAob3B0aW9uYWwpXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UgaWYgaXQgaXNcclxuICogZnVsZmlsbGVkIGJlZm9yZSB0aGUgdGltZW91dCwgb3RoZXJ3aXNlIHJlamVjdGVkLlxyXG4gKi9cclxuUS50aW1lb3V0ID0gZnVuY3Rpb24gKG9iamVjdCwgbXMsIGVycm9yKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLnRpbWVvdXQobXMsIGVycm9yKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnRpbWVvdXQgPSBmdW5jdGlvbiAobXMsIGVycm9yKSB7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgdmFyIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghZXJyb3IgfHwgXCJzdHJpbmdcIiA9PT0gdHlwZW9mIGVycm9yKSB7XHJcbiAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKGVycm9yIHx8IFwiVGltZWQgb3V0IGFmdGVyIFwiICsgbXMgKyBcIiBtc1wiKTtcclxuICAgICAgICAgICAgZXJyb3IuY29kZSA9IFwiRVRJTUVET1VUXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlcnJvcik7XHJcbiAgICB9LCBtcyk7XHJcblxyXG4gICAgdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xyXG4gICAgfSwgZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICAgIGRlZmVycmVkLnJlamVjdChleGNlcHRpb24pO1xyXG4gICAgfSwgZGVmZXJyZWQubm90aWZ5KTtcclxuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIGdpdmVuIHZhbHVlIChvciBwcm9taXNlZCB2YWx1ZSksIHNvbWVcclxuICogbWlsbGlzZWNvbmRzIGFmdGVyIGl0IHJlc29sdmVkLiBQYXNzZXMgcmVqZWN0aW9ucyBpbW1lZGlhdGVseS5cclxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXHJcbiAqIEBwYXJhbSB7TnVtYmVyfSBtaWxsaXNlY29uZHNcclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSBhZnRlciBtaWxsaXNlY29uZHNcclxuICogdGltZSBoYXMgZWxhcHNlZCBzaW5jZSB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZS5cclxuICogSWYgdGhlIGdpdmVuIHByb21pc2UgcmVqZWN0cywgdGhhdCBpcyBwYXNzZWQgaW1tZWRpYXRlbHkuXHJcbiAqL1xyXG5RLmRlbGF5ID0gZnVuY3Rpb24gKG9iamVjdCwgdGltZW91dCkge1xyXG4gICAgaWYgKHRpbWVvdXQgPT09IHZvaWQgMCkge1xyXG4gICAgICAgIHRpbWVvdXQgPSBvYmplY3Q7XHJcbiAgICAgICAgb2JqZWN0ID0gdm9pZCAwO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kZWxheSh0aW1lb3V0KTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24gKHRpbWVvdXQpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICAgICAgfSwgdGltZW91dCk7XHJcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQYXNzZXMgYSBjb250aW51YXRpb24gdG8gYSBOb2RlIGZ1bmN0aW9uLCB3aGljaCBpcyBjYWxsZWQgd2l0aCB0aGUgZ2l2ZW5cclxuICogYXJndW1lbnRzIHByb3ZpZGVkIGFzIGFuIGFycmF5LCBhbmQgcmV0dXJucyBhIHByb21pc2UuXHJcbiAqXHJcbiAqICAgICAgUS5uZmFwcGx5KEZTLnJlYWRGaWxlLCBbX19maWxlbmFtZV0pXHJcbiAqICAgICAgLnRoZW4oZnVuY3Rpb24gKGNvbnRlbnQpIHtcclxuICogICAgICB9KVxyXG4gKlxyXG4gKi9cclxuUS5uZmFwcGx5ID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBhcmdzKSB7XHJcbiAgICByZXR1cm4gUShjYWxsYmFjaykubmZhcHBseShhcmdzKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5mYXBwbHkgPSBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3MpO1xyXG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgdGhpcy5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBhc3NlcyBhIGNvbnRpbnVhdGlvbiB0byBhIE5vZGUgZnVuY3Rpb24sIHdoaWNoIGlzIGNhbGxlZCB3aXRoIHRoZSBnaXZlblxyXG4gKiBhcmd1bWVudHMgcHJvdmlkZWQgaW5kaXZpZHVhbGx5LCBhbmQgcmV0dXJucyBhIHByb21pc2UuXHJcbiAqIEBleGFtcGxlXHJcbiAqIFEubmZjYWxsKEZTLnJlYWRGaWxlLCBfX2ZpbGVuYW1lKVxyXG4gKiAudGhlbihmdW5jdGlvbiAoY29udGVudCkge1xyXG4gKiB9KVxyXG4gKlxyXG4gKi9cclxuUS5uZmNhbGwgPSBmdW5jdGlvbiAoY2FsbGJhY2sgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcclxuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubmZjYWxsID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMpO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIHRoaXMuZmFwcGx5KG5vZGVBcmdzKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcmFwcyBhIE5vZGVKUyBjb250aW51YXRpb24gcGFzc2luZyBmdW5jdGlvbiBhbmQgcmV0dXJucyBhbiBlcXVpdmFsZW50XHJcbiAqIHZlcnNpb24gdGhhdCByZXR1cm5zIGEgcHJvbWlzZS5cclxuICogQGV4YW1wbGVcclxuICogUS5uZmJpbmQoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpKFwidXRmLThcIilcclxuICogLnRoZW4oY29uc29sZS5sb2cpXHJcbiAqIC5kb25lKClcclxuICovXHJcblEubmZiaW5kID1cclxuUS5kZW5vZGVpZnkgPSBmdW5jdGlvbiAoY2FsbGJhY2sgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBiYXNlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBub2RlQXJncyA9IGJhc2VBcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKTtcclxuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgICAgICBRKGNhbGxiYWNrKS5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgIH07XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5uZmJpbmQgPVxyXG5Qcm9taXNlLnByb3RvdHlwZS5kZW5vZGVpZnkgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcclxuICAgIGFyZ3MudW5zaGlmdCh0aGlzKTtcclxuICAgIHJldHVybiBRLmRlbm9kZWlmeS5hcHBseSh2b2lkIDAsIGFyZ3MpO1xyXG59O1xyXG5cclxuUS5uYmluZCA9IGZ1bmN0aW9uIChjYWxsYmFjaywgdGhpc3AgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBiYXNlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBub2RlQXJncyA9IGJhc2VBcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKTtcclxuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgICAgICBmdW5jdGlvbiBib3VuZCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KHRoaXNwLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBRKGJvdW5kKS5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgIH07XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5uYmluZCA9IGZ1bmN0aW9uICgvKnRoaXNwLCAuLi5hcmdzKi8pIHtcclxuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAwKTtcclxuICAgIGFyZ3MudW5zaGlmdCh0aGlzKTtcclxuICAgIHJldHVybiBRLm5iaW5kLmFwcGx5KHZvaWQgMCwgYXJncyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsbHMgYSBtZXRob2Qgb2YgYSBOb2RlLXN0eWxlIG9iamVjdCB0aGF0IGFjY2VwdHMgYSBOb2RlLXN0eWxlXHJcbiAqIGNhbGxiYWNrIHdpdGggYSBnaXZlbiBhcnJheSBvZiBhcmd1bWVudHMsIHBsdXMgYSBwcm92aWRlZCBjYWxsYmFjay5cclxuICogQHBhcmFtIG9iamVjdCBhbiBvYmplY3QgdGhhdCBoYXMgdGhlIG5hbWVkIG1ldGhvZFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBtZXRob2Qgb2Ygb2JqZWN0XHJcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZDsgdGhlIGNhbGxiYWNrXHJcbiAqIHdpbGwgYmUgcHJvdmlkZWQgYnkgUSBhbmQgYXBwZW5kZWQgdG8gdGhlc2UgYXJndW1lbnRzLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSB2YWx1ZSBvciBlcnJvclxyXG4gKi9cclxuUS5ubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUS5ucG9zdCA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUsIGFyZ3MpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkubnBvc3QobmFtZSwgYXJncyk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5ubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUHJvbWlzZS5wcm90b3R5cGUubnBvc3QgPSBmdW5jdGlvbiAobmFtZSwgYXJncykge1xyXG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJncyB8fCBbXSk7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIG5vZGVBcmdzXSkuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsbHMgYSBtZXRob2Qgb2YgYSBOb2RlLXN0eWxlIG9iamVjdCB0aGF0IGFjY2VwdHMgYSBOb2RlLXN0eWxlXHJcbiAqIGNhbGxiYWNrLCBmb3J3YXJkaW5nIHRoZSBnaXZlbiB2YXJpYWRpYyBhcmd1bWVudHMsIHBsdXMgYSBwcm92aWRlZFxyXG4gKiBjYWxsYmFjayBhcmd1bWVudC5cclxuICogQHBhcmFtIG9iamVjdCBhbiBvYmplY3QgdGhhdCBoYXMgdGhlIG5hbWVkIG1ldGhvZFxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBtZXRob2Qgb2Ygb2JqZWN0XHJcbiAqIEBwYXJhbSAuLi5hcmdzIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBtZXRob2Q7IHRoZSBjYWxsYmFjayB3aWxsXHJcbiAqIGJlIHByb3ZpZGVkIGJ5IFEgYW5kIGFwcGVuZGVkIHRvIHRoZXNlIGFyZ3VtZW50cy5cclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgdmFsdWUgb3IgZXJyb3JcclxuICovXHJcblEubnNlbmQgPSAvLyBYWFggQmFzZWQgb24gTWFyayBNaWxsZXIncyBwcm9wb3NlZCBcInNlbmRcIlxyXG5RLm5tY2FsbCA9IC8vIFhYWCBCYXNlZCBvbiBcIlJlZHNhbmRybydzXCIgcHJvcG9zYWxcclxuUS5uaW52b2tlID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAyKTtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICBRKG9iamVjdCkuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBub2RlQXJnc10pLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubnNlbmQgPSAvLyBYWFggQmFzZWQgb24gTWFyayBNaWxsZXIncyBwcm9wb3NlZCBcInNlbmRcIlxyXG5Qcm9taXNlLnByb3RvdHlwZS5ubWNhbGwgPSAvLyBYWFggQmFzZWQgb24gXCJSZWRzYW5kcm8nc1wiIHByb3Bvc2FsXHJcblByb21pc2UucHJvdG90eXBlLm5pbnZva2UgPSBmdW5jdGlvbiAobmFtZSAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJZiBhIGZ1bmN0aW9uIHdvdWxkIGxpa2UgdG8gc3VwcG9ydCBib3RoIE5vZGUgY29udGludWF0aW9uLXBhc3Npbmctc3R5bGUgYW5kXHJcbiAqIHByb21pc2UtcmV0dXJuaW5nLXN0eWxlLCBpdCBjYW4gZW5kIGl0cyBpbnRlcm5hbCBwcm9taXNlIGNoYWluIHdpdGhcclxuICogYG5vZGVpZnkobm9kZWJhY2spYCwgZm9yd2FyZGluZyB0aGUgb3B0aW9uYWwgbm9kZWJhY2sgYXJndW1lbnQuICBJZiB0aGUgdXNlclxyXG4gKiBlbGVjdHMgdG8gdXNlIGEgbm9kZWJhY2ssIHRoZSByZXN1bHQgd2lsbCBiZSBzZW50IHRoZXJlLiAgSWYgdGhleSBkbyBub3RcclxuICogcGFzcyBhIG5vZGViYWNrLCB0aGV5IHdpbGwgcmVjZWl2ZSB0aGUgcmVzdWx0IHByb21pc2UuXHJcbiAqIEBwYXJhbSBvYmplY3QgYSByZXN1bHQgKG9yIGEgcHJvbWlzZSBmb3IgYSByZXN1bHQpXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG5vZGViYWNrIGEgTm9kZS5qcy1zdHlsZSBjYWxsYmFja1xyXG4gKiBAcmV0dXJucyBlaXRoZXIgdGhlIHByb21pc2Ugb3Igbm90aGluZ1xyXG4gKi9cclxuUS5ub2RlaWZ5ID0gbm9kZWlmeTtcclxuZnVuY3Rpb24gbm9kZWlmeShvYmplY3QsIG5vZGViYWNrKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLm5vZGVpZnkobm9kZWJhY2spO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKG5vZGViYWNrKSB7XHJcbiAgICBpZiAobm9kZWJhY2spIHtcclxuICAgICAgICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIG5vZGViYWNrKG51bGwsIHZhbHVlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIG5vZGViYWNrKGVycm9yKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLy8gQWxsIGNvZGUgYmVmb3JlIHRoaXMgcG9pbnQgd2lsbCBiZSBmaWx0ZXJlZCBmcm9tIHN0YWNrIHRyYWNlcy5cclxudmFyIHFFbmRpbmdMaW5lID0gY2FwdHVyZUxpbmUoKTtcclxuXHJcbnJldHVybiBRO1xyXG5cclxufSk7XHJcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJaYmk3Z2JcIikpIiwiLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcblxyXG4vKipcclxuICpcclxuICogQG1vZHVsZSAgICAgICAgc2VuZFJlcXVlc3RcclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgVGhpcyBmdW5jdGlvbiBwcm92aWRlcyB0aGUgbG93ZXN0LWxldmVsIGludGVyZmFjZSB0byB0aGUgWEhSIGZ1bmN0aW9uYWxpdHkgdGhhdFxyXG4gKiAgICAgICAgICAgICAgICB0aGUgQnJpZGdlIENsaWVudCBpcyBvcGVyYXRpbmcgb24gdG9wIG9mLiBUaGlzIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIG9ubHkgZm9yXHJcbiAqICAgICAgICAgICAgICAgIGlzc3VpbmcgYSByZXF1ZXN0IGFuZCByZXR1cm5pbmcgYSBRIHByb21pc2UgYW5kIGhvb2tpbmcgdXAgdGhlIHJlc29sdmUoKSBhbmRcclxuICogICAgICAgICAgICAgICAgcmVqZWN0KCkgbWV0aG9kcyB0byB0aGUgcmVzdWx0cyBvZiB0aGUgWEhSIHJlcXVlc3QuXHJcbiAqICAgICAgICAgICAgICAgIFRoaXMgZnVuY3Rpb24gY2FuIGJlIG92ZXJyaWRkZW4gdG8gdXNlIHNvbWUgb3RoZXIgc2VydmljZSB0aGFuIFhtbEh0dHBSZXF1ZXN0c1xyXG4gKiAgICAgICAgICAgICAgICBieSB0aGUgZW5kLWRldmVsb3Blci4gSWYgeW91IHBsYW4gdG8gZG8gdGhpcywgd2UgYWR2aWNlIHRoYXQgeW91IG1ha2UgYSBwbHVnaW5cclxuICogICAgICAgICAgICAgICAgZm9yIHRoZSBCcmlkZ2UgQ2xpZW50IHRvIGZvcm1hbGl6ZSB5b3VyIHNwZWNpYWxpemVkIGJlaGF2aW91ci4gRW5zdXJlIHRoYXQgdGhlXHJcbiAqICAgICAgICAgICAgICAgIG92ZXJyaWRpbmcgZnVuY3Rpb24gYWRoZXJlZCB0byB0aGUgc2FtZSBzaWduYXR1cmUgYW5kIHJldHVybnMgYSBRIHByb21pc2UuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtEZWZlcnJlZH0gZGVmZXJyZWQgICBBIFEgZGVmZXJyZWQgb2JqZWN0IHRoYXQgdGhlIGVuZC1kZXZlbG9wZXIgbXVzdCB1c2UgdG9cclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVpdGhlciByZXNvbHZlIG9yIHJlamVjdCBpbiByZXNwb25zZSB0byB0aGUgcmVxdWVzdCBlaXRoZXJcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxpbmcgb3IgY29tcGxldGluZyBzdWNjZXNzZnVsbHkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IG1ldGhvZCAgICAgICBUaGUgSFRUUCB2ZXJiL2FjdGlvbiB0byB1c2UgZm9yIHRoZSByZXF1ZXN0LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSB1cmwgICAgICAgICAgVGhlIGV4YWN0IFVSTCBvZiB0aGUgcmVzb3VyY2UgdG8gcXVlcnkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtPYmplY3R9IGRhdGEgICAgICAgICBUaGUgZGF0YSBvYmplY3QgdG8gc2VuZCB3aXRoIHRoZSByZXF1ZXN0LiBUaGlzIGNhbiBiZSB1c2VkXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBkZXNjcmliZSBxdWVyeSBhcmd1bWVudHMgc3VjaCBhcyBmaWx0ZXJzIGFuZCBvcmRlcmluZyxcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yIHRvIGNvbnRhaW4gZGF0YSB0byBiZSBzdG9yZWQgaW4gdGhlIEJyaWRnZSBkYXRhYmFzZS5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2VuZFJlcXVlc3QoIGRlZmVycmVkLCBtZXRob2QsIHVybCwgZGF0YSApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcblxyXG4gIHhoci5vcGVuKCBtZXRob2QudG9VcHBlckNhc2UoKSwgdXJsLCB0cnVlICk7XHJcbiAgeGhyLnNldFJlcXVlc3RIZWFkZXIoICdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicgKTtcclxuICB4aHIuc2V0UmVxdWVzdEhlYWRlciggJ0JyaWRnZScsIEpTT04uc3RyaW5naWZ5KCBkYXRhICkgKTtcclxuXHJcbiAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICggeGhyLnJlYWR5U3RhdGUgPT09IDQgKSB7XHJcbiAgICAgIHRyeSB7XHJcblxyXG4gICAgICAgIC8vIEF0dGVtcHQgdG8gcGFyc2UgdGhlIHJlc3BvbnNlIGFzIEpTT04uXHJcbiAgICAgICAgdmFyIGRhdGEgPSBKU09OLnBhcnNlKCB4aHIucmVzcG9uc2VUZXh0ICk7XHJcblxyXG4gICAgICAgIC8vIElmIGFuIGVycm9yIHN0YXR1cyBpcyByZXBvcnRlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlJ3MnIGVycm9yIG9iamVjdC5cclxuICAgICAgICBpZiAoIHhoci5zdGF0dXMgPj0gNDAwICkge1xyXG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCBkYXRhLmNvbnRlbnQgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIE90aGVyd2lzZSwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBvYmplY3QuXHJcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSggZGF0YS5jb250ZW50ICk7XHJcblxyXG4gICAgICB9XHJcbiAgICAgIGNhdGNoICggZSApIHtcclxuXHJcbiAgICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGNhbid0IGJlIHBhcnNlZCBhcyBKU09OLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhIG5ldyBlcnJvciBvYmplY3QgdGhhdFxyXG4gICAgICAgIC8vIGRlc2NyaWJlcyB0aGUgcmVzcG9uc2UgYXMgbWFsZm9ybWVkLlxyXG4gICAgICAgIGRlZmVycmVkLnJlamVjdCggbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk1BTEZPUk1FRF9SRVNQT05TRSApICk7XHJcblxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgLy8gSWYgdGhlIHJlcXVlc3QgZmFpbGVkIGR1ZSB0byBhIG5ldHdvcmsgZXJyb3IsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGEgbmV3IGVycm9yIG9iamVjdCB0aGF0XHJcbiAgICAvLyBkZXNjcmliZXMgdGhhdCB0aGUgZmFpbHVyZSB3YXMgZHVlIHRvIGEgbmV0d29yayBlcnJvci5cclxuICAgIGRlZmVycmVkLnJlamVjdCggbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk5FVFdPUktfRVJST1IgKSApO1xyXG5cclxuICB9O1xyXG5cclxuICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIC8vIElmIHRoZSByZXF1ZXN0IHRpbWVkIG91dCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYSBuZXcgZXJyb3Igb2JqZWN0IHRoYXQgZGVzY3JpYmVzIHRoYXQgdGhlXHJcbiAgICAvLyBmYWlsdXJlIHdhcyBkdWUgdG8gYSB0aW1lb3V0LlxyXG4gICAgZGVmZXJyZWQucmVqZWN0KCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuUkVRVUVTVF9USU1FT1VUICkgKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgeGhyLnNlbmQoKTtcclxuXHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblxyXG59O1xyXG4iXX0=
(2)
});
