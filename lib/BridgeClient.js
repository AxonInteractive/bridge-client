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
  var isAuthenticated   = _dereq_( './commands/isAuthenticated' );
  var loadUser          = _dereq_( './commands/loadUser' );
  var login             = _dereq_( './commands/login' );
  var logout            = _dereq_( './commands/logout' );
  var recoverPassword   = _dereq_( './commands/recoverPassword' );
  var register          = _dereq_( './commands/register' );
  var resume            = _dereq_( './commands/resume' );
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
   * @property {Function} isAuthenticated     Makes an API call to request the server notify the
   *                                          client of its authorization status. If a valid auth
   *                                          cookie is set in the browser, then this request will
   *                                          succeed: the session is authenticated.
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
   * @property {Function} resume              Makes an API call to check if the session is
   *                                          authenticated, and if it is, then the user profile is
   *                                          loaded to resume the session. If the user profile
   *                                          object has been modified, this request will reject
   *                                          with an error to preserve any changes (since changes
   *                                          mean the session is already started).
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
    request             : core.request,
    authenticate        : authenticate,
    deauthenticate      : deauthenticate,
    forgotPassword      : forgotPassword,
    isAuthenticated     : isAuthenticated,
    loadUser            : loadUser,
    login               : login,
    logout              : logout,
    recoverPassword     : recoverPassword,
    register            : register,
    resume              : resume,
    saveUser            : saveUser,
    verifyEmail         : verifyEmail,

    // XHR Interface
    sendRequest         : core.sendRequest

  };

} )();

},{"./commands/authenticate":3,"./commands/deauthenticate":4,"./commands/forgotPassword":5,"./commands/isAuthenticated":6,"./commands/loadUser":7,"./commands/login":8,"./commands/logout":9,"./commands/recoverPassword":10,"./commands/register":11,"./commands/resume":12,"./commands/saveUser":13,"./commands/verifyEmail":14,"./core":15,"./errors":16}],3:[function(_dereq_,module,exports){
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
    password: CryptoSha256( password.toString() ).toString( CryptoEncHex ),
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

},{"../core":15,"../errors":16,"../include/crypto-js/enc-hex":18,"../include/crypto-js/sha256":19,"../include/q":20}],4:[function(_dereq_,module,exports){
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

},{"../core":15,"../errors":16,"../include/q":20}],5:[function(_dereq_,module,exports){
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

},{"../core":15,"../errors":16,"../include/q":20}],6:[function(_dereq_,module,exports){
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
 * @function      isAuthenticated [GET]
 *
 * @description   Ask the server if the client has an authentication cookie set to authenticate the
 *                current session. This can be called when an application first loads to check for
 *                and auth cookie that is still valid (the user chose the "remember me" option and
 *                the cookie has not yet expired). If the request is successful, the API server will
 *                set a fresh auth cookie for this client.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function isAuthenticated( apiUrl ) {

  'use strict';

  // Build and empty request payload (don't need to send anything).
  var payload = {};

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'GET', core.stripTrailingSlash( apiUrl ) + '/is-authenticated', payload ).then(

    // Request was resolved /////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Is Authenticated", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // Set the session as being authenticated.
      core.isAuthenticated = true;

      // Set "remember me" conditionally: If a user object exists, then this is an existing session
      // in which the user authenticated previously, so the value can be taken from Bridge. If not,
      // then this is a session just beginning, so if it has an auth cookie the user must have set
      // the "remember me" flag previously.
      core.rememberMe = ( core.user ) ? core.rememberMe : true;

      // If the response format is valid, resolve the request with the response data object.
      core.resolve( "Is Authenticated", deferred, data );

    },
    /////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected /////////////////////////////////////////////////////////////////////
    function ( error ) {

      // Reset the session to clear all user data.
      core.resetSession();

      // If the response failed, reject the request with the error object passed up from below.
      core.reject( "Is Authenticated", deferred, error );

    }
    /////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../core":15,"../errors":16,"../include/q":20}],7:[function(_dereq_,module,exports){
/**
 * @module  getUserProfile
 */
/* global exports: true */
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
 * @param         {Boolean} overwrite   A flag indicating that, in the event that this loadUser()
 *                                      call will overwrite unsaved changes on the client, the
 *                                      operation will be carried out rather than rejecting with an
 *                                      error to warn of the overwrite.
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function loadUser( apiUrl, overwrite ) {

  'use strict';

  // Check for unsaved changes that might be overwritten and reject with a new error indicating that
  // these changes will be lost (unless the overwrite flag is set).
  var deferred = Q.defer();
  if ( !overwrite && core.isUserModified() ) {
    core.reject( "Load User", deferred, new errors.BridgeError( errors.WILL_LOSE_UNSAVED_CHANGES ) );
    return deferred.promise;
  }

  // Build and empty request payload (don't need to send anything).
  var payload = {};

  // Send the request and handle the response.
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

},{"../core":15,"../errors":16,"../include/q":20}],8:[function(_dereq_,module,exports){
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
      loadUser( apiUrl ).then(
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

},{"../commands/authenticate":3,"../commands/loadUser":7,"../core":15,"../errors":16,"../include/q":20}],9:[function(_dereq_,module,exports){
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

},{"../commands/deauthenticate":4}],10:[function(_dereq_,module,exports){
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
    password: CryptoSha256( password.toString() ).toString( CryptoEncHex )
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

},{"../core":15,"../errors":16,"../include/crypto-js/enc-hex":18,"../include/crypto-js/sha256":19,"../include/q":20}],11:[function(_dereq_,module,exports){
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

  // Check for invalid password format and reject it with a new error object indicating why the
  // password was not acceptable.
  var deferred = Q.defer();

  if ( typeof password !== 'string' ) {
    core.reject( "Register", deferred, new errors.BridgeError( 0 ) );
  }

  if ( password.length < 1 ) {
    core.reject( "Register", deferred, new errors.BridgeError( errors.PASSWORD_TOO_SHORT ) );
    return deferred.promise;
  }

  // Build the request payload (hash the password with SHA256).
  var payload = {
    appData: appData,
    email: email,
    firstName: firstName,
    lastName: lastName,
    password: CryptoSha256( password.toString() ).toString( CryptoEncHex ),
  };

  // Send the request and handle the response.
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

},{"../commands/login":8,"../core":15,"../errors":16,"../include/crypto-js/enc-hex":18,"../include/crypto-js/sha256":19,"../include/q":20}],12:[function(_dereq_,module,exports){
/**
 * @module  login
 */
/* global exports: true */
var Q = _dereq_( '../include/q' );
var core = _dereq_( '../core' );
var errors = _dereq_( '../errors' );
var isAuthenticated = _dereq_( '../commands/isAuthenticated' );
var loadUser = _dereq_( '../commands/loadUser' );

/**
 *
 * @public
 *
 * @function      resume [isAuthenticated >> loadUser]
 *
 * @description   Check if the current user is authenticated, and if they are, then check if the
 *                user profile object has been modified. If it hasn't been, load the user profile
 *                to restore the session.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function resume( apiUrl ) {

  'use strict';

  // Send an authentication request.
  var deferred = Q.defer();
  isAuthenticated( apiUrl ).then(

    // Is Authenticate was resolved ///////////////////////////////////////////////////////////////
    function ( data ) {

      // Otherwise, send a request to fetch the user's profile.
      loadUser( apiUrl ).then(
        function ( data ) {

          // If fetching the user profile is successful, resolve the request with the response data.
          core.resolve( "Resume", deferred, data );

        },
        function ( error ) {

          // If fetching the user profile failed, reject the request with the error object.
          core.reject( "Resume", deferred, error );

        }
      );

    },
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // Authenticate was rejected //////////////////////////////////////////////////////////////////
    function ( error ) {

      // If authentication failed, reject the request with the error object passed up from below.
      core.reject( "Resume", deferred, error );

    }
    ///////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};

},{"../commands/isAuthenticated":6,"../commands/loadUser":7,"../core":15,"../errors":16,"../include/q":20}],13:[function(_dereq_,module,exports){
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
    return deferred.promise;
  }

  // Check for invalid password format and reject it with a new error object indicating why the
  // password was not acceptable.
  if ( currentPassword && newPassword && newPassword.length < 1 ) {
    core.reject( "Save User", deferred, new errors.BridgeError( errors.PASSWORD_TOO_SHORT ) );
    return deferred.promise;
  }

  // Set the payload to the user profile object, and include the current and new passwords as
  // additional properties if the user intend to change their password.
  var payload = core.user;
  if ( currentPassword && newPassword ) {
    payload.currentPassword = CryptoSha256( currentPassword.toString() ).toString( CryptoEncHex );
    payload.password = CryptoSha256( newPassword.toString() ).toString( CryptoEncHex );
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

},{"../commands/authenticate":3,"../core":15,"../errors":16,"../include/crypto-js/enc-hex":18,"../include/crypto-js/sha256":19,"../include/q":20}],14:[function(_dereq_,module,exports){
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

},{"../core":15,"../errors":16,"../include/q":20}],15:[function(_dereq_,module,exports){
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
   * @property {Boolean}  rememberMe  Whether or not the user selected the remember me option.
   */
  exports.rememberMe = false;

  /**
   * @public
   * @property {String}  unchangedUser  The JSON.stringify()ed user profile object as it was when it
   *                                    was set by a call to getUserProfile().
   */
  exports.unchangedUser = 'null';

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
   * @description   Returns whether or not the user object is set.
   *
   * @return        {Boolean} Whether or not a user object exists and is authenticated.
   *
   */
  exports.isUserLoggedIn = function isLoggedIn () {
    // Note: Using ternary here because a raw AND returns Object, since that's truthy enough.
    return ( exports.user ) ? true : false;
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
    exports.rememberMe = false;
    exports.user = null;
    exports.unchangedUser = 'null';
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
        ": " + error.message );
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

        // If a debug message was sent, set it as the message. If not, the error message is empty.
        error.message = errors.getExplanation( error.errorCode );

        // If the auth token has been corrupted, the client can't perform any private API calls
        // including deauthenticate(). Since the cookie is inaccessible to the client, the only
        // recourse we have is to reset the session and force the user to authenticate again
        if ( error.errorCode === errors.CORRUPTED_AUTH_TOKEN ) {
          exports.resetSession();
        }

        // If the response failed, reject the request with the error object passed up from below.
        exports.reject( "Request", deferred, error );

      }
      /////////////////////////////////////////////////////////////////////////////////////////////

    );

    return deferred.promise;

  };

} )();

},{"./errors.js":16,"./include/q":20,"./plugins/Default.js":21}],16:[function(_dereq_,module,exports){
/**
 * @module  errors
 */

/**
 * @public
 * @constant      CORRUPTED_AUTH_TOKEN
 * @description   An error code indicating that the server rejected a request because the auth token
 *                sent in the auth cookie was corrupted. This is an especially bad error case since
 *                this state prevents the client from accessing any private routes on the API
 *                server, including deauthenticate(). core.request() handles this error by resetting
 *                the session, even though the auth cookie may still be set. Ideally, this is
 *                handled by returning the user to a login screen to re-enter their credentials so
 *                authenticate() will be called again, allowing the server to issue a fresh auth
 *                cookie and restore the app state.
 * @type          {Number}
 */
exports.CORRUPTED_TOKEN = 26;

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
 * @public
 * @constant      PASSWORD_TOO_SHORT
 * @description   An error code indicating that the requested password is not long enough, and that
 *                the user must select a longer password to ensure account security.
 * @type          {Number}
 */
exports.PASSWORD_TOO_SHORT = 105;

/**
 * @public
 * @constant      WILL_LOSE_UNSAVED_CHANGES
 * @description   An error code indicating that the requested operation may overwrite user data that
 *                is not yet saved on the client.
 * @type          {Number}
 */
exports.WILL_LOSE_UNSAVED_CHANGES = 106;

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
  25: "The request could not be authenticated, because the authentication token was either tampered with or badly formed.",
  26: "The requested resource requires that you be logged in as a registered user.",
  27: "The registration code was invalid. Please enter a valid registration code.",
  101: "The response from the server was badly formed. Ensure that your Bridge Client and Bridge Server versions match.",
  102: "The response failed or was incomplete due to a network error.",
  103: "The server did not respond. Check your internet connection and confirm that your Bridge Server is running.",
  104: "No user profile is currently loaded. You must login before you can continue.",
  105: "The supplied password is too short. Please choose a longer, more secure password.",
  106: "The requested operation will result in unsaved changes being lost. Are you sure?"
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

},{}],17:[function(_dereq_,module,exports){
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
},{}],18:[function(_dereq_,module,exports){
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
},{"./core":17}],19:[function(_dereq_,module,exports){
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
},{"./core":17}],20:[function(_dereq_,module,exports){
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
},{"Zbi7gb":1}],21:[function(_dereq_,module,exports){
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

        // If the content property is missing from the response, the response is malformed. Reject
        // the request with a new error object indicating that the response is malformed.
        if ( !data.content ) {
          deferred.reject( new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        }

        // If an error status is reported, reject the request with the response's error object.
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

},{"../errors":16}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcSmVmZlxcRG9jdW1lbnRzXFxfX2RldlxcZ2l0XFxicmlkZ2UtY2xpZW50XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvQnJpZGdlQ2xpZW50LmpzIiwiQzovVXNlcnMvSmVmZi9Eb2N1bWVudHMvX19kZXYvZ2l0L2JyaWRnZS1jbGllbnQvc3JjL2NvbW1hbmRzL2F1dGhlbnRpY2F0ZS5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9kZWF1dGhlbnRpY2F0ZS5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9mb3Jnb3RQYXNzd29yZC5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9pc0F1dGhlbnRpY2F0ZWQuanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvbG9hZFVzZXIuanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvbG9naW4uanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvbG9nb3V0LmpzIiwiQzovVXNlcnMvSmVmZi9Eb2N1bWVudHMvX19kZXYvZ2l0L2JyaWRnZS1jbGllbnQvc3JjL2NvbW1hbmRzL3JlY292ZXJQYXNzd29yZC5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9yZWdpc3Rlci5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9yZXN1bWUuanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvc2F2ZVVzZXIuanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvdmVyaWZ5RW1haWwuanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvY29yZS5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L3NyYy9lcnJvcnMuanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvaW5jbHVkZS9jcnlwdG8tanMvY29yZS5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2NyeXB0by1qcy9lbmMtaGV4LmpzIiwiQzovVXNlcnMvSmVmZi9Eb2N1bWVudHMvX19kZXYvZ2l0L2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1Ni5qcyIsIkM6L1VzZXJzL0plZmYvRG9jdW1lbnRzL19fZGV2L2dpdC9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL3EuanMiLCJDOi9Vc2Vycy9KZWZmL0RvY3VtZW50cy9fX2Rldi9naXQvYnJpZGdlLWNsaWVudC9zcmMvcGx1Z2lucy9EZWZhdWx0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeHVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdDNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiKCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gSW1wb3J0IEJyaWRnZSBjb3JlIGZ1bmN0aW9uYWxpdHlcclxuICB2YXIgY29yZSA9IHJlcXVpcmUoICcuL2NvcmUnICk7XHJcbiAgdmFyIGVycm9ycyA9IHJlcXVpcmUoICcuL2Vycm9ycycgKTtcclxuXHJcbiAgLy8gSW1wb3J0IEJyaWRnZSBBUEkgY29tbWFuZHNcclxuICB2YXIgYXV0aGVudGljYXRlICAgICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9hdXRoZW50aWNhdGUnICk7XHJcbiAgdmFyIGRlYXV0aGVudGljYXRlICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvZGVhdXRoZW50aWNhdGUnICk7XHJcbiAgdmFyIGZvcmdvdFBhc3N3b3JkICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvZm9yZ290UGFzc3dvcmQnICk7XHJcbiAgdmFyIGlzQXV0aGVudGljYXRlZCAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvaXNBdXRoZW50aWNhdGVkJyApO1xyXG4gIHZhciBsb2FkVXNlciAgICAgICAgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL2xvYWRVc2VyJyApO1xyXG4gIHZhciBsb2dpbiAgICAgICAgICAgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL2xvZ2luJyApO1xyXG4gIHZhciBsb2dvdXQgICAgICAgICAgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL2xvZ291dCcgKTtcclxuICB2YXIgcmVjb3ZlclBhc3N3b3JkICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9yZWNvdmVyUGFzc3dvcmQnICk7XHJcbiAgdmFyIHJlZ2lzdGVyICAgICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvcmVnaXN0ZXInICk7XHJcbiAgdmFyIHJlc3VtZSAgICAgICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvcmVzdW1lJyApO1xyXG4gIHZhciBzYXZlVXNlciAgICAgICAgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL3NhdmVVc2VyJyApO1xyXG4gIHZhciB2ZXJpZnlFbWFpbCAgICAgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL3ZlcmlmeUVtYWlsJyApO1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBnbG9iYWwgICAgICAgIEJyaWRnZVxyXG4gICAqXHJcbiAgICogQGRlc2NyaXB0aW9uICAgVGhlIEJyaWRnZSBnbG9iYWwuXHJcbiAgICpcclxuICAgKiBAdHlwZSAgICAgICAgICB7T2JqZWN0fVxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZ2V0RGVidWcgICAgICAgICAgICBUaGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIGRlYnVnIG1vZGUgb2YgQnJpZGdlLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gc2V0RGVidWcgICAgICAgICAgICBUaGlzIGZ1bmN0aW9uIHNldHMgdGhlIGRlYnVnIG1vZGUgb2YgQnJpZGdlLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZ2V0RXJyb3JzICAgICAgICAgICBUaGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIGVycm9ycyBtb2R1bGUgZnJvbSB3aGljaCBhbGxcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mIHRoZSBlcnJvciB0eXBlcyB0aGF0IEJyaWRnZSB1c2VzIHRvIGVudW1lcmF0ZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFpbHVyZXMgYXJlIHZpc2libGUuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXRJc1VzZXJMb2dnZWRJbiAgIENoZWNrcyB0byBzZWUgaWYgdGhlIHNlc3Npb24gaXMgYXV0aGVudGljYXRlZCBhbmQgdGhhdFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHVzZXIgcHJvZmlsZSBvYmplY3QgaXMgc2V0LiBCb3RoIGJvdGggYXJlIHRydWUsXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgdXNlciBpcyBjb25zaWRlcmVkIHRvIGJlIGxvZ2dlZCBpbi5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGdldElzVXNlck1vZGlmaWVkICAgQ2hlY2tzIHRvIHNlZSBpZiB0aGUgdXNlciBvYmplY3QgaGFzIGJlZW4gY2hhbmdlZFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2luY2UgdGhlIGxhc3QgdGltZSB0aGF0IGdldFVzZXJQcm9maWxlKCkgd2FzIGNhbGxlZFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZ2V0IGEgZnJlc2ggY29weS4gVGhpcyBpcyBoZWxwZnVsIHdhcm4gdXNlcnMgdGhhdFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlcmUgYXJlIGNoYW5nZXMgdGhhdCBtdXN0IGJlIHNhdmVkLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZ2V0UmVtZW1iZXJNZSAgICAgICBUaGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIGN1cnJlbnQgXCJyZW1lbWJlciBtZVwiIHN0YXRlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZiB0aGUgYXBwbGljYXRpb24uXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXRVc2VyICAgICAgICAgICAgIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgdXNlciBwcm9maWxlIG9iamVjdCB0aGF0IHlvdVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hvdWxkIHVzZSBpbiB5b3VyIGFwcCB0aGF0IGdldCBiZSBmZXRjaGVkIGZyb20gdGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBBUEkgd2l0aCBnZXRVc2VyUHJvZmlsZSgpIGFuZCB1cGRhdGVkIG9uIHRoZSBBUEkgdXNpbmdcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVVzZXJQcm9maWxlKCkuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBvblJlcXVlc3RDYWxsZWQgICAgIEEgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBhbGxvd3MgeW91IHRvIGF0dGFjaCBzcGVjaWFsXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWhhdmlvdXIgdG8gZXZlcnkgcmVxdWVzdCBjYWxsIG1hZGUgYnkgQnJpZGdlLiBUaGlzXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayBjYXB0dXJlcyB0aGUgSFRUUCBtZXRob2QsIFVSTCwgYW5kIHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF5bG9hZCBvZiBlYWNoIG91dGdvaW5nIHJlcXVlc3QgYmVmb3JlIGl0IGlzIHNlbnQgYW5kXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnaXZlcyB5b3UgdGhlIG9wcG9ydHVuaXR5IHRvIG1vZGlmeSByZXF1ZXN0cywgaWZcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5lY2Vzc2FyeS5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGF1dGhlbnRpY2F0ZSAgICAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gcmVxdWVzdCBhdXRoZW50aWNhdGlvbi4gSWYgdGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0IGlzIHN1Y2Nlc3NmdWwsIGEgQnJpZGdlIGF1dGhlbnRpY2F0aW9uIGNvb2tpZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXMgc2V0IGluIHRoZSBicm93c2VyIHRvIGlkZW50aWZ5IHRoZSB1c2VyIGZyb20gbm93XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbi5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGRlYXV0aGVudGljYXRlICAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gcmVxdWVzdCBkZWF1dGhlbnRpY2F0aW9uLiBJZiB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QgaXMgc3VjY2Vzc2Z1bCwgdGhlIEJyaWRnZSBhdXRoZW50aWNhdGlvblxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29va2llIGlzIHNldCB0byBleHBpcmUgaW1tZWRpYXRlbHksIGFuZCBhbGwgc2Vzc2lvblxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyaWFibGVzIGluIEJyaWRnZSBhcmUgcmVzZXQuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBmb3Jnb3RQYXNzd29yZCAgICAgIE1ha2VzIGFuIEFQSSBjYWxsIHRvIHJlcXVlc3QgYSBwYXNzd29yZCByZWNvdmVyeSBlbWFpbFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmUgc2VudCB0byB0aGUgZ2l2ZW4gZW1haWwgYWRkcmVzcy4gcmVjb3ZlclBhc3N3b3JkKClcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcHJlc2VudHMgdGhlIGNvbXBsZXRpb24gb2YgdGhlIHJlY292ZXJ5IHByb2Nlc3MuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBpc0F1dGhlbnRpY2F0ZWQgICAgIE1ha2VzIGFuIEFQSSBjYWxsIHRvIHJlcXVlc3QgdGhlIHNlcnZlciBub3RpZnkgdGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnQgb2YgaXRzIGF1dGhvcml6YXRpb24gc3RhdHVzLiBJZiBhIHZhbGlkIGF1dGhcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvb2tpZSBpcyBzZXQgaW4gdGhlIGJyb3dzZXIsIHRoZW4gdGhpcyByZXF1ZXN0IHdpbGxcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2NlZWQ6IHRoZSBzZXNzaW9uIGlzIGF1dGhlbnRpY2F0ZWQuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBsb2FkVXNlciAgICAgICAgICAgIE1ha2VzIGFuIEFQSSBjYWxsIHRvIGZldGNoIGFuIHVwLXRvLWRhdGUgY29weSBvZiB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIncyBwcm9maWxlLiBJZiB0aGlzIHJlcXVlc3QgaXMgc3VjY2Vzc2Z1bCwgdGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyIG9iamVjdCB3aWxsIGJlIG92ZXJ3cml0dGVuIHdpdGggYSBmcmVzaCBjb3B5LlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gbG9naW4gICAgICAgICAgICAgICBBIGNvbnZlbmllbmNlIGZ1bmN0aW9uIHRoYXQgZmlyc3QgYXV0aGVudGljYXRlcyB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIgYW5kIHRoZW4gZ29lcyBvbiB0byBmZXRjaCB0aGVpciB1c2VyIHByb2ZpbGUsIGlmXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzZnVsLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gbG9nb3V0ICAgICAgICAgICAgICBBbiBhbGlhcyBmb3IgZGVhdXRoZW50aWNhdGUoKS4gSXQgZG9lcyBleGFjdGx5IHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2FtZSB0aGluZy5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHJlY292ZXJQYXNzd29yZCAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gY29tcGxldGUgdGhlIHBhc3N3b3JkIHJlY292ZXJ5XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzIHN0YXJ0ZWQgYnkgY2FsbGluZyBmb3Jnb3RQYXNzd29yZCgpLiBUaGUgdXNlclxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VibWl0cyBhIG5ldyBwYXNzd29yZCBhbmQgYSB1bmlxdWUgaGFzaCBzZW50IHRvIHRoZWlyXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbWFpbCBhY2NvdW50IHRvIGF1dGhvcml6ZSB0aGUgcGFzc3dvcmQgY2hhbmdlLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gcmVnaXN0ZXIgICAgICAgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byByZWdpc3RlciBhIG5ldyB1c2VyIGFjY291bnQuIFRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlciBwcm92aWRlcyB0aGVpciBlbWFpbCwgcGFzc3dvcmQsIGZpcnN0IG5hbWUsIGxhc3RcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgYW5kIGFuIGFwcC1zcGVjaWZpYyBvYmplY3QgdGhhdCBjYW4gc3RvcmUgYW55XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRpdGlvbmFsIGRhdGEgdGhhdCB5b3VyIGFwcCByZXF1aXJlcy4gSWYgZW1haWxcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbiBpcyBlbmFibGVkIGluIHRoZSBCcmlkZ2UgU2VydmVyLCB0aGVuIGFuXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbWFpbCB3aWxsIGJlIHNlbnQgdG8gdGhlIHVzZXIncyBlbWFpbCBhZGRyZXNzIHdpdGggYVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVVJMIHRvIGZvbGxvdyB0byBjb21wbGV0ZSB0aGVpciByZWdpc3RyYXRpb24uIFRoZWlyXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RyYXRpb24gaXMgY29tcGxldGVkIGJ5IGNhbGxpbmcgdmVyaWZ5RW1haWwoKS5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHJlcXVlc3QgICAgICAgICAgICAgVGhpcyBpcyB0aGUgbW9zdCBnZW5lcmFsLXB1cnBvc2UgZnVuY3Rpb24gZm9yIG1ha2luZ1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQVBJIGNhbGxzIGF2YWlsYWJsZSB0byB5b3UuIEl0IHRha2VzIHRoZSBIVFRQIG1ldGhvZCxcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVSTCwgYW5kIHBheWxvYWQgb2YgeW91ciByZXF1ZXN0IGFuZCB0cmFuc21pdHMgaXQuIFlvdVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0IGEgUSBwcm9taXNlIGluIHJldHVybiB0aGF0IHlvdSBjYW4gdXNlIHRvIGhhbmRsZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyBhbmQgZmFpbHVyZSBvZiB5b3VyIHJlcXVlc3QsIHdoYXRldmVyIGl0IG1heVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmUuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSByZXN1bWUgICAgICAgICAgICAgIE1ha2VzIGFuIEFQSSBjYWxsIHRvIGNoZWNrIGlmIHRoZSBzZXNzaW9uIGlzXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGVkLCBhbmQgaWYgaXQgaXMsIHRoZW4gdGhlIHVzZXIgcHJvZmlsZSBpc1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGVkIHRvIHJlc3VtZSB0aGUgc2Vzc2lvbi4gSWYgdGhlIHVzZXIgcHJvZmlsZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0IGhhcyBiZWVuIG1vZGlmaWVkLCB0aGlzIHJlcXVlc3Qgd2lsbCByZWplY3RcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpdGggYW4gZXJyb3IgdG8gcHJlc2VydmUgYW55IGNoYW5nZXMgKHNpbmNlIGNoYW5nZXNcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lYW4gdGhlIHNlc3Npb24gaXMgYWxyZWFkeSBzdGFydGVkKS5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHNhdmVVc2VyICAgICAgICAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gc3VibWl0IHRoZSBjdXJyZW50IHVzZXIgb2JqZWN0IHRvXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgZGF0YWJhc2UgYXMgdGhlIHVwLXRvLWRhdGUgY29weS4gSWYgc3VjY2Vzc2Z1bCxcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSB1c2VyJ3MgcHJvZmlsZSBpbiB0aGUgZGF0YWJhc2Ugd2lsbCBiZSB1cGRhdGVkLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gdmVyaWZ5RW1haWwgICAgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byBjb21wbGV0ZSB0aGUgcmVnaXN0cmF0aW9uIHByb2Nlc3NcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ZWQgYnkgY2FsbGluZyByZWdpc3RlcigpLiBUaGUgdXNlciBtdXN0IHN1cHBseSBhXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1bmlxdWUgaGFzaCB0aGF0IHdhcyBzZW50IHRvIHRoZWlyIGVtYWlsIGFkZHJlc3MgaW5cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9yZGVyIHRvIHZlcmlmeSB0aGVpciBlbWFpbCBhZGRyZXNzIGFuZCBhdXRob3JpemUgdGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmF0aW9uIG9mIHRoZWlyIGFjY291bnQgKGlmIHRoZSBCcmlkZ2UgU2VydmVyIGhhc1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1haWwgdmVyaWZpY2F0aW9uIGVuYWJsZWQpLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gc2VuZFJlcXVlc3QgICAgICAgICBUaGlzIGZ1bmN0aW9uIGlzIHRoZSBsb3dlc3QtbGV2ZWwgaW1wbGVtZW50YXRpb24gb2ZcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFhIUiBiZWhhdmlvdXIgd2l0aGluIEJyaWRnZS4gQnkgZGVmYXVsdCwgaXQgaXNcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyZWQgdG8gdXNlIHRoZSBYbWxIdHRwUmVxdWVzdCBvYmplY3QgaW4gSlMgdG9cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbmQgcmVxdWVzdHMsIGJ1dCBjYW4gYmUgb3ZlcnJpZGRlbiBieSBhbm90aGVyXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvZiB5b3VyIG93biBjcmVhdGlvbiwgYXMgbG9uZyBhcyBpdCBpcyBvZiB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhbWUgc2lnbmF0dXJlLiBUaGlzIGlzIHVzZWZ1bCBpZiB5b3Ugd2FudCB0byBtYWtlIGFcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBsdWdpbiBmb3IgQnJpZGdlIHRvIGludGVyZmFjZSB3aXRoIGFub3RoZXIgbGlicmFyeSBvclxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJhbWV3b3JrIHN1Y2ggYXMgQW5ndWxhckpTLlxyXG4gICAqXHJcbiAgICovXHJcbiAgbW9kdWxlLmV4cG9ydHMgPSB7XHJcblxyXG4gICAgLy8gR2V0dGVycy9TZXR0ZXJzIGZvciBQcm9wZXJ0aWVzXHJcbiAgICBnZXREZWJ1ZyAgICAgICAgICAgIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvcmUuZGVidWc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgIHNldERlYnVnICAgICAgICAgICAgOiBmdW5jdGlvbiAoIHZhbHVlICkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29yZS5kZWJ1ZyA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICBnZXRFcnJvcnMgICAgICAgICAgIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycm9ycztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgZ2V0SXNVc2VyTG9nZ2VkSW4gICA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3JlLmlzVXNlckxvZ2dlZEluKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgIGdldElzVXNlck1vZGlmaWVkICAgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29yZS5pc1VzZXJNb2RpZmllZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICBnZXRSZW1lbWJlck1lICAgICAgIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvcmUucmVtZW1iZXJNZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgZ2V0VXNlciAgICAgICAgICAgICA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3JlLnVzZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuXHJcbiAgICAvLyBDYWxsYmFja3NcclxuICAgIG9uUmVxdWVzdENhbGxlZCAgICAgOiBjb3JlLm9uUmVxdWVzdENhbGxlZCxcclxuXHJcbiAgICAvLyBDb21tYW5kc1xyXG4gICAgcmVxdWVzdCAgICAgICAgICAgICA6IGNvcmUucmVxdWVzdCxcclxuICAgIGF1dGhlbnRpY2F0ZSAgICAgICAgOiBhdXRoZW50aWNhdGUsXHJcbiAgICBkZWF1dGhlbnRpY2F0ZSAgICAgIDogZGVhdXRoZW50aWNhdGUsXHJcbiAgICBmb3Jnb3RQYXNzd29yZCAgICAgIDogZm9yZ290UGFzc3dvcmQsXHJcbiAgICBpc0F1dGhlbnRpY2F0ZWQgICAgIDogaXNBdXRoZW50aWNhdGVkLFxyXG4gICAgbG9hZFVzZXIgICAgICAgICAgICA6IGxvYWRVc2VyLFxyXG4gICAgbG9naW4gICAgICAgICAgICAgICA6IGxvZ2luLFxyXG4gICAgbG9nb3V0ICAgICAgICAgICAgICA6IGxvZ291dCxcclxuICAgIHJlY292ZXJQYXNzd29yZCAgICAgOiByZWNvdmVyUGFzc3dvcmQsXHJcbiAgICByZWdpc3RlciAgICAgICAgICAgIDogcmVnaXN0ZXIsXHJcbiAgICByZXN1bWUgICAgICAgICAgICAgIDogcmVzdW1lLFxyXG4gICAgc2F2ZVVzZXIgICAgICAgICAgICA6IHNhdmVVc2VyLFxyXG4gICAgdmVyaWZ5RW1haWwgICAgICAgICA6IHZlcmlmeUVtYWlsLFxyXG5cclxuICAgIC8vIFhIUiBJbnRlcmZhY2VcclxuICAgIHNlbmRSZXF1ZXN0ICAgICAgICAgOiBjb3JlLnNlbmRSZXF1ZXN0XHJcblxyXG4gIH07XHJcblxyXG59ICkoKTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGF1dGhlbnRpY2F0ZVxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIENyeXB0b0VuY0hleCA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL2NyeXB0by1qcy9lbmMtaGV4JyApO1xyXG52YXIgQ3J5cHRvU2hhMjU2ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1NicgKTtcclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGF1dGhlbnRpY2F0ZSBbUE9TVF1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gdmFsaWRhdGUgdGhlIGN1cnJlbnQgc2Vzc2lvbiBieSBzZW5kaW5nIGFuIGF1dGhvcml6YXRpb24gY29va2llXHJcbiAqICAgICAgICAgICAgICAgIHRoYXQgd2lsbCBpZGVudGlmeSB0aGUgYXV0aGVudGljYXRlZCB1c2VyLiBUaGUgY29va2llIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlclxyXG4gKiAgICAgICAgICAgICAgICB3aWxsIG9wZXJhdGUgdW5kZXIgdGhlIHNhbWUgZG9tYWluIHBvbGljeSBhbmQgdGhlIFwiSHR0cE9ubHlcIiByZXN0cmljdGlvbiB0b1xyXG4gKiAgICAgICAgICAgICAgICBwcmV2ZW50IFhTUyBhdHRhY2tzIGZyb20gc3RlYWxpbmcgdXNlciBhdXRoZW50aWNhdGlvbiB0b2tlbnMgYW5kIG1hc3F1ZXJhZGluZyBhc1xyXG4gKiAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGVkIHVzZXJzLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gZW1haWwgICAgICAgIFRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gcGFzc3dvcmQgICAgIFRoZSB1c2VyJ3MgcGFzc3dvcmQgKG5vdCBoYXNoZWQgeWV0KS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge0Jvb2xlYW59IHJlbWVtYmVyTWUgIEEgYm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdvdWxkIGxpa2UgdG9cclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlIGF1dG9tYXRpY2FsbHkgbG9nZ2VkLWluIGluIHRoZSBmdXR1cmUuIElmIHJlbWVtYmVyTWUgaXNcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldCB0byBmYWxzZSwgdGhlIGF1dGhlbnRpY2F0aW9uIGNvb2tpZSBzZW50IGJ5IHRoZSBzZXJ2ZXJcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbGwgZXhwaXJlIHdoZW4gdGhlIGN1cnJlbnQgYnJvd3NlciBzZXNzaW9uIGVuZHMuIElmIHRoaXNcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzIHNldCB0byB0cnVlLCBpdCB3aWxsIGV4cGlyZSBhZnRlciBhIHBlcmlvZCBvZiB0aW1lXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZpbmVkIGJ5IHRoZSBCcmlkZ2Ugc2VydmVyIGNvbmZpZyBmaWxlIChkZWZhdWx0IDIgd2Vla3MpLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhdXRoZW50aWNhdGUoIGFwaVVybCwgZW1haWwsIHBhc3N3b3JkLCByZW1lbWJlck1lICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIEJ1aWxkIHRoZSByZXF1ZXN0IHBheWxvYWQgKGhhc2ggdGhlIHBhc3N3b3JkIHdpdGggU0hBMjU2KS5cclxuICB2YXIgcGF5bG9hZCA9IHtcclxuICAgIGVtYWlsOiBlbWFpbCxcclxuICAgIHBhc3N3b3JkOiBDcnlwdG9TaGEyNTYoIHBhc3N3b3JkLnRvU3RyaW5nKCkgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICksXHJcbiAgICByZW1lbWJlck1lOiByZW1lbWJlck1lXHJcbiAgfTtcclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgY29yZS5yZXF1ZXN0KCAnUE9TVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvYXV0aGVudGljYXRlJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSB0aGUgc3RydWN0dXJlIG9mIHRoZSByZXNwb25zZSwgYW5kIGlmIGludmFsaWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGFcclxuICAgICAgLy8gbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgaWYgKCB0eXBlb2YoIGRhdGEgKSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgY29yZS5yZWplY3QoIFwiQXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTUFMRk9STUVEX1JFU1BPTlNFICkgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNldCB0aGUgc2Vzc2lvbiBhcyBiZWluZyBhdXRoZW50aWNhdGVkIGFuZCBzdG9yZSB0aGUgXCJyZW1lbWJlciBtZVwiIHN0YXRlLlxyXG4gICAgICBjb3JlLmlzQXV0aGVudGljYXRlZCA9IHRydWU7XHJcbiAgICAgIGNvcmUucmVtZW1iZXJNZSA9IHJlbWVtYmVyTWU7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgZm9ybWF0IGlzIHZhbGlkLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb2JqZWN0LlxyXG4gICAgICBjb3JlLnJlc29sdmUoIFwiQXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIkF1dGhlbnRpY2F0ZVwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGF1dGhlbnRpY2F0ZVxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGRlYXV0aGVudGljYXRlIFtERUxFVEVdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIGludmFsaWRhdGUgdGhlIGN1cnJlbnQgc2Vzc2lvbiBieSBleHBpcmluZyB0aGUgYXV0aGVudGljYXRpb25cclxuICogICAgICAgICAgICAgICAgY29va2llIHVzZWQgYnkgdGhpcyBjbGllbnQuIFRoaXMgaXMgbmVjZXNzYXJ5IHJhdGhlciB0aGFuIHNldHRpbmcgdGhlIGF1dGggY29va2llXHJcbiAqICAgICAgICAgICAgICAgIGluIEphdmFTY3JpcHQgZGlyZWN0bHkgYmVjYXVzZSB0aGUgQnJpZGdlIHNlcnZlciBpbXBvc2VzIHRoZSBcIkh0dHBPbmx5XCJcclxuICogICAgICAgICAgICAgICAgcmVzdHJpY3Rpb24gdXBvbiB0aGUgYXV0aG9yaXphdGlvbiBjb29raWUgdG8gcHJldmVudCBhbiBYU1MgYXR0YWNrIGZyb20gaGlqYWNraW5nXHJcbiAqICAgICAgICAgICAgICAgIGEgdXNlcidzIHNlc3Npb24gdG9rZW4gYW5kIG1hc3F1ZXJhZGluZyBhcyB0aGUgYXV0aGVudGljYXRlZCB1c2VyLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYXV0aGVudGljYXRlKCBhcGlVcmwgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgYW5kIGVtcHR5IHJlcXVlc3QgcGF5bG9hZCAoZG9uJ3QgbmVlZCB0byBzZW5kIGFueXRoaW5nKS5cclxuICB2YXIgcGF5bG9hZCA9IHt9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBjb3JlLnJlcXVlc3QoICdERUxFVEUnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL2RlYXV0aGVudGljYXRlJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSB0aGUgc3RydWN0dXJlIG9mIHRoZSByZXNwb25zZSwgYW5kIGlmIGludmFsaWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGFcclxuICAgICAgLy8gbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgaWYgKCB0eXBlb2YoIGRhdGEgKSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgY29yZS5yZWplY3QoIFwiRGVhdXRoZW50aWNhdGVcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gUmVzZXQgdGhlIHNlc3Npb24gdG8gY2xlYXIgYWxsIHVzZXIgZGF0YVxyXG4gICAgICBjb3JlLnJlc2V0U2Vzc2lvbigpO1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZvcm1hdCBpcyB2YWxpZCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9iamVjdC5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIkRlYXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIkRlYXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgZm9yZ290UGFzc3dvcmRcclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBRID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvcScgKTtcclxudmFyIGNvcmUgPSByZXF1aXJlKCAnLi4vY29yZScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICBmb3Jnb3RQYXNzd29yZCBbUFVUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byBzZXQgdGhlIHVzZXIgaW50byByZWNvdmVyeSBzdGF0ZSBmb3IgYSBzaG9ydCBwZXJpb2Qgb2YgdGltZVxyXG4gKiAgICAgICAgICAgICAgICBhbmQgc2VuZCBhbiBhY2NvdW50IHJlY292ZXJ5IGVtYWlsIHRvIHRoZSBlbWFpbCBhY2NvdW50IHByb3ZpZGVkIGhlcmUuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBlbWFpbCAgICBUaGUgdXNlcidzIGVtYWlsIGFkZHJlc3MuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yZ290UGFzc3dvcmQoIGFwaVVybCwgZW1haWwgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgdGhlIHJlcXVlc3QgcGF5bG9hZC5cclxuICB2YXIgcGF5bG9hZCA9IHtcclxuICAgIGVtYWlsOiBlbWFpbFxyXG4gIH07XHJcblxyXG4gIC8vIFNlbmQgdGhlIHJlcXVlc3QgYW5kIGhhbmRsZSB0aGUgcmVzcG9uc2UuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gIGNvcmUucmVxdWVzdCggJ1BVVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvZm9yZ290LXBhc3N3b3JkJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCAgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJGb3Jnb3QgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIkZvcmdvdCBQYXNzd29yZFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgIH0sXHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3QgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJGb3Jnb3QgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGF1dGhlbnRpY2F0ZVxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGlzQXV0aGVudGljYXRlZCBbR0VUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciBpZiB0aGUgY2xpZW50IGhhcyBhbiBhdXRoZW50aWNhdGlvbiBjb29raWUgc2V0IHRvIGF1dGhlbnRpY2F0ZSB0aGVcclxuICogICAgICAgICAgICAgICAgY3VycmVudCBzZXNzaW9uLiBUaGlzIGNhbiBiZSBjYWxsZWQgd2hlbiBhbiBhcHBsaWNhdGlvbiBmaXJzdCBsb2FkcyB0byBjaGVjayBmb3JcclxuICogICAgICAgICAgICAgICAgYW5kIGF1dGggY29va2llIHRoYXQgaXMgc3RpbGwgdmFsaWQgKHRoZSB1c2VyIGNob3NlIHRoZSBcInJlbWVtYmVyIG1lXCIgb3B0aW9uIGFuZFxyXG4gKiAgICAgICAgICAgICAgICB0aGUgY29va2llIGhhcyBub3QgeWV0IGV4cGlyZWQpLiBJZiB0aGUgcmVxdWVzdCBpcyBzdWNjZXNzZnVsLCB0aGUgQVBJIHNlcnZlciB3aWxsXHJcbiAqICAgICAgICAgICAgICAgIHNldCBhIGZyZXNoIGF1dGggY29va2llIGZvciB0aGlzIGNsaWVudC5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgICAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXR0ZXIgd2hldGhlciB0aGUgdHJhaWxpbmcgZm9yd2FyZC1zbGFzaCBpcyBsZWZ0IG9uIG9yIG5vdFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQXV0aGVudGljYXRlZCggYXBpVXJsICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIEJ1aWxkIGFuZCBlbXB0eSByZXF1ZXN0IHBheWxvYWQgKGRvbid0IG5lZWQgdG8gc2VuZCBhbnl0aGluZykuXHJcbiAgdmFyIHBheWxvYWQgPSB7fTtcclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgY29yZS5yZXF1ZXN0KCAnR0VUJywgY29yZS5zdHJpcFRyYWlsaW5nU2xhc2goIGFwaVVybCApICsgJy9pcy1hdXRoZW50aWNhdGVkJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSB0aGUgc3RydWN0dXJlIG9mIHRoZSByZXNwb25zZSwgYW5kIGlmIGludmFsaWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGFcclxuICAgICAgLy8gbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgaWYgKCB0eXBlb2YoIGRhdGEgKSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgY29yZS5yZWplY3QoIFwiSXMgQXV0aGVudGljYXRlZFwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk1BTEZPUk1FRF9SRVNQT05TRSApICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBTZXQgdGhlIHNlc3Npb24gYXMgYmVpbmcgYXV0aGVudGljYXRlZC5cclxuICAgICAgY29yZS5pc0F1dGhlbnRpY2F0ZWQgPSB0cnVlO1xyXG5cclxuICAgICAgLy8gU2V0IFwicmVtZW1iZXIgbWVcIiBjb25kaXRpb25hbGx5OiBJZiBhIHVzZXIgb2JqZWN0IGV4aXN0cywgdGhlbiB0aGlzIGlzIGFuIGV4aXN0aW5nIHNlc3Npb25cclxuICAgICAgLy8gaW4gd2hpY2ggdGhlIHVzZXIgYXV0aGVudGljYXRlZCBwcmV2aW91c2x5LCBzbyB0aGUgdmFsdWUgY2FuIGJlIHRha2VuIGZyb20gQnJpZGdlLiBJZiBub3QsXHJcbiAgICAgIC8vIHRoZW4gdGhpcyBpcyBhIHNlc3Npb24ganVzdCBiZWdpbm5pbmcsIHNvIGlmIGl0IGhhcyBhbiBhdXRoIGNvb2tpZSB0aGUgdXNlciBtdXN0IGhhdmUgc2V0XHJcbiAgICAgIC8vIHRoZSBcInJlbWVtYmVyIG1lXCIgZmxhZyBwcmV2aW91c2x5LlxyXG4gICAgICBjb3JlLnJlbWVtYmVyTWUgPSAoIGNvcmUudXNlciApID8gY29yZS5yZW1lbWJlck1lIDogdHJ1ZTtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmb3JtYXQgaXMgdmFsaWQsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvYmplY3QuXHJcbiAgICAgIGNvcmUucmVzb2x2ZSggXCJJcyBBdXRoZW50aWNhdGVkXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIFJlc2V0IHRoZSBzZXNzaW9uIHRvIGNsZWFyIGFsbCB1c2VyIGRhdGEuXHJcbiAgICAgIGNvcmUucmVzZXRTZXNzaW9uKCk7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJJcyBBdXRoZW50aWNhdGVkXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgZ2V0VXNlclByb2ZpbGVcclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBRID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvcScgKTtcclxudmFyIGNvcmUgPSByZXF1aXJlKCAnLi4vY29yZScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICBsb2FkVXNlciBbR0VUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byBmZXRjaCB0aGUgY3VycmVudCBjb3B5IG9mIHRoZSBjdXJyZW50bHkgbG9nZ2VkLWluIHVzZXIncyBwcm9maWxlXHJcbiAqICAgICAgICAgICAgICAgIGZyb20gdGhlIGRhdGFiYXNlIGFuZCBzZXQgaXQgYXMgQnJpZGdlJ3MgdXNlciBwcm9maWxlIG9iamVjdC4gVGhpcyBXSUxMIG92ZXJ3cml0ZVxyXG4gKiAgICAgICAgICAgICAgICBhbnkgdW5zYXZlZCBjaGFuZ2VzIHRvIHRoZSBleGlzdGluZyB1c2VyIHByb2ZpbGUgb2JqZWN0LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge0Jvb2xlYW59IG92ZXJ3cml0ZSAgIEEgZmxhZyBpbmRpY2F0aW5nIHRoYXQsIGluIHRoZSBldmVudCB0aGF0IHRoaXMgbG9hZFVzZXIoKVxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbCB3aWxsIG92ZXJ3cml0ZSB1bnNhdmVkIGNoYW5nZXMgb24gdGhlIGNsaWVudCwgdGhlXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb24gd2lsbCBiZSBjYXJyaWVkIG91dCByYXRoZXIgdGhhbiByZWplY3Rpbmcgd2l0aCBhblxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IgdG8gd2FybiBvZiB0aGUgb3ZlcndyaXRlLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBsb2FkVXNlciggYXBpVXJsLCBvdmVyd3JpdGUgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQ2hlY2sgZm9yIHVuc2F2ZWQgY2hhbmdlcyB0aGF0IG1pZ2h0IGJlIG92ZXJ3cml0dGVuIGFuZCByZWplY3Qgd2l0aCBhIG5ldyBlcnJvciBpbmRpY2F0aW5nIHRoYXRcclxuICAvLyB0aGVzZSBjaGFuZ2VzIHdpbGwgYmUgbG9zdCAodW5sZXNzIHRoZSBvdmVyd3JpdGUgZmxhZyBpcyBzZXQpLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBpZiAoICFvdmVyd3JpdGUgJiYgY29yZS5pc1VzZXJNb2RpZmllZCgpICkge1xyXG4gICAgY29yZS5yZWplY3QoIFwiTG9hZCBVc2VyXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuV0lMTF9MT1NFX1VOU0FWRURfQ0hBTkdFUyApICk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICB9XHJcblxyXG4gIC8vIEJ1aWxkIGFuZCBlbXB0eSByZXF1ZXN0IHBheWxvYWQgKGRvbid0IG5lZWQgdG8gc2VuZCBhbnl0aGluZykuXHJcbiAgdmFyIHBheWxvYWQgPSB7fTtcclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICBjb3JlLnJlcXVlc3QoICdHRVQnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL3VzZXInLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoICEoIGRhdGEgaW5zdGFuY2VvZiBPYmplY3QgKSApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJMb2FkIFVzZXJcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQXNzaWduIHRoZSB1c2VyIHByb2ZpbGUgYXMgdGhlIHVzZXIgb2JqZWN0LlxyXG4gICAgICAvLyBOb3RlOiBKU09OIHN0cmluZ2lmeSgpaW5nIHRoZSB1c2VyIHByb2ZpbGUga2VlcHMgYSBzdGF0aWMgY29weSB3ZSBjYW4gY29tcGFyZSBhZ2FpbnN0LlxyXG4gICAgICBjb3JlLnVzZXIgPSBkYXRhO1xyXG4gICAgICBjb3JlLnVuY2hhbmdlZFVzZXIgPSBKU09OLnN0cmluZ2lmeSggZGF0YSApO1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZvcm1hdCBpcyB2YWxpZCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9iamVjdC5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIkxvYWQgVXNlclwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgIH0sXHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJMb2FkIFVzZXJcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICk7XHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICBsb2dpblxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxudmFyIGF1dGhlbnRpY2F0ZSA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9hdXRoZW50aWNhdGUnICk7XHJcbnZhciBsb2FkVXNlciA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9sb2FkVXNlcicgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGxvZ2luIFthdXRoZW50aWNhdGUgPj4gbG9hZFVzZXJdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIGF1dGhlbnRpY2F0ZSB0aGUgdXNlciBnaXZlbiB0aGVpciBlbWFpbCBhbmQgcGFzc3dvcmQsIGFuZFxyXG4gKiAgICAgICAgICAgICAgICBmb2xsb3cgdGhlIGF1dGhlbnRpY2F0aW9uIChpZiBzdWNjZXNzZnVsKSB3aXRoIGEgcmVxdWVzdCBmb3IgdGhlIHVzZXIncyBwcm9maWxlLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gZW1haWwgICAgICAgIFRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gcGFzc3dvcmQgICAgIFRoZSB1c2VyJ3MgcGFzc3dvcmQgKG5vdCBoYXNoZWQgeWV0KS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge0Jvb2xlYW59IHJlbWVtYmVyTWUgIEEgYm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHdvdWxkIGxpa2UgdG9cclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhdmUgYSBsb25nIGV4cGlyeSBkYXRlIG9yIG5vdC4gSWYgdGhpcyBpcyB0cnVlLCB0aGVuIHRoZVxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQnJpZGdlIHNlcnZlciB3aWxsIHJldHVybiBhbiBhdXRoIHRva2VuIHdpdGggYW4gZXhwaXJ5XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbiB0aGUgb3JkZXIgb2YgMiB3ZWVrcyAoYnV0IGNhbiBiZSBtb2RpZmllZCBpbiB0aGUgc2VydmVyXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncykuIElmIGZhbHNlLCB0aGUgZXhwaXJ5IHdpbGwgb25seSBiZSBhYm91dCA2XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3VycyAoYWdhaW4sIHRoaXMgaXMgY29uZmlndXJhYmxlKS5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbG9naW4oIGFwaVVybCwgZW1haWwsIHBhc3N3b3JkLCByZW1lbWJlck1lICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIFNlbmQgYW4gYXV0aGVudGljYXRpb24gcmVxdWVzdC5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgYXV0aGVudGljYXRlKCBhcGlVcmwsIGVtYWlsLCBwYXNzd29yZCwgcmVtZW1iZXJNZSApLnRoZW4oXHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRlIHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIElmIGF1dGhlbnRpY2F0aW9uIHdhcyBzdWNjZXNzZnVsLCBzZW5kIGEgcmVxdWVzdCB0byBmZXRjaCB0aGUgdXNlcidzIHByb2ZpbGUuXHJcbiAgICAgIGxvYWRVc2VyKCBhcGlVcmwgKS50aGVuKFxyXG4gICAgICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgICAvLyBJZiBmZXRjaGluZyB0aGUgdXNlciBwcm9maWxlIGlzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgICAgIGNvcmUucmVzb2x2ZSggXCJMb2dpblwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAgICAgLy8gSWYgZmV0Y2hpbmcgdGhlIHVzZXIgcHJvZmlsZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QuXHJcbiAgICAgICAgICBjb3JlLnJlamVjdCggXCJMb2dpblwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG5cclxuICAgIH0sXHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0ZSB3YXMgcmVqZWN0ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgYXV0aGVudGljYXRpb24gZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJMb2dpblwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgbG9naW5cclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBkZWF1dGhlbnRpY2F0ZSA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9kZWF1dGhlbnRpY2F0ZScgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGxvZ291dCBbZGVhdXRoZW50aWNhdGUgKGFsaWFzKV1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gaW52YWxpZGF0ZSB0aGUgY3VycmVudCBzZXNzaW9uIGJ5IGV4cGlyaW5nIHRoZSBhdXRoZW50aWNhdGlvblxyXG4gKiAgICAgICAgICAgICAgICBjb29raWUgdXNlZCBieSB0aGlzIGNsaWVudC4gVGhpcyBmdW5jdGlvbiBpcyBtZXJlbHkgYW4gYWxpYXMgZm9yIGRlYXV0aGVudGljYXRlKClcclxuICogICAgICAgICAgICAgICAgc3VjaCB0aGF0IGxvZ2luIGFuZCBsb2dvdXQgZm9ybSBhIGxvZ2ljYWwgcGFpciBvZiBvcGVyYXRpb25zIGZvciBBUEkgY29uc2lzdGVuY3kuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXQgZG9lc24ndFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBkZWF1dGhlbnRpY2F0ZTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIHJlY292ZXJQYXNzd29yZFxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIENyeXB0b0VuY0hleCA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL2NyeXB0by1qcy9lbmMtaGV4JyApO1xyXG52YXIgQ3J5cHRvU2hhMjU2ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1NicgKTtcclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIHJlY292ZXJQYXNzd29yZCBbUFVUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byBzZXQgdGhlIHBhc3N3b3JkIG9mIHRoZSB1c2VyIGFjY291bnQgYXNzb2NpYXRlZCB3aXRoIHRoZVxyXG4gKiAgICAgICAgICAgICAgICBwcm92aWRlZCByZWNvdmVyeSBoYXNoIHRoYXQgd2FzIHNlbnQgdG8gdGhlIHVzZXIncyBlbWFpbCBhZGRyZXNzLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gcGFzc3dvcmQgICBBIG5ldyBwYXNzd29yZCB0byBhc3NpZ24gZm9yIHRoZSB1c2VyLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBoYXNoICAgICAgIFRoZSBoYXNoIHN0cmluZyB0aGF0IHdhcyBzZW50IHRvIHRoZSB1c2VyIGluIHRoZSBwYXNzd29yZFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY292ZXJ5IGVtYWlsLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcmVjb3ZlclBhc3N3b3JkKCBhcGlVcmwsIHBhc3N3b3JkLCBoYXNoICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIEJ1aWxkIHRoZSByZXF1ZXN0IHBheWxvYWQgKGhhc2ggdGhlIHBhc3N3b3JkIHdpdGggU0hBMjU2KS5cclxuICB2YXIgcGF5bG9hZCA9IHtcclxuICAgIGhhc2g6IGhhc2gsXHJcbiAgICBwYXNzd29yZDogQ3J5cHRvU2hhMjU2KCBwYXNzd29yZC50b1N0cmluZygpICkudG9TdHJpbmcoIENyeXB0b0VuY0hleCApXHJcbiAgfTtcclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgY29yZS5yZXF1ZXN0KCAnUFVUJywgY29yZS5zdHJpcFRyYWlsaW5nU2xhc2goIGFwaVVybCApICsgJy9yZWNvdmVyLXBhc3N3b3JkJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCAgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJSZWNvdmVyIFBhc3N3b3JkXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTUFMRk9STUVEX1JFU1BPTlNFICkgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEuXHJcbiAgICAgIGNvcmUucmVzb2x2ZSggXCJSZWNvdmVyIFBhc3N3b3JkXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVqZWN0ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVxdWVzdCBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIlJlY292ZXIgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIHJlZ2lzdGVyXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgQ3J5cHRvRW5jSGV4ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL2VuYy1oZXgnICk7XHJcbnZhciBDcnlwdG9TaGEyNTYgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvc2hhMjU2JyApO1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG52YXIgbG9naW4gPSByZXF1aXJlKCAnLi4vY29tbWFuZHMvbG9naW4nICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICByZWdpc3RlciBbUE9TVCB1c2VycyA+PiBsb2dpbl1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gcmVnaXN0ZXIgYSB1c2VyIHdpdGggdGhlIGdpdmVuIGVtYWlsL3Bhc3N3b3JkIHBhaXIsIG5hbWUsIGFuZFxyXG4gKiAgICAgICAgICAgICAgICBhcHBsaWNhdGlvbi1zcGVjaWZpYyBkYXRhLiBUaGUgcGFzc3dvcmQgaXMgdHJhbnNtaXR0ZWQgaW4gdGhlIGNvbnRlbnQgb2YgdGhlXHJcbiAqICAgICAgICAgICAgICAgIG1lc3NhZ2UgU0hBLTI1NiBlbmNyeXB0ZWQgdG8gcHJvdGVjdCB0aGUgdXNlcidzIHBhc3N3b3JkIHRvIGEgbWluaW1hbCBleHRlbnRcclxuICogICAgICAgICAgICAgICAgZXZlbiB1bmRlciBpbnNlY3VyZSBjb25uZWN0aW9ucy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgICAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXR0ZXIgd2hldGhlciB0aGUgdHJhaWxpbmcgZm9yd2FyZC1zbGFzaCBpcyBsZWZ0IG9uIG9yIG5vdFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGVtYWlsICAgICAgICBUaGUgdXNlcidzIGVtYWlsIGFkZHJlc3MuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IHBhc3N3b3JkICAgICBUaGUgdXNlcidzIHBhc3N3b3JkIChub3QgeWV0IGhhc2hlZCkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGZpcnN0TmFtZSAgICBUaGUgdXNlcidzIGZpcnN0IG5hbWUuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGxhc3ROYW1lICAgICBUaGUgdXNlcidzIGxhc3QgbmFtZS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBwRGF0YSAgICAgIEEgSlNPTi5zdHJpbmdpZnkoKWVkIEphdmFTY3JpcHQgb2JqZWN0IG9mIGFueSBhcHBsaWNhdGlvbi1cclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwZWNpZmljIGRhdGEgdG8gc3RvcmUgZm9yIHRoaXMgdXNlci5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJlZ2lzdGVyKCBhcGlVcmwsIGVtYWlsLCBwYXNzd29yZCwgZmlyc3ROYW1lLCBsYXN0TmFtZSwgYXBwRGF0YSApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBDaGVjayBmb3IgaW52YWxpZCBwYXNzd29yZCBmb3JtYXQgYW5kIHJlamVjdCBpdCB3aXRoIGEgbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHdoeSB0aGVcclxuICAvLyBwYXNzd29yZCB3YXMgbm90IGFjY2VwdGFibGUuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG5cclxuICBpZiAoIHR5cGVvZiBwYXNzd29yZCAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICBjb3JlLnJlamVjdCggXCJSZWdpc3RlclwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggMCApICk7XHJcbiAgfVxyXG5cclxuICBpZiAoIHBhc3N3b3JkLmxlbmd0aCA8IDEgKSB7XHJcbiAgICBjb3JlLnJlamVjdCggXCJSZWdpc3RlclwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLlBBU1NXT1JEX1RPT19TSE9SVCApICk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICB9XHJcblxyXG4gIC8vIEJ1aWxkIHRoZSByZXF1ZXN0IHBheWxvYWQgKGhhc2ggdGhlIHBhc3N3b3JkIHdpdGggU0hBMjU2KS5cclxuICB2YXIgcGF5bG9hZCA9IHtcclxuICAgIGFwcERhdGE6IGFwcERhdGEsXHJcbiAgICBlbWFpbDogZW1haWwsXHJcbiAgICBmaXJzdE5hbWU6IGZpcnN0TmFtZSxcclxuICAgIGxhc3ROYW1lOiBsYXN0TmFtZSxcclxuICAgIHBhc3N3b3JkOiBDcnlwdG9TaGEyNTYoIHBhc3N3b3JkLnRvU3RyaW5nKCkgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICksXHJcbiAgfTtcclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICBjb3JlLnJlcXVlc3QoICdQT1NUJywgY29yZS5zdHJpcFRyYWlsaW5nU2xhc2goIGFwaVVybCApICsgJy91c2VyJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJSZWdpc3RlclwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk1BTEZPUk1FRF9SRVNQT05TRSApICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB0aGUgdXNlciBsb2dpbiBpcyBzdWNjZXNzZnVsLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEuXHJcbiAgICAgIGNvcmUucmVzb2x2ZSggXCJSZWdpc3RlclwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgIH0sXHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgcmVnaXN0cmF0aW9uIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgY29yZS5yZWplY3QoIFwiUmVnaXN0ZXJcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGxvZ2luXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG52YXIgaXNBdXRoZW50aWNhdGVkID0gcmVxdWlyZSggJy4uL2NvbW1hbmRzL2lzQXV0aGVudGljYXRlZCcgKTtcclxudmFyIGxvYWRVc2VyID0gcmVxdWlyZSggJy4uL2NvbW1hbmRzL2xvYWRVc2VyJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgcmVzdW1lIFtpc0F1dGhlbnRpY2F0ZWQgPj4gbG9hZFVzZXJdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIENoZWNrIGlmIHRoZSBjdXJyZW50IHVzZXIgaXMgYXV0aGVudGljYXRlZCwgYW5kIGlmIHRoZXkgYXJlLCB0aGVuIGNoZWNrIGlmIHRoZVxyXG4gKiAgICAgICAgICAgICAgICB1c2VyIHByb2ZpbGUgb2JqZWN0IGhhcyBiZWVuIG1vZGlmaWVkLiBJZiBpdCBoYXNuJ3QgYmVlbiwgbG9hZCB0aGUgdXNlciBwcm9maWxlXHJcbiAqICAgICAgICAgICAgICAgIHRvIHJlc3RvcmUgdGhlIHNlc3Npb24uXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXQgZG9lc24ndFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByZXN1bWUoIGFwaVVybCApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBTZW5kIGFuIGF1dGhlbnRpY2F0aW9uIHJlcXVlc3QuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gIGlzQXV0aGVudGljYXRlZCggYXBpVXJsICkudGhlbihcclxuXHJcbiAgICAvLyBJcyBBdXRoZW50aWNhdGUgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gT3RoZXJ3aXNlLCBzZW5kIGEgcmVxdWVzdCB0byBmZXRjaCB0aGUgdXNlcidzIHByb2ZpbGUuXHJcbiAgICAgIGxvYWRVc2VyKCBhcGlVcmwgKS50aGVuKFxyXG4gICAgICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgICAvLyBJZiBmZXRjaGluZyB0aGUgdXNlciBwcm9maWxlIGlzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgICAgIGNvcmUucmVzb2x2ZSggXCJSZXN1bWVcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgICAgIC8vIElmIGZldGNoaW5nIHRoZSB1c2VyIHByb2ZpbGUgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0LlxyXG4gICAgICAgICAgY29yZS5yZWplY3QoIFwiUmVzdW1lXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRlIHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiBhdXRoZW50aWNhdGlvbiBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIlJlc3VtZVwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgdXBkYXRlVXNlclByb2ZpbGVcclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBDcnlwdG9FbmNIZXggPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleCcgKTtcclxudmFyIENyeXB0b1NoYTI1NiA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL2NyeXB0by1qcy9zaGEyNTYnICk7XHJcbnZhciBRID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvcScgKTtcclxudmFyIGNvcmUgPSByZXF1aXJlKCAnLi4vY29yZScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcbnZhciBhdXRoZW50aWNhdGUgPSByZXF1aXJlKCAnLi4vY29tbWFuZHMvYXV0aGVudGljYXRlJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgc2F2ZVVzZXIgW1BVVF1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gc2F2ZSB0aGUgdXNlciBwcm9maWxlIG9mIHRoZSBjdXJyZW50bHkgbG9nZ2VkLWluIHVzZXIgdG8gdGhlXHJcbiAqICAgICAgICAgICAgICAgIEFQSSBzZXJ2ZXIncyBkYXRhYmFzZS4gVGhpcyBvcGVyYXRpb24gcmVxdWlyZXMgdGhlIHVzZXIncyBjdXJyZW50IHBhc3N3b3JkIHRvIGJlXHJcbiAqICAgICAgICAgICAgICAgIHN1cHBsaWVkIHRvIHJlLWF1dGhlbnRpY2F0ZSB0aGUgdXNlciBpZiB0aGV5IGludGVuZCB0byBjaGFuZ2UgdGhlaXIgcGFzc3dvcmQuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9lc24ndCBtYXR0ZXIgd2hldGhlciB0aGUgdHJhaWxpbmcgZm9yd2FyZC1zbGFzaCBpc1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQgb24gb3Igbm90IGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGN1cnJlbnRQYXNzd29yZCAgW09QVElPTkFMXSBUaGUgdXNlcidzIGN1cnJlbnQgcGFzc3dvcmQgKG5vdCB5ZXQgaGFzaGVkKSxcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiB0aGV5IHdvdWxkIGxpa2UgdG8gY2hhbmdlIHRoZWlyIHBhc3N3b3JkLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBuZXdQYXNzd29yZCAgICAgIFtPUFRJT05BTF0gVGhlIHBhc3N3b3JkIHRoZSB1c2VyIHdvdWxkIGxpa2UgdG8gY2hhbmdlIHRvXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKG5vdCB5ZXQgaGFzaGVkKS5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNhdmVVc2VyKCBhcGlVcmwsIGN1cnJlbnRQYXNzd29yZCwgbmV3UGFzc3dvcmQgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQ2hlY2sgdGhhdCB0aGUgdXNlciBvYmplY3QgaXMgc2V0LCBiZWNhdXNlIHdlIHdpbGwgbmVlZCB0byBhY2Nlc3MgaXRzIHByb3BlcnRpZXMuXHJcbiAgLy8gSWYgaXQgaXNuJ3QsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGEgbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgbm8gdXNlciBvYmplY3QgaXMgc2V0LlxyXG4gICAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gICAgaWYgKCAhY29yZS51c2VyICkge1xyXG4gICAgY29yZS5yZWplY3QoIFwiU2F2ZSBVc2VyXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTk9fVVNFUl9QUk9GSUxFICkgKTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgZm9yIGludmFsaWQgcGFzc3dvcmQgZm9ybWF0IGFuZCByZWplY3QgaXQgd2l0aCBhIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB3aHkgdGhlXHJcbiAgLy8gcGFzc3dvcmQgd2FzIG5vdCBhY2NlcHRhYmxlLlxyXG4gIGlmICggY3VycmVudFBhc3N3b3JkICYmIG5ld1Bhc3N3b3JkICYmIG5ld1Bhc3N3b3JkLmxlbmd0aCA8IDEgKSB7XHJcbiAgICBjb3JlLnJlamVjdCggXCJTYXZlIFVzZXJcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5QQVNTV09SRF9UT09fU0hPUlQgKSApO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgfVxyXG5cclxuICAvLyBTZXQgdGhlIHBheWxvYWQgdG8gdGhlIHVzZXIgcHJvZmlsZSBvYmplY3QsIGFuZCBpbmNsdWRlIHRoZSBjdXJyZW50IGFuZCBuZXcgcGFzc3dvcmRzIGFzXHJcbiAgLy8gYWRkaXRpb25hbCBwcm9wZXJ0aWVzIGlmIHRoZSB1c2VyIGludGVuZCB0byBjaGFuZ2UgdGhlaXIgcGFzc3dvcmQuXHJcbiAgdmFyIHBheWxvYWQgPSBjb3JlLnVzZXI7XHJcbiAgaWYgKCBjdXJyZW50UGFzc3dvcmQgJiYgbmV3UGFzc3dvcmQgKSB7XHJcbiAgICBwYXlsb2FkLmN1cnJlbnRQYXNzd29yZCA9IENyeXB0b1NoYTI1NiggY3VycmVudFBhc3N3b3JkLnRvU3RyaW5nKCkgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICk7XHJcbiAgICBwYXlsb2FkLnBhc3N3b3JkID0gQ3J5cHRvU2hhMjU2KCBuZXdQYXNzd29yZC50b1N0cmluZygpICkudG9TdHJpbmcoIENyeXB0b0VuY0hleCApO1xyXG4gIH1cclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICBjb3JlLnJlcXVlc3QoICdQVVQnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL3VzZXInLCBwYXlsb2FkICkudGhlbihcclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJTYXZlIFVzZXJcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdXBkYXRpbmcgdGhlIHVzZXIgcHJvZmlsZSBpcyBzdWNjZXNzZnVsLCB1cGRhdGUgdGhlIHVuY2hhbmdlZCB1c2VyIHRvIG1hdGNoIGFuZFxyXG4gICAgICAvLyByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEuXHJcbiAgICAgIGNvcmUudW5jaGFuZ2VkVXNlciA9IEpTT04uc3RyaW5naWZ5KCBjb3JlLnVzZXIgKTtcclxuICAgICAgY29yZS5yZXNvbHZlKCBcIlNhdmUgVXNlclwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgIH0sXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgdXBkYXRpbmcgdGhlIHVzZXIgcHJvZmlsZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIlNhdmUgVXNlclwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgKTtcclxuXHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICB2ZXJpZnlFbWFpbFxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIHZlcmlmeUVtYWlsIFtQVVRdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIG1hcmsgYSB1c2VyJ3MgYWNjb3VudCBoYXMgaGF2aW5nIGEgdmVyaWZpZWQgZW1haWwgYWRkcmVzc1xyXG4gKiAgICAgICAgICAgICAgICBieSBsb29raW5nIHVwIHRoZWlyIGFjY291bnQgdXNpbmcgdGhlIHByb3ZpZGVkIGFjY291bnQgdmVyaWZpY2F0aW9uIGhhc2ggdGhhdFxyXG4gKiAgICAgICAgICAgICAgICB3YXMgc2VudCB0byB0aGUgdXNlcidzIGVtYWlsIGFkZHJlc3MuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBoYXNoICAgICBUaGUgaGFzaCBzdHJpbmcgdGhhdCB3YXMgc2VudCB0byB0aGUgdXNlciBpbiB0aGUgYWNjb3VudFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb24gZW1haWwuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHZlcmlmeUVtYWlsKCBhcGlVcmwsIGhhc2ggKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgdGhlIHJlcXVlc3QgcGF5bG9hZC5cclxuICB2YXIgcGF5bG9hZCA9IHtcclxuICAgIGhhc2g6IGhhc2hcclxuICB9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBjb3JlLnJlcXVlc3QoICdQVVQnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL3ZlcmlmeS1lbWFpbCcsIHBheWxvYWQgKS50aGVuKFxyXG5cclxuICAgIC8vIFJlcXVlc3QgIHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSB0aGUgc3RydWN0dXJlIG9mIHRoZSByZXNwb25zZSwgYW5kIGlmIGludmFsaWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGFcclxuICAgICAgLy8gbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgaWYgKCB0eXBlb2YoIGRhdGEgKSAhPT0gJ3N0cmluZycgKSB7XHJcbiAgICAgICAgY29yZS5yZWplY3QoIFwiVmVyaWZ5IEVtYWlsXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTUFMRk9STUVEX1JFU1BPTlNFICkgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEuXHJcbiAgICAgIGNvcmUucmVzb2x2ZSggXCJWZXJpZnkgRW1haWxcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXF1ZXN0IGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgY29yZS5yZWplY3QoIFwiVmVyaWZ5IEVtYWlsXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICk7XHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICBjb3JlXHJcbiAqL1xyXG52YXIgUSA9IHJlcXVpcmUoICcuL2luY2x1ZGUvcScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuL2Vycm9ycy5qcycgKTtcclxuXHJcbi8vIEluY2x1ZGUgdGhlIHNlbmRSZXF1ZXN0IGZ1bmN0aW9uIGltcG9ydCBhcyBhbiBleHBvcnRcclxuZXhwb3J0cy5zZW5kUmVxdWVzdCA9IHJlcXVpcmUoICcuL3BsdWdpbnMvRGVmYXVsdC5qcycgKTtcclxuXHJcbi8vIENvbmZpZ3VyZSBRIHRvIHByb3ZpZGUgcHJvbWlzZSBzdGFjayB0cmFjZXMgaW4gZnVsbC5cclxuUS5sb25nU3RhY2tTdXBwb3J0ID0gdHJ1ZTtcclxuXHJcbiggZnVuY3Rpb24gKCkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gUHJvcGVydGllcyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvKipcclxuICAgKiBAcHJpdmF0ZVxyXG4gICAqIEBwcm9wZXJ0eSB7U3RyaW5nfSBBVVRIX0NPT0tJRV9OQU1FICBUaGUgbmFtZSBvZiB0aGUgQnJpZGdlIGF1dGhlbnRpY2F0aW9uIGNvb2tpZSBpbiB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJvd3NlcidzIGNvb2tpZSBzdG9yZS5cclxuICAgKi9cclxuICB2YXIgQVVUSF9DT09LSUVfTkFNRSA9ICdCcmlkZ2VBdXRoJztcclxuXHJcbiAgLyoqXHJcbiAgICogQHB1YmxpY1xyXG4gICAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gIGRlYnVnICBBIGZsYWcgdG8gZW5hYmxlIGV4dHJhIGNvbnNvbGUgbG9nZ2luZyBmb3IgZGVidWdnaW5nIHB1cnBvc2VzLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuZGVidWcgPSBmYWxzZTtcclxuXHJcbiAgLyoqXHJcbiAgICogQHB1YmxpY1xyXG4gICAqIEBwcm9wZXJ0eSB7Qm9vbGVhbn0gIHJlbWVtYmVyTWUgIFdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIHNlbGVjdGVkIHRoZSByZW1lbWJlciBtZSBvcHRpb24uXHJcbiAgICovXHJcbiAgZXhwb3J0cy5yZW1lbWJlck1lID0gZmFsc2U7XHJcblxyXG4gIC8qKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKiBAcHJvcGVydHkge1N0cmluZ30gIHVuY2hhbmdlZFVzZXIgIFRoZSBKU09OLnN0cmluZ2lmeSgpZWQgdXNlciBwcm9maWxlIG9iamVjdCBhcyBpdCB3YXMgd2hlbiBpdFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FzIHNldCBieSBhIGNhbGwgdG8gZ2V0VXNlclByb2ZpbGUoKS5cclxuICAgKi9cclxuICBleHBvcnRzLnVuY2hhbmdlZFVzZXIgPSAnbnVsbCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKiBAcHJvcGVydHkge1VzZXJ9ICB1c2VyICBUaGUgdXNlciBwcm9maWxlIG9iamVjdCB0aGF0IGlzIG1vZGlmaWFibGUgYnkgdXNlcnMgb2YgQnJpZGdlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMudXNlciA9IG51bGw7XHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgLy8gSGVscGVyIEZ1bmN0aW9ucyAvL1xyXG4gIC8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIGlzVXNlckxvZ2dlZEluXHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gICBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSB1c2VyIG9iamVjdCBpcyBzZXQuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuICAgICAgICB7Qm9vbGVhbn0gV2hldGhlciBvciBub3QgYSB1c2VyIG9iamVjdCBleGlzdHMgYW5kIGlzIGF1dGhlbnRpY2F0ZWQuXHJcbiAgICpcclxuICAgKi9cclxuICBleHBvcnRzLmlzVXNlckxvZ2dlZEluID0gZnVuY3Rpb24gaXNMb2dnZWRJbiAoKSB7XHJcbiAgICAvLyBOb3RlOiBVc2luZyB0ZXJuYXJ5IGhlcmUgYmVjYXVzZSBhIHJhdyBBTkQgcmV0dXJucyBPYmplY3QsIHNpbmNlIHRoYXQncyB0cnV0aHkgZW5vdWdoLlxyXG4gICAgcmV0dXJuICggZXhwb3J0cy51c2VyICkgPyB0cnVlIDogZmFsc2U7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICpcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAZnVuY3Rpb24gICAgICBpc1VzZXJNb2RpZmllZFxyXG4gICAqXHJcbiAgICogQGRlc2NyaXB0aW9uICAgUmV0dXJucyB3aGV0aGVyIG9yIG5vdCB0aGUgY3VycmVudCB1c2VyIHByb2ZpbGUgaGFzIGJlZW4gY2hhbmdlZCBzaW5jZSBhIHVzZXJcclxuICAgKiAgICAgICAgICAgICAgICBwcm9maWxlIHdhcyBsYXN0IGZldGNoZWQgZnJvbSB0aGUgc2VydmVyLlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7Qm9vbGVhbn0gV2hldGhlciBvciBub3QgdGhlIHVzZXIgcHJvZmlsZSBoYXMgYmVlbiBtb2RpZmllZCBzaW5jZSB0aGF0IGxhc3QgdGltZSBhIHVzZXJcclxuICAgKiAgICAgICAgICAgICAgICAgICBwcm9maWxlIHdhcyBsYXN0IGZldGNoZWQgZnJvbSB0aGUgc2VydmVyLiBSZXR1cm5zIGZhbHNlIGlmIG5vIHVzZXIgcHJvZmlsZVxyXG4gICAqICAgICAgICAgICAgICAgICAgIGhhcyBiZWVuIHNldC5cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuaXNVc2VyTW9kaWZpZWQgPSBmdW5jdGlvbiBpc1VzZXJNb2RpZmllZCAoKSB7XHJcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoIGV4cG9ydHMudXNlciApICE9PSBleHBvcnRzLnVuY2hhbmdlZFVzZXI7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICpcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAZnVuY3Rpb24gICAgICByZXNldFNlc3Npb25cclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgIENsZWFycyB0aGUgaXNBdXRoZW50aWNhdGVkIGZsYWcsIHRoZSBcInJlbWVtYmVyIG1lXCIgZmxhZywgdGhlIHVzZXIgcHJvZmlsZSBvYmplY3RcclxuICAgKiAgICAgICAgICAgICAgICBhbmQgdGhlIHVuY2hhbmdlZFVzZXIgc3RyaW5nLCBzdWNoIHRoYXQgdGhlIHNlc3Npb24gaW5mb3JtYXRpb24gaXMgY29tcGxldGVseVxyXG4gICAqICAgICAgICAgICAgICAgIGZvcmdvdHRlbiBieSB0aGUgQnJpZGdlIGNsaWVudCBhbmQgaXQgYmVsaWV2ZXMgdGhhdCBpdCBpcyBub3QgYXV0aGVudGljYXRlZCBhbmRcclxuICAgKiAgICAgICAgICAgICAgICBoYXMgbm8gdXNlciBpbmZvLiBUaGUgYnJvd3NlciB3aWxsIHN0aWxsIGhvbGQgdGhlIGF1dGhlbnRpY2F0aW9uIGNvb2tpZSBpbiBpdHNcclxuICAgKiAgICAgICAgICAgICAgICBjb29raWUgc3RvcmUsIGhvd2V2ZXIsIHNvIHRoZSBhcHAgaXMgc3RpbGwgYXV0aGVudGljYXRlZCBpZiB0aGlzIGlzIGNhbGxlZFxyXG4gICAqICAgICAgICAgICAgICAgIHdpdGhvdXQgbWFraW5nIGEgZGVhdXRoZW50aWNhdGUoKSBjYWxsIGZpcnN0ICh0eXBpY2FsbHkgdGhpcyBpcyBjYWxsZWQgYnlcclxuICAgKiAgICAgICAgICAgICAgICBkZWF1dGhlbnRpY2F0ZSgpIHRvIGNsZWFyIHRoZSBzZXNzaW9uIGFmdGVyIGNsZWFyaW5nIHRoZSBhdXRoIGNvb2tpZSkuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHt1bmRlZmluZWR9XHJcbiAgICpcclxuICAgKi9cclxuICBleHBvcnRzLnJlc2V0U2Vzc2lvbiA9IGZ1bmN0aW9uIHJlc2V0U2Vzc2lvbiAoKSB7XHJcbiAgICBleHBvcnRzLnJlbWVtYmVyTWUgPSBmYWxzZTtcclxuICAgIGV4cG9ydHMudXNlciA9IG51bGw7XHJcbiAgICBleHBvcnRzLnVuY2hhbmdlZFVzZXIgPSAnbnVsbCc7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICpcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAZnVuY3Rpb24gICAgICBzdHJpcFRyYWlsaW5nU2xhc2hcclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgIFJlbW92ZXMgYSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGZyb20gdGhlIHByb3ZpZGVkIHN0cmluZy5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge1N0cmluZ30gc3RyICAgQSBzdHJpbmcgdGhhdCBtYXkgaGF2ZSBhIHRyYWlsaW5nIGZvcndhcmQgc2xhc2guXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAgIFRoZSBzYW1lIGFzIHRoZSBpbnB1dCwgYnV0IGhhdmluZyBubyB0cmFpbGluZyBmb3J3YXJkLXNsYXNoLlxyXG4gICAqXHJcbiAgICovXHJcbiAgZXhwb3J0cy5zdHJpcFRyYWlsaW5nU2xhc2ggPSBmdW5jdGlvbiBzdHJpcFRyYWlsaW5nU2xhc2ggKCBzdHIgKSB7XHJcbiAgICAvLyBOb3RlOiBTdHJpbmcuc3Vic3RyKCkgYmVoYXZlcyBkaWZmZXJlbnRseSBmcm9tIFN0cmluZy5zdWJzdHJpbmcoKSBoZXJlISBEb24ndCBjaGFuZ2UgdGhpcyFcclxuICAgIHJldHVybiAoIHN0ci5zdWJzdHIoIC0xICkgPT09ICcvJyApID8gc3RyLnN1YnN0ciggMCwgc3RyLmxlbmd0aCAtIDEgKSA6IHN0cjtcclxuICB9O1xyXG5cclxuICAvLy8vLy8vLy8vLy8vLy9cclxuICAvLyBSZXF1ZXN0cyAvL1xyXG4gIC8vLy8vLy8vLy8vLy9cclxuXHJcbiAgLyoqXHJcbiAgICogQHB1YmxpY1xyXG4gICAqXHJcbiAgICogQGNhbGxiYWNrICAgICAgb25SZXF1ZXN0Q2FsbGVkXHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gICBBIGZ1bmN0aW9uIGNhbGxiYWNrIHRoYXQgY2FuIGJlIHVzZWQgdG8gbW9kaWZ5IHJlcXVlc3RzIGJlZm9yZSB0aGV5IGFyZSBzZW50IGJ5XHJcbiAgICogICAgICAgICAgICAgICAgQnJpZGdlLiBPdmVycmlkZSB0aGlzIGZ1bmN0aW9uIHdpdGggeW91ciBvd24gaW1wbGVtZW50YXRpb24gdG8gaGF2ZSBpdCBiZSBjYWxsZWRcclxuICAgKiAgICAgICAgICAgICAgICBiZWZvcmUgZWFjaCByZXF1ZXN0IHRvIHRoZSBBUEkuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBtZXRob2QgICAgIFRoZSBIVFRQIHZlcmIvYWN0aW9uIHRvIHVzZSBmb3IgdGhlIHJlcXVlc3QuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSB1cmwgICAgICAgIFRoZSByZXNvdXJjZSBhdCB0aGUgYmFzZSBBUEkgVVJMIHRvIHF1ZXJ5LiBUaGUgYmFzZSBBUElcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFVSTCAoYmFzZVVybCkgaXMgcHJlcGVuZGVkIHRvIHRoaXMgc3RyaW5nLiBUaGUgc3BlY2lmaWVkXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZSBzaG91bGQgTk9UIGhhdmUgYSBsZWFkaW5nIHNsYXNoLCBhcyBiYXNlVXJsIGlzXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZCB0byBoYXZlIGEgdHJhaWxpbmcgc2xhc2guXHJcbiAgICpcclxuICAgKiBAcGFyYW0gICAgICAgICB7T2JqZWN0fSBkYXRhICAgICAgIFRoZSBkYXRhIG9iamVjdCB0byBzZW5kIHdpdGggdGhlIHJlcXVlc3QuIFRoaXMgY2FuIGJlIHVzZWRcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGRlc2NyaWJlIHF1ZXJ5IGFyZ3VtZW50cyBzdWNoIGFzIGZpbHRlcnMgYW5kIG9yZGVyaW5nLCBvclxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gY29udGFpbiBkYXRhIHRvIGJlIHN0b3JlZCBpbiB0aGUgQnJpZGdlIGRhdGFiYXNlLlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7dW5kZWZpbmVkfVxyXG4gICAqXHJcbiAgICovXHJcbiAgZXhwb3J0cy5vblJlcXVlc3RDYWxsZWQgPSBmdW5jdGlvbiBvblJlcXVlc3RDYWxsZWQgKCBtZXRob2QsIHVybCwgZGF0YSApIHtcclxuICAgIC8vIERvIG5vdGhpbmcgdW50aWwgb3ZlcnJpZGRlbiBieSBhbiBpbXBsZW1lbnRvclxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqXHJcbiAgICogQHB1YmxpY1xyXG4gICAqXHJcbiAgICogQGZ1bmN0aW9uICAgICByZXNvbHZlXHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gIFJlc29sdmVzIHRoZSBwcm92aWRlZCBkZWZlcnJlZCBhbmQgcmV0dXJucyB0aGUgcHJvdmlkZWQgZGF0YS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge1N0cmluZ30gbmFtZSAgICAgICAgQW4gaWRlbnRpZmllciB0byB1c2Ugd2hlbiBwcmludGluZyBkZWJ1ZyBpbmZvcm1hdGlvbi5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge0RlZmVycmVkfSBkZWZlcnJlZCAgVGhlIFEgZGVmZXJyZWQgb2JqZWN0IHRvIHJlc29sdmUuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGRhdGEgICAgICAgIFRoZSBvYmplY3QgdG8gcmV0dXJuIHdpdGggdGhlIHJlc29sdXRpb24uXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHt1bmRlZmluZWR9XHJcbiAgICpcclxuICAgKi9cclxuICBleHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbiByZXNvbHZlICggbmFtZSwgZGVmZXJyZWQsIGRhdGEgKSB7XHJcbiAgICBpZiAoIGV4cG9ydHMuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCBcIkJSSURHRSB8IFwiICsgbmFtZSArIFwiIHwgXCIgKyBKU09OLnN0cmluZ2lmeSggZGF0YSApICk7XHJcbiAgICB9XHJcbiAgICBkZWZlcnJlZC5yZXNvbHZlKCBkYXRhICk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICpcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAZnVuY3Rpb24gICAgIHJlamVjdFxyXG4gICAqXHJcbiAgICogQGRlc2NyaXB0aW9uICBSZWplY3RzIHRoZSBwcm92aWRlZCBkZWZlcnJlZCBhbmQgcmV0dXJucyB0aGUgcHJvdmlkZWQgZGF0YS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge1N0cmluZ30gbmFtZSAgICAgICAgQW4gaWRlbnRpZmllciB0byB1c2Ugd2hlbiBwcmludGluZyBkZWJ1ZyBpbmZvcm1hdGlvbi5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge0RlZmVycmVkfSBkZWZlcnJlZCAgVGhlIFEgZGVmZXJyZWQgb2JqZWN0IHRvIHJlc29sdmUuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGVycm9yICAgICAgIFRoZSBvYmplY3QgdG8gcmV0dXJuIHdpdGggdGhlIHJlamVjdGlvbi5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge3VuZGVmaW5lZH1cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucmVqZWN0ID0gZnVuY3Rpb24gcmVqZWN0ICggbmFtZSwgZGVmZXJyZWQsIGVycm9yICkge1xyXG4gICAgaWYgKCBleHBvcnRzLmRlYnVnID09PSB0cnVlICkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCBcIkJSSURHRSB8IFwiICsgbmFtZSArIFwiIHwgXCIgKyBlcnJvci5zdGF0dXMgKyBcIiA+PiBDb2RlIFwiICsgZXJyb3IuZXJyb3JDb2RlICtcclxuICAgICAgICBcIjogXCIgKyBlcnJvci5tZXNzYWdlICk7XHJcbiAgICB9XHJcbiAgICBkZWZlcnJlZC5yZWplY3QoIGVycm9yICk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICpcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAZnVuY3Rpb24gICAgICByZXF1ZXN0XHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gICBTZW5kcyBhbiBYSFIgcmVxdWVzdCB1c2luZyB0aGUgY3JlYXRlUmVxdWVzdCgpIGZ1bmN0aW9uLiBUaGUgbWVzc2FnZSBwYXlsb2FkIGlzXHJcbiAgICogICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoKWVkIGFuZCBwYWNrYWdlZCBpbnRvIGFuIEhUVFAgaGVhZGVyIGNhbGxlZCBcIkJyaWRnZVwiLiBUaGUgY29va2llXHJcbiAgICogICAgICAgICAgICAgICAgdG8gdXNlIGZvciBhdXRoZW50aWNhdGlvbiBvbiB0aGUgc2VydmVyIGlzIGtlcHQgaW4gYW4gSFRUUCBoZWFkZXIgY2FsbGVkIFwiQXV0aFwiLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICAgICAgICAge1N0cmluZ30gbWV0aG9kICAgICBUaGUgSFRUUCB2ZXJiL2FjdGlvbiB0byB1c2UgZm9yIHRoZSByZXF1ZXN0LiBDYXBpdGFsaXphdGlvblxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9lc24ndCBtYXR0ZXIgYXMgaXQgd2lsbCBiZSBjYXBpdGFsaXplZCBhdXRvbWF0aWNhbGx5LlxyXG4gICAqXHJcbiAgICogQHBhcmFtICAgICAgICAge1N0cmluZ30gdXJsICAgICAgICBUaGUgZXhhY3QgVVJMIG9mIHRoZSByZXNvdXJjZSB0byBxdWVyeS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAgICAgICAgIHtPYmplY3R9IGRhdGEgICAgICAgVGhlIGRhdGEgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdC4gVGhpcyBjYW4gYmUgdXNlZFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZGVzY3JpYmUgcXVlcnkgYXJndW1lbnRzIHN1Y2ggYXMgZmlsdGVycyBhbmQgb3JkZXJpbmcsIG9yXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBjb250YWluIGRhdGEgdG8gYmUgc3RvcmVkIGluIHRoZSBCcmlkZ2UgZGF0YWJhc2UuXHJcbiAgICpcclxuICAgKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucmVxdWVzdCA9IGZ1bmN0aW9uIHJlcXVlc3QgKCBtZXRob2QsIHVybCwgZGF0YSApIHtcclxuXHJcbiAgICAvLyBDYWxsIHRoZSBvblJlcXVlc3RDYWxsZWQgY2FsbGJhY2ssIGlmIG9uZSBpcyByZWdpc3RlcmVkLlxyXG4gICAgaWYgKCBleHBvcnRzLm9uUmVxdWVzdENhbGxlZCApIHtcclxuICAgICAgZXhwb3J0cy5vblJlcXVlc3RDYWxsZWQoIG1ldGhvZCwgdXJsLCBkYXRhICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FsbCBzZW5kUmVxdWVzdCgpIHRvIGhhbmRsZSB0aGUgWEhSIGluIHdoYXRldmVyIHdheSBpdCBoYXMgYmVlbiBjb25maWd1cmVkIHRvLlxyXG4gICAgLy8gTm90ZTogQ3JlYXRpbmcgMiBkZWZlcnJlZCBvYmplY3RzIGhlcmU6IDEgZm9yIHRoaXMsIDEgZm9yIHNlbmRSZXF1ZXN0LlxyXG4gICAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gICAgZXhwb3J0cy5zZW5kUmVxdWVzdCggUS5kZWZlcigpLCBtZXRob2QudG9VcHBlckNhc2UoKSwgdXJsLCBkYXRhICkudGhlbihcclxuXHJcbiAgICAgIC8vIFJlcXVlc3Qgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmb3JtYXQgaXMgdmFsaWQsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvYmplY3QuXHJcbiAgICAgICAgZXhwb3J0cy5yZXNvbHZlKCBcIlJlcXVlc3RcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgICAgLy8gUmVxdWVzdCB3YXMgcmVqZWN0ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAgIC8vIElmIGEgZGVidWcgbWVzc2FnZSB3YXMgc2VudCwgc2V0IGl0IGFzIHRoZSBtZXNzYWdlLiBJZiBub3QsIHRoZSBlcnJvciBtZXNzYWdlIGlzIGVtcHR5LlxyXG4gICAgICAgIGVycm9yLm1lc3NhZ2UgPSBlcnJvcnMuZ2V0RXhwbGFuYXRpb24oIGVycm9yLmVycm9yQ29kZSApO1xyXG5cclxuICAgICAgICAvLyBJZiB0aGUgYXV0aCB0b2tlbiBoYXMgYmVlbiBjb3JydXB0ZWQsIHRoZSBjbGllbnQgY2FuJ3QgcGVyZm9ybSBhbnkgcHJpdmF0ZSBBUEkgY2FsbHNcclxuICAgICAgICAvLyBpbmNsdWRpbmcgZGVhdXRoZW50aWNhdGUoKS4gU2luY2UgdGhlIGNvb2tpZSBpcyBpbmFjY2Vzc2libGUgdG8gdGhlIGNsaWVudCwgdGhlIG9ubHlcclxuICAgICAgICAvLyByZWNvdXJzZSB3ZSBoYXZlIGlzIHRvIHJlc2V0IHRoZSBzZXNzaW9uIGFuZCBmb3JjZSB0aGUgdXNlciB0byBhdXRoZW50aWNhdGUgYWdhaW5cclxuICAgICAgICBpZiAoIGVycm9yLmVycm9yQ29kZSA9PT0gZXJyb3JzLkNPUlJVUFRFRF9BVVRIX1RPS0VOICkge1xyXG4gICAgICAgICAgZXhwb3J0cy5yZXNldFNlc3Npb24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgICAgZXhwb3J0cy5yZWplY3QoIFwiUmVxdWVzdFwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICAgIH1cclxuICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHJcbiAgfTtcclxuXHJcbn0gKSgpO1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgZXJyb3JzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEBwdWJsaWNcclxuICogQGNvbnN0YW50ICAgICAgQ09SUlVQVEVEX0FVVEhfVE9LRU5cclxuICogQGRlc2NyaXB0aW9uICAgQW4gZXJyb3IgY29kZSBpbmRpY2F0aW5nIHRoYXQgdGhlIHNlcnZlciByZWplY3RlZCBhIHJlcXVlc3QgYmVjYXVzZSB0aGUgYXV0aCB0b2tlblxyXG4gKiAgICAgICAgICAgICAgICBzZW50IGluIHRoZSBhdXRoIGNvb2tpZSB3YXMgY29ycnVwdGVkLiBUaGlzIGlzIGFuIGVzcGVjaWFsbHkgYmFkIGVycm9yIGNhc2Ugc2luY2VcclxuICogICAgICAgICAgICAgICAgdGhpcyBzdGF0ZSBwcmV2ZW50cyB0aGUgY2xpZW50IGZyb20gYWNjZXNzaW5nIGFueSBwcml2YXRlIHJvdXRlcyBvbiB0aGUgQVBJXHJcbiAqICAgICAgICAgICAgICAgIHNlcnZlciwgaW5jbHVkaW5nIGRlYXV0aGVudGljYXRlKCkuIGNvcmUucmVxdWVzdCgpIGhhbmRsZXMgdGhpcyBlcnJvciBieSByZXNldHRpbmdcclxuICogICAgICAgICAgICAgICAgdGhlIHNlc3Npb24sIGV2ZW4gdGhvdWdoIHRoZSBhdXRoIGNvb2tpZSBtYXkgc3RpbGwgYmUgc2V0LiBJZGVhbGx5LCB0aGlzIGlzXHJcbiAqICAgICAgICAgICAgICAgIGhhbmRsZWQgYnkgcmV0dXJuaW5nIHRoZSB1c2VyIHRvIGEgbG9naW4gc2NyZWVuIHRvIHJlLWVudGVyIHRoZWlyIGNyZWRlbnRpYWxzIHNvXHJcbiAqICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0ZSgpIHdpbGwgYmUgY2FsbGVkIGFnYWluLCBhbGxvd2luZyB0aGUgc2VydmVyIHRvIGlzc3VlIGEgZnJlc2ggYXV0aFxyXG4gKiAgICAgICAgICAgICAgICBjb29raWUgYW5kIHJlc3RvcmUgdGhlIGFwcCBzdGF0ZS5cclxuICogQHR5cGUgICAgICAgICAge051bWJlcn1cclxuICovXHJcbmV4cG9ydHMuQ09SUlVQVEVEX1RPS0VOID0gMjY7XHJcblxyXG4vKipcclxuICogQHB1YmxpY1xyXG4gKiBAY29uc3RhbnQgICAgICBFUlJPUl9DT0RFX01BTEZPUk1FRF9SRVNQT05TRVxyXG4gKiBAZGVzY3JpcHRpb24gICBBbiBlcnJvciBjb2RlIGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgcmV0dXJuZWQgZnJvbSB0aGUgc2VydmVyIGlzIGVpdGhlciB0aGVcclxuICogICAgICAgICAgICAgICAgd3JvbmcgZGF0YSB0eXBlIG9yIGlzIGZvcm1hdHRlZCBpbmNvcnJlY3RseS5cclxuICogQHR5cGUgICAgICAgICAge051bWJlcn1cclxuICovXHJcbmV4cG9ydHMuTUFMRk9STUVEX1JFU1BPTlNFID0gMTAxO1xyXG5cclxuLyoqXHJcbiAqIEBwdWJsaWNcclxuICogQGNvbnN0YW50ICAgICAgRVJST1JfQ09ERV9ORVRXT1JLX0VSUk9SXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFuIGVycm9yIGNvZGUgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBmYWlsZWQgZHVlIHRvIGFuIGVycm9yIGF0IHRoZSBuZXR3b3JrXHJcbiAqICAgICAgICAgICAgICAgIGxldmVsLCBidXQgd2FzIG5vdCBhIHRpbWVvdXQuXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLk5FVFdPUktfRVJST1IgPSAxMDI7XHJcblxyXG4vKipcclxuICogQHB1YmxpY1xyXG4gKiBAY29uc3RhbnQgICAgICBSRVFVRVNUX1RJTUVPVVRcclxuICogQGRlc2NyaXB0aW9uICAgQW4gZXJyb3IgY29kZSBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGRpZCBub3QgZ2V0IGEgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyXHJcbiAqICAgICAgICAgICAgICAgIHdpdGhpbiB0aGUgWEhSJ3MgdGltZW91dCBwZXJpb2QuXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLlJFUVVFU1RfVElNRU9VVCA9IDEwMztcclxuXHJcbi8qKlxyXG4gKiBAcHVibGljXHJcbiAqIEBjb25zdGFudCAgICAgIE5PX1VTRVJfUFJPRklMRVxyXG4gKiBAZGVzY3JpcHRpb24gICBBbiBlcnJvciBjb2RlIGluZGljYXRpbmcgdGhhdCBubyB1c2VyIHByb2ZpbGUgaXMgc2V0LCBtZWFuaW5nIHRoYXQgbWFueSBjb21tYW5kc1xyXG4gKiAgICAgICAgICAgICAgICB3aWxsIGJlIHVuYWJsZSB0byBnZXQgYWNjZXNzIHRvIHRoZSBpbmZvcm1hdGlvbiB0aGV5IG5lZWQgdG8gZnVuY3Rpb24uXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLk5PX1VTRVJfUFJPRklMRSA9IDEwNDtcclxuXHJcbi8qKlxyXG4gKiBAcHVibGljXHJcbiAqIEBjb25zdGFudCAgICAgIFBBU1NXT1JEX1RPT19TSE9SVFxyXG4gKiBAZGVzY3JpcHRpb24gICBBbiBlcnJvciBjb2RlIGluZGljYXRpbmcgdGhhdCB0aGUgcmVxdWVzdGVkIHBhc3N3b3JkIGlzIG5vdCBsb25nIGVub3VnaCwgYW5kIHRoYXRcclxuICogICAgICAgICAgICAgICAgdGhlIHVzZXIgbXVzdCBzZWxlY3QgYSBsb25nZXIgcGFzc3dvcmQgdG8gZW5zdXJlIGFjY291bnQgc2VjdXJpdHkuXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLlBBU1NXT1JEX1RPT19TSE9SVCA9IDEwNTtcclxuXHJcbi8qKlxyXG4gKiBAcHVibGljXHJcbiAqIEBjb25zdGFudCAgICAgIFdJTExfTE9TRV9VTlNBVkVEX0NIQU5HRVNcclxuICogQGRlc2NyaXB0aW9uICAgQW4gZXJyb3IgY29kZSBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlcXVlc3RlZCBvcGVyYXRpb24gbWF5IG92ZXJ3cml0ZSB1c2VyIGRhdGEgdGhhdFxyXG4gKiAgICAgICAgICAgICAgICBpcyBub3QgeWV0IHNhdmVkIG9uIHRoZSBjbGllbnQuXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLldJTExfTE9TRV9VTlNBVkVEX0NIQU5HRVMgPSAxMDY7XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQGVudW0gRVhQTEFOQVRJT05TXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEEgbWFwIG9mIGVycm9yIGNvZGVzIChrZXlzKSB0byBlcnJvciBjb2RlIGV4cGxhbmF0aW9ucyAodmFsdWVzKS5cclxuICogQHR5cGUge01hcH1cclxuICovXHJcbnZhciBFWFBMQU5BVElPTlMgPSB7XHJcbiAgMTogXCJUaGUgcmVxdWVzdCBzZW50IHRvIHRoZSBzZXJ2ZXIgd2FzIGJhZGx5IGZvcm1lZC4gRW5zdXJlIHRoYXQgeW91ciBCcmlkZ2UgQ2xpZW50IGFuZCBCcmlkZ2UgU2VydmVyIHZlcnNpb25zIG1hdGNoLlwiLFxyXG4gIDI6IFwiVGhlIHNlcnZlciBlbmNvdW50ZXJlZCBhbiBlcnJvciB3aGlsZSBxdWVyeWluZyB0aGUgZGF0YWJhc2UuIEVuc3VyZSB0aGF0IHlvdXIgZGF0YWJhc2Ugc2VydmVyIGlzIHJ1bm5pbmcuXCIsXHJcbiAgMzogXCJBIHVzZXIgaXMgYWxyZWFkeSByZWdpc3RlcmVkIHdpdGggdGhpcyBlbWFpbCBhY2NvdW50LlwiLFxyXG4gIDQ6IFwiVGhlIHNlcnZlciByZWplY3RlZCBhbiBhbm9ueW1vdXMgcmVxdWVzdCBiZWNhdXNlIGl0IG1heSBoYXZlIGJlZW4gdGVtcGVyZWQgd2l0aCBvciBpbnRlcmNlcHRlZC5cIixcclxuICA1OiBcIlRoZSBzdXBwbGllZCBwYXNzd29yZCBpcyBpbmNvcnJlY3QuXCIsXHJcbiAgNjogXCJZb3VyIGVtYWlsIGFjY291bnQgaGFzIG5vdCB5ZXQgYmVlbiB2ZXJpZmllZC4gUGxlYXNlIGNoZWNrIHlvdXIgZW1haWwgYW5kIGNvbXBsZXRlIHRoZSByZWdpc3RyYXRpb24gcHJvY2Vzcy5cIixcclxuICA3OiBcIlRoZSBzdXBwbGllZCBlbWFpbCBhZGRyZXNzIGlzIGludmFsaWQuXCIsXHJcbiAgODogXCJUaGUgc3VwcGxpZWQgZmlyc3QgbmFtZSBpcyBpbnZhbGlkIChtdXN0IGJlIGF0IGxlYXN0IDIgY2hhcmFjdGVycyBpbiBsZW5ndGgpXCIsXHJcbiAgOTogXCJUaGUgSE1BQyBzZWN1cml0eSBzaWduYXR1cmUgc3VwcGxpZWQgd2l0aCB0aGlzIHJlcXVlc3Qgd2FzIGJhZGx5IGZvcm1lZC5cIixcclxuICAxMDogXCJUaGUgc3VwcGxpZWQgbGFzdCBuYW1lIGlzIGludmFsaWQgKG11c3QgYmUgYXQgbGVhc3QgMiBjaGFyYWN0ZXJzIGluIGxlbmd0aClcIixcclxuICAxMTogXCJUaGUgU0hBLTI1NiBoYXNoZWQgcGFzc3dvcmQgc3VwcGxpZWQgd2l0aCB0aGlzIHJlcXVlc3Qgd2FzIGJhZGx5IGZvcm1lZC4gVGhpcyBkb2VzIE5PVCBtZWFuIHRoYXQgeW91ciBwYXNzd29yZCBpcyBpbnZhbGlkLCBidXQgdGhhdCBhbiBpbnRlcm5hbCBlcnJvciBvY2N1cnJlZC5cIixcclxuICAxMjogXCJUaGUgdGltZSBzdXBwbGllZCB3aXRoIHRoaXMgcmVxdWVzdCB3YXMgYmFkbHkgZm9ybWVkIChtdXN0IGJlIGluIElTTyBmb3JtYXQpXCIsXHJcbiAgMTM6IFwiVGhlIHVzZXIgaGFzaCBzdXBwbGllZCB3aXRoIHRoaXMgcmVxdWVzdCB3YXMgYmFkbHkgZm9ybWVkLlwiLFxyXG4gIDE0OiBcIlRoZSByZXF1ZXN0ZWQgYWN0aW9uIHJlcXVpcmVzIHRoYXQgeW91IGJlIGxvZ2dlZCBpbiBhcyBhIHJlZ2lzdGVyZWQgdXNlci5cIixcclxuICAxNTogXCJUaGUgcmVxdWVzdCBmYWlsZWQgYmVjYXVzZSBhIEJyaWRnZSBTZXJ2ZXIgZXh0ZW5zaW9uIGhhcyBjYWxsZWQgYSBzZXJ2aWNlIG1vZHVsZSBiZWZvcmUgQnJpZGdlIGNvdWxkIHZhbGlkYXRlIHRoZSByZXF1ZXN0ICh0b28gZWFybHkgaW4gbWlkZGxld2FyZSBjaGFpbikuXCIsXHJcbiAgMTY6IFwiVGhlIHN1cHBsaWVkIGFwcGxpY2F0aW9uIGRhdGEgb2JqZWN0IGNvdWxkIG5vdCBiZSBwYXJzZWQgYXMgdmFsaWQgSlNPTi5cIixcclxuICAxNzogXCJUaGUgdXNlciB3aXRoIHRoZSBzdXBwbGllZCBlbWFpbCB3YXMgbm90IGZvdW5kIGluIHRoZSBkYXRhYmFzZS5cIixcclxuICAxODogXCJBbiB1bmtub3duIGVycm9yIG9jY3VycmVkIGluIHRoZSBzZXJ2ZXIuIFBsZWFzZSBjb250YWN0IHRoZSBzZXJ2ZXIgYWRtaW5pc3RyYXRvci5cIixcclxuICAxOTogXCJUaGUgcmVxdWVzdCBzZW50IHRvIHRoZSBzZXJ2ZXIgZGlkIG5vdCBjb250YWluIHRoZSBcXFwiQnJpZGdlXFxcIiBoZWFkZXIsIGFuZCBjb3VsZCBub3QgYmUgYXV0aGVudGljYXRlZC5cIixcclxuICAyMDogXCJUaGUgQnJpZGdlIGhlYWRlciBvZiB0aGUgcmVxdWVzdCBjb3VsZCBub3QgYmUgcGFyc2VkIGFzIHZhbGlkIEpTT04uXCIsXHJcbiAgMjE6IFwiVGhlIHJlcXVlc3QgY2Fubm90IGJlIGNvbXBsZXRlZCBiZWNhdXNlIHRoaXMgdXNlciBpcyBub3QgYXV0aG9yaXplZCB0byBwZXJmb3JtIHRoaXMgYWN0aW9uLlwiLFxyXG4gIDIyOiBcIlRoZSByZXF1ZXN0ZWQgY29udGVudCBjYW5ub3QgYmUgYWNjZXNzZWQgYW5vbnltb3VzbHkuIFBsZWFzZSBsb2dpbiB0byBhIHZhbGlkIHVzZXIgYWNjb3VudC5cIixcclxuICAyMzogXCJUaGUgcmVxdWVzdCB3YXMgYmFkbHkgZm9ybWVkLlwiLFxyXG4gIDI0OiBcIlRoaXMgcmVxdWVzdCBtdXN0IGJlIHBlcmZvcm1lZCBhbm9ueW1vdXNseS4gUGxlYXNlIGxvZyBvdXQgYW5kIHRyeSBhZ2Fpbi5cIixcclxuICAyNTogXCJUaGUgcmVxdWVzdCBjb3VsZCBub3QgYmUgYXV0aGVudGljYXRlZCwgYmVjYXVzZSB0aGUgYXV0aGVudGljYXRpb24gdG9rZW4gd2FzIGVpdGhlciB0YW1wZXJlZCB3aXRoIG9yIGJhZGx5IGZvcm1lZC5cIixcclxuICAyNjogXCJUaGUgcmVxdWVzdGVkIHJlc291cmNlIHJlcXVpcmVzIHRoYXQgeW91IGJlIGxvZ2dlZCBpbiBhcyBhIHJlZ2lzdGVyZWQgdXNlci5cIixcclxuICAyNzogXCJUaGUgcmVnaXN0cmF0aW9uIGNvZGUgd2FzIGludmFsaWQuIFBsZWFzZSBlbnRlciBhIHZhbGlkIHJlZ2lzdHJhdGlvbiBjb2RlLlwiLFxyXG4gIDEwMTogXCJUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIHdhcyBiYWRseSBmb3JtZWQuIEVuc3VyZSB0aGF0IHlvdXIgQnJpZGdlIENsaWVudCBhbmQgQnJpZGdlIFNlcnZlciB2ZXJzaW9ucyBtYXRjaC5cIixcclxuICAxMDI6IFwiVGhlIHJlc3BvbnNlIGZhaWxlZCBvciB3YXMgaW5jb21wbGV0ZSBkdWUgdG8gYSBuZXR3b3JrIGVycm9yLlwiLFxyXG4gIDEwMzogXCJUaGUgc2VydmVyIGRpZCBub3QgcmVzcG9uZC4gQ2hlY2sgeW91ciBpbnRlcm5ldCBjb25uZWN0aW9uIGFuZCBjb25maXJtIHRoYXQgeW91ciBCcmlkZ2UgU2VydmVyIGlzIHJ1bm5pbmcuXCIsXHJcbiAgMTA0OiBcIk5vIHVzZXIgcHJvZmlsZSBpcyBjdXJyZW50bHkgbG9hZGVkLiBZb3UgbXVzdCBsb2dpbiBiZWZvcmUgeW91IGNhbiBjb250aW51ZS5cIixcclxuICAxMDU6IFwiVGhlIHN1cHBsaWVkIHBhc3N3b3JkIGlzIHRvbyBzaG9ydC4gUGxlYXNlIGNob29zZSBhIGxvbmdlciwgbW9yZSBzZWN1cmUgcGFzc3dvcmQuXCIsXHJcbiAgMTA2OiBcIlRoZSByZXF1ZXN0ZWQgb3BlcmF0aW9uIHdpbGwgcmVzdWx0IGluIHVuc2F2ZWQgY2hhbmdlcyBiZWluZyBsb3N0LiBBcmUgeW91IHN1cmU/XCJcclxufTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGdldEV4cGxhbmF0aW9uXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIFJldHVybnMgYSBzdHJpbmcgaW50ZXJwcmV0YXRpb24gb2YgdGhlIGVycm9yIGNvZGUsIHRhcmdldGVkIGF0IGV4cGxhaW5pbmdcclxuICogICAgICAgICAgICAgICAgdGhlIG5hdHVyZSBvZiB0aGUgZXJyb3IgdG8gdGhlIGVuZC1kZXZlbG9wZXIuIEl0IGlzIGFkdmlzZWQgdGhhdCB0aGVzZSBlcnJvcnNcclxuICogICAgICAgICAgICAgICAgYmUgcmUtaW50ZXJwcmV0ZWQgZm9yIHRoZSB1c2VyIGJ5IHRoZSBpbXBsZW1lbnRpbmcgYXBwbGljYXRpb24uXHJcbiAqXHJcbiAqIEBwYXJhbSAge051bWJlcn0gZXJyb3JDb2RlICAgVGhlIGludGVnZXItdmFsdWVkIGVycm9yIGNvZGUgdG8gaW50ZXJwcmV0LlxyXG4gKlxyXG4gKiBAcmV0dXJuIHtTdHJpbmd9ICAgICAgICAgICAgIEEgc3RyaW5nIGludGVycHJldGF0aW9uIG9mIHRoZSBlcnJvciBjb2RlLlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0cy5nZXRFeHBsYW5hdGlvbiA9IGZ1bmN0aW9uIGdldEV4cGxhbmF0aW9uKCBlcnJvckNvZGUgKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG4gIHJldHVybiBFWFBMQU5BVElPTlNbIGVycm9yQ29kZSBdIHx8XHJcbiAgICBcIlVua25vd24gZXJyb3IuIFlvdSBtYXkgbmVlZCB0byB1cGRhdGUgeW91ciBCcmlkZ2UgQ2xpZW50IGFuZC9vciBCcmlkZ2UgU2VydmVyIHZlcnNpb24uXCI7XHJcbn07XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAY29uc3RydWN0b3IgICBCcmlkZ2VFcnJvclxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBUaGUgQnJpZGdlRXJyb3IgY29uc3RydWN0b3IgY3JlYXRlcyBhIG5ldyBCcmlkZ2VFcnJvciBpbnN0YW5jZSBhbmQgcmV0dXJucyBpdC4gVGhlXHJcbiAqICAgICAgICAgICAgICAgIGNhbGxlciBpcyBleHBlY3RlZCB0byBwcmVjZWRlIHRoZSBjYWxsIHdpdGggdGhlIFwibmV3XCIga2V5d29yZC5cclxuICpcclxuICogQHBhcmFtICB7TnVtYmVyfSBlcnJvckNvZGUgICBUaGUgaW50ZWdlci12YWx1ZWQgZXJyb3IgY29kZSB0byBpbnRlcnByZXQuXHJcbiAqXHJcbiAqIEByZXR1cm4ge0JyaWRnZUVycm9yfSAgICAgICAgQSBCcmlkZ2VFcnJvciBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5leHBvcnRzLkJyaWRnZUVycm9yID0gZnVuY3Rpb24gQnJpZGdlRXJyb3IoIGVycm9yQ29kZSApIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgdGhpcy5zdGF0dXMgPSAyMDA7XHJcbiAgdGhpcy5lcnJvckNvZGUgPSBlcnJvckNvZGU7XHJcbiAgdGhpcy5tZXNzYWdlID0gZXhwb3J0cy5nZXRFeHBsYW5hdGlvbiggZXJyb3JDb2RlICk7XHJcbn07XHJcbiIsIjsoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcclxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuXHRcdC8vIENvbW1vbkpTXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmYWN0b3J5KCk7XHJcblx0fVxyXG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XHJcblx0XHQvLyBBTURcclxuXHRcdGRlZmluZShbXSwgZmFjdG9yeSk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Ly8gR2xvYmFsIChicm93c2VyKVxyXG5cdFx0cm9vdC5DcnlwdG9KUyA9IGZhY3RvcnkoKTtcclxuXHR9XHJcbn0odGhpcywgZnVuY3Rpb24gKCkge1xyXG5cclxuXHQvKipcclxuXHQgKiBDcnlwdG9KUyBjb3JlIGNvbXBvbmVudHMuXHJcblx0ICovXHJcblx0dmFyIENyeXB0b0pTID0gQ3J5cHRvSlMgfHwgKGZ1bmN0aW9uIChNYXRoLCB1bmRlZmluZWQpIHtcclxuXHQgICAgLyoqXHJcblx0ICAgICAqIENyeXB0b0pTIG5hbWVzcGFjZS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBDID0ge307XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogTGlicmFyeSBuYW1lc3BhY2UuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgQ19saWIgPSBDLmxpYiA9IHt9O1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIEJhc2Ugb2JqZWN0IGZvciBwcm90b3R5cGFsIGluaGVyaXRhbmNlLlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIEJhc2UgPSBDX2xpYi5CYXNlID0gKGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgIGZ1bmN0aW9uIEYoKSB7fVxyXG5cclxuXHQgICAgICAgIHJldHVybiB7XHJcblx0ICAgICAgICAgICAgLyoqXHJcblx0ICAgICAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBvYmplY3QgdGhhdCBpbmhlcml0cyBmcm9tIHRoaXMgb2JqZWN0LlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG92ZXJyaWRlcyBQcm9wZXJ0aWVzIHRvIGNvcHkgaW50byB0aGUgbmV3IG9iamVjdC5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIG5ldyBvYmplY3QuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogICAgIHZhciBNeVR5cGUgPSBDcnlwdG9KUy5saWIuQmFzZS5leHRlbmQoe1xyXG5cdCAgICAgICAgICAgICAqICAgICAgICAgZmllbGQ6ICd2YWx1ZScsXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiAgICAgICAgIG1ldGhvZDogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgICAqICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgICAqICAgICB9KTtcclxuXHQgICAgICAgICAgICAgKi9cclxuXHQgICAgICAgICAgICBleHRlbmQ6IGZ1bmN0aW9uIChvdmVycmlkZXMpIHtcclxuXHQgICAgICAgICAgICAgICAgLy8gU3Bhd25cclxuXHQgICAgICAgICAgICAgICAgRi5wcm90b3R5cGUgPSB0aGlzO1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgc3VidHlwZSA9IG5ldyBGKCk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICAvLyBBdWdtZW50XHJcblx0ICAgICAgICAgICAgICAgIGlmIChvdmVycmlkZXMpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHN1YnR5cGUubWl4SW4ob3ZlcnJpZGVzKTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGRlZmF1bHQgaW5pdGlhbGl6ZXJcclxuXHQgICAgICAgICAgICAgICAgaWYgKCFzdWJ0eXBlLmhhc093blByb3BlcnR5KCdpbml0JykpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHN1YnR5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgICAgICBzdWJ0eXBlLiRzdXBlci5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcblx0ICAgICAgICAgICAgICAgICAgICB9O1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplcidzIHByb3RvdHlwZSBpcyB0aGUgc3VidHlwZSBvYmplY3RcclxuXHQgICAgICAgICAgICAgICAgc3VidHlwZS5pbml0LnByb3RvdHlwZSA9IHN1YnR5cGU7XHJcblxyXG5cdCAgICAgICAgICAgICAgICAvLyBSZWZlcmVuY2Ugc3VwZXJ0eXBlXHJcblx0ICAgICAgICAgICAgICAgIHN1YnR5cGUuJHN1cGVyID0gdGhpcztcclxuXHJcblx0ICAgICAgICAgICAgICAgIHJldHVybiBzdWJ0eXBlO1xyXG5cdCAgICAgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICAgICAqIEV4dGVuZHMgdGhpcyBvYmplY3QgYW5kIHJ1bnMgdGhlIGluaXQgbWV0aG9kLlxyXG5cdCAgICAgICAgICAgICAqIEFyZ3VtZW50cyB0byBjcmVhdGUoKSB3aWxsIGJlIHBhc3NlZCB0byBpbml0KCkuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBuZXcgb2JqZWN0LlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqICAgICB2YXIgaW5zdGFuY2UgPSBNeVR5cGUuY3JlYXRlKCk7XHJcblx0ICAgICAgICAgICAgICovXHJcblx0ICAgICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZSA9IHRoaXMuZXh0ZW5kKCk7XHJcblx0ICAgICAgICAgICAgICAgIGluc3RhbmNlLmluaXQuYXBwbHkoaW5zdGFuY2UsIGFyZ3VtZW50cyk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gaW5zdGFuY2U7XHJcblx0ICAgICAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAgICAgLyoqXHJcblx0ICAgICAgICAgICAgICogSW5pdGlhbGl6ZXMgYSBuZXdseSBjcmVhdGVkIG9iamVjdC5cclxuXHQgICAgICAgICAgICAgKiBPdmVycmlkZSB0aGlzIG1ldGhvZCB0byBhZGQgc29tZSBsb2dpYyB3aGVuIHlvdXIgb2JqZWN0cyBhcmUgY3JlYXRlZC5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiAgICAgdmFyIE15VHlwZSA9IENyeXB0b0pTLmxpYi5CYXNlLmV4dGVuZCh7XHJcblx0ICAgICAgICAgICAgICogICAgICAgICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgICogICAgICAgICAgICAgLy8gLi4uXHJcblx0ICAgICAgICAgICAgICogICAgICAgICB9XHJcblx0ICAgICAgICAgICAgICogICAgIH0pO1xyXG5cdCAgICAgICAgICAgICAqL1xyXG5cdCAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgICAgICAvKipcclxuXHQgICAgICAgICAgICAgKiBDb3BpZXMgcHJvcGVydGllcyBpbnRvIHRoaXMgb2JqZWN0LlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IHByb3BlcnRpZXMgVGhlIHByb3BlcnRpZXMgdG8gbWl4IGluLlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqICAgICBNeVR5cGUubWl4SW4oe1xyXG5cdCAgICAgICAgICAgICAqICAgICAgICAgZmllbGQ6ICd2YWx1ZSdcclxuXHQgICAgICAgICAgICAgKiAgICAgfSk7XHJcblx0ICAgICAgICAgICAgICovXHJcblx0ICAgICAgICAgICAgbWl4SW46IGZ1bmN0aW9uIChwcm9wZXJ0aWVzKSB7XHJcblx0ICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3BlcnR5TmFtZSBpbiBwcm9wZXJ0aWVzKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1twcm9wZXJ0eU5hbWVdID0gcHJvcGVydGllc1twcm9wZXJ0eU5hbWVdO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgICAgICAvLyBJRSB3b24ndCBjb3B5IHRvU3RyaW5nIHVzaW5nIHRoZSBsb29wIGFib3ZlXHJcblx0ICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KCd0b1N0cmluZycpKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICB0aGlzLnRvU3RyaW5nID0gcHJvcGVydGllcy50b1N0cmluZztcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICAgICAqIENyZWF0ZXMgYSBjb3B5IG9mIHRoaXMgb2JqZWN0LlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgY2xvbmUuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogICAgIHZhciBjbG9uZSA9IGluc3RhbmNlLmNsb25lKCk7XHJcblx0ICAgICAgICAgICAgICovXHJcblx0ICAgICAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdC5wcm90b3R5cGUuZXh0ZW5kKHRoaXMpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHQgICAgICAgIH07XHJcblx0ICAgIH0oKSk7XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogQW4gYXJyYXkgb2YgMzItYml0IHdvcmRzLlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAcHJvcGVydHkge0FycmF5fSB3b3JkcyBUaGUgYXJyYXkgb2YgMzItYml0IHdvcmRzLlxyXG5cdCAgICAgKiBAcHJvcGVydHkge251bWJlcn0gc2lnQnl0ZXMgVGhlIG51bWJlciBvZiBzaWduaWZpY2FudCBieXRlcyBpbiB0aGlzIHdvcmQgYXJyYXkuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgV29yZEFycmF5ID0gQ19saWIuV29yZEFycmF5ID0gQmFzZS5leHRlbmQoe1xyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBJbml0aWFsaXplcyBhIG5ld2x5IGNyZWF0ZWQgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSB3b3JkcyAoT3B0aW9uYWwpIEFuIGFycmF5IG9mIDMyLWJpdCB3b3Jkcy5cclxuXHQgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzaWdCeXRlcyAoT3B0aW9uYWwpIFRoZSBudW1iZXIgb2Ygc2lnbmlmaWNhbnQgYnl0ZXMgaW4gdGhlIHdvcmRzLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5saWIuV29yZEFycmF5LmNyZWF0ZSgpO1xyXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5saWIuV29yZEFycmF5LmNyZWF0ZShbMHgwMDAxMDIwMywgMHgwNDA1MDYwN10pO1xyXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5saWIuV29yZEFycmF5LmNyZWF0ZShbMHgwMDAxMDIwMywgMHgwNDA1MDYwN10sIDYpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBpbml0OiBmdW5jdGlvbiAod29yZHMsIHNpZ0J5dGVzKSB7XHJcblx0ICAgICAgICAgICAgd29yZHMgPSB0aGlzLndvcmRzID0gd29yZHMgfHwgW107XHJcblxyXG5cdCAgICAgICAgICAgIGlmIChzaWdCeXRlcyAhPSB1bmRlZmluZWQpIHtcclxuXHQgICAgICAgICAgICAgICAgdGhpcy5zaWdCeXRlcyA9IHNpZ0J5dGVzO1xyXG5cdCAgICAgICAgICAgIH0gZWxzZSB7XHJcblx0ICAgICAgICAgICAgICAgIHRoaXMuc2lnQnl0ZXMgPSB3b3Jkcy5sZW5ndGggKiA0O1xyXG5cdCAgICAgICAgICAgIH1cclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIHdvcmQgYXJyYXkgdG8gYSBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtFbmNvZGVyfSBlbmNvZGVyIChPcHRpb25hbCkgVGhlIGVuY29kaW5nIHN0cmF0ZWd5IHRvIHVzZS4gRGVmYXVsdDogQ3J5cHRvSlMuZW5jLkhleFxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIHN0cmluZ2lmaWVkIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIHN0cmluZyA9IHdvcmRBcnJheSArICcnO1xyXG5cdCAgICAgICAgICogICAgIHZhciBzdHJpbmcgPSB3b3JkQXJyYXkudG9TdHJpbmcoKTtcclxuXHQgICAgICAgICAqICAgICB2YXIgc3RyaW5nID0gd29yZEFycmF5LnRvU3RyaW5nKENyeXB0b0pTLmVuYy5VdGY4KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uIChlbmNvZGVyKSB7XHJcblx0ICAgICAgICAgICAgcmV0dXJuIChlbmNvZGVyIHx8IEhleCkuc3RyaW5naWZ5KHRoaXMpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbmNhdGVuYXRlcyBhIHdvcmQgYXJyYXkgdG8gdGhpcyB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fSB3b3JkQXJyYXkgVGhlIHdvcmQgYXJyYXkgdG8gYXBwZW5kLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhpcyB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHdvcmRBcnJheTEuY29uY2F0KHdvcmRBcnJheTIpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBjb25jYXQ6IGZ1bmN0aW9uICh3b3JkQXJyYXkpIHtcclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcclxuXHQgICAgICAgICAgICB2YXIgdGhpc1dvcmRzID0gdGhpcy53b3JkcztcclxuXHQgICAgICAgICAgICB2YXIgdGhhdFdvcmRzID0gd29yZEFycmF5LndvcmRzO1xyXG5cdCAgICAgICAgICAgIHZhciB0aGlzU2lnQnl0ZXMgPSB0aGlzLnNpZ0J5dGVzO1xyXG5cdCAgICAgICAgICAgIHZhciB0aGF0U2lnQnl0ZXMgPSB3b3JkQXJyYXkuc2lnQnl0ZXM7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENsYW1wIGV4Y2VzcyBiaXRzXHJcblx0ICAgICAgICAgICAgdGhpcy5jbGFtcCgpO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDb25jYXRcclxuXHQgICAgICAgICAgICBpZiAodGhpc1NpZ0J5dGVzICUgNCkge1xyXG5cdCAgICAgICAgICAgICAgICAvLyBDb3B5IG9uZSBieXRlIGF0IGEgdGltZVxyXG5cdCAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoYXRTaWdCeXRlczsgaSsrKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgdGhhdEJ5dGUgPSAodGhhdFdvcmRzW2kgPj4+IDJdID4+PiAoMjQgLSAoaSAlIDQpICogOCkpICYgMHhmZjtcclxuXHQgICAgICAgICAgICAgICAgICAgIHRoaXNXb3Jkc1sodGhpc1NpZ0J5dGVzICsgaSkgPj4+IDJdIHw9IHRoYXRCeXRlIDw8ICgyNCAtICgodGhpc1NpZ0J5dGVzICsgaSkgJSA0KSAqIDgpO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgfSBlbHNlIGlmICh0aGF0V29yZHMubGVuZ3RoID4gMHhmZmZmKSB7XHJcblx0ICAgICAgICAgICAgICAgIC8vIENvcHkgb25lIHdvcmQgYXQgYSB0aW1lXHJcblx0ICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhhdFNpZ0J5dGVzOyBpICs9IDQpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHRoaXNXb3Jkc1sodGhpc1NpZ0J5dGVzICsgaSkgPj4+IDJdID0gdGhhdFdvcmRzW2kgPj4+IDJdO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgfSBlbHNlIHtcclxuXHQgICAgICAgICAgICAgICAgLy8gQ29weSBhbGwgd29yZHMgYXQgb25jZVxyXG5cdCAgICAgICAgICAgICAgICB0aGlzV29yZHMucHVzaC5hcHBseSh0aGlzV29yZHMsIHRoYXRXb3Jkcyk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIHRoaXMuc2lnQnl0ZXMgKz0gdGhhdFNpZ0J5dGVzO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDaGFpbmFibGVcclxuXHQgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBSZW1vdmVzIGluc2lnbmlmaWNhbnQgYml0cy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB3b3JkQXJyYXkuY2xhbXAoKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgY2xhbXA6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcclxuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSB0aGlzLndvcmRzO1xyXG5cdCAgICAgICAgICAgIHZhciBzaWdCeXRlcyA9IHRoaXMuc2lnQnl0ZXM7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENsYW1wXHJcblx0ICAgICAgICAgICAgd29yZHNbc2lnQnl0ZXMgPj4+IDJdICY9IDB4ZmZmZmZmZmYgPDwgKDMyIC0gKHNpZ0J5dGVzICUgNCkgKiA4KTtcclxuXHQgICAgICAgICAgICB3b3Jkcy5sZW5ndGggPSBNYXRoLmNlaWwoc2lnQnl0ZXMgLyA0KTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDcmVhdGVzIGEgY29weSBvZiB0aGlzIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgY2xvbmUuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIGNsb25lID0gd29yZEFycmF5LmNsb25lKCk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgdmFyIGNsb25lID0gQmFzZS5jbG9uZS5jYWxsKHRoaXMpO1xyXG5cdCAgICAgICAgICAgIGNsb25lLndvcmRzID0gdGhpcy53b3Jkcy5zbGljZSgwKTtcclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIGNsb25lO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENyZWF0ZXMgYSB3b3JkIGFycmF5IGZpbGxlZCB3aXRoIHJhbmRvbSBieXRlcy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gbkJ5dGVzIFRoZSBudW1iZXIgb2YgcmFuZG9tIGJ5dGVzIHRvIGdlbmVyYXRlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHJhbmRvbSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMubGliLldvcmRBcnJheS5yYW5kb20oMTYpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICByYW5kb206IGZ1bmN0aW9uIChuQnl0ZXMpIHtcclxuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSBbXTtcclxuXHJcblx0ICAgICAgICAgICAgdmFyIHIgPSAoZnVuY3Rpb24gKG1fdykge1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgbV93ID0gbV93O1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgbV96ID0gMHgzYWRlNjhiMTtcclxuXHQgICAgICAgICAgICAgICAgdmFyIG1hc2sgPSAweGZmZmZmZmZmO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIG1feiA9ICgweDkwNjkgKiAobV96ICYgMHhGRkZGKSArIChtX3ogPj4gMHgxMCkpICYgbWFzaztcclxuXHQgICAgICAgICAgICAgICAgICAgIG1fdyA9ICgweDQ2NTAgKiAobV93ICYgMHhGRkZGKSArIChtX3cgPj4gMHgxMCkpICYgbWFzaztcclxuXHQgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAoKG1feiA8PCAweDEwKSArIG1fdykgJiBtYXNrO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgcmVzdWx0IC89IDB4MTAwMDAwMDAwO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgcmVzdWx0ICs9IDAuNTtcclxuXHQgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgKiAoTWF0aC5yYW5kb20oKSA+IC41ID8gMSA6IC0xKTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH0pO1xyXG5cclxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgcmNhY2hlOyBpIDwgbkJ5dGVzOyBpICs9IDQpIHtcclxuXHQgICAgICAgICAgICAgICAgdmFyIF9yID0gcigocmNhY2hlIHx8IE1hdGgucmFuZG9tKCkpICogMHgxMDAwMDAwMDApO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgcmNhY2hlID0gX3IoKSAqIDB4M2FkZTY3Yjc7XHJcblx0ICAgICAgICAgICAgICAgIHdvcmRzLnB1c2goKF9yKCkgKiAweDEwMDAwMDAwMCkgfCAwKTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBuZXcgV29yZEFycmF5LmluaXQod29yZHMsIG5CeXRlcyk7XHJcblx0ICAgICAgICB9XHJcblx0ICAgIH0pO1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIEVuY29kZXIgbmFtZXNwYWNlLlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIENfZW5jID0gQy5lbmMgPSB7fTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBIZXggZW5jb2Rpbmcgc3RyYXRlZ3kuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgSGV4ID0gQ19lbmMuSGV4ID0ge1xyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIHdvcmQgYXJyYXkgdG8gYSBoZXggc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fSB3b3JkQXJyYXkgVGhlIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgaGV4IHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIGhleFN0cmluZyA9IENyeXB0b0pTLmVuYy5IZXguc3RyaW5naWZ5KHdvcmRBcnJheSk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHN0cmluZ2lmeTogZnVuY3Rpb24gKHdvcmRBcnJheSkge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IHdvcmRBcnJheS53b3JkcztcclxuXHQgICAgICAgICAgICB2YXIgc2lnQnl0ZXMgPSB3b3JkQXJyYXkuc2lnQnl0ZXM7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnRcclxuXHQgICAgICAgICAgICB2YXIgaGV4Q2hhcnMgPSBbXTtcclxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpZ0J5dGVzOyBpKyspIHtcclxuXHQgICAgICAgICAgICAgICAgdmFyIGJpdGUgPSAod29yZHNbaSA+Pj4gMl0gPj4+ICgyNCAtIChpICUgNCkgKiA4KSkgJiAweGZmO1xyXG5cdCAgICAgICAgICAgICAgICBoZXhDaGFycy5wdXNoKChiaXRlID4+PiA0KS50b1N0cmluZygxNikpO1xyXG5cdCAgICAgICAgICAgICAgICBoZXhDaGFycy5wdXNoKChiaXRlICYgMHgwZikudG9TdHJpbmcoMTYpKTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBoZXhDaGFycy5qb2luKCcnKTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIGhleCBzdHJpbmcgdG8gYSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoZXhTdHIgVGhlIGhleCBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmVuYy5IZXgucGFyc2UoaGV4U3RyaW5nKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgcGFyc2U6IGZ1bmN0aW9uIChoZXhTdHIpIHtcclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dFxyXG5cdCAgICAgICAgICAgIHZhciBoZXhTdHJMZW5ndGggPSBoZXhTdHIubGVuZ3RoO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDb252ZXJ0XHJcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gW107XHJcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBoZXhTdHJMZW5ndGg7IGkgKz0gMikge1xyXG5cdCAgICAgICAgICAgICAgICB3b3Jkc1tpID4+PiAzXSB8PSBwYXJzZUludChoZXhTdHIuc3Vic3RyKGksIDIpLCAxNikgPDwgKDI0IC0gKGkgJSA4KSAqIDQpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkQXJyYXkuaW5pdCh3b3JkcywgaGV4U3RyTGVuZ3RoIC8gMik7XHJcblx0ICAgICAgICB9XHJcblx0ICAgIH07XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogTGF0aW4xIGVuY29kaW5nIHN0cmF0ZWd5LlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIExhdGluMSA9IENfZW5jLkxhdGluMSA9IHtcclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29udmVydHMgYSB3b3JkIGFycmF5IHRvIGEgTGF0aW4xIHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheX0gd29yZEFycmF5IFRoZSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIExhdGluMSBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBsYXRpbjFTdHJpbmcgPSBDcnlwdG9KUy5lbmMuTGF0aW4xLnN0cmluZ2lmeSh3b3JkQXJyYXkpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBzdHJpbmdpZnk6IGZ1bmN0aW9uICh3b3JkQXJyYXkpIHtcclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcclxuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSB3b3JkQXJyYXkud29yZHM7XHJcblx0ICAgICAgICAgICAgdmFyIHNpZ0J5dGVzID0gd29yZEFycmF5LnNpZ0J5dGVzO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDb252ZXJ0XHJcblx0ICAgICAgICAgICAgdmFyIGxhdGluMUNoYXJzID0gW107XHJcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaWdCeXRlczsgaSsrKSB7XHJcblx0ICAgICAgICAgICAgICAgIHZhciBiaXRlID0gKHdvcmRzW2kgPj4+IDJdID4+PiAoMjQgLSAoaSAlIDQpICogOCkpICYgMHhmZjtcclxuXHQgICAgICAgICAgICAgICAgbGF0aW4xQ2hhcnMucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlKGJpdGUpKTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBsYXRpbjFDaGFycy5qb2luKCcnKTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIExhdGluMSBzdHJpbmcgdG8gYSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYXRpbjFTdHIgVGhlIExhdGluMSBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmVuYy5MYXRpbjEucGFyc2UobGF0aW4xU3RyaW5nKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgcGFyc2U6IGZ1bmN0aW9uIChsYXRpbjFTdHIpIHtcclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dFxyXG5cdCAgICAgICAgICAgIHZhciBsYXRpbjFTdHJMZW5ndGggPSBsYXRpbjFTdHIubGVuZ3RoO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDb252ZXJ0XHJcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gW107XHJcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXRpbjFTdHJMZW5ndGg7IGkrKykge1xyXG5cdCAgICAgICAgICAgICAgICB3b3Jkc1tpID4+PiAyXSB8PSAobGF0aW4xU3RyLmNoYXJDb2RlQXQoaSkgJiAweGZmKSA8PCAoMjQgLSAoaSAlIDQpICogOCk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRBcnJheS5pbml0KHdvcmRzLCBsYXRpbjFTdHJMZW5ndGgpO1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9O1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIFVURi04IGVuY29kaW5nIHN0cmF0ZWd5LlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIFV0ZjggPSBDX2VuYy5VdGY4ID0ge1xyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIHdvcmQgYXJyYXkgdG8gYSBVVEYtOCBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl9IHdvcmRBcnJheSBUaGUgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBVVEYtOCBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciB1dGY4U3RyaW5nID0gQ3J5cHRvSlMuZW5jLlV0Zjguc3RyaW5naWZ5KHdvcmRBcnJheSk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHN0cmluZ2lmeTogZnVuY3Rpb24gKHdvcmRBcnJheSkge1xyXG5cdCAgICAgICAgICAgIHRyeSB7XHJcblx0ICAgICAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKExhdGluMS5zdHJpbmdpZnkod29yZEFycmF5KSkpO1xyXG5cdCAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuXHQgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNYWxmb3JtZWQgVVRGLTggZGF0YScpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIFVURi04IHN0cmluZyB0byBhIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHV0ZjhTdHIgVGhlIFVURi04IHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMuZW5jLlV0ZjgucGFyc2UodXRmOFN0cmluZyk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHBhcnNlOiBmdW5jdGlvbiAodXRmOFN0cikge1xyXG5cdCAgICAgICAgICAgIHJldHVybiBMYXRpbjEucGFyc2UodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KHV0ZjhTdHIpKSk7XHJcblx0ICAgICAgICB9XHJcblx0ICAgIH07XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogQWJzdHJhY3QgYnVmZmVyZWQgYmxvY2sgYWxnb3JpdGhtIHRlbXBsYXRlLlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBUaGUgcHJvcGVydHkgYmxvY2tTaXplIG11c3QgYmUgaW1wbGVtZW50ZWQgaW4gYSBjb25jcmV0ZSBzdWJ0eXBlLlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAcHJvcGVydHkge251bWJlcn0gX21pbkJ1ZmZlclNpemUgVGhlIG51bWJlciBvZiBibG9ja3MgdGhhdCBzaG91bGQgYmUga2VwdCB1bnByb2Nlc3NlZCBpbiB0aGUgYnVmZmVyLiBEZWZhdWx0OiAwXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgQnVmZmVyZWRCbG9ja0FsZ29yaXRobSA9IENfbGliLkJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0gPSBCYXNlLmV4dGVuZCh7XHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIFJlc2V0cyB0aGlzIGJsb2NrIGFsZ29yaXRobSdzIGRhdGEgYnVmZmVyIHRvIGl0cyBpbml0aWFsIHN0YXRlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0ucmVzZXQoKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAvLyBJbml0aWFsIHZhbHVlc1xyXG5cdCAgICAgICAgICAgIHRoaXMuX2RhdGEgPSBuZXcgV29yZEFycmF5LmluaXQoKTtcclxuXHQgICAgICAgICAgICB0aGlzLl9uRGF0YUJ5dGVzID0gMDtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBBZGRzIG5ldyBkYXRhIHRvIHRoaXMgYmxvY2sgYWxnb3JpdGhtJ3MgYnVmZmVyLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gZGF0YSBUaGUgZGF0YSB0byBhcHBlbmQuIFN0cmluZ3MgYXJlIGNvbnZlcnRlZCB0byBhIFdvcmRBcnJheSB1c2luZyBVVEYtOC5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLl9hcHBlbmQoJ2RhdGEnKTtcclxuXHQgICAgICAgICAqICAgICBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLl9hcHBlbmQod29yZEFycmF5KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgX2FwcGVuZDogZnVuY3Rpb24gKGRhdGEpIHtcclxuXHQgICAgICAgICAgICAvLyBDb252ZXJ0IHN0cmluZyB0byBXb3JkQXJyYXksIGVsc2UgYXNzdW1lIFdvcmRBcnJheSBhbHJlYWR5XHJcblx0ICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhID09ICdzdHJpbmcnKSB7XHJcblx0ICAgICAgICAgICAgICAgIGRhdGEgPSBVdGY4LnBhcnNlKGRhdGEpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgLy8gQXBwZW5kXHJcblx0ICAgICAgICAgICAgdGhpcy5fZGF0YS5jb25jYXQoZGF0YSk7XHJcblx0ICAgICAgICAgICAgdGhpcy5fbkRhdGFCeXRlcyArPSBkYXRhLnNpZ0J5dGVzO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIFByb2Nlc3NlcyBhdmFpbGFibGUgZGF0YSBibG9ja3MuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogVGhpcyBtZXRob2QgaW52b2tlcyBfZG9Qcm9jZXNzQmxvY2sob2Zmc2V0KSwgd2hpY2ggbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBhIGNvbmNyZXRlIHN1YnR5cGUuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtib29sZWFufSBkb0ZsdXNoIFdoZXRoZXIgYWxsIGJsb2NrcyBhbmQgcGFydGlhbCBibG9ja3Mgc2hvdWxkIGJlIHByb2Nlc3NlZC5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBwcm9jZXNzZWQgZGF0YS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9IGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uX3Byb2Nlc3MoKTtcclxuXHQgICAgICAgICAqICAgICB2YXIgcHJvY2Vzc2VkRGF0YSA9IGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uX3Byb2Nlc3MoISEnZmx1c2gnKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgX3Byb2Nlc3M6IGZ1bmN0aW9uIChkb0ZsdXNoKSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXHJcblx0ICAgICAgICAgICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhO1xyXG5cdCAgICAgICAgICAgIHZhciBkYXRhV29yZHMgPSBkYXRhLndvcmRzO1xyXG5cdCAgICAgICAgICAgIHZhciBkYXRhU2lnQnl0ZXMgPSBkYXRhLnNpZ0J5dGVzO1xyXG5cdCAgICAgICAgICAgIHZhciBibG9ja1NpemUgPSB0aGlzLmJsb2NrU2l6ZTtcclxuXHQgICAgICAgICAgICB2YXIgYmxvY2tTaXplQnl0ZXMgPSBibG9ja1NpemUgKiA0O1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDb3VudCBibG9ja3MgcmVhZHlcclxuXHQgICAgICAgICAgICB2YXIgbkJsb2Nrc1JlYWR5ID0gZGF0YVNpZ0J5dGVzIC8gYmxvY2tTaXplQnl0ZXM7XHJcblx0ICAgICAgICAgICAgaWYgKGRvRmx1c2gpIHtcclxuXHQgICAgICAgICAgICAgICAgLy8gUm91bmQgdXAgdG8gaW5jbHVkZSBwYXJ0aWFsIGJsb2Nrc1xyXG5cdCAgICAgICAgICAgICAgICBuQmxvY2tzUmVhZHkgPSBNYXRoLmNlaWwobkJsb2Nrc1JlYWR5KTtcclxuXHQgICAgICAgICAgICB9IGVsc2Uge1xyXG5cdCAgICAgICAgICAgICAgICAvLyBSb3VuZCBkb3duIHRvIGluY2x1ZGUgb25seSBmdWxsIGJsb2NrcyxcclxuXHQgICAgICAgICAgICAgICAgLy8gbGVzcyB0aGUgbnVtYmVyIG9mIGJsb2NrcyB0aGF0IG11c3QgcmVtYWluIGluIHRoZSBidWZmZXJcclxuXHQgICAgICAgICAgICAgICAgbkJsb2Nrc1JlYWR5ID0gTWF0aC5tYXgoKG5CbG9ja3NSZWFkeSB8IDApIC0gdGhpcy5fbWluQnVmZmVyU2l6ZSwgMCk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAvLyBDb3VudCB3b3JkcyByZWFkeVxyXG5cdCAgICAgICAgICAgIHZhciBuV29yZHNSZWFkeSA9IG5CbG9ja3NSZWFkeSAqIGJsb2NrU2l6ZTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ291bnQgYnl0ZXMgcmVhZHlcclxuXHQgICAgICAgICAgICB2YXIgbkJ5dGVzUmVhZHkgPSBNYXRoLm1pbihuV29yZHNSZWFkeSAqIDQsIGRhdGFTaWdCeXRlcyk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFByb2Nlc3MgYmxvY2tzXHJcblx0ICAgICAgICAgICAgaWYgKG5Xb3Jkc1JlYWR5KSB7XHJcblx0ICAgICAgICAgICAgICAgIGZvciAodmFyIG9mZnNldCA9IDA7IG9mZnNldCA8IG5Xb3Jkc1JlYWR5OyBvZmZzZXQgKz0gYmxvY2tTaXplKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbmNyZXRlLWFsZ29yaXRobSBsb2dpY1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdGhpcy5fZG9Qcm9jZXNzQmxvY2soZGF0YVdvcmRzLCBvZmZzZXQpO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgICAgICAvLyBSZW1vdmUgcHJvY2Vzc2VkIHdvcmRzXHJcblx0ICAgICAgICAgICAgICAgIHZhciBwcm9jZXNzZWRXb3JkcyA9IGRhdGFXb3Jkcy5zcGxpY2UoMCwgbldvcmRzUmVhZHkpO1xyXG5cdCAgICAgICAgICAgICAgICBkYXRhLnNpZ0J5dGVzIC09IG5CeXRlc1JlYWR5O1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgLy8gUmV0dXJuIHByb2Nlc3NlZCB3b3Jkc1xyXG5cdCAgICAgICAgICAgIHJldHVybiBuZXcgV29yZEFycmF5LmluaXQocHJvY2Vzc2VkV29yZHMsIG5CeXRlc1JlYWR5KTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDcmVhdGVzIGEgY29weSBvZiB0aGlzIG9iamVjdC5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBjbG9uZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgY2xvbmUgPSBidWZmZXJlZEJsb2NrQWxnb3JpdGhtLmNsb25lKCk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgdmFyIGNsb25lID0gQmFzZS5jbG9uZS5jYWxsKHRoaXMpO1xyXG5cdCAgICAgICAgICAgIGNsb25lLl9kYXRhID0gdGhpcy5fZGF0YS5jbG9uZSgpO1xyXG5cclxuXHQgICAgICAgICAgICByZXR1cm4gY2xvbmU7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIF9taW5CdWZmZXJTaXplOiAwXHJcblx0ICAgIH0pO1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIEFic3RyYWN0IGhhc2hlciB0ZW1wbGF0ZS5cclxuXHQgICAgICpcclxuXHQgICAgICogQHByb3BlcnR5IHtudW1iZXJ9IGJsb2NrU2l6ZSBUaGUgbnVtYmVyIG9mIDMyLWJpdCB3b3JkcyB0aGlzIGhhc2hlciBvcGVyYXRlcyBvbi4gRGVmYXVsdDogMTYgKDUxMiBiaXRzKVxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIEhhc2hlciA9IENfbGliLkhhc2hlciA9IEJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uZXh0ZW5kKHtcclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29uZmlndXJhdGlvbiBvcHRpb25zLlxyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBjZmc6IEJhc2UuZXh0ZW5kKCksXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBJbml0aWFsaXplcyBhIG5ld2x5IGNyZWF0ZWQgaGFzaGVyLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjZmcgKE9wdGlvbmFsKSBUaGUgY29uZmlndXJhdGlvbiBvcHRpb25zIHRvIHVzZSBmb3IgdGhpcyBoYXNoIGNvbXB1dGF0aW9uLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBoYXNoZXIgPSBDcnlwdG9KUy5hbGdvLlNIQTI1Ni5jcmVhdGUoKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgaW5pdDogZnVuY3Rpb24gKGNmZykge1xyXG5cdCAgICAgICAgICAgIC8vIEFwcGx5IGNvbmZpZyBkZWZhdWx0c1xyXG5cdCAgICAgICAgICAgIHRoaXMuY2ZnID0gdGhpcy5jZmcuZXh0ZW5kKGNmZyk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFNldCBpbml0aWFsIHZhbHVlc1xyXG5cdCAgICAgICAgICAgIHRoaXMucmVzZXQoKTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBSZXNldHMgdGhpcyBoYXNoZXIgdG8gaXRzIGluaXRpYWwgc3RhdGUuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgaGFzaGVyLnJlc2V0KCk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHJlc2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgLy8gUmVzZXQgZGF0YSBidWZmZXJcclxuXHQgICAgICAgICAgICBCdWZmZXJlZEJsb2NrQWxnb3JpdGhtLnJlc2V0LmNhbGwodGhpcyk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFBlcmZvcm0gY29uY3JldGUtaGFzaGVyIGxvZ2ljXHJcblx0ICAgICAgICAgICAgdGhpcy5fZG9SZXNldCgpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIFVwZGF0ZXMgdGhpcyBoYXNoZXIgd2l0aCBhIG1lc3NhZ2UuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlVXBkYXRlIFRoZSBtZXNzYWdlIHRvIGFwcGVuZC5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtIYXNoZXJ9IFRoaXMgaGFzaGVyLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIGhhc2hlci51cGRhdGUoJ21lc3NhZ2UnKTtcclxuXHQgICAgICAgICAqICAgICBoYXNoZXIudXBkYXRlKHdvcmRBcnJheSk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKG1lc3NhZ2VVcGRhdGUpIHtcclxuXHQgICAgICAgICAgICAvLyBBcHBlbmRcclxuXHQgICAgICAgICAgICB0aGlzLl9hcHBlbmQobWVzc2FnZVVwZGF0ZSk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgaGFzaFxyXG5cdCAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ2hhaW5hYmxlXHJcblx0ICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogRmluYWxpemVzIHRoZSBoYXNoIGNvbXB1dGF0aW9uLlxyXG5cdCAgICAgICAgICogTm90ZSB0aGF0IHRoZSBmaW5hbGl6ZSBvcGVyYXRpb24gaXMgZWZmZWN0aXZlbHkgYSBkZXN0cnVjdGl2ZSwgcmVhZC1vbmNlIG9wZXJhdGlvbi5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IG1lc3NhZ2VVcGRhdGUgKE9wdGlvbmFsKSBBIGZpbmFsIG1lc3NhZ2UgdXBkYXRlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIGhhc2guXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIGhhc2ggPSBoYXNoZXIuZmluYWxpemUoKTtcclxuXHQgICAgICAgICAqICAgICB2YXIgaGFzaCA9IGhhc2hlci5maW5hbGl6ZSgnbWVzc2FnZScpO1xyXG5cdCAgICAgICAgICogICAgIHZhciBoYXNoID0gaGFzaGVyLmZpbmFsaXplKHdvcmRBcnJheSk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGZpbmFsaXplOiBmdW5jdGlvbiAobWVzc2FnZVVwZGF0ZSkge1xyXG5cdCAgICAgICAgICAgIC8vIEZpbmFsIG1lc3NhZ2UgdXBkYXRlXHJcblx0ICAgICAgICAgICAgaWYgKG1lc3NhZ2VVcGRhdGUpIHtcclxuXHQgICAgICAgICAgICAgICAgdGhpcy5fYXBwZW5kKG1lc3NhZ2VVcGRhdGUpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgLy8gUGVyZm9ybSBjb25jcmV0ZS1oYXNoZXIgbG9naWNcclxuXHQgICAgICAgICAgICB2YXIgaGFzaCA9IHRoaXMuX2RvRmluYWxpemUoKTtcclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIGhhc2g7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIGJsb2NrU2l6ZTogNTEyLzMyLFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ3JlYXRlcyBhIHNob3J0Y3V0IGZ1bmN0aW9uIHRvIGEgaGFzaGVyJ3Mgb2JqZWN0IGludGVyZmFjZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge0hhc2hlcn0gaGFzaGVyIFRoZSBoYXNoZXIgdG8gY3JlYXRlIGEgaGVscGVyIGZvci5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gVGhlIHNob3J0Y3V0IGZ1bmN0aW9uLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgU0hBMjU2ID0gQ3J5cHRvSlMubGliLkhhc2hlci5fY3JlYXRlSGVscGVyKENyeXB0b0pTLmFsZ28uU0hBMjU2KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgX2NyZWF0ZUhlbHBlcjogZnVuY3Rpb24gKGhhc2hlcikge1xyXG5cdCAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAobWVzc2FnZSwgY2ZnKSB7XHJcblx0ICAgICAgICAgICAgICAgIHJldHVybiBuZXcgaGFzaGVyLmluaXQoY2ZnKS5maW5hbGl6ZShtZXNzYWdlKTtcclxuXHQgICAgICAgICAgICB9O1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENyZWF0ZXMgYSBzaG9ydGN1dCBmdW5jdGlvbiB0byB0aGUgSE1BQydzIG9iamVjdCBpbnRlcmZhY2UuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtIYXNoZXJ9IGhhc2hlciBUaGUgaGFzaGVyIHRvIHVzZSBpbiB0aGlzIEhNQUMgaGVscGVyLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgc2hvcnRjdXQgZnVuY3Rpb24uXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBIbWFjU0hBMjU2ID0gQ3J5cHRvSlMubGliLkhhc2hlci5fY3JlYXRlSG1hY0hlbHBlcihDcnlwdG9KUy5hbGdvLlNIQTI1Nik7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIF9jcmVhdGVIbWFjSGVscGVyOiBmdW5jdGlvbiAoaGFzaGVyKSB7XHJcblx0ICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChtZXNzYWdlLCBrZXkpIHtcclxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDX2FsZ28uSE1BQy5pbml0KGhhc2hlciwga2V5KS5maW5hbGl6ZShtZXNzYWdlKTtcclxuXHQgICAgICAgICAgICB9O1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9KTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBBbGdvcml0aG0gbmFtZXNwYWNlLlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIENfYWxnbyA9IEMuYWxnbyA9IHt9O1xyXG5cclxuXHQgICAgcmV0dXJuIEM7XHJcblx0fShNYXRoKSk7XHJcblxyXG5cclxuXHRyZXR1cm4gQ3J5cHRvSlM7XHJcblxyXG59KSk7IiwiOyhmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xyXG5cdGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xyXG5cdFx0Ly8gQ29tbW9uSlNcclxuXHRcdG1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZShcIi4vY29yZVwiKSk7XHJcblx0fVxyXG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XHJcblx0XHQvLyBBTURcclxuXHRcdGRlZmluZShbXCIuL2NvcmVcIl0sIGZhY3RvcnkpO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdC8vIEdsb2JhbCAoYnJvd3NlcilcclxuXHRcdGZhY3Rvcnkocm9vdC5DcnlwdG9KUyk7XHJcblx0fVxyXG59KHRoaXMsIGZ1bmN0aW9uIChDcnlwdG9KUykge1xyXG5cclxuXHRyZXR1cm4gQ3J5cHRvSlMuZW5jLkhleDtcclxuXHJcbn0pKTsiLCI7KGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcblx0aWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XHJcblx0XHQvLyBDb21tb25KU1xyXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKFwiLi9jb3JlXCIpKTtcclxuXHR9XHJcblx0ZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcclxuXHRcdC8vIEFNRFxyXG5cdFx0ZGVmaW5lKFtcIi4vY29yZVwiXSwgZmFjdG9yeSk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Ly8gR2xvYmFsIChicm93c2VyKVxyXG5cdFx0ZmFjdG9yeShyb290LkNyeXB0b0pTKTtcclxuXHR9XHJcbn0odGhpcywgZnVuY3Rpb24gKENyeXB0b0pTKSB7XHJcblxyXG5cdChmdW5jdGlvbiAoTWF0aCkge1xyXG5cdCAgICAvLyBTaG9ydGN1dHNcclxuXHQgICAgdmFyIEMgPSBDcnlwdG9KUztcclxuXHQgICAgdmFyIENfbGliID0gQy5saWI7XHJcblx0ICAgIHZhciBXb3JkQXJyYXkgPSBDX2xpYi5Xb3JkQXJyYXk7XHJcblx0ICAgIHZhciBIYXNoZXIgPSBDX2xpYi5IYXNoZXI7XHJcblx0ICAgIHZhciBDX2FsZ28gPSBDLmFsZ287XHJcblxyXG5cdCAgICAvLyBJbml0aWFsaXphdGlvbiBhbmQgcm91bmQgY29uc3RhbnRzIHRhYmxlc1xyXG5cdCAgICB2YXIgSCA9IFtdO1xyXG5cdCAgICB2YXIgSyA9IFtdO1xyXG5cclxuXHQgICAgLy8gQ29tcHV0ZSBjb25zdGFudHNcclxuXHQgICAgKGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgIGZ1bmN0aW9uIGlzUHJpbWUobikge1xyXG5cdCAgICAgICAgICAgIHZhciBzcXJ0TiA9IE1hdGguc3FydChuKTtcclxuXHQgICAgICAgICAgICBmb3IgKHZhciBmYWN0b3IgPSAyOyBmYWN0b3IgPD0gc3FydE47IGZhY3RvcisrKSB7XHJcblx0ICAgICAgICAgICAgICAgIGlmICghKG4gJSBmYWN0b3IpKSB7XHJcblx0ICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG5cdCAgICAgICAgfVxyXG5cclxuXHQgICAgICAgIGZ1bmN0aW9uIGdldEZyYWN0aW9uYWxCaXRzKG4pIHtcclxuXHQgICAgICAgICAgICByZXR1cm4gKChuIC0gKG4gfCAwKSkgKiAweDEwMDAwMDAwMCkgfCAwO1xyXG5cdCAgICAgICAgfVxyXG5cclxuXHQgICAgICAgIHZhciBuID0gMjtcclxuXHQgICAgICAgIHZhciBuUHJpbWUgPSAwO1xyXG5cdCAgICAgICAgd2hpbGUgKG5QcmltZSA8IDY0KSB7XHJcblx0ICAgICAgICAgICAgaWYgKGlzUHJpbWUobikpIHtcclxuXHQgICAgICAgICAgICAgICAgaWYgKG5QcmltZSA8IDgpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIEhbblByaW1lXSA9IGdldEZyYWN0aW9uYWxCaXRzKE1hdGgucG93KG4sIDEgLyAyKSk7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICAgICAgS1tuUHJpbWVdID0gZ2V0RnJhY3Rpb25hbEJpdHMoTWF0aC5wb3cobiwgMSAvIDMpKTtcclxuXHJcblx0ICAgICAgICAgICAgICAgIG5QcmltZSsrO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgbisrO1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9KCkpO1xyXG5cclxuXHQgICAgLy8gUmV1c2FibGUgb2JqZWN0XHJcblx0ICAgIHZhciBXID0gW107XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogU0hBLTI1NiBoYXNoIGFsZ29yaXRobS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBTSEEyNTYgPSBDX2FsZ28uU0hBMjU2ID0gSGFzaGVyLmV4dGVuZCh7XHJcblx0ICAgICAgICBfZG9SZXNldDogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIHRoaXMuX2hhc2ggPSBuZXcgV29yZEFycmF5LmluaXQoSC5zbGljZSgwKSk7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIF9kb1Byb2Nlc3NCbG9jazogZnVuY3Rpb24gKE0sIG9mZnNldCkge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0XHJcblx0ICAgICAgICAgICAgdmFyIEggPSB0aGlzLl9oYXNoLndvcmRzO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBXb3JraW5nIHZhcmlhYmxlc1xyXG5cdCAgICAgICAgICAgIHZhciBhID0gSFswXTtcclxuXHQgICAgICAgICAgICB2YXIgYiA9IEhbMV07XHJcblx0ICAgICAgICAgICAgdmFyIGMgPSBIWzJdO1xyXG5cdCAgICAgICAgICAgIHZhciBkID0gSFszXTtcclxuXHQgICAgICAgICAgICB2YXIgZSA9IEhbNF07XHJcblx0ICAgICAgICAgICAgdmFyIGYgPSBIWzVdO1xyXG5cdCAgICAgICAgICAgIHZhciBnID0gSFs2XTtcclxuXHQgICAgICAgICAgICB2YXIgaCA9IEhbN107XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvbXB1dGF0aW9uXHJcblx0ICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA2NDsgaSsrKSB7XHJcblx0ICAgICAgICAgICAgICAgIGlmIChpIDwgMTYpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIFdbaV0gPSBNW29mZnNldCArIGldIHwgMDtcclxuXHQgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHZhciBnYW1tYTB4ID0gV1tpIC0gMTVdO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGdhbW1hMCAgPSAoKGdhbW1hMHggPDwgMjUpIHwgKGdhbW1hMHggPj4+IDcpKSAgXlxyXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKGdhbW1hMHggPDwgMTQpIHwgKGdhbW1hMHggPj4+IDE4KSkgXlxyXG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGdhbW1hMHggPj4+IDMpO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgICAgIHZhciBnYW1tYTF4ID0gV1tpIC0gMl07XHJcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgZ2FtbWExICA9ICgoZ2FtbWExeCA8PCAxNSkgfCAoZ2FtbWExeCA+Pj4gMTcpKSBeXHJcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgoZ2FtbWExeCA8PCAxMykgfCAoZ2FtbWExeCA+Pj4gMTkpKSBeXHJcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZ2FtbWExeCA+Pj4gMTApO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgICAgIFdbaV0gPSBnYW1tYTAgKyBXW2kgLSA3XSArIGdhbW1hMSArIFdbaSAtIDE2XTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAgICAgdmFyIGNoICA9IChlICYgZikgXiAofmUgJiBnKTtcclxuXHQgICAgICAgICAgICAgICAgdmFyIG1haiA9IChhICYgYikgXiAoYSAmIGMpIF4gKGIgJiBjKTtcclxuXHJcblx0ICAgICAgICAgICAgICAgIHZhciBzaWdtYTAgPSAoKGEgPDwgMzApIHwgKGEgPj4+IDIpKSBeICgoYSA8PCAxOSkgfCAoYSA+Pj4gMTMpKSBeICgoYSA8PCAxMCkgfCAoYSA+Pj4gMjIpKTtcclxuXHQgICAgICAgICAgICAgICAgdmFyIHNpZ21hMSA9ICgoZSA8PCAyNikgfCAoZSA+Pj4gNikpIF4gKChlIDw8IDIxKSB8IChlID4+PiAxMSkpIF4gKChlIDw8IDcpICB8IChlID4+PiAyNSkpO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgdmFyIHQxID0gaCArIHNpZ21hMSArIGNoICsgS1tpXSArIFdbaV07XHJcblx0ICAgICAgICAgICAgICAgIHZhciB0MiA9IHNpZ21hMCArIG1hajtcclxuXHJcblx0ICAgICAgICAgICAgICAgIGggPSBnO1xyXG5cdCAgICAgICAgICAgICAgICBnID0gZjtcclxuXHQgICAgICAgICAgICAgICAgZiA9IGU7XHJcblx0ICAgICAgICAgICAgICAgIGUgPSAoZCArIHQxKSB8IDA7XHJcblx0ICAgICAgICAgICAgICAgIGQgPSBjO1xyXG5cdCAgICAgICAgICAgICAgICBjID0gYjtcclxuXHQgICAgICAgICAgICAgICAgYiA9IGE7XHJcblx0ICAgICAgICAgICAgICAgIGEgPSAodDEgKyB0MikgfCAwO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgLy8gSW50ZXJtZWRpYXRlIGhhc2ggdmFsdWVcclxuXHQgICAgICAgICAgICBIWzBdID0gKEhbMF0gKyBhKSB8IDA7XHJcblx0ICAgICAgICAgICAgSFsxXSA9IChIWzFdICsgYikgfCAwO1xyXG5cdCAgICAgICAgICAgIEhbMl0gPSAoSFsyXSArIGMpIHwgMDtcclxuXHQgICAgICAgICAgICBIWzNdID0gKEhbM10gKyBkKSB8IDA7XHJcblx0ICAgICAgICAgICAgSFs0XSA9IChIWzRdICsgZSkgfCAwO1xyXG5cdCAgICAgICAgICAgIEhbNV0gPSAoSFs1XSArIGYpIHwgMDtcclxuXHQgICAgICAgICAgICBIWzZdID0gKEhbNl0gKyBnKSB8IDA7XHJcblx0ICAgICAgICAgICAgSFs3XSA9IChIWzddICsgaCkgfCAwO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICBfZG9GaW5hbGl6ZTogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5fZGF0YTtcclxuXHQgICAgICAgICAgICB2YXIgZGF0YVdvcmRzID0gZGF0YS53b3JkcztcclxuXHJcblx0ICAgICAgICAgICAgdmFyIG5CaXRzVG90YWwgPSB0aGlzLl9uRGF0YUJ5dGVzICogODtcclxuXHQgICAgICAgICAgICB2YXIgbkJpdHNMZWZ0ID0gZGF0YS5zaWdCeXRlcyAqIDg7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIEFkZCBwYWRkaW5nXHJcblx0ICAgICAgICAgICAgZGF0YVdvcmRzW25CaXRzTGVmdCA+Pj4gNV0gfD0gMHg4MCA8PCAoMjQgLSBuQml0c0xlZnQgJSAzMik7XHJcblx0ICAgICAgICAgICAgZGF0YVdvcmRzWygoKG5CaXRzTGVmdCArIDY0KSA+Pj4gOSkgPDwgNCkgKyAxNF0gPSBNYXRoLmZsb29yKG5CaXRzVG90YWwgLyAweDEwMDAwMDAwMCk7XHJcblx0ICAgICAgICAgICAgZGF0YVdvcmRzWygoKG5CaXRzTGVmdCArIDY0KSA+Pj4gOSkgPDwgNCkgKyAxNV0gPSBuQml0c1RvdGFsO1xyXG5cdCAgICAgICAgICAgIGRhdGEuc2lnQnl0ZXMgPSBkYXRhV29yZHMubGVuZ3RoICogNDtcclxuXHJcblx0ICAgICAgICAgICAgLy8gSGFzaCBmaW5hbCBibG9ja3NcclxuXHQgICAgICAgICAgICB0aGlzLl9wcm9jZXNzKCk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFJldHVybiBmaW5hbCBjb21wdXRlZCBoYXNoXHJcblx0ICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2hhc2g7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIGNsb25lOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgdmFyIGNsb25lID0gSGFzaGVyLmNsb25lLmNhbGwodGhpcyk7XHJcblx0ICAgICAgICAgICAgY2xvbmUuX2hhc2ggPSB0aGlzLl9oYXNoLmNsb25lKCk7XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBjbG9uZTtcclxuXHQgICAgICAgIH1cclxuXHQgICAgfSk7XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogU2hvcnRjdXQgZnVuY3Rpb24gdG8gdGhlIGhhc2hlcidzIG9iamVjdCBpbnRlcmZhY2UuXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBoYXNoLlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBoYXNoLlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAc3RhdGljXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAqXHJcblx0ICAgICAqICAgICB2YXIgaGFzaCA9IENyeXB0b0pTLlNIQTI1NignbWVzc2FnZScpO1xyXG5cdCAgICAgKiAgICAgdmFyIGhhc2ggPSBDcnlwdG9KUy5TSEEyNTYod29yZEFycmF5KTtcclxuXHQgICAgICovXHJcblx0ICAgIEMuU0hBMjU2ID0gSGFzaGVyLl9jcmVhdGVIZWxwZXIoU0hBMjU2KTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBTaG9ydGN1dCBmdW5jdGlvbiB0byB0aGUgSE1BQydzIG9iamVjdCBpbnRlcmZhY2UuXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBoYXNoLlxyXG5cdCAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IGtleSBUaGUgc2VjcmV0IGtleS5cclxuXHQgICAgICpcclxuXHQgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgSE1BQy5cclxuXHQgICAgICpcclxuXHQgICAgICogQHN0YXRpY1xyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiAgICAgdmFyIGhtYWMgPSBDcnlwdG9KUy5IbWFjU0hBMjU2KG1lc3NhZ2UsIGtleSk7XHJcblx0ICAgICAqL1xyXG5cdCAgICBDLkhtYWNTSEEyNTYgPSBIYXNoZXIuX2NyZWF0ZUhtYWNIZWxwZXIoU0hBMjU2KTtcclxuXHR9KE1hdGgpKTtcclxuXHJcblxyXG5cdHJldHVybiBDcnlwdG9KUy5TSEEyNTY7XHJcblxyXG59KSk7IiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIHZpbTp0cz00OnN0cz00OnN3PTQ6XHJcbi8qIVxyXG4gKlxyXG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEyIEtyaXMgS293YWwgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBNSVRcclxuICogbGljZW5zZSBmb3VuZCBhdCBodHRwOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcS9yYXcvbWFzdGVyL0xJQ0VOU0VcclxuICpcclxuICogV2l0aCBwYXJ0cyBieSBUeWxlciBDbG9zZVxyXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDA5IFR5bGVyIENsb3NlIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgTUlUIFggbGljZW5zZSBmb3VuZFxyXG4gKiBhdCBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLmh0bWxcclxuICogRm9ya2VkIGF0IHJlZl9zZW5kLmpzIHZlcnNpb246IDIwMDktMDUtMTFcclxuICpcclxuICogV2l0aCBwYXJ0cyBieSBNYXJrIE1pbGxlclxyXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTEgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcclxuICAgIC8vIFR1cm4gb2ZmIHN0cmljdCBtb2RlIGZvciB0aGlzIGZ1bmN0aW9uIHNvIHdlIGNhbiBhc3NpZ24gdG8gZ2xvYmFsLlFcclxuICAgIC8qIGpzaGludCBzdHJpY3Q6IGZhbHNlICovXHJcblxyXG4gICAgLy8gVGhpcyBmaWxlIHdpbGwgZnVuY3Rpb24gcHJvcGVybHkgYXMgYSA8c2NyaXB0PiB0YWcsIG9yIGEgbW9kdWxlXHJcbiAgICAvLyB1c2luZyBDb21tb25KUyBhbmQgTm9kZUpTIG9yIFJlcXVpcmVKUyBtb2R1bGUgZm9ybWF0cy4gIEluXHJcbiAgICAvLyBDb21tb24vTm9kZS9SZXF1aXJlSlMsIHRoZSBtb2R1bGUgZXhwb3J0cyB0aGUgUSBBUEkgYW5kIHdoZW5cclxuICAgIC8vIGV4ZWN1dGVkIGFzIGEgc2ltcGxlIDxzY3JpcHQ+LCBpdCBjcmVhdGVzIGEgUSBnbG9iYWwgaW5zdGVhZC5cclxuXHJcbiAgICAvLyBNb250YWdlIFJlcXVpcmVcclxuICAgIGlmICh0eXBlb2YgYm9vdHN0cmFwID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICBib290c3RyYXAoXCJwcm9taXNlXCIsIGRlZmluaXRpb24pO1xyXG5cclxuICAgIC8vIENvbW1vbkpTXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XHJcblxyXG4gICAgLy8gUmVxdWlyZUpTXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKGRlZmluaXRpb24pO1xyXG5cclxuICAgIC8vIFNFUyAoU2VjdXJlIEVjbWFTY3JpcHQpXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXMgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICBpZiAoIXNlcy5vaygpKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXMubWFrZVEgPSBkZWZpbml0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAvLyA8c2NyaXB0PlxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBRID0gZGVmaW5pdGlvbigpO1xyXG4gICAgfVxyXG5cclxufSkoZnVuY3Rpb24gKCkge1xyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBoYXNTdGFja3MgPSBmYWxzZTtcclxudHJ5IHtcclxuICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG59IGNhdGNoIChlKSB7XHJcbiAgICBoYXNTdGFja3MgPSAhIWUuc3RhY2s7XHJcbn1cclxuXHJcbi8vIEFsbCBjb2RlIGFmdGVyIHRoaXMgcG9pbnQgd2lsbCBiZSBmaWx0ZXJlZCBmcm9tIHN0YWNrIHRyYWNlcyByZXBvcnRlZFxyXG4vLyBieSBRLlxyXG52YXIgcVN0YXJ0aW5nTGluZSA9IGNhcHR1cmVMaW5lKCk7XHJcbnZhciBxRmlsZU5hbWU7XHJcblxyXG4vLyBzaGltc1xyXG5cclxuLy8gdXNlZCBmb3IgZmFsbGJhY2sgaW4gXCJhbGxSZXNvbHZlZFwiXHJcbnZhciBub29wID0gZnVuY3Rpb24gKCkge307XHJcblxyXG4vLyBVc2UgdGhlIGZhc3Rlc3QgcG9zc2libGUgbWVhbnMgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gYSBmdXR1cmUgdHVyblxyXG4vLyBvZiB0aGUgZXZlbnQgbG9vcC5cclxudmFyIG5leHRUaWNrID0oZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gbGlua2VkIGxpc3Qgb2YgdGFza3MgKHNpbmdsZSwgd2l0aCBoZWFkIG5vZGUpXHJcbiAgICB2YXIgaGVhZCA9IHt0YXNrOiB2b2lkIDAsIG5leHQ6IG51bGx9O1xyXG4gICAgdmFyIHRhaWwgPSBoZWFkO1xyXG4gICAgdmFyIGZsdXNoaW5nID0gZmFsc2U7XHJcbiAgICB2YXIgcmVxdWVzdFRpY2sgPSB2b2lkIDA7XHJcbiAgICB2YXIgaXNOb2RlSlMgPSBmYWxzZTtcclxuXHJcbiAgICBmdW5jdGlvbiBmbHVzaCgpIHtcclxuICAgICAgICAvKiBqc2hpbnQgbG9vcGZ1bmM6IHRydWUgKi9cclxuXHJcbiAgICAgICAgd2hpbGUgKGhlYWQubmV4dCkge1xyXG4gICAgICAgICAgICBoZWFkID0gaGVhZC5uZXh0O1xyXG4gICAgICAgICAgICB2YXIgdGFzayA9IGhlYWQudGFzaztcclxuICAgICAgICAgICAgaGVhZC50YXNrID0gdm9pZCAwO1xyXG4gICAgICAgICAgICB2YXIgZG9tYWluID0gaGVhZC5kb21haW47XHJcblxyXG4gICAgICAgICAgICBpZiAoZG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICBoZWFkLmRvbWFpbiA9IHZvaWQgMDtcclxuICAgICAgICAgICAgICAgIGRvbWFpbi5lbnRlcigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgdGFzaygpO1xyXG5cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzTm9kZUpTKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSW4gbm9kZSwgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgY29uc2lkZXJlZCBmYXRhbCBlcnJvcnMuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBzeW5jaHJvbm91c2x5IHRvIGludGVycnVwdCBmbHVzaGluZyFcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIGNvbnRpbnVhdGlvbiBpZiB0aGUgdW5jYXVnaHQgZXhjZXB0aW9uIGlzIHN1cHByZXNzZWRcclxuICAgICAgICAgICAgICAgICAgICAvLyBsaXN0ZW5pbmcgXCJ1bmNhdWdodEV4Y2VwdGlvblwiIGV2ZW50cyAoYXMgZG9tYWlucyBkb2VzKS5cclxuICAgICAgICAgICAgICAgICAgICAvLyBDb250aW51ZSBpbiBuZXh0IGV2ZW50IHRvIGF2b2lkIHRpY2sgcmVjdXJzaW9uLlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkb21haW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb21haW4uZW50ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IGU7XHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJbiBicm93c2VycywgdW5jYXVnaHQgZXhjZXB0aW9ucyBhcmUgbm90IGZhdGFsLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlLXRocm93IHRoZW0gYXN5bmNocm9ub3VzbHkgdG8gYXZvaWQgc2xvdy1kb3ducy5cclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChkb21haW4pIHtcclxuICAgICAgICAgICAgICAgIGRvbWFpbi5leGl0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZsdXNoaW5nID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgbmV4dFRpY2sgPSBmdW5jdGlvbiAodGFzaykge1xyXG4gICAgICAgIHRhaWwgPSB0YWlsLm5leHQgPSB7XHJcbiAgICAgICAgICAgIHRhc2s6IHRhc2ssXHJcbiAgICAgICAgICAgIGRvbWFpbjogaXNOb2RlSlMgJiYgcHJvY2Vzcy5kb21haW4sXHJcbiAgICAgICAgICAgIG5leHQ6IG51bGxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZiAoIWZsdXNoaW5nKSB7XHJcbiAgICAgICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgcmVxdWVzdFRpY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzLm5leHRUaWNrKSB7XHJcbiAgICAgICAgLy8gTm9kZS5qcyBiZWZvcmUgMC45LiBOb3RlIHRoYXQgc29tZSBmYWtlLU5vZGUgZW52aXJvbm1lbnRzLCBsaWtlIHRoZVxyXG4gICAgICAgIC8vIE1vY2hhIHRlc3QgcnVubmVyLCBpbnRyb2R1Y2UgYSBgcHJvY2Vzc2AgZ2xvYmFsIHdpdGhvdXQgYSBgbmV4dFRpY2tgLlxyXG4gICAgICAgIGlzTm9kZUpTID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSBlbHNlIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAvLyBJbiBJRTEwLCBOb2RlLmpzIDAuOSssIG9yIGh0dHBzOi8vZ2l0aHViLmNvbS9Ob2JsZUpTL3NldEltbWVkaWF0ZVxyXG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3RUaWNrID0gc2V0SW1tZWRpYXRlLmJpbmQod2luZG93LCBmbHVzaCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZmx1c2gpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgIC8vIG1vZGVybiBicm93c2Vyc1xyXG4gICAgICAgIC8vIGh0dHA6Ly93d3cubm9uYmxvY2tpbmcuaW8vMjAxMS8wNi93aW5kb3duZXh0dGljay5odG1sXHJcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcclxuICAgICAgICAvLyBBdCBsZWFzdCBTYWZhcmkgVmVyc2lvbiA2LjAuNSAoODUzNi4zMC4xKSBpbnRlcm1pdHRlbnRseSBjYW5ub3QgY3JlYXRlXHJcbiAgICAgICAgLy8gd29ya2luZyBtZXNzYWdlIHBvcnRzIHRoZSBmaXJzdCB0aW1lIGEgcGFnZSBsb2Fkcy5cclxuICAgICAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSByZXF1ZXN0UG9ydFRpY2s7XHJcbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZmx1c2g7XHJcbiAgICAgICAgICAgIGZsdXNoKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgcmVxdWVzdFBvcnRUaWNrID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAvLyBPcGVyYSByZXF1aXJlcyB1cyB0byBwcm92aWRlIGEgbWVzc2FnZSBwYXlsb2FkLCByZWdhcmRsZXNzIG9mXHJcbiAgICAgICAgICAgIC8vIHdoZXRoZXIgd2UgdXNlIGl0LlxyXG4gICAgICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xyXG4gICAgICAgICAgICByZXF1ZXN0UG9ydFRpY2soKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gb2xkIGJyb3dzZXJzXHJcbiAgICAgICAgcmVxdWVzdFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDApO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5leHRUaWNrO1xyXG59KSgpO1xyXG5cclxuLy8gQXR0ZW1wdCB0byBtYWtlIGdlbmVyaWNzIHNhZmUgaW4gdGhlIGZhY2Ugb2YgZG93bnN0cmVhbVxyXG4vLyBtb2RpZmljYXRpb25zLlxyXG4vLyBUaGVyZSBpcyBubyBzaXR1YXRpb24gd2hlcmUgdGhpcyBpcyBuZWNlc3NhcnkuXHJcbi8vIElmIHlvdSBuZWVkIGEgc2VjdXJpdHkgZ3VhcmFudGVlLCB0aGVzZSBwcmltb3JkaWFscyBuZWVkIHRvIGJlXHJcbi8vIGRlZXBseSBmcm96ZW4gYW55d2F5LCBhbmQgaWYgeW91IGRvbuKAmXQgbmVlZCBhIHNlY3VyaXR5IGd1YXJhbnRlZSxcclxuLy8gdGhpcyBpcyBqdXN0IHBsYWluIHBhcmFub2lkLlxyXG4vLyBIb3dldmVyLCB0aGlzICoqbWlnaHQqKiBoYXZlIHRoZSBuaWNlIHNpZGUtZWZmZWN0IG9mIHJlZHVjaW5nIHRoZSBzaXplIG9mXHJcbi8vIHRoZSBtaW5pZmllZCBjb2RlIGJ5IHJlZHVjaW5nIHguY2FsbCgpIHRvIG1lcmVseSB4KClcclxuLy8gU2VlIE1hcmsgTWlsbGVy4oCZcyBleHBsYW5hdGlvbiBvZiB3aGF0IHRoaXMgZG9lcy5cclxuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9Y29udmVudGlvbnM6c2FmZV9tZXRhX3Byb2dyYW1taW5nXHJcbnZhciBjYWxsID0gRnVuY3Rpb24uY2FsbDtcclxuZnVuY3Rpb24gdW5jdXJyeVRoaXMoZikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gY2FsbC5hcHBseShmLCBhcmd1bWVudHMpO1xyXG4gICAgfTtcclxufVxyXG4vLyBUaGlzIGlzIGVxdWl2YWxlbnQsIGJ1dCBzbG93ZXI6XHJcbi8vIHVuY3VycnlUaGlzID0gRnVuY3Rpb25fYmluZC5iaW5kKEZ1bmN0aW9uX2JpbmQuY2FsbCk7XHJcbi8vIGh0dHA6Ly9qc3BlcmYuY29tL3VuY3Vycnl0aGlzXHJcblxyXG52YXIgYXJyYXlfc2xpY2UgPSB1bmN1cnJ5VGhpcyhBcnJheS5wcm90b3R5cGUuc2xpY2UpO1xyXG5cclxudmFyIGFycmF5X3JlZHVjZSA9IHVuY3VycnlUaGlzKFxyXG4gICAgQXJyYXkucHJvdG90eXBlLnJlZHVjZSB8fCBmdW5jdGlvbiAoY2FsbGJhY2ssIGJhc2lzKSB7XHJcbiAgICAgICAgdmFyIGluZGV4ID0gMCxcclxuICAgICAgICAgICAgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XHJcbiAgICAgICAgLy8gY29uY2VybmluZyB0aGUgaW5pdGlhbCB2YWx1ZSwgaWYgb25lIGlzIG5vdCBwcm92aWRlZFxyXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIC8vIHNlZWsgdG8gdGhlIGZpcnN0IHZhbHVlIGluIHRoZSBhcnJheSwgYWNjb3VudGluZ1xyXG4gICAgICAgICAgICAvLyBmb3IgdGhlIHBvc3NpYmlsaXR5IHRoYXQgaXMgaXMgYSBzcGFyc2UgYXJyYXlcclxuICAgICAgICAgICAgZG8ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4IGluIHRoaXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBiYXNpcyA9IHRoaXNbaW5kZXgrK107XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoKytpbmRleCA+PSBsZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gd2hpbGUgKDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyByZWR1Y2VcclxuICAgICAgICBmb3IgKDsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgLy8gYWNjb3VudCBmb3IgdGhlIHBvc3NpYmlsaXR5IHRoYXQgdGhlIGFycmF5IGlzIHNwYXJzZVxyXG4gICAgICAgICAgICBpZiAoaW5kZXggaW4gdGhpcykge1xyXG4gICAgICAgICAgICAgICAgYmFzaXMgPSBjYWxsYmFjayhiYXNpcywgdGhpc1tpbmRleF0sIGluZGV4KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYmFzaXM7XHJcbiAgICB9XHJcbik7XHJcblxyXG52YXIgYXJyYXlfaW5kZXhPZiA9IHVuY3VycnlUaGlzKFxyXG4gICAgQXJyYXkucHJvdG90eXBlLmluZGV4T2YgfHwgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgLy8gbm90IGEgdmVyeSBnb29kIHNoaW0sIGJ1dCBnb29kIGVub3VnaCBmb3Igb3VyIG9uZSB1c2Ugb2YgaXRcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKHRoaXNbaV0gPT09IHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gLTE7XHJcbiAgICB9XHJcbik7XHJcblxyXG52YXIgYXJyYXlfbWFwID0gdW5jdXJyeVRoaXMoXHJcbiAgICBBcnJheS5wcm90b3R5cGUubWFwIHx8IGZ1bmN0aW9uIChjYWxsYmFjaywgdGhpc3ApIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIGNvbGxlY3QgPSBbXTtcclxuICAgICAgICBhcnJheV9yZWR1Y2Uoc2VsZiwgZnVuY3Rpb24gKHVuZGVmaW5lZCwgdmFsdWUsIGluZGV4KSB7XHJcbiAgICAgICAgICAgIGNvbGxlY3QucHVzaChjYWxsYmFjay5jYWxsKHRoaXNwLCB2YWx1ZSwgaW5kZXgsIHNlbGYpKTtcclxuICAgICAgICB9LCB2b2lkIDApO1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0O1xyXG4gICAgfVxyXG4pO1xyXG5cclxudmFyIG9iamVjdF9jcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uIChwcm90b3R5cGUpIHtcclxuICAgIGZ1bmN0aW9uIFR5cGUoKSB7IH1cclxuICAgIFR5cGUucHJvdG90eXBlID0gcHJvdG90eXBlO1xyXG4gICAgcmV0dXJuIG5ldyBUeXBlKCk7XHJcbn07XHJcblxyXG52YXIgb2JqZWN0X2hhc093blByb3BlcnR5ID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSk7XHJcblxyXG52YXIgb2JqZWN0X2tleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICB2YXIga2V5cyA9IFtdO1xyXG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xyXG4gICAgICAgIGlmIChvYmplY3RfaGFzT3duUHJvcGVydHkob2JqZWN0LCBrZXkpKSB7XHJcbiAgICAgICAgICAgIGtleXMucHVzaChrZXkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBrZXlzO1xyXG59O1xyXG5cclxudmFyIG9iamVjdF90b1N0cmluZyA9IHVuY3VycnlUaGlzKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcpO1xyXG5cclxuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcclxuICAgIHJldHVybiB2YWx1ZSA9PT0gT2JqZWN0KHZhbHVlKTtcclxufVxyXG5cclxuLy8gZ2VuZXJhdG9yIHJlbGF0ZWQgc2hpbXNcclxuXHJcbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBmdW5jdGlvbiBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpbiBTcGlkZXJNb25rZXkuXHJcbmZ1bmN0aW9uIGlzU3RvcEl0ZXJhdGlvbihleGNlcHRpb24pIHtcclxuICAgIHJldHVybiAoXHJcbiAgICAgICAgb2JqZWN0X3RvU3RyaW5nKGV4Y2VwdGlvbikgPT09IFwiW29iamVjdCBTdG9wSXRlcmF0aW9uXVwiIHx8XHJcbiAgICAgICAgZXhjZXB0aW9uIGluc3RhbmNlb2YgUVJldHVyblZhbHVlXHJcbiAgICApO1xyXG59XHJcblxyXG4vLyBGSVhNRTogUmVtb3ZlIHRoaXMgaGVscGVyIGFuZCBRLnJldHVybiBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpblxyXG4vLyBTcGlkZXJNb25rZXkuXHJcbnZhciBRUmV0dXJuVmFsdWU7XHJcbmlmICh0eXBlb2YgUmV0dXJuVmFsdWUgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgIFFSZXR1cm5WYWx1ZSA9IFJldHVyblZhbHVlO1xyXG59IGVsc2Uge1xyXG4gICAgUVJldHVyblZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gICAgfTtcclxufVxyXG5cclxuLy8gbG9uZyBzdGFjayB0cmFjZXNcclxuXHJcbnZhciBTVEFDS19KVU1QX1NFUEFSQVRPUiA9IFwiRnJvbSBwcmV2aW91cyBldmVudDpcIjtcclxuXHJcbmZ1bmN0aW9uIG1ha2VTdGFja1RyYWNlTG9uZyhlcnJvciwgcHJvbWlzZSkge1xyXG4gICAgLy8gSWYgcG9zc2libGUsIHRyYW5zZm9ybSB0aGUgZXJyb3Igc3RhY2sgdHJhY2UgYnkgcmVtb3ZpbmcgTm9kZSBhbmQgUVxyXG4gICAgLy8gY3J1ZnQsIHRoZW4gY29uY2F0ZW5hdGluZyB3aXRoIHRoZSBzdGFjayB0cmFjZSBvZiBgcHJvbWlzZWAuIFNlZSAjNTcuXHJcbiAgICBpZiAoaGFzU3RhY2tzICYmXHJcbiAgICAgICAgcHJvbWlzZS5zdGFjayAmJlxyXG4gICAgICAgIHR5cGVvZiBlcnJvciA9PT0gXCJvYmplY3RcIiAmJlxyXG4gICAgICAgIGVycm9yICE9PSBudWxsICYmXHJcbiAgICAgICAgZXJyb3Iuc3RhY2sgJiZcclxuICAgICAgICBlcnJvci5zdGFjay5pbmRleE9mKFNUQUNLX0pVTVBfU0VQQVJBVE9SKSA9PT0gLTFcclxuICAgICkge1xyXG4gICAgICAgIHZhciBzdGFja3MgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBwID0gcHJvbWlzZTsgISFwOyBwID0gcC5zb3VyY2UpIHtcclxuICAgICAgICAgICAgaWYgKHAuc3RhY2spIHtcclxuICAgICAgICAgICAgICAgIHN0YWNrcy51bnNoaWZ0KHAuc3RhY2spO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN0YWNrcy51bnNoaWZ0KGVycm9yLnN0YWNrKTtcclxuXHJcbiAgICAgICAgdmFyIGNvbmNhdGVkU3RhY2tzID0gc3RhY2tzLmpvaW4oXCJcXG5cIiArIFNUQUNLX0pVTVBfU0VQQVJBVE9SICsgXCJcXG5cIik7XHJcbiAgICAgICAgZXJyb3Iuc3RhY2sgPSBmaWx0ZXJTdGFja1N0cmluZyhjb25jYXRlZFN0YWNrcyk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbHRlclN0YWNrU3RyaW5nKHN0YWNrU3RyaW5nKSB7XHJcbiAgICB2YXIgbGluZXMgPSBzdGFja1N0cmluZy5zcGxpdChcIlxcblwiKTtcclxuICAgIHZhciBkZXNpcmVkTGluZXMgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICB2YXIgbGluZSA9IGxpbmVzW2ldO1xyXG5cclxuICAgICAgICBpZiAoIWlzSW50ZXJuYWxGcmFtZShsaW5lKSAmJiAhaXNOb2RlRnJhbWUobGluZSkgJiYgbGluZSkge1xyXG4gICAgICAgICAgICBkZXNpcmVkTGluZXMucHVzaChsaW5lKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZGVzaXJlZExpbmVzLmpvaW4oXCJcXG5cIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzTm9kZUZyYW1lKHN0YWNrTGluZSkge1xyXG4gICAgcmV0dXJuIHN0YWNrTGluZS5pbmRleE9mKFwiKG1vZHVsZS5qczpcIikgIT09IC0xIHx8XHJcbiAgICAgICAgICAgc3RhY2tMaW5lLmluZGV4T2YoXCIobm9kZS5qczpcIikgIT09IC0xO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRGaWxlTmFtZUFuZExpbmVOdW1iZXIoc3RhY2tMaW5lKSB7XHJcbiAgICAvLyBOYW1lZCBmdW5jdGlvbnM6IFwiYXQgZnVuY3Rpb25OYW1lIChmaWxlbmFtZTpsaW5lTnVtYmVyOmNvbHVtbk51bWJlcilcIlxyXG4gICAgLy8gSW4gSUUxMCBmdW5jdGlvbiBuYW1lIGNhbiBoYXZlIHNwYWNlcyAoXCJBbm9ueW1vdXMgZnVuY3Rpb25cIikgT19vXHJcbiAgICB2YXIgYXR0ZW1wdDEgPSAvYXQgLisgXFwoKC4rKTooXFxkKyk6KD86XFxkKylcXCkkLy5leGVjKHN0YWNrTGluZSk7XHJcbiAgICBpZiAoYXR0ZW1wdDEpIHtcclxuICAgICAgICByZXR1cm4gW2F0dGVtcHQxWzFdLCBOdW1iZXIoYXR0ZW1wdDFbMl0pXTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBbm9ueW1vdXMgZnVuY3Rpb25zOiBcImF0IGZpbGVuYW1lOmxpbmVOdW1iZXI6Y29sdW1uTnVtYmVyXCJcclxuICAgIHZhciBhdHRlbXB0MiA9IC9hdCAoW14gXSspOihcXGQrKTooPzpcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcclxuICAgIGlmIChhdHRlbXB0Mikge1xyXG4gICAgICAgIHJldHVybiBbYXR0ZW1wdDJbMV0sIE51bWJlcihhdHRlbXB0MlsyXSldO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZpcmVmb3ggc3R5bGU6IFwiZnVuY3Rpb25AZmlsZW5hbWU6bGluZU51bWJlciBvciBAZmlsZW5hbWU6bGluZU51bWJlclwiXHJcbiAgICB2YXIgYXR0ZW1wdDMgPSAvLipAKC4rKTooXFxkKykkLy5leGVjKHN0YWNrTGluZSk7XHJcbiAgICBpZiAoYXR0ZW1wdDMpIHtcclxuICAgICAgICByZXR1cm4gW2F0dGVtcHQzWzFdLCBOdW1iZXIoYXR0ZW1wdDNbMl0pXTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNJbnRlcm5hbEZyYW1lKHN0YWNrTGluZSkge1xyXG4gICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpO1xyXG5cclxuICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBmaWxlTmFtZSA9IGZpbGVOYW1lQW5kTGluZU51bWJlclswXTtcclxuICAgIHZhciBsaW5lTnVtYmVyID0gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzFdO1xyXG5cclxuICAgIHJldHVybiBmaWxlTmFtZSA9PT0gcUZpbGVOYW1lICYmXHJcbiAgICAgICAgbGluZU51bWJlciA+PSBxU3RhcnRpbmdMaW5lICYmXHJcbiAgICAgICAgbGluZU51bWJlciA8PSBxRW5kaW5nTGluZTtcclxufVxyXG5cclxuLy8gZGlzY292ZXIgb3duIGZpbGUgbmFtZSBhbmQgbGluZSBudW1iZXIgcmFuZ2UgZm9yIGZpbHRlcmluZyBzdGFja1xyXG4vLyB0cmFjZXNcclxuZnVuY3Rpb24gY2FwdHVyZUxpbmUoKSB7XHJcbiAgICBpZiAoIWhhc1N0YWNrcykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIHZhciBsaW5lcyA9IGUuc3RhY2suc3BsaXQoXCJcXG5cIik7XHJcbiAgICAgICAgdmFyIGZpcnN0TGluZSA9IGxpbmVzWzBdLmluZGV4T2YoXCJAXCIpID4gMCA/IGxpbmVzWzFdIDogbGluZXNbMl07XHJcbiAgICAgICAgdmFyIGZpbGVOYW1lQW5kTGluZU51bWJlciA9IGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihmaXJzdExpbmUpO1xyXG4gICAgICAgIGlmICghZmlsZU5hbWVBbmRMaW5lTnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHFGaWxlTmFtZSA9IGZpbGVOYW1lQW5kTGluZU51bWJlclswXTtcclxuICAgICAgICByZXR1cm4gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzFdO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkZXByZWNhdGUoY2FsbGJhY2ssIG5hbWUsIGFsdGVybmF0aXZlKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gXCJ1bmRlZmluZWRcIiAmJlxyXG4gICAgICAgICAgICB0eXBlb2YgY29uc29sZS53YXJuID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKG5hbWUgKyBcIiBpcyBkZXByZWNhdGVkLCB1c2UgXCIgKyBhbHRlcm5hdGl2ZSArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBcIiBpbnN0ZWFkLlwiLCBuZXcgRXJyb3IoXCJcIikuc3RhY2spO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkoY2FsbGJhY2ssIGFyZ3VtZW50cyk7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vLyBlbmQgb2Ygc2hpbXNcclxuLy8gYmVnaW5uaW5nIG9mIHJlYWwgd29ya1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLCBwYXNzZXMgcHJvbWlzZXMgdGhyb3VnaCwgb3JcclxuICogY29lcmNlcyBwcm9taXNlcyBmcm9tIGRpZmZlcmVudCBzeXN0ZW1zLlxyXG4gKiBAcGFyYW0gdmFsdWUgaW1tZWRpYXRlIHJlZmVyZW5jZSBvciBwcm9taXNlXHJcbiAqL1xyXG5mdW5jdGlvbiBRKHZhbHVlKSB7XHJcbiAgICAvLyBJZiB0aGUgb2JqZWN0IGlzIGFscmVhZHkgYSBQcm9taXNlLCByZXR1cm4gaXQgZGlyZWN0bHkuICBUaGlzIGVuYWJsZXNcclxuICAgIC8vIHRoZSByZXNvbHZlIGZ1bmN0aW9uIHRvIGJvdGggYmUgdXNlZCB0byBjcmVhdGVkIHJlZmVyZW5jZXMgZnJvbSBvYmplY3RzLFxyXG4gICAgLy8gYnV0IHRvIHRvbGVyYWJseSBjb2VyY2Ugbm9uLXByb21pc2VzIHRvIHByb21pc2VzLlxyXG4gICAgaWYgKGlzUHJvbWlzZSh2YWx1ZSkpIHtcclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYXNzaW1pbGF0ZSB0aGVuYWJsZXNcclxuICAgIGlmIChpc1Byb21pc2VBbGlrZSh2YWx1ZSkpIHtcclxuICAgICAgICByZXR1cm4gY29lcmNlKHZhbHVlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bGZpbGwodmFsdWUpO1xyXG4gICAgfVxyXG59XHJcblEucmVzb2x2ZSA9IFE7XHJcblxyXG4vKipcclxuICogUGVyZm9ybXMgYSB0YXNrIGluIGEgZnV0dXJlIHR1cm4gb2YgdGhlIGV2ZW50IGxvb3AuXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHRhc2tcclxuICovXHJcblEubmV4dFRpY2sgPSBuZXh0VGljaztcclxuXHJcbi8qKlxyXG4gKiBDb250cm9scyB3aGV0aGVyIG9yIG5vdCBsb25nIHN0YWNrIHRyYWNlcyB3aWxsIGJlIG9uXHJcbiAqL1xyXG5RLmxvbmdTdGFja1N1cHBvcnQgPSBmYWxzZTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEge3Byb21pc2UsIHJlc29sdmUsIHJlamVjdH0gb2JqZWN0LlxyXG4gKlxyXG4gKiBgcmVzb2x2ZWAgaXMgYSBjYWxsYmFjayB0byBpbnZva2Ugd2l0aCBhIG1vcmUgcmVzb2x2ZWQgdmFsdWUgZm9yIHRoZVxyXG4gKiBwcm9taXNlLiBUbyBmdWxmaWxsIHRoZSBwcm9taXNlLCBpbnZva2UgYHJlc29sdmVgIHdpdGggYW55IHZhbHVlIHRoYXQgaXNcclxuICogbm90IGEgdGhlbmFibGUuIFRvIHJlamVjdCB0aGUgcHJvbWlzZSwgaW52b2tlIGByZXNvbHZlYCB3aXRoIGEgcmVqZWN0ZWRcclxuICogdGhlbmFibGUsIG9yIGludm9rZSBgcmVqZWN0YCB3aXRoIHRoZSByZWFzb24gZGlyZWN0bHkuIFRvIHJlc29sdmUgdGhlXHJcbiAqIHByb21pc2UgdG8gYW5vdGhlciB0aGVuYWJsZSwgdGh1cyBwdXR0aW5nIGl0IGluIHRoZSBzYW1lIHN0YXRlLCBpbnZva2VcclxuICogYHJlc29sdmVgIHdpdGggdGhhdCBvdGhlciB0aGVuYWJsZS5cclxuICovXHJcblEuZGVmZXIgPSBkZWZlcjtcclxuZnVuY3Rpb24gZGVmZXIoKSB7XHJcbiAgICAvLyBpZiBcIm1lc3NhZ2VzXCIgaXMgYW4gXCJBcnJheVwiLCB0aGF0IGluZGljYXRlcyB0aGF0IHRoZSBwcm9taXNlIGhhcyBub3QgeWV0XHJcbiAgICAvLyBiZWVuIHJlc29sdmVkLiAgSWYgaXQgaXMgXCJ1bmRlZmluZWRcIiwgaXQgaGFzIGJlZW4gcmVzb2x2ZWQuICBFYWNoXHJcbiAgICAvLyBlbGVtZW50IG9mIHRoZSBtZXNzYWdlcyBhcnJheSBpcyBpdHNlbGYgYW4gYXJyYXkgb2YgY29tcGxldGUgYXJndW1lbnRzIHRvXHJcbiAgICAvLyBmb3J3YXJkIHRvIHRoZSByZXNvbHZlZCBwcm9taXNlLiAgV2UgY29lcmNlIHRoZSByZXNvbHV0aW9uIHZhbHVlIHRvIGFcclxuICAgIC8vIHByb21pc2UgdXNpbmcgdGhlIGByZXNvbHZlYCBmdW5jdGlvbiBiZWNhdXNlIGl0IGhhbmRsZXMgYm90aCBmdWxseVxyXG4gICAgLy8gbm9uLXRoZW5hYmxlIHZhbHVlcyBhbmQgb3RoZXIgdGhlbmFibGVzIGdyYWNlZnVsbHkuXHJcbiAgICB2YXIgbWVzc2FnZXMgPSBbXSwgcHJvZ3Jlc3NMaXN0ZW5lcnMgPSBbXSwgcmVzb2x2ZWRQcm9taXNlO1xyXG5cclxuICAgIHZhciBkZWZlcnJlZCA9IG9iamVjdF9jcmVhdGUoZGVmZXIucHJvdG90eXBlKTtcclxuICAgIHZhciBwcm9taXNlID0gb2JqZWN0X2NyZWF0ZShQcm9taXNlLnByb3RvdHlwZSk7XHJcblxyXG4gICAgcHJvbWlzZS5wcm9taXNlRGlzcGF0Y2ggPSBmdW5jdGlvbiAocmVzb2x2ZSwgb3AsIG9wZXJhbmRzKSB7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMpO1xyXG4gICAgICAgIGlmIChtZXNzYWdlcykge1xyXG4gICAgICAgICAgICBtZXNzYWdlcy5wdXNoKGFyZ3MpO1xyXG4gICAgICAgICAgICBpZiAob3AgPT09IFwid2hlblwiICYmIG9wZXJhbmRzWzFdKSB7IC8vIHByb2dyZXNzIG9wZXJhbmRcclxuICAgICAgICAgICAgICAgIHByb2dyZXNzTGlzdGVuZXJzLnB1c2gob3BlcmFuZHNbMV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZWRQcm9taXNlLnByb21pc2VEaXNwYXRjaC5hcHBseShyZXNvbHZlZFByb21pc2UsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFhYWCBkZXByZWNhdGVkXHJcbiAgICBwcm9taXNlLnZhbHVlT2YgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbmVhcmVyVmFsdWUgPSBuZWFyZXIocmVzb2x2ZWRQcm9taXNlKTtcclxuICAgICAgICBpZiAoaXNQcm9taXNlKG5lYXJlclZhbHVlKSkge1xyXG4gICAgICAgICAgICByZXNvbHZlZFByb21pc2UgPSBuZWFyZXJWYWx1ZTsgLy8gc2hvcnRlbiBjaGFpblxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmVhcmVyVmFsdWU7XHJcbiAgICB9O1xyXG5cclxuICAgIHByb21pc2UuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoIXJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdGF0ZTogXCJwZW5kaW5nXCIgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc29sdmVkUHJvbWlzZS5pbnNwZWN0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChRLmxvbmdTdGFja1N1cHBvcnQgJiYgaGFzU3RhY2tzKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAvLyBOT1RFOiBkb24ndCB0cnkgdG8gdXNlIGBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZWAgb3IgdHJhbnNmZXIgdGhlXHJcbiAgICAgICAgICAgIC8vIGFjY2Vzc29yIGFyb3VuZDsgdGhhdCBjYXVzZXMgbWVtb3J5IGxlYWtzIGFzIHBlciBHSC0xMTEuIEp1c3RcclxuICAgICAgICAgICAgLy8gcmVpZnkgdGhlIHN0YWNrIHRyYWNlIGFzIGEgc3RyaW5nIEFTQVAuXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vIEF0IHRoZSBzYW1lIHRpbWUsIGN1dCBvZmYgdGhlIGZpcnN0IGxpbmU7IGl0J3MgYWx3YXlzIGp1c3RcclxuICAgICAgICAgICAgLy8gXCJbb2JqZWN0IFByb21pc2VdXFxuXCIsIGFzIHBlciB0aGUgYHRvU3RyaW5nYC5cclxuICAgICAgICAgICAgcHJvbWlzZS5zdGFjayA9IGUuc3RhY2suc3Vic3RyaW5nKGUuc3RhY2suaW5kZXhPZihcIlxcblwiKSArIDEpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBOT1RFOiB3ZSBkbyB0aGUgY2hlY2tzIGZvciBgcmVzb2x2ZWRQcm9taXNlYCBpbiBlYWNoIG1ldGhvZCwgaW5zdGVhZCBvZlxyXG4gICAgLy8gY29uc29saWRhdGluZyB0aGVtIGludG8gYGJlY29tZWAsIHNpbmNlIG90aGVyd2lzZSB3ZSdkIGNyZWF0ZSBuZXdcclxuICAgIC8vIHByb21pc2VzIHdpdGggdGhlIGxpbmVzIGBiZWNvbWUod2hhdGV2ZXIodmFsdWUpKWAuIFNlZSBlLmcuIEdILTI1Mi5cclxuXHJcbiAgICBmdW5jdGlvbiBiZWNvbWUobmV3UHJvbWlzZSkge1xyXG4gICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5ld1Byb21pc2U7XHJcbiAgICAgICAgcHJvbWlzZS5zb3VyY2UgPSBuZXdQcm9taXNlO1xyXG5cclxuICAgICAgICBhcnJheV9yZWR1Y2UobWVzc2FnZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIG1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgbmV3UHJvbWlzZS5wcm9taXNlRGlzcGF0Y2guYXBwbHkobmV3UHJvbWlzZSwgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sIHZvaWQgMCk7XHJcblxyXG4gICAgICAgIG1lc3NhZ2VzID0gdm9pZCAwO1xyXG4gICAgICAgIHByb2dyZXNzTGlzdGVuZXJzID0gdm9pZCAwO1xyXG4gICAgfVxyXG5cclxuICAgIGRlZmVycmVkLnByb21pc2UgPSBwcm9taXNlO1xyXG4gICAgZGVmZXJyZWQucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVjb21lKFEodmFsdWUpKTtcclxuICAgIH07XHJcblxyXG4gICAgZGVmZXJyZWQuZnVsZmlsbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVjb21lKGZ1bGZpbGwodmFsdWUpKTtcclxuICAgIH07XHJcbiAgICBkZWZlcnJlZC5yZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XHJcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWNvbWUocmVqZWN0KHJlYXNvbikpO1xyXG4gICAgfTtcclxuICAgIGRlZmVycmVkLm5vdGlmeSA9IGZ1bmN0aW9uIChwcm9ncmVzcykge1xyXG4gICAgICAgIGlmIChyZXNvbHZlZFByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXJyYXlfcmVkdWNlKHByb2dyZXNzTGlzdGVuZXJzLCBmdW5jdGlvbiAodW5kZWZpbmVkLCBwcm9ncmVzc0xpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHByb2dyZXNzTGlzdGVuZXIocHJvZ3Jlc3MpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LCB2b2lkIDApO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gZGVmZXJyZWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgTm9kZS1zdHlsZSBjYWxsYmFjayB0aGF0IHdpbGwgcmVzb2x2ZSBvciByZWplY3QgdGhlIGRlZmVycmVkXHJcbiAqIHByb21pc2UuXHJcbiAqIEByZXR1cm5zIGEgbm9kZWJhY2tcclxuICovXHJcbmRlZmVyLnByb3RvdHlwZS5tYWtlTm9kZVJlc29sdmVyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChlcnJvciwgdmFsdWUpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgc2VsZi5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDIpIHtcclxuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNlbGYucmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcGFyYW0gcmVzb2x2ZXIge0Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBub3RoaW5nIGFuZCBhY2NlcHRzXHJcbiAqIHRoZSByZXNvbHZlLCByZWplY3QsIGFuZCBub3RpZnkgZnVuY3Rpb25zIGZvciBhIGRlZmVycmVkLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgdGhhdCBtYXkgYmUgcmVzb2x2ZWQgd2l0aCB0aGUgZ2l2ZW4gcmVzb2x2ZSBhbmQgcmVqZWN0XHJcbiAqIGZ1bmN0aW9ucywgb3IgcmVqZWN0ZWQgYnkgYSB0aHJvd24gZXhjZXB0aW9uIGluIHJlc29sdmVyXHJcbiAqL1xyXG5RLlByb21pc2UgPSBwcm9taXNlOyAvLyBFUzZcclxuUS5wcm9taXNlID0gcHJvbWlzZTtcclxuZnVuY3Rpb24gcHJvbWlzZShyZXNvbHZlcikge1xyXG4gICAgaWYgKHR5cGVvZiByZXNvbHZlciAhPT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInJlc29sdmVyIG11c3QgYmUgYSBmdW5jdGlvbi5cIik7XHJcbiAgICB9XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXNvbHZlcihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QsIGRlZmVycmVkLm5vdGlmeSk7XHJcbiAgICB9IGNhdGNoIChyZWFzb24pIHtcclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVhc29uKTtcclxuICAgIH1cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59XHJcblxyXG5wcm9taXNlLnJhY2UgPSByYWNlOyAvLyBFUzZcclxucHJvbWlzZS5hbGwgPSBhbGw7IC8vIEVTNlxyXG5wcm9taXNlLnJlamVjdCA9IHJlamVjdDsgLy8gRVM2XHJcbnByb21pc2UucmVzb2x2ZSA9IFE7IC8vIEVTNlxyXG5cclxuLy8gWFhYIGV4cGVyaW1lbnRhbC4gIFRoaXMgbWV0aG9kIGlzIGEgd2F5IHRvIGRlbm90ZSB0aGF0IGEgbG9jYWwgdmFsdWUgaXNcclxuLy8gc2VyaWFsaXphYmxlIGFuZCBzaG91bGQgYmUgaW1tZWRpYXRlbHkgZGlzcGF0Y2hlZCB0byBhIHJlbW90ZSB1cG9uIHJlcXVlc3QsXHJcbi8vIGluc3RlYWQgb2YgcGFzc2luZyBhIHJlZmVyZW5jZS5cclxuUS5wYXNzQnlDb3B5ID0gZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgLy9mcmVlemUob2JqZWN0KTtcclxuICAgIC8vcGFzc0J5Q29waWVzLnNldChvYmplY3QsIHRydWUpO1xyXG4gICAgcmV0dXJuIG9iamVjdDtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnBhc3NCeUNvcHkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAvL2ZyZWV6ZShvYmplY3QpO1xyXG4gICAgLy9wYXNzQnlDb3BpZXMuc2V0KG9iamVjdCwgdHJ1ZSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJZiB0d28gcHJvbWlzZXMgZXZlbnR1YWxseSBmdWxmaWxsIHRvIHRoZSBzYW1lIHZhbHVlLCBwcm9taXNlcyB0aGF0IHZhbHVlLFxyXG4gKiBidXQgb3RoZXJ3aXNlIHJlamVjdHMuXHJcbiAqIEBwYXJhbSB4IHtBbnkqfVxyXG4gKiBAcGFyYW0geSB7QW55Kn1cclxuICogQHJldHVybnMge0FueSp9IGEgcHJvbWlzZSBmb3IgeCBhbmQgeSBpZiB0aGV5IGFyZSB0aGUgc2FtZSwgYnV0IGEgcmVqZWN0aW9uXHJcbiAqIG90aGVyd2lzZS5cclxuICpcclxuICovXHJcblEuam9pbiA9IGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICByZXR1cm4gUSh4KS5qb2luKHkpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuam9pbiA9IGZ1bmN0aW9uICh0aGF0KSB7XHJcbiAgICByZXR1cm4gUShbdGhpcywgdGhhdF0pLnNwcmVhZChmdW5jdGlvbiAoeCwgeSkge1xyXG4gICAgICAgIGlmICh4ID09PSB5KSB7XHJcbiAgICAgICAgICAgIC8vIFRPRE86IFwiPT09XCIgc2hvdWxkIGJlIE9iamVjdC5pcyBvciBlcXVpdlxyXG4gICAgICAgICAgICByZXR1cm4geDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBqb2luOiBub3QgdGhlIHNhbWU6IFwiICsgeCArIFwiIFwiICsgeSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSBmaXJzdCBvZiBhbiBhcnJheSBvZiBwcm9taXNlcyB0byBiZWNvbWUgZnVsZmlsbGVkLlxyXG4gKiBAcGFyYW0gYW5zd2VycyB7QXJyYXlbQW55Kl19IHByb21pc2VzIHRvIHJhY2VcclxuICogQHJldHVybnMge0FueSp9IHRoZSBmaXJzdCBwcm9taXNlIHRvIGJlIGZ1bGZpbGxlZFxyXG4gKi9cclxuUS5yYWNlID0gcmFjZTtcclxuZnVuY3Rpb24gcmFjZShhbnN3ZXJQcykge1xyXG4gICAgcmV0dXJuIHByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgLy8gU3dpdGNoIHRvIHRoaXMgb25jZSB3ZSBjYW4gYXNzdW1lIGF0IGxlYXN0IEVTNVxyXG4gICAgICAgIC8vIGFuc3dlclBzLmZvckVhY2goZnVuY3Rpb24oYW5zd2VyUCkge1xyXG4gICAgICAgIC8vICAgICBRKGFuc3dlclApLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcclxuICAgICAgICAvLyB9KTtcclxuICAgICAgICAvLyBVc2UgdGhpcyBpbiB0aGUgbWVhbnRpbWVcclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYW5zd2VyUHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgUShhbnN3ZXJQc1tpXSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5yYWNlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihRLnJhY2UpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBQcm9taXNlIHdpdGggYSBwcm9taXNlIGRlc2NyaXB0b3Igb2JqZWN0IGFuZCBvcHRpb25hbCBmYWxsYmFja1xyXG4gKiBmdW5jdGlvbi4gIFRoZSBkZXNjcmlwdG9yIGNvbnRhaW5zIG1ldGhvZHMgbGlrZSB3aGVuKHJlamVjdGVkKSwgZ2V0KG5hbWUpLFxyXG4gKiBzZXQobmFtZSwgdmFsdWUpLCBwb3N0KG5hbWUsIGFyZ3MpLCBhbmQgZGVsZXRlKG5hbWUpLCB3aGljaCBhbGxcclxuICogcmV0dXJuIGVpdGhlciBhIHZhbHVlLCBhIHByb21pc2UgZm9yIGEgdmFsdWUsIG9yIGEgcmVqZWN0aW9uLiAgVGhlIGZhbGxiYWNrXHJcbiAqIGFjY2VwdHMgdGhlIG9wZXJhdGlvbiBuYW1lLCBhIHJlc29sdmVyLCBhbmQgYW55IGZ1cnRoZXIgYXJndW1lbnRzIHRoYXQgd291bGRcclxuICogaGF2ZSBiZWVuIGZvcndhcmRlZCB0byB0aGUgYXBwcm9wcmlhdGUgbWV0aG9kIGFib3ZlIGhhZCBhIG1ldGhvZCBiZWVuXHJcbiAqIHByb3ZpZGVkIHdpdGggdGhlIHByb3BlciBuYW1lLiAgVGhlIEFQSSBtYWtlcyBubyBndWFyYW50ZWVzIGFib3V0IHRoZSBuYXR1cmVcclxuICogb2YgdGhlIHJldHVybmVkIG9iamVjdCwgYXBhcnQgZnJvbSB0aGF0IGl0IGlzIHVzYWJsZSB3aGVyZWV2ZXIgcHJvbWlzZXMgYXJlXHJcbiAqIGJvdWdodCBhbmQgc29sZC5cclxuICovXHJcblEubWFrZVByb21pc2UgPSBQcm9taXNlO1xyXG5mdW5jdGlvbiBQcm9taXNlKGRlc2NyaXB0b3IsIGZhbGxiYWNrLCBpbnNwZWN0KSB7XHJcbiAgICBpZiAoZmFsbGJhY2sgPT09IHZvaWQgMCkge1xyXG4gICAgICAgIGZhbGxiYWNrID0gZnVuY3Rpb24gKG9wKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgICAgXCJQcm9taXNlIGRvZXMgbm90IHN1cHBvcnQgb3BlcmF0aW9uOiBcIiArIG9wXHJcbiAgICAgICAgICAgICkpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICBpZiAoaW5zcGVjdCA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtzdGF0ZTogXCJ1bmtub3duXCJ9O1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHByb21pc2UgPSBvYmplY3RfY3JlYXRlKFByb21pc2UucHJvdG90eXBlKTtcclxuXHJcbiAgICBwcm9taXNlLnByb21pc2VEaXNwYXRjaCA9IGZ1bmN0aW9uIChyZXNvbHZlLCBvcCwgYXJncykge1xyXG4gICAgICAgIHZhciByZXN1bHQ7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGRlc2NyaXB0b3Jbb3BdKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBkZXNjcmlwdG9yW29wXS5hcHBseShwcm9taXNlLCBhcmdzKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbGxiYWNrLmNhbGwocHJvbWlzZSwgb3AsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocmVzb2x2ZSkge1xyXG4gICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBwcm9taXNlLmluc3BlY3QgPSBpbnNwZWN0O1xyXG5cclxuICAgIC8vIFhYWCBkZXByZWNhdGVkIGB2YWx1ZU9mYCBhbmQgYGV4Y2VwdGlvbmAgc3VwcG9ydFxyXG4gICAgaWYgKGluc3BlY3QpIHtcclxuICAgICAgICB2YXIgaW5zcGVjdGVkID0gaW5zcGVjdCgpO1xyXG4gICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwicmVqZWN0ZWRcIikge1xyXG4gICAgICAgICAgICBwcm9taXNlLmV4Y2VwdGlvbiA9IGluc3BlY3RlZC5yZWFzb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm9taXNlLnZhbHVlT2YgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBpbnNwZWN0ZWQgPSBpbnNwZWN0KCk7XHJcbiAgICAgICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwicGVuZGluZ1wiIHx8XHJcbiAgICAgICAgICAgICAgICBpbnNwZWN0ZWQuc3RhdGUgPT09IFwicmVqZWN0ZWRcIikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGluc3BlY3RlZC52YWx1ZTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwcm9taXNlO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBcIltvYmplY3QgUHJvbWlzZV1cIjtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnRoZW4gPSBmdW5jdGlvbiAoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3NlZCkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIHZhciBkb25lID0gZmFsc2U7ICAgLy8gZW5zdXJlIHRoZSB1bnRydXN0ZWQgcHJvbWlzZSBtYWtlcyBhdCBtb3N0IGFcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2luZ2xlIGNhbGwgdG8gb25lIG9mIHRoZSBjYWxsYmFja3NcclxuXHJcbiAgICBmdW5jdGlvbiBfZnVsZmlsbGVkKHZhbHVlKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBmdWxmaWxsZWQgPT09IFwiZnVuY3Rpb25cIiA/IGZ1bGZpbGxlZCh2YWx1ZSkgOiB2YWx1ZTtcclxuICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBfcmVqZWN0ZWQoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiByZWplY3RlZCA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgIG1ha2VTdGFja1RyYWNlTG9uZyhleGNlcHRpb24sIHNlbGYpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdGVkKGV4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKG5ld0V4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXdFeGNlcHRpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBfcHJvZ3Jlc3NlZCh2YWx1ZSkge1xyXG4gICAgICAgIHJldHVybiB0eXBlb2YgcHJvZ3Jlc3NlZCA9PT0gXCJmdW5jdGlvblwiID8gcHJvZ3Jlc3NlZCh2YWx1ZSkgOiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgc2VsZi5wcm9taXNlRGlzcGF0Y2goZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChkb25lKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZG9uZSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKF9mdWxmaWxsZWQodmFsdWUpKTtcclxuICAgICAgICB9LCBcIndoZW5cIiwgW2Z1bmN0aW9uIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgaWYgKGRvbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoX3JlamVjdGVkKGV4Y2VwdGlvbikpO1xyXG4gICAgICAgIH1dKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFByb2dyZXNzIHByb3BhZ2F0b3IgbmVlZCB0byBiZSBhdHRhY2hlZCBpbiB0aGUgY3VycmVudCB0aWNrLlxyXG4gICAgc2VsZi5wcm9taXNlRGlzcGF0Y2godm9pZCAwLCBcIndoZW5cIiwgW3ZvaWQgMCwgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgdmFyIG5ld1ZhbHVlO1xyXG4gICAgICAgIHZhciB0aHJldyA9IGZhbHNlO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIG5ld1ZhbHVlID0gX3Byb2dyZXNzZWQodmFsdWUpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgdGhyZXcgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiAoUS5vbmVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXRocmV3KSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLm5vdGlmeShuZXdWYWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfV0pO1xyXG5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlZ2lzdGVycyBhbiBvYnNlcnZlciBvbiBhIHByb21pc2UuXHJcbiAqXHJcbiAqIEd1YXJhbnRlZXM6XHJcbiAqXHJcbiAqIDEuIHRoYXQgZnVsZmlsbGVkIGFuZCByZWplY3RlZCB3aWxsIGJlIGNhbGxlZCBvbmx5IG9uY2UuXHJcbiAqIDIuIHRoYXQgZWl0aGVyIHRoZSBmdWxmaWxsZWQgY2FsbGJhY2sgb3IgdGhlIHJlamVjdGVkIGNhbGxiYWNrIHdpbGwgYmVcclxuICogICAgY2FsbGVkLCBidXQgbm90IGJvdGguXHJcbiAqIDMuIHRoYXQgZnVsZmlsbGVkIGFuZCByZWplY3RlZCB3aWxsIG5vdCBiZSBjYWxsZWQgaW4gdGhpcyB0dXJuLlxyXG4gKlxyXG4gKiBAcGFyYW0gdmFsdWUgICAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgdG8gb2JzZXJ2ZVxyXG4gKiBAcGFyYW0gZnVsZmlsbGVkICBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2l0aCB0aGUgZnVsZmlsbGVkIHZhbHVlXHJcbiAqIEBwYXJhbSByZWplY3RlZCAgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSByZWplY3Rpb24gZXhjZXB0aW9uXHJcbiAqIEBwYXJhbSBwcm9ncmVzc2VkIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBhbnkgcHJvZ3Jlc3Mgbm90aWZpY2F0aW9uc1xyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgZnJvbSB0aGUgaW52b2tlZCBjYWxsYmFja1xyXG4gKi9cclxuUS53aGVuID0gd2hlbjtcclxuZnVuY3Rpb24gd2hlbih2YWx1ZSwgZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3NlZCkge1xyXG4gICAgcmV0dXJuIFEodmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3NlZCk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnRoZW5SZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHZhbHVlOyB9KTtcclxufTtcclxuXHJcblEudGhlblJlc29sdmUgPSBmdW5jdGlvbiAocHJvbWlzZSwgdmFsdWUpIHtcclxuICAgIHJldHVybiBRKHByb21pc2UpLnRoZW5SZXNvbHZlKHZhbHVlKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnRoZW5SZWplY3QgPSBmdW5jdGlvbiAocmVhc29uKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICgpIHsgdGhyb3cgcmVhc29uOyB9KTtcclxufTtcclxuXHJcblEudGhlblJlamVjdCA9IGZ1bmN0aW9uIChwcm9taXNlLCByZWFzb24pIHtcclxuICAgIHJldHVybiBRKHByb21pc2UpLnRoZW5SZWplY3QocmVhc29uKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJZiBhbiBvYmplY3QgaXMgbm90IGEgcHJvbWlzZSwgaXQgaXMgYXMgXCJuZWFyXCIgYXMgcG9zc2libGUuXHJcbiAqIElmIGEgcHJvbWlzZSBpcyByZWplY3RlZCwgaXQgaXMgYXMgXCJuZWFyXCIgYXMgcG9zc2libGUgdG9vLlxyXG4gKiBJZiBpdOKAmXMgYSBmdWxmaWxsZWQgcHJvbWlzZSwgdGhlIGZ1bGZpbGxtZW50IHZhbHVlIGlzIG5lYXJlci5cclxuICogSWYgaXTigJlzIGEgZGVmZXJyZWQgcHJvbWlzZSBhbmQgdGhlIGRlZmVycmVkIGhhcyBiZWVuIHJlc29sdmVkLCB0aGVcclxuICogcmVzb2x1dGlvbiBpcyBcIm5lYXJlclwiLlxyXG4gKiBAcGFyYW0gb2JqZWN0XHJcbiAqIEByZXR1cm5zIG1vc3QgcmVzb2x2ZWQgKG5lYXJlc3QpIGZvcm0gb2YgdGhlIG9iamVjdFxyXG4gKi9cclxuXHJcbi8vIFhYWCBzaG91bGQgd2UgcmUtZG8gdGhpcz9cclxuUS5uZWFyZXIgPSBuZWFyZXI7XHJcbmZ1bmN0aW9uIG5lYXJlcih2YWx1ZSkge1xyXG4gICAgaWYgKGlzUHJvbWlzZSh2YWx1ZSkpIHtcclxuICAgICAgICB2YXIgaW5zcGVjdGVkID0gdmFsdWUuaW5zcGVjdCgpO1xyXG4gICAgICAgIGlmIChpbnNwZWN0ZWQuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGluc3BlY3RlZC52YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSBwcm9taXNlLlxyXG4gKiBPdGhlcndpc2UgaXQgaXMgYSBmdWxmaWxsZWQgdmFsdWUuXHJcbiAqL1xyXG5RLmlzUHJvbWlzZSA9IGlzUHJvbWlzZTtcclxuZnVuY3Rpb24gaXNQcm9taXNlKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIGlzT2JqZWN0KG9iamVjdCkgJiZcclxuICAgICAgICB0eXBlb2Ygb2JqZWN0LnByb21pc2VEaXNwYXRjaCA9PT0gXCJmdW5jdGlvblwiICYmXHJcbiAgICAgICAgdHlwZW9mIG9iamVjdC5pbnNwZWN0ID09PSBcImZ1bmN0aW9uXCI7XHJcbn1cclxuXHJcblEuaXNQcm9taXNlQWxpa2UgPSBpc1Byb21pc2VBbGlrZTtcclxuZnVuY3Rpb24gaXNQcm9taXNlQWxpa2Uob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gaXNPYmplY3Qob2JqZWN0KSAmJiB0eXBlb2Ygb2JqZWN0LnRoZW4gPT09IFwiZnVuY3Rpb25cIjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHBlbmRpbmcgcHJvbWlzZSwgbWVhbmluZyBub3RcclxuICogZnVsZmlsbGVkIG9yIHJlamVjdGVkLlxyXG4gKi9cclxuUS5pc1BlbmRpbmcgPSBpc1BlbmRpbmc7XHJcbmZ1bmN0aW9uIGlzUGVuZGluZyhvYmplY3QpIHtcclxuICAgIHJldHVybiBpc1Byb21pc2Uob2JqZWN0KSAmJiBvYmplY3QuaW5zcGVjdCgpLnN0YXRlID09PSBcInBlbmRpbmdcIjtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuaXNQZW5kaW5nID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcInBlbmRpbmdcIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB3aGV0aGVyIHRoZSBnaXZlbiBvYmplY3QgaXMgYSB2YWx1ZSBvciBmdWxmaWxsZWRcclxuICogcHJvbWlzZS5cclxuICovXHJcblEuaXNGdWxmaWxsZWQgPSBpc0Z1bGZpbGxlZDtcclxuZnVuY3Rpb24gaXNGdWxmaWxsZWQob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gIWlzUHJvbWlzZShvYmplY3QpIHx8IG9iamVjdC5pbnNwZWN0KCkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCI7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmlzRnVsZmlsbGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcImZ1bGZpbGxlZFwiO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHJlamVjdGVkIHByb21pc2UuXHJcbiAqL1xyXG5RLmlzUmVqZWN0ZWQgPSBpc1JlamVjdGVkO1xyXG5mdW5jdGlvbiBpc1JlamVjdGVkKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIGlzUHJvbWlzZShvYmplY3QpICYmIG9iamVjdC5pbnNwZWN0KCkuc3RhdGUgPT09IFwicmVqZWN0ZWRcIjtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuaXNSZWplY3RlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiO1xyXG59O1xyXG5cclxuLy8vLyBCRUdJTiBVTkhBTkRMRUQgUkVKRUNUSU9OIFRSQUNLSU5HXHJcblxyXG4vLyBUaGlzIHByb21pc2UgbGlicmFyeSBjb25zdW1lcyBleGNlcHRpb25zIHRocm93biBpbiBoYW5kbGVycyBzbyB0aGV5IGNhbiBiZVxyXG4vLyBoYW5kbGVkIGJ5IGEgc3Vic2VxdWVudCBwcm9taXNlLiAgVGhlIGV4Y2VwdGlvbnMgZ2V0IGFkZGVkIHRvIHRoaXMgYXJyYXkgd2hlblxyXG4vLyB0aGV5IGFyZSBjcmVhdGVkLCBhbmQgcmVtb3ZlZCB3aGVuIHRoZXkgYXJlIGhhbmRsZWQuICBOb3RlIHRoYXQgaW4gRVM2IG9yXHJcbi8vIHNoaW1tZWQgZW52aXJvbm1lbnRzLCB0aGlzIHdvdWxkIG5hdHVyYWxseSBiZSBhIGBTZXRgLlxyXG52YXIgdW5oYW5kbGVkUmVhc29ucyA9IFtdO1xyXG52YXIgdW5oYW5kbGVkUmVqZWN0aW9ucyA9IFtdO1xyXG52YXIgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gdHJ1ZTtcclxuXHJcbmZ1bmN0aW9uIHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpIHtcclxuICAgIHVuaGFuZGxlZFJlYXNvbnMubGVuZ3RoID0gMDtcclxuICAgIHVuaGFuZGxlZFJlamVjdGlvbnMubGVuZ3RoID0gMDtcclxuXHJcbiAgICBpZiAoIXRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucykge1xyXG4gICAgICAgIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IHRydWU7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYWNrUmVqZWN0aW9uKHByb21pc2UsIHJlYXNvbikge1xyXG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5wdXNoKHByb21pc2UpO1xyXG4gICAgaWYgKHJlYXNvbiAmJiB0eXBlb2YgcmVhc29uLnN0YWNrICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgdW5oYW5kbGVkUmVhc29ucy5wdXNoKHJlYXNvbi5zdGFjayk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMucHVzaChcIihubyBzdGFjaykgXCIgKyByZWFzb24pO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1bnRyYWNrUmVqZWN0aW9uKHByb21pc2UpIHtcclxuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBhdCA9IGFycmF5X2luZGV4T2YodW5oYW5kbGVkUmVqZWN0aW9ucywgcHJvbWlzZSk7XHJcbiAgICBpZiAoYXQgIT09IC0xKSB7XHJcbiAgICAgICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5zcGxpY2UoYXQsIDEpO1xyXG4gICAgICAgIHVuaGFuZGxlZFJlYXNvbnMuc3BsaWNlKGF0LCAxKTtcclxuICAgIH1cclxufVxyXG5cclxuUS5yZXNldFVuaGFuZGxlZFJlamVjdGlvbnMgPSByZXNldFVuaGFuZGxlZFJlamVjdGlvbnM7XHJcblxyXG5RLmdldFVuaGFuZGxlZFJlYXNvbnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBNYWtlIGEgY29weSBzbyB0aGF0IGNvbnN1bWVycyBjYW4ndCBpbnRlcmZlcmUgd2l0aCBvdXIgaW50ZXJuYWwgc3RhdGUuXHJcbiAgICByZXR1cm4gdW5oYW5kbGVkUmVhc29ucy5zbGljZSgpO1xyXG59O1xyXG5cclxuUS5zdG9wVW5oYW5kbGVkUmVqZWN0aW9uVHJhY2tpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKTtcclxuICAgIHRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucyA9IGZhbHNlO1xyXG59O1xyXG5cclxucmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCk7XHJcblxyXG4vLy8vIEVORCBVTkhBTkRMRUQgUkVKRUNUSU9OIFRSQUNLSU5HXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIHJlamVjdGVkIHByb21pc2UuXHJcbiAqIEBwYXJhbSByZWFzb24gdmFsdWUgZGVzY3JpYmluZyB0aGUgZmFpbHVyZVxyXG4gKi9cclxuUS5yZWplY3QgPSByZWplY3Q7XHJcbmZ1bmN0aW9uIHJlamVjdChyZWFzb24pIHtcclxuICAgIHZhciByZWplY3Rpb24gPSBQcm9taXNlKHtcclxuICAgICAgICBcIndoZW5cIjogZnVuY3Rpb24gKHJlamVjdGVkKSB7XHJcbiAgICAgICAgICAgIC8vIG5vdGUgdGhhdCB0aGUgZXJyb3IgaGFzIGJlZW4gaGFuZGxlZFxyXG4gICAgICAgICAgICBpZiAocmVqZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIHVudHJhY2tSZWplY3Rpb24odGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQocmVhc29uKSA6IHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgfSwgZnVuY3Rpb24gZmFsbGJhY2soKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LCBmdW5jdGlvbiBpbnNwZWN0KCkge1xyXG4gICAgICAgIHJldHVybiB7IHN0YXRlOiBcInJlamVjdGVkXCIsIHJlYXNvbjogcmVhc29uIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RlIHRoYXQgdGhlIHJlYXNvbiBoYXMgbm90IGJlZW4gaGFuZGxlZC5cclxuICAgIHRyYWNrUmVqZWN0aW9uKHJlamVjdGlvbiwgcmVhc29uKTtcclxuXHJcbiAgICByZXR1cm4gcmVqZWN0aW9uO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIGZ1bGZpbGxlZCBwcm9taXNlIGZvciBhbiBpbW1lZGlhdGUgcmVmZXJlbmNlLlxyXG4gKiBAcGFyYW0gdmFsdWUgaW1tZWRpYXRlIHJlZmVyZW5jZVxyXG4gKi9cclxuUS5mdWxmaWxsID0gZnVsZmlsbDtcclxuZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIFByb21pc2Uoe1xyXG4gICAgICAgIFwid2hlblwiOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiZ2V0XCI6IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZVtuYW1lXTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwic2V0XCI6IGZ1bmN0aW9uIChuYW1lLCByaHMpIHtcclxuICAgICAgICAgICAgdmFsdWVbbmFtZV0gPSByaHM7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgICAgICAgICBkZWxldGUgdmFsdWVbbmFtZV07XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcInBvc3RcIjogZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcclxuICAgICAgICAgICAgLy8gTWFyayBNaWxsZXIgcHJvcG9zZXMgdGhhdCBwb3N0IHdpdGggbm8gbmFtZSBzaG91bGQgYXBwbHkgYVxyXG4gICAgICAgICAgICAvLyBwcm9taXNlZCBmdW5jdGlvbi5cclxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IG51bGwgfHwgbmFtZSA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUuYXBwbHkodm9pZCAwLCBhcmdzKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVtuYW1lXS5hcHBseSh2YWx1ZSwgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiYXBwbHlcIjogZnVuY3Rpb24gKHRoaXNwLCBhcmdzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZS5hcHBseSh0aGlzcCwgYXJncyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBcImtleXNcIjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0X2tleXModmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgIH0sIHZvaWQgMCwgZnVuY3Rpb24gaW5zcGVjdCgpIHtcclxuICAgICAgICByZXR1cm4geyBzdGF0ZTogXCJmdWxmaWxsZWRcIiwgdmFsdWU6IHZhbHVlIH07XHJcbiAgICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoZW5hYmxlcyB0byBRIHByb21pc2VzLlxyXG4gKiBAcGFyYW0gcHJvbWlzZSB0aGVuYWJsZSBwcm9taXNlXHJcbiAqIEByZXR1cm5zIGEgUSBwcm9taXNlXHJcbiAqL1xyXG5mdW5jdGlvbiBjb2VyY2UocHJvbWlzZSkge1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBwcm9taXNlLnRoZW4oZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0LCBkZWZlcnJlZC5ub3RpZnkpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59XHJcblxyXG4vKipcclxuICogQW5ub3RhdGVzIGFuIG9iamVjdCBzdWNoIHRoYXQgaXQgd2lsbCBuZXZlciBiZVxyXG4gKiB0cmFuc2ZlcnJlZCBhd2F5IGZyb20gdGhpcyBwcm9jZXNzIG92ZXIgYW55IHByb21pc2VcclxuICogY29tbXVuaWNhdGlvbiBjaGFubmVsLlxyXG4gKiBAcGFyYW0gb2JqZWN0XHJcbiAqIEByZXR1cm5zIHByb21pc2UgYSB3cmFwcGluZyBvZiB0aGF0IG9iamVjdCB0aGF0XHJcbiAqIGFkZGl0aW9uYWxseSByZXNwb25kcyB0byB0aGUgXCJpc0RlZlwiIG1lc3NhZ2VcclxuICogd2l0aG91dCBhIHJlamVjdGlvbi5cclxuICovXHJcblEubWFzdGVyID0gbWFzdGVyO1xyXG5mdW5jdGlvbiBtYXN0ZXIob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gUHJvbWlzZSh7XHJcbiAgICAgICAgXCJpc0RlZlwiOiBmdW5jdGlvbiAoKSB7fVxyXG4gICAgfSwgZnVuY3Rpb24gZmFsbGJhY2sob3AsIGFyZ3MpIHtcclxuICAgICAgICByZXR1cm4gZGlzcGF0Y2gob2JqZWN0LCBvcCwgYXJncyk7XHJcbiAgICB9LCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIFEob2JqZWN0KS5pbnNwZWN0KCk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNwcmVhZHMgdGhlIHZhbHVlcyBvZiBhIHByb21pc2VkIGFycmF5IG9mIGFyZ3VtZW50cyBpbnRvIHRoZVxyXG4gKiBmdWxmaWxsbWVudCBjYWxsYmFjay5cclxuICogQHBhcmFtIGZ1bGZpbGxlZCBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIHZhcmlhZGljIGFyZ3VtZW50cyBmcm9tIHRoZVxyXG4gKiBwcm9taXNlZCBhcnJheVxyXG4gKiBAcGFyYW0gcmVqZWN0ZWQgY2FsbGJhY2sgdGhhdCByZWNlaXZlcyB0aGUgZXhjZXB0aW9uIGlmIHRoZSBwcm9taXNlXHJcbiAqIGlzIHJlamVjdGVkLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgb3IgdGhyb3duIGV4Y2VwdGlvbiBvZlxyXG4gKiBlaXRoZXIgY2FsbGJhY2suXHJcbiAqL1xyXG5RLnNwcmVhZCA9IHNwcmVhZDtcclxuZnVuY3Rpb24gc3ByZWFkKHZhbHVlLCBmdWxmaWxsZWQsIHJlamVjdGVkKSB7XHJcbiAgICByZXR1cm4gUSh2YWx1ZSkuc3ByZWFkKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5zcHJlYWQgPSBmdW5jdGlvbiAoZnVsZmlsbGVkLCByZWplY3RlZCkge1xyXG4gICAgcmV0dXJuIHRoaXMuYWxsKCkudGhlbihmdW5jdGlvbiAoYXJyYXkpIHtcclxuICAgICAgICByZXR1cm4gZnVsZmlsbGVkLmFwcGx5KHZvaWQgMCwgYXJyYXkpO1xyXG4gICAgfSwgcmVqZWN0ZWQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoZSBhc3luYyBmdW5jdGlvbiBpcyBhIGRlY29yYXRvciBmb3IgZ2VuZXJhdG9yIGZ1bmN0aW9ucywgdHVybmluZ1xyXG4gKiB0aGVtIGludG8gYXN5bmNocm9ub3VzIGdlbmVyYXRvcnMuICBBbHRob3VnaCBnZW5lcmF0b3JzIGFyZSBvbmx5IHBhcnRcclxuICogb2YgdGhlIG5ld2VzdCBFQ01BU2NyaXB0IDYgZHJhZnRzLCB0aGlzIGNvZGUgZG9lcyBub3QgY2F1c2Ugc3ludGF4XHJcbiAqIGVycm9ycyBpbiBvbGRlciBlbmdpbmVzLiAgVGhpcyBjb2RlIHNob3VsZCBjb250aW51ZSB0byB3b3JrIGFuZCB3aWxsXHJcbiAqIGluIGZhY3QgaW1wcm92ZSBvdmVyIHRpbWUgYXMgdGhlIGxhbmd1YWdlIGltcHJvdmVzLlxyXG4gKlxyXG4gKiBFUzYgZ2VuZXJhdG9ycyBhcmUgY3VycmVudGx5IHBhcnQgb2YgVjggdmVyc2lvbiAzLjE5IHdpdGggdGhlXHJcbiAqIC0taGFybW9ueS1nZW5lcmF0b3JzIHJ1bnRpbWUgZmxhZyBlbmFibGVkLiAgU3BpZGVyTW9ua2V5IGhhcyBoYWQgdGhlbVxyXG4gKiBmb3IgbG9uZ2VyLCBidXQgdW5kZXIgYW4gb2xkZXIgUHl0aG9uLWluc3BpcmVkIGZvcm0uICBUaGlzIGZ1bmN0aW9uXHJcbiAqIHdvcmtzIG9uIGJvdGgga2luZHMgb2YgZ2VuZXJhdG9ycy5cclxuICpcclxuICogRGVjb3JhdGVzIGEgZ2VuZXJhdG9yIGZ1bmN0aW9uIHN1Y2ggdGhhdDpcclxuICogIC0gaXQgbWF5IHlpZWxkIHByb21pc2VzXHJcbiAqICAtIGV4ZWN1dGlvbiB3aWxsIGNvbnRpbnVlIHdoZW4gdGhhdCBwcm9taXNlIGlzIGZ1bGZpbGxlZFxyXG4gKiAgLSB0aGUgdmFsdWUgb2YgdGhlIHlpZWxkIGV4cHJlc3Npb24gd2lsbCBiZSB0aGUgZnVsZmlsbGVkIHZhbHVlXHJcbiAqICAtIGl0IHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlICh3aGVuIHRoZSBnZW5lcmF0b3JcclxuICogICAgc3RvcHMgaXRlcmF0aW5nKVxyXG4gKiAgLSB0aGUgZGVjb3JhdGVkIGZ1bmN0aW9uIHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqICAgIG9mIHRoZSBnZW5lcmF0b3Igb3IgdGhlIGZpcnN0IHJlamVjdGVkIHByb21pc2UgYW1vbmcgdGhvc2VcclxuICogICAgeWllbGRlZC5cclxuICogIC0gaWYgYW4gZXJyb3IgaXMgdGhyb3duIGluIHRoZSBnZW5lcmF0b3IsIGl0IHByb3BhZ2F0ZXMgdGhyb3VnaFxyXG4gKiAgICBldmVyeSBmb2xsb3dpbmcgeWllbGQgdW50aWwgaXQgaXMgY2F1Z2h0LCBvciB1bnRpbCBpdCBlc2NhcGVzXHJcbiAqICAgIHRoZSBnZW5lcmF0b3IgZnVuY3Rpb24gYWx0b2dldGhlciwgYW5kIGlzIHRyYW5zbGF0ZWQgaW50byBhXHJcbiAqICAgIHJlamVjdGlvbiBmb3IgdGhlIHByb21pc2UgcmV0dXJuZWQgYnkgdGhlIGRlY29yYXRlZCBnZW5lcmF0b3IuXHJcbiAqL1xyXG5RLmFzeW5jID0gYXN5bmM7XHJcbmZ1bmN0aW9uIGFzeW5jKG1ha2VHZW5lcmF0b3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgLy8gd2hlbiB2ZXJiIGlzIFwic2VuZFwiLCBhcmcgaXMgYSB2YWx1ZVxyXG4gICAgICAgIC8vIHdoZW4gdmVyYiBpcyBcInRocm93XCIsIGFyZyBpcyBhbiBleGNlcHRpb25cclxuICAgICAgICBmdW5jdGlvbiBjb250aW51ZXIodmVyYiwgYXJnKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQ7XHJcblxyXG4gICAgICAgICAgICAvLyBVbnRpbCBWOCAzLjE5IC8gQ2hyb21pdW0gMjkgaXMgcmVsZWFzZWQsIFNwaWRlck1vbmtleSBpcyB0aGUgb25seVxyXG4gICAgICAgICAgICAvLyBlbmdpbmUgdGhhdCBoYXMgYSBkZXBsb3llZCBiYXNlIG9mIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBnZW5lcmF0b3JzLlxyXG4gICAgICAgICAgICAvLyBIb3dldmVyLCBTTSdzIGdlbmVyYXRvcnMgdXNlIHRoZSBQeXRob24taW5zcGlyZWQgc2VtYW50aWNzIG9mXHJcbiAgICAgICAgICAgIC8vIG91dGRhdGVkIEVTNiBkcmFmdHMuICBXZSB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgRVM2LCBidXQgd2UnZCBhbHNvXHJcbiAgICAgICAgICAgIC8vIGxpa2UgdG8gbWFrZSBpdCBwb3NzaWJsZSB0byB1c2UgZ2VuZXJhdG9ycyBpbiBkZXBsb3llZCBicm93c2Vycywgc29cclxuICAgICAgICAgICAgLy8gd2UgYWxzbyBzdXBwb3J0IFB5dGhvbi1zdHlsZSBnZW5lcmF0b3JzLiAgQXQgc29tZSBwb2ludCB3ZSBjYW4gcmVtb3ZlXHJcbiAgICAgICAgICAgIC8vIHRoaXMgYmxvY2suXHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIFN0b3BJdGVyYXRpb24gPT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICAgICAgICAgIC8vIEVTNiBHZW5lcmF0b3JzXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGdlbmVyYXRvclt2ZXJiXShhcmcpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFEocmVzdWx0LnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdoZW4ocmVzdWx0LnZhbHVlLCBjYWxsYmFjaywgZXJyYmFjayk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBTcGlkZXJNb25rZXkgR2VuZXJhdG9yc1xyXG4gICAgICAgICAgICAgICAgLy8gRklYTUU6IFJlbW92ZSB0aGlzIGNhc2Ugd2hlbiBTTSBkb2VzIEVTNiBnZW5lcmF0b3JzLlxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0b3JbdmVyYl0oYXJnKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1N0b3BJdGVyYXRpb24oZXhjZXB0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUShleGNlcHRpb24udmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gd2hlbihyZXN1bHQsIGNhbGxiYWNrLCBlcnJiYWNrKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgZ2VuZXJhdG9yID0gbWFrZUdlbmVyYXRvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBjYWxsYmFjayA9IGNvbnRpbnVlci5iaW5kKGNvbnRpbnVlciwgXCJuZXh0XCIpO1xyXG4gICAgICAgIHZhciBlcnJiYWNrID0gY29udGludWVyLmJpbmQoY29udGludWVyLCBcInRocm93XCIpO1xyXG4gICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xyXG4gICAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZSBzcGF3biBmdW5jdGlvbiBpcyBhIHNtYWxsIHdyYXBwZXIgYXJvdW5kIGFzeW5jIHRoYXQgaW1tZWRpYXRlbHlcclxuICogY2FsbHMgdGhlIGdlbmVyYXRvciBhbmQgYWxzbyBlbmRzIHRoZSBwcm9taXNlIGNoYWluLCBzbyB0aGF0IGFueVxyXG4gKiB1bmhhbmRsZWQgZXJyb3JzIGFyZSB0aHJvd24gaW5zdGVhZCBvZiBmb3J3YXJkZWQgdG8gdGhlIGVycm9yXHJcbiAqIGhhbmRsZXIuIFRoaXMgaXMgdXNlZnVsIGJlY2F1c2UgaXQncyBleHRyZW1lbHkgY29tbW9uIHRvIHJ1blxyXG4gKiBnZW5lcmF0b3JzIGF0IHRoZSB0b3AtbGV2ZWwgdG8gd29yayB3aXRoIGxpYnJhcmllcy5cclxuICovXHJcblEuc3Bhd24gPSBzcGF3bjtcclxuZnVuY3Rpb24gc3Bhd24obWFrZUdlbmVyYXRvcikge1xyXG4gICAgUS5kb25lKFEuYXN5bmMobWFrZUdlbmVyYXRvcikoKSk7XHJcbn1cclxuXHJcbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBpbnRlcmZhY2Ugb25jZSBFUzYgZ2VuZXJhdG9ycyBhcmUgaW4gU3BpZGVyTW9ua2V5LlxyXG4vKipcclxuICogVGhyb3dzIGEgUmV0dXJuVmFsdWUgZXhjZXB0aW9uIHRvIHN0b3AgYW4gYXN5bmNocm9ub3VzIGdlbmVyYXRvci5cclxuICpcclxuICogVGhpcyBpbnRlcmZhY2UgaXMgYSBzdG9wLWdhcCBtZWFzdXJlIHRvIHN1cHBvcnQgZ2VuZXJhdG9yIHJldHVyblxyXG4gKiB2YWx1ZXMgaW4gb2xkZXIgRmlyZWZveC9TcGlkZXJNb25rZXkuICBJbiBicm93c2VycyB0aGF0IHN1cHBvcnQgRVM2XHJcbiAqIGdlbmVyYXRvcnMgbGlrZSBDaHJvbWl1bSAyOSwganVzdCB1c2UgXCJyZXR1cm5cIiBpbiB5b3VyIGdlbmVyYXRvclxyXG4gKiBmdW5jdGlvbnMuXHJcbiAqXHJcbiAqIEBwYXJhbSB2YWx1ZSB0aGUgcmV0dXJuIHZhbHVlIGZvciB0aGUgc3Vycm91bmRpbmcgZ2VuZXJhdG9yXHJcbiAqIEB0aHJvd3MgUmV0dXJuVmFsdWUgZXhjZXB0aW9uIHdpdGggdGhlIHZhbHVlLlxyXG4gKiBAZXhhbXBsZVxyXG4gKiAvLyBFUzYgc3R5bGVcclxuICogUS5hc3luYyhmdW5jdGlvbiogKCkge1xyXG4gKiAgICAgIHZhciBmb28gPSB5aWVsZCBnZXRGb29Qcm9taXNlKCk7XHJcbiAqICAgICAgdmFyIGJhciA9IHlpZWxkIGdldEJhclByb21pc2UoKTtcclxuICogICAgICByZXR1cm4gZm9vICsgYmFyO1xyXG4gKiB9KVxyXG4gKiAvLyBPbGRlciBTcGlkZXJNb25rZXkgc3R5bGVcclxuICogUS5hc3luYyhmdW5jdGlvbiAoKSB7XHJcbiAqICAgICAgdmFyIGZvbyA9IHlpZWxkIGdldEZvb1Byb21pc2UoKTtcclxuICogICAgICB2YXIgYmFyID0geWllbGQgZ2V0QmFyUHJvbWlzZSgpO1xyXG4gKiAgICAgIFEucmV0dXJuKGZvbyArIGJhcik7XHJcbiAqIH0pXHJcbiAqL1xyXG5RW1wicmV0dXJuXCJdID0gX3JldHVybjtcclxuZnVuY3Rpb24gX3JldHVybih2YWx1ZSkge1xyXG4gICAgdGhyb3cgbmV3IFFSZXR1cm5WYWx1ZSh2YWx1ZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUaGUgcHJvbWlzZWQgZnVuY3Rpb24gZGVjb3JhdG9yIGVuc3VyZXMgdGhhdCBhbnkgcHJvbWlzZSBhcmd1bWVudHNcclxuICogYXJlIHNldHRsZWQgYW5kIHBhc3NlZCBhcyB2YWx1ZXMgKGB0aGlzYCBpcyBhbHNvIHNldHRsZWQgYW5kIHBhc3NlZFxyXG4gKiBhcyBhIHZhbHVlKS4gIEl0IHdpbGwgYWxzbyBlbnN1cmUgdGhhdCB0aGUgcmVzdWx0IG9mIGEgZnVuY3Rpb24gaXNcclxuICogYWx3YXlzIGEgcHJvbWlzZS5cclxuICpcclxuICogQGV4YW1wbGVcclxuICogdmFyIGFkZCA9IFEucHJvbWlzZWQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICogICAgIHJldHVybiBhICsgYjtcclxuICogfSk7XHJcbiAqIGFkZChRKGEpLCBRKEIpKTtcclxuICpcclxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRvIGRlY29yYXRlXHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gYSBmdW5jdGlvbiB0aGF0IGhhcyBiZWVuIGRlY29yYXRlZC5cclxuICovXHJcblEucHJvbWlzZWQgPSBwcm9taXNlZDtcclxuZnVuY3Rpb24gcHJvbWlzZWQoY2FsbGJhY2spIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHNwcmVhZChbdGhpcywgYWxsKGFyZ3VtZW50cyldLCBmdW5jdGlvbiAoc2VsZiwgYXJncykge1xyXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkoc2VsZiwgYXJncyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vKipcclxuICogc2VuZHMgYSBtZXNzYWdlIHRvIGEgdmFsdWUgaW4gYSBmdXR1cmUgdHVyblxyXG4gKiBAcGFyYW0gb2JqZWN0KiB0aGUgcmVjaXBpZW50XHJcbiAqIEBwYXJhbSBvcCB0aGUgbmFtZSBvZiB0aGUgbWVzc2FnZSBvcGVyYXRpb24sIGUuZy4sIFwid2hlblwiLFxyXG4gKiBAcGFyYW0gYXJncyBmdXJ0aGVyIGFyZ3VtZW50cyB0byBiZSBmb3J3YXJkZWQgdG8gdGhlIG9wZXJhdGlvblxyXG4gKiBAcmV0dXJucyByZXN1bHQge1Byb21pc2V9IGEgcHJvbWlzZSBmb3IgdGhlIHJlc3VsdCBvZiB0aGUgb3BlcmF0aW9uXHJcbiAqL1xyXG5RLmRpc3BhdGNoID0gZGlzcGF0Y2g7XHJcbmZ1bmN0aW9uIGRpc3BhdGNoKG9iamVjdCwgb3AsIGFyZ3MpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2gob3AsIGFyZ3MpO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIChvcCwgYXJncykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzZWxmLnByb21pc2VEaXNwYXRjaChkZWZlcnJlZC5yZXNvbHZlLCBvcCwgYXJncyk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIHByb3BlcnR5IHRvIGdldFxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSBwcm9wZXJ0eSB2YWx1ZVxyXG4gKi9cclxuUS5nZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXkpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJnZXRcIiwgW2tleV0pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJnZXRcIiwgW2tleV0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldHMgdGhlIHZhbHVlIG9mIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIG9iamVjdCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIHByb3BlcnR5IHRvIHNldFxyXG4gKiBAcGFyYW0gdmFsdWUgICAgIG5ldyB2YWx1ZSBvZiBwcm9wZXJ0eVxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICovXHJcblEuc2V0ID0gZnVuY3Rpb24gKG9iamVjdCwga2V5LCB2YWx1ZSkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInNldFwiLCBba2V5LCB2YWx1ZV0pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwic2V0XCIsIFtrZXksIHZhbHVlXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVsZXRlcyBhIHByb3BlcnR5IGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XHJcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBwcm9wZXJ0eSB0byBkZWxldGVcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqL1xyXG5RLmRlbCA9IC8vIFhYWCBsZWdhY3lcclxuUVtcImRlbGV0ZVwiXSA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5kZWwgPSAvLyBYWFggbGVnYWN5XHJcblByb21pc2UucHJvdG90eXBlW1wiZGVsZXRlXCJdID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJkZWxldGVcIiwgW2tleV0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEludm9rZXMgYSBtZXRob2QgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIG1ldGhvZCB0byBpbnZva2VcclxuICogQHBhcmFtIHZhbHVlICAgICBhIHZhbHVlIHRvIHBvc3QsIHR5cGljYWxseSBhbiBhcnJheSBvZlxyXG4gKiAgICAgICAgICAgICAgICAgIGludm9jYXRpb24gYXJndW1lbnRzIGZvciBwcm9taXNlcyB0aGF0XHJcbiAqICAgICAgICAgICAgICAgICAgYXJlIHVsdGltYXRlbHkgYmFja2VkIHdpdGggYHJlc29sdmVgIHZhbHVlcyxcclxuICogICAgICAgICAgICAgICAgICBhcyBvcHBvc2VkIHRvIHRob3NlIGJhY2tlZCB3aXRoIFVSTHNcclxuICogICAgICAgICAgICAgICAgICB3aGVyZWluIHRoZSBwb3N0ZWQgdmFsdWUgY2FuIGJlIGFueVxyXG4gKiAgICAgICAgICAgICAgICAgIEpTT04gc2VyaWFsaXphYmxlIG9iamVjdC5cclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqL1xyXG4vLyBib3VuZCBsb2NhbGx5IGJlY2F1c2UgaXQgaXMgdXNlZCBieSBvdGhlciBtZXRob2RzXHJcblEubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUS5wb3N0ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgYXJncykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFyZ3NdKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblByb21pc2UucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbiAobmFtZSwgYXJncykge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBhcmdzXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogSW52b2tlcyBhIG1ldGhvZCBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxyXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGludm9jYXRpb24gYXJndW1lbnRzXHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxyXG4gKi9cclxuUS5zZW5kID0gLy8gWFhYIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgcGFybGFuY2VcclxuUS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblEuaW52b2tlID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSAvKi4uLmFyZ3MqLykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMildKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLnNlbmQgPSAvLyBYWFggTWFyayBNaWxsZXIncyBwcm9wb3NlZCBwYXJsYW5jZVxyXG5Qcm9taXNlLnByb3RvdHlwZS5tY2FsbCA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblByb21pc2UucHJvdG90eXBlLmludm9rZSA9IGZ1bmN0aW9uIChuYW1lIC8qLi4uYXJncyovKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSldKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcHBsaWVzIHRoZSBwcm9taXNlZCBmdW5jdGlvbiBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSBhcmdzICAgICAgYXJyYXkgb2YgYXBwbGljYXRpb24gYXJndW1lbnRzXHJcbiAqL1xyXG5RLmZhcHBseSA9IGZ1bmN0aW9uIChvYmplY3QsIGFyZ3MpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcmdzXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5mYXBwbHkgPSBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcmdzXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsbHMgdGhlIHByb21pc2VkIGZ1bmN0aW9uIGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgZnVuY3Rpb25cclxuICogQHBhcmFtIC4uLmFyZ3MgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcclxuICovXHJcblFbXCJ0cnlcIl0gPVxyXG5RLmZjYWxsID0gZnVuY3Rpb24gKG9iamVjdCAvKiAuLi5hcmdzKi8pIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5mY2FsbCA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJhcHBseVwiLCBbdm9pZCAwLCBhcnJheV9zbGljZShhcmd1bWVudHMpXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQmluZHMgdGhlIHByb21pc2VkIGZ1bmN0aW9uLCB0cmFuc2Zvcm1pbmcgcmV0dXJuIHZhbHVlcyBpbnRvIGEgZnVsZmlsbGVkXHJcbiAqIHByb21pc2UgYW5kIHRocm93biBlcnJvcnMgaW50byBhIHJlamVjdGVkIG9uZS5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxyXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGFwcGxpY2F0aW9uIGFyZ3VtZW50c1xyXG4gKi9cclxuUS5mYmluZCA9IGZ1bmN0aW9uIChvYmplY3QgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBwcm9taXNlID0gUShvYmplY3QpO1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGZib3VuZCgpIHtcclxuICAgICAgICByZXR1cm4gcHJvbWlzZS5kaXNwYXRjaChcImFwcGx5XCIsIFtcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgYXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSlcclxuICAgICAgICBdKTtcclxuICAgIH07XHJcbn07XHJcblByb21pc2UucHJvdG90eXBlLmZiaW5kID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xyXG4gICAgICAgIHJldHVybiBwcm9taXNlLmRpc3BhdGNoKFwiYXBwbHlcIiwgW1xyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxyXG4gICAgICAgIF0pO1xyXG4gICAgfTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXF1ZXN0cyB0aGUgbmFtZXMgb2YgdGhlIG93bmVkIHByb3BlcnRpZXMgb2YgYSBwcm9taXNlZFxyXG4gKiBvYmplY3QgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUga2V5cyBvZiB0aGUgZXZlbnR1YWxseSBzZXR0bGVkIG9iamVjdFxyXG4gKi9cclxuUS5rZXlzID0gZnVuY3Rpb24gKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImtleXNcIiwgW10pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwia2V5c1wiLCBbXSk7XHJcbn07XHJcblxyXG4vKipcclxuICogVHVybnMgYW4gYXJyYXkgb2YgcHJvbWlzZXMgaW50byBhIHByb21pc2UgZm9yIGFuIGFycmF5LiAgSWYgYW55IG9mXHJcbiAqIHRoZSBwcm9taXNlcyBnZXRzIHJlamVjdGVkLCB0aGUgd2hvbGUgYXJyYXkgaXMgcmVqZWN0ZWQgaW1tZWRpYXRlbHkuXHJcbiAqIEBwYXJhbSB7QXJyYXkqfSBhbiBhcnJheSAob3IgcHJvbWlzZSBmb3IgYW4gYXJyYXkpIG9mIHZhbHVlcyAob3JcclxuICogcHJvbWlzZXMgZm9yIHZhbHVlcylcclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXNcclxuICovXHJcbi8vIEJ5IE1hcmsgTWlsbGVyXHJcbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPXN0cmF3bWFuOmNvbmN1cnJlbmN5JnJldj0xMzA4Nzc2NTIxI2FsbGZ1bGZpbGxlZFxyXG5RLmFsbCA9IGFsbDtcclxuZnVuY3Rpb24gYWxsKHByb21pc2VzKSB7XHJcbiAgICByZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2VzKSB7XHJcbiAgICAgICAgdmFyIGNvdW50RG93biA9IDA7XHJcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgICAgICBhcnJheV9yZWR1Y2UocHJvbWlzZXMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHByb21pc2UsIGluZGV4KSB7XHJcbiAgICAgICAgICAgIHZhciBzbmFwc2hvdDtcclxuICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgICAgaXNQcm9taXNlKHByb21pc2UpICYmXHJcbiAgICAgICAgICAgICAgICAoc25hcHNob3QgPSBwcm9taXNlLmluc3BlY3QoKSkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCJcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSBzbmFwc2hvdC52YWx1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICsrY291bnREb3duO1xyXG4gICAgICAgICAgICAgICAgd2hlbihcclxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlc1tpbmRleF0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKC0tY291bnREb3duID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHByb21pc2VzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0LFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChwcm9ncmVzcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5ub3RpZnkoeyBpbmRleDogaW5kZXgsIHZhbHVlOiBwcm9ncmVzcyB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgdm9pZCAwKTtcclxuICAgICAgICBpZiAoY291bnREb3duID09PSAwKSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocHJvbWlzZXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5hbGwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gYWxsKHRoaXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdhaXRzIGZvciBhbGwgcHJvbWlzZXMgdG8gYmUgc2V0dGxlZCwgZWl0aGVyIGZ1bGZpbGxlZCBvclxyXG4gKiByZWplY3RlZC4gIFRoaXMgaXMgZGlzdGluY3QgZnJvbSBgYWxsYCBzaW5jZSB0aGF0IHdvdWxkIHN0b3BcclxuICogd2FpdGluZyBhdCB0aGUgZmlyc3QgcmVqZWN0aW9uLiAgVGhlIHByb21pc2UgcmV0dXJuZWQgYnlcclxuICogYGFsbFJlc29sdmVkYCB3aWxsIG5ldmVyIGJlIHJlamVjdGVkLlxyXG4gKiBAcGFyYW0gcHJvbWlzZXMgYSBwcm9taXNlIGZvciBhbiBhcnJheSAob3IgYW4gYXJyYXkpIG9mIHByb21pc2VzXHJcbiAqIChvciB2YWx1ZXMpXHJcbiAqIEByZXR1cm4gYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiBwcm9taXNlc1xyXG4gKi9cclxuUS5hbGxSZXNvbHZlZCA9IGRlcHJlY2F0ZShhbGxSZXNvbHZlZCwgXCJhbGxSZXNvbHZlZFwiLCBcImFsbFNldHRsZWRcIik7XHJcbmZ1bmN0aW9uIGFsbFJlc29sdmVkKHByb21pc2VzKSB7XHJcbiAgICByZXR1cm4gd2hlbihwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2VzKSB7XHJcbiAgICAgICAgcHJvbWlzZXMgPSBhcnJheV9tYXAocHJvbWlzZXMsIFEpO1xyXG4gICAgICAgIHJldHVybiB3aGVuKGFsbChhcnJheV9tYXAocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB3aGVuKHByb21pc2UsIG5vb3AsIG5vb3ApO1xyXG4gICAgICAgIH0pKSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcHJvbWlzZXM7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuYWxsUmVzb2x2ZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gYWxsUmVzb2x2ZWQodGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQHNlZSBQcm9taXNlI2FsbFNldHRsZWRcclxuICovXHJcblEuYWxsU2V0dGxlZCA9IGFsbFNldHRsZWQ7XHJcbmZ1bmN0aW9uIGFsbFNldHRsZWQocHJvbWlzZXMpIHtcclxuICAgIHJldHVybiBRKHByb21pc2VzKS5hbGxTZXR0bGVkKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUdXJucyBhbiBhcnJheSBvZiBwcm9taXNlcyBpbnRvIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkgb2YgdGhlaXIgc3RhdGVzIChhc1xyXG4gKiByZXR1cm5lZCBieSBgaW5zcGVjdGApIHdoZW4gdGhleSBoYXZlIGFsbCBzZXR0bGVkLlxyXG4gKiBAcGFyYW0ge0FycmF5W0FueSpdfSB2YWx1ZXMgYW4gYXJyYXkgKG9yIHByb21pc2UgZm9yIGFuIGFycmF5KSBvZiB2YWx1ZXMgKG9yXHJcbiAqIHByb21pc2VzIGZvciB2YWx1ZXMpXHJcbiAqIEByZXR1cm5zIHtBcnJheVtTdGF0ZV19IGFuIGFycmF5IG9mIHN0YXRlcyBmb3IgdGhlIHJlc3BlY3RpdmUgdmFsdWVzLlxyXG4gKi9cclxuUHJvbWlzZS5wcm90b3R5cGUuYWxsU2V0dGxlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHByb21pc2VzKSB7XHJcbiAgICAgICAgcmV0dXJuIGFsbChhcnJheV9tYXAocHJvbWlzZXMsIGZ1bmN0aW9uIChwcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHByb21pc2UgPSBRKHByb21pc2UpO1xyXG4gICAgICAgICAgICBmdW5jdGlvbiByZWdhcmRsZXNzKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2UuaW5zcGVjdCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4ocmVnYXJkbGVzcywgcmVnYXJkbGVzcyk7XHJcbiAgICAgICAgfSkpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FwdHVyZXMgdGhlIGZhaWx1cmUgb2YgYSBwcm9taXNlLCBnaXZpbmcgYW4gb3BvcnR1bml0eSB0byByZWNvdmVyXHJcbiAqIHdpdGggYSBjYWxsYmFjay4gIElmIHRoZSBnaXZlbiBwcm9taXNlIGlzIGZ1bGZpbGxlZCwgdGhlIHJldHVybmVkXHJcbiAqIHByb21pc2UgaXMgZnVsZmlsbGVkLlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgZm9yIHNvbWV0aGluZ1xyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byBmdWxmaWxsIHRoZSByZXR1cm5lZCBwcm9taXNlIGlmIHRoZVxyXG4gKiBnaXZlbiBwcm9taXNlIGlzIHJlamVjdGVkXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgY2FsbGJhY2tcclxuICovXHJcblEuZmFpbCA9IC8vIFhYWCBsZWdhY3lcclxuUVtcImNhdGNoXCJdID0gZnVuY3Rpb24gKG9iamVjdCwgcmVqZWN0ZWQpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmZhaWwgPSAvLyBYWFggbGVnYWN5XHJcblByb21pc2UucHJvdG90eXBlW1wiY2F0Y2hcIl0gPSBmdW5jdGlvbiAocmVqZWN0ZWQpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4odm9pZCAwLCByZWplY3RlZCk7XHJcbn07XHJcblxyXG4vKipcclxuICogQXR0YWNoZXMgYSBsaXN0ZW5lciB0aGF0IGNhbiByZXNwb25kIHRvIHByb2dyZXNzIG5vdGlmaWNhdGlvbnMgZnJvbSBhXHJcbiAqIHByb21pc2UncyBvcmlnaW5hdGluZyBkZWZlcnJlZC4gVGhpcyBsaXN0ZW5lciByZWNlaXZlcyB0aGUgZXhhY3QgYXJndW1lbnRzXHJcbiAqIHBhc3NlZCB0byBgYGRlZmVycmVkLm5vdGlmeWBgLlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgZm9yIHNvbWV0aGluZ1xyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayB0byByZWNlaXZlIGFueSBwcm9ncmVzcyBub3RpZmljYXRpb25zXHJcbiAqIEByZXR1cm5zIHRoZSBnaXZlbiBwcm9taXNlLCB1bmNoYW5nZWRcclxuICovXHJcblEucHJvZ3Jlc3MgPSBwcm9ncmVzcztcclxuZnVuY3Rpb24gcHJvZ3Jlc3Mob2JqZWN0LCBwcm9ncmVzc2VkKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLnRoZW4odm9pZCAwLCB2b2lkIDAsIHByb2dyZXNzZWQpO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5wcm9ncmVzcyA9IGZ1bmN0aW9uIChwcm9ncmVzc2VkKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKHZvaWQgMCwgdm9pZCAwLCBwcm9ncmVzc2VkKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQcm92aWRlcyBhbiBvcHBvcnR1bml0eSB0byBvYnNlcnZlIHRoZSBzZXR0bGluZyBvZiBhIHByb21pc2UsXHJcbiAqIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciB0aGUgcHJvbWlzZSBpcyBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuICBGb3J3YXJkc1xyXG4gKiB0aGUgcmVzb2x1dGlvbiB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aGVuIHRoZSBjYWxsYmFjayBpcyBkb25lLlxyXG4gKiBUaGUgY2FsbGJhY2sgY2FuIHJldHVybiBhIHByb21pc2UgdG8gZGVmZXIgY29tcGxldGlvbi5cclxuICogQHBhcmFtIHtBbnkqfSBwcm9taXNlXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHRvIG9ic2VydmUgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuXHJcbiAqIHByb21pc2UsIHRha2VzIG5vIGFyZ3VtZW50cy5cclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSB3aGVuXHJcbiAqIGBgZmluYGAgaXMgZG9uZS5cclxuICovXHJcblEuZmluID0gLy8gWFhYIGxlZ2FjeVxyXG5RW1wiZmluYWxseVwiXSA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpW1wiZmluYWxseVwiXShjYWxsYmFjayk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5maW4gPSAvLyBYWFggbGVnYWN5XHJcblByb21pc2UucHJvdG90eXBlW1wiZmluYWxseVwiXSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgY2FsbGJhY2sgPSBRKGNhbGxiYWNrKTtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9KTtcclxuICAgIH0sIGZ1bmN0aW9uIChyZWFzb24pIHtcclxuICAgICAgICAvLyBUT0RPIGF0dGVtcHQgdG8gcmVjeWNsZSB0aGUgcmVqZWN0aW9uIHdpdGggXCJ0aGlzXCIuXHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmZjYWxsKCkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRocm93IHJlYXNvbjtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlcm1pbmF0ZXMgYSBjaGFpbiBvZiBwcm9taXNlcywgZm9yY2luZyByZWplY3Rpb25zIHRvIGJlXHJcbiAqIHRocm93biBhcyBleGNlcHRpb25zLlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2UgYXQgdGhlIGVuZCBvZiBhIGNoYWluIG9mIHByb21pc2VzXHJcbiAqIEByZXR1cm5zIG5vdGhpbmdcclxuICovXHJcblEuZG9uZSA9IGZ1bmN0aW9uIChvYmplY3QsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRvbmUoZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykge1xyXG4gICAgdmFyIG9uVW5oYW5kbGVkRXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAvLyBmb3J3YXJkIHRvIGEgZnV0dXJlIHR1cm4gc28gdGhhdCBgYHdoZW5gYFxyXG4gICAgICAgIC8vIGRvZXMgbm90IGNhdGNoIGl0IGFuZCB0dXJuIGl0IGludG8gYSByZWplY3Rpb24uXHJcbiAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBtYWtlU3RhY2tUcmFjZUxvbmcoZXJyb3IsIHByb21pc2UpO1xyXG4gICAgICAgICAgICBpZiAoUS5vbmVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBRLm9uZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gQXZvaWQgdW5uZWNlc3NhcnkgYG5leHRUaWNrYGluZyB2aWEgYW4gdW5uZWNlc3NhcnkgYHdoZW5gLlxyXG4gICAgdmFyIHByb21pc2UgPSBmdWxmaWxsZWQgfHwgcmVqZWN0ZWQgfHwgcHJvZ3Jlc3MgP1xyXG4gICAgICAgIHRoaXMudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcykgOlxyXG4gICAgICAgIHRoaXM7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHByb2Nlc3MgJiYgcHJvY2Vzcy5kb21haW4pIHtcclxuICAgICAgICBvblVuaGFuZGxlZEVycm9yID0gcHJvY2Vzcy5kb21haW4uYmluZChvblVuaGFuZGxlZEVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICBwcm9taXNlLnRoZW4odm9pZCAwLCBvblVuaGFuZGxlZEVycm9yKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXVzZXMgYSBwcm9taXNlIHRvIGJlIHJlamVjdGVkIGlmIGl0IGRvZXMgbm90IGdldCBmdWxmaWxsZWQgYmVmb3JlXHJcbiAqIHNvbWUgbWlsbGlzZWNvbmRzIHRpbWUgb3V0LlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2VcclxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbGxpc2Vjb25kcyB0aW1lb3V0XHJcbiAqIEBwYXJhbSB7QW55Kn0gY3VzdG9tIGVycm9yIG1lc3NhZ2Ugb3IgRXJyb3Igb2JqZWN0IChvcHRpb25hbClcclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW4gcHJvbWlzZSBpZiBpdCBpc1xyXG4gKiBmdWxmaWxsZWQgYmVmb3JlIHRoZSB0aW1lb3V0LCBvdGhlcndpc2UgcmVqZWN0ZWQuXHJcbiAqL1xyXG5RLnRpbWVvdXQgPSBmdW5jdGlvbiAob2JqZWN0LCBtcywgZXJyb3IpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkudGltZW91dChtcywgZXJyb3IpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudGltZW91dCA9IGZ1bmN0aW9uIChtcywgZXJyb3IpIHtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICB2YXIgdGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKCFlcnJvciB8fCBcInN0cmluZ1wiID09PSB0eXBlb2YgZXJyb3IpIHtcclxuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoZXJyb3IgfHwgXCJUaW1lZCBvdXQgYWZ0ZXIgXCIgKyBtcyArIFwiIG1zXCIpO1xyXG4gICAgICAgICAgICBlcnJvci5jb2RlID0gXCJFVElNRURPVVRcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycm9yKTtcclxuICAgIH0sIG1zKTtcclxuXHJcbiAgICB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICB9LCBmdW5jdGlvbiAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICB9LCBkZWZlcnJlZC5ub3RpZnkpO1xyXG5cclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgZ2l2ZW4gdmFsdWUgKG9yIHByb21pc2VkIHZhbHVlKSwgc29tZVxyXG4gKiBtaWxsaXNlY29uZHMgYWZ0ZXIgaXQgcmVzb2x2ZWQuIFBhc3NlcyByZWplY3Rpb25zIGltbWVkaWF0ZWx5LlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2VcclxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbGxpc2Vjb25kc1xyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlIGFmdGVyIG1pbGxpc2Vjb25kc1xyXG4gKiB0aW1lIGhhcyBlbGFwc2VkIHNpbmNlIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlLlxyXG4gKiBJZiB0aGUgZ2l2ZW4gcHJvbWlzZSByZWplY3RzLCB0aGF0IGlzIHBhc3NlZCBpbW1lZGlhdGVseS5cclxuICovXHJcblEuZGVsYXkgPSBmdW5jdGlvbiAob2JqZWN0LCB0aW1lb3V0KSB7XHJcbiAgICBpZiAodGltZW91dCA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgdGltZW91dCA9IG9iamVjdDtcclxuICAgICAgICBvYmplY3QgPSB2b2lkIDA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRlbGF5KHRpbWVvdXQpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAodGltZW91dCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcclxuICAgICAgICB9LCB0aW1lb3V0KTtcclxuICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBhc3NlcyBhIGNvbnRpbnVhdGlvbiB0byBhIE5vZGUgZnVuY3Rpb24sIHdoaWNoIGlzIGNhbGxlZCB3aXRoIHRoZSBnaXZlblxyXG4gKiBhcmd1bWVudHMgcHJvdmlkZWQgYXMgYW4gYXJyYXksIGFuZCByZXR1cm5zIGEgcHJvbWlzZS5cclxuICpcclxuICogICAgICBRLm5mYXBwbHkoRlMucmVhZEZpbGUsIFtfX2ZpbGVuYW1lXSlcclxuICogICAgICAudGhlbihmdW5jdGlvbiAoY29udGVudCkge1xyXG4gKiAgICAgIH0pXHJcbiAqXHJcbiAqL1xyXG5RLm5mYXBwbHkgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGFyZ3MpIHtcclxuICAgIHJldHVybiBRKGNhbGxiYWNrKS5uZmFwcGx5KGFyZ3MpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJncyk7XHJcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICB0aGlzLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogUGFzc2VzIGEgY29udGludWF0aW9uIHRvIGEgTm9kZSBmdW5jdGlvbiwgd2hpY2ggaXMgY2FsbGVkIHdpdGggdGhlIGdpdmVuXHJcbiAqIGFyZ3VtZW50cyBwcm92aWRlZCBpbmRpdmlkdWFsbHksIGFuZCByZXR1cm5zIGEgcHJvbWlzZS5cclxuICogQGV4YW1wbGVcclxuICogUS5uZmNhbGwoRlMucmVhZEZpbGUsIF9fZmlsZW5hbWUpXHJcbiAqIC50aGVuKGZ1bmN0aW9uIChjb250ZW50KSB7XHJcbiAqIH0pXHJcbiAqXHJcbiAqL1xyXG5RLm5mY2FsbCA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xyXG4gICAgcmV0dXJuIFEoY2FsbGJhY2spLm5mYXBwbHkoYXJncyk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5uZmNhbGwgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgdGhpcy5mYXBwbHkobm9kZUFyZ3MpLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyYXBzIGEgTm9kZUpTIGNvbnRpbnVhdGlvbiBwYXNzaW5nIGZ1bmN0aW9uIGFuZCByZXR1cm5zIGFuIGVxdWl2YWxlbnRcclxuICogdmVyc2lvbiB0aGF0IHJldHVybnMgYSBwcm9taXNlLlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBRLm5mYmluZChGUy5yZWFkRmlsZSwgX19maWxlbmFtZSkoXCJ1dGYtOFwiKVxyXG4gKiAudGhlbihjb25zb2xlLmxvZylcclxuICogLmRvbmUoKVxyXG4gKi9cclxuUS5uZmJpbmQgPVxyXG5RLmRlbm9kZWlmeSA9IGZ1bmN0aW9uIChjYWxsYmFjayAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGJhc2VBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xyXG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICAgICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgICAgIFEoY2FsbGJhY2spLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5mYmluZCA9XHJcblByb21pc2UucHJvdG90eXBlLmRlbm9kZWlmeSA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMpO1xyXG4gICAgYXJncy51bnNoaWZ0KHRoaXMpO1xyXG4gICAgcmV0dXJuIFEuZGVub2RlaWZ5LmFwcGx5KHZvaWQgMCwgYXJncyk7XHJcbn07XHJcblxyXG5RLm5iaW5kID0gZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGJhc2VBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAyKTtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIG5vZGVBcmdzID0gYmFzZUFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpO1xyXG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICAgICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgICAgIGZ1bmN0aW9uIGJvdW5kKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkodGhpc3AsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFEoYm91bmQpLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5iaW5kID0gZnVuY3Rpb24gKC8qdGhpc3AsIC4uLmFyZ3MqLykge1xyXG4gICAgdmFyIGFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDApO1xyXG4gICAgYXJncy51bnNoaWZ0KHRoaXMpO1xyXG4gICAgcmV0dXJuIFEubmJpbmQuYXBwbHkodm9pZCAwLCBhcmdzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxscyBhIG1ldGhvZCBvZiBhIE5vZGUtc3R5bGUgb2JqZWN0IHRoYXQgYWNjZXB0cyBhIE5vZGUtc3R5bGVcclxuICogY2FsbGJhY2sgd2l0aCBhIGdpdmVuIGFycmF5IG9mIGFyZ3VtZW50cywgcGx1cyBhIHByb3ZpZGVkIGNhbGxiYWNrLlxyXG4gKiBAcGFyYW0gb2JqZWN0IGFuIG9iamVjdCB0aGF0IGhhcyB0aGUgbmFtZWQgbWV0aG9kXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcclxuICogQHBhcmFtIHtBcnJheX0gYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kOyB0aGUgY2FsbGJhY2tcclxuICogd2lsbCBiZSBwcm92aWRlZCBieSBRIGFuZCBhcHBlbmRlZCB0byB0aGVzZSBhcmd1bWVudHMuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9yIGVycm9yXHJcbiAqL1xyXG5RLm5tYXBwbHkgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5RLm5wb3N0ID0gZnVuY3Rpb24gKG9iamVjdCwgbmFtZSwgYXJncykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5ucG9zdChuYW1lLCBhcmdzKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5tYXBwbHkgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5Qcm9taXNlLnByb3RvdHlwZS5ucG9zdCA9IGZ1bmN0aW9uIChuYW1lLCBhcmdzKSB7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzIHx8IFtdKTtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxscyBhIG1ldGhvZCBvZiBhIE5vZGUtc3R5bGUgb2JqZWN0IHRoYXQgYWNjZXB0cyBhIE5vZGUtc3R5bGVcclxuICogY2FsbGJhY2ssIGZvcndhcmRpbmcgdGhlIGdpdmVuIHZhcmlhZGljIGFyZ3VtZW50cywgcGx1cyBhIHByb3ZpZGVkXHJcbiAqIGNhbGxiYWNrIGFyZ3VtZW50LlxyXG4gKiBAcGFyYW0gb2JqZWN0IGFuIG9iamVjdCB0aGF0IGhhcyB0aGUgbmFtZWQgbWV0aG9kXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIG1ldGhvZCBvZiBvYmplY3RcclxuICogQHBhcmFtIC4uLmFyZ3MgYXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZDsgdGhlIGNhbGxiYWNrIHdpbGxcclxuICogYmUgcHJvdmlkZWQgYnkgUSBhbmQgYXBwZW5kZWQgdG8gdGhlc2UgYXJndW1lbnRzLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSB2YWx1ZSBvciBlcnJvclxyXG4gKi9cclxuUS5uc2VuZCA9IC8vIFhYWCBCYXNlZCBvbiBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIFwic2VuZFwiXHJcblEubm1jYWxsID0gLy8gWFhYIEJhc2VkIG9uIFwiUmVkc2FuZHJvJ3NcIiBwcm9wb3NhbFxyXG5RLm5pbnZva2UgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDIpO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIFEob2JqZWN0KS5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIG5vZGVBcmdzXSkuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5uc2VuZCA9IC8vIFhYWCBCYXNlZCBvbiBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIFwic2VuZFwiXHJcblByb21pc2UucHJvdG90eXBlLm5tY2FsbCA9IC8vIFhYWCBCYXNlZCBvbiBcIlJlZHNhbmRybydzXCIgcHJvcG9zYWxcclxuUHJvbWlzZS5wcm90b3R5cGUubmludm9rZSA9IGZ1bmN0aW9uIChuYW1lIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBub2RlQXJnc10pLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIElmIGEgZnVuY3Rpb24gd291bGQgbGlrZSB0byBzdXBwb3J0IGJvdGggTm9kZSBjb250aW51YXRpb24tcGFzc2luZy1zdHlsZSBhbmRcclxuICogcHJvbWlzZS1yZXR1cm5pbmctc3R5bGUsIGl0IGNhbiBlbmQgaXRzIGludGVybmFsIHByb21pc2UgY2hhaW4gd2l0aFxyXG4gKiBgbm9kZWlmeShub2RlYmFjaylgLCBmb3J3YXJkaW5nIHRoZSBvcHRpb25hbCBub2RlYmFjayBhcmd1bWVudC4gIElmIHRoZSB1c2VyXHJcbiAqIGVsZWN0cyB0byB1c2UgYSBub2RlYmFjaywgdGhlIHJlc3VsdCB3aWxsIGJlIHNlbnQgdGhlcmUuICBJZiB0aGV5IGRvIG5vdFxyXG4gKiBwYXNzIGEgbm9kZWJhY2ssIHRoZXkgd2lsbCByZWNlaXZlIHRoZSByZXN1bHQgcHJvbWlzZS5cclxuICogQHBhcmFtIG9iamVjdCBhIHJlc3VsdCAob3IgYSBwcm9taXNlIGZvciBhIHJlc3VsdClcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gbm9kZWJhY2sgYSBOb2RlLmpzLXN0eWxlIGNhbGxiYWNrXHJcbiAqIEByZXR1cm5zIGVpdGhlciB0aGUgcHJvbWlzZSBvciBub3RoaW5nXHJcbiAqL1xyXG5RLm5vZGVpZnkgPSBub2RlaWZ5O1xyXG5mdW5jdGlvbiBub2RlaWZ5KG9iamVjdCwgbm9kZWJhY2spIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkubm9kZWlmeShub2RlYmFjayk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLm5vZGVpZnkgPSBmdW5jdGlvbiAobm9kZWJhY2spIHtcclxuICAgIGlmIChub2RlYmFjaykge1xyXG4gICAgICAgIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgbm9kZWJhY2sobnVsbCwgdmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgbm9kZWJhY2soZXJyb3IpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn07XHJcblxyXG4vLyBBbGwgY29kZSBiZWZvcmUgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzLlxyXG52YXIgcUVuZGluZ0xpbmUgPSBjYXB0dXJlTGluZSgpO1xyXG5cclxucmV0dXJuIFE7XHJcblxyXG59KTtcclxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIlpiaTdnYlwiKSkiLCIvKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAbW9kdWxlICAgICAgICBzZW5kUmVxdWVzdFxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBUaGlzIGZ1bmN0aW9uIHByb3ZpZGVzIHRoZSBsb3dlc3QtbGV2ZWwgaW50ZXJmYWNlIHRvIHRoZSBYSFIgZnVuY3Rpb25hbGl0eSB0aGF0XHJcbiAqICAgICAgICAgICAgICAgIHRoZSBCcmlkZ2UgQ2xpZW50IGlzIG9wZXJhdGluZyBvbiB0b3Agb2YuIFRoaXMgZnVuY3Rpb24gaXMgcmVzcG9uc2libGUgb25seSBmb3JcclxuICogICAgICAgICAgICAgICAgaXNzdWluZyBhIHJlcXVlc3QgYW5kIHJldHVybmluZyBhIFEgcHJvbWlzZSBhbmQgaG9va2luZyB1cCB0aGUgcmVzb2x2ZSgpIGFuZFxyXG4gKiAgICAgICAgICAgICAgICByZWplY3QoKSBtZXRob2RzIHRvIHRoZSByZXN1bHRzIG9mIHRoZSBYSFIgcmVxdWVzdC5cclxuICogICAgICAgICAgICAgICAgVGhpcyBmdW5jdGlvbiBjYW4gYmUgb3ZlcnJpZGRlbiB0byB1c2Ugc29tZSBvdGhlciBzZXJ2aWNlIHRoYW4gWG1sSHR0cFJlcXVlc3RzXHJcbiAqICAgICAgICAgICAgICAgIGJ5IHRoZSBlbmQtZGV2ZWxvcGVyLiBJZiB5b3UgcGxhbiB0byBkbyB0aGlzLCB3ZSBhZHZpY2UgdGhhdCB5b3UgbWFrZSBhIHBsdWdpblxyXG4gKiAgICAgICAgICAgICAgICBmb3IgdGhlIEJyaWRnZSBDbGllbnQgdG8gZm9ybWFsaXplIHlvdXIgc3BlY2lhbGl6ZWQgYmVoYXZpb3VyLiBFbnN1cmUgdGhhdCB0aGVcclxuICogICAgICAgICAgICAgICAgb3ZlcnJpZGluZyBmdW5jdGlvbiBhZGhlcmVkIHRvIHRoZSBzYW1lIHNpZ25hdHVyZSBhbmQgcmV0dXJucyBhIFEgcHJvbWlzZS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge0RlZmVycmVkfSBkZWZlcnJlZCAgIEEgUSBkZWZlcnJlZCBvYmplY3QgdGhhdCB0aGUgZW5kLWRldmVsb3BlciBtdXN0IHVzZSB0b1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWl0aGVyIHJlc29sdmUgb3IgcmVqZWN0IGluIHJlc3BvbnNlIHRvIHRoZSByZXF1ZXN0IGVpdGhlclxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGluZyBvciBjb21wbGV0aW5nIHN1Y2Nlc3NmdWxseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gbWV0aG9kICAgICAgIFRoZSBIVFRQIHZlcmIvYWN0aW9uIHRvIHVzZSBmb3IgdGhlIHJlcXVlc3QuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IHVybCAgICAgICAgICBUaGUgZXhhY3QgVVJMIG9mIHRoZSByZXNvdXJjZSB0byBxdWVyeS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge09iamVjdH0gZGF0YSAgICAgICAgIFRoZSBkYXRhIG9iamVjdCB0byBzZW5kIHdpdGggdGhlIHJlcXVlc3QuIFRoaXMgY2FuIGJlIHVzZWRcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGRlc2NyaWJlIHF1ZXJ5IGFyZ3VtZW50cyBzdWNoIGFzIGZpbHRlcnMgYW5kIG9yZGVyaW5nLFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgdG8gY29udGFpbiBkYXRhIHRvIGJlIHN0b3JlZCBpbiB0aGUgQnJpZGdlIGRhdGFiYXNlLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzZW5kUmVxdWVzdCggZGVmZXJyZWQsIG1ldGhvZCwgdXJsLCBkYXRhICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHJcbiAgeGhyLm9wZW4oIG1ldGhvZC50b1VwcGVyQ2FzZSgpLCB1cmwsIHRydWUgKTtcclxuICB4aHIuc2V0UmVxdWVzdEhlYWRlciggJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJyApO1xyXG4gIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCAnQnJpZGdlJywgSlNPTi5zdHJpbmdpZnkoIGRhdGEgKSApO1xyXG5cclxuICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKCB4aHIucmVhZHlTdGF0ZSA9PT0gNCApIHtcclxuICAgICAgdHJ5IHtcclxuXHJcbiAgICAgICAgLy8gQXR0ZW1wdCB0byBwYXJzZSB0aGUgcmVzcG9uc2UgYXMgSlNPTi5cclxuICAgICAgICB2YXIgZGF0YSA9IEpTT04ucGFyc2UoIHhoci5yZXNwb25zZVRleHQgKTtcclxuXHJcbiAgICAgICAgLy8gSWYgdGhlIGNvbnRlbnQgcHJvcGVydHkgaXMgbWlzc2luZyBmcm9tIHRoZSByZXNwb25zZSwgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC4gUmVqZWN0XHJcbiAgICAgICAgLy8gdGhlIHJlcXVlc3Qgd2l0aCBhIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBpcyBtYWxmb3JtZWQuXHJcbiAgICAgICAgaWYgKCAhZGF0YS5jb250ZW50ICkge1xyXG4gICAgICAgICAgZGVmZXJyZWQucmVqZWN0KCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTUFMRk9STUVEX1JFU1BPTlNFICkgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIElmIGFuIGVycm9yIHN0YXR1cyBpcyByZXBvcnRlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlJ3MgZXJyb3Igb2JqZWN0LlxyXG4gICAgICAgIGlmICggeGhyLnN0YXR1cyA+PSA0MDAgKSB7XHJcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoIGRhdGEuY29udGVudCApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gT3RoZXJ3aXNlLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIG9iamVjdC5cclxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKCBkYXRhLmNvbnRlbnQgKTtcclxuXHJcbiAgICAgIH1cclxuICAgICAgY2F0Y2ggKCBlICkge1xyXG5cclxuICAgICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgY2FuJ3QgYmUgcGFyc2VkIGFzIEpTT04sIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGEgbmV3IGVycm9yIG9iamVjdCB0aGF0XHJcbiAgICAgICAgLy8gZGVzY3JpYmVzIHRoZSByZXNwb25zZSBhcyBtYWxmb3JtZWQuXHJcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTUFMRk9STUVEX1JFU1BPTlNFICkgKTtcclxuXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICB4aHIub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAvLyBJZiB0aGUgcmVxdWVzdCBmYWlsZWQgZHVlIHRvIGEgbmV0d29yayBlcnJvciwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYSBuZXcgZXJyb3Igb2JqZWN0IHRoYXRcclxuICAgIC8vIGRlc2NyaWJlcyB0aGF0IHRoZSBmYWlsdXJlIHdhcyBkdWUgdG8gYSBuZXR3b3JrIGVycm9yLlxyXG4gICAgZGVmZXJyZWQucmVqZWN0KCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTkVUV09SS19FUlJPUiApICk7XHJcblxyXG4gIH07XHJcblxyXG4gIHhoci5vbnRpbWVvdXQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgLy8gSWYgdGhlIHJlcXVlc3QgdGltZWQgb3V0LCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhIG5ldyBlcnJvciBvYmplY3QgdGhhdCBkZXNjcmliZXMgdGhhdCB0aGVcclxuICAgIC8vIGZhaWx1cmUgd2FzIGR1ZSB0byBhIHRpbWVvdXQuXHJcbiAgICBkZWZlcnJlZC5yZWplY3QoIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5SRVFVRVNUX1RJTUVPVVQgKSApO1xyXG5cclxuICB9O1xyXG5cclxuICB4aHIuc2VuZCgpO1xyXG5cclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuXHJcbn07XHJcbiJdfQ==
(2)
});
