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
  if ( currentPassword && newPassword && newPassword.length > 6 ) {
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

        // If a debug message was sent, set it as the message. If not, the error message is empty.
        error.message = error.debugMessage || '';

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcSmFtZXNcXGdpdFxcYnJpZGdlLXNlcnZlclxcYnJpZGdlLWNsaWVudFxcbm9kZV9tb2R1bGVzXFxicm93c2VyaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXItcGFja1xcX3ByZWx1ZGUuanMiLCJDOi9Vc2Vycy9KYW1lcy9naXQvYnJpZGdlLXNlcnZlci9icmlkZ2UtY2xpZW50L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJDOi9Vc2Vycy9KYW1lcy9naXQvYnJpZGdlLXNlcnZlci9icmlkZ2UtY2xpZW50L3NyYy9CcmlkZ2VDbGllbnQuanMiLCJDOi9Vc2Vycy9KYW1lcy9naXQvYnJpZGdlLXNlcnZlci9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9hdXRoZW50aWNhdGUuanMiLCJDOi9Vc2Vycy9KYW1lcy9naXQvYnJpZGdlLXNlcnZlci9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9kZWF1dGhlbnRpY2F0ZS5qcyIsIkM6L1VzZXJzL0phbWVzL2dpdC9icmlkZ2Utc2VydmVyL2JyaWRnZS1jbGllbnQvc3JjL2NvbW1hbmRzL2ZvcmdvdFBhc3N3b3JkLmpzIiwiQzovVXNlcnMvSmFtZXMvZ2l0L2JyaWRnZS1zZXJ2ZXIvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvaXNBdXRoZW50aWNhdGVkLmpzIiwiQzovVXNlcnMvSmFtZXMvZ2l0L2JyaWRnZS1zZXJ2ZXIvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvbG9hZFVzZXIuanMiLCJDOi9Vc2Vycy9KYW1lcy9naXQvYnJpZGdlLXNlcnZlci9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy9sb2dpbi5qcyIsIkM6L1VzZXJzL0phbWVzL2dpdC9icmlkZ2Utc2VydmVyL2JyaWRnZS1jbGllbnQvc3JjL2NvbW1hbmRzL2xvZ291dC5qcyIsIkM6L1VzZXJzL0phbWVzL2dpdC9icmlkZ2Utc2VydmVyL2JyaWRnZS1jbGllbnQvc3JjL2NvbW1hbmRzL3JlY292ZXJQYXNzd29yZC5qcyIsIkM6L1VzZXJzL0phbWVzL2dpdC9icmlkZ2Utc2VydmVyL2JyaWRnZS1jbGllbnQvc3JjL2NvbW1hbmRzL3JlZ2lzdGVyLmpzIiwiQzovVXNlcnMvSmFtZXMvZ2l0L2JyaWRnZS1zZXJ2ZXIvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvcmVzdW1lLmpzIiwiQzovVXNlcnMvSmFtZXMvZ2l0L2JyaWRnZS1zZXJ2ZXIvYnJpZGdlLWNsaWVudC9zcmMvY29tbWFuZHMvc2F2ZVVzZXIuanMiLCJDOi9Vc2Vycy9KYW1lcy9naXQvYnJpZGdlLXNlcnZlci9icmlkZ2UtY2xpZW50L3NyYy9jb21tYW5kcy92ZXJpZnlFbWFpbC5qcyIsIkM6L1VzZXJzL0phbWVzL2dpdC9icmlkZ2Utc2VydmVyL2JyaWRnZS1jbGllbnQvc3JjL2NvcmUuanMiLCJDOi9Vc2Vycy9KYW1lcy9naXQvYnJpZGdlLXNlcnZlci9icmlkZ2UtY2xpZW50L3NyYy9lcnJvcnMuanMiLCJDOi9Vc2Vycy9KYW1lcy9naXQvYnJpZGdlLXNlcnZlci9icmlkZ2UtY2xpZW50L3NyYy9pbmNsdWRlL2NyeXB0by1qcy9jb3JlLmpzIiwiQzovVXNlcnMvSmFtZXMvZ2l0L2JyaWRnZS1zZXJ2ZXIvYnJpZGdlLWNsaWVudC9zcmMvaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleC5qcyIsIkM6L1VzZXJzL0phbWVzL2dpdC9icmlkZ2Utc2VydmVyL2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1Ni5qcyIsIkM6L1VzZXJzL0phbWVzL2dpdC9icmlkZ2Utc2VydmVyL2JyaWRnZS1jbGllbnQvc3JjL2luY2x1ZGUvcS5qcyIsIkM6L1VzZXJzL0phbWVzL2dpdC9icmlkZ2Utc2VydmVyL2JyaWRnZS1jbGllbnQvc3JjL3BsdWdpbnMvRGVmYXVsdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4dUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0M0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIoIGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBJbXBvcnQgQnJpZGdlIGNvcmUgZnVuY3Rpb25hbGl0eVxyXG4gIHZhciBjb3JlID0gcmVxdWlyZSggJy4vY29yZScgKTtcclxuICB2YXIgZXJyb3JzID0gcmVxdWlyZSggJy4vZXJyb3JzJyApO1xyXG5cclxuICAvLyBJbXBvcnQgQnJpZGdlIEFQSSBjb21tYW5kc1xyXG4gIHZhciBhdXRoZW50aWNhdGUgICAgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL2F1dGhlbnRpY2F0ZScgKTtcclxuICB2YXIgZGVhdXRoZW50aWNhdGUgICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9kZWF1dGhlbnRpY2F0ZScgKTtcclxuICB2YXIgZm9yZ290UGFzc3dvcmQgICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9mb3Jnb3RQYXNzd29yZCcgKTtcclxuICB2YXIgaXNBdXRoZW50aWNhdGVkICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9pc0F1dGhlbnRpY2F0ZWQnICk7XHJcbiAgdmFyIGxvYWRVc2VyICAgICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvbG9hZFVzZXInICk7XHJcbiAgdmFyIGxvZ2luICAgICAgICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvbG9naW4nICk7XHJcbiAgdmFyIGxvZ291dCAgICAgICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvbG9nb3V0JyApO1xyXG4gIHZhciByZWNvdmVyUGFzc3dvcmQgICA9IHJlcXVpcmUoICcuL2NvbW1hbmRzL3JlY292ZXJQYXNzd29yZCcgKTtcclxuICB2YXIgcmVnaXN0ZXIgICAgICAgICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9yZWdpc3RlcicgKTtcclxuICB2YXIgcmVzdW1lICAgICAgICAgICAgPSByZXF1aXJlKCAnLi9jb21tYW5kcy9yZXN1bWUnICk7XHJcbiAgdmFyIHNhdmVVc2VyICAgICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvc2F2ZVVzZXInICk7XHJcbiAgdmFyIHZlcmlmeUVtYWlsICAgICAgID0gcmVxdWlyZSggJy4vY29tbWFuZHMvdmVyaWZ5RW1haWwnICk7XHJcblxyXG4gIC8qKlxyXG4gICAqXHJcbiAgICogQGdsb2JhbCAgICAgICAgQnJpZGdlXHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gICBUaGUgQnJpZGdlIGdsb2JhbC5cclxuICAgKlxyXG4gICAqIEB0eXBlICAgICAgICAgIHtPYmplY3R9XHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXREZWJ1ZyAgICAgICAgICAgIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgZGVidWcgbW9kZSBvZiBCcmlkZ2UuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBzZXREZWJ1ZyAgICAgICAgICAgIFRoaXMgZnVuY3Rpb24gc2V0cyB0aGUgZGVidWcgbW9kZSBvZiBCcmlkZ2UuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXRFcnJvcnMgICAgICAgICAgIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgZXJyb3JzIG1vZHVsZSBmcm9tIHdoaWNoIGFsbFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2YgdGhlIGVycm9yIHR5cGVzIHRoYXQgQnJpZGdlIHVzZXMgdG8gZW51bWVyYXRlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWlsdXJlcyBhcmUgdmlzaWJsZS5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGdldElzVXNlckxvZ2dlZEluICAgQ2hlY2tzIHRvIHNlZSBpZiB0aGUgc2Vzc2lvbiBpcyBhdXRoZW50aWNhdGVkIGFuZCB0aGF0XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgdXNlciBwcm9maWxlIG9iamVjdCBpcyBzZXQuIEJvdGggYm90aCBhcmUgdHJ1ZSxcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSB1c2VyIGlzIGNvbnNpZGVyZWQgdG8gYmUgbG9nZ2VkIGluLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZ2V0SXNVc2VyTW9kaWZpZWQgICBDaGVja3MgdG8gc2VlIGlmIHRoZSB1c2VyIG9iamVjdCBoYXMgYmVlbiBjaGFuZ2VkXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaW5jZSB0aGUgbGFzdCB0aW1lIHRoYXQgZ2V0VXNlclByb2ZpbGUoKSB3YXMgY2FsbGVkXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBnZXQgYSBmcmVzaCBjb3B5LiBUaGlzIGlzIGhlbHBmdWwgd2FybiB1c2VycyB0aGF0XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVyZSBhcmUgY2hhbmdlcyB0aGF0IG11c3QgYmUgc2F2ZWQuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXRSZW1lbWJlck1lICAgICAgIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgY3VycmVudCBcInJlbWVtYmVyIG1lXCIgc3RhdGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mIHRoZSBhcHBsaWNhdGlvbi5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGdldFVzZXIgICAgICAgICAgICAgVGhpcyBmdW5jdGlvbiByZXR1cm5zIHRoZSB1c2VyIHByb2ZpbGUgb2JqZWN0IHRoYXQgeW91XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaG91bGQgdXNlIGluIHlvdXIgYXBwIHRoYXQgZ2V0IGJlIGZldGNoZWQgZnJvbSB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEFQSSB3aXRoIGdldFVzZXJQcm9maWxlKCkgYW5kIHVwZGF0ZWQgb24gdGhlIEFQSSB1c2luZ1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlVXNlclByb2ZpbGUoKS5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IG9uUmVxdWVzdENhbGxlZCAgICAgQSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IGFsbG93cyB5b3UgdG8gYXR0YWNoIHNwZWNpYWxcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlaGF2aW91ciB0byBldmVyeSByZXF1ZXN0IGNhbGwgbWFkZSBieSBCcmlkZ2UuIFRoaXNcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrIGNhcHR1cmVzIHRoZSBIVFRQIG1ldGhvZCwgVVJMLCBhbmQgdGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXlsb2FkIG9mIGVhY2ggb3V0Z29pbmcgcmVxdWVzdCBiZWZvcmUgaXQgaXMgc2VudCBhbmRcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdpdmVzIHlvdSB0aGUgb3Bwb3J0dW5pdHkgdG8gbW9kaWZ5IHJlcXVlc3RzLCBpZlxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmVjZXNzYXJ5LlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gYXV0aGVudGljYXRlICAgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byByZXF1ZXN0IGF1dGhlbnRpY2F0aW9uLiBJZiB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QgaXMgc3VjY2Vzc2Z1bCwgYSBCcmlkZ2UgYXV0aGVudGljYXRpb24gY29va2llXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpcyBzZXQgaW4gdGhlIGJyb3dzZXIgdG8gaWRlbnRpZnkgdGhlIHVzZXIgZnJvbSBub3dcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZGVhdXRoZW50aWNhdGUgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byByZXF1ZXN0IGRlYXV0aGVudGljYXRpb24uIElmIHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdCBpcyBzdWNjZXNzZnVsLCB0aGUgQnJpZGdlIGF1dGhlbnRpY2F0aW9uXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb29raWUgaXMgc2V0IHRvIGV4cGlyZSBpbW1lZGlhdGVseSwgYW5kIGFsbCBzZXNzaW9uXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZXMgaW4gQnJpZGdlIGFyZSByZXNldC5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGZvcmdvdFBhc3N3b3JkICAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gcmVxdWVzdCBhIHBhc3N3b3JkIHJlY292ZXJ5IGVtYWlsXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZSBzZW50IHRvIHRoZSBnaXZlbiBlbWFpbCBhZGRyZXNzLiByZWNvdmVyUGFzc3dvcmQoKVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVwcmVzZW50cyB0aGUgY29tcGxldGlvbiBvZiB0aGUgcmVjb3ZlcnkgcHJvY2Vzcy5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGlzQXV0aGVudGljYXRlZCAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gcmVxdWVzdCB0aGUgc2VydmVyIG5vdGlmeSB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudCBvZiBpdHMgYXV0aG9yaXphdGlvbiBzdGF0dXMuIElmIGEgdmFsaWQgYXV0aFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29va2llIGlzIHNldCBpbiB0aGUgYnJvd3NlciwgdGhlbiB0aGlzIHJlcXVlc3Qgd2lsbFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VlZDogdGhlIHNlc3Npb24gaXMgYXV0aGVudGljYXRlZC5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IGxvYWRVc2VyICAgICAgICAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gZmV0Y2ggYW4gdXAtdG8tZGF0ZSBjb3B5IG9mIHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcidzIHByb2ZpbGUuIElmIHRoaXMgcmVxdWVzdCBpcyBzdWNjZXNzZnVsLCB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIgb2JqZWN0IHdpbGwgYmUgb3ZlcndyaXR0ZW4gd2l0aCBhIGZyZXNoIGNvcHkuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBsb2dpbiAgICAgICAgICAgICAgIEEgY29udmVuaWVuY2UgZnVuY3Rpb24gdGhhdCBmaXJzdCBhdXRoZW50aWNhdGVzIHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlciBhbmQgdGhlbiBnb2VzIG9uIHRvIGZldGNoIHRoZWlyIHVzZXIgcHJvZmlsZSwgaWZcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NmdWwuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBsb2dvdXQgICAgICAgICAgICAgIEFuIGFsaWFzIGZvciBkZWF1dGhlbnRpY2F0ZSgpLiBJdCBkb2VzIGV4YWN0bHkgdGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYW1lIHRoaW5nLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gcmVjb3ZlclBhc3N3b3JkICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byBjb21wbGV0ZSB0aGUgcGFzc3dvcmQgcmVjb3ZlcnlcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3Mgc3RhcnRlZCBieSBjYWxsaW5nIGZvcmdvdFBhc3N3b3JkKCkuIFRoZSB1c2VyXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXRzIGEgbmV3IHBhc3N3b3JkIGFuZCBhIHVuaXF1ZSBoYXNoIHNlbnQgdG8gdGhlaXJcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtYWlsIGFjY291bnQgdG8gYXV0aG9yaXplIHRoZSBwYXNzd29yZCBjaGFuZ2UuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSByZWdpc3RlciAgICAgICAgICAgIE1ha2VzIGFuIEFQSSBjYWxsIHRvIHJlZ2lzdGVyIGEgbmV3IHVzZXIgYWNjb3VudC4gVGhlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyIHByb3ZpZGVzIHRoZWlyIGVtYWlsLCBwYXNzd29yZCwgZmlyc3QgbmFtZSwgbGFzdFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSBhbmQgYW4gYXBwLXNwZWNpZmljIG9iamVjdCB0aGF0IGNhbiBzdG9yZSBhbnlcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZGl0aW9uYWwgZGF0YSB0aGF0IHlvdXIgYXBwIHJlcXVpcmVzLiBJZiBlbWFpbFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uIGlzIGVuYWJsZWQgaW4gdGhlIEJyaWRnZSBTZXJ2ZXIsIHRoZW4gYW5cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtYWlsIHdpbGwgYmUgc2VudCB0byB0aGUgdXNlcidzIGVtYWlsIGFkZHJlc3Mgd2l0aCBhXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBVUkwgdG8gZm9sbG93IHRvIGNvbXBsZXRlIHRoZWlyIHJlZ2lzdHJhdGlvbi4gVGhlaXJcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdHJhdGlvbiBpcyBjb21wbGV0ZWQgYnkgY2FsbGluZyB2ZXJpZnlFbWFpbCgpLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gcmVxdWVzdCAgICAgICAgICAgICBUaGlzIGlzIHRoZSBtb3N0IGdlbmVyYWwtcHVycG9zZSBmdW5jdGlvbiBmb3IgbWFraW5nXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBBUEkgY2FsbHMgYXZhaWxhYmxlIHRvIHlvdS4gSXQgdGFrZXMgdGhlIEhUVFAgbWV0aG9kLFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVVJMLCBhbmQgcGF5bG9hZCBvZiB5b3VyIHJlcXVlc3QgYW5kIHRyYW5zbWl0cyBpdC4gWW91XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXQgYSBRIHByb21pc2UgaW4gcmV0dXJuIHRoYXQgeW91IGNhbiB1c2UgdG8gaGFuZGxlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzIGFuZCBmYWlsdXJlIG9mIHlvdXIgcmVxdWVzdCwgd2hhdGV2ZXIgaXQgbWF5XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZS5cclxuICAgKlxyXG4gICAqIEBwcm9wZXJ0eSB7RnVuY3Rpb259IHJlc3VtZSAgICAgICAgICAgICAgTWFrZXMgYW4gQVBJIGNhbGwgdG8gY2hlY2sgaWYgdGhlIHNlc3Npb24gaXNcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0ZWQsIGFuZCBpZiBpdCBpcywgdGhlbiB0aGUgdXNlciBwcm9maWxlIGlzXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkZWQgdG8gcmVzdW1lIHRoZSBzZXNzaW9uLiBJZiB0aGUgdXNlciBwcm9maWxlXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QgaGFzIGJlZW4gbW9kaWZpZWQsIHRoaXMgcmVxdWVzdCB3aWxsIHJlamVjdFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCBhbiBlcnJvciB0byBwcmVzZXJ2ZSBhbnkgY2hhbmdlcyAoc2luY2UgY2hhbmdlc1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVhbiB0aGUgc2Vzc2lvbiBpcyBhbHJlYWR5IHN0YXJ0ZWQpLlxyXG4gICAqXHJcbiAgICogQHByb3BlcnR5IHtGdW5jdGlvbn0gc2F2ZVVzZXIgICAgICAgICAgICBNYWtlcyBhbiBBUEkgY2FsbCB0byBzdWJtaXQgdGhlIGN1cnJlbnQgdXNlciBvYmplY3QgdG9cclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBkYXRhYmFzZSBhcyB0aGUgdXAtdG8tZGF0ZSBjb3B5LiBJZiBzdWNjZXNzZnVsLFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHVzZXIncyBwcm9maWxlIGluIHRoZSBkYXRhYmFzZSB3aWxsIGJlIHVwZGF0ZWQuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSB2ZXJpZnlFbWFpbCAgICAgICAgIE1ha2VzIGFuIEFQSSBjYWxsIHRvIGNvbXBsZXRlIHRoZSByZWdpc3RyYXRpb24gcHJvY2Vzc1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRlZCBieSBjYWxsaW5nIHJlZ2lzdGVyKCkuIFRoZSB1c2VyIG11c3Qgc3VwcGx5IGFcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVuaXF1ZSBoYXNoIHRoYXQgd2FzIHNlbnQgdG8gdGhlaXIgZW1haWwgYWRkcmVzcyBpblxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JkZXIgdG8gdmVyaWZ5IHRoZWlyIGVtYWlsIGFkZHJlc3MgYW5kIGF1dGhvcml6ZSB0aGVcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2YXRpb24gb2YgdGhlaXIgYWNjb3VudCAoaWYgdGhlIEJyaWRnZSBTZXJ2ZXIgaGFzXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbWFpbCB2ZXJpZmljYXRpb24gZW5hYmxlZCkuXHJcbiAgICpcclxuICAgKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBzZW5kUmVxdWVzdCAgICAgICAgIFRoaXMgZnVuY3Rpb24gaXMgdGhlIGxvd2VzdC1sZXZlbCBpbXBsZW1lbnRhdGlvbiBvZlxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgWEhSIGJlaGF2aW91ciB3aXRoaW4gQnJpZGdlLiBCeSBkZWZhdWx0LCBpdCBpc1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlndXJlZCB0byB1c2UgdGhlIFhtbEh0dHBSZXF1ZXN0IG9iamVjdCBpbiBKUyB0b1xyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VuZCByZXF1ZXN0cywgYnV0IGNhbiBiZSBvdmVycmlkZGVuIGJ5IGFub3RoZXJcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG9mIHlvdXIgb3duIGNyZWF0aW9uLCBhcyBsb25nIGFzIGl0IGlzIG9mIHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2FtZSBzaWduYXR1cmUuIFRoaXMgaXMgdXNlZnVsIGlmIHlvdSB3YW50IHRvIG1ha2UgYVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGx1Z2luIGZvciBCcmlkZ2UgdG8gaW50ZXJmYWNlIHdpdGggYW5vdGhlciBsaWJyYXJ5IG9yXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcmFtZXdvcmsgc3VjaCBhcyBBbmd1bGFySlMuXHJcbiAgICpcclxuICAgKi9cclxuICBtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHJcbiAgICAvLyBHZXR0ZXJzL1NldHRlcnMgZm9yIFByb3BlcnRpZXNcclxuICAgIGdldERlYnVnICAgICAgICAgICAgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29yZS5kZWJ1ZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgc2V0RGVidWcgICAgICAgICAgICA6IGZ1bmN0aW9uICggdmFsdWUgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb3JlLmRlYnVnID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgIGdldEVycm9ycyAgICAgICAgICAgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXJyb3JzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICBnZXRJc1VzZXJMb2dnZWRJbiAgIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvcmUuaXNVc2VyTG9nZ2VkSW4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgZ2V0SXNVc2VyTW9kaWZpZWQgICA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3JlLmlzVXNlck1vZGlmaWVkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgIGdldFJlbWVtYmVyTWUgICAgICAgOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29yZS5yZW1lbWJlck1lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICBnZXRVc2VyICAgICAgICAgICAgIDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvcmUudXNlcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG5cclxuICAgIC8vIENhbGxiYWNrc1xyXG4gICAgb25SZXF1ZXN0Q2FsbGVkICAgICA6IGNvcmUub25SZXF1ZXN0Q2FsbGVkLFxyXG5cclxuICAgIC8vIENvbW1hbmRzXHJcbiAgICByZXF1ZXN0ICAgICAgICAgICAgIDogY29yZS5yZXF1ZXN0LFxyXG4gICAgYXV0aGVudGljYXRlICAgICAgICA6IGF1dGhlbnRpY2F0ZSxcclxuICAgIGRlYXV0aGVudGljYXRlICAgICAgOiBkZWF1dGhlbnRpY2F0ZSxcclxuICAgIGZvcmdvdFBhc3N3b3JkICAgICAgOiBmb3Jnb3RQYXNzd29yZCxcclxuICAgIGlzQXV0aGVudGljYXRlZCAgICAgOiBpc0F1dGhlbnRpY2F0ZWQsXHJcbiAgICBsb2FkVXNlciAgICAgICAgICAgIDogbG9hZFVzZXIsXHJcbiAgICBsb2dpbiAgICAgICAgICAgICAgIDogbG9naW4sXHJcbiAgICBsb2dvdXQgICAgICAgICAgICAgIDogbG9nb3V0LFxyXG4gICAgcmVjb3ZlclBhc3N3b3JkICAgICA6IHJlY292ZXJQYXNzd29yZCxcclxuICAgIHJlZ2lzdGVyICAgICAgICAgICAgOiByZWdpc3RlcixcclxuICAgIHJlc3VtZSAgICAgICAgICAgICAgOiByZXN1bWUsXHJcbiAgICBzYXZlVXNlciAgICAgICAgICAgIDogc2F2ZVVzZXIsXHJcbiAgICB2ZXJpZnlFbWFpbCAgICAgICAgIDogdmVyaWZ5RW1haWwsXHJcblxyXG4gICAgLy8gWEhSIEludGVyZmFjZVxyXG4gICAgc2VuZFJlcXVlc3QgICAgICAgICA6IGNvcmUuc2VuZFJlcXVlc3RcclxuXHJcbiAgfTtcclxuXHJcbn0gKSgpO1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgYXV0aGVudGljYXRlXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgQ3J5cHRvRW5jSGV4ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL2VuYy1oZXgnICk7XHJcbnZhciBDcnlwdG9TaGEyNTYgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvc2hhMjU2JyApO1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgYXV0aGVudGljYXRlIFtQT1NUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byB2YWxpZGF0ZSB0aGUgY3VycmVudCBzZXNzaW9uIGJ5IHNlbmRpbmcgYW4gYXV0aG9yaXphdGlvbiBjb29raWVcclxuICogICAgICAgICAgICAgICAgdGhhdCB3aWxsIGlkZW50aWZ5IHRoZSBhdXRoZW50aWNhdGVkIHVzZXIuIFRoZSBjb29raWUgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyXHJcbiAqICAgICAgICAgICAgICAgIHdpbGwgb3BlcmF0ZSB1bmRlciB0aGUgc2FtZSBkb21haW4gcG9saWN5IGFuZCB0aGUgXCJIdHRwT25seVwiIHJlc3RyaWN0aW9uIHRvXHJcbiAqICAgICAgICAgICAgICAgIHByZXZlbnQgWFNTIGF0dGFja3MgZnJvbSBzdGVhbGluZyB1c2VyIGF1dGhlbnRpY2F0aW9uIHRva2VucyBhbmQgbWFzcXVlcmFkaW5nIGFzXHJcbiAqICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0ZWQgdXNlcnMuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXQgZG9lc24ndFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBlbWFpbCAgICAgICAgVGhlIHVzZXIncyBlbWFpbCBhZGRyZXNzLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBwYXNzd29yZCAgICAgVGhlIHVzZXIncyBwYXNzd29yZCAobm90IGhhc2hlZCB5ZXQpLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7Qm9vbGVhbn0gcmVtZW1iZXJNZSAgQSBib29sZWFuIGluZGljYXRpbmcgd2hldGhlciBvciBub3QgdGhlIHVzZXIgd291bGQgbGlrZSB0b1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmUgYXV0b21hdGljYWxseSBsb2dnZWQtaW4gaW4gdGhlIGZ1dHVyZS4gSWYgcmVtZW1iZXJNZSBpc1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0IHRvIGZhbHNlLCB0aGUgYXV0aGVudGljYXRpb24gY29va2llIHNlbnQgYnkgdGhlIHNlcnZlclxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCBleHBpcmUgd2hlbiB0aGUgY3VycmVudCBicm93c2VyIHNlc3Npb24gZW5kcy4gSWYgdGhpc1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXMgc2V0IHRvIHRydWUsIGl0IHdpbGwgZXhwaXJlIGFmdGVyIGEgcGVyaW9kIG9mIHRpbWVcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluZWQgYnkgdGhlIEJyaWRnZSBzZXJ2ZXIgY29uZmlnIGZpbGUgKGRlZmF1bHQgMiB3ZWVrcykuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZSggYXBpVXJsLCBlbWFpbCwgcGFzc3dvcmQsIHJlbWVtYmVyTWUgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgdGhlIHJlcXVlc3QgcGF5bG9hZCAoaGFzaCB0aGUgcGFzc3dvcmQgd2l0aCBTSEEyNTYpLlxyXG4gIHZhciBwYXlsb2FkID0ge1xyXG4gICAgZW1haWw6IGVtYWlsLFxyXG4gICAgcGFzc3dvcmQ6IENyeXB0b1NoYTI1NiggcGFzc3dvcmQudG9TdHJpbmcoKSApLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKSxcclxuICAgIHJlbWVtYmVyTWU6IHJlbWVtYmVyTWVcclxuICB9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBjb3JlLnJlcXVlc3QoICdQT1NUJywgY29yZS5zdHJpcFRyYWlsaW5nU2xhc2goIGFwaVVybCApICsgJy9hdXRoZW50aWNhdGUnLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJBdXRoZW50aWNhdGVcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2V0IHRoZSBzZXNzaW9uIGFzIGJlaW5nIGF1dGhlbnRpY2F0ZWQgYW5kIHN0b3JlIHRoZSBcInJlbWVtYmVyIG1lXCIgc3RhdGUuXHJcbiAgICAgIGNvcmUuaXNBdXRoZW50aWNhdGVkID0gdHJ1ZTtcclxuICAgICAgY29yZS5yZW1lbWJlck1lID0gcmVtZW1iZXJNZTtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmb3JtYXQgaXMgdmFsaWQsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YSBvYmplY3QuXHJcbiAgICAgIGNvcmUucmVzb2x2ZSggXCJBdXRoZW50aWNhdGVcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVqZWN0ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgY29yZS5yZWplY3QoIFwiQXV0aGVudGljYXRlXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgYXV0aGVudGljYXRlXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgZGVhdXRoZW50aWNhdGUgW0RFTEVURV1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gaW52YWxpZGF0ZSB0aGUgY3VycmVudCBzZXNzaW9uIGJ5IGV4cGlyaW5nIHRoZSBhdXRoZW50aWNhdGlvblxyXG4gKiAgICAgICAgICAgICAgICBjb29raWUgdXNlZCBieSB0aGlzIGNsaWVudC4gVGhpcyBpcyBuZWNlc3NhcnkgcmF0aGVyIHRoYW4gc2V0dGluZyB0aGUgYXV0aCBjb29raWVcclxuICogICAgICAgICAgICAgICAgaW4gSmF2YVNjcmlwdCBkaXJlY3RseSBiZWNhdXNlIHRoZSBCcmlkZ2Ugc2VydmVyIGltcG9zZXMgdGhlIFwiSHR0cE9ubHlcIlxyXG4gKiAgICAgICAgICAgICAgICByZXN0cmljdGlvbiB1cG9uIHRoZSBhdXRob3JpemF0aW9uIGNvb2tpZSB0byBwcmV2ZW50IGFuIFhTUyBhdHRhY2sgZnJvbSBoaWphY2tpbmdcclxuICogICAgICAgICAgICAgICAgYSB1c2VyJ3Mgc2Vzc2lvbiB0b2tlbiBhbmQgbWFzcXVlcmFkaW5nIGFzIHRoZSBhdXRoZW50aWNhdGVkIHVzZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXQgZG9lc24ndFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBhdXRoZW50aWNhdGUoIGFwaVVybCApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBCdWlsZCBhbmQgZW1wdHkgcmVxdWVzdCBwYXlsb2FkIChkb24ndCBuZWVkIHRvIHNlbmQgYW55dGhpbmcpLlxyXG4gIHZhciBwYXlsb2FkID0ge307XHJcblxyXG4gIC8vIFNlbmQgdGhlIHJlcXVlc3QgYW5kIGhhbmRsZSB0aGUgcmVzcG9uc2UuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gIGNvcmUucmVxdWVzdCggJ0RFTEVURScsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvZGVhdXRoZW50aWNhdGUnLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJEZWF1dGhlbnRpY2F0ZVwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk1BTEZPUk1FRF9SRVNQT05TRSApICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBSZXNldCB0aGUgc2Vzc2lvbiB0byBjbGVhciBhbGwgdXNlciBkYXRhXHJcbiAgICAgIGNvcmUucmVzZXRTZXNzaW9uKCk7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgZm9ybWF0IGlzIHZhbGlkLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb2JqZWN0LlxyXG4gICAgICBjb3JlLnJlc29sdmUoIFwiRGVhdXRoZW50aWNhdGVcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVqZWN0ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgY29yZS5yZWplY3QoIFwiRGVhdXRoZW50aWNhdGVcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICk7XHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICBmb3Jnb3RQYXNzd29yZFxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGZvcmdvdFBhc3N3b3JkIFtQVVRdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIHNldCB0aGUgdXNlciBpbnRvIHJlY292ZXJ5IHN0YXRlIGZvciBhIHNob3J0IHBlcmlvZCBvZiB0aW1lXHJcbiAqICAgICAgICAgICAgICAgIGFuZCBzZW5kIGFuIGFjY291bnQgcmVjb3ZlcnkgZW1haWwgdG8gdGhlIGVtYWlsIGFjY291bnQgcHJvdmlkZWQgaGVyZS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGVtYWlsICAgIFRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmb3Jnb3RQYXNzd29yZCggYXBpVXJsLCBlbWFpbCApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBCdWlsZCB0aGUgcmVxdWVzdCBwYXlsb2FkLlxyXG4gIHZhciBwYXlsb2FkID0ge1xyXG4gICAgZW1haWw6IGVtYWlsXHJcbiAgfTtcclxuXHJcbiAgLy8gU2VuZCB0aGUgcmVxdWVzdCBhbmQgaGFuZGxlIHRoZSByZXNwb25zZS5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgY29yZS5yZXF1ZXN0KCAnUFVUJywgY29yZS5zdHJpcFRyYWlsaW5nU2xhc2goIGFwaVVybCApICsgJy9mb3Jnb3QtcGFzc3dvcmQnLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0ICB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgdGhlIHN0cnVjdHVyZSBvZiB0aGUgcmVzcG9uc2UsIGFuZCBpZiBpbnZhbGlkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhXHJcbiAgICAgIC8vIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBpcyBtYWxmb3JtZWQuXHJcbiAgICAgIGlmICggdHlwZW9mKCBkYXRhICkgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIGNvcmUucmVqZWN0KCBcIkZvcmdvdCBQYXNzd29yZFwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk1BTEZPUk1FRF9SRVNQT05TRSApICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhLlxyXG4gICAgICBjb3JlLnJlc29sdmUoIFwiRm9yZ290IFBhc3N3b3JkXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVqZWN0ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVxdWVzdCBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIkZvcmdvdCBQYXNzd29yZFwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgYXV0aGVudGljYXRlXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgaXNBdXRoZW50aWNhdGVkIFtHRVRdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIGlmIHRoZSBjbGllbnQgaGFzIGFuIGF1dGhlbnRpY2F0aW9uIGNvb2tpZSBzZXQgdG8gYXV0aGVudGljYXRlIHRoZVxyXG4gKiAgICAgICAgICAgICAgICBjdXJyZW50IHNlc3Npb24uIFRoaXMgY2FuIGJlIGNhbGxlZCB3aGVuIGFuIGFwcGxpY2F0aW9uIGZpcnN0IGxvYWRzIHRvIGNoZWNrIGZvclxyXG4gKiAgICAgICAgICAgICAgICBhbmQgYXV0aCBjb29raWUgdGhhdCBpcyBzdGlsbCB2YWxpZCAodGhlIHVzZXIgY2hvc2UgdGhlIFwicmVtZW1iZXIgbWVcIiBvcHRpb24gYW5kXHJcbiAqICAgICAgICAgICAgICAgIHRoZSBjb29raWUgaGFzIG5vdCB5ZXQgZXhwaXJlZCkuIElmIHRoZSByZXF1ZXN0IGlzIHN1Y2Nlc3NmdWwsIHRoZSBBUEkgc2VydmVyIHdpbGxcclxuICogICAgICAgICAgICAgICAgc2V0IGEgZnJlc2ggYXV0aCBjb29raWUgZm9yIHRoaXMgY2xpZW50LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBdXRoZW50aWNhdGVkKCBhcGlVcmwgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgYW5kIGVtcHR5IHJlcXVlc3QgcGF5bG9hZCAoZG9uJ3QgbmVlZCB0byBzZW5kIGFueXRoaW5nKS5cclxuICB2YXIgcGF5bG9hZCA9IHt9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBjb3JlLnJlcXVlc3QoICdHRVQnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL2lzLWF1dGhlbnRpY2F0ZWQnLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJJcyBBdXRoZW50aWNhdGVkXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTUFMRk9STUVEX1JFU1BPTlNFICkgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNldCB0aGUgc2Vzc2lvbiBhcyBiZWluZyBhdXRoZW50aWNhdGVkLlxyXG4gICAgICBjb3JlLmlzQXV0aGVudGljYXRlZCA9IHRydWU7XHJcblxyXG4gICAgICAvLyBTZXQgXCJyZW1lbWJlciBtZVwiIGNvbmRpdGlvbmFsbHk6IElmIGEgdXNlciBvYmplY3QgZXhpc3RzLCB0aGVuIHRoaXMgaXMgYW4gZXhpc3Rpbmcgc2Vzc2lvblxyXG4gICAgICAvLyBpbiB3aGljaCB0aGUgdXNlciBhdXRoZW50aWNhdGVkIHByZXZpb3VzbHksIHNvIHRoZSB2YWx1ZSBjYW4gYmUgdGFrZW4gZnJvbSBCcmlkZ2UuIElmIG5vdCxcclxuICAgICAgLy8gdGhlbiB0aGlzIGlzIGEgc2Vzc2lvbiBqdXN0IGJlZ2lubmluZywgc28gaWYgaXQgaGFzIGFuIGF1dGggY29va2llIHRoZSB1c2VyIG11c3QgaGF2ZSBzZXRcclxuICAgICAgLy8gdGhlIFwicmVtZW1iZXIgbWVcIiBmbGFnIHByZXZpb3VzbHkuXHJcbiAgICAgIGNvcmUucmVtZW1iZXJNZSA9ICggY29yZS51c2VyICkgPyBjb3JlLnJlbWVtYmVyTWUgOiB0cnVlO1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZvcm1hdCBpcyB2YWxpZCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9iamVjdC5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIklzIEF1dGhlbnRpY2F0ZWRcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVqZWN0ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gUmVzZXQgdGhlIHNlc3Npb24gdG8gY2xlYXIgYWxsIHVzZXIgZGF0YS5cclxuICAgICAgY29yZS5yZXNldFNlc3Npb24oKTtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIklzIEF1dGhlbnRpY2F0ZWRcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICk7XHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICBnZXRVc2VyUHJvZmlsZVxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIGxvYWRVc2VyIFtHRVRdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIGZldGNoIHRoZSBjdXJyZW50IGNvcHkgb2YgdGhlIGN1cnJlbnRseSBsb2dnZWQtaW4gdXNlcidzIHByb2ZpbGVcclxuICogICAgICAgICAgICAgICAgZnJvbSB0aGUgZGF0YWJhc2UgYW5kIHNldCBpdCBhcyBCcmlkZ2UncyB1c2VyIHByb2ZpbGUgb2JqZWN0LiBUaGlzIFdJTEwgb3ZlcndyaXRlXHJcbiAqICAgICAgICAgICAgICAgIGFueSB1bnNhdmVkIGNoYW5nZXMgdG8gdGhlIGV4aXN0aW5nIHVzZXIgcHJvZmlsZSBvYmplY3QuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXQgZG9lc24ndFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7Qm9vbGVhbn0gb3ZlcndyaXRlICAgQSBmbGFnIGluZGljYXRpbmcgdGhhdCwgaW4gdGhlIGV2ZW50IHRoYXQgdGhpcyBsb2FkVXNlcigpXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsIHdpbGwgb3ZlcndyaXRlIHVuc2F2ZWQgY2hhbmdlcyBvbiB0aGUgY2xpZW50LCB0aGVcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbiB3aWxsIGJlIGNhcnJpZWQgb3V0IHJhdGhlciB0aGFuIHJlamVjdGluZyB3aXRoIGFuXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvciB0byB3YXJuIG9mIHRoZSBvdmVyd3JpdGUuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGxvYWRVc2VyKCBhcGlVcmwsIG92ZXJ3cml0ZSApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBDaGVjayBmb3IgdW5zYXZlZCBjaGFuZ2VzIHRoYXQgbWlnaHQgYmUgb3ZlcndyaXR0ZW4gYW5kIHJlamVjdCB3aXRoIGEgbmV3IGVycm9yIGluZGljYXRpbmcgdGhhdFxyXG4gIC8vIHRoZXNlIGNoYW5nZXMgd2lsbCBiZSBsb3N0ICh1bmxlc3MgdGhlIG92ZXJ3cml0ZSBmbGFnIGlzIHNldCkuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gIGlmICggIW92ZXJ3cml0ZSAmJiBjb3JlLmlzVXNlck1vZGlmaWVkKCkgKSB7XHJcbiAgICBjb3JlLnJlamVjdCggXCJMb2FkIFVzZXJcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5XSUxMX0xPU0VfVU5TQVZFRF9DSEFOR0VTICkgKTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgLy8gQnVpbGQgYW5kIGVtcHR5IHJlcXVlc3QgcGF5bG9hZCAoZG9uJ3QgbmVlZCB0byBzZW5kIGFueXRoaW5nKS5cclxuICB2YXIgcGF5bG9hZCA9IHt9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIGNvcmUucmVxdWVzdCggJ0dFVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvdXNlcicsIHBheWxvYWQgKS50aGVuKFxyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgdGhlIHN0cnVjdHVyZSBvZiB0aGUgcmVzcG9uc2UsIGFuZCBpZiBpbnZhbGlkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhXHJcbiAgICAgIC8vIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBpcyBtYWxmb3JtZWQuXHJcbiAgICAgIGlmICggISggZGF0YSBpbnN0YW5jZW9mIE9iamVjdCApICkge1xyXG4gICAgICAgIGNvcmUucmVqZWN0KCBcIkxvYWQgVXNlclwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk1BTEZPUk1FRF9SRVNQT05TRSApICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBc3NpZ24gdGhlIHVzZXIgcHJvZmlsZSBhcyB0aGUgdXNlciBvYmplY3QuXHJcbiAgICAgIC8vIE5vdGU6IEpTT04gc3RyaW5naWZ5KClpbmcgdGhlIHVzZXIgcHJvZmlsZSBrZWVwcyBhIHN0YXRpYyBjb3B5IHdlIGNhbiBjb21wYXJlIGFnYWluc3QuXHJcbiAgICAgIGNvcmUudXNlciA9IGRhdGE7XHJcbiAgICAgIGNvcmUudW5jaGFuZ2VkVXNlciA9IEpTT04uc3RyaW5naWZ5KCBkYXRhICk7XHJcblxyXG4gICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgZm9ybWF0IGlzIHZhbGlkLCByZXNvbHZlIHRoZSByZXF1ZXN0IHdpdGggdGhlIHJlc3BvbnNlIGRhdGEgb2JqZWN0LlxyXG4gICAgICBjb3JlLnJlc29sdmUoIFwiTG9hZCBVc2VyXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXNwb25zZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIkxvYWQgVXNlclwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGxvZ2luXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG52YXIgYXV0aGVudGljYXRlID0gcmVxdWlyZSggJy4uL2NvbW1hbmRzL2F1dGhlbnRpY2F0ZScgKTtcclxudmFyIGxvYWRVc2VyID0gcmVxdWlyZSggJy4uL2NvbW1hbmRzL2xvYWRVc2VyJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgbG9naW4gW2F1dGhlbnRpY2F0ZSA+PiBsb2FkVXNlcl1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gYXV0aGVudGljYXRlIHRoZSB1c2VyIGdpdmVuIHRoZWlyIGVtYWlsIGFuZCBwYXNzd29yZCwgYW5kXHJcbiAqICAgICAgICAgICAgICAgIGZvbGxvdyB0aGUgYXV0aGVudGljYXRpb24gKGlmIHN1Y2Nlc3NmdWwpIHdpdGggYSByZXF1ZXN0IGZvciB0aGUgdXNlcidzIHByb2ZpbGUuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXQgZG9lc24ndFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBlbWFpbCAgICAgICAgVGhlIHVzZXIncyBlbWFpbCBhZGRyZXNzLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBwYXNzd29yZCAgICAgVGhlIHVzZXIncyBwYXNzd29yZCAobm90IGhhc2hlZCB5ZXQpLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7Qm9vbGVhbn0gcmVtZW1iZXJNZSAgQSBib29sZWFuIGluZGljYXRpbmcgd2hldGhlciBvciBub3QgdGhlIHVzZXIgd291bGQgbGlrZSB0b1xyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGF2ZSBhIGxvbmcgZXhwaXJ5IGRhdGUgb3Igbm90LiBJZiB0aGlzIGlzIHRydWUsIHRoZW4gdGhlXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBCcmlkZ2Ugc2VydmVyIHdpbGwgcmV0dXJuIGFuIGF1dGggdG9rZW4gd2l0aCBhbiBleHBpcnlcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uIHRoZSBvcmRlciBvZiAyIHdlZWtzIChidXQgY2FuIGJlIG1vZGlmaWVkIGluIHRoZSBzZXJ2ZXJcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzKS4gSWYgZmFsc2UsIHRoZSBleHBpcnkgd2lsbCBvbmx5IGJlIGFib3V0IDZcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvdXJzIChhZ2FpbiwgdGhpcyBpcyBjb25maWd1cmFibGUpLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBsb2dpbiggYXBpVXJsLCBlbWFpbCwgcGFzc3dvcmQsIHJlbWVtYmVyTWUgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gU2VuZCBhbiBhdXRoZW50aWNhdGlvbiByZXF1ZXN0LlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBhdXRoZW50aWNhdGUoIGFwaVVybCwgZW1haWwsIHBhc3N3b3JkLCByZW1lbWJlck1lICkudGhlbihcclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGUgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gSWYgYXV0aGVudGljYXRpb24gd2FzIHN1Y2Nlc3NmdWwsIHNlbmQgYSByZXF1ZXN0IHRvIGZldGNoIHRoZSB1c2VyJ3MgcHJvZmlsZS5cclxuICAgICAgbG9hZFVzZXIoIGFwaVVybCApLnRoZW4oXHJcbiAgICAgICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgICAgIC8vIElmIGZldGNoaW5nIHRoZSB1c2VyIHByb2ZpbGUgaXMgc3VjY2Vzc2Z1bCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhLlxyXG4gICAgICAgICAgY29yZS5yZXNvbHZlKCBcIkxvZ2luXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgICAgICAvLyBJZiBmZXRjaGluZyB0aGUgdXNlciBwcm9maWxlIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdC5cclxuICAgICAgICAgIGNvcmUucmVqZWN0KCBcIkxvZ2luXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRlIHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiBhdXRoZW50aWNhdGlvbiBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QgcGFzc2VkIHVwIGZyb20gYmVsb3cuXHJcbiAgICAgIGNvcmUucmVqZWN0KCBcIkxvZ2luXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICk7XHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICBsb2dpblxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIGRlYXV0aGVudGljYXRlID0gcmVxdWlyZSggJy4uL2NvbW1hbmRzL2RlYXV0aGVudGljYXRlJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgbG9nb3V0IFtkZWF1dGhlbnRpY2F0ZSAoYWxpYXMpXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byBpbnZhbGlkYXRlIHRoZSBjdXJyZW50IHNlc3Npb24gYnkgZXhwaXJpbmcgdGhlIGF1dGhlbnRpY2F0aW9uXHJcbiAqICAgICAgICAgICAgICAgIGNvb2tpZSB1c2VkIGJ5IHRoaXMgY2xpZW50LiBUaGlzIGZ1bmN0aW9uIGlzIG1lcmVseSBhbiBhbGlhcyBmb3IgZGVhdXRoZW50aWNhdGUoKVxyXG4gKiAgICAgICAgICAgICAgICBzdWNoIHRoYXQgbG9naW4gYW5kIGxvZ291dCBmb3JtIGEgbG9naWNhbCBwYWlyIG9mIG9wZXJhdGlvbnMgZm9yIEFQSSBjb25zaXN0ZW5jeS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgICAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXR0ZXIgd2hldGhlciB0aGUgdHJhaWxpbmcgZm9yd2FyZC1zbGFzaCBpcyBsZWZ0IG9uIG9yIG5vdFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGRlYXV0aGVudGljYXRlO1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgcmVjb3ZlclBhc3N3b3JkXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgQ3J5cHRvRW5jSGV4ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL2VuYy1oZXgnICk7XHJcbnZhciBDcnlwdG9TaGEyNTYgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvc2hhMjU2JyApO1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgcmVjb3ZlclBhc3N3b3JkIFtQVVRdXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFzayB0aGUgc2VydmVyIHRvIHNldCB0aGUgcGFzc3dvcmQgb2YgdGhlIHVzZXIgYWNjb3VudCBhc3NvY2lhdGVkIHdpdGggdGhlXHJcbiAqICAgICAgICAgICAgICAgIHByb3ZpZGVkIHJlY292ZXJ5IGhhc2ggdGhhdCB3YXMgc2VudCB0byB0aGUgdXNlcidzIGVtYWlsIGFkZHJlc3MuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGFwaVVybCAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXR0ZXIgd2hldGhlciB0aGUgdHJhaWxpbmcgZm9yd2FyZC1zbGFzaCBpcyBsZWZ0IG9uIG9yIG5vdFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgZWl0aGVyIGNhc2UgaXMgaGFuZGxlZCBhcHByb3ByaWF0ZWx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBwYXNzd29yZCAgIEEgbmV3IHBhc3N3b3JkIHRvIGFzc2lnbiBmb3IgdGhlIHVzZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGhhc2ggICAgICAgVGhlIGhhc2ggc3RyaW5nIHRoYXQgd2FzIHNlbnQgdG8gdGhlIHVzZXIgaW4gdGhlIHBhc3N3b3JkXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3ZlcnkgZW1haWwuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByZWNvdmVyUGFzc3dvcmQoIGFwaVVybCwgcGFzc3dvcmQsIGhhc2ggKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8gQnVpbGQgdGhlIHJlcXVlc3QgcGF5bG9hZCAoaGFzaCB0aGUgcGFzc3dvcmQgd2l0aCBTSEEyNTYpLlxyXG4gIHZhciBwYXlsb2FkID0ge1xyXG4gICAgaGFzaDogaGFzaCxcclxuICAgIHBhc3N3b3JkOiBDcnlwdG9TaGEyNTYoIHBhc3N3b3JkLnRvU3RyaW5nKCkgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4IClcclxuICB9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIHZhciBkZWZlcnJlZCA9IFEuZGVmZXIoKTtcclxuICBjb3JlLnJlcXVlc3QoICdQVVQnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL3JlY292ZXItcGFzc3dvcmQnLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0ICB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgdGhlIHN0cnVjdHVyZSBvZiB0aGUgcmVzcG9uc2UsIGFuZCBpZiBpbnZhbGlkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhXHJcbiAgICAgIC8vIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBpcyBtYWxmb3JtZWQuXHJcbiAgICAgIGlmICggdHlwZW9mKCBkYXRhICkgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIGNvcmUucmVqZWN0KCBcIlJlY292ZXIgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIlJlY292ZXIgUGFzc3dvcmRcIiwgZGVmZXJyZWQsIGRhdGEgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIHRoZSByZXF1ZXN0IGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgY29yZS5yZWplY3QoIFwiUmVjb3ZlciBQYXNzd29yZFwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgcmVnaXN0ZXJcclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBDcnlwdG9FbmNIZXggPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9jcnlwdG8tanMvZW5jLWhleCcgKTtcclxudmFyIENyeXB0b1NoYTI1NiA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL2NyeXB0by1qcy9zaGEyNTYnICk7XHJcbnZhciBRID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvcScgKTtcclxudmFyIGNvcmUgPSByZXF1aXJlKCAnLi4vY29yZScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcbnZhciBsb2dpbiA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9sb2dpbicgKTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBmdW5jdGlvbiAgICAgIHJlZ2lzdGVyIFtQT1NUIHVzZXJzID4+IGxvZ2luXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byByZWdpc3RlciBhIHVzZXIgd2l0aCB0aGUgZ2l2ZW4gZW1haWwvcGFzc3dvcmQgcGFpciwgbmFtZSwgYW5kXHJcbiAqICAgICAgICAgICAgICAgIGFwcGxpY2F0aW9uLXNwZWNpZmljIGRhdGEuIFRoZSBwYXNzd29yZCBpcyB0cmFuc21pdHRlZCBpbiB0aGUgY29udGVudCBvZiB0aGVcclxuICogICAgICAgICAgICAgICAgbWVzc2FnZSBTSEEtMjU2IGVuY3J5cHRlZCB0byBwcm90ZWN0IHRoZSB1c2VyJ3MgcGFzc3dvcmQgdG8gYSBtaW5pbWFsIGV4dGVudFxyXG4gKiAgICAgICAgICAgICAgICBldmVuIHVuZGVyIGluc2VjdXJlIGNvbm5lY3Rpb25zLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcGlVcmwgICAgICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzIGxlZnQgb24gb3Igbm90XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGVpdGhlciBjYXNlIGlzIGhhbmRsZWQgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gZW1haWwgICAgICAgIFRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gcGFzc3dvcmQgICAgIFRoZSB1c2VyJ3MgcGFzc3dvcmQgKG5vdCB5ZXQgaGFzaGVkKS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gZmlyc3ROYW1lICAgIFRoZSB1c2VyJ3MgZmlyc3QgbmFtZS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gbGFzdE5hbWUgICAgIFRoZSB1c2VyJ3MgbGFzdCBuYW1lLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBhcHBEYXRhICAgICAgQSBKU09OLnN0cmluZ2lmeSgpZWQgSmF2YVNjcmlwdCBvYmplY3Qgb2YgYW55IGFwcGxpY2F0aW9uLVxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3BlY2lmaWMgZGF0YSB0byBzdG9yZSBmb3IgdGhpcyB1c2VyLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcmVnaXN0ZXIoIGFwaVVybCwgZW1haWwsIHBhc3N3b3JkLCBmaXJzdE5hbWUsIGxhc3ROYW1lLCBhcHBEYXRhICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIENoZWNrIGZvciBpbnZhbGlkIHBhc3N3b3JkIGZvcm1hdCBhbmQgcmVqZWN0IGl0IHdpdGggYSBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgd2h5IHRoZVxyXG4gIC8vIHBhc3N3b3JkIHdhcyBub3QgYWNjZXB0YWJsZS5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcblxyXG4gIGlmICggdHlwZW9mIHBhc3N3b3JkICE9PSAnc3RyaW5nJyApIHtcclxuICAgIGNvcmUucmVqZWN0KCBcIlJlZ2lzdGVyXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCAwICkgKTtcclxuICB9XHJcblxyXG4gIGlmICggcGFzc3dvcmQubGVuZ3RoIDwgMSApIHtcclxuICAgIGNvcmUucmVqZWN0KCBcIlJlZ2lzdGVyXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuUEFTU1dPUkRfVE9PX1NIT1JUICkgKTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgLy8gQnVpbGQgdGhlIHJlcXVlc3QgcGF5bG9hZCAoaGFzaCB0aGUgcGFzc3dvcmQgd2l0aCBTSEEyNTYpLlxyXG4gIHZhciBwYXlsb2FkID0ge1xyXG4gICAgYXBwRGF0YTogYXBwRGF0YSxcclxuICAgIGVtYWlsOiBlbWFpbCxcclxuICAgIGZpcnN0TmFtZTogZmlyc3ROYW1lLFxyXG4gICAgbGFzdE5hbWU6IGxhc3ROYW1lLFxyXG4gICAgcGFzc3dvcmQ6IENyeXB0b1NoYTI1NiggcGFzc3dvcmQudG9TdHJpbmcoKSApLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKSxcclxuICB9O1xyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIGNvcmUucmVxdWVzdCggJ1BPU1QnLCBjb3JlLnN0cmlwVHJhaWxpbmdTbGFzaCggYXBpVXJsICkgKyAnL3VzZXInLCBwYXlsb2FkICkudGhlbihcclxuXHJcbiAgICAvLyBSZXF1ZXN0IHdhcyByZXNvbHZlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgdGhlIHN0cnVjdHVyZSBvZiB0aGUgcmVzcG9uc2UsIGFuZCBpZiBpbnZhbGlkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhXHJcbiAgICAgIC8vIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBpcyBtYWxmb3JtZWQuXHJcbiAgICAgIGlmICggdHlwZW9mKCBkYXRhICkgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIGNvcmUucmVqZWN0KCBcIlJlZ2lzdGVyXCIsIGRlZmVycmVkLCBuZXcgZXJyb3JzLkJyaWRnZUVycm9yKCBlcnJvcnMuTUFMRk9STUVEX1JFU1BPTlNFICkgKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIElmIHRoZSB1c2VyIGxvZ2luIGlzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIlJlZ2lzdGVyXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgLy8gUmVxdWVzdCB3YXMgcmVqZWN0ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiByZWdpc3RyYXRpb24gZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJSZWdpc3RlclwiLCBkZWZlcnJlZCwgZXJyb3IgKTtcclxuXHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICApO1xyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG4iLCIvKipcclxuICogQG1vZHVsZSAgbG9naW5cclxuICovXHJcbi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBRID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvcScgKTtcclxudmFyIGNvcmUgPSByZXF1aXJlKCAnLi4vY29yZScgKTtcclxudmFyIGVycm9ycyA9IHJlcXVpcmUoICcuLi9lcnJvcnMnICk7XHJcbnZhciBpc0F1dGhlbnRpY2F0ZWQgPSByZXF1aXJlKCAnLi4vY29tbWFuZHMvaXNBdXRoZW50aWNhdGVkJyApO1xyXG52YXIgbG9hZFVzZXIgPSByZXF1aXJlKCAnLi4vY29tbWFuZHMvbG9hZFVzZXInICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICByZXN1bWUgW2lzQXV0aGVudGljYXRlZCA+PiBsb2FkVXNlcl1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQ2hlY2sgaWYgdGhlIGN1cnJlbnQgdXNlciBpcyBhdXRoZW50aWNhdGVkLCBhbmQgaWYgdGhleSBhcmUsIHRoZW4gY2hlY2sgaWYgdGhlXHJcbiAqICAgICAgICAgICAgICAgIHVzZXIgcHJvZmlsZSBvYmplY3QgaGFzIGJlZW4gbW9kaWZpZWQuIElmIGl0IGhhc24ndCBiZWVuLCBsb2FkIHRoZSB1c2VyIHByb2ZpbGVcclxuICogICAgICAgICAgICAgICAgdG8gcmVzdG9yZSB0aGUgc2Vzc2lvbi5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgICAgIFRoZSBiYXNlIFVSTCBvZiB0aGUgQVBJIHRvIHNlbmQgdGhpcyByZXF1ZXN0IHRvLiBJdCBkb2Vzbid0XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXR0ZXIgd2hldGhlciB0aGUgdHJhaWxpbmcgZm9yd2FyZC1zbGFzaCBpcyBsZWZ0IG9uIG9yIG5vdFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJlc3VtZSggYXBpVXJsICkge1xyXG5cclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8vIFNlbmQgYW4gYXV0aGVudGljYXRpb24gcmVxdWVzdC5cclxuICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgaXNBdXRoZW50aWNhdGVkKCBhcGlVcmwgKS50aGVuKFxyXG5cclxuICAgIC8vIElzIEF1dGhlbnRpY2F0ZSB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGRhdGEgKSB7XHJcblxyXG4gICAgICAvLyBPdGhlcndpc2UsIHNlbmQgYSByZXF1ZXN0IHRvIGZldGNoIHRoZSB1c2VyJ3MgcHJvZmlsZS5cclxuICAgICAgbG9hZFVzZXIoIGFwaVVybCApLnRoZW4oXHJcbiAgICAgICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgICAgIC8vIElmIGZldGNoaW5nIHRoZSB1c2VyIHByb2ZpbGUgaXMgc3VjY2Vzc2Z1bCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhLlxyXG4gICAgICAgICAgY29yZS5yZXNvbHZlKCBcIlJlc3VtZVwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAgICAgLy8gSWYgZmV0Y2hpbmcgdGhlIHVzZXIgcHJvZmlsZSBmYWlsZWQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIHRoZSBlcnJvciBvYmplY3QuXHJcbiAgICAgICAgICBjb3JlLnJlamVjdCggXCJSZXN1bWVcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuXHJcbiAgICB9LFxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGUgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgIC8vIElmIGF1dGhlbnRpY2F0aW9uIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdCBwYXNzZWQgdXAgZnJvbSBiZWxvdy5cclxuICAgICAgY29yZS5yZWplY3QoIFwiUmVzdW1lXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICk7XHJcbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBAbW9kdWxlICB1cGRhdGVVc2VyUHJvZmlsZVxyXG4gKi9cclxuLyogZ2xvYmFsIGV4cG9ydHM6IHRydWUgKi9cclxudmFyIENyeXB0b0VuY0hleCA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL2NyeXB0by1qcy9lbmMtaGV4JyApO1xyXG52YXIgQ3J5cHRvU2hhMjU2ID0gcmVxdWlyZSggJy4uL2luY2x1ZGUvY3J5cHRvLWpzL3NoYTI1NicgKTtcclxudmFyIFEgPSByZXF1aXJlKCAnLi4vaW5jbHVkZS9xJyApO1xyXG52YXIgY29yZSA9IHJlcXVpcmUoICcuLi9jb3JlJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4uL2Vycm9ycycgKTtcclxudmFyIGF1dGhlbnRpY2F0ZSA9IHJlcXVpcmUoICcuLi9jb21tYW5kcy9hdXRoZW50aWNhdGUnICk7XHJcblxyXG4vKipcclxuICpcclxuICogQHB1YmxpY1xyXG4gKlxyXG4gKiBAZnVuY3Rpb24gICAgICBzYXZlVXNlciBbUFVUXVxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb24gICBBc2sgdGhlIHNlcnZlciB0byBzYXZlIHRoZSB1c2VyIHByb2ZpbGUgb2YgdGhlIGN1cnJlbnRseSBsb2dnZWQtaW4gdXNlciB0byB0aGVcclxuICogICAgICAgICAgICAgICAgQVBJIHNlcnZlcidzIGRhdGFiYXNlLiBUaGlzIG9wZXJhdGlvbiByZXF1aXJlcyB0aGUgdXNlcidzIGN1cnJlbnQgcGFzc3dvcmQgdG8gYmVcclxuICogICAgICAgICAgICAgICAgc3VwcGxpZWQgdG8gcmUtYXV0aGVudGljYXRlIHRoZSB1c2VyIGlmIHRoZXkgaW50ZW5kIHRvIGNoYW5nZSB0aGVpciBwYXNzd29yZC5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgICAgICAgICBUaGUgYmFzZSBVUkwgb2YgdGhlIEFQSSB0byBzZW5kIHRoaXMgcmVxdWVzdCB0by4gSXRcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2Vzbid0IG1hdHRlciB3aGV0aGVyIHRoZSB0cmFpbGluZyBmb3J3YXJkLXNsYXNoIGlzXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdCBvbiBvciBub3QgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwcm9wcmlhdGVseS5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gY3VycmVudFBhc3N3b3JkICBbT1BUSU9OQUxdIFRoZSB1c2VyJ3MgY3VycmVudCBwYXNzd29yZCAobm90IHlldCBoYXNoZWQpLFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIHRoZXkgd291bGQgbGlrZSB0byBjaGFuZ2UgdGhlaXIgcGFzc3dvcmQuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IG5ld1Bhc3N3b3JkICAgICAgW09QVElPTkFMXSBUaGUgcGFzc3dvcmQgdGhlIHVzZXIgd291bGQgbGlrZSB0byBjaGFuZ2UgdG9cclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAobm90IHlldCBoYXNoZWQpLlxyXG4gKlxyXG4gKiBAcmV0dXJucyAgICAgICB7UHJvbWlzZX0gICAgICAgICAgICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2F2ZVVzZXIoIGFwaVVybCwgY3VycmVudFBhc3N3b3JkLCBuZXdQYXNzd29yZCApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBDaGVjayB0aGF0IHRoZSB1c2VyIG9iamVjdCBpcyBzZXQsIGJlY2F1c2Ugd2Ugd2lsbCBuZWVkIHRvIGFjY2VzcyBpdHMgcHJvcGVydGllcy5cclxuICAvLyBJZiBpdCBpc24ndCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYSBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCBubyB1c2VyIG9iamVjdCBpcyBzZXQuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgICBpZiAoICFjb3JlLnVzZXIgKSB7XHJcbiAgICBjb3JlLnJlamVjdCggXCJTYXZlIFVzZXJcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5OT19VU0VSX1BST0ZJTEUgKSApO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBmb3IgaW52YWxpZCBwYXNzd29yZCBmb3JtYXQgYW5kIHJlamVjdCBpdCB3aXRoIGEgbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHdoeSB0aGVcclxuICAvLyBwYXNzd29yZCB3YXMgbm90IGFjY2VwdGFibGUuXHJcbiAgaWYgKCBjdXJyZW50UGFzc3dvcmQgJiYgbmV3UGFzc3dvcmQgJiYgbmV3UGFzc3dvcmQubGVuZ3RoID4gNiApIHtcclxuICAgIGNvcmUucmVqZWN0KCBcIlNhdmUgVXNlclwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLlBBU1NXT1JEX1RPT19TSE9SVCApICk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxuICB9XHJcblxyXG4gIC8vIFNldCB0aGUgcGF5bG9hZCB0byB0aGUgdXNlciBwcm9maWxlIG9iamVjdCwgYW5kIGluY2x1ZGUgdGhlIGN1cnJlbnQgYW5kIG5ldyBwYXNzd29yZHMgYXNcclxuICAvLyBhZGRpdGlvbmFsIHByb3BlcnRpZXMgaWYgdGhlIHVzZXIgaW50ZW5kIHRvIGNoYW5nZSB0aGVpciBwYXNzd29yZC5cclxuICB2YXIgcGF5bG9hZCA9IGNvcmUudXNlcjtcclxuICBpZiAoIGN1cnJlbnRQYXNzd29yZCAmJiBuZXdQYXNzd29yZCApIHtcclxuICAgIHBheWxvYWQuY3VycmVudFBhc3N3b3JkID0gQ3J5cHRvU2hhMjU2KCBjdXJyZW50UGFzc3dvcmQudG9TdHJpbmcoKSApLnRvU3RyaW5nKCBDcnlwdG9FbmNIZXggKTtcclxuICAgIHBheWxvYWQucGFzc3dvcmQgPSBDcnlwdG9TaGEyNTYoIG5ld1Bhc3N3b3JkLnRvU3RyaW5nKCkgKS50b1N0cmluZyggQ3J5cHRvRW5jSGV4ICk7XHJcbiAgfVxyXG5cclxuICAvLyBTZW5kIHRoZSByZXF1ZXN0IGFuZCBoYW5kbGUgdGhlIHJlc3BvbnNlLlxyXG4gIGNvcmUucmVxdWVzdCggJ1BVVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvdXNlcicsIHBheWxvYWQgKS50aGVuKFxyXG4gICAgZnVuY3Rpb24gKCBkYXRhICkge1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgdGhlIHN0cnVjdHVyZSBvZiB0aGUgcmVzcG9uc2UsIGFuZCBpZiBpbnZhbGlkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhXHJcbiAgICAgIC8vIG5ldyBlcnJvciBvYmplY3QgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBpcyBtYWxmb3JtZWQuXHJcbiAgICAgIGlmICggdHlwZW9mKCBkYXRhICkgIT09ICdzdHJpbmcnICkge1xyXG4gICAgICAgIGNvcmUucmVqZWN0KCBcIlNhdmUgVXNlclwiLCBkZWZlcnJlZCwgbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLk1BTEZPUk1FRF9SRVNQT05TRSApICk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBJZiB1cGRhdGluZyB0aGUgdXNlciBwcm9maWxlIGlzIHN1Y2Nlc3NmdWwsIHVwZGF0ZSB0aGUgdW5jaGFuZ2VkIHVzZXIgdG8gbWF0Y2ggYW5kXHJcbiAgICAgIC8vIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS51bmNoYW5nZWRVc2VyID0gSlNPTi5zdHJpbmdpZnkoIGNvcmUudXNlciApO1xyXG4gICAgICBjb3JlLnJlc29sdmUoIFwiU2F2ZSBVc2VyXCIsIGRlZmVycmVkLCBkYXRhICk7XHJcblxyXG4gICAgfSxcclxuICAgIGZ1bmN0aW9uICggZXJyb3IgKSB7XHJcblxyXG4gICAgICAvLyBJZiB1cGRhdGluZyB0aGUgdXNlciBwcm9maWxlIGZhaWxlZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggdGhlIGVycm9yIG9iamVjdC5cclxuICAgICAgY29yZS5yZWplY3QoIFwiU2F2ZSBVc2VyXCIsIGRlZmVycmVkLCBlcnJvciApO1xyXG5cclxuICAgIH1cclxuICApO1xyXG5cclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIHZlcmlmeUVtYWlsXHJcbiAqL1xyXG4vKiBnbG9iYWwgZXhwb3J0czogdHJ1ZSAqL1xyXG52YXIgUSA9IHJlcXVpcmUoICcuLi9pbmNsdWRlL3EnICk7XHJcbnZhciBjb3JlID0gcmVxdWlyZSggJy4uL2NvcmUnICk7XHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgdmVyaWZ5RW1haWwgW1BVVF1cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgQXNrIHRoZSBzZXJ2ZXIgdG8gbWFyayBhIHVzZXIncyBhY2NvdW50IGhhcyBoYXZpbmcgYSB2ZXJpZmllZCBlbWFpbCBhZGRyZXNzXHJcbiAqICAgICAgICAgICAgICAgIGJ5IGxvb2tpbmcgdXAgdGhlaXIgYWNjb3VudCB1c2luZyB0aGUgcHJvdmlkZWQgYWNjb3VudCB2ZXJpZmljYXRpb24gaGFzaCB0aGF0XHJcbiAqICAgICAgICAgICAgICAgIHdhcyBzZW50IHRvIHRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gYXBpVXJsICAgVGhlIGJhc2UgVVJMIG9mIHRoZSBBUEkgdG8gc2VuZCB0aGlzIHJlcXVlc3QgdG8uIEl0IGRvZXNuJ3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0dGVyIHdoZXRoZXIgdGhlIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggaXMgbGVmdCBvbiBvciBub3RcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVjYXVzZSBlaXRoZXIgY2FzZSBpcyBoYW5kbGVkIGFwcHJvcHJpYXRlbHkuXHJcbiAqXHJcbiAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IGhhc2ggICAgIFRoZSBoYXNoIHN0cmluZyB0aGF0IHdhcyBzZW50IHRvIHRoZSB1c2VyIGluIHRoZSBhY2NvdW50XHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbiBlbWFpbC5cclxuICpcclxuICogQHJldHVybnMgICAgICAge1Byb21pc2V9ICAgICAgIEEgcS5qcyBwcm9taXNlIG9iamVjdC5cclxuICpcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdmVyaWZ5RW1haWwoIGFwaVVybCwgaGFzaCApIHtcclxuXHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvLyBCdWlsZCB0aGUgcmVxdWVzdCBwYXlsb2FkLlxyXG4gIHZhciBwYXlsb2FkID0ge1xyXG4gICAgaGFzaDogaGFzaFxyXG4gIH07XHJcblxyXG4gIC8vIFNlbmQgdGhlIHJlcXVlc3QgYW5kIGhhbmRsZSB0aGUgcmVzcG9uc2UuXHJcbiAgdmFyIGRlZmVycmVkID0gUS5kZWZlcigpO1xyXG4gIGNvcmUucmVxdWVzdCggJ1BVVCcsIGNvcmUuc3RyaXBUcmFpbGluZ1NsYXNoKCBhcGlVcmwgKSArICcvdmVyaWZ5LWVtYWlsJywgcGF5bG9hZCApLnRoZW4oXHJcblxyXG4gICAgLy8gUmVxdWVzdCAgd2FzIHJlc29sdmVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHRoZSBzdHJ1Y3R1cmUgb2YgdGhlIHJlc3BvbnNlLCBhbmQgaWYgaW52YWxpZCwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYVxyXG4gICAgICAvLyBuZXcgZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLlxyXG4gICAgICBpZiAoIHR5cGVvZiggZGF0YSApICE9PSAnc3RyaW5nJyApIHtcclxuICAgICAgICBjb3JlLnJlamVjdCggXCJWZXJpZnkgRW1haWxcIiwgZGVmZXJyZWQsIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UgZGF0YS5cclxuICAgICAgY29yZS5yZXNvbHZlKCBcIlZlcmlmeSBFbWFpbFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgIH0sXHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIC8vIFJlcXVlc3Qgd2FzIHJlamVjdGVkIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICBmdW5jdGlvbiAoIGVycm9yICkge1xyXG5cclxuICAgICAgLy8gSWYgdGhlIHJlcXVlc3QgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICBjb3JlLnJlamVjdCggXCJWZXJpZnkgRW1haWxcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgfVxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuXHJcbiAgKTtcclxuICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGNvcmVcclxuICovXHJcbnZhciBRID0gcmVxdWlyZSggJy4vaW5jbHVkZS9xJyApO1xyXG52YXIgZXJyb3JzID0gcmVxdWlyZSggJy4vZXJyb3JzLmpzJyApO1xyXG5cclxuLy8gSW5jbHVkZSB0aGUgc2VuZFJlcXVlc3QgZnVuY3Rpb24gaW1wb3J0IGFzIGFuIGV4cG9ydFxyXG5leHBvcnRzLnNlbmRSZXF1ZXN0ID0gcmVxdWlyZSggJy4vcGx1Z2lucy9EZWZhdWx0LmpzJyApO1xyXG5cclxuLy8gQ29uZmlndXJlIFEgdG8gcHJvdmlkZSBwcm9taXNlIHN0YWNrIHRyYWNlcyBpbiBmdWxsLlxyXG5RLmxvbmdTdGFja1N1cHBvcnQgPSB0cnVlO1xyXG5cclxuKCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy9cclxuICAvLyBQcm9wZXJ0aWVzIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8qKlxyXG4gICAqIEBwcml2YXRlXHJcbiAgICogQHByb3BlcnR5IHtTdHJpbmd9IEFVVEhfQ09PS0lFX05BTUUgIFRoZSBuYW1lIG9mIHRoZSBCcmlkZ2UgYXV0aGVudGljYXRpb24gY29va2llIGluIHRoZVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicm93c2VyJ3MgY29va2llIHN0b3JlLlxyXG4gICAqL1xyXG4gIHZhciBBVVRIX0NPT0tJRV9OQU1FID0gJ0JyaWRnZUF1dGgnO1xyXG5cclxuICAvKipcclxuICAgKiBAcHVibGljXHJcbiAgICogQHByb3BlcnR5IHtCb29sZWFufSAgZGVidWcgIEEgZmxhZyB0byBlbmFibGUgZXh0cmEgY29uc29sZSBsb2dnaW5nIGZvciBkZWJ1Z2dpbmcgcHVycG9zZXMuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5kZWJ1ZyA9IGZhbHNlO1xyXG5cclxuICAvKipcclxuICAgKiBAcHVibGljXHJcbiAgICogQHByb3BlcnR5IHtCb29sZWFufSAgcmVtZW1iZXJNZSAgV2hldGhlciBvciBub3QgdGhlIHVzZXIgc2VsZWN0ZWQgdGhlIHJlbWVtYmVyIG1lIG9wdGlvbi5cclxuICAgKi9cclxuICBleHBvcnRzLnJlbWVtYmVyTWUgPSBmYWxzZTtcclxuXHJcbiAgLyoqXHJcbiAgICogQHB1YmxpY1xyXG4gICAqIEBwcm9wZXJ0eSB7U3RyaW5nfSAgdW5jaGFuZ2VkVXNlciAgVGhlIEpTT04uc3RyaW5naWZ5KCllZCB1c2VyIHByb2ZpbGUgb2JqZWN0IGFzIGl0IHdhcyB3aGVuIGl0XHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXMgc2V0IGJ5IGEgY2FsbCB0byBnZXRVc2VyUHJvZmlsZSgpLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMudW5jaGFuZ2VkVXNlciA9ICdudWxsJztcclxuXHJcbiAgLyoqXHJcbiAgICogQHB1YmxpY1xyXG4gICAqIEBwcm9wZXJ0eSB7VXNlcn0gIHVzZXIgIFRoZSB1c2VyIHByb2ZpbGUgb2JqZWN0IHRoYXQgaXMgbW9kaWZpYWJsZSBieSB1c2VycyBvZiBCcmlkZ2UuXHJcbiAgICovXHJcbiAgZXhwb3J0cy51c2VyID0gbnVsbDtcclxuXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAvLyBIZWxwZXIgRnVuY3Rpb25zIC8vXHJcbiAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gIC8qKlxyXG4gICAqXHJcbiAgICogQHB1YmxpY1xyXG4gICAqXHJcbiAgICogQGZ1bmN0aW9uICAgICAgaXNVc2VyTG9nZ2VkSW5cclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgIFJldHVybnMgd2hldGhlciBvciBub3QgdGhlIHVzZXIgb2JqZWN0IGlzIHNldC5cclxuICAgKlxyXG4gICAqIEByZXR1cm4gICAgICAgIHtCb29sZWFufSBXaGV0aGVyIG9yIG5vdCBhIHVzZXIgb2JqZWN0IGV4aXN0cyBhbmQgaXMgYXV0aGVudGljYXRlZC5cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuaXNVc2VyTG9nZ2VkSW4gPSBmdW5jdGlvbiBpc0xvZ2dlZEluICgpIHtcclxuICAgIC8vIE5vdGU6IFVzaW5nIHRlcm5hcnkgaGVyZSBiZWNhdXNlIGEgcmF3IEFORCByZXR1cm5zIE9iamVjdCwgc2luY2UgdGhhdCdzIHRydXRoeSBlbm91Z2guXHJcbiAgICByZXR1cm4gKCBleHBvcnRzLnVzZXIgKSA/IHRydWUgOiBmYWxzZTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIGlzVXNlck1vZGlmaWVkXHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gICBSZXR1cm5zIHdoZXRoZXIgb3Igbm90IHRoZSBjdXJyZW50IHVzZXIgcHJvZmlsZSBoYXMgYmVlbiBjaGFuZ2VkIHNpbmNlIGEgdXNlclxyXG4gICAqICAgICAgICAgICAgICAgIHByb2ZpbGUgd2FzIGxhc3QgZmV0Y2hlZCBmcm9tIHRoZSBzZXJ2ZXIuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHtCb29sZWFufSBXaGV0aGVyIG9yIG5vdCB0aGUgdXNlciBwcm9maWxlIGhhcyBiZWVuIG1vZGlmaWVkIHNpbmNlIHRoYXQgbGFzdCB0aW1lIGEgdXNlclxyXG4gICAqICAgICAgICAgICAgICAgICAgIHByb2ZpbGUgd2FzIGxhc3QgZmV0Y2hlZCBmcm9tIHRoZSBzZXJ2ZXIuIFJldHVybnMgZmFsc2UgaWYgbm8gdXNlciBwcm9maWxlXHJcbiAgICogICAgICAgICAgICAgICAgICAgaGFzIGJlZW4gc2V0LlxyXG4gICAqXHJcbiAgICovXHJcbiAgZXhwb3J0cy5pc1VzZXJNb2RpZmllZCA9IGZ1bmN0aW9uIGlzVXNlck1vZGlmaWVkICgpIHtcclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSggZXhwb3J0cy51c2VyICkgIT09IGV4cG9ydHMudW5jaGFuZ2VkVXNlcjtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIHJlc2V0U2Vzc2lvblxyXG4gICAqXHJcbiAgICogQGRlc2NyaXB0aW9uICAgQ2xlYXJzIHRoZSBpc0F1dGhlbnRpY2F0ZWQgZmxhZywgdGhlIFwicmVtZW1iZXIgbWVcIiBmbGFnLCB0aGUgdXNlciBwcm9maWxlIG9iamVjdFxyXG4gICAqICAgICAgICAgICAgICAgIGFuZCB0aGUgdW5jaGFuZ2VkVXNlciBzdHJpbmcsIHN1Y2ggdGhhdCB0aGUgc2Vzc2lvbiBpbmZvcm1hdGlvbiBpcyBjb21wbGV0ZWx5XHJcbiAgICogICAgICAgICAgICAgICAgZm9yZ290dGVuIGJ5IHRoZSBCcmlkZ2UgY2xpZW50IGFuZCBpdCBiZWxpZXZlcyB0aGF0IGl0IGlzIG5vdCBhdXRoZW50aWNhdGVkIGFuZFxyXG4gICAqICAgICAgICAgICAgICAgIGhhcyBubyB1c2VyIGluZm8uIFRoZSBicm93c2VyIHdpbGwgc3RpbGwgaG9sZCB0aGUgYXV0aGVudGljYXRpb24gY29va2llIGluIGl0c1xyXG4gICAqICAgICAgICAgICAgICAgIGNvb2tpZSBzdG9yZSwgaG93ZXZlciwgc28gdGhlIGFwcCBpcyBzdGlsbCBhdXRoZW50aWNhdGVkIGlmIHRoaXMgaXMgY2FsbGVkXHJcbiAgICogICAgICAgICAgICAgICAgd2l0aG91dCBtYWtpbmcgYSBkZWF1dGhlbnRpY2F0ZSgpIGNhbGwgZmlyc3QgKHR5cGljYWxseSB0aGlzIGlzIGNhbGxlZCBieVxyXG4gICAqICAgICAgICAgICAgICAgIGRlYXV0aGVudGljYXRlKCkgdG8gY2xlYXIgdGhlIHNlc3Npb24gYWZ0ZXIgY2xlYXJpbmcgdGhlIGF1dGggY29va2llKS5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge3VuZGVmaW5lZH1cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucmVzZXRTZXNzaW9uID0gZnVuY3Rpb24gcmVzZXRTZXNzaW9uICgpIHtcclxuICAgIGV4cG9ydHMucmVtZW1iZXJNZSA9IGZhbHNlO1xyXG4gICAgZXhwb3J0cy51c2VyID0gbnVsbDtcclxuICAgIGV4cG9ydHMudW5jaGFuZ2VkVXNlciA9ICdudWxsJztcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIHN0cmlwVHJhaWxpbmdTbGFzaFxyXG4gICAqXHJcbiAgICogQGRlc2NyaXB0aW9uICAgUmVtb3ZlcyBhIHRyYWlsaW5nIGZvcndhcmQtc2xhc2ggZnJvbSB0aGUgcHJvdmlkZWQgc3RyaW5nLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7U3RyaW5nfSBzdHIgICBBIHN0cmluZyB0aGF0IG1heSBoYXZlIGEgdHJhaWxpbmcgZm9yd2FyZCBzbGFzaC5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgVGhlIHNhbWUgYXMgdGhlIGlucHV0LCBidXQgaGF2aW5nIG5vIHRyYWlsaW5nIGZvcndhcmQtc2xhc2guXHJcbiAgICpcclxuICAgKi9cclxuICBleHBvcnRzLnN0cmlwVHJhaWxpbmdTbGFzaCA9IGZ1bmN0aW9uIHN0cmlwVHJhaWxpbmdTbGFzaCAoIHN0ciApIHtcclxuICAgIC8vIE5vdGU6IFN0cmluZy5zdWJzdHIoKSBiZWhhdmVzIGRpZmZlcmVudGx5IGZyb20gU3RyaW5nLnN1YnN0cmluZygpIGhlcmUhIERvbid0IGNoYW5nZSB0aGlzIVxyXG4gICAgcmV0dXJuICggc3RyLnN1YnN0ciggLTEgKSA9PT0gJy8nICkgPyBzdHIuc3Vic3RyKCAwLCBzdHIubGVuZ3RoIC0gMSApIDogc3RyO1xyXG4gIH07XHJcblxyXG4gIC8vLy8vLy8vLy8vLy8vL1xyXG4gIC8vIFJlcXVlc3RzIC8vXHJcbiAgLy8vLy8vLy8vLy8vL1xyXG5cclxuICAvKipcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAY2FsbGJhY2sgICAgICBvblJlcXVlc3RDYWxsZWRcclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgIEEgZnVuY3Rpb24gY2FsbGJhY2sgdGhhdCBjYW4gYmUgdXNlZCB0byBtb2RpZnkgcmVxdWVzdHMgYmVmb3JlIHRoZXkgYXJlIHNlbnQgYnlcclxuICAgKiAgICAgICAgICAgICAgICBCcmlkZ2UuIE92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gd2l0aCB5b3VyIG93biBpbXBsZW1lbnRhdGlvbiB0byBoYXZlIGl0IGJlIGNhbGxlZFxyXG4gICAqICAgICAgICAgICAgICAgIGJlZm9yZSBlYWNoIHJlcXVlc3QgdG8gdGhlIEFQSS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IG1ldGhvZCAgICAgVGhlIEhUVFAgdmVyYi9hY3Rpb24gdG8gdXNlIGZvciB0aGUgcmVxdWVzdC5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAgICAgICAgIHtTdHJpbmd9IHVybCAgICAgICAgVGhlIHJlc291cmNlIGF0IHRoZSBiYXNlIEFQSSBVUkwgdG8gcXVlcnkuIFRoZSBiYXNlIEFQSVxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgVVJMIChiYXNlVXJsKSBpcyBwcmVwZW5kZWQgdG8gdGhpcyBzdHJpbmcuIFRoZSBzcGVjaWZpZWRcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlIHNob3VsZCBOT1QgaGF2ZSBhIGxlYWRpbmcgc2xhc2gsIGFzIGJhc2VVcmwgaXNcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkIHRvIGhhdmUgYSB0cmFpbGluZyBzbGFzaC5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAgICAgICAgIHtPYmplY3R9IGRhdGEgICAgICAgVGhlIGRhdGEgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdC4gVGhpcyBjYW4gYmUgdXNlZFxyXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZGVzY3JpYmUgcXVlcnkgYXJndW1lbnRzIHN1Y2ggYXMgZmlsdGVycyBhbmQgb3JkZXJpbmcsIG9yXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBjb250YWluIGRhdGEgdG8gYmUgc3RvcmVkIGluIHRoZSBCcmlkZ2UgZGF0YWJhc2UuXHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHt1bmRlZmluZWR9XHJcbiAgICpcclxuICAgKi9cclxuICBleHBvcnRzLm9uUmVxdWVzdENhbGxlZCA9IGZ1bmN0aW9uIG9uUmVxdWVzdENhbGxlZCAoIG1ldGhvZCwgdXJsLCBkYXRhICkge1xyXG4gICAgLy8gRG8gbm90aGluZyB1bnRpbCBvdmVycmlkZGVuIGJ5IGFuIGltcGxlbWVudG9yXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICpcclxuICAgKiBAcHVibGljXHJcbiAgICpcclxuICAgKiBAZnVuY3Rpb24gICAgIHJlc29sdmVcclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgUmVzb2x2ZXMgdGhlIHByb3ZpZGVkIGRlZmVycmVkIGFuZCByZXR1cm5zIHRoZSBwcm92aWRlZCBkYXRhLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7U3RyaW5nfSBuYW1lICAgICAgICBBbiBpZGVudGlmaWVyIHRvIHVzZSB3aGVuIHByaW50aW5nIGRlYnVnIGluZm9ybWF0aW9uLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7RGVmZXJyZWR9IGRlZmVycmVkICBUaGUgUSBkZWZlcnJlZCBvYmplY3QgdG8gcmVzb2x2ZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge09iamVjdH0gZGF0YSAgICAgICAgVGhlIG9iamVjdCB0byByZXR1cm4gd2l0aCB0aGUgcmVzb2x1dGlvbi5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge3VuZGVmaW5lZH1cclxuICAgKlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uIHJlc29sdmUgKCBuYW1lLCBkZWZlcnJlZCwgZGF0YSApIHtcclxuICAgIGlmICggZXhwb3J0cy5kZWJ1ZyA9PT0gdHJ1ZSApIHtcclxuICAgICAgY29uc29sZS5sb2coIFwiQlJJREdFIHwgXCIgKyBuYW1lICsgXCIgfCBcIiArIEpTT04uc3RyaW5naWZ5KCBkYXRhICkgKTtcclxuICAgIH1cclxuICAgIGRlZmVycmVkLnJlc29sdmUoIGRhdGEgKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgcmVqZWN0XHJcbiAgICpcclxuICAgKiBAZGVzY3JpcHRpb24gIFJlamVjdHMgdGhlIHByb3ZpZGVkIGRlZmVycmVkIGFuZCByZXR1cm5zIHRoZSBwcm92aWRlZCBkYXRhLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7U3RyaW5nfSBuYW1lICAgICAgICBBbiBpZGVudGlmaWVyIHRvIHVzZSB3aGVuIHByaW50aW5nIGRlYnVnIGluZm9ybWF0aW9uLlxyXG4gICAqXHJcbiAgICogQHBhcmFtICB7RGVmZXJyZWR9IGRlZmVycmVkICBUaGUgUSBkZWZlcnJlZCBvYmplY3QgdG8gcmVzb2x2ZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSAge09iamVjdH0gZXJyb3IgICAgICAgVGhlIG9iamVjdCB0byByZXR1cm4gd2l0aCB0aGUgcmVqZWN0aW9uLlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7dW5kZWZpbmVkfVxyXG4gICAqXHJcbiAgICovXHJcbiAgZXhwb3J0cy5yZWplY3QgPSBmdW5jdGlvbiByZWplY3QgKCBuYW1lLCBkZWZlcnJlZCwgZXJyb3IgKSB7XHJcbiAgICBpZiAoIGV4cG9ydHMuZGVidWcgPT09IHRydWUgKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoIFwiQlJJREdFIHwgXCIgKyBuYW1lICsgXCIgfCBcIiArIGVycm9yLnN0YXR1cyArIFwiID4+IENvZGUgXCIgKyBlcnJvci5lcnJvckNvZGUgK1xyXG4gICAgICAgIFwiOiBcIiArIGVycm9ycy5nZXRFeHBsYW5hdGlvbiggZXJyb3IuZXJyb3JDb2RlICkgKTtcclxuICAgIH1cclxuICAgIGRlZmVycmVkLnJlamVjdCggZXJyb3IgKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwdWJsaWNcclxuICAgKlxyXG4gICAqIEBmdW5jdGlvbiAgICAgIHJlcXVlc3RcclxuICAgKlxyXG4gICAqIEBkZXNjcmlwdGlvbiAgIFNlbmRzIGFuIFhIUiByZXF1ZXN0IHVzaW5nIHRoZSBjcmVhdGVSZXF1ZXN0KCkgZnVuY3Rpb24uIFRoZSBtZXNzYWdlIHBheWxvYWQgaXNcclxuICAgKiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSgpZWQgYW5kIHBhY2thZ2VkIGludG8gYW4gSFRUUCBoZWFkZXIgY2FsbGVkIFwiQnJpZGdlXCIuIFRoZSBjb29raWVcclxuICAgKiAgICAgICAgICAgICAgICB0byB1c2UgZm9yIGF1dGhlbnRpY2F0aW9uIG9uIHRoZSBzZXJ2ZXIgaXMga2VwdCBpbiBhbiBIVFRQIGhlYWRlciBjYWxsZWQgXCJBdXRoXCIuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBtZXRob2QgICAgIFRoZSBIVFRQIHZlcmIvYWN0aW9uIHRvIHVzZSBmb3IgdGhlIHJlcXVlc3QuIENhcGl0YWxpemF0aW9uXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2Vzbid0IG1hdHRlciBhcyBpdCB3aWxsIGJlIGNhcGl0YWxpemVkIGF1dG9tYXRpY2FsbHkuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSB1cmwgICAgICAgIFRoZSBleGFjdCBVUkwgb2YgdGhlIHJlc291cmNlIHRvIHF1ZXJ5LlxyXG4gICAqXHJcbiAgICogQHBhcmFtICAgICAgICAge09iamVjdH0gZGF0YSAgICAgICBUaGUgZGF0YSBvYmplY3QgdG8gc2VuZCB3aXRoIHRoZSByZXF1ZXN0LiBUaGlzIGNhbiBiZSB1c2VkXHJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBkZXNjcmliZSBxdWVyeSBhcmd1bWVudHMgc3VjaCBhcyBmaWx0ZXJzIGFuZCBvcmRlcmluZywgb3JcclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGNvbnRhaW4gZGF0YSB0byBiZSBzdG9yZWQgaW4gdGhlIEJyaWRnZSBkYXRhYmFzZS5cclxuICAgKlxyXG4gICAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgQSBxLmpzIHByb21pc2Ugb2JqZWN0LlxyXG4gICAqXHJcbiAgICovXHJcbiAgZXhwb3J0cy5yZXF1ZXN0ID0gZnVuY3Rpb24gcmVxdWVzdCAoIG1ldGhvZCwgdXJsLCBkYXRhICkge1xyXG5cclxuICAgIC8vIENhbGwgdGhlIG9uUmVxdWVzdENhbGxlZCBjYWxsYmFjaywgaWYgb25lIGlzIHJlZ2lzdGVyZWQuXHJcbiAgICBpZiAoIGV4cG9ydHMub25SZXF1ZXN0Q2FsbGVkICkge1xyXG4gICAgICBleHBvcnRzLm9uUmVxdWVzdENhbGxlZCggbWV0aG9kLCB1cmwsIGRhdGEgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDYWxsIHNlbmRSZXF1ZXN0KCkgdG8gaGFuZGxlIHRoZSBYSFIgaW4gd2hhdGV2ZXIgd2F5IGl0IGhhcyBiZWVuIGNvbmZpZ3VyZWQgdG8uXHJcbiAgICAvLyBOb3RlOiBDcmVhdGluZyAyIGRlZmVycmVkIG9iamVjdHMgaGVyZTogMSBmb3IgdGhpcywgMSBmb3Igc2VuZFJlcXVlc3QuXHJcbiAgICB2YXIgZGVmZXJyZWQgPSBRLmRlZmVyKCk7XHJcbiAgICBleHBvcnRzLnNlbmRSZXF1ZXN0KCBRLmRlZmVyKCksIG1ldGhvZC50b1VwcGVyQ2FzZSgpLCB1cmwsIGRhdGEgKS50aGVuKFxyXG5cclxuICAgICAgLy8gUmVxdWVzdCB3YXMgcmVzb2x2ZWQgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICAgIGZ1bmN0aW9uICggZGF0YSApIHtcclxuXHJcbiAgICAgICAgLy8gSWYgdGhlIHJlc3BvbnNlIGZvcm1hdCBpcyB2YWxpZCwgcmVzb2x2ZSB0aGUgcmVxdWVzdCB3aXRoIHRoZSByZXNwb25zZSBkYXRhIG9iamVjdC5cclxuICAgICAgICBleHBvcnRzLnJlc29sdmUoIFwiUmVxdWVzdFwiLCBkZWZlcnJlZCwgZGF0YSApO1xyXG5cclxuICAgICAgfSxcclxuICAgICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcblxyXG4gICAgICAvLyBSZXF1ZXN0IHdhcyByZWplY3RlZCAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cclxuICAgICAgZnVuY3Rpb24gKCBlcnJvciApIHtcclxuXHJcbiAgICAgICAgLy8gSWYgYSBkZWJ1ZyBtZXNzYWdlIHdhcyBzZW50LCBzZXQgaXQgYXMgdGhlIG1lc3NhZ2UuIElmIG5vdCwgdGhlIGVycm9yIG1lc3NhZ2UgaXMgZW1wdHkuXHJcbiAgICAgICAgZXJyb3IubWVzc2FnZSA9IGVycm9yLmRlYnVnTWVzc2FnZSB8fCAnJztcclxuXHJcbiAgICAgICAgLy8gSWYgdGhlIGF1dGggdG9rZW4gaGFzIGJlZW4gY29ycnVwdGVkLCB0aGUgY2xpZW50IGNhbid0IHBlcmZvcm0gYW55IHByaXZhdGUgQVBJIGNhbGxzXHJcbiAgICAgICAgLy8gaW5jbHVkaW5nIGRlYXV0aGVudGljYXRlKCkuIFNpbmNlIHRoZSBjb29raWUgaXMgaW5hY2Nlc3NpYmxlIHRvIHRoZSBjbGllbnQsIHRoZSBvbmx5XHJcbiAgICAgICAgLy8gcmVjb3Vyc2Ugd2UgaGF2ZSBpcyB0byByZXNldCB0aGUgc2Vzc2lvbiBhbmQgZm9yY2UgdGhlIHVzZXIgdG8gYXV0aGVudGljYXRlIGFnYWluXHJcbiAgICAgICAgaWYgKCBlcnJvci5lcnJvckNvZGUgPT09IGVycm9ycy5DT1JSVVBURURfQVVUSF9UT0tFTiApIHtcclxuICAgICAgICAgIGV4cG9ydHMucmVzZXRTZXNzaW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBJZiB0aGUgcmVzcG9uc2UgZmFpbGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgZXJyb3Igb2JqZWN0IHBhc3NlZCB1cCBmcm9tIGJlbG93LlxyXG4gICAgICAgIGV4cG9ydHMucmVqZWN0KCBcIlJlcXVlc3RcIiwgZGVmZXJyZWQsIGVycm9yICk7XHJcblxyXG4gICAgICB9XHJcbiAgICAgIC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblxyXG4gIH07XHJcblxyXG59ICkoKTtcclxuIiwiLyoqXHJcbiAqIEBtb2R1bGUgIGVycm9yc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBAcHVibGljXHJcbiAqIEBjb25zdGFudCAgICAgIENPUlJVUFRFRF9BVVRIX1RPS0VOXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFuIGVycm9yIGNvZGUgaW5kaWNhdGluZyB0aGF0IHRoZSBzZXJ2ZXIgcmVqZWN0ZWQgYSByZXF1ZXN0IGJlY2F1c2UgdGhlIGF1dGggdG9rZW5cclxuICogICAgICAgICAgICAgICAgc2VudCBpbiB0aGUgYXV0aCBjb29raWUgd2FzIGNvcnJ1cHRlZC4gVGhpcyBpcyBhbiBlc3BlY2lhbGx5IGJhZCBlcnJvciBjYXNlIHNpbmNlXHJcbiAqICAgICAgICAgICAgICAgIHRoaXMgc3RhdGUgcHJldmVudHMgdGhlIGNsaWVudCBmcm9tIGFjY2Vzc2luZyBhbnkgcHJpdmF0ZSByb3V0ZXMgb24gdGhlIEFQSVxyXG4gKiAgICAgICAgICAgICAgICBzZXJ2ZXIsIGluY2x1ZGluZyBkZWF1dGhlbnRpY2F0ZSgpLiBjb3JlLnJlcXVlc3QoKSBoYW5kbGVzIHRoaXMgZXJyb3IgYnkgcmVzZXR0aW5nXHJcbiAqICAgICAgICAgICAgICAgIHRoZSBzZXNzaW9uLCBldmVuIHRob3VnaCB0aGUgYXV0aCBjb29raWUgbWF5IHN0aWxsIGJlIHNldC4gSWRlYWxseSwgdGhpcyBpc1xyXG4gKiAgICAgICAgICAgICAgICBoYW5kbGVkIGJ5IHJldHVybmluZyB0aGUgdXNlciB0byBhIGxvZ2luIHNjcmVlbiB0byByZS1lbnRlciB0aGVpciBjcmVkZW50aWFscyBzb1xyXG4gKiAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGUoKSB3aWxsIGJlIGNhbGxlZCBhZ2FpbiwgYWxsb3dpbmcgdGhlIHNlcnZlciB0byBpc3N1ZSBhIGZyZXNoIGF1dGhcclxuICogICAgICAgICAgICAgICAgY29va2llIGFuZCByZXN0b3JlIHRoZSBhcHAgc3RhdGUuXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLkNPUlJVUFRFRF9UT0tFTiA9IDI2O1xyXG5cclxuLyoqXHJcbiAqIEBwdWJsaWNcclxuICogQGNvbnN0YW50ICAgICAgRVJST1JfQ09ERV9NQUxGT1JNRURfUkVTUE9OU0VcclxuICogQGRlc2NyaXB0aW9uICAgQW4gZXJyb3IgY29kZSBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIHJldHVybmVkIGZyb20gdGhlIHNlcnZlciBpcyBlaXRoZXIgdGhlXHJcbiAqICAgICAgICAgICAgICAgIHdyb25nIGRhdGEgdHlwZSBvciBpcyBmb3JtYXR0ZWQgaW5jb3JyZWN0bHkuXHJcbiAqIEB0eXBlICAgICAgICAgIHtOdW1iZXJ9XHJcbiAqL1xyXG5leHBvcnRzLk1BTEZPUk1FRF9SRVNQT05TRSA9IDEwMTtcclxuXHJcbi8qKlxyXG4gKiBAcHVibGljXHJcbiAqIEBjb25zdGFudCAgICAgIEVSUk9SX0NPREVfTkVUV09SS19FUlJPUlxyXG4gKiBAZGVzY3JpcHRpb24gICBBbiBlcnJvciBjb2RlIGluZGljYXRpbmcgdGhhdCB0aGUgcmVzcG9uc2UgZmFpbGVkIGR1ZSB0byBhbiBlcnJvciBhdCB0aGUgbmV0d29ya1xyXG4gKiAgICAgICAgICAgICAgICBsZXZlbCwgYnV0IHdhcyBub3QgYSB0aW1lb3V0LlxyXG4gKiBAdHlwZSAgICAgICAgICB7TnVtYmVyfVxyXG4gKi9cclxuZXhwb3J0cy5ORVRXT1JLX0VSUk9SID0gMTAyO1xyXG5cclxuLyoqXHJcbiAqIEBwdWJsaWNcclxuICogQGNvbnN0YW50ICAgICAgUkVRVUVTVF9USU1FT1VUXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFuIGVycm9yIGNvZGUgaW5kaWNhdGluZyB0aGF0IHRoZSByZXNwb25zZSBkaWQgbm90IGdldCBhIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlclxyXG4gKiAgICAgICAgICAgICAgICB3aXRoaW4gdGhlIFhIUidzIHRpbWVvdXQgcGVyaW9kLlxyXG4gKiBAdHlwZSAgICAgICAgICB7TnVtYmVyfVxyXG4gKi9cclxuZXhwb3J0cy5SRVFVRVNUX1RJTUVPVVQgPSAxMDM7XHJcblxyXG4vKipcclxuICogQHB1YmxpY1xyXG4gKiBAY29uc3RhbnQgICAgICBOT19VU0VSX1BST0ZJTEVcclxuICogQGRlc2NyaXB0aW9uICAgQW4gZXJyb3IgY29kZSBpbmRpY2F0aW5nIHRoYXQgbm8gdXNlciBwcm9maWxlIGlzIHNldCwgbWVhbmluZyB0aGF0IG1hbnkgY29tbWFuZHNcclxuICogICAgICAgICAgICAgICAgd2lsbCBiZSB1bmFibGUgdG8gZ2V0IGFjY2VzcyB0byB0aGUgaW5mb3JtYXRpb24gdGhleSBuZWVkIHRvIGZ1bmN0aW9uLlxyXG4gKiBAdHlwZSAgICAgICAgICB7TnVtYmVyfVxyXG4gKi9cclxuZXhwb3J0cy5OT19VU0VSX1BST0ZJTEUgPSAxMDQ7XHJcblxyXG4vKipcclxuICogQHB1YmxpY1xyXG4gKiBAY29uc3RhbnQgICAgICBQQVNTV09SRF9UT09fU0hPUlRcclxuICogQGRlc2NyaXB0aW9uICAgQW4gZXJyb3IgY29kZSBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlcXVlc3RlZCBwYXNzd29yZCBpcyBub3QgbG9uZyBlbm91Z2gsIGFuZCB0aGF0XHJcbiAqICAgICAgICAgICAgICAgIHRoZSB1c2VyIG11c3Qgc2VsZWN0IGEgbG9uZ2VyIHBhc3N3b3JkIHRvIGVuc3VyZSBhY2NvdW50IHNlY3VyaXR5LlxyXG4gKiBAdHlwZSAgICAgICAgICB7TnVtYmVyfVxyXG4gKi9cclxuZXhwb3J0cy5QQVNTV09SRF9UT09fU0hPUlQgPSAxMDU7XHJcblxyXG4vKipcclxuICogQHB1YmxpY1xyXG4gKiBAY29uc3RhbnQgICAgICBXSUxMX0xPU0VfVU5TQVZFRF9DSEFOR0VTXHJcbiAqIEBkZXNjcmlwdGlvbiAgIEFuIGVycm9yIGNvZGUgaW5kaWNhdGluZyB0aGF0IHRoZSByZXF1ZXN0ZWQgb3BlcmF0aW9uIG1heSBvdmVyd3JpdGUgdXNlciBkYXRhIHRoYXRcclxuICogICAgICAgICAgICAgICAgaXMgbm90IHlldCBzYXZlZCBvbiB0aGUgY2xpZW50LlxyXG4gKiBAdHlwZSAgICAgICAgICB7TnVtYmVyfVxyXG4gKi9cclxuZXhwb3J0cy5XSUxMX0xPU0VfVU5TQVZFRF9DSEFOR0VTID0gMTA2O1xyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBlbnVtIEVYUExBTkFUSU9OU1xyXG4gKiBAZGVzY3JpcHRpb24gICBBIG1hcCBvZiBlcnJvciBjb2RlcyAoa2V5cykgdG8gZXJyb3IgY29kZSBleHBsYW5hdGlvbnMgKHZhbHVlcykuXHJcbiAqIEB0eXBlIHtNYXB9XHJcbiAqL1xyXG52YXIgRVhQTEFOQVRJT05TID0ge1xyXG4gIDE6IFwiVGhlIHJlcXVlc3Qgc2VudCB0byB0aGUgc2VydmVyIHdhcyBiYWRseSBmb3JtZWQuIEVuc3VyZSB0aGF0IHlvdXIgQnJpZGdlIENsaWVudCBhbmQgQnJpZGdlIFNlcnZlciB2ZXJzaW9ucyBtYXRjaC5cIixcclxuICAyOiBcIlRoZSBzZXJ2ZXIgZW5jb3VudGVyZWQgYW4gZXJyb3Igd2hpbGUgcXVlcnlpbmcgdGhlIGRhdGFiYXNlLiBFbnN1cmUgdGhhdCB5b3VyIGRhdGFiYXNlIHNlcnZlciBpcyBydW5uaW5nLlwiLFxyXG4gIDM6IFwiQSB1c2VyIGlzIGFscmVhZHkgcmVnaXN0ZXJlZCB3aXRoIHRoaXMgZW1haWwgYWNjb3VudC5cIixcclxuICA0OiBcIlRoZSBzZXJ2ZXIgcmVqZWN0ZWQgYW4gYW5vbnltb3VzIHJlcXVlc3QgYmVjYXVzZSBpdCBtYXkgaGF2ZSBiZWVuIHRlbXBlcmVkIHdpdGggb3IgaW50ZXJjZXB0ZWQuXCIsXHJcbiAgNTogXCJUaGUgc3VwcGxpZWQgcGFzc3dvcmQgaXMgaW5jb3JyZWN0LlwiLFxyXG4gIDY6IFwiWW91ciBlbWFpbCBhY2NvdW50IGhhcyBub3QgeWV0IGJlZW4gdmVyaWZpZWQuIFBsZWFzZSBjaGVjayB5b3VyIGVtYWlsIGFuZCBjb21wbGV0ZSB0aGUgcmVnaXN0cmF0aW9uIHByb2Nlc3MuXCIsXHJcbiAgNzogXCJUaGUgc3VwcGxpZWQgZW1haWwgYWRkcmVzcyBpcyBpbnZhbGlkLlwiLFxyXG4gIDg6IFwiVGhlIHN1cHBsaWVkIGZpcnN0IG5hbWUgaXMgaW52YWxpZCAobXVzdCBiZSBhdCBsZWFzdCAyIGNoYXJhY3RlcnMgaW4gbGVuZ3RoKVwiLFxyXG4gIDk6IFwiVGhlIEhNQUMgc2VjdXJpdHkgc2lnbmF0dXJlIHN1cHBsaWVkIHdpdGggdGhpcyByZXF1ZXN0IHdhcyBiYWRseSBmb3JtZWQuXCIsXHJcbiAgMTA6IFwiVGhlIHN1cHBsaWVkIGxhc3QgbmFtZSBpcyBpbnZhbGlkIChtdXN0IGJlIGF0IGxlYXN0IDIgY2hhcmFjdGVycyBpbiBsZW5ndGgpXCIsXHJcbiAgMTE6IFwiVGhlIFNIQS0yNTYgaGFzaGVkIHBhc3N3b3JkIHN1cHBsaWVkIHdpdGggdGhpcyByZXF1ZXN0IHdhcyBiYWRseSBmb3JtZWQuIFRoaXMgZG9lcyBOT1QgbWVhbiB0aGF0IHlvdXIgcGFzc3dvcmQgaXMgaW52YWxpZCwgYnV0IHRoYXQgYW4gaW50ZXJuYWwgZXJyb3Igb2NjdXJyZWQuXCIsXHJcbiAgMTI6IFwiVGhlIHRpbWUgc3VwcGxpZWQgd2l0aCB0aGlzIHJlcXVlc3Qgd2FzIGJhZGx5IGZvcm1lZCAobXVzdCBiZSBpbiBJU08gZm9ybWF0KVwiLFxyXG4gIDEzOiBcIlRoZSB1c2VyIGhhc2ggc3VwcGxpZWQgd2l0aCB0aGlzIHJlcXVlc3Qgd2FzIGJhZGx5IGZvcm1lZC5cIixcclxuICAxNDogXCJUaGUgcmVxdWVzdGVkIGFjdGlvbiByZXF1aXJlcyB0aGF0IHlvdSBiZSBsb2dnZWQgaW4gYXMgYSByZWdpc3RlcmVkIHVzZXIuXCIsXHJcbiAgMTU6IFwiVGhlIHJlcXVlc3QgZmFpbGVkIGJlY2F1c2UgYSBCcmlkZ2UgU2VydmVyIGV4dGVuc2lvbiBoYXMgY2FsbGVkIGEgc2VydmljZSBtb2R1bGUgYmVmb3JlIEJyaWRnZSBjb3VsZCB2YWxpZGF0ZSB0aGUgcmVxdWVzdCAodG9vIGVhcmx5IGluIG1pZGRsZXdhcmUgY2hhaW4pLlwiLFxyXG4gIDE2OiBcIlRoZSBzdXBwbGllZCBhcHBsaWNhdGlvbiBkYXRhIG9iamVjdCBjb3VsZCBub3QgYmUgcGFyc2VkIGFzIHZhbGlkIEpTT04uXCIsXHJcbiAgMTc6IFwiVGhlIHVzZXIgd2l0aCB0aGUgc3VwcGxpZWQgZW1haWwgd2FzIG5vdCBmb3VuZCBpbiB0aGUgZGF0YWJhc2UuXCIsXHJcbiAgMTg6IFwiQW4gdW5rbm93biBlcnJvciBvY2N1cnJlZCBpbiB0aGUgc2VydmVyLiBQbGVhc2UgY29udGFjdCB0aGUgc2VydmVyIGFkbWluaXN0cmF0b3IuXCIsXHJcbiAgMTk6IFwiVGhlIHJlcXVlc3Qgc2VudCB0byB0aGUgc2VydmVyIGRpZCBub3QgY29udGFpbiB0aGUgXFxcIkJyaWRnZVxcXCIgaGVhZGVyLCBhbmQgY291bGQgbm90IGJlIGF1dGhlbnRpY2F0ZWQuXCIsXHJcbiAgMjA6IFwiVGhlIEJyaWRnZSBoZWFkZXIgb2YgdGhlIHJlcXVlc3QgY291bGQgbm90IGJlIHBhcnNlZCBhcyB2YWxpZCBKU09OLlwiLFxyXG4gIDIxOiBcIlRoZSByZXF1ZXN0IGNhbm5vdCBiZSBjb21wbGV0ZWQgYmVjYXVzZSB0aGlzIHVzZXIgaXMgbm90IGF1dGhvcml6ZWQgdG8gcGVyZm9ybSB0aGlzIGFjdGlvbi5cIixcclxuICAyMjogXCJUaGUgcmVxdWVzdGVkIGNvbnRlbnQgY2Fubm90IGJlIGFjY2Vzc2VkIGFub255bW91c2x5LiBQbGVhc2UgbG9naW4gdG8gYSB2YWxpZCB1c2VyIGFjY291bnQuXCIsXHJcbiAgMjM6IFwiVGhlIHJlcXVlc3Qgd2FzIGJhZGx5IGZvcm1lZC5cIixcclxuICAyNDogXCJUaGlzIHJlcXVlc3QgbXVzdCBiZSBwZXJmb3JtZWQgYW5vbnltb3VzbHkuIFBsZWFzZSBsb2cgb3V0IGFuZCB0cnkgYWdhaW4uXCIsXHJcbiAgMjU6IFwiVGhlIHJlcXVlc3QgY291bGQgbm90IGJlIGF1dGhlbnRpY2F0ZWQsIGJlY2F1c2UgdGhlIGF1dGhlbnRpY2F0aW9uIHRva2VuIHdhcyBlaXRoZXIgdGFtcGVyZWQgd2l0aCBvciBiYWRseSBmb3JtZWQuXCIsXHJcbiAgMjY6IFwiVGhlIHJlcXVlc3RlZCByZXNvdXJjZSByZXF1aXJlcyB0aGF0IHlvdSBiZSBsb2dnZWQgaW4gYXMgYSByZWdpc3RlcmVkIHVzZXIuXCIsXHJcbiAgMTAxOiBcIlRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgd2FzIGJhZGx5IGZvcm1lZC4gRW5zdXJlIHRoYXQgeW91ciBCcmlkZ2UgQ2xpZW50IGFuZCBCcmlkZ2UgU2VydmVyIHZlcnNpb25zIG1hdGNoLlwiLFxyXG4gIDEwMjogXCJUaGUgcmVzcG9uc2UgZmFpbGVkIG9yIHdhcyBpbmNvbXBsZXRlIGR1ZSB0byBhIG5ldHdvcmsgZXJyb3IuXCIsXHJcbiAgMTAzOiBcIlRoZSBzZXJ2ZXIgZGlkIG5vdCByZXNwb25kLiBDaGVjayB5b3VyIGludGVybmV0IGNvbm5lY3Rpb24gYW5kIGNvbmZpcm0gdGhhdCB5b3VyIEJyaWRnZSBTZXJ2ZXIgaXMgcnVubmluZy5cIixcclxuICAxMDQ6IFwiTm8gdXNlciBwcm9maWxlIGlzIGN1cnJlbnRseSBsb2FkZWQuIFlvdSBtdXN0IGxvZ2luIGJlZm9yZSB5b3UgY2FuIGNvbnRpbnVlLlwiLFxyXG4gIDEwNTogXCJUaGUgc3VwcGxpZWQgcGFzc3dvcmQgaXMgdG9vIHNob3J0LiBQbGVhc2UgY2hvb3NlIGEgbG9uZ2VyLCBtb3JlIHNlY3VyZSBwYXNzd29yZC5cIixcclxuICAxMDY6IFwiVGhlIHJlcXVlc3RlZCBvcGVyYXRpb24gd2lsbCByZXN1bHQgaW4gdW5zYXZlZCBjaGFuZ2VzIGJlaW5nIGxvc3QuIEFyZSB5b3Ugc3VyZT9cIlxyXG59O1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBwdWJsaWNcclxuICpcclxuICogQGZ1bmN0aW9uICAgICAgZ2V0RXhwbGFuYXRpb25cclxuICpcclxuICogQGRlc2NyaXB0aW9uICAgUmV0dXJucyBhIHN0cmluZyBpbnRlcnByZXRhdGlvbiBvZiB0aGUgZXJyb3IgY29kZSwgdGFyZ2V0ZWQgYXQgZXhwbGFpbmluZ1xyXG4gKiAgICAgICAgICAgICAgICB0aGUgbmF0dXJlIG9mIHRoZSBlcnJvciB0byB0aGUgZW5kLWRldmVsb3Blci4gSXQgaXMgYWR2aXNlZCB0aGF0IHRoZXNlIGVycm9yc1xyXG4gKiAgICAgICAgICAgICAgICBiZSByZS1pbnRlcnByZXRlZCBmb3IgdGhlIHVzZXIgYnkgdGhlIGltcGxlbWVudGluZyBhcHBsaWNhdGlvbi5cclxuICpcclxuICogQHBhcmFtICB7TnVtYmVyfSBlcnJvckNvZGUgICBUaGUgaW50ZWdlci12YWx1ZWQgZXJyb3IgY29kZSB0byBpbnRlcnByZXQuXHJcbiAqXHJcbiAqIEByZXR1cm4ge1N0cmluZ30gICAgICAgICAgICAgQSBzdHJpbmcgaW50ZXJwcmV0YXRpb24gb2YgdGhlIGVycm9yIGNvZGUuXHJcbiAqXHJcbiAqL1xyXG5leHBvcnRzLmdldEV4cGxhbmF0aW9uID0gZnVuY3Rpb24gZ2V0RXhwbGFuYXRpb24oIGVycm9yQ29kZSApIHtcclxuICAndXNlIHN0cmljdCc7XHJcbiAgcmV0dXJuIEVYUExBTkFUSU9OU1sgZXJyb3JDb2RlIF0gfHxcclxuICAgIFwiVW5rbm93biBlcnJvci4gWW91IG1heSBuZWVkIHRvIHVwZGF0ZSB5b3VyIEJyaWRnZSBDbGllbnQgYW5kL29yIEJyaWRnZSBTZXJ2ZXIgdmVyc2lvbi5cIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBAcHVibGljXHJcbiAqXHJcbiAqIEBjb25zdHJ1Y3RvciAgIEJyaWRnZUVycm9yXHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIFRoZSBCcmlkZ2VFcnJvciBjb25zdHJ1Y3RvciBjcmVhdGVzIGEgbmV3IEJyaWRnZUVycm9yIGluc3RhbmNlIGFuZCByZXR1cm5zIGl0LiBUaGVcclxuICogICAgICAgICAgICAgICAgY2FsbGVyIGlzIGV4cGVjdGVkIHRvIHByZWNlZGUgdGhlIGNhbGwgd2l0aCB0aGUgXCJuZXdcIiBrZXl3b3JkLlxyXG4gKlxyXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGVycm9yQ29kZSAgIFRoZSBpbnRlZ2VyLXZhbHVlZCBlcnJvciBjb2RlIHRvIGludGVycHJldC5cclxuICpcclxuICogQHJldHVybiB7QnJpZGdlRXJyb3J9ICAgICAgICBBIEJyaWRnZUVycm9yIG9iamVjdC5cclxuICpcclxuICovXHJcbmV4cG9ydHMuQnJpZGdlRXJyb3IgPSBmdW5jdGlvbiBCcmlkZ2VFcnJvciggZXJyb3JDb2RlICkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuICB0aGlzLnN0YXR1cyA9IDIwMDtcclxuICB0aGlzLmVycm9yQ29kZSA9IGVycm9yQ29kZTtcclxuICB0aGlzLm1lc3NhZ2UgPSBleHBvcnRzLmdldEV4cGxhbmF0aW9uKCBlcnJvckNvZGUgKTtcclxufTtcclxuIiwiOyhmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xyXG5cdGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xyXG5cdFx0Ly8gQ29tbW9uSlNcclxuXHRcdG1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IGZhY3RvcnkoKTtcclxuXHR9XHJcblx0ZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcclxuXHRcdC8vIEFNRFxyXG5cdFx0ZGVmaW5lKFtdLCBmYWN0b3J5KTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHQvLyBHbG9iYWwgKGJyb3dzZXIpXHJcblx0XHRyb290LkNyeXB0b0pTID0gZmFjdG9yeSgpO1xyXG5cdH1cclxufSh0aGlzLCBmdW5jdGlvbiAoKSB7XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyeXB0b0pTIGNvcmUgY29tcG9uZW50cy5cclxuXHQgKi9cclxuXHR2YXIgQ3J5cHRvSlMgPSBDcnlwdG9KUyB8fCAoZnVuY3Rpb24gKE1hdGgsIHVuZGVmaW5lZCkge1xyXG5cdCAgICAvKipcclxuXHQgICAgICogQ3J5cHRvSlMgbmFtZXNwYWNlLlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIEMgPSB7fTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBMaWJyYXJ5IG5hbWVzcGFjZS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBDX2xpYiA9IEMubGliID0ge307XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogQmFzZSBvYmplY3QgZm9yIHByb3RvdHlwYWwgaW5oZXJpdGFuY2UuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgQmFzZSA9IENfbGliLkJhc2UgPSAoZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgZnVuY3Rpb24gRigpIHt9XHJcblxyXG5cdCAgICAgICAgcmV0dXJuIHtcclxuXHQgICAgICAgICAgICAvKipcclxuXHQgICAgICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gdGhpcyBvYmplY3QuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3ZlcnJpZGVzIFByb3BlcnRpZXMgdG8gY29weSBpbnRvIHRoZSBuZXcgb2JqZWN0LlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgbmV3IG9iamVjdC5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiAgICAgdmFyIE15VHlwZSA9IENyeXB0b0pTLmxpYi5CYXNlLmV4dGVuZCh7XHJcblx0ICAgICAgICAgICAgICogICAgICAgICBmaWVsZDogJ3ZhbHVlJyxcclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqICAgICAgICAgbWV0aG9kOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgICogICAgICAgICB9XHJcblx0ICAgICAgICAgICAgICogICAgIH0pO1xyXG5cdCAgICAgICAgICAgICAqL1xyXG5cdCAgICAgICAgICAgIGV4dGVuZDogZnVuY3Rpb24gKG92ZXJyaWRlcykge1xyXG5cdCAgICAgICAgICAgICAgICAvLyBTcGF3blxyXG5cdCAgICAgICAgICAgICAgICBGLnByb3RvdHlwZSA9IHRoaXM7XHJcblx0ICAgICAgICAgICAgICAgIHZhciBzdWJ0eXBlID0gbmV3IEYoKTtcclxuXHJcblx0ICAgICAgICAgICAgICAgIC8vIEF1Z21lbnRcclxuXHQgICAgICAgICAgICAgICAgaWYgKG92ZXJyaWRlcykge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgc3VidHlwZS5taXhJbihvdmVycmlkZXMpO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgICAgICAvLyBDcmVhdGUgZGVmYXVsdCBpbml0aWFsaXplclxyXG5cdCAgICAgICAgICAgICAgICBpZiAoIXN1YnR5cGUuaGFzT3duUHJvcGVydHkoJ2luaXQnKSkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgc3VidHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgICAgIHN1YnR5cGUuJHN1cGVyLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHQgICAgICAgICAgICAgICAgICAgIH07XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemVyJ3MgcHJvdG90eXBlIGlzIHRoZSBzdWJ0eXBlIG9iamVjdFxyXG5cdCAgICAgICAgICAgICAgICBzdWJ0eXBlLmluaXQucHJvdG90eXBlID0gc3VidHlwZTtcclxuXHJcblx0ICAgICAgICAgICAgICAgIC8vIFJlZmVyZW5jZSBzdXBlcnR5cGVcclxuXHQgICAgICAgICAgICAgICAgc3VidHlwZS4kc3VwZXIgPSB0aGlzO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIHN1YnR5cGU7XHJcblx0ICAgICAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAgICAgLyoqXHJcblx0ICAgICAgICAgICAgICogRXh0ZW5kcyB0aGlzIG9iamVjdCBhbmQgcnVucyB0aGUgaW5pdCBtZXRob2QuXHJcblx0ICAgICAgICAgICAgICogQXJndW1lbnRzIHRvIGNyZWF0ZSgpIHdpbGwgYmUgcGFzc2VkIHRvIGluaXQoKS5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIG5ldyBvYmplY3QuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogICAgIHZhciBpbnN0YW5jZSA9IE15VHlwZS5jcmVhdGUoKTtcclxuXHQgICAgICAgICAgICAgKi9cclxuXHQgICAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlID0gdGhpcy5leHRlbmQoKTtcclxuXHQgICAgICAgICAgICAgICAgaW5zdGFuY2UuaW5pdC5hcHBseShpbnN0YW5jZSwgYXJndW1lbnRzKTtcclxuXHJcblx0ICAgICAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZTtcclxuXHQgICAgICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgICAgICAvKipcclxuXHQgICAgICAgICAgICAgKiBJbml0aWFsaXplcyBhIG5ld2x5IGNyZWF0ZWQgb2JqZWN0LlxyXG5cdCAgICAgICAgICAgICAqIE92ZXJyaWRlIHRoaXMgbWV0aG9kIHRvIGFkZCBzb21lIGxvZ2ljIHdoZW4geW91ciBvYmplY3RzIGFyZSBjcmVhdGVkLlxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqICAgICB2YXIgTXlUeXBlID0gQ3J5cHRvSlMubGliLkJhc2UuZXh0ZW5kKHtcclxuXHQgICAgICAgICAgICAgKiAgICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAgKiAgICAgICAgICAgICAvLyAuLi5cclxuXHQgICAgICAgICAgICAgKiAgICAgICAgIH1cclxuXHQgICAgICAgICAgICAgKiAgICAgfSk7XHJcblx0ICAgICAgICAgICAgICovXHJcblx0ICAgICAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICAgICAqIENvcGllcyBwcm9wZXJ0aWVzIGludG8gdGhpcyBvYmplY3QuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gcHJvcGVydGllcyBUaGUgcHJvcGVydGllcyB0byBtaXggaW4uXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICAgICAqXHJcblx0ICAgICAgICAgICAgICogICAgIE15VHlwZS5taXhJbih7XHJcblx0ICAgICAgICAgICAgICogICAgICAgICBmaWVsZDogJ3ZhbHVlJ1xyXG5cdCAgICAgICAgICAgICAqICAgICB9KTtcclxuXHQgICAgICAgICAgICAgKi9cclxuXHQgICAgICAgICAgICBtaXhJbjogZnVuY3Rpb24gKHByb3BlcnRpZXMpIHtcclxuXHQgICAgICAgICAgICAgICAgZm9yICh2YXIgcHJvcGVydHlOYW1lIGluIHByb3BlcnRpZXMpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgICAgICB0aGlzW3Byb3BlcnR5TmFtZV0gPSBwcm9wZXJ0aWVzW3Byb3BlcnR5TmFtZV07XHJcblx0ICAgICAgICAgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgICAgIC8vIElFIHdvbid0IGNvcHkgdG9TdHJpbmcgdXNpbmcgdGhlIGxvb3AgYWJvdmVcclxuXHQgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkoJ3RvU3RyaW5nJykpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHRoaXMudG9TdHJpbmcgPSBwcm9wZXJ0aWVzLnRvU3RyaW5nO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAgICAgLyoqXHJcblx0ICAgICAgICAgICAgICogQ3JlYXRlcyBhIGNvcHkgb2YgdGhpcyBvYmplY3QuXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBjbG9uZS5cclxuXHQgICAgICAgICAgICAgKlxyXG5cdCAgICAgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgICAgICpcclxuXHQgICAgICAgICAgICAgKiAgICAgdmFyIGNsb25lID0gaW5zdGFuY2UuY2xvbmUoKTtcclxuXHQgICAgICAgICAgICAgKi9cclxuXHQgICAgICAgICAgICBjbG9uZTogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0LnByb3RvdHlwZS5leHRlbmQodGhpcyk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgfTtcclxuXHQgICAgfSgpKTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBBbiBhcnJheSBvZiAzMi1iaXQgd29yZHMuXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBwcm9wZXJ0eSB7QXJyYXl9IHdvcmRzIFRoZSBhcnJheSBvZiAzMi1iaXQgd29yZHMuXHJcblx0ICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBzaWdCeXRlcyBUaGUgbnVtYmVyIG9mIHNpZ25pZmljYW50IGJ5dGVzIGluIHRoaXMgd29yZCBhcnJheS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBXb3JkQXJyYXkgPSBDX2xpYi5Xb3JkQXJyYXkgPSBCYXNlLmV4dGVuZCh7XHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIEluaXRpYWxpemVzIGEgbmV3bHkgY3JlYXRlZCB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IHdvcmRzIChPcHRpb25hbCkgQW4gYXJyYXkgb2YgMzItYml0IHdvcmRzLlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IHNpZ0J5dGVzIChPcHRpb25hbCkgVGhlIG51bWJlciBvZiBzaWduaWZpY2FudCBieXRlcyBpbiB0aGUgd29yZHMuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmxpYi5Xb3JkQXJyYXkuY3JlYXRlKCk7XHJcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmxpYi5Xb3JkQXJyYXkuY3JlYXRlKFsweDAwMDEwMjAzLCAweDA0MDUwNjA3XSk7XHJcblx0ICAgICAgICAgKiAgICAgdmFyIHdvcmRBcnJheSA9IENyeXB0b0pTLmxpYi5Xb3JkQXJyYXkuY3JlYXRlKFsweDAwMDEwMjAzLCAweDA0MDUwNjA3XSwgNik7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGluaXQ6IGZ1bmN0aW9uICh3b3Jkcywgc2lnQnl0ZXMpIHtcclxuXHQgICAgICAgICAgICB3b3JkcyA9IHRoaXMud29yZHMgPSB3b3JkcyB8fCBbXTtcclxuXHJcblx0ICAgICAgICAgICAgaWYgKHNpZ0J5dGVzICE9IHVuZGVmaW5lZCkge1xyXG5cdCAgICAgICAgICAgICAgICB0aGlzLnNpZ0J5dGVzID0gc2lnQnl0ZXM7XHJcblx0ICAgICAgICAgICAgfSBlbHNlIHtcclxuXHQgICAgICAgICAgICAgICAgdGhpcy5zaWdCeXRlcyA9IHdvcmRzLmxlbmd0aCAqIDQ7XHJcblx0ICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbnZlcnRzIHRoaXMgd29yZCBhcnJheSB0byBhIHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge0VuY29kZXJ9IGVuY29kZXIgKE9wdGlvbmFsKSBUaGUgZW5jb2Rpbmcgc3RyYXRlZ3kgdG8gdXNlLiBEZWZhdWx0OiBDcnlwdG9KUy5lbmMuSGV4XHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgc3RyaW5naWZpZWQgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgc3RyaW5nID0gd29yZEFycmF5ICsgJyc7XHJcblx0ICAgICAgICAgKiAgICAgdmFyIHN0cmluZyA9IHdvcmRBcnJheS50b1N0cmluZygpO1xyXG5cdCAgICAgICAgICogICAgIHZhciBzdHJpbmcgPSB3b3JkQXJyYXkudG9TdHJpbmcoQ3J5cHRvSlMuZW5jLlV0ZjgpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICB0b1N0cmluZzogZnVuY3Rpb24gKGVuY29kZXIpIHtcclxuXHQgICAgICAgICAgICByZXR1cm4gKGVuY29kZXIgfHwgSGV4KS5zdHJpbmdpZnkodGhpcyk7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ29uY2F0ZW5hdGVzIGEgd29yZCBhcnJheSB0byB0aGlzIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl9IHdvcmRBcnJheSBUaGUgd29yZCBhcnJheSB0byBhcHBlbmQuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGlzIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgd29yZEFycmF5MS5jb25jYXQod29yZEFycmF5Mik7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGNvbmNhdDogZnVuY3Rpb24gKHdvcmRBcnJheSkge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICAgICAgICAgIHZhciB0aGlzV29yZHMgPSB0aGlzLndvcmRzO1xyXG5cdCAgICAgICAgICAgIHZhciB0aGF0V29yZHMgPSB3b3JkQXJyYXkud29yZHM7XHJcblx0ICAgICAgICAgICAgdmFyIHRoaXNTaWdCeXRlcyA9IHRoaXMuc2lnQnl0ZXM7XHJcblx0ICAgICAgICAgICAgdmFyIHRoYXRTaWdCeXRlcyA9IHdvcmRBcnJheS5zaWdCeXRlcztcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ2xhbXAgZXhjZXNzIGJpdHNcclxuXHQgICAgICAgICAgICB0aGlzLmNsYW1wKCk7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvbmNhdFxyXG5cdCAgICAgICAgICAgIGlmICh0aGlzU2lnQnl0ZXMgJSA0KSB7XHJcblx0ICAgICAgICAgICAgICAgIC8vIENvcHkgb25lIGJ5dGUgYXQgYSB0aW1lXHJcblx0ICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhhdFNpZ0J5dGVzOyBpKyspIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHZhciB0aGF0Qnl0ZSA9ICh0aGF0V29yZHNbaSA+Pj4gMl0gPj4+ICgyNCAtIChpICUgNCkgKiA4KSkgJiAweGZmO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdGhpc1dvcmRzWyh0aGlzU2lnQnl0ZXMgKyBpKSA+Pj4gMl0gfD0gdGhhdEJ5dGUgPDwgKDI0IC0gKCh0aGlzU2lnQnl0ZXMgKyBpKSAlIDQpICogOCk7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB9IGVsc2UgaWYgKHRoYXRXb3Jkcy5sZW5ndGggPiAweGZmZmYpIHtcclxuXHQgICAgICAgICAgICAgICAgLy8gQ29weSBvbmUgd29yZCBhdCBhIHRpbWVcclxuXHQgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGF0U2lnQnl0ZXM7IGkgKz0gNCkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdGhpc1dvcmRzWyh0aGlzU2lnQnl0ZXMgKyBpKSA+Pj4gMl0gPSB0aGF0V29yZHNbaSA+Pj4gMl07XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB9IGVsc2Uge1xyXG5cdCAgICAgICAgICAgICAgICAvLyBDb3B5IGFsbCB3b3JkcyBhdCBvbmNlXHJcblx0ICAgICAgICAgICAgICAgIHRoaXNXb3Jkcy5wdXNoLmFwcGx5KHRoaXNXb3JkcywgdGhhdFdvcmRzKTtcclxuXHQgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgdGhpcy5zaWdCeXRlcyArPSB0aGF0U2lnQnl0ZXM7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENoYWluYWJsZVxyXG5cdCAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIFJlbW92ZXMgaW5zaWduaWZpY2FudCBiaXRzLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHdvcmRBcnJheS5jbGFtcCgpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBjbGFtcDogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IHRoaXMud29yZHM7XHJcblx0ICAgICAgICAgICAgdmFyIHNpZ0J5dGVzID0gdGhpcy5zaWdCeXRlcztcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ2xhbXBcclxuXHQgICAgICAgICAgICB3b3Jkc1tzaWdCeXRlcyA+Pj4gMl0gJj0gMHhmZmZmZmZmZiA8PCAoMzIgLSAoc2lnQnl0ZXMgJSA0KSAqIDgpO1xyXG5cdCAgICAgICAgICAgIHdvcmRzLmxlbmd0aCA9IE1hdGguY2VpbChzaWdCeXRlcyAvIDQpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENyZWF0ZXMgYSBjb3B5IG9mIHRoaXMgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBjbG9uZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgY2xvbmUgPSB3b3JkQXJyYXkuY2xvbmUoKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICB2YXIgY2xvbmUgPSBCYXNlLmNsb25lLmNhbGwodGhpcyk7XHJcblx0ICAgICAgICAgICAgY2xvbmUud29yZHMgPSB0aGlzLndvcmRzLnNsaWNlKDApO1xyXG5cclxuXHQgICAgICAgICAgICByZXR1cm4gY2xvbmU7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ3JlYXRlcyBhIHdvcmQgYXJyYXkgZmlsbGVkIHdpdGggcmFuZG9tIGJ5dGVzLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBuQnl0ZXMgVGhlIG51bWJlciBvZiByYW5kb20gYnl0ZXMgdG8gZ2VuZXJhdGUuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgcmFuZG9tIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5saWIuV29yZEFycmF5LnJhbmRvbSgxNik7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHJhbmRvbTogZnVuY3Rpb24gKG5CeXRlcykge1xyXG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IFtdO1xyXG5cclxuXHQgICAgICAgICAgICB2YXIgciA9IChmdW5jdGlvbiAobV93KSB7XHJcblx0ICAgICAgICAgICAgICAgIHZhciBtX3cgPSBtX3c7XHJcblx0ICAgICAgICAgICAgICAgIHZhciBtX3ogPSAweDNhZGU2OGIxO1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgbWFzayA9IDB4ZmZmZmZmZmY7XHJcblxyXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgbV96ID0gKDB4OTA2OSAqIChtX3ogJiAweEZGRkYpICsgKG1feiA+PiAweDEwKSkgJiBtYXNrO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgbV93ID0gKDB4NDY1MCAqIChtX3cgJiAweEZGRkYpICsgKG1fdyA+PiAweDEwKSkgJiBtYXNrO1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9ICgobV96IDw8IDB4MTApICsgbV93KSAmIG1hc2s7XHJcblx0ICAgICAgICAgICAgICAgICAgICByZXN1bHQgLz0gMHgxMDAwMDAwMDA7XHJcblx0ICAgICAgICAgICAgICAgICAgICByZXN1bHQgKz0gMC41O1xyXG5cdCAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCAqIChNYXRoLnJhbmRvbSgpID4gLjUgPyAxIDogLTEpO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgfSk7XHJcblxyXG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCByY2FjaGU7IGkgPCBuQnl0ZXM7IGkgKz0gNCkge1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgX3IgPSByKChyY2FjaGUgfHwgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwMDAwMCk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICByY2FjaGUgPSBfcigpICogMHgzYWRlNjdiNztcclxuXHQgICAgICAgICAgICAgICAgd29yZHMucHVzaCgoX3IoKSAqIDB4MTAwMDAwMDAwKSB8IDApO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkQXJyYXkuaW5pdCh3b3JkcywgbkJ5dGVzKTtcclxuXHQgICAgICAgIH1cclxuXHQgICAgfSk7XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogRW5jb2RlciBuYW1lc3BhY2UuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgQ19lbmMgPSBDLmVuYyA9IHt9O1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIEhleCBlbmNvZGluZyBzdHJhdGVneS5cclxuXHQgICAgICovXHJcblx0ICAgIHZhciBIZXggPSBDX2VuYy5IZXggPSB7XHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgd29yZCBhcnJheSB0byBhIGhleCBzdHJpbmcuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl9IHdvcmRBcnJheSBUaGUgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBoZXggc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgaGV4U3RyaW5nID0gQ3J5cHRvSlMuZW5jLkhleC5zdHJpbmdpZnkod29yZEFycmF5KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgc3RyaW5naWZ5OiBmdW5jdGlvbiAod29yZEFycmF5KSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXHJcblx0ICAgICAgICAgICAgdmFyIHdvcmRzID0gd29yZEFycmF5LndvcmRzO1xyXG5cdCAgICAgICAgICAgIHZhciBzaWdCeXRlcyA9IHdvcmRBcnJheS5zaWdCeXRlcztcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ29udmVydFxyXG5cdCAgICAgICAgICAgIHZhciBoZXhDaGFycyA9IFtdO1xyXG5cdCAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2lnQnl0ZXM7IGkrKykge1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgYml0ZSA9ICh3b3Jkc1tpID4+PiAyXSA+Pj4gKDI0IC0gKGkgJSA0KSAqIDgpKSAmIDB4ZmY7XHJcblx0ICAgICAgICAgICAgICAgIGhleENoYXJzLnB1c2goKGJpdGUgPj4+IDQpLnRvU3RyaW5nKDE2KSk7XHJcblx0ICAgICAgICAgICAgICAgIGhleENoYXJzLnB1c2goKGJpdGUgJiAweDBmKS50b1N0cmluZygxNikpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIGhleENoYXJzLmpvaW4oJycpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgaGV4IHN0cmluZyB0byBhIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGhleFN0ciBUaGUgaGV4IHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMuZW5jLkhleC5wYXJzZShoZXhTdHJpbmcpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBwYXJzZTogZnVuY3Rpb24gKGhleFN0cikge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0XHJcblx0ICAgICAgICAgICAgdmFyIGhleFN0ckxlbmd0aCA9IGhleFN0ci5sZW5ndGg7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnRcclxuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSBbXTtcclxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhleFN0ckxlbmd0aDsgaSArPSAyKSB7XHJcblx0ICAgICAgICAgICAgICAgIHdvcmRzW2kgPj4+IDNdIHw9IHBhcnNlSW50KGhleFN0ci5zdWJzdHIoaSwgMiksIDE2KSA8PCAoMjQgLSAoaSAlIDgpICogNCk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICByZXR1cm4gbmV3IFdvcmRBcnJheS5pbml0KHdvcmRzLCBoZXhTdHJMZW5ndGggLyAyKTtcclxuXHQgICAgICAgIH1cclxuXHQgICAgfTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBMYXRpbjEgZW5jb2Rpbmcgc3RyYXRlZ3kuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgTGF0aW4xID0gQ19lbmMuTGF0aW4xID0ge1xyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb252ZXJ0cyBhIHdvcmQgYXJyYXkgdG8gYSBMYXRpbjEgc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fSB3b3JkQXJyYXkgVGhlIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgTGF0aW4xIHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIGxhdGluMVN0cmluZyA9IENyeXB0b0pTLmVuYy5MYXRpbjEuc3RyaW5naWZ5KHdvcmRBcnJheSk7XHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIHN0cmluZ2lmeTogZnVuY3Rpb24gKHdvcmRBcnJheSkge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICAgICAgICAgIHZhciB3b3JkcyA9IHdvcmRBcnJheS53b3JkcztcclxuXHQgICAgICAgICAgICB2YXIgc2lnQnl0ZXMgPSB3b3JkQXJyYXkuc2lnQnl0ZXM7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnRcclxuXHQgICAgICAgICAgICB2YXIgbGF0aW4xQ2hhcnMgPSBbXTtcclxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpZ0J5dGVzOyBpKyspIHtcclxuXHQgICAgICAgICAgICAgICAgdmFyIGJpdGUgPSAod29yZHNbaSA+Pj4gMl0gPj4+ICgyNCAtIChpICUgNCkgKiA4KSkgJiAweGZmO1xyXG5cdCAgICAgICAgICAgICAgICBsYXRpbjFDaGFycy5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUoYml0ZSkpO1xyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIGxhdGluMUNoYXJzLmpvaW4oJycpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgTGF0aW4xIHN0cmluZyB0byBhIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGxhdGluMVN0ciBUaGUgTGF0aW4xIHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBzdGF0aWNcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgd29yZEFycmF5ID0gQ3J5cHRvSlMuZW5jLkxhdGluMS5wYXJzZShsYXRpbjFTdHJpbmcpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBwYXJzZTogZnVuY3Rpb24gKGxhdGluMVN0cikge1xyXG5cdCAgICAgICAgICAgIC8vIFNob3J0Y3V0XHJcblx0ICAgICAgICAgICAgdmFyIGxhdGluMVN0ckxlbmd0aCA9IGxhdGluMVN0ci5sZW5ndGg7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnRcclxuXHQgICAgICAgICAgICB2YXIgd29yZHMgPSBbXTtcclxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhdGluMVN0ckxlbmd0aDsgaSsrKSB7XHJcblx0ICAgICAgICAgICAgICAgIHdvcmRzW2kgPj4+IDJdIHw9IChsYXRpbjFTdHIuY2hhckNvZGVBdChpKSAmIDB4ZmYpIDw8ICgyNCAtIChpICUgNCkgKiA4KTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBuZXcgV29yZEFycmF5LmluaXQod29yZHMsIGxhdGluMVN0ckxlbmd0aCk7XHJcblx0ICAgICAgICB9XHJcblx0ICAgIH07XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogVVRGLTggZW5jb2Rpbmcgc3RyYXRlZ3kuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgVXRmOCA9IENfZW5jLlV0ZjggPSB7XHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgd29yZCBhcnJheSB0byBhIFVURi04IHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheX0gd29yZEFycmF5IFRoZSB3b3JkIGFycmF5LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIFVURi04IHN0cmluZy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIHV0ZjhTdHJpbmcgPSBDcnlwdG9KUy5lbmMuVXRmOC5zdHJpbmdpZnkod29yZEFycmF5KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgc3RyaW5naWZ5OiBmdW5jdGlvbiAod29yZEFycmF5KSB7XHJcblx0ICAgICAgICAgICAgdHJ5IHtcclxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoTGF0aW4xLnN0cmluZ2lmeSh3b3JkQXJyYXkpKSk7XHJcblx0ICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG5cdCAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01hbGZvcm1lZCBVVEYtOCBkYXRhJyk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENvbnZlcnRzIGEgVVRGLTggc3RyaW5nIHRvIGEgd29yZCBhcnJheS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXRmOFN0ciBUaGUgVVRGLTggc3RyaW5nLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHdvcmQgYXJyYXkuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciB3b3JkQXJyYXkgPSBDcnlwdG9KUy5lbmMuVXRmOC5wYXJzZSh1dGY4U3RyaW5nKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgcGFyc2U6IGZ1bmN0aW9uICh1dGY4U3RyKSB7XHJcblx0ICAgICAgICAgICAgcmV0dXJuIExhdGluMS5wYXJzZSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQodXRmOFN0cikpKTtcclxuXHQgICAgICAgIH1cclxuXHQgICAgfTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBBYnN0cmFjdCBidWZmZXJlZCBibG9jayBhbGdvcml0aG0gdGVtcGxhdGUuXHJcblx0ICAgICAqXHJcblx0ICAgICAqIFRoZSBwcm9wZXJ0eSBibG9ja1NpemUgbXVzdCBiZSBpbXBsZW1lbnRlZCBpbiBhIGNvbmNyZXRlIHN1YnR5cGUuXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBfbWluQnVmZmVyU2l6ZSBUaGUgbnVtYmVyIG9mIGJsb2NrcyB0aGF0IHNob3VsZCBiZSBrZXB0IHVucHJvY2Vzc2VkIGluIHRoZSBidWZmZXIuIERlZmF1bHQ6IDBcclxuXHQgICAgICovXHJcblx0ICAgIHZhciBCdWZmZXJlZEJsb2NrQWxnb3JpdGhtID0gQ19saWIuQnVmZmVyZWRCbG9ja0FsZ29yaXRobSA9IEJhc2UuZXh0ZW5kKHtcclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogUmVzZXRzIHRoaXMgYmxvY2sgYWxnb3JpdGhtJ3MgZGF0YSBidWZmZXIgdG8gaXRzIGluaXRpYWwgc3RhdGUuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5yZXNldCgpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICByZXNldDogZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgICAgIC8vIEluaXRpYWwgdmFsdWVzXHJcblx0ICAgICAgICAgICAgdGhpcy5fZGF0YSA9IG5ldyBXb3JkQXJyYXkuaW5pdCgpO1xyXG5cdCAgICAgICAgICAgIHRoaXMuX25EYXRhQnl0ZXMgPSAwO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIEFkZHMgbmV3IGRhdGEgdG8gdGhpcyBibG9jayBhbGdvcml0aG0ncyBidWZmZXIuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBkYXRhIFRoZSBkYXRhIHRvIGFwcGVuZC4gU3RyaW5ncyBhcmUgY29udmVydGVkIHRvIGEgV29yZEFycmF5IHVzaW5nIFVURi04LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uX2FwcGVuZCgnZGF0YScpO1xyXG5cdCAgICAgICAgICogICAgIGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uX2FwcGVuZCh3b3JkQXJyYXkpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBfYXBwZW5kOiBmdW5jdGlvbiAoZGF0YSkge1xyXG5cdCAgICAgICAgICAgIC8vIENvbnZlcnQgc3RyaW5nIHRvIFdvcmRBcnJheSwgZWxzZSBhc3N1bWUgV29yZEFycmF5IGFscmVhZHlcclxuXHQgICAgICAgICAgICBpZiAodHlwZW9mIGRhdGEgPT0gJ3N0cmluZycpIHtcclxuXHQgICAgICAgICAgICAgICAgZGF0YSA9IFV0ZjgucGFyc2UoZGF0YSk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAvLyBBcHBlbmRcclxuXHQgICAgICAgICAgICB0aGlzLl9kYXRhLmNvbmNhdChkYXRhKTtcclxuXHQgICAgICAgICAgICB0aGlzLl9uRGF0YUJ5dGVzICs9IGRhdGEuc2lnQnl0ZXM7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogUHJvY2Vzc2VzIGF2YWlsYWJsZSBkYXRhIGJsb2Nrcy5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBUaGlzIG1ldGhvZCBpbnZva2VzIF9kb1Byb2Nlc3NCbG9jayhvZmZzZXQpLCB3aGljaCBtdXN0IGJlIGltcGxlbWVudGVkIGJ5IGEgY29uY3JldGUgc3VidHlwZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGRvRmx1c2ggV2hldGhlciBhbGwgYmxvY2tzIGFuZCBwYXJ0aWFsIGJsb2NrcyBzaG91bGQgYmUgcHJvY2Vzc2VkLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIHByb2Nlc3NlZCBkYXRhLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBwcm9jZXNzZWREYXRhID0gYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5fcHJvY2VzcygpO1xyXG5cdCAgICAgICAgICogICAgIHZhciBwcm9jZXNzZWREYXRhID0gYnVmZmVyZWRCbG9ja0FsZ29yaXRobS5fcHJvY2VzcyghISdmbHVzaCcpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBfcHJvY2VzczogZnVuY3Rpb24gKGRvRmx1c2gpIHtcclxuXHQgICAgICAgICAgICAvLyBTaG9ydGN1dHNcclxuXHQgICAgICAgICAgICB2YXIgZGF0YSA9IHRoaXMuX2RhdGE7XHJcblx0ICAgICAgICAgICAgdmFyIGRhdGFXb3JkcyA9IGRhdGEud29yZHM7XHJcblx0ICAgICAgICAgICAgdmFyIGRhdGFTaWdCeXRlcyA9IGRhdGEuc2lnQnl0ZXM7XHJcblx0ICAgICAgICAgICAgdmFyIGJsb2NrU2l6ZSA9IHRoaXMuYmxvY2tTaXplO1xyXG5cdCAgICAgICAgICAgIHZhciBibG9ja1NpemVCeXRlcyA9IGJsb2NrU2l6ZSAqIDQ7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvdW50IGJsb2NrcyByZWFkeVxyXG5cdCAgICAgICAgICAgIHZhciBuQmxvY2tzUmVhZHkgPSBkYXRhU2lnQnl0ZXMgLyBibG9ja1NpemVCeXRlcztcclxuXHQgICAgICAgICAgICBpZiAoZG9GbHVzaCkge1xyXG5cdCAgICAgICAgICAgICAgICAvLyBSb3VuZCB1cCB0byBpbmNsdWRlIHBhcnRpYWwgYmxvY2tzXHJcblx0ICAgICAgICAgICAgICAgIG5CbG9ja3NSZWFkeSA9IE1hdGguY2VpbChuQmxvY2tzUmVhZHkpO1xyXG5cdCAgICAgICAgICAgIH0gZWxzZSB7XHJcblx0ICAgICAgICAgICAgICAgIC8vIFJvdW5kIGRvd24gdG8gaW5jbHVkZSBvbmx5IGZ1bGwgYmxvY2tzLFxyXG5cdCAgICAgICAgICAgICAgICAvLyBsZXNzIHRoZSBudW1iZXIgb2YgYmxvY2tzIHRoYXQgbXVzdCByZW1haW4gaW4gdGhlIGJ1ZmZlclxyXG5cdCAgICAgICAgICAgICAgICBuQmxvY2tzUmVhZHkgPSBNYXRoLm1heCgobkJsb2Nrc1JlYWR5IHwgMCkgLSB0aGlzLl9taW5CdWZmZXJTaXplLCAwKTtcclxuXHQgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgIC8vIENvdW50IHdvcmRzIHJlYWR5XHJcblx0ICAgICAgICAgICAgdmFyIG5Xb3Jkc1JlYWR5ID0gbkJsb2Nrc1JlYWR5ICogYmxvY2tTaXplO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDb3VudCBieXRlcyByZWFkeVxyXG5cdCAgICAgICAgICAgIHZhciBuQnl0ZXNSZWFkeSA9IE1hdGgubWluKG5Xb3Jkc1JlYWR5ICogNCwgZGF0YVNpZ0J5dGVzKTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gUHJvY2VzcyBibG9ja3NcclxuXHQgICAgICAgICAgICBpZiAobldvcmRzUmVhZHkpIHtcclxuXHQgICAgICAgICAgICAgICAgZm9yICh2YXIgb2Zmc2V0ID0gMDsgb2Zmc2V0IDwgbldvcmRzUmVhZHk7IG9mZnNldCArPSBibG9ja1NpemUpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIC8vIFBlcmZvcm0gY29uY3JldGUtYWxnb3JpdGhtIGxvZ2ljXHJcblx0ICAgICAgICAgICAgICAgICAgICB0aGlzLl9kb1Byb2Nlc3NCbG9jayhkYXRhV29yZHMsIG9mZnNldCk7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBwcm9jZXNzZWQgd29yZHNcclxuXHQgICAgICAgICAgICAgICAgdmFyIHByb2Nlc3NlZFdvcmRzID0gZGF0YVdvcmRzLnNwbGljZSgwLCBuV29yZHNSZWFkeSk7XHJcblx0ICAgICAgICAgICAgICAgIGRhdGEuc2lnQnl0ZXMgLT0gbkJ5dGVzUmVhZHk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAvLyBSZXR1cm4gcHJvY2Vzc2VkIHdvcmRzXHJcblx0ICAgICAgICAgICAgcmV0dXJuIG5ldyBXb3JkQXJyYXkuaW5pdChwcm9jZXNzZWRXb3JkcywgbkJ5dGVzUmVhZHkpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIENyZWF0ZXMgYSBjb3B5IG9mIHRoaXMgb2JqZWN0LlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIGNsb25lLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBjbG9uZSA9IGJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0uY2xvbmUoKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICB2YXIgY2xvbmUgPSBCYXNlLmNsb25lLmNhbGwodGhpcyk7XHJcblx0ICAgICAgICAgICAgY2xvbmUuX2RhdGEgPSB0aGlzLl9kYXRhLmNsb25lKCk7XHJcblxyXG5cdCAgICAgICAgICAgIHJldHVybiBjbG9uZTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgX21pbkJ1ZmZlclNpemU6IDBcclxuXHQgICAgfSk7XHJcblxyXG5cdCAgICAvKipcclxuXHQgICAgICogQWJzdHJhY3QgaGFzaGVyIHRlbXBsYXRlLlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAcHJvcGVydHkge251bWJlcn0gYmxvY2tTaXplIFRoZSBudW1iZXIgb2YgMzItYml0IHdvcmRzIHRoaXMgaGFzaGVyIG9wZXJhdGVzIG9uLiBEZWZhdWx0OiAxNiAoNTEyIGJpdHMpXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgSGFzaGVyID0gQ19saWIuSGFzaGVyID0gQnVmZmVyZWRCbG9ja0FsZ29yaXRobS5leHRlbmQoe1xyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDb25maWd1cmF0aW9uIG9wdGlvbnMuXHJcblx0ICAgICAgICAgKi9cclxuXHQgICAgICAgIGNmZzogQmFzZS5leHRlbmQoKSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIEluaXRpYWxpemVzIGEgbmV3bHkgY3JlYXRlZCBoYXNoZXIuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGNmZyAoT3B0aW9uYWwpIFRoZSBjb25maWd1cmF0aW9uIG9wdGlvbnMgdG8gdXNlIGZvciB0aGlzIGhhc2ggY29tcHV0YXRpb24uXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIGhhc2hlciA9IENyeXB0b0pTLmFsZ28uU0hBMjU2LmNyZWF0ZSgpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBpbml0OiBmdW5jdGlvbiAoY2ZnKSB7XHJcblx0ICAgICAgICAgICAgLy8gQXBwbHkgY29uZmlnIGRlZmF1bHRzXHJcblx0ICAgICAgICAgICAgdGhpcy5jZmcgPSB0aGlzLmNmZy5leHRlbmQoY2ZnKTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gU2V0IGluaXRpYWwgdmFsdWVzXHJcblx0ICAgICAgICAgICAgdGhpcy5yZXNldCgpO1xyXG5cdCAgICAgICAgfSxcclxuXHJcblx0ICAgICAgICAvKipcclxuXHQgICAgICAgICAqIFJlc2V0cyB0aGlzIGhhc2hlciB0byBpdHMgaW5pdGlhbCBzdGF0ZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICBoYXNoZXIucmVzZXQoKTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICAvLyBSZXNldCBkYXRhIGJ1ZmZlclxyXG5cdCAgICAgICAgICAgIEJ1ZmZlcmVkQmxvY2tBbGdvcml0aG0ucmVzZXQuY2FsbCh0aGlzKTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gUGVyZm9ybSBjb25jcmV0ZS1oYXNoZXIgbG9naWNcclxuXHQgICAgICAgICAgICB0aGlzLl9kb1Jlc2V0KCk7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogVXBkYXRlcyB0aGlzIGhhc2hlciB3aXRoIGEgbWVzc2FnZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge1dvcmRBcnJheXxzdHJpbmd9IG1lc3NhZ2VVcGRhdGUgVGhlIG1lc3NhZ2UgdG8gYXBwZW5kLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge0hhc2hlcn0gVGhpcyBoYXNoZXIuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgaGFzaGVyLnVwZGF0ZSgnbWVzc2FnZScpO1xyXG5cdCAgICAgICAgICogICAgIGhhc2hlci51cGRhdGUod29yZEFycmF5KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAobWVzc2FnZVVwZGF0ZSkge1xyXG5cdCAgICAgICAgICAgIC8vIEFwcGVuZFxyXG5cdCAgICAgICAgICAgIHRoaXMuX2FwcGVuZChtZXNzYWdlVXBkYXRlKTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBoYXNoXHJcblx0ICAgICAgICAgICAgdGhpcy5fcHJvY2VzcygpO1xyXG5cclxuXHQgICAgICAgICAgICAvLyBDaGFpbmFibGVcclxuXHQgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBGaW5hbGl6ZXMgdGhlIGhhc2ggY29tcHV0YXRpb24uXHJcblx0ICAgICAgICAgKiBOb3RlIHRoYXQgdGhlIGZpbmFsaXplIG9wZXJhdGlvbiBpcyBlZmZlY3RpdmVseSBhIGRlc3RydWN0aXZlLCByZWFkLW9uY2Ugb3BlcmF0aW9uLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30gbWVzc2FnZVVwZGF0ZSAoT3B0aW9uYWwpIEEgZmluYWwgbWVzc2FnZSB1cGRhdGUuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7V29yZEFycmF5fSBUaGUgaGFzaC5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAZXhhbXBsZVxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqICAgICB2YXIgaGFzaCA9IGhhc2hlci5maW5hbGl6ZSgpO1xyXG5cdCAgICAgICAgICogICAgIHZhciBoYXNoID0gaGFzaGVyLmZpbmFsaXplKCdtZXNzYWdlJyk7XHJcblx0ICAgICAgICAgKiAgICAgdmFyIGhhc2ggPSBoYXNoZXIuZmluYWxpemUod29yZEFycmF5KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uIChtZXNzYWdlVXBkYXRlKSB7XHJcblx0ICAgICAgICAgICAgLy8gRmluYWwgbWVzc2FnZSB1cGRhdGVcclxuXHQgICAgICAgICAgICBpZiAobWVzc2FnZVVwZGF0ZSkge1xyXG5cdCAgICAgICAgICAgICAgICB0aGlzLl9hcHBlbmQobWVzc2FnZVVwZGF0ZSk7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbmNyZXRlLWhhc2hlciBsb2dpY1xyXG5cdCAgICAgICAgICAgIHZhciBoYXNoID0gdGhpcy5fZG9GaW5hbGl6ZSgpO1xyXG5cclxuXHQgICAgICAgICAgICByZXR1cm4gaGFzaDtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgYmxvY2tTaXplOiA1MTIvMzIsXHJcblxyXG5cdCAgICAgICAgLyoqXHJcblx0ICAgICAgICAgKiBDcmVhdGVzIGEgc2hvcnRjdXQgZnVuY3Rpb24gdG8gYSBoYXNoZXIncyBvYmplY3QgaW50ZXJmYWNlLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBwYXJhbSB7SGFzaGVyfSBoYXNoZXIgVGhlIGhhc2hlciB0byBjcmVhdGUgYSBoZWxwZXIgZm9yLlxyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBUaGUgc2hvcnRjdXQgZnVuY3Rpb24uXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHN0YXRpY1xyXG5cdCAgICAgICAgICpcclxuXHQgICAgICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogICAgIHZhciBTSEEyNTYgPSBDcnlwdG9KUy5saWIuSGFzaGVyLl9jcmVhdGVIZWxwZXIoQ3J5cHRvSlMuYWxnby5TSEEyNTYpO1xyXG5cdCAgICAgICAgICovXHJcblx0ICAgICAgICBfY3JlYXRlSGVscGVyOiBmdW5jdGlvbiAoaGFzaGVyKSB7XHJcblx0ICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChtZXNzYWdlLCBjZmcpIHtcclxuXHQgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBoYXNoZXIuaW5pdChjZmcpLmZpbmFsaXplKG1lc3NhZ2UpO1xyXG5cdCAgICAgICAgICAgIH07XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIC8qKlxyXG5cdCAgICAgICAgICogQ3JlYXRlcyBhIHNob3J0Y3V0IGZ1bmN0aW9uIHRvIHRoZSBITUFDJ3Mgb2JqZWN0IGludGVyZmFjZS5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAcGFyYW0ge0hhc2hlcn0gaGFzaGVyIFRoZSBoYXNoZXIgdG8gdXNlIGluIHRoaXMgSE1BQyBoZWxwZXIuXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IFRoZSBzaG9ydGN1dCBmdW5jdGlvbi5cclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiBAc3RhdGljXHJcblx0ICAgICAgICAgKlxyXG5cdCAgICAgICAgICogQGV4YW1wbGVcclxuXHQgICAgICAgICAqXHJcblx0ICAgICAgICAgKiAgICAgdmFyIEhtYWNTSEEyNTYgPSBDcnlwdG9KUy5saWIuSGFzaGVyLl9jcmVhdGVIbWFjSGVscGVyKENyeXB0b0pTLmFsZ28uU0hBMjU2KTtcclxuXHQgICAgICAgICAqL1xyXG5cdCAgICAgICAgX2NyZWF0ZUhtYWNIZWxwZXI6IGZ1bmN0aW9uIChoYXNoZXIpIHtcclxuXHQgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG1lc3NhZ2UsIGtleSkge1xyXG5cdCAgICAgICAgICAgICAgICByZXR1cm4gbmV3IENfYWxnby5ITUFDLmluaXQoaGFzaGVyLCBrZXkpLmZpbmFsaXplKG1lc3NhZ2UpO1xyXG5cdCAgICAgICAgICAgIH07XHJcblx0ICAgICAgICB9XHJcblx0ICAgIH0pO1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIEFsZ29yaXRobSBuYW1lc3BhY2UuXHJcblx0ICAgICAqL1xyXG5cdCAgICB2YXIgQ19hbGdvID0gQy5hbGdvID0ge307XHJcblxyXG5cdCAgICByZXR1cm4gQztcclxuXHR9KE1hdGgpKTtcclxuXHJcblxyXG5cdHJldHVybiBDcnlwdG9KUztcclxuXHJcbn0pKTsiLCI7KGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XHJcblx0aWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XHJcblx0XHQvLyBDb21tb25KU1xyXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKFwiLi9jb3JlXCIpKTtcclxuXHR9XHJcblx0ZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcclxuXHRcdC8vIEFNRFxyXG5cdFx0ZGVmaW5lKFtcIi4vY29yZVwiXSwgZmFjdG9yeSk7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Ly8gR2xvYmFsIChicm93c2VyKVxyXG5cdFx0ZmFjdG9yeShyb290LkNyeXB0b0pTKTtcclxuXHR9XHJcbn0odGhpcywgZnVuY3Rpb24gKENyeXB0b0pTKSB7XHJcblxyXG5cdHJldHVybiBDcnlwdG9KUy5lbmMuSGV4O1xyXG5cclxufSkpOyIsIjsoZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcclxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuXHRcdC8vIENvbW1vbkpTXHJcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCIuL2NvcmVcIikpO1xyXG5cdH1cclxuXHRlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xyXG5cdFx0Ly8gQU1EXHJcblx0XHRkZWZpbmUoW1wiLi9jb3JlXCJdLCBmYWN0b3J5KTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHQvLyBHbG9iYWwgKGJyb3dzZXIpXHJcblx0XHRmYWN0b3J5KHJvb3QuQ3J5cHRvSlMpO1xyXG5cdH1cclxufSh0aGlzLCBmdW5jdGlvbiAoQ3J5cHRvSlMpIHtcclxuXHJcblx0KGZ1bmN0aW9uIChNYXRoKSB7XHJcblx0ICAgIC8vIFNob3J0Y3V0c1xyXG5cdCAgICB2YXIgQyA9IENyeXB0b0pTO1xyXG5cdCAgICB2YXIgQ19saWIgPSBDLmxpYjtcclxuXHQgICAgdmFyIFdvcmRBcnJheSA9IENfbGliLldvcmRBcnJheTtcclxuXHQgICAgdmFyIEhhc2hlciA9IENfbGliLkhhc2hlcjtcclxuXHQgICAgdmFyIENfYWxnbyA9IEMuYWxnbztcclxuXHJcblx0ICAgIC8vIEluaXRpYWxpemF0aW9uIGFuZCByb3VuZCBjb25zdGFudHMgdGFibGVzXHJcblx0ICAgIHZhciBIID0gW107XHJcblx0ICAgIHZhciBLID0gW107XHJcblxyXG5cdCAgICAvLyBDb21wdXRlIGNvbnN0YW50c1xyXG5cdCAgICAoZnVuY3Rpb24gKCkge1xyXG5cdCAgICAgICAgZnVuY3Rpb24gaXNQcmltZShuKSB7XHJcblx0ICAgICAgICAgICAgdmFyIHNxcnROID0gTWF0aC5zcXJ0KG4pO1xyXG5cdCAgICAgICAgICAgIGZvciAodmFyIGZhY3RvciA9IDI7IGZhY3RvciA8PSBzcXJ0TjsgZmFjdG9yKyspIHtcclxuXHQgICAgICAgICAgICAgICAgaWYgKCEobiAlIGZhY3RvcikpIHtcclxuXHQgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH1cclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcblx0ICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgZnVuY3Rpb24gZ2V0RnJhY3Rpb25hbEJpdHMobikge1xyXG5cdCAgICAgICAgICAgIHJldHVybiAoKG4gLSAobiB8IDApKSAqIDB4MTAwMDAwMDAwKSB8IDA7XHJcblx0ICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgdmFyIG4gPSAyO1xyXG5cdCAgICAgICAgdmFyIG5QcmltZSA9IDA7XHJcblx0ICAgICAgICB3aGlsZSAoblByaW1lIDwgNjQpIHtcclxuXHQgICAgICAgICAgICBpZiAoaXNQcmltZShuKSkge1xyXG5cdCAgICAgICAgICAgICAgICBpZiAoblByaW1lIDwgOCkge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgSFtuUHJpbWVdID0gZ2V0RnJhY3Rpb25hbEJpdHMoTWF0aC5wb3cobiwgMSAvIDIpKTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgICAgICBLW25QcmltZV0gPSBnZXRGcmFjdGlvbmFsQml0cyhNYXRoLnBvdyhuLCAxIC8gMykpO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgblByaW1lKys7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICBuKys7XHJcblx0ICAgICAgICB9XHJcblx0ICAgIH0oKSk7XHJcblxyXG5cdCAgICAvLyBSZXVzYWJsZSBvYmplY3RcclxuXHQgICAgdmFyIFcgPSBbXTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBTSEEtMjU2IGhhc2ggYWxnb3JpdGhtLlxyXG5cdCAgICAgKi9cclxuXHQgICAgdmFyIFNIQTI1NiA9IENfYWxnby5TSEEyNTYgPSBIYXNoZXIuZXh0ZW5kKHtcclxuXHQgICAgICAgIF9kb1Jlc2V0OiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgdGhpcy5faGFzaCA9IG5ldyBXb3JkQXJyYXkuaW5pdChILnNsaWNlKDApKTtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgX2RvUHJvY2Vzc0Jsb2NrOiBmdW5jdGlvbiAoTSwgb2Zmc2V0KSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRcclxuXHQgICAgICAgICAgICB2YXIgSCA9IHRoaXMuX2hhc2gud29yZHM7XHJcblxyXG5cdCAgICAgICAgICAgIC8vIFdvcmtpbmcgdmFyaWFibGVzXHJcblx0ICAgICAgICAgICAgdmFyIGEgPSBIWzBdO1xyXG5cdCAgICAgICAgICAgIHZhciBiID0gSFsxXTtcclxuXHQgICAgICAgICAgICB2YXIgYyA9IEhbMl07XHJcblx0ICAgICAgICAgICAgdmFyIGQgPSBIWzNdO1xyXG5cdCAgICAgICAgICAgIHZhciBlID0gSFs0XTtcclxuXHQgICAgICAgICAgICB2YXIgZiA9IEhbNV07XHJcblx0ICAgICAgICAgICAgdmFyIGcgPSBIWzZdO1xyXG5cdCAgICAgICAgICAgIHZhciBoID0gSFs3XTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQ29tcHV0YXRpb25cclxuXHQgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDY0OyBpKyspIHtcclxuXHQgICAgICAgICAgICAgICAgaWYgKGkgPCAxNikge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgV1tpXSA9IE1bb2Zmc2V0ICsgaV0gfCAwO1xyXG5cdCAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGdhbW1hMHggPSBXW2kgLSAxNV07XHJcblx0ICAgICAgICAgICAgICAgICAgICB2YXIgZ2FtbWEwICA9ICgoZ2FtbWEweCA8PCAyNSkgfCAoZ2FtbWEweCA+Pj4gNykpICBeXHJcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICgoZ2FtbWEweCA8PCAxNCkgfCAoZ2FtbWEweCA+Pj4gMTgpKSBeXHJcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZ2FtbWEweCA+Pj4gMyk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICAgICAgdmFyIGdhbW1hMXggPSBXW2kgLSAyXTtcclxuXHQgICAgICAgICAgICAgICAgICAgIHZhciBnYW1tYTEgID0gKChnYW1tYTF4IDw8IDE1KSB8IChnYW1tYTF4ID4+PiAxNykpIF5cclxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKChnYW1tYTF4IDw8IDEzKSB8IChnYW1tYTF4ID4+PiAxOSkpIF5cclxuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChnYW1tYTF4ID4+PiAxMCk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICAgICAgV1tpXSA9IGdhbW1hMCArIFdbaSAtIDddICsgZ2FtbWExICsgV1tpIC0gMTZdO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblxyXG5cdCAgICAgICAgICAgICAgICB2YXIgY2ggID0gKGUgJiBmKSBeICh+ZSAmIGcpO1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgbWFqID0gKGEgJiBiKSBeIChhICYgYykgXiAoYiAmIGMpO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgdmFyIHNpZ21hMCA9ICgoYSA8PCAzMCkgfCAoYSA+Pj4gMikpIF4gKChhIDw8IDE5KSB8IChhID4+PiAxMykpIF4gKChhIDw8IDEwKSB8IChhID4+PiAyMikpO1xyXG5cdCAgICAgICAgICAgICAgICB2YXIgc2lnbWExID0gKChlIDw8IDI2KSB8IChlID4+PiA2KSkgXiAoKGUgPDwgMjEpIHwgKGUgPj4+IDExKSkgXiAoKGUgPDwgNykgIHwgKGUgPj4+IDI1KSk7XHJcblxyXG5cdCAgICAgICAgICAgICAgICB2YXIgdDEgPSBoICsgc2lnbWExICsgY2ggKyBLW2ldICsgV1tpXTtcclxuXHQgICAgICAgICAgICAgICAgdmFyIHQyID0gc2lnbWEwICsgbWFqO1xyXG5cclxuXHQgICAgICAgICAgICAgICAgaCA9IGc7XHJcblx0ICAgICAgICAgICAgICAgIGcgPSBmO1xyXG5cdCAgICAgICAgICAgICAgICBmID0gZTtcclxuXHQgICAgICAgICAgICAgICAgZSA9IChkICsgdDEpIHwgMDtcclxuXHQgICAgICAgICAgICAgICAgZCA9IGM7XHJcblx0ICAgICAgICAgICAgICAgIGMgPSBiO1xyXG5cdCAgICAgICAgICAgICAgICBiID0gYTtcclxuXHQgICAgICAgICAgICAgICAgYSA9ICh0MSArIHQyKSB8IDA7XHJcblx0ICAgICAgICAgICAgfVxyXG5cclxuXHQgICAgICAgICAgICAvLyBJbnRlcm1lZGlhdGUgaGFzaCB2YWx1ZVxyXG5cdCAgICAgICAgICAgIEhbMF0gPSAoSFswXSArIGEpIHwgMDtcclxuXHQgICAgICAgICAgICBIWzFdID0gKEhbMV0gKyBiKSB8IDA7XHJcblx0ICAgICAgICAgICAgSFsyXSA9IChIWzJdICsgYykgfCAwO1xyXG5cdCAgICAgICAgICAgIEhbM10gPSAoSFszXSArIGQpIHwgMDtcclxuXHQgICAgICAgICAgICBIWzRdID0gKEhbNF0gKyBlKSB8IDA7XHJcblx0ICAgICAgICAgICAgSFs1XSA9IChIWzVdICsgZikgfCAwO1xyXG5cdCAgICAgICAgICAgIEhbNl0gPSAoSFs2XSArIGcpIHwgMDtcclxuXHQgICAgICAgICAgICBIWzddID0gKEhbN10gKyBoKSB8IDA7XHJcblx0ICAgICAgICB9LFxyXG5cclxuXHQgICAgICAgIF9kb0ZpbmFsaXplOiBmdW5jdGlvbiAoKSB7XHJcblx0ICAgICAgICAgICAgLy8gU2hvcnRjdXRzXHJcblx0ICAgICAgICAgICAgdmFyIGRhdGEgPSB0aGlzLl9kYXRhO1xyXG5cdCAgICAgICAgICAgIHZhciBkYXRhV29yZHMgPSBkYXRhLndvcmRzO1xyXG5cclxuXHQgICAgICAgICAgICB2YXIgbkJpdHNUb3RhbCA9IHRoaXMuX25EYXRhQnl0ZXMgKiA4O1xyXG5cdCAgICAgICAgICAgIHZhciBuQml0c0xlZnQgPSBkYXRhLnNpZ0J5dGVzICogODtcclxuXHJcblx0ICAgICAgICAgICAgLy8gQWRkIHBhZGRpbmdcclxuXHQgICAgICAgICAgICBkYXRhV29yZHNbbkJpdHNMZWZ0ID4+PiA1XSB8PSAweDgwIDw8ICgyNCAtIG5CaXRzTGVmdCAlIDMyKTtcclxuXHQgICAgICAgICAgICBkYXRhV29yZHNbKCgobkJpdHNMZWZ0ICsgNjQpID4+PiA5KSA8PCA0KSArIDE0XSA9IE1hdGguZmxvb3IobkJpdHNUb3RhbCAvIDB4MTAwMDAwMDAwKTtcclxuXHQgICAgICAgICAgICBkYXRhV29yZHNbKCgobkJpdHNMZWZ0ICsgNjQpID4+PiA5KSA8PCA0KSArIDE1XSA9IG5CaXRzVG90YWw7XHJcblx0ICAgICAgICAgICAgZGF0YS5zaWdCeXRlcyA9IGRhdGFXb3Jkcy5sZW5ndGggKiA0O1xyXG5cclxuXHQgICAgICAgICAgICAvLyBIYXNoIGZpbmFsIGJsb2Nrc1xyXG5cdCAgICAgICAgICAgIHRoaXMuX3Byb2Nlc3MoKTtcclxuXHJcblx0ICAgICAgICAgICAgLy8gUmV0dXJuIGZpbmFsIGNvbXB1dGVkIGhhc2hcclxuXHQgICAgICAgICAgICByZXR1cm4gdGhpcy5faGFzaDtcclxuXHQgICAgICAgIH0sXHJcblxyXG5cdCAgICAgICAgY2xvbmU6IGZ1bmN0aW9uICgpIHtcclxuXHQgICAgICAgICAgICB2YXIgY2xvbmUgPSBIYXNoZXIuY2xvbmUuY2FsbCh0aGlzKTtcclxuXHQgICAgICAgICAgICBjbG9uZS5faGFzaCA9IHRoaXMuX2hhc2guY2xvbmUoKTtcclxuXHJcblx0ICAgICAgICAgICAgcmV0dXJuIGNsb25lO1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9KTtcclxuXHJcblx0ICAgIC8qKlxyXG5cdCAgICAgKiBTaG9ydGN1dCBmdW5jdGlvbiB0byB0aGUgaGFzaGVyJ3Mgb2JqZWN0IGludGVyZmFjZS5cclxuXHQgICAgICpcclxuXHQgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGhhc2guXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEByZXR1cm4ge1dvcmRBcnJheX0gVGhlIGhhc2guXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBzdGF0aWNcclxuXHQgICAgICpcclxuXHQgICAgICogQGV4YW1wbGVcclxuXHQgICAgICpcclxuXHQgICAgICogICAgIHZhciBoYXNoID0gQ3J5cHRvSlMuU0hBMjU2KCdtZXNzYWdlJyk7XHJcblx0ICAgICAqICAgICB2YXIgaGFzaCA9IENyeXB0b0pTLlNIQTI1Nih3b3JkQXJyYXkpO1xyXG5cdCAgICAgKi9cclxuXHQgICAgQy5TSEEyNTYgPSBIYXNoZXIuX2NyZWF0ZUhlbHBlcihTSEEyNTYpO1xyXG5cclxuXHQgICAgLyoqXHJcblx0ICAgICAqIFNob3J0Y3V0IGZ1bmN0aW9uIHRvIHRoZSBITUFDJ3Mgb2JqZWN0IGludGVyZmFjZS5cclxuXHQgICAgICpcclxuXHQgICAgICogQHBhcmFtIHtXb3JkQXJyYXl8c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGhhc2guXHJcblx0ICAgICAqIEBwYXJhbSB7V29yZEFycmF5fHN0cmluZ30ga2V5IFRoZSBzZWNyZXQga2V5LlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAcmV0dXJuIHtXb3JkQXJyYXl9IFRoZSBITUFDLlxyXG5cdCAgICAgKlxyXG5cdCAgICAgKiBAc3RhdGljXHJcblx0ICAgICAqXHJcblx0ICAgICAqIEBleGFtcGxlXHJcblx0ICAgICAqXHJcblx0ICAgICAqICAgICB2YXIgaG1hYyA9IENyeXB0b0pTLkhtYWNTSEEyNTYobWVzc2FnZSwga2V5KTtcclxuXHQgICAgICovXHJcblx0ICAgIEMuSG1hY1NIQTI1NiA9IEhhc2hlci5fY3JlYXRlSG1hY0hlbHBlcihTSEEyNTYpO1xyXG5cdH0oTWF0aCkpO1xyXG5cclxuXHJcblx0cmV0dXJuIENyeXB0b0pTLlNIQTI1NjtcclxuXHJcbn0pKTsiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gdmltOnRzPTQ6c3RzPTQ6c3c9NDpcclxuLyohXHJcbiAqXHJcbiAqIENvcHlyaWdodCAyMDA5LTIwMTIgS3JpcyBLb3dhbCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVFxyXG4gKiBsaWNlbnNlIGZvdW5kIGF0IGh0dHA6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xL3Jhdy9tYXN0ZXIvTElDRU5TRVxyXG4gKlxyXG4gKiBXaXRoIHBhcnRzIGJ5IFR5bGVyIENsb3NlXHJcbiAqIENvcHlyaWdodCAyMDA3LTIwMDkgVHlsZXIgQ2xvc2UgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBNSVQgWCBsaWNlbnNlIGZvdW5kXHJcbiAqIGF0IGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UuaHRtbFxyXG4gKiBGb3JrZWQgYXQgcmVmX3NlbmQuanMgdmVyc2lvbjogMjAwOS0wNS0xMVxyXG4gKlxyXG4gKiBXaXRoIHBhcnRzIGJ5IE1hcmsgTWlsbGVyXHJcbiAqIENvcHlyaWdodCAoQykgMjAxMSBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xyXG4gICAgLy8gVHVybiBvZmYgc3RyaWN0IG1vZGUgZm9yIHRoaXMgZnVuY3Rpb24gc28gd2UgY2FuIGFzc2lnbiB0byBnbG9iYWwuUVxyXG4gICAgLyoganNoaW50IHN0cmljdDogZmFsc2UgKi9cclxuXHJcbiAgICAvLyBUaGlzIGZpbGUgd2lsbCBmdW5jdGlvbiBwcm9wZXJseSBhcyBhIDxzY3JpcHQ+IHRhZywgb3IgYSBtb2R1bGVcclxuICAgIC8vIHVzaW5nIENvbW1vbkpTIGFuZCBOb2RlSlMgb3IgUmVxdWlyZUpTIG1vZHVsZSBmb3JtYXRzLiAgSW5cclxuICAgIC8vIENvbW1vbi9Ob2RlL1JlcXVpcmVKUywgdGhlIG1vZHVsZSBleHBvcnRzIHRoZSBRIEFQSSBhbmQgd2hlblxyXG4gICAgLy8gZXhlY3V0ZWQgYXMgYSBzaW1wbGUgPHNjcmlwdD4sIGl0IGNyZWF0ZXMgYSBRIGdsb2JhbCBpbnN0ZWFkLlxyXG5cclxuICAgIC8vIE1vbnRhZ2UgUmVxdWlyZVxyXG4gICAgaWYgKHR5cGVvZiBib290c3RyYXAgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIGJvb3RzdHJhcChcInByb21pc2VcIiwgZGVmaW5pdGlvbik7XHJcblxyXG4gICAgLy8gQ29tbW9uSlNcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcclxuXHJcbiAgICAvLyBSZXF1aXJlSlNcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoZGVmaW5pdGlvbik7XHJcblxyXG4gICAgLy8gU0VTIChTZWN1cmUgRWNtYVNjcmlwdClcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIHNlcyAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgIGlmICghc2VzLm9rKCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNlcy5tYWtlUSA9IGRlZmluaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgIC8vIDxzY3JpcHQ+XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIFEgPSBkZWZpbml0aW9uKCk7XHJcbiAgICB9XHJcblxyXG59KShmdW5jdGlvbiAoKSB7XHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIGhhc1N0YWNrcyA9IGZhbHNlO1xyXG50cnkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbn0gY2F0Y2ggKGUpIHtcclxuICAgIGhhc1N0YWNrcyA9ICEhZS5zdGFjaztcclxufVxyXG5cclxuLy8gQWxsIGNvZGUgYWZ0ZXIgdGhpcyBwb2ludCB3aWxsIGJlIGZpbHRlcmVkIGZyb20gc3RhY2sgdHJhY2VzIHJlcG9ydGVkXHJcbi8vIGJ5IFEuXHJcbnZhciBxU3RhcnRpbmdMaW5lID0gY2FwdHVyZUxpbmUoKTtcclxudmFyIHFGaWxlTmFtZTtcclxuXHJcbi8vIHNoaW1zXHJcblxyXG4vLyB1c2VkIGZvciBmYWxsYmFjayBpbiBcImFsbFJlc29sdmVkXCJcclxudmFyIG5vb3AgPSBmdW5jdGlvbiAoKSB7fTtcclxuXHJcbi8vIFVzZSB0aGUgZmFzdGVzdCBwb3NzaWJsZSBtZWFucyB0byBleGVjdXRlIGEgdGFzayBpbiBhIGZ1dHVyZSB0dXJuXHJcbi8vIG9mIHRoZSBldmVudCBsb29wLlxyXG52YXIgbmV4dFRpY2sgPShmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBsaW5rZWQgbGlzdCBvZiB0YXNrcyAoc2luZ2xlLCB3aXRoIGhlYWQgbm9kZSlcclxuICAgIHZhciBoZWFkID0ge3Rhc2s6IHZvaWQgMCwgbmV4dDogbnVsbH07XHJcbiAgICB2YXIgdGFpbCA9IGhlYWQ7XHJcbiAgICB2YXIgZmx1c2hpbmcgPSBmYWxzZTtcclxuICAgIHZhciByZXF1ZXN0VGljayA9IHZvaWQgMDtcclxuICAgIHZhciBpc05vZGVKUyA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIGZsdXNoKCkge1xyXG4gICAgICAgIC8qIGpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xyXG5cclxuICAgICAgICB3aGlsZSAoaGVhZC5uZXh0KSB7XHJcbiAgICAgICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XHJcbiAgICAgICAgICAgIHZhciB0YXNrID0gaGVhZC50YXNrO1xyXG4gICAgICAgICAgICBoZWFkLnRhc2sgPSB2b2lkIDA7XHJcbiAgICAgICAgICAgIHZhciBkb21haW4gPSBoZWFkLmRvbWFpbjtcclxuXHJcbiAgICAgICAgICAgIGlmIChkb21haW4pIHtcclxuICAgICAgICAgICAgICAgIGhlYWQuZG9tYWluID0gdm9pZCAwO1xyXG4gICAgICAgICAgICAgICAgZG9tYWluLmVudGVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0YXNrKCk7XHJcblxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNOb2RlSlMpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJbiBub2RlLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBjb25zaWRlcmVkIGZhdGFsIGVycm9ycy5cclxuICAgICAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIHN5bmNocm9ub3VzbHkgdG8gaW50ZXJydXB0IGZsdXNoaW5nIVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY29udGludWF0aW9uIGlmIHRoZSB1bmNhdWdodCBleGNlcHRpb24gaXMgc3VwcHJlc3NlZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGxpc3RlbmluZyBcInVuY2F1Z2h0RXhjZXB0aW9uXCIgZXZlbnRzIChhcyBkb21haW5zIGRvZXMpLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlIGluIG5leHQgZXZlbnQgdG8gYXZvaWQgdGljayByZWN1cnNpb24uXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb21haW4uZXhpdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZsdXNoLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZG9tYWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbWFpbi5lbnRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcclxuXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEluIGJyb3dzZXJzLCB1bmNhdWdodCBleGNlcHRpb25zIGFyZSBub3QgZmF0YWwuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUmUtdGhyb3cgdGhlbSBhc3luY2hyb25vdXNseSB0byBhdm9pZCBzbG93LWRvd25zLlxyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGRvbWFpbikge1xyXG4gICAgICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZmx1c2hpbmcgPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBuZXh0VGljayA9IGZ1bmN0aW9uICh0YXNrKSB7XHJcbiAgICAgICAgdGFpbCA9IHRhaWwubmV4dCA9IHtcclxuICAgICAgICAgICAgdGFzazogdGFzayxcclxuICAgICAgICAgICAgZG9tYWluOiBpc05vZGVKUyAmJiBwcm9jZXNzLmRvbWFpbixcclxuICAgICAgICAgICAgbmV4dDogbnVsbFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmICghZmx1c2hpbmcpIHtcclxuICAgICAgICAgICAgZmx1c2hpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICByZXF1ZXN0VGljaygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2Nlc3MubmV4dFRpY2spIHtcclxuICAgICAgICAvLyBOb2RlLmpzIGJlZm9yZSAwLjkuIE5vdGUgdGhhdCBzb21lIGZha2UtTm9kZSBlbnZpcm9ubWVudHMsIGxpa2UgdGhlXHJcbiAgICAgICAgLy8gTW9jaGEgdGVzdCBydW5uZXIsIGludHJvZHVjZSBhIGBwcm9jZXNzYCBnbG9iYWwgd2l0aG91dCBhIGBuZXh0VGlja2AuXHJcbiAgICAgICAgaXNOb2RlSlMgPSB0cnVlO1xyXG5cclxuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzZXRJbW1lZGlhdGUgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgIC8vIEluIElFMTAsIE5vZGUuanMgMC45Kywgb3IgaHR0cHM6Ly9naXRodWIuY29tL05vYmxlSlMvc2V0SW1tZWRpYXRlXHJcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICAgICAgcmVxdWVzdFRpY2sgPSBzZXRJbW1lZGlhdGUuYmluZCh3aW5kb3csIGZsdXNoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbHVzaCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgLy8gbW9kZXJuIGJyb3dzZXJzXHJcbiAgICAgICAgLy8gaHR0cDovL3d3dy5ub25ibG9ja2luZy5pby8yMDExLzA2L3dpbmRvd25leHR0aWNrLmh0bWxcclxuICAgICAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xyXG4gICAgICAgIC8vIEF0IGxlYXN0IFNhZmFyaSBWZXJzaW9uIDYuMC41ICg4NTM2LjMwLjEpIGludGVybWl0dGVudGx5IGNhbm5vdCBjcmVhdGVcclxuICAgICAgICAvLyB3b3JraW5nIG1lc3NhZ2UgcG9ydHMgdGhlIGZpcnN0IHRpbWUgYSBwYWdlIGxvYWRzLlxyXG4gICAgICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXF1ZXN0VGljayA9IHJlcXVlc3RQb3J0VGljaztcclxuICAgICAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcclxuICAgICAgICAgICAgZmx1c2goKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHZhciByZXF1ZXN0UG9ydFRpY2sgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIC8vIE9wZXJhIHJlcXVpcmVzIHVzIHRvIHByb3ZpZGUgYSBtZXNzYWdlIHBheWxvYWQsIHJlZ2FyZGxlc3Mgb2ZcclxuICAgICAgICAgICAgLy8gd2hldGhlciB3ZSB1c2UgaXQuXHJcbiAgICAgICAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XHJcbiAgICAgICAgICAgIHJlcXVlc3RQb3J0VGljaygpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBvbGQgYnJvd3NlcnNcclxuICAgICAgICByZXF1ZXN0VGljayA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmV4dFRpY2s7XHJcbn0pKCk7XHJcblxyXG4vLyBBdHRlbXB0IHRvIG1ha2UgZ2VuZXJpY3Mgc2FmZSBpbiB0aGUgZmFjZSBvZiBkb3duc3RyZWFtXHJcbi8vIG1vZGlmaWNhdGlvbnMuXHJcbi8vIFRoZXJlIGlzIG5vIHNpdHVhdGlvbiB3aGVyZSB0aGlzIGlzIG5lY2Vzc2FyeS5cclxuLy8gSWYgeW91IG5lZWQgYSBzZWN1cml0eSBndWFyYW50ZWUsIHRoZXNlIHByaW1vcmRpYWxzIG5lZWQgdG8gYmVcclxuLy8gZGVlcGx5IGZyb3plbiBhbnl3YXksIGFuZCBpZiB5b3UgZG9u4oCZdCBuZWVkIGEgc2VjdXJpdHkgZ3VhcmFudGVlLFxyXG4vLyB0aGlzIGlzIGp1c3QgcGxhaW4gcGFyYW5vaWQuXHJcbi8vIEhvd2V2ZXIsIHRoaXMgKiptaWdodCoqIGhhdmUgdGhlIG5pY2Ugc2lkZS1lZmZlY3Qgb2YgcmVkdWNpbmcgdGhlIHNpemUgb2ZcclxuLy8gdGhlIG1pbmlmaWVkIGNvZGUgYnkgcmVkdWNpbmcgeC5jYWxsKCkgdG8gbWVyZWx5IHgoKVxyXG4vLyBTZWUgTWFyayBNaWxsZXLigJlzIGV4cGxhbmF0aW9uIG9mIHdoYXQgdGhpcyBkb2VzLlxyXG4vLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1jb252ZW50aW9uczpzYWZlX21ldGFfcHJvZ3JhbW1pbmdcclxudmFyIGNhbGwgPSBGdW5jdGlvbi5jYWxsO1xyXG5mdW5jdGlvbiB1bmN1cnJ5VGhpcyhmKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiBjYWxsLmFwcGx5KGYsIGFyZ3VtZW50cyk7XHJcbiAgICB9O1xyXG59XHJcbi8vIFRoaXMgaXMgZXF1aXZhbGVudCwgYnV0IHNsb3dlcjpcclxuLy8gdW5jdXJyeVRoaXMgPSBGdW5jdGlvbl9iaW5kLmJpbmQoRnVuY3Rpb25fYmluZC5jYWxsKTtcclxuLy8gaHR0cDovL2pzcGVyZi5jb20vdW5jdXJyeXRoaXNcclxuXHJcbnZhciBhcnJheV9zbGljZSA9IHVuY3VycnlUaGlzKEFycmF5LnByb3RvdHlwZS5zbGljZSk7XHJcblxyXG52YXIgYXJyYXlfcmVkdWNlID0gdW5jdXJyeVRoaXMoXHJcbiAgICBBcnJheS5wcm90b3R5cGUucmVkdWNlIHx8IGZ1bmN0aW9uIChjYWxsYmFjaywgYmFzaXMpIHtcclxuICAgICAgICB2YXIgaW5kZXggPSAwLFxyXG4gICAgICAgICAgICBsZW5ndGggPSB0aGlzLmxlbmd0aDtcclxuICAgICAgICAvLyBjb25jZXJuaW5nIHRoZSBpbml0aWFsIHZhbHVlLCBpZiBvbmUgaXMgbm90IHByb3ZpZGVkXHJcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgLy8gc2VlayB0byB0aGUgZmlyc3QgdmFsdWUgaW4gdGhlIGFycmF5LCBhY2NvdW50aW5nXHJcbiAgICAgICAgICAgIC8vIGZvciB0aGUgcG9zc2liaWxpdHkgdGhhdCBpcyBpcyBhIHNwYXJzZSBhcnJheVxyXG4gICAgICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggaW4gdGhpcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGJhc2lzID0gdGhpc1tpbmRleCsrXTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICgrK2luZGV4ID49IGxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSB3aGlsZSAoMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHJlZHVjZVxyXG4gICAgICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAvLyBhY2NvdW50IGZvciB0aGUgcG9zc2liaWxpdHkgdGhhdCB0aGUgYXJyYXkgaXMgc3BhcnNlXHJcbiAgICAgICAgICAgIGlmIChpbmRleCBpbiB0aGlzKSB7XHJcbiAgICAgICAgICAgICAgICBiYXNpcyA9IGNhbGxiYWNrKGJhc2lzLCB0aGlzW2luZGV4XSwgaW5kZXgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBiYXNpcztcclxuICAgIH1cclxuKTtcclxuXHJcbnZhciBhcnJheV9pbmRleE9mID0gdW5jdXJyeVRoaXMoXHJcbiAgICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiB8fCBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAvLyBub3QgYSB2ZXJ5IGdvb2Qgc2hpbSwgYnV0IGdvb2QgZW5vdWdoIGZvciBvdXIgb25lIHVzZSBvZiBpdFxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAodGhpc1tpXSA9PT0gdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiAtMTtcclxuICAgIH1cclxuKTtcclxuXHJcbnZhciBhcnJheV9tYXAgPSB1bmN1cnJ5VGhpcyhcclxuICAgIEFycmF5LnByb3RvdHlwZS5tYXAgfHwgZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzcCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgY29sbGVjdCA9IFtdO1xyXG4gICAgICAgIGFycmF5X3JlZHVjZShzZWxmLCBmdW5jdGlvbiAodW5kZWZpbmVkLCB2YWx1ZSwgaW5kZXgpIHtcclxuICAgICAgICAgICAgY29sbGVjdC5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc3AsIHZhbHVlLCBpbmRleCwgc2VsZikpO1xyXG4gICAgICAgIH0sIHZvaWQgMCk7XHJcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Q7XHJcbiAgICB9XHJcbik7XHJcblxyXG52YXIgb2JqZWN0X2NyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSkge1xyXG4gICAgZnVuY3Rpb24gVHlwZSgpIHsgfVxyXG4gICAgVHlwZS5wcm90b3R5cGUgPSBwcm90b3R5cGU7XHJcbiAgICByZXR1cm4gbmV3IFR5cGUoKTtcclxufTtcclxuXHJcbnZhciBvYmplY3RfaGFzT3duUHJvcGVydHkgPSB1bmN1cnJ5VGhpcyhPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5KTtcclxuXHJcbnZhciBvYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICAgIHZhciBrZXlzID0gW107XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XHJcbiAgICAgICAgaWYgKG9iamVjdF9oYXNPd25Qcm9wZXJ0eShvYmplY3QsIGtleSkpIHtcclxuICAgICAgICAgICAga2V5cy5wdXNoKGtleSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGtleXM7XHJcbn07XHJcblxyXG52YXIgb2JqZWN0X3RvU3RyaW5nID0gdW5jdXJyeVRoaXMoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyk7XHJcblxyXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHZhbHVlID09PSBPYmplY3QodmFsdWUpO1xyXG59XHJcblxyXG4vLyBnZW5lcmF0b3IgcmVsYXRlZCBzaGltc1xyXG5cclxuLy8gRklYTUU6IFJlbW92ZSB0aGlzIGZ1bmN0aW9uIG9uY2UgRVM2IGdlbmVyYXRvcnMgYXJlIGluIFNwaWRlck1vbmtleS5cclxuZnVuY3Rpb24gaXNTdG9wSXRlcmF0aW9uKGV4Y2VwdGlvbikge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgICBvYmplY3RfdG9TdHJpbmcoZXhjZXB0aW9uKSA9PT0gXCJbb2JqZWN0IFN0b3BJdGVyYXRpb25dXCIgfHxcclxuICAgICAgICBleGNlcHRpb24gaW5zdGFuY2VvZiBRUmV0dXJuVmFsdWVcclxuICAgICk7XHJcbn1cclxuXHJcbi8vIEZJWE1FOiBSZW1vdmUgdGhpcyBoZWxwZXIgYW5kIFEucmV0dXJuIG9uY2UgRVM2IGdlbmVyYXRvcnMgYXJlIGluXHJcbi8vIFNwaWRlck1vbmtleS5cclxudmFyIFFSZXR1cm5WYWx1ZTtcclxuaWYgKHR5cGVvZiBSZXR1cm5WYWx1ZSAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgUVJldHVyblZhbHVlID0gUmV0dXJuVmFsdWU7XHJcbn0gZWxzZSB7XHJcbiAgICBRUmV0dXJuVmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vLyBsb25nIHN0YWNrIHRyYWNlc1xyXG5cclxudmFyIFNUQUNLX0pVTVBfU0VQQVJBVE9SID0gXCJGcm9tIHByZXZpb3VzIGV2ZW50OlwiO1xyXG5cclxuZnVuY3Rpb24gbWFrZVN0YWNrVHJhY2VMb25nKGVycm9yLCBwcm9taXNlKSB7XHJcbiAgICAvLyBJZiBwb3NzaWJsZSwgdHJhbnNmb3JtIHRoZSBlcnJvciBzdGFjayB0cmFjZSBieSByZW1vdmluZyBOb2RlIGFuZCBRXHJcbiAgICAvLyBjcnVmdCwgdGhlbiBjb25jYXRlbmF0aW5nIHdpdGggdGhlIHN0YWNrIHRyYWNlIG9mIGBwcm9taXNlYC4gU2VlICM1Ny5cclxuICAgIGlmIChoYXNTdGFja3MgJiZcclxuICAgICAgICBwcm9taXNlLnN0YWNrICYmXHJcbiAgICAgICAgdHlwZW9mIGVycm9yID09PSBcIm9iamVjdFwiICYmXHJcbiAgICAgICAgZXJyb3IgIT09IG51bGwgJiZcclxuICAgICAgICBlcnJvci5zdGFjayAmJlxyXG4gICAgICAgIGVycm9yLnN0YWNrLmluZGV4T2YoU1RBQ0tfSlVNUF9TRVBBUkFUT1IpID09PSAtMVxyXG4gICAgKSB7XHJcbiAgICAgICAgdmFyIHN0YWNrcyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIHAgPSBwcm9taXNlOyAhIXA7IHAgPSBwLnNvdXJjZSkge1xyXG4gICAgICAgICAgICBpZiAocC5zdGFjaykge1xyXG4gICAgICAgICAgICAgICAgc3RhY2tzLnVuc2hpZnQocC5zdGFjayk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgc3RhY2tzLnVuc2hpZnQoZXJyb3Iuc3RhY2spO1xyXG5cclxuICAgICAgICB2YXIgY29uY2F0ZWRTdGFja3MgPSBzdGFja3Muam9pbihcIlxcblwiICsgU1RBQ0tfSlVNUF9TRVBBUkFUT1IgKyBcIlxcblwiKTtcclxuICAgICAgICBlcnJvci5zdGFjayA9IGZpbHRlclN0YWNrU3RyaW5nKGNvbmNhdGVkU3RhY2tzKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmlsdGVyU3RhY2tTdHJpbmcoc3RhY2tTdHJpbmcpIHtcclxuICAgIHZhciBsaW5lcyA9IHN0YWNrU3RyaW5nLnNwbGl0KFwiXFxuXCIpO1xyXG4gICAgdmFyIGRlc2lyZWRMaW5lcyA9IFtdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciBsaW5lID0gbGluZXNbaV07XHJcblxyXG4gICAgICAgIGlmICghaXNJbnRlcm5hbEZyYW1lKGxpbmUpICYmICFpc05vZGVGcmFtZShsaW5lKSAmJiBsaW5lKSB7XHJcbiAgICAgICAgICAgIGRlc2lyZWRMaW5lcy5wdXNoKGxpbmUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBkZXNpcmVkTGluZXMuam9pbihcIlxcblwiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNOb2RlRnJhbWUoc3RhY2tMaW5lKSB7XHJcbiAgICByZXR1cm4gc3RhY2tMaW5lLmluZGV4T2YoXCIobW9kdWxlLmpzOlwiKSAhPT0gLTEgfHxcclxuICAgICAgICAgICBzdGFja0xpbmUuaW5kZXhPZihcIihub2RlLmpzOlwiKSAhPT0gLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEZpbGVOYW1lQW5kTGluZU51bWJlcihzdGFja0xpbmUpIHtcclxuICAgIC8vIE5hbWVkIGZ1bmN0aW9uczogXCJhdCBmdW5jdGlvbk5hbWUgKGZpbGVuYW1lOmxpbmVOdW1iZXI6Y29sdW1uTnVtYmVyKVwiXHJcbiAgICAvLyBJbiBJRTEwIGZ1bmN0aW9uIG5hbWUgY2FuIGhhdmUgc3BhY2VzIChcIkFub255bW91cyBmdW5jdGlvblwiKSBPX29cclxuICAgIHZhciBhdHRlbXB0MSA9IC9hdCAuKyBcXCgoLispOihcXGQrKTooPzpcXGQrKVxcKSQvLmV4ZWMoc3RhY2tMaW5lKTtcclxuICAgIGlmIChhdHRlbXB0MSkge1xyXG4gICAgICAgIHJldHVybiBbYXR0ZW1wdDFbMV0sIE51bWJlcihhdHRlbXB0MVsyXSldO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFub255bW91cyBmdW5jdGlvbnM6IFwiYXQgZmlsZW5hbWU6bGluZU51bWJlcjpjb2x1bW5OdW1iZXJcIlxyXG4gICAgdmFyIGF0dGVtcHQyID0gL2F0IChbXiBdKyk6KFxcZCspOig/OlxcZCspJC8uZXhlYyhzdGFja0xpbmUpO1xyXG4gICAgaWYgKGF0dGVtcHQyKSB7XHJcbiAgICAgICAgcmV0dXJuIFthdHRlbXB0MlsxXSwgTnVtYmVyKGF0dGVtcHQyWzJdKV07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRmlyZWZveCBzdHlsZTogXCJmdW5jdGlvbkBmaWxlbmFtZTpsaW5lTnVtYmVyIG9yIEBmaWxlbmFtZTpsaW5lTnVtYmVyXCJcclxuICAgIHZhciBhdHRlbXB0MyA9IC8uKkAoLispOihcXGQrKSQvLmV4ZWMoc3RhY2tMaW5lKTtcclxuICAgIGlmIChhdHRlbXB0Mykge1xyXG4gICAgICAgIHJldHVybiBbYXR0ZW1wdDNbMV0sIE51bWJlcihhdHRlbXB0M1syXSldO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc0ludGVybmFsRnJhbWUoc3RhY2tMaW5lKSB7XHJcbiAgICB2YXIgZmlsZU5hbWVBbmRMaW5lTnVtYmVyID0gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKHN0YWNrTGluZSk7XHJcblxyXG4gICAgaWYgKCFmaWxlTmFtZUFuZExpbmVOdW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGZpbGVOYW1lID0gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzBdO1xyXG4gICAgdmFyIGxpbmVOdW1iZXIgPSBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMV07XHJcblxyXG4gICAgcmV0dXJuIGZpbGVOYW1lID09PSBxRmlsZU5hbWUgJiZcclxuICAgICAgICBsaW5lTnVtYmVyID49IHFTdGFydGluZ0xpbmUgJiZcclxuICAgICAgICBsaW5lTnVtYmVyIDw9IHFFbmRpbmdMaW5lO1xyXG59XHJcblxyXG4vLyBkaXNjb3ZlciBvd24gZmlsZSBuYW1lIGFuZCBsaW5lIG51bWJlciByYW5nZSBmb3IgZmlsdGVyaW5nIHN0YWNrXHJcbi8vIHRyYWNlc1xyXG5mdW5jdGlvbiBjYXB0dXJlTGluZSgpIHtcclxuICAgIGlmICghaGFzU3RhY2tzKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgdmFyIGxpbmVzID0gZS5zdGFjay5zcGxpdChcIlxcblwiKTtcclxuICAgICAgICB2YXIgZmlyc3RMaW5lID0gbGluZXNbMF0uaW5kZXhPZihcIkBcIikgPiAwID8gbGluZXNbMV0gOiBsaW5lc1syXTtcclxuICAgICAgICB2YXIgZmlsZU5hbWVBbmRMaW5lTnVtYmVyID0gZ2V0RmlsZU5hbWVBbmRMaW5lTnVtYmVyKGZpcnN0TGluZSk7XHJcbiAgICAgICAgaWYgKCFmaWxlTmFtZUFuZExpbmVOdW1iZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcUZpbGVOYW1lID0gZmlsZU5hbWVBbmRMaW5lTnVtYmVyWzBdO1xyXG4gICAgICAgIHJldHVybiBmaWxlTmFtZUFuZExpbmVOdW1iZXJbMV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlcHJlY2F0ZShjYWxsYmFjaywgbmFtZSwgYWx0ZXJuYXRpdmUpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSBcInVuZGVmaW5lZFwiICYmXHJcbiAgICAgICAgICAgIHR5cGVvZiBjb25zb2xlLndhcm4gPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4obmFtZSArIFwiIGlzIGRlcHJlY2F0ZWQsIHVzZSBcIiArIGFsdGVybmF0aXZlICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgIFwiIGluc3RlYWQuXCIsIG5ldyBFcnJvcihcIlwiKS5zdGFjayk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShjYWxsYmFjaywgYXJndW1lbnRzKTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8vIGVuZCBvZiBzaGltc1xyXG4vLyBiZWdpbm5pbmcgb2YgcmVhbCB3b3JrXHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIHByb21pc2UgZm9yIGFuIGltbWVkaWF0ZSByZWZlcmVuY2UsIHBhc3NlcyBwcm9taXNlcyB0aHJvdWdoLCBvclxyXG4gKiBjb2VyY2VzIHByb21pc2VzIGZyb20gZGlmZmVyZW50IHN5c3RlbXMuXHJcbiAqIEBwYXJhbSB2YWx1ZSBpbW1lZGlhdGUgcmVmZXJlbmNlIG9yIHByb21pc2VcclxuICovXHJcbmZ1bmN0aW9uIFEodmFsdWUpIHtcclxuICAgIC8vIElmIHRoZSBvYmplY3QgaXMgYWxyZWFkeSBhIFByb21pc2UsIHJldHVybiBpdCBkaXJlY3RseS4gIFRoaXMgZW5hYmxlc1xyXG4gICAgLy8gdGhlIHJlc29sdmUgZnVuY3Rpb24gdG8gYm90aCBiZSB1c2VkIHRvIGNyZWF0ZWQgcmVmZXJlbmNlcyBmcm9tIG9iamVjdHMsXHJcbiAgICAvLyBidXQgdG8gdG9sZXJhYmx5IGNvZXJjZSBub24tcHJvbWlzZXMgdG8gcHJvbWlzZXMuXHJcbiAgICBpZiAoaXNQcm9taXNlKHZhbHVlKSkge1xyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhc3NpbWlsYXRlIHRoZW5hYmxlc1xyXG4gICAgaWYgKGlzUHJvbWlzZUFsaWtlKHZhbHVlKSkge1xyXG4gICAgICAgIHJldHVybiBjb2VyY2UodmFsdWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gZnVsZmlsbCh2YWx1ZSk7XHJcbiAgICB9XHJcbn1cclxuUS5yZXNvbHZlID0gUTtcclxuXHJcbi8qKlxyXG4gKiBQZXJmb3JtcyBhIHRhc2sgaW4gYSBmdXR1cmUgdHVybiBvZiB0aGUgZXZlbnQgbG9vcC5cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gdGFza1xyXG4gKi9cclxuUS5uZXh0VGljayA9IG5leHRUaWNrO1xyXG5cclxuLyoqXHJcbiAqIENvbnRyb2xzIHdoZXRoZXIgb3Igbm90IGxvbmcgc3RhY2sgdHJhY2VzIHdpbGwgYmUgb25cclxuICovXHJcblEubG9uZ1N0YWNrU3VwcG9ydCA9IGZhbHNlO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSB7cHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0fSBvYmplY3QuXHJcbiAqXHJcbiAqIGByZXNvbHZlYCBpcyBhIGNhbGxiYWNrIHRvIGludm9rZSB3aXRoIGEgbW9yZSByZXNvbHZlZCB2YWx1ZSBmb3IgdGhlXHJcbiAqIHByb21pc2UuIFRvIGZ1bGZpbGwgdGhlIHByb21pc2UsIGludm9rZSBgcmVzb2x2ZWAgd2l0aCBhbnkgdmFsdWUgdGhhdCBpc1xyXG4gKiBub3QgYSB0aGVuYWJsZS4gVG8gcmVqZWN0IHRoZSBwcm9taXNlLCBpbnZva2UgYHJlc29sdmVgIHdpdGggYSByZWplY3RlZFxyXG4gKiB0aGVuYWJsZSwgb3IgaW52b2tlIGByZWplY3RgIHdpdGggdGhlIHJlYXNvbiBkaXJlY3RseS4gVG8gcmVzb2x2ZSB0aGVcclxuICogcHJvbWlzZSB0byBhbm90aGVyIHRoZW5hYmxlLCB0aHVzIHB1dHRpbmcgaXQgaW4gdGhlIHNhbWUgc3RhdGUsIGludm9rZVxyXG4gKiBgcmVzb2x2ZWAgd2l0aCB0aGF0IG90aGVyIHRoZW5hYmxlLlxyXG4gKi9cclxuUS5kZWZlciA9IGRlZmVyO1xyXG5mdW5jdGlvbiBkZWZlcigpIHtcclxuICAgIC8vIGlmIFwibWVzc2FnZXNcIiBpcyBhbiBcIkFycmF5XCIsIHRoYXQgaW5kaWNhdGVzIHRoYXQgdGhlIHByb21pc2UgaGFzIG5vdCB5ZXRcclxuICAgIC8vIGJlZW4gcmVzb2x2ZWQuICBJZiBpdCBpcyBcInVuZGVmaW5lZFwiLCBpdCBoYXMgYmVlbiByZXNvbHZlZC4gIEVhY2hcclxuICAgIC8vIGVsZW1lbnQgb2YgdGhlIG1lc3NhZ2VzIGFycmF5IGlzIGl0c2VsZiBhbiBhcnJheSBvZiBjb21wbGV0ZSBhcmd1bWVudHMgdG9cclxuICAgIC8vIGZvcndhcmQgdG8gdGhlIHJlc29sdmVkIHByb21pc2UuICBXZSBjb2VyY2UgdGhlIHJlc29sdXRpb24gdmFsdWUgdG8gYVxyXG4gICAgLy8gcHJvbWlzZSB1c2luZyB0aGUgYHJlc29sdmVgIGZ1bmN0aW9uIGJlY2F1c2UgaXQgaGFuZGxlcyBib3RoIGZ1bGx5XHJcbiAgICAvLyBub24tdGhlbmFibGUgdmFsdWVzIGFuZCBvdGhlciB0aGVuYWJsZXMgZ3JhY2VmdWxseS5cclxuICAgIHZhciBtZXNzYWdlcyA9IFtdLCBwcm9ncmVzc0xpc3RlbmVycyA9IFtdLCByZXNvbHZlZFByb21pc2U7XHJcblxyXG4gICAgdmFyIGRlZmVycmVkID0gb2JqZWN0X2NyZWF0ZShkZWZlci5wcm90b3R5cGUpO1xyXG4gICAgdmFyIHByb21pc2UgPSBvYmplY3RfY3JlYXRlKFByb21pc2UucHJvdG90eXBlKTtcclxuXHJcbiAgICBwcm9taXNlLnByb21pc2VEaXNwYXRjaCA9IGZ1bmN0aW9uIChyZXNvbHZlLCBvcCwgb3BlcmFuZHMpIHtcclxuICAgICAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgaWYgKG1lc3NhZ2VzKSB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2VzLnB1c2goYXJncyk7XHJcbiAgICAgICAgICAgIGlmIChvcCA9PT0gXCJ3aGVuXCIgJiYgb3BlcmFuZHNbMV0pIHsgLy8gcHJvZ3Jlc3Mgb3BlcmFuZFxyXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcnMucHVzaChvcGVyYW5kc1sxXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlZFByb21pc2UucHJvbWlzZURpc3BhdGNoLmFwcGx5KHJlc29sdmVkUHJvbWlzZSwgYXJncyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLy8gWFhYIGRlcHJlY2F0ZWRcclxuICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAobWVzc2FnZXMpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBuZWFyZXJWYWx1ZSA9IG5lYXJlcihyZXNvbHZlZFByb21pc2UpO1xyXG4gICAgICAgIGlmIChpc1Byb21pc2UobmVhcmVyVmFsdWUpKSB7XHJcbiAgICAgICAgICAgIHJlc29sdmVkUHJvbWlzZSA9IG5lYXJlclZhbHVlOyAvLyBzaG9ydGVuIGNoYWluXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZWFyZXJWYWx1ZTtcclxuICAgIH07XHJcblxyXG4gICAgcHJvbWlzZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghcmVzb2x2ZWRQcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN0YXRlOiBcInBlbmRpbmdcIiB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzb2x2ZWRQcm9taXNlLmluc3BlY3QoKTtcclxuICAgIH07XHJcblxyXG4gICAgaWYgKFEubG9uZ1N0YWNrU3VwcG9ydCAmJiBoYXNTdGFja3MpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIC8vIE5PVEU6IGRvbid0IHRyeSB0byB1c2UgYEVycm9yLmNhcHR1cmVTdGFja1RyYWNlYCBvciB0cmFuc2ZlciB0aGVcclxuICAgICAgICAgICAgLy8gYWNjZXNzb3IgYXJvdW5kOyB0aGF0IGNhdXNlcyBtZW1vcnkgbGVha3MgYXMgcGVyIEdILTExMS4gSnVzdFxyXG4gICAgICAgICAgICAvLyByZWlmeSB0aGUgc3RhY2sgdHJhY2UgYXMgYSBzdHJpbmcgQVNBUC5cclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gQXQgdGhlIHNhbWUgdGltZSwgY3V0IG9mZiB0aGUgZmlyc3QgbGluZTsgaXQncyBhbHdheXMganVzdFxyXG4gICAgICAgICAgICAvLyBcIltvYmplY3QgUHJvbWlzZV1cXG5cIiwgYXMgcGVyIHRoZSBgdG9TdHJpbmdgLlxyXG4gICAgICAgICAgICBwcm9taXNlLnN0YWNrID0gZS5zdGFjay5zdWJzdHJpbmcoZS5zdGFjay5pbmRleE9mKFwiXFxuXCIpICsgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIE5PVEU6IHdlIGRvIHRoZSBjaGVja3MgZm9yIGByZXNvbHZlZFByb21pc2VgIGluIGVhY2ggbWV0aG9kLCBpbnN0ZWFkIG9mXHJcbiAgICAvLyBjb25zb2xpZGF0aW5nIHRoZW0gaW50byBgYmVjb21lYCwgc2luY2Ugb3RoZXJ3aXNlIHdlJ2QgY3JlYXRlIG5ld1xyXG4gICAgLy8gcHJvbWlzZXMgd2l0aCB0aGUgbGluZXMgYGJlY29tZSh3aGF0ZXZlcih2YWx1ZSkpYC4gU2VlIGUuZy4gR0gtMjUyLlxyXG5cclxuICAgIGZ1bmN0aW9uIGJlY29tZShuZXdQcm9taXNlKSB7XHJcbiAgICAgICAgcmVzb2x2ZWRQcm9taXNlID0gbmV3UHJvbWlzZTtcclxuICAgICAgICBwcm9taXNlLnNvdXJjZSA9IG5ld1Byb21pc2U7XHJcblxyXG4gICAgICAgIGFycmF5X3JlZHVjZShtZXNzYWdlcywgZnVuY3Rpb24gKHVuZGVmaW5lZCwgbWVzc2FnZSkge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdQcm9taXNlLnByb21pc2VEaXNwYXRjaC5hcHBseShuZXdQcm9taXNlLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSwgdm9pZCAwKTtcclxuXHJcbiAgICAgICAgbWVzc2FnZXMgPSB2b2lkIDA7XHJcbiAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcnMgPSB2b2lkIDA7XHJcbiAgICB9XHJcblxyXG4gICAgZGVmZXJyZWQucHJvbWlzZSA9IHByb21pc2U7XHJcbiAgICBkZWZlcnJlZC5yZXNvbHZlID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWNvbWUoUSh2YWx1ZSkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBkZWZlcnJlZC5mdWxmaWxsID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWNvbWUoZnVsZmlsbCh2YWx1ZSkpO1xyXG4gICAgfTtcclxuICAgIGRlZmVycmVkLnJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcclxuICAgICAgICBpZiAocmVzb2x2ZWRQcm9taXNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlY29tZShyZWplY3QocmVhc29uKSk7XHJcbiAgICB9O1xyXG4gICAgZGVmZXJyZWQubm90aWZ5ID0gZnVuY3Rpb24gKHByb2dyZXNzKSB7XHJcbiAgICAgICAgaWYgKHJlc29sdmVkUHJvbWlzZSkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcnJheV9yZWR1Y2UocHJvZ3Jlc3NMaXN0ZW5lcnMsIGZ1bmN0aW9uICh1bmRlZmluZWQsIHByb2dyZXNzTGlzdGVuZXIpIHtcclxuICAgICAgICAgICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3NMaXN0ZW5lcihwcm9ncmVzcyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sIHZvaWQgMCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBkZWZlcnJlZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBOb2RlLXN0eWxlIGNhbGxiYWNrIHRoYXQgd2lsbCByZXNvbHZlIG9yIHJlamVjdCB0aGUgZGVmZXJyZWRcclxuICogcHJvbWlzZS5cclxuICogQHJldHVybnMgYSBub2RlYmFja1xyXG4gKi9cclxuZGVmZXIucHJvdG90eXBlLm1ha2VOb2RlUmVzb2x2ZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKGVycm9yLCB2YWx1ZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBzZWxmLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICBzZWxmLnJlc29sdmUoYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2VsZi5yZXNvbHZlKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSByZXNvbHZlciB7RnVuY3Rpb259IGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIG5vdGhpbmcgYW5kIGFjY2VwdHNcclxuICogdGhlIHJlc29sdmUsIHJlamVjdCwgYW5kIG5vdGlmeSBmdW5jdGlvbnMgZm9yIGEgZGVmZXJyZWQuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IG1heSBiZSByZXNvbHZlZCB3aXRoIHRoZSBnaXZlbiByZXNvbHZlIGFuZCByZWplY3RcclxuICogZnVuY3Rpb25zLCBvciByZWplY3RlZCBieSBhIHRocm93biBleGNlcHRpb24gaW4gcmVzb2x2ZXJcclxuICovXHJcblEuUHJvbWlzZSA9IHByb21pc2U7IC8vIEVTNlxyXG5RLnByb21pc2UgPSBwcm9taXNlO1xyXG5mdW5jdGlvbiBwcm9taXNlKHJlc29sdmVyKSB7XHJcbiAgICBpZiAodHlwZW9mIHJlc29sdmVyICE9PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicmVzb2x2ZXIgbXVzdCBiZSBhIGZ1bmN0aW9uLlwiKTtcclxuICAgIH1cclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJlc29sdmVyKGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCwgZGVmZXJyZWQubm90aWZ5KTtcclxuICAgIH0gY2F0Y2ggKHJlYXNvbikge1xyXG4gICAgICAgIGRlZmVycmVkLnJlamVjdChyZWFzb24pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn1cclxuXHJcbnByb21pc2UucmFjZSA9IHJhY2U7IC8vIEVTNlxyXG5wcm9taXNlLmFsbCA9IGFsbDsgLy8gRVM2XHJcbnByb21pc2UucmVqZWN0ID0gcmVqZWN0OyAvLyBFUzZcclxucHJvbWlzZS5yZXNvbHZlID0gUTsgLy8gRVM2XHJcblxyXG4vLyBYWFggZXhwZXJpbWVudGFsLiAgVGhpcyBtZXRob2QgaXMgYSB3YXkgdG8gZGVub3RlIHRoYXQgYSBsb2NhbCB2YWx1ZSBpc1xyXG4vLyBzZXJpYWxpemFibGUgYW5kIHNob3VsZCBiZSBpbW1lZGlhdGVseSBkaXNwYXRjaGVkIHRvIGEgcmVtb3RlIHVwb24gcmVxdWVzdCxcclxuLy8gaW5zdGVhZCBvZiBwYXNzaW5nIGEgcmVmZXJlbmNlLlxyXG5RLnBhc3NCeUNvcHkgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICAvL2ZyZWV6ZShvYmplY3QpO1xyXG4gICAgLy9wYXNzQnlDb3BpZXMuc2V0KG9iamVjdCwgdHJ1ZSk7XHJcbiAgICByZXR1cm4gb2JqZWN0O1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUucGFzc0J5Q29weSA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vZnJlZXplKG9iamVjdCk7XHJcbiAgICAvL3Bhc3NCeUNvcGllcy5zZXQob2JqZWN0LCB0cnVlKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIElmIHR3byBwcm9taXNlcyBldmVudHVhbGx5IGZ1bGZpbGwgdG8gdGhlIHNhbWUgdmFsdWUsIHByb21pc2VzIHRoYXQgdmFsdWUsXHJcbiAqIGJ1dCBvdGhlcndpc2UgcmVqZWN0cy5cclxuICogQHBhcmFtIHgge0FueSp9XHJcbiAqIEBwYXJhbSB5IHtBbnkqfVxyXG4gKiBAcmV0dXJucyB7QW55Kn0gYSBwcm9taXNlIGZvciB4IGFuZCB5IGlmIHRoZXkgYXJlIHRoZSBzYW1lLCBidXQgYSByZWplY3Rpb25cclxuICogb3RoZXJ3aXNlLlxyXG4gKlxyXG4gKi9cclxuUS5qb2luID0gZnVuY3Rpb24gKHgsIHkpIHtcclxuICAgIHJldHVybiBRKHgpLmpvaW4oeSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5qb2luID0gZnVuY3Rpb24gKHRoYXQpIHtcclxuICAgIHJldHVybiBRKFt0aGlzLCB0aGF0XSkuc3ByZWFkKGZ1bmN0aW9uICh4LCB5KSB7XHJcbiAgICAgICAgaWYgKHggPT09IHkpIHtcclxuICAgICAgICAgICAgLy8gVE9ETzogXCI9PT1cIiBzaG91bGQgYmUgT2JqZWN0LmlzIG9yIGVxdWl2XHJcbiAgICAgICAgICAgIHJldHVybiB4O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGpvaW46IG5vdCB0aGUgc2FtZTogXCIgKyB4ICsgXCIgXCIgKyB5KTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIGZpcnN0IG9mIGFuIGFycmF5IG9mIHByb21pc2VzIHRvIGJlY29tZSBmdWxmaWxsZWQuXHJcbiAqIEBwYXJhbSBhbnN3ZXJzIHtBcnJheVtBbnkqXX0gcHJvbWlzZXMgdG8gcmFjZVxyXG4gKiBAcmV0dXJucyB7QW55Kn0gdGhlIGZpcnN0IHByb21pc2UgdG8gYmUgZnVsZmlsbGVkXHJcbiAqL1xyXG5RLnJhY2UgPSByYWNlO1xyXG5mdW5jdGlvbiByYWNlKGFuc3dlclBzKSB7XHJcbiAgICByZXR1cm4gcHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAvLyBTd2l0Y2ggdG8gdGhpcyBvbmNlIHdlIGNhbiBhc3N1bWUgYXQgbGVhc3QgRVM1XHJcbiAgICAgICAgLy8gYW5zd2VyUHMuZm9yRWFjaChmdW5jdGlvbihhbnN3ZXJQKSB7XHJcbiAgICAgICAgLy8gICAgIFEoYW5zd2VyUCkudGhlbihyZXNvbHZlLCByZWplY3QpO1xyXG4gICAgICAgIC8vIH0pO1xyXG4gICAgICAgIC8vIFVzZSB0aGlzIGluIHRoZSBtZWFudGltZVxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhbnN3ZXJQcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICBRKGFuc3dlclBzW2ldKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnJhY2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKFEucmFjZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIFByb21pc2Ugd2l0aCBhIHByb21pc2UgZGVzY3JpcHRvciBvYmplY3QgYW5kIG9wdGlvbmFsIGZhbGxiYWNrXHJcbiAqIGZ1bmN0aW9uLiAgVGhlIGRlc2NyaXB0b3IgY29udGFpbnMgbWV0aG9kcyBsaWtlIHdoZW4ocmVqZWN0ZWQpLCBnZXQobmFtZSksXHJcbiAqIHNldChuYW1lLCB2YWx1ZSksIHBvc3QobmFtZSwgYXJncyksIGFuZCBkZWxldGUobmFtZSksIHdoaWNoIGFsbFxyXG4gKiByZXR1cm4gZWl0aGVyIGEgdmFsdWUsIGEgcHJvbWlzZSBmb3IgYSB2YWx1ZSwgb3IgYSByZWplY3Rpb24uICBUaGUgZmFsbGJhY2tcclxuICogYWNjZXB0cyB0aGUgb3BlcmF0aW9uIG5hbWUsIGEgcmVzb2x2ZXIsIGFuZCBhbnkgZnVydGhlciBhcmd1bWVudHMgdGhhdCB3b3VsZFxyXG4gKiBoYXZlIGJlZW4gZm9yd2FyZGVkIHRvIHRoZSBhcHByb3ByaWF0ZSBtZXRob2QgYWJvdmUgaGFkIGEgbWV0aG9kIGJlZW5cclxuICogcHJvdmlkZWQgd2l0aCB0aGUgcHJvcGVyIG5hbWUuICBUaGUgQVBJIG1ha2VzIG5vIGd1YXJhbnRlZXMgYWJvdXQgdGhlIG5hdHVyZVxyXG4gKiBvZiB0aGUgcmV0dXJuZWQgb2JqZWN0LCBhcGFydCBmcm9tIHRoYXQgaXQgaXMgdXNhYmxlIHdoZXJlZXZlciBwcm9taXNlcyBhcmVcclxuICogYm91Z2h0IGFuZCBzb2xkLlxyXG4gKi9cclxuUS5tYWtlUHJvbWlzZSA9IFByb21pc2U7XHJcbmZ1bmN0aW9uIFByb21pc2UoZGVzY3JpcHRvciwgZmFsbGJhY2ssIGluc3BlY3QpIHtcclxuICAgIGlmIChmYWxsYmFjayA9PT0gdm9pZCAwKSB7XHJcbiAgICAgICAgZmFsbGJhY2sgPSBmdW5jdGlvbiAob3ApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgICBcIlByb21pc2UgZG9lcyBub3Qgc3VwcG9ydCBvcGVyYXRpb246IFwiICsgb3BcclxuICAgICAgICAgICAgKSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIGlmIChpbnNwZWN0ID09PSB2b2lkIDApIHtcclxuICAgICAgICBpbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge3N0YXRlOiBcInVua25vd25cIn07XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcHJvbWlzZSA9IG9iamVjdF9jcmVhdGUoUHJvbWlzZS5wcm90b3R5cGUpO1xyXG5cclxuICAgIHByb21pc2UucHJvbWlzZURpc3BhdGNoID0gZnVuY3Rpb24gKHJlc29sdmUsIG9wLCBhcmdzKSB7XHJcbiAgICAgICAgdmFyIHJlc3VsdDtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAoZGVzY3JpcHRvcltvcF0pIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGRlc2NyaXB0b3Jbb3BdLmFwcGx5KHByb21pc2UsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsbGJhY2suY2FsbChwcm9taXNlLCBvcCwgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgcmVzdWx0ID0gcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChyZXNvbHZlKSB7XHJcbiAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHByb21pc2UuaW5zcGVjdCA9IGluc3BlY3Q7XHJcblxyXG4gICAgLy8gWFhYIGRlcHJlY2F0ZWQgYHZhbHVlT2ZgIGFuZCBgZXhjZXB0aW9uYCBzdXBwb3J0XHJcbiAgICBpZiAoaW5zcGVjdCkge1xyXG4gICAgICAgIHZhciBpbnNwZWN0ZWQgPSBpbnNwZWN0KCk7XHJcbiAgICAgICAgaWYgKGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiKSB7XHJcbiAgICAgICAgICAgIHByb21pc2UuZXhjZXB0aW9uID0gaW5zcGVjdGVkLnJlYXNvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb21pc2UudmFsdWVPZiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGluc3BlY3RlZCA9IGluc3BlY3QoKTtcclxuICAgICAgICAgICAgaWYgKGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJwZW5kaW5nXCIgfHxcclxuICAgICAgICAgICAgICAgIGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdGVkLnZhbHVlO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHByb21pc2U7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIFwiW29iamVjdCBQcm9taXNlXVwiO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgdmFyIGRvbmUgPSBmYWxzZTsgICAvLyBlbnN1cmUgdGhlIHVudHJ1c3RlZCBwcm9taXNlIG1ha2VzIGF0IG1vc3QgYVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzaW5nbGUgY2FsbCB0byBvbmUgb2YgdGhlIGNhbGxiYWNrc1xyXG5cclxuICAgIGZ1bmN0aW9uIF9mdWxmaWxsZWQodmFsdWUpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZW9mIGZ1bGZpbGxlZCA9PT0gXCJmdW5jdGlvblwiID8gZnVsZmlsbGVkKHZhbHVlKSA6IHZhbHVlO1xyXG4gICAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIF9yZWplY3RlZChleGNlcHRpb24pIHtcclxuICAgICAgICBpZiAodHlwZW9mIHJlamVjdGVkID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgbWFrZVN0YWNrVHJhY2VMb25nKGV4Y2VwdGlvbiwgc2VsZik7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0ZWQoZXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAobmV3RXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ld0V4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIF9wcm9ncmVzc2VkKHZhbHVlKSB7XHJcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBwcm9ncmVzc2VkID09PSBcImZ1bmN0aW9uXCIgPyBwcm9ncmVzc2VkKHZhbHVlKSA6IHZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIG5leHRUaWNrKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzZWxmLnByb21pc2VEaXNwYXRjaChmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKGRvbmUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkb25lID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoX2Z1bGZpbGxlZCh2YWx1ZSkpO1xyXG4gICAgICAgIH0sIFwid2hlblwiLCBbZnVuY3Rpb24gKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICBpZiAoZG9uZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShfcmVqZWN0ZWQoZXhjZXB0aW9uKSk7XHJcbiAgICAgICAgfV0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHJvZ3Jlc3MgcHJvcGFnYXRvciBuZWVkIHRvIGJlIGF0dGFjaGVkIGluIHRoZSBjdXJyZW50IHRpY2suXHJcbiAgICBzZWxmLnByb21pc2VEaXNwYXRjaCh2b2lkIDAsIFwid2hlblwiLCBbdm9pZCAwLCBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB2YXIgbmV3VmFsdWU7XHJcbiAgICAgICAgdmFyIHRocmV3ID0gZmFsc2U7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbmV3VmFsdWUgPSBfcHJvZ3Jlc3NlZCh2YWx1ZSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICB0aHJldyA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIFEub25lcnJvcihlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghdGhyZXcpIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQubm90aWZ5KG5ld1ZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICB9XSk7XHJcblxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVnaXN0ZXJzIGFuIG9ic2VydmVyIG9uIGEgcHJvbWlzZS5cclxuICpcclxuICogR3VhcmFudGVlczpcclxuICpcclxuICogMS4gdGhhdCBmdWxmaWxsZWQgYW5kIHJlamVjdGVkIHdpbGwgYmUgY2FsbGVkIG9ubHkgb25jZS5cclxuICogMi4gdGhhdCBlaXRoZXIgdGhlIGZ1bGZpbGxlZCBjYWxsYmFjayBvciB0aGUgcmVqZWN0ZWQgY2FsbGJhY2sgd2lsbCBiZVxyXG4gKiAgICBjYWxsZWQsIGJ1dCBub3QgYm90aC5cclxuICogMy4gdGhhdCBmdWxmaWxsZWQgYW5kIHJlamVjdGVkIHdpbGwgbm90IGJlIGNhbGxlZCBpbiB0aGlzIHR1cm4uXHJcbiAqXHJcbiAqIEBwYXJhbSB2YWx1ZSAgICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSB0byBvYnNlcnZlXHJcbiAqIEBwYXJhbSBmdWxmaWxsZWQgIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aXRoIHRoZSBmdWxmaWxsZWQgdmFsdWVcclxuICogQHBhcmFtIHJlamVjdGVkICAgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdpdGggdGhlIHJlamVjdGlvbiBleGNlcHRpb25cclxuICogQHBhcmFtIHByb2dyZXNzZWQgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGFueSBwcm9ncmVzcyBub3RpZmljYXRpb25zXHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSBmcm9tIHRoZSBpbnZva2VkIGNhbGxiYWNrXHJcbiAqL1xyXG5RLndoZW4gPSB3aGVuO1xyXG5mdW5jdGlvbiB3aGVuKHZhbHVlLCBmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKSB7XHJcbiAgICByZXR1cm4gUSh2YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzc2VkKTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudGhlblJlc29sdmUgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKCkgeyByZXR1cm4gdmFsdWU7IH0pO1xyXG59O1xyXG5cclxuUS50aGVuUmVzb2x2ZSA9IGZ1bmN0aW9uIChwcm9taXNlLCB2YWx1ZSkge1xyXG4gICAgcmV0dXJuIFEocHJvbWlzZSkudGhlblJlc29sdmUodmFsdWUpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUudGhlblJlamVjdCA9IGZ1bmN0aW9uIChyZWFzb24pIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKCkgeyB0aHJvdyByZWFzb247IH0pO1xyXG59O1xyXG5cclxuUS50aGVuUmVqZWN0ID0gZnVuY3Rpb24gKHByb21pc2UsIHJlYXNvbikge1xyXG4gICAgcmV0dXJuIFEocHJvbWlzZSkudGhlblJlamVjdChyZWFzb24pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIElmIGFuIG9iamVjdCBpcyBub3QgYSBwcm9taXNlLCBpdCBpcyBhcyBcIm5lYXJcIiBhcyBwb3NzaWJsZS5cclxuICogSWYgYSBwcm9taXNlIGlzIHJlamVjdGVkLCBpdCBpcyBhcyBcIm5lYXJcIiBhcyBwb3NzaWJsZSB0b28uXHJcbiAqIElmIGl04oCZcyBhIGZ1bGZpbGxlZCBwcm9taXNlLCB0aGUgZnVsZmlsbG1lbnQgdmFsdWUgaXMgbmVhcmVyLlxyXG4gKiBJZiBpdOKAmXMgYSBkZWZlcnJlZCBwcm9taXNlIGFuZCB0aGUgZGVmZXJyZWQgaGFzIGJlZW4gcmVzb2x2ZWQsIHRoZVxyXG4gKiByZXNvbHV0aW9uIGlzIFwibmVhcmVyXCIuXHJcbiAqIEBwYXJhbSBvYmplY3RcclxuICogQHJldHVybnMgbW9zdCByZXNvbHZlZCAobmVhcmVzdCkgZm9ybSBvZiB0aGUgb2JqZWN0XHJcbiAqL1xyXG5cclxuLy8gWFhYIHNob3VsZCB3ZSByZS1kbyB0aGlzP1xyXG5RLm5lYXJlciA9IG5lYXJlcjtcclxuZnVuY3Rpb24gbmVhcmVyKHZhbHVlKSB7XHJcbiAgICBpZiAoaXNQcm9taXNlKHZhbHVlKSkge1xyXG4gICAgICAgIHZhciBpbnNwZWN0ZWQgPSB2YWx1ZS5pbnNwZWN0KCk7XHJcbiAgICAgICAgaWYgKGluc3BlY3RlZC5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIikge1xyXG4gICAgICAgICAgICByZXR1cm4gaW5zcGVjdGVkLnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHByb21pc2UuXHJcbiAqIE90aGVyd2lzZSBpdCBpcyBhIGZ1bGZpbGxlZCB2YWx1ZS5cclxuICovXHJcblEuaXNQcm9taXNlID0gaXNQcm9taXNlO1xyXG5mdW5jdGlvbiBpc1Byb21pc2Uob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gaXNPYmplY3Qob2JqZWN0KSAmJlxyXG4gICAgICAgIHR5cGVvZiBvYmplY3QucHJvbWlzZURpc3BhdGNoID09PSBcImZ1bmN0aW9uXCIgJiZcclxuICAgICAgICB0eXBlb2Ygb2JqZWN0Lmluc3BlY3QgPT09IFwiZnVuY3Rpb25cIjtcclxufVxyXG5cclxuUS5pc1Byb21pc2VBbGlrZSA9IGlzUHJvbWlzZUFsaWtlO1xyXG5mdW5jdGlvbiBpc1Byb21pc2VBbGlrZShvYmplY3QpIHtcclxuICAgIHJldHVybiBpc09iamVjdChvYmplY3QpICYmIHR5cGVvZiBvYmplY3QudGhlbiA9PT0gXCJmdW5jdGlvblwiO1xyXG59XHJcblxyXG4vKipcclxuICogQHJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGEgcGVuZGluZyBwcm9taXNlLCBtZWFuaW5nIG5vdFxyXG4gKiBmdWxmaWxsZWQgb3IgcmVqZWN0ZWQuXHJcbiAqL1xyXG5RLmlzUGVuZGluZyA9IGlzUGVuZGluZztcclxuZnVuY3Rpb24gaXNQZW5kaW5nKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIGlzUHJvbWlzZShvYmplY3QpICYmIG9iamVjdC5pbnNwZWN0KCkuc3RhdGUgPT09IFwicGVuZGluZ1wiO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5pc1BlbmRpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwicGVuZGluZ1wiO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEByZXR1cm5zIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBpcyBhIHZhbHVlIG9yIGZ1bGZpbGxlZFxyXG4gKiBwcm9taXNlLlxyXG4gKi9cclxuUS5pc0Z1bGZpbGxlZCA9IGlzRnVsZmlsbGVkO1xyXG5mdW5jdGlvbiBpc0Z1bGZpbGxlZChvYmplY3QpIHtcclxuICAgIHJldHVybiAhaXNQcm9taXNlKG9iamVjdCkgfHwgb2JqZWN0Lmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIjtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuaXNGdWxmaWxsZWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5pbnNwZWN0KCkuc3RhdGUgPT09IFwiZnVsZmlsbGVkXCI7XHJcbn07XHJcblxyXG4vKipcclxuICogQHJldHVybnMgd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IGlzIGEgcmVqZWN0ZWQgcHJvbWlzZS5cclxuICovXHJcblEuaXNSZWplY3RlZCA9IGlzUmVqZWN0ZWQ7XHJcbmZ1bmN0aW9uIGlzUmVqZWN0ZWQob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gaXNQcm9taXNlKG9iamVjdCkgJiYgb2JqZWN0Lmluc3BlY3QoKS5zdGF0ZSA9PT0gXCJyZWplY3RlZFwiO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5pc1JlamVjdGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuaW5zcGVjdCgpLnN0YXRlID09PSBcInJlamVjdGVkXCI7XHJcbn07XHJcblxyXG4vLy8vIEJFR0lOIFVOSEFORExFRCBSRUpFQ1RJT04gVFJBQ0tJTkdcclxuXHJcbi8vIFRoaXMgcHJvbWlzZSBsaWJyYXJ5IGNvbnN1bWVzIGV4Y2VwdGlvbnMgdGhyb3duIGluIGhhbmRsZXJzIHNvIHRoZXkgY2FuIGJlXHJcbi8vIGhhbmRsZWQgYnkgYSBzdWJzZXF1ZW50IHByb21pc2UuICBUaGUgZXhjZXB0aW9ucyBnZXQgYWRkZWQgdG8gdGhpcyBhcnJheSB3aGVuXHJcbi8vIHRoZXkgYXJlIGNyZWF0ZWQsIGFuZCByZW1vdmVkIHdoZW4gdGhleSBhcmUgaGFuZGxlZC4gIE5vdGUgdGhhdCBpbiBFUzYgb3JcclxuLy8gc2hpbW1lZCBlbnZpcm9ubWVudHMsIHRoaXMgd291bGQgbmF0dXJhbGx5IGJlIGEgYFNldGAuXHJcbnZhciB1bmhhbmRsZWRSZWFzb25zID0gW107XHJcbnZhciB1bmhhbmRsZWRSZWplY3Rpb25zID0gW107XHJcbnZhciB0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMgPSB0cnVlO1xyXG5cclxuZnVuY3Rpb24gcmVzZXRVbmhhbmRsZWRSZWplY3Rpb25zKCkge1xyXG4gICAgdW5oYW5kbGVkUmVhc29ucy5sZW5ndGggPSAwO1xyXG4gICAgdW5oYW5kbGVkUmVqZWN0aW9ucy5sZW5ndGggPSAwO1xyXG5cclxuICAgIGlmICghdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zKSB7XHJcbiAgICAgICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhY2tSZWplY3Rpb24ocHJvbWlzZSwgcmVhc29uKSB7XHJcbiAgICBpZiAoIXRyYWNrVW5oYW5kbGVkUmVqZWN0aW9ucykge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB1bmhhbmRsZWRSZWplY3Rpb25zLnB1c2gocHJvbWlzZSk7XHJcbiAgICBpZiAocmVhc29uICYmIHR5cGVvZiByZWFzb24uc3RhY2sgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgICAgICB1bmhhbmRsZWRSZWFzb25zLnB1c2gocmVhc29uLnN0YWNrKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdW5oYW5kbGVkUmVhc29ucy5wdXNoKFwiKG5vIHN0YWNrKSBcIiArIHJlYXNvbik7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVudHJhY2tSZWplY3Rpb24ocHJvbWlzZSkge1xyXG4gICAgaWYgKCF0cmFja1VuaGFuZGxlZFJlamVjdGlvbnMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGF0ID0gYXJyYXlfaW5kZXhPZih1bmhhbmRsZWRSZWplY3Rpb25zLCBwcm9taXNlKTtcclxuICAgIGlmIChhdCAhPT0gLTEpIHtcclxuICAgICAgICB1bmhhbmRsZWRSZWplY3Rpb25zLnNwbGljZShhdCwgMSk7XHJcbiAgICAgICAgdW5oYW5kbGVkUmVhc29ucy5zcGxpY2UoYXQsIDEpO1xyXG4gICAgfVxyXG59XHJcblxyXG5RLnJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucyA9IHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucztcclxuXHJcblEuZ2V0VW5oYW5kbGVkUmVhc29ucyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIE1ha2UgYSBjb3B5IHNvIHRoYXQgY29uc3VtZXJzIGNhbid0IGludGVyZmVyZSB3aXRoIG91ciBpbnRlcm5hbCBzdGF0ZS5cclxuICAgIHJldHVybiB1bmhhbmRsZWRSZWFzb25zLnNsaWNlKCk7XHJcbn07XHJcblxyXG5RLnN0b3BVbmhhbmRsZWRSZWplY3Rpb25UcmFja2luZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJlc2V0VW5oYW5kbGVkUmVqZWN0aW9ucygpO1xyXG4gICAgdHJhY2tVbmhhbmRsZWRSZWplY3Rpb25zID0gZmFsc2U7XHJcbn07XHJcblxyXG5yZXNldFVuaGFuZGxlZFJlamVjdGlvbnMoKTtcclxuXHJcbi8vLy8gRU5EIFVOSEFORExFRCBSRUpFQ1RJT04gVFJBQ0tJTkdcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgcmVqZWN0ZWQgcHJvbWlzZS5cclxuICogQHBhcmFtIHJlYXNvbiB2YWx1ZSBkZXNjcmliaW5nIHRoZSBmYWlsdXJlXHJcbiAqL1xyXG5RLnJlamVjdCA9IHJlamVjdDtcclxuZnVuY3Rpb24gcmVqZWN0KHJlYXNvbikge1xyXG4gICAgdmFyIHJlamVjdGlvbiA9IFByb21pc2Uoe1xyXG4gICAgICAgIFwid2hlblwiOiBmdW5jdGlvbiAocmVqZWN0ZWQpIHtcclxuICAgICAgICAgICAgLy8gbm90ZSB0aGF0IHRoZSBlcnJvciBoYXMgYmVlbiBoYW5kbGVkXHJcbiAgICAgICAgICAgIGlmIChyZWplY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgdW50cmFja1JlamVjdGlvbih0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0ZWQgPyByZWplY3RlZChyZWFzb24pIDogdGhpcztcclxuICAgICAgICB9XHJcbiAgICB9LCBmdW5jdGlvbiBmYWxsYmFjaygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sIGZ1bmN0aW9uIGluc3BlY3QoKSB7XHJcbiAgICAgICAgcmV0dXJuIHsgc3RhdGU6IFwicmVqZWN0ZWRcIiwgcmVhc29uOiByZWFzb24gfTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGUgdGhhdCB0aGUgcmVhc29uIGhhcyBub3QgYmVlbiBoYW5kbGVkLlxyXG4gICAgdHJhY2tSZWplY3Rpb24ocmVqZWN0aW9uLCByZWFzb24pO1xyXG5cclxuICAgIHJldHVybiByZWplY3Rpb247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgZnVsZmlsbGVkIHByb21pc2UgZm9yIGFuIGltbWVkaWF0ZSByZWZlcmVuY2UuXHJcbiAqIEBwYXJhbSB2YWx1ZSBpbW1lZGlhdGUgcmVmZXJlbmNlXHJcbiAqL1xyXG5RLmZ1bGZpbGwgPSBmdWxmaWxsO1xyXG5mdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gUHJvbWlzZSh7XHJcbiAgICAgICAgXCJ3aGVuXCI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJnZXRcIjogZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlW25hbWVdO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJzZXRcIjogZnVuY3Rpb24gKG5hbWUsIHJocykge1xyXG4gICAgICAgICAgICB2YWx1ZVtuYW1lXSA9IHJocztcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwiZGVsZXRlXCI6IGZ1bmN0aW9uIChuYW1lKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB2YWx1ZVtuYW1lXTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwicG9zdFwiOiBmdW5jdGlvbiAobmFtZSwgYXJncykge1xyXG4gICAgICAgICAgICAvLyBNYXJrIE1pbGxlciBwcm9wb3NlcyB0aGF0IHBvc3Qgd2l0aCBubyBuYW1lIHNob3VsZCBhcHBseSBhXHJcbiAgICAgICAgICAgIC8vIHByb21pc2VkIGZ1bmN0aW9uLlxyXG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gbnVsbCB8fCBuYW1lID09PSB2b2lkIDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5hcHBseSh2b2lkIDAsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlW25hbWVdLmFwcGx5KHZhbHVlLCBhcmdzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXCJhcHBseVwiOiBmdW5jdGlvbiAodGhpc3AsIGFyZ3MpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLmFwcGx5KHRoaXNwLCBhcmdzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFwia2V5c1wiOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBvYmplY3Rfa2V5cyh2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfSwgdm9pZCAwLCBmdW5jdGlvbiBpbnNwZWN0KCkge1xyXG4gICAgICAgIHJldHVybiB7IHN0YXRlOiBcImZ1bGZpbGxlZFwiLCB2YWx1ZTogdmFsdWUgfTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydHMgdGhlbmFibGVzIHRvIFEgcHJvbWlzZXMuXHJcbiAqIEBwYXJhbSBwcm9taXNlIHRoZW5hYmxlIHByb21pc2VcclxuICogQHJldHVybnMgYSBRIHByb21pc2VcclxuICovXHJcbmZ1bmN0aW9uIGNvZXJjZShwcm9taXNlKSB7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHByb21pc2UudGhlbihkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QsIGRlZmVycmVkLm5vdGlmeSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBbm5vdGF0ZXMgYW4gb2JqZWN0IHN1Y2ggdGhhdCBpdCB3aWxsIG5ldmVyIGJlXHJcbiAqIHRyYW5zZmVycmVkIGF3YXkgZnJvbSB0aGlzIHByb2Nlc3Mgb3ZlciBhbnkgcHJvbWlzZVxyXG4gKiBjb21tdW5pY2F0aW9uIGNoYW5uZWwuXHJcbiAqIEBwYXJhbSBvYmplY3RcclxuICogQHJldHVybnMgcHJvbWlzZSBhIHdyYXBwaW5nIG9mIHRoYXQgb2JqZWN0IHRoYXRcclxuICogYWRkaXRpb25hbGx5IHJlc3BvbmRzIHRvIHRoZSBcImlzRGVmXCIgbWVzc2FnZVxyXG4gKiB3aXRob3V0IGEgcmVqZWN0aW9uLlxyXG4gKi9cclxuUS5tYXN0ZXIgPSBtYXN0ZXI7XHJcbmZ1bmN0aW9uIG1hc3RlcihvYmplY3QpIHtcclxuICAgIHJldHVybiBQcm9taXNlKHtcclxuICAgICAgICBcImlzRGVmXCI6IGZ1bmN0aW9uICgpIHt9XHJcbiAgICB9LCBmdW5jdGlvbiBmYWxsYmFjayhvcCwgYXJncykge1xyXG4gICAgICAgIHJldHVybiBkaXNwYXRjaChvYmplY3QsIG9wLCBhcmdzKTtcclxuICAgIH0sIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gUShvYmplY3QpLmluc3BlY3QoKTtcclxuICAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogU3ByZWFkcyB0aGUgdmFsdWVzIG9mIGEgcHJvbWlzZWQgYXJyYXkgb2YgYXJndW1lbnRzIGludG8gdGhlXHJcbiAqIGZ1bGZpbGxtZW50IGNhbGxiYWNrLlxyXG4gKiBAcGFyYW0gZnVsZmlsbGVkIGNhbGxiYWNrIHRoYXQgcmVjZWl2ZXMgdmFyaWFkaWMgYXJndW1lbnRzIGZyb20gdGhlXHJcbiAqIHByb21pc2VkIGFycmF5XHJcbiAqIEBwYXJhbSByZWplY3RlZCBjYWxsYmFjayB0aGF0IHJlY2VpdmVzIHRoZSBleGNlcHRpb24gaWYgdGhlIHByb21pc2VcclxuICogaXMgcmVqZWN0ZWQuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZSBvciB0aHJvd24gZXhjZXB0aW9uIG9mXHJcbiAqIGVpdGhlciBjYWxsYmFjay5cclxuICovXHJcblEuc3ByZWFkID0gc3ByZWFkO1xyXG5mdW5jdGlvbiBzcHJlYWQodmFsdWUsIGZ1bGZpbGxlZCwgcmVqZWN0ZWQpIHtcclxuICAgIHJldHVybiBRKHZhbHVlKS5zcHJlYWQoZnVsZmlsbGVkLCByZWplY3RlZCk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnNwcmVhZCA9IGZ1bmN0aW9uIChmdWxmaWxsZWQsIHJlamVjdGVkKSB7XHJcbiAgICByZXR1cm4gdGhpcy5hbGwoKS50aGVuKGZ1bmN0aW9uIChhcnJheSkge1xyXG4gICAgICAgIHJldHVybiBmdWxmaWxsZWQuYXBwbHkodm9pZCAwLCBhcnJheSk7XHJcbiAgICB9LCByZWplY3RlZCk7XHJcbn07XHJcblxyXG4vKipcclxuICogVGhlIGFzeW5jIGZ1bmN0aW9uIGlzIGEgZGVjb3JhdG9yIGZvciBnZW5lcmF0b3IgZnVuY3Rpb25zLCB0dXJuaW5nXHJcbiAqIHRoZW0gaW50byBhc3luY2hyb25vdXMgZ2VuZXJhdG9ycy4gIEFsdGhvdWdoIGdlbmVyYXRvcnMgYXJlIG9ubHkgcGFydFxyXG4gKiBvZiB0aGUgbmV3ZXN0IEVDTUFTY3JpcHQgNiBkcmFmdHMsIHRoaXMgY29kZSBkb2VzIG5vdCBjYXVzZSBzeW50YXhcclxuICogZXJyb3JzIGluIG9sZGVyIGVuZ2luZXMuICBUaGlzIGNvZGUgc2hvdWxkIGNvbnRpbnVlIHRvIHdvcmsgYW5kIHdpbGxcclxuICogaW4gZmFjdCBpbXByb3ZlIG92ZXIgdGltZSBhcyB0aGUgbGFuZ3VhZ2UgaW1wcm92ZXMuXHJcbiAqXHJcbiAqIEVTNiBnZW5lcmF0b3JzIGFyZSBjdXJyZW50bHkgcGFydCBvZiBWOCB2ZXJzaW9uIDMuMTkgd2l0aCB0aGVcclxuICogLS1oYXJtb255LWdlbmVyYXRvcnMgcnVudGltZSBmbGFnIGVuYWJsZWQuICBTcGlkZXJNb25rZXkgaGFzIGhhZCB0aGVtXHJcbiAqIGZvciBsb25nZXIsIGJ1dCB1bmRlciBhbiBvbGRlciBQeXRob24taW5zcGlyZWQgZm9ybS4gIFRoaXMgZnVuY3Rpb25cclxuICogd29ya3Mgb24gYm90aCBraW5kcyBvZiBnZW5lcmF0b3JzLlxyXG4gKlxyXG4gKiBEZWNvcmF0ZXMgYSBnZW5lcmF0b3IgZnVuY3Rpb24gc3VjaCB0aGF0OlxyXG4gKiAgLSBpdCBtYXkgeWllbGQgcHJvbWlzZXNcclxuICogIC0gZXhlY3V0aW9uIHdpbGwgY29udGludWUgd2hlbiB0aGF0IHByb21pc2UgaXMgZnVsZmlsbGVkXHJcbiAqICAtIHRoZSB2YWx1ZSBvZiB0aGUgeWllbGQgZXhwcmVzc2lvbiB3aWxsIGJlIHRoZSBmdWxmaWxsZWQgdmFsdWVcclxuICogIC0gaXQgcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWUgKHdoZW4gdGhlIGdlbmVyYXRvclxyXG4gKiAgICBzdG9wcyBpdGVyYXRpbmcpXHJcbiAqICAtIHRoZSBkZWNvcmF0ZWQgZnVuY3Rpb24gcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICogICAgb2YgdGhlIGdlbmVyYXRvciBvciB0aGUgZmlyc3QgcmVqZWN0ZWQgcHJvbWlzZSBhbW9uZyB0aG9zZVxyXG4gKiAgICB5aWVsZGVkLlxyXG4gKiAgLSBpZiBhbiBlcnJvciBpcyB0aHJvd24gaW4gdGhlIGdlbmVyYXRvciwgaXQgcHJvcGFnYXRlcyB0aHJvdWdoXHJcbiAqICAgIGV2ZXJ5IGZvbGxvd2luZyB5aWVsZCB1bnRpbCBpdCBpcyBjYXVnaHQsIG9yIHVudGlsIGl0IGVzY2FwZXNcclxuICogICAgdGhlIGdlbmVyYXRvciBmdW5jdGlvbiBhbHRvZ2V0aGVyLCBhbmQgaXMgdHJhbnNsYXRlZCBpbnRvIGFcclxuICogICAgcmVqZWN0aW9uIGZvciB0aGUgcHJvbWlzZSByZXR1cm5lZCBieSB0aGUgZGVjb3JhdGVkIGdlbmVyYXRvci5cclxuICovXHJcblEuYXN5bmMgPSBhc3luYztcclxuZnVuY3Rpb24gYXN5bmMobWFrZUdlbmVyYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAvLyB3aGVuIHZlcmIgaXMgXCJzZW5kXCIsIGFyZyBpcyBhIHZhbHVlXHJcbiAgICAgICAgLy8gd2hlbiB2ZXJiIGlzIFwidGhyb3dcIiwgYXJnIGlzIGFuIGV4Y2VwdGlvblxyXG4gICAgICAgIGZ1bmN0aW9uIGNvbnRpbnVlcih2ZXJiLCBhcmcpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdDtcclxuXHJcbiAgICAgICAgICAgIC8vIFVudGlsIFY4IDMuMTkgLyBDaHJvbWl1bSAyOSBpcyByZWxlYXNlZCwgU3BpZGVyTW9ua2V5IGlzIHRoZSBvbmx5XHJcbiAgICAgICAgICAgIC8vIGVuZ2luZSB0aGF0IGhhcyBhIGRlcGxveWVkIGJhc2Ugb2YgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IGdlbmVyYXRvcnMuXHJcbiAgICAgICAgICAgIC8vIEhvd2V2ZXIsIFNNJ3MgZ2VuZXJhdG9ycyB1c2UgdGhlIFB5dGhvbi1pbnNwaXJlZCBzZW1hbnRpY3Mgb2ZcclxuICAgICAgICAgICAgLy8gb3V0ZGF0ZWQgRVM2IGRyYWZ0cy4gIFdlIHdvdWxkIGxpa2UgdG8gc3VwcG9ydCBFUzYsIGJ1dCB3ZSdkIGFsc29cclxuICAgICAgICAgICAgLy8gbGlrZSB0byBtYWtlIGl0IHBvc3NpYmxlIHRvIHVzZSBnZW5lcmF0b3JzIGluIGRlcGxveWVkIGJyb3dzZXJzLCBzb1xyXG4gICAgICAgICAgICAvLyB3ZSBhbHNvIHN1cHBvcnQgUHl0aG9uLXN0eWxlIGdlbmVyYXRvcnMuICBBdCBzb21lIHBvaW50IHdlIGNhbiByZW1vdmVcclxuICAgICAgICAgICAgLy8gdGhpcyBibG9jay5cclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgU3RvcEl0ZXJhdGlvbiA9PT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgLy8gRVM2IEdlbmVyYXRvcnNcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZ2VuZXJhdG9yW3ZlcmJdKGFyZyk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0LmRvbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUShyZXN1bHQudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gd2hlbihyZXN1bHQudmFsdWUsIGNhbGxiYWNrLCBlcnJiYWNrKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFNwaWRlck1vbmtleSBHZW5lcmF0b3JzXHJcbiAgICAgICAgICAgICAgICAvLyBGSVhNRTogUmVtb3ZlIHRoaXMgY2FzZSB3aGVuIFNNIGRvZXMgRVM2IGdlbmVyYXRvcnMuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGdlbmVyYXRvclt2ZXJiXShhcmcpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzU3RvcEl0ZXJhdGlvbihleGNlcHRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBRKGV4Y2VwdGlvbi52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB3aGVuKHJlc3VsdCwgY2FsbGJhY2ssIGVycmJhY2spO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBnZW5lcmF0b3IgPSBtYWtlR2VuZXJhdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gY29udGludWVyLmJpbmQoY29udGludWVyLCBcIm5leHRcIik7XHJcbiAgICAgICAgdmFyIGVycmJhY2sgPSBjb250aW51ZXIuYmluZChjb250aW51ZXIsIFwidGhyb3dcIik7XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XHJcbiAgICB9O1xyXG59XHJcblxyXG4vKipcclxuICogVGhlIHNwYXduIGZ1bmN0aW9uIGlzIGEgc21hbGwgd3JhcHBlciBhcm91bmQgYXN5bmMgdGhhdCBpbW1lZGlhdGVseVxyXG4gKiBjYWxscyB0aGUgZ2VuZXJhdG9yIGFuZCBhbHNvIGVuZHMgdGhlIHByb21pc2UgY2hhaW4sIHNvIHRoYXQgYW55XHJcbiAqIHVuaGFuZGxlZCBlcnJvcnMgYXJlIHRocm93biBpbnN0ZWFkIG9mIGZvcndhcmRlZCB0byB0aGUgZXJyb3JcclxuICogaGFuZGxlci4gVGhpcyBpcyB1c2VmdWwgYmVjYXVzZSBpdCdzIGV4dHJlbWVseSBjb21tb24gdG8gcnVuXHJcbiAqIGdlbmVyYXRvcnMgYXQgdGhlIHRvcC1sZXZlbCB0byB3b3JrIHdpdGggbGlicmFyaWVzLlxyXG4gKi9cclxuUS5zcGF3biA9IHNwYXduO1xyXG5mdW5jdGlvbiBzcGF3bihtYWtlR2VuZXJhdG9yKSB7XHJcbiAgICBRLmRvbmUoUS5hc3luYyhtYWtlR2VuZXJhdG9yKSgpKTtcclxufVxyXG5cclxuLy8gRklYTUU6IFJlbW92ZSB0aGlzIGludGVyZmFjZSBvbmNlIEVTNiBnZW5lcmF0b3JzIGFyZSBpbiBTcGlkZXJNb25rZXkuXHJcbi8qKlxyXG4gKiBUaHJvd3MgYSBSZXR1cm5WYWx1ZSBleGNlcHRpb24gdG8gc3RvcCBhbiBhc3luY2hyb25vdXMgZ2VuZXJhdG9yLlxyXG4gKlxyXG4gKiBUaGlzIGludGVyZmFjZSBpcyBhIHN0b3AtZ2FwIG1lYXN1cmUgdG8gc3VwcG9ydCBnZW5lcmF0b3IgcmV0dXJuXHJcbiAqIHZhbHVlcyBpbiBvbGRlciBGaXJlZm94L1NwaWRlck1vbmtleS4gIEluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBFUzZcclxuICogZ2VuZXJhdG9ycyBsaWtlIENocm9taXVtIDI5LCBqdXN0IHVzZSBcInJldHVyblwiIGluIHlvdXIgZ2VuZXJhdG9yXHJcbiAqIGZ1bmN0aW9ucy5cclxuICpcclxuICogQHBhcmFtIHZhbHVlIHRoZSByZXR1cm4gdmFsdWUgZm9yIHRoZSBzdXJyb3VuZGluZyBnZW5lcmF0b3JcclxuICogQHRocm93cyBSZXR1cm5WYWx1ZSBleGNlcHRpb24gd2l0aCB0aGUgdmFsdWUuXHJcbiAqIEBleGFtcGxlXHJcbiAqIC8vIEVTNiBzdHlsZVxyXG4gKiBRLmFzeW5jKGZ1bmN0aW9uKiAoKSB7XHJcbiAqICAgICAgdmFyIGZvbyA9IHlpZWxkIGdldEZvb1Byb21pc2UoKTtcclxuICogICAgICB2YXIgYmFyID0geWllbGQgZ2V0QmFyUHJvbWlzZSgpO1xyXG4gKiAgICAgIHJldHVybiBmb28gKyBiYXI7XHJcbiAqIH0pXHJcbiAqIC8vIE9sZGVyIFNwaWRlck1vbmtleSBzdHlsZVxyXG4gKiBRLmFzeW5jKGZ1bmN0aW9uICgpIHtcclxuICogICAgICB2YXIgZm9vID0geWllbGQgZ2V0Rm9vUHJvbWlzZSgpO1xyXG4gKiAgICAgIHZhciBiYXIgPSB5aWVsZCBnZXRCYXJQcm9taXNlKCk7XHJcbiAqICAgICAgUS5yZXR1cm4oZm9vICsgYmFyKTtcclxuICogfSlcclxuICovXHJcblFbXCJyZXR1cm5cIl0gPSBfcmV0dXJuO1xyXG5mdW5jdGlvbiBfcmV0dXJuKHZhbHVlKSB7XHJcbiAgICB0aHJvdyBuZXcgUVJldHVyblZhbHVlKHZhbHVlKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoZSBwcm9taXNlZCBmdW5jdGlvbiBkZWNvcmF0b3IgZW5zdXJlcyB0aGF0IGFueSBwcm9taXNlIGFyZ3VtZW50c1xyXG4gKiBhcmUgc2V0dGxlZCBhbmQgcGFzc2VkIGFzIHZhbHVlcyAoYHRoaXNgIGlzIGFsc28gc2V0dGxlZCBhbmQgcGFzc2VkXHJcbiAqIGFzIGEgdmFsdWUpLiAgSXQgd2lsbCBhbHNvIGVuc3VyZSB0aGF0IHRoZSByZXN1bHQgb2YgYSBmdW5jdGlvbiBpc1xyXG4gKiBhbHdheXMgYSBwcm9taXNlLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiB2YXIgYWRkID0gUS5wcm9taXNlZChmdW5jdGlvbiAoYSwgYikge1xyXG4gKiAgICAgcmV0dXJuIGEgKyBiO1xyXG4gKiB9KTtcclxuICogYWRkKFEoYSksIFEoQikpO1xyXG4gKlxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gdG8gZGVjb3JhdGVcclxuICogQHJldHVybnMge2Z1bmN0aW9ufSBhIGZ1bmN0aW9uIHRoYXQgaGFzIGJlZW4gZGVjb3JhdGVkLlxyXG4gKi9cclxuUS5wcm9taXNlZCA9IHByb21pc2VkO1xyXG5mdW5jdGlvbiBwcm9taXNlZChjYWxsYmFjaykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gc3ByZWFkKFt0aGlzLCBhbGwoYXJndW1lbnRzKV0sIGZ1bmN0aW9uIChzZWxmLCBhcmdzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShzZWxmLCBhcmdzKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBzZW5kcyBhIG1lc3NhZ2UgdG8gYSB2YWx1ZSBpbiBhIGZ1dHVyZSB0dXJuXHJcbiAqIEBwYXJhbSBvYmplY3QqIHRoZSByZWNpcGllbnRcclxuICogQHBhcmFtIG9wIHRoZSBuYW1lIG9mIHRoZSBtZXNzYWdlIG9wZXJhdGlvbiwgZS5nLiwgXCJ3aGVuXCIsXHJcbiAqIEBwYXJhbSBhcmdzIGZ1cnRoZXIgYXJndW1lbnRzIHRvIGJlIGZvcndhcmRlZCB0byB0aGUgb3BlcmF0aW9uXHJcbiAqIEByZXR1cm5zIHJlc3VsdCB7UHJvbWlzZX0gYSBwcm9taXNlIGZvciB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb25cclxuICovXHJcblEuZGlzcGF0Y2ggPSBkaXNwYXRjaDtcclxuZnVuY3Rpb24gZGlzcGF0Y2gob2JqZWN0LCBvcCwgYXJncykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChvcCwgYXJncyk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24gKG9wLCBhcmdzKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbmV4dFRpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHNlbGYucHJvbWlzZURpc3BhdGNoKGRlZmVycmVkLnJlc29sdmUsIG9wLCBhcmdzKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0cyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gZ2V0XHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHByb3BlcnR5IHZhbHVlXHJcbiAqL1xyXG5RLmdldCA9IGZ1bmN0aW9uIChvYmplY3QsIGtleSkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImdldFwiLCBba2V5XSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImdldFwiLCBba2V5XSk7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0cyB0aGUgdmFsdWUgb2YgYSBwcm9wZXJ0eSBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3Igb2JqZWN0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgcHJvcGVydHkgdG8gc2V0XHJcbiAqIEBwYXJhbSB2YWx1ZSAgICAgbmV3IHZhbHVlIG9mIHByb3BlcnR5XHJcbiAqIEByZXR1cm4gcHJvbWlzZSBmb3IgdGhlIHJldHVybiB2YWx1ZVxyXG4gKi9cclxuUS5zZXQgPSBmdW5jdGlvbiAob2JqZWN0LCBrZXksIHZhbHVlKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwic2V0XCIsIFtrZXksIHZhbHVlXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJzZXRcIiwgW2tleSwgdmFsdWVdKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWxldGVzIGEgcHJvcGVydHkgaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBvYmplY3RcclxuICogQHBhcmFtIG5hbWUgICAgICBuYW1lIG9mIHByb3BlcnR5IHRvIGRlbGV0ZVxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICovXHJcblEuZGVsID0gLy8gWFhYIGxlZ2FjeVxyXG5RW1wiZGVsZXRlXCJdID0gZnVuY3Rpb24gKG9iamVjdCwga2V5KSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwiZGVsZXRlXCIsIFtrZXldKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmRlbCA9IC8vIFhYWCBsZWdhY3lcclxuUHJvbWlzZS5wcm90b3R5cGVbXCJkZWxldGVcIl0gPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImRlbGV0ZVwiLCBba2V5XSk7XHJcbn07XHJcblxyXG4vKipcclxuICogSW52b2tlcyBhIG1ldGhvZCBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcGFyYW0gbmFtZSAgICAgIG5hbWUgb2YgbWV0aG9kIHRvIGludm9rZVxyXG4gKiBAcGFyYW0gdmFsdWUgICAgIGEgdmFsdWUgdG8gcG9zdCwgdHlwaWNhbGx5IGFuIGFycmF5IG9mXHJcbiAqICAgICAgICAgICAgICAgICAgaW52b2NhdGlvbiBhcmd1bWVudHMgZm9yIHByb21pc2VzIHRoYXRcclxuICogICAgICAgICAgICAgICAgICBhcmUgdWx0aW1hdGVseSBiYWNrZWQgd2l0aCBgcmVzb2x2ZWAgdmFsdWVzLFxyXG4gKiAgICAgICAgICAgICAgICAgIGFzIG9wcG9zZWQgdG8gdGhvc2UgYmFja2VkIHdpdGggVVJMc1xyXG4gKiAgICAgICAgICAgICAgICAgIHdoZXJlaW4gdGhlIHBvc3RlZCB2YWx1ZSBjYW4gYmUgYW55XHJcbiAqICAgICAgICAgICAgICAgICAgSlNPTiBzZXJpYWxpemFibGUgb2JqZWN0LlxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSByZXR1cm4gdmFsdWVcclxuICovXHJcbi8vIGJvdW5kIGxvY2FsbHkgYmVjYXVzZSBpdCBpcyB1c2VkIGJ5IG90aGVyIG1ldGhvZHNcclxuUS5tYXBwbHkgPSAvLyBYWFggQXMgcHJvcG9zZWQgYnkgXCJSZWRzYW5kcm9cIlxyXG5RLnBvc3QgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCBhcmdzKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJnc10pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubWFwcGx5ID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUHJvbWlzZS5wcm90b3R5cGUucG9zdCA9IGZ1bmN0aW9uIChuYW1lLCBhcmdzKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIGFyZ3NdKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJbnZva2VzIGEgbWV0aG9kIGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgb2JqZWN0XHJcbiAqIEBwYXJhbSBuYW1lICAgICAgbmFtZSBvZiBtZXRob2QgdG8gaW52b2tlXHJcbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgaW52b2NhdGlvbiBhcmd1bWVudHNcclxuICogQHJldHVybiBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlXHJcbiAqL1xyXG5RLnNlbmQgPSAvLyBYWFggTWFyayBNaWxsZXIncyBwcm9wb3NlZCBwYXJsYW5jZVxyXG5RLm1jYWxsID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUS5pbnZva2UgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lIC8qLi4uYXJncyovKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAyKV0pO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuc2VuZCA9IC8vIFhYWCBNYXJrIE1pbGxlcidzIHByb3Bvc2VkIHBhcmxhbmNlXHJcblByb21pc2UucHJvdG90eXBlLm1jYWxsID0gLy8gWFhYIEFzIHByb3Bvc2VkIGJ5IFwiUmVkc2FuZHJvXCJcclxuUHJvbWlzZS5wcm90b3R5cGUuaW52b2tlID0gZnVuY3Rpb24gKG5hbWUgLyouLi5hcmdzKi8pIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgYXJyYXlfc2xpY2UoYXJndW1lbnRzLCAxKV0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFwcGxpZXMgdGhlIHByb21pc2VkIGZ1bmN0aW9uIGluIGEgZnV0dXJlIHR1cm4uXHJcbiAqIEBwYXJhbSBvYmplY3QgICAgcHJvbWlzZSBvciBpbW1lZGlhdGUgcmVmZXJlbmNlIGZvciB0YXJnZXQgZnVuY3Rpb25cclxuICogQHBhcmFtIGFyZ3MgICAgICBhcnJheSBvZiBhcHBsaWNhdGlvbiBhcmd1bWVudHNcclxuICovXHJcblEuZmFwcGx5ID0gZnVuY3Rpb24gKG9iamVjdCwgYXJncykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFyZ3NdKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmZhcHBseSA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFyZ3NdKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxscyB0aGUgcHJvbWlzZWQgZnVuY3Rpb24gaW4gYSBmdXR1cmUgdHVybi5cclxuICogQHBhcmFtIG9iamVjdCAgICBwcm9taXNlIG9yIGltbWVkaWF0ZSByZWZlcmVuY2UgZm9yIHRhcmdldCBmdW5jdGlvblxyXG4gKiBAcGFyYW0gLi4uYXJncyAgIGFycmF5IG9mIGFwcGxpY2F0aW9uIGFyZ3VtZW50c1xyXG4gKi9cclxuUVtcInRyeVwiXSA9XHJcblEuZmNhbGwgPSBmdW5jdGlvbiAob2JqZWN0IC8qIC4uLmFyZ3MqLykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSldKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmZjYWxsID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaChcImFwcGx5XCIsIFt2b2lkIDAsIGFycmF5X3NsaWNlKGFyZ3VtZW50cyldKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBCaW5kcyB0aGUgcHJvbWlzZWQgZnVuY3Rpb24sIHRyYW5zZm9ybWluZyByZXR1cm4gdmFsdWVzIGludG8gYSBmdWxmaWxsZWRcclxuICogcHJvbWlzZSBhbmQgdGhyb3duIGVycm9ycyBpbnRvIGEgcmVqZWN0ZWQgb25lLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSAuLi5hcmdzICAgYXJyYXkgb2YgYXBwbGljYXRpb24gYXJndW1lbnRzXHJcbiAqL1xyXG5RLmZiaW5kID0gZnVuY3Rpb24gKG9iamVjdCAvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIHByb21pc2UgPSBRKG9iamVjdCk7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gZmJvdW5kKCkge1xyXG4gICAgICAgIHJldHVybiBwcm9taXNlLmRpc3BhdGNoKFwiYXBwbHlcIiwgW1xyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBhcmdzLmNvbmNhdChhcnJheV9zbGljZShhcmd1bWVudHMpKVxyXG4gICAgICAgIF0pO1xyXG4gICAgfTtcclxufTtcclxuUHJvbWlzZS5wcm90b3R5cGUuZmJpbmQgPSBmdW5jdGlvbiAoLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBwcm9taXNlID0gdGhpcztcclxuICAgIHZhciBhcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcclxuICAgIHJldHVybiBmdW5jdGlvbiBmYm91bmQoKSB7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2UuZGlzcGF0Y2goXCJhcHBseVwiLCBbXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGFyZ3MuY29uY2F0KGFycmF5X3NsaWNlKGFyZ3VtZW50cykpXHJcbiAgICAgICAgXSk7XHJcbiAgICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlcXVlc3RzIHRoZSBuYW1lcyBvZiB0aGUgb3duZWQgcHJvcGVydGllcyBvZiBhIHByb21pc2VkXHJcbiAqIG9iamVjdCBpbiBhIGZ1dHVyZSB0dXJuLlxyXG4gKiBAcGFyYW0gb2JqZWN0ICAgIHByb21pc2Ugb3IgaW1tZWRpYXRlIHJlZmVyZW5jZSBmb3IgdGFyZ2V0IG9iamVjdFxyXG4gKiBAcmV0dXJuIHByb21pc2UgZm9yIHRoZSBrZXlzIG9mIHRoZSBldmVudHVhbGx5IHNldHRsZWQgb2JqZWN0XHJcbiAqL1xyXG5RLmtleXMgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLmRpc3BhdGNoKFwia2V5c1wiLCBbXSk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2goXCJrZXlzXCIsIFtdKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUdXJucyBhbiBhcnJheSBvZiBwcm9taXNlcyBpbnRvIGEgcHJvbWlzZSBmb3IgYW4gYXJyYXkuICBJZiBhbnkgb2ZcclxuICogdGhlIHByb21pc2VzIGdldHMgcmVqZWN0ZWQsIHRoZSB3aG9sZSBhcnJheSBpcyByZWplY3RlZCBpbW1lZGlhdGVseS5cclxuICogQHBhcmFtIHtBcnJheSp9IGFuIGFycmF5IChvciBwcm9taXNlIGZvciBhbiBhcnJheSkgb2YgdmFsdWVzIChvclxyXG4gKiBwcm9taXNlcyBmb3IgdmFsdWVzKVxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlc1xyXG4gKi9cclxuLy8gQnkgTWFyayBNaWxsZXJcclxuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9c3RyYXdtYW46Y29uY3VycmVuY3kmcmV2PTEzMDg3NzY1MjEjYWxsZnVsZmlsbGVkXHJcblEuYWxsID0gYWxsO1xyXG5mdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcclxuICAgIHJldHVybiB3aGVuKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZXMpIHtcclxuICAgICAgICB2YXIgY291bnREb3duID0gMDtcclxuICAgICAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgICAgIGFycmF5X3JlZHVjZShwcm9taXNlcywgZnVuY3Rpb24gKHVuZGVmaW5lZCwgcHJvbWlzZSwgaW5kZXgpIHtcclxuICAgICAgICAgICAgdmFyIHNuYXBzaG90O1xyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICBpc1Byb21pc2UocHJvbWlzZSkgJiZcclxuICAgICAgICAgICAgICAgIChzbmFwc2hvdCA9IHByb21pc2UuaW5zcGVjdCgpKS5zdGF0ZSA9PT0gXCJmdWxmaWxsZWRcIlxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIHByb21pc2VzW2luZGV4XSA9IHNuYXBzaG90LnZhbHVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgKytjb3VudERvd247XHJcbiAgICAgICAgICAgICAgICB3aGVuKFxyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2VzW2luZGV4XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1jb3VudERvd24gPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocHJvbWlzZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKHByb2dyZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLm5vdGlmeSh7IGluZGV4OiBpbmRleCwgdmFsdWU6IHByb2dyZXNzIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LCB2b2lkIDApO1xyXG4gICAgICAgIGlmIChjb3VudERvd24gPT09IDApIHtcclxuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShwcm9taXNlcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfSk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLmFsbCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBhbGwodGhpcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogV2FpdHMgZm9yIGFsbCBwcm9taXNlcyB0byBiZSBzZXR0bGVkLCBlaXRoZXIgZnVsZmlsbGVkIG9yXHJcbiAqIHJlamVjdGVkLiAgVGhpcyBpcyBkaXN0aW5jdCBmcm9tIGBhbGxgIHNpbmNlIHRoYXQgd291bGQgc3RvcFxyXG4gKiB3YWl0aW5nIGF0IHRoZSBmaXJzdCByZWplY3Rpb24uICBUaGUgcHJvbWlzZSByZXR1cm5lZCBieVxyXG4gKiBgYWxsUmVzb2x2ZWRgIHdpbGwgbmV2ZXIgYmUgcmVqZWN0ZWQuXHJcbiAqIEBwYXJhbSBwcm9taXNlcyBhIHByb21pc2UgZm9yIGFuIGFycmF5IChvciBhbiBhcnJheSkgb2YgcHJvbWlzZXNcclxuICogKG9yIHZhbHVlcylcclxuICogQHJldHVybiBhIHByb21pc2UgZm9yIGFuIGFycmF5IG9mIHByb21pc2VzXHJcbiAqL1xyXG5RLmFsbFJlc29sdmVkID0gZGVwcmVjYXRlKGFsbFJlc29sdmVkLCBcImFsbFJlc29sdmVkXCIsIFwiYWxsU2V0dGxlZFwiKTtcclxuZnVuY3Rpb24gYWxsUmVzb2x2ZWQocHJvbWlzZXMpIHtcclxuICAgIHJldHVybiB3aGVuKHByb21pc2VzLCBmdW5jdGlvbiAocHJvbWlzZXMpIHtcclxuICAgICAgICBwcm9taXNlcyA9IGFycmF5X21hcChwcm9taXNlcywgUSk7XHJcbiAgICAgICAgcmV0dXJuIHdoZW4oYWxsKGFycmF5X21hcChwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHdoZW4ocHJvbWlzZSwgbm9vcCwgbm9vcCk7XHJcbiAgICAgICAgfSkpLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9taXNlcztcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5hbGxSZXNvbHZlZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBhbGxSZXNvbHZlZCh0aGlzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAc2VlIFByb21pc2UjYWxsU2V0dGxlZFxyXG4gKi9cclxuUS5hbGxTZXR0bGVkID0gYWxsU2V0dGxlZDtcclxuZnVuY3Rpb24gYWxsU2V0dGxlZChwcm9taXNlcykge1xyXG4gICAgcmV0dXJuIFEocHJvbWlzZXMpLmFsbFNldHRsZWQoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFR1cm5zIGFuIGFycmF5IG9mIHByb21pc2VzIGludG8gYSBwcm9taXNlIGZvciBhbiBhcnJheSBvZiB0aGVpciBzdGF0ZXMgKGFzXHJcbiAqIHJldHVybmVkIGJ5IGBpbnNwZWN0YCkgd2hlbiB0aGV5IGhhdmUgYWxsIHNldHRsZWQuXHJcbiAqIEBwYXJhbSB7QXJyYXlbQW55Kl19IHZhbHVlcyBhbiBhcnJheSAob3IgcHJvbWlzZSBmb3IgYW4gYXJyYXkpIG9mIHZhbHVlcyAob3JcclxuICogcHJvbWlzZXMgZm9yIHZhbHVlcylcclxuICogQHJldHVybnMge0FycmF5W1N0YXRlXX0gYW4gYXJyYXkgb2Ygc3RhdGVzIGZvciB0aGUgcmVzcGVjdGl2ZSB2YWx1ZXMuXHJcbiAqL1xyXG5Qcm9taXNlLnByb3RvdHlwZS5hbGxTZXR0bGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAocHJvbWlzZXMpIHtcclxuICAgICAgICByZXR1cm4gYWxsKGFycmF5X21hcChwcm9taXNlcywgZnVuY3Rpb24gKHByb21pc2UpIHtcclxuICAgICAgICAgICAgcHJvbWlzZSA9IFEocHJvbWlzZSk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlZ2FyZGxlc3MoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZS5pbnNwZWN0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHByb21pc2UudGhlbihyZWdhcmRsZXNzLCByZWdhcmRsZXNzKTtcclxuICAgICAgICB9KSk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYXB0dXJlcyB0aGUgZmFpbHVyZSBvZiBhIHByb21pc2UsIGdpdmluZyBhbiBvcG9ydHVuaXR5IHRvIHJlY292ZXJcclxuICogd2l0aCBhIGNhbGxiYWNrLiAgSWYgdGhlIGdpdmVuIHByb21pc2UgaXMgZnVsZmlsbGVkLCB0aGUgcmV0dXJuZWRcclxuICogcHJvbWlzZSBpcyBmdWxmaWxsZWQuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBmb3Igc29tZXRoaW5nXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHRvIGZ1bGZpbGwgdGhlIHJldHVybmVkIHByb21pc2UgaWYgdGhlXHJcbiAqIGdpdmVuIHByb21pc2UgaXMgcmVqZWN0ZWRcclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBjYWxsYmFja1xyXG4gKi9cclxuUS5mYWlsID0gLy8gWFhYIGxlZ2FjeVxyXG5RW1wiY2F0Y2hcIl0gPSBmdW5jdGlvbiAob2JqZWN0LCByZWplY3RlZCkge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS50aGVuKHZvaWQgMCwgcmVqZWN0ZWQpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUuZmFpbCA9IC8vIFhYWCBsZWdhY3lcclxuUHJvbWlzZS5wcm90b3R5cGVbXCJjYXRjaFwiXSA9IGZ1bmN0aW9uIChyZWplY3RlZCkge1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbih2b2lkIDAsIHJlamVjdGVkKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBdHRhY2hlcyBhIGxpc3RlbmVyIHRoYXQgY2FuIHJlc3BvbmQgdG8gcHJvZ3Jlc3Mgbm90aWZpY2F0aW9ucyBmcm9tIGFcclxuICogcHJvbWlzZSdzIG9yaWdpbmF0aW5nIGRlZmVycmVkLiBUaGlzIGxpc3RlbmVyIHJlY2VpdmVzIHRoZSBleGFjdCBhcmd1bWVudHNcclxuICogcGFzc2VkIHRvIGBgZGVmZXJyZWQubm90aWZ5YGAuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBmb3Igc29tZXRoaW5nXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIHRvIHJlY2VpdmUgYW55IHByb2dyZXNzIG5vdGlmaWNhdGlvbnNcclxuICogQHJldHVybnMgdGhlIGdpdmVuIHByb21pc2UsIHVuY2hhbmdlZFxyXG4gKi9cclxuUS5wcm9ncmVzcyA9IHByb2dyZXNzO1xyXG5mdW5jdGlvbiBwcm9ncmVzcyhvYmplY3QsIHByb2dyZXNzZWQpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkudGhlbih2b2lkIDAsIHZvaWQgMCwgcHJvZ3Jlc3NlZCk7XHJcbn1cclxuXHJcblByb21pc2UucHJvdG90eXBlLnByb2dyZXNzID0gZnVuY3Rpb24gKHByb2dyZXNzZWQpIHtcclxuICAgIHJldHVybiB0aGlzLnRoZW4odm9pZCAwLCB2b2lkIDAsIHByb2dyZXNzZWQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFByb3ZpZGVzIGFuIG9wcG9ydHVuaXR5IHRvIG9ic2VydmUgdGhlIHNldHRsaW5nIG9mIGEgcHJvbWlzZSxcclxuICogcmVnYXJkbGVzcyBvZiB3aGV0aGVyIHRoZSBwcm9taXNlIGlzIGZ1bGZpbGxlZCBvciByZWplY3RlZC4gIEZvcndhcmRzXHJcbiAqIHRoZSByZXNvbHV0aW9uIHRvIHRoZSByZXR1cm5lZCBwcm9taXNlIHdoZW4gdGhlIGNhbGxiYWNrIGlzIGRvbmUuXHJcbiAqIFRoZSBjYWxsYmFjayBjYW4gcmV0dXJuIGEgcHJvbWlzZSB0byBkZWZlciBjb21wbGV0aW9uLlxyXG4gKiBAcGFyYW0ge0FueSp9IHByb21pc2VcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgdG8gb2JzZXJ2ZSB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgZ2l2ZW5cclxuICogcHJvbWlzZSwgdGFrZXMgbm8gYXJndW1lbnRzLlxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlIHdoZW5cclxuICogYGBmaW5gYCBpcyBkb25lLlxyXG4gKi9cclxuUS5maW4gPSAvLyBYWFggbGVnYWN5XHJcblFbXCJmaW5hbGx5XCJdID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcclxuICAgIHJldHVybiBRKG9iamVjdClbXCJmaW5hbGx5XCJdKGNhbGxiYWNrKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLmZpbiA9IC8vIFhYWCBsZWdhY3lcclxuUHJvbWlzZS5wcm90b3R5cGVbXCJmaW5hbGx5XCJdID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICBjYWxsYmFjayA9IFEoY2FsbGJhY2spO1xyXG4gICAgcmV0dXJuIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gY2FsbGJhY2suZmNhbGwoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xyXG4gICAgICAgIC8vIFRPRE8gYXR0ZW1wdCB0byByZWN5Y2xlIHRoZSByZWplY3Rpb24gd2l0aCBcInRoaXNcIi5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2suZmNhbGwoKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhyb3cgcmVhc29uO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogVGVybWluYXRlcyBhIGNoYWluIG9mIHByb21pc2VzLCBmb3JjaW5nIHJlamVjdGlvbnMgdG8gYmVcclxuICogdGhyb3duIGFzIGV4Y2VwdGlvbnMuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZSBhdCB0aGUgZW5kIG9mIGEgY2hhaW4gb2YgcHJvbWlzZXNcclxuICogQHJldHVybnMgbm90aGluZ1xyXG4gKi9cclxuUS5kb25lID0gZnVuY3Rpb24gKG9iamVjdCwgZnVsZmlsbGVkLCByZWplY3RlZCwgcHJvZ3Jlc3MpIHtcclxuICAgIHJldHVybiBRKG9iamVjdCkuZG9uZShmdWxmaWxsZWQsIHJlamVjdGVkLCBwcm9ncmVzcyk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5kb25lID0gZnVuY3Rpb24gKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKSB7XHJcbiAgICB2YXIgb25VbmhhbmRsZWRFcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgIC8vIGZvcndhcmQgdG8gYSBmdXR1cmUgdHVybiBzbyB0aGF0IGBgd2hlbmBgXHJcbiAgICAgICAgLy8gZG9lcyBub3QgY2F0Y2ggaXQgYW5kIHR1cm4gaXQgaW50byBhIHJlamVjdGlvbi5cclxuICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIG1ha2VTdGFja1RyYWNlTG9uZyhlcnJvciwgcHJvbWlzZSk7XHJcbiAgICAgICAgICAgIGlmIChRLm9uZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIFEub25lcnJvcihlcnJvcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBdm9pZCB1bm5lY2Vzc2FyeSBgbmV4dFRpY2tgaW5nIHZpYSBhbiB1bm5lY2Vzc2FyeSBgd2hlbmAuXHJcbiAgICB2YXIgcHJvbWlzZSA9IGZ1bGZpbGxlZCB8fCByZWplY3RlZCB8fCBwcm9ncmVzcyA/XHJcbiAgICAgICAgdGhpcy50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQsIHByb2dyZXNzKSA6XHJcbiAgICAgICAgdGhpcztcclxuXHJcbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgcHJvY2VzcyAmJiBwcm9jZXNzLmRvbWFpbikge1xyXG4gICAgICAgIG9uVW5oYW5kbGVkRXJyb3IgPSBwcm9jZXNzLmRvbWFpbi5iaW5kKG9uVW5oYW5kbGVkRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHByb21pc2UudGhlbih2b2lkIDAsIG9uVW5oYW5kbGVkRXJyb3IpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhdXNlcyBhIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQgaWYgaXQgZG9lcyBub3QgZ2V0IGZ1bGZpbGxlZCBiZWZvcmVcclxuICogc29tZSBtaWxsaXNlY29uZHMgdGltZSBvdXQuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbWlsbGlzZWNvbmRzIHRpbWVvdXRcclxuICogQHBhcmFtIHtBbnkqfSBjdXN0b20gZXJyb3IgbWVzc2FnZSBvciBFcnJvciBvYmplY3QgKG9wdGlvbmFsKVxyXG4gKiBAcmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSByZXNvbHV0aW9uIG9mIHRoZSBnaXZlbiBwcm9taXNlIGlmIGl0IGlzXHJcbiAqIGZ1bGZpbGxlZCBiZWZvcmUgdGhlIHRpbWVvdXQsIG90aGVyd2lzZSByZWplY3RlZC5cclxuICovXHJcblEudGltZW91dCA9IGZ1bmN0aW9uIChvYmplY3QsIG1zLCBlcnJvcikge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS50aW1lb3V0KG1zLCBlcnJvcik7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24gKG1zLCBlcnJvcikge1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIHZhciB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoIWVycm9yIHx8IFwic3RyaW5nXCIgPT09IHR5cGVvZiBlcnJvcikge1xyXG4gICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihlcnJvciB8fCBcIlRpbWVkIG91dCBhZnRlciBcIiArIG1zICsgXCIgbXNcIik7XHJcbiAgICAgICAgICAgIGVycm9yLmNvZGUgPSBcIkVUSU1FRE9VVFwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyb3IpO1xyXG4gICAgfSwgbXMpO1xyXG5cclxuICAgIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHZhbHVlKTtcclxuICAgIH0sIGZ1bmN0aW9uIChleGNlcHRpb24pIHtcclxuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXhjZXB0aW9uKTtcclxuICAgIH0sIGRlZmVycmVkLm5vdGlmeSk7XHJcblxyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJucyBhIHByb21pc2UgZm9yIHRoZSBnaXZlbiB2YWx1ZSAob3IgcHJvbWlzZWQgdmFsdWUpLCBzb21lXHJcbiAqIG1pbGxpc2Vjb25kcyBhZnRlciBpdCByZXNvbHZlZC4gUGFzc2VzIHJlamVjdGlvbnMgaW1tZWRpYXRlbHkuXHJcbiAqIEBwYXJhbSB7QW55Kn0gcHJvbWlzZVxyXG4gKiBAcGFyYW0ge051bWJlcn0gbWlsbGlzZWNvbmRzXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UgYWZ0ZXIgbWlsbGlzZWNvbmRzXHJcbiAqIHRpbWUgaGFzIGVsYXBzZWQgc2luY2UgdGhlIHJlc29sdXRpb24gb2YgdGhlIGdpdmVuIHByb21pc2UuXHJcbiAqIElmIHRoZSBnaXZlbiBwcm9taXNlIHJlamVjdHMsIHRoYXQgaXMgcGFzc2VkIGltbWVkaWF0ZWx5LlxyXG4gKi9cclxuUS5kZWxheSA9IGZ1bmN0aW9uIChvYmplY3QsIHRpbWVvdXQpIHtcclxuICAgIGlmICh0aW1lb3V0ID09PSB2b2lkIDApIHtcclxuICAgICAgICB0aW1lb3V0ID0gb2JqZWN0O1xyXG4gICAgICAgIG9iamVjdCA9IHZvaWQgMDtcclxuICAgIH1cclxuICAgIHJldHVybiBRKG9iamVjdCkuZGVsYXkodGltZW91dCk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5kZWxheSA9IGZ1bmN0aW9uICh0aW1lb3V0KSB7XHJcbiAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUodmFsdWUpO1xyXG4gICAgICAgIH0sIHRpbWVvdXQpO1xyXG4gICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG4vKipcclxuICogUGFzc2VzIGEgY29udGludWF0aW9uIHRvIGEgTm9kZSBmdW5jdGlvbiwgd2hpY2ggaXMgY2FsbGVkIHdpdGggdGhlIGdpdmVuXHJcbiAqIGFyZ3VtZW50cyBwcm92aWRlZCBhcyBhbiBhcnJheSwgYW5kIHJldHVybnMgYSBwcm9taXNlLlxyXG4gKlxyXG4gKiAgICAgIFEubmZhcHBseShGUy5yZWFkRmlsZSwgW19fZmlsZW5hbWVdKVxyXG4gKiAgICAgIC50aGVuKGZ1bmN0aW9uIChjb250ZW50KSB7XHJcbiAqICAgICAgfSlcclxuICpcclxuICovXHJcblEubmZhcHBseSA9IGZ1bmN0aW9uIChjYWxsYmFjaywgYXJncykge1xyXG4gICAgcmV0dXJuIFEoY2FsbGJhY2spLm5mYXBwbHkoYXJncyk7XHJcbn07XHJcblxyXG5Qcm9taXNlLnByb3RvdHlwZS5uZmFwcGx5ID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICB2YXIgbm9kZUFyZ3MgPSBhcnJheV9zbGljZShhcmdzKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIHRoaXMuZmFwcGx5KG5vZGVBcmdzKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQYXNzZXMgYSBjb250aW51YXRpb24gdG8gYSBOb2RlIGZ1bmN0aW9uLCB3aGljaCBpcyBjYWxsZWQgd2l0aCB0aGUgZ2l2ZW5cclxuICogYXJndW1lbnRzIHByb3ZpZGVkIGluZGl2aWR1YWxseSwgYW5kIHJldHVybnMgYSBwcm9taXNlLlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBRLm5mY2FsbChGUy5yZWFkRmlsZSwgX19maWxlbmFtZSlcclxuICogLnRoZW4oZnVuY3Rpb24gKGNvbnRlbnQpIHtcclxuICogfSlcclxuICpcclxuICovXHJcblEubmZjYWxsID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XHJcbiAgICByZXR1cm4gUShjYWxsYmFjaykubmZhcHBseShhcmdzKTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5mY2FsbCA9IGZ1bmN0aW9uICgvKi4uLmFyZ3MqLykge1xyXG4gICAgdmFyIG5vZGVBcmdzID0gYXJyYXlfc2xpY2UoYXJndW1lbnRzKTtcclxuICAgIHZhciBkZWZlcnJlZCA9IGRlZmVyKCk7XHJcbiAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICB0aGlzLmZhcHBseShub2RlQXJncykuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JhcHMgYSBOb2RlSlMgY29udGludWF0aW9uIHBhc3NpbmcgZnVuY3Rpb24gYW5kIHJldHVybnMgYW4gZXF1aXZhbGVudFxyXG4gKiB2ZXJzaW9uIHRoYXQgcmV0dXJucyBhIHByb21pc2UuXHJcbiAqIEBleGFtcGxlXHJcbiAqIFEubmZiaW5kKEZTLnJlYWRGaWxlLCBfX2ZpbGVuYW1lKShcInV0Zi04XCIpXHJcbiAqIC50aGVuKGNvbnNvbGUubG9nKVxyXG4gKiAuZG9uZSgpXHJcbiAqL1xyXG5RLm5mYmluZCA9XHJcblEuZGVub2RlaWZ5ID0gZnVuY3Rpb24gKGNhbGxiYWNrIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYmFzZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDEpO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgbm9kZUFyZ3MgPSBiYXNlQXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSk7XHJcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICAgICAgUShjYWxsYmFjaykuZmFwcGx5KG5vZGVBcmdzKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICB9O1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubmZiaW5kID1cclxuUHJvbWlzZS5wcm90b3R5cGUuZGVub2RlaWZ5ID0gZnVuY3Rpb24gKC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cyk7XHJcbiAgICBhcmdzLnVuc2hpZnQodGhpcyk7XHJcbiAgICByZXR1cm4gUS5kZW5vZGVpZnkuYXBwbHkodm9pZCAwLCBhcmdzKTtcclxufTtcclxuXHJcblEubmJpbmQgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNwIC8qLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYmFzZUFyZ3MgPSBhcnJheV9zbGljZShhcmd1bWVudHMsIDIpO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgbm9kZUFyZ3MgPSBiYXNlQXJncy5jb25jYXQoYXJyYXlfc2xpY2UoYXJndW1lbnRzKSk7XHJcbiAgICAgICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgICAgICBub2RlQXJncy5wdXNoKGRlZmVycmVkLm1ha2VOb2RlUmVzb2x2ZXIoKSk7XHJcbiAgICAgICAgZnVuY3Rpb24gYm91bmQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseSh0aGlzcCwgYXJndW1lbnRzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgUShib3VuZCkuZmFwcGx5KG5vZGVBcmdzKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbiAgICB9O1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubmJpbmQgPSBmdW5jdGlvbiAoLyp0aGlzcCwgLi4uYXJncyovKSB7XHJcbiAgICB2YXIgYXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMCk7XHJcbiAgICBhcmdzLnVuc2hpZnQodGhpcyk7XHJcbiAgICByZXR1cm4gUS5uYmluZC5hcHBseSh2b2lkIDAsIGFyZ3MpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGxzIGEgbWV0aG9kIG9mIGEgTm9kZS1zdHlsZSBvYmplY3QgdGhhdCBhY2NlcHRzIGEgTm9kZS1zdHlsZVxyXG4gKiBjYWxsYmFjayB3aXRoIGEgZ2l2ZW4gYXJyYXkgb2YgYXJndW1lbnRzLCBwbHVzIGEgcHJvdmlkZWQgY2FsbGJhY2suXHJcbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgbWV0aG9kIG9mIG9iamVjdFxyXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSBtZXRob2Q7IHRoZSBjYWxsYmFja1xyXG4gKiB3aWxsIGJlIHByb3ZpZGVkIGJ5IFEgYW5kIGFwcGVuZGVkIHRvIHRoZXNlIGFyZ3VtZW50cy5cclxuICogQHJldHVybnMgYSBwcm9taXNlIGZvciB0aGUgdmFsdWUgb3IgZXJyb3JcclxuICovXHJcblEubm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblEubnBvc3QgPSBmdW5jdGlvbiAob2JqZWN0LCBuYW1lLCBhcmdzKSB7XHJcbiAgICByZXR1cm4gUShvYmplY3QpLm5wb3N0KG5hbWUsIGFyZ3MpO1xyXG59O1xyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubm1hcHBseSA9IC8vIFhYWCBBcyBwcm9wb3NlZCBieSBcIlJlZHNhbmRyb1wiXHJcblByb21pc2UucHJvdG90eXBlLm5wb3N0ID0gZnVuY3Rpb24gKG5hbWUsIGFyZ3MpIHtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3MgfHwgW10pO1xyXG4gICAgdmFyIGRlZmVycmVkID0gZGVmZXIoKTtcclxuICAgIG5vZGVBcmdzLnB1c2goZGVmZXJyZWQubWFrZU5vZGVSZXNvbHZlcigpKTtcclxuICAgIHRoaXMuZGlzcGF0Y2goXCJwb3N0XCIsIFtuYW1lLCBub2RlQXJnc10pLmZhaWwoZGVmZXJyZWQucmVqZWN0KTtcclxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGxzIGEgbWV0aG9kIG9mIGEgTm9kZS1zdHlsZSBvYmplY3QgdGhhdCBhY2NlcHRzIGEgTm9kZS1zdHlsZVxyXG4gKiBjYWxsYmFjaywgZm9yd2FyZGluZyB0aGUgZ2l2ZW4gdmFyaWFkaWMgYXJndW1lbnRzLCBwbHVzIGEgcHJvdmlkZWRcclxuICogY2FsbGJhY2sgYXJndW1lbnQuXHJcbiAqIEBwYXJhbSBvYmplY3QgYW4gb2JqZWN0IHRoYXQgaGFzIHRoZSBuYW1lZCBtZXRob2RcclxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgbWV0aG9kIG9mIG9iamVjdFxyXG4gKiBAcGFyYW0gLi4uYXJncyBhcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kOyB0aGUgY2FsbGJhY2sgd2lsbFxyXG4gKiBiZSBwcm92aWRlZCBieSBRIGFuZCBhcHBlbmRlZCB0byB0aGVzZSBhcmd1bWVudHMuXHJcbiAqIEByZXR1cm5zIGEgcHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9yIGVycm9yXHJcbiAqL1xyXG5RLm5zZW5kID0gLy8gWFhYIEJhc2VkIG9uIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgXCJzZW5kXCJcclxuUS5ubWNhbGwgPSAvLyBYWFggQmFzZWQgb24gXCJSZWRzYW5kcm8nc1wiIHByb3Bvc2FsXHJcblEubmludm9rZSA9IGZ1bmN0aW9uIChvYmplY3QsIG5hbWUgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMik7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgUShvYmplY3QpLmRpc3BhdGNoKFwicG9zdFwiLCBbbmFtZSwgbm9kZUFyZ3NdKS5mYWlsKGRlZmVycmVkLnJlamVjdCk7XHJcbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcclxufTtcclxuXHJcblByb21pc2UucHJvdG90eXBlLm5zZW5kID0gLy8gWFhYIEJhc2VkIG9uIE1hcmsgTWlsbGVyJ3MgcHJvcG9zZWQgXCJzZW5kXCJcclxuUHJvbWlzZS5wcm90b3R5cGUubm1jYWxsID0gLy8gWFhYIEJhc2VkIG9uIFwiUmVkc2FuZHJvJ3NcIiBwcm9wb3NhbFxyXG5Qcm9taXNlLnByb3RvdHlwZS5uaW52b2tlID0gZnVuY3Rpb24gKG5hbWUgLyouLi5hcmdzKi8pIHtcclxuICAgIHZhciBub2RlQXJncyA9IGFycmF5X3NsaWNlKGFyZ3VtZW50cywgMSk7XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBkZWZlcigpO1xyXG4gICAgbm9kZUFyZ3MucHVzaChkZWZlcnJlZC5tYWtlTm9kZVJlc29sdmVyKCkpO1xyXG4gICAgdGhpcy5kaXNwYXRjaChcInBvc3RcIiwgW25hbWUsIG5vZGVBcmdzXSkuZmFpbChkZWZlcnJlZC5yZWplY3QpO1xyXG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcbn07XHJcblxyXG4vKipcclxuICogSWYgYSBmdW5jdGlvbiB3b3VsZCBsaWtlIHRvIHN1cHBvcnQgYm90aCBOb2RlIGNvbnRpbnVhdGlvbi1wYXNzaW5nLXN0eWxlIGFuZFxyXG4gKiBwcm9taXNlLXJldHVybmluZy1zdHlsZSwgaXQgY2FuIGVuZCBpdHMgaW50ZXJuYWwgcHJvbWlzZSBjaGFpbiB3aXRoXHJcbiAqIGBub2RlaWZ5KG5vZGViYWNrKWAsIGZvcndhcmRpbmcgdGhlIG9wdGlvbmFsIG5vZGViYWNrIGFyZ3VtZW50LiAgSWYgdGhlIHVzZXJcclxuICogZWxlY3RzIHRvIHVzZSBhIG5vZGViYWNrLCB0aGUgcmVzdWx0IHdpbGwgYmUgc2VudCB0aGVyZS4gIElmIHRoZXkgZG8gbm90XHJcbiAqIHBhc3MgYSBub2RlYmFjaywgdGhleSB3aWxsIHJlY2VpdmUgdGhlIHJlc3VsdCBwcm9taXNlLlxyXG4gKiBAcGFyYW0gb2JqZWN0IGEgcmVzdWx0IChvciBhIHByb21pc2UgZm9yIGEgcmVzdWx0KVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBub2RlYmFjayBhIE5vZGUuanMtc3R5bGUgY2FsbGJhY2tcclxuICogQHJldHVybnMgZWl0aGVyIHRoZSBwcm9taXNlIG9yIG5vdGhpbmdcclxuICovXHJcblEubm9kZWlmeSA9IG5vZGVpZnk7XHJcbmZ1bmN0aW9uIG5vZGVpZnkob2JqZWN0LCBub2RlYmFjaykge1xyXG4gICAgcmV0dXJuIFEob2JqZWN0KS5ub2RlaWZ5KG5vZGViYWNrKTtcclxufVxyXG5cclxuUHJvbWlzZS5wcm90b3R5cGUubm9kZWlmeSA9IGZ1bmN0aW9uIChub2RlYmFjaykge1xyXG4gICAgaWYgKG5vZGViYWNrKSB7XHJcbiAgICAgICAgdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlYmFjayhudWxsLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICBuZXh0VGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlYmFjayhlcnJvcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufTtcclxuXHJcbi8vIEFsbCBjb2RlIGJlZm9yZSB0aGlzIHBvaW50IHdpbGwgYmUgZmlsdGVyZWQgZnJvbSBzdGFjayB0cmFjZXMuXHJcbnZhciBxRW5kaW5nTGluZSA9IGNhcHR1cmVMaW5lKCk7XHJcblxyXG5yZXR1cm4gUTtcclxuXHJcbn0pO1xyXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiWmJpN2diXCIpKSIsIi8qIGdsb2JhbCBleHBvcnRzOiB0cnVlICovXHJcbnZhciBlcnJvcnMgPSByZXF1aXJlKCAnLi4vZXJyb3JzJyApO1xyXG5cclxuLyoqXHJcbiAqXHJcbiAqIEBtb2R1bGUgICAgICAgIHNlbmRSZXF1ZXN0XHJcbiAqXHJcbiAqIEBkZXNjcmlwdGlvbiAgIFRoaXMgZnVuY3Rpb24gcHJvdmlkZXMgdGhlIGxvd2VzdC1sZXZlbCBpbnRlcmZhY2UgdG8gdGhlIFhIUiBmdW5jdGlvbmFsaXR5IHRoYXRcclxuICogICAgICAgICAgICAgICAgdGhlIEJyaWRnZSBDbGllbnQgaXMgb3BlcmF0aW5nIG9uIHRvcCBvZi4gVGhpcyBmdW5jdGlvbiBpcyByZXNwb25zaWJsZSBvbmx5IGZvclxyXG4gKiAgICAgICAgICAgICAgICBpc3N1aW5nIGEgcmVxdWVzdCBhbmQgcmV0dXJuaW5nIGEgUSBwcm9taXNlIGFuZCBob29raW5nIHVwIHRoZSByZXNvbHZlKCkgYW5kXHJcbiAqICAgICAgICAgICAgICAgIHJlamVjdCgpIG1ldGhvZHMgdG8gdGhlIHJlc3VsdHMgb2YgdGhlIFhIUiByZXF1ZXN0LlxyXG4gKiAgICAgICAgICAgICAgICBUaGlzIGZ1bmN0aW9uIGNhbiBiZSBvdmVycmlkZGVuIHRvIHVzZSBzb21lIG90aGVyIHNlcnZpY2UgdGhhbiBYbWxIdHRwUmVxdWVzdHNcclxuICogICAgICAgICAgICAgICAgYnkgdGhlIGVuZC1kZXZlbG9wZXIuIElmIHlvdSBwbGFuIHRvIGRvIHRoaXMsIHdlIGFkdmljZSB0aGF0IHlvdSBtYWtlIGEgcGx1Z2luXHJcbiAqICAgICAgICAgICAgICAgIGZvciB0aGUgQnJpZGdlIENsaWVudCB0byBmb3JtYWxpemUgeW91ciBzcGVjaWFsaXplZCBiZWhhdmlvdXIuIEVuc3VyZSB0aGF0IHRoZVxyXG4gKiAgICAgICAgICAgICAgICBvdmVycmlkaW5nIGZ1bmN0aW9uIGFkaGVyZWQgdG8gdGhlIHNhbWUgc2lnbmF0dXJlIGFuZCByZXR1cm5zIGEgUSBwcm9taXNlLlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7RGVmZXJyZWR9IGRlZmVycmVkICAgQSBRIGRlZmVycmVkIG9iamVjdCB0aGF0IHRoZSBlbmQtZGV2ZWxvcGVyIG11c3QgdXNlIHRvXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlaXRoZXIgcmVzb2x2ZSBvciByZWplY3QgaW4gcmVzcG9uc2UgdG8gdGhlIHJlcXVlc3QgZWl0aGVyXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmYWlsaW5nIG9yIGNvbXBsZXRpbmcgc3VjY2Vzc2Z1bGx5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7U3RyaW5nfSBtZXRob2QgICAgICAgVGhlIEhUVFAgdmVyYi9hY3Rpb24gdG8gdXNlIGZvciB0aGUgcmVxdWVzdC5cclxuICpcclxuICogQHBhcmFtICAgICAgICAge1N0cmluZ30gdXJsICAgICAgICAgIFRoZSBleGFjdCBVUkwgb2YgdGhlIHJlc291cmNlIHRvIHF1ZXJ5LlxyXG4gKlxyXG4gKiBAcGFyYW0gICAgICAgICB7T2JqZWN0fSBkYXRhICAgICAgICAgVGhlIGRhdGEgb2JqZWN0IHRvIHNlbmQgd2l0aCB0aGUgcmVxdWVzdC4gVGhpcyBjYW4gYmUgdXNlZFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZGVzY3JpYmUgcXVlcnkgYXJndW1lbnRzIHN1Y2ggYXMgZmlsdGVycyBhbmQgb3JkZXJpbmcsXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciB0byBjb250YWluIGRhdGEgdG8gYmUgc3RvcmVkIGluIHRoZSBCcmlkZ2UgZGF0YWJhc2UuXHJcbiAqXHJcbiAqIEByZXR1cm5zICAgICAgIHtQcm9taXNlfSAgICAgICAgICAgICBBIHEuanMgcHJvbWlzZSBvYmplY3QuXHJcbiAqXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNlbmRSZXF1ZXN0KCBkZWZlcnJlZCwgbWV0aG9kLCB1cmwsIGRhdGEgKSB7XHJcblxyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG5cclxuICB4aHIub3BlbiggbWV0aG9kLnRvVXBwZXJDYXNlKCksIHVybCwgdHJ1ZSApO1xyXG4gIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCAnQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nICk7XHJcbiAgeGhyLnNldFJlcXVlc3RIZWFkZXIoICdCcmlkZ2UnLCBKU09OLnN0cmluZ2lmeSggZGF0YSApICk7XHJcblxyXG4gIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoIHhoci5yZWFkeVN0YXRlID09PSA0ICkge1xyXG4gICAgICB0cnkge1xyXG5cclxuICAgICAgICAvLyBBdHRlbXB0IHRvIHBhcnNlIHRoZSByZXNwb25zZSBhcyBKU09OLlxyXG4gICAgICAgIHZhciBkYXRhID0gSlNPTi5wYXJzZSggeGhyLnJlc3BvbnNlVGV4dCApO1xyXG5cclxuICAgICAgICAvLyBJZiB0aGUgY29udGVudCBwcm9wZXJ0eSBpcyBtaXNzaW5nIGZyb20gdGhlIHJlc3BvbnNlLCB0aGUgcmVzcG9uc2UgaXMgbWFsZm9ybWVkLiBSZWplY3RcclxuICAgICAgICAvLyB0aGUgcmVxdWVzdCB3aXRoIGEgbmV3IGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHRoYXQgdGhlIHJlc3BvbnNlIGlzIG1hbGZvcm1lZC5cclxuICAgICAgICBpZiAoICFkYXRhLmNvbnRlbnQgKSB7XHJcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSWYgYW4gZXJyb3Igc3RhdHVzIGlzIHJlcG9ydGVkLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2UncyBlcnJvciBvYmplY3QuXHJcbiAgICAgICAgaWYgKCB4aHIuc3RhdHVzID49IDQwMCApIHtcclxuICAgICAgICAgIGRlZmVycmVkLnJlamVjdCggZGF0YS5jb250ZW50ICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBPdGhlcndpc2UsIHJlc29sdmUgdGhlIHJlcXVlc3Qgd2l0aCB0aGUgcmVzcG9uc2Ugb2JqZWN0LlxyXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUoIGRhdGEuY29udGVudCApO1xyXG5cclxuICAgICAgfVxyXG4gICAgICBjYXRjaCAoIGUgKSB7XHJcblxyXG4gICAgICAgIC8vIElmIHRoZSByZXNwb25zZSBjYW4ndCBiZSBwYXJzZWQgYXMgSlNPTiwgcmVqZWN0IHRoZSByZXF1ZXN0IHdpdGggYSBuZXcgZXJyb3Igb2JqZWN0IHRoYXRcclxuICAgICAgICAvLyBkZXNjcmliZXMgdGhlIHJlc3BvbnNlIGFzIG1hbGZvcm1lZC5cclxuICAgICAgICBkZWZlcnJlZC5yZWplY3QoIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5NQUxGT1JNRURfUkVTUE9OU0UgKSApO1xyXG5cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIC8vIElmIHRoZSByZXF1ZXN0IGZhaWxlZCBkdWUgdG8gYSBuZXR3b3JrIGVycm9yLCByZWplY3QgdGhlIHJlcXVlc3Qgd2l0aCBhIG5ldyBlcnJvciBvYmplY3QgdGhhdFxyXG4gICAgLy8gZGVzY3JpYmVzIHRoYXQgdGhlIGZhaWx1cmUgd2FzIGR1ZSB0byBhIG5ldHdvcmsgZXJyb3IuXHJcbiAgICBkZWZlcnJlZC5yZWplY3QoIG5ldyBlcnJvcnMuQnJpZGdlRXJyb3IoIGVycm9ycy5ORVRXT1JLX0VSUk9SICkgKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgeGhyLm9udGltZW91dCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAvLyBJZiB0aGUgcmVxdWVzdCB0aW1lZCBvdXQsIHJlamVjdCB0aGUgcmVxdWVzdCB3aXRoIGEgbmV3IGVycm9yIG9iamVjdCB0aGF0IGRlc2NyaWJlcyB0aGF0IHRoZVxyXG4gICAgLy8gZmFpbHVyZSB3YXMgZHVlIHRvIGEgdGltZW91dC5cclxuICAgIGRlZmVycmVkLnJlamVjdCggbmV3IGVycm9ycy5CcmlkZ2VFcnJvciggZXJyb3JzLlJFUVVFU1RfVElNRU9VVCApICk7XHJcblxyXG4gIH07XHJcblxyXG4gIHhoci5zZW5kKCk7XHJcblxyXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cclxufTtcclxuIl19
(2)
});
