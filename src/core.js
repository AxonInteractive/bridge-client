/**
 * @module  core
 */
var Q = require( './include/q' );
var errors = require( './errors.js' );

// Include the sendRequest function import as an export
exports.sendRequest = require( './plugins/Default.js' );

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
   * @property {User}  user  The user profile object that is modifiable by users of Bridge.
   */
  exports.user = null;

  /**
   * @public
   * @property {String}  unchangedUser  The JSON.stringify()ed user profile object as it was when it
   *                                    was set by a call to getUserProfile().
   */
  exports.unchangedUser = '';

  /**
   * @public
   * @property {Boolean}  rememberMe  Whether or not the user selected the remember me option.
   */
  exports.rememberMe = false;

  ///////////////////////
  // Helper Functions //
  /////////////////////

  /**
   *
   * @public
   *
   * @function      isAuthenticated
   *
   * @description   Returns whether or not an existing Bridge authentication cookie is set.
   *
   * @returns       {Boolean} Whether or not the Bridge authentication cookie cookie is set.
   *
   */
  exports.isAuthenticated = function isAuthenticated () {
    return ( exports.getAuthToken().length > 0 );
  };

  /**
   *
   * @public
   *
   * @function      getAuthToken
   *
   * @description   Returns the JWT token used by the Bridge authentication cookie.
   *
   * @returns       {String} The JWT token used by the Bridge authentication cookie.
   *
   */
  exports.getAuthToken = function getAuthToken () {
    var regex = new RegExp( AUTH_COOKIE_NAME + '=.*?;' );
    var matches = regex.exec( document.cookie );
    return ( matches ) ? matches[ 0 ].substring( 12, matches[ 0 ].length - 1 ) : '';
  };

  /**
   *
   * @public
   *
   * @function      logout
   *
   * @description   Set the cookie to by clearing the token string and setting its expiry for Y2K so
   *                the server rejects any further requests made with this cookie and there's no
   *                sensitive information to decrypt from it. This function also clears the user
   *                object and the rememberMe variable to erase all of the user's settings and
   *                preferences from the client.
   *
   * @returns       {undefined}
   *
   */
  exports.logout = function logout () {
    exports.user = null;
    exports.unchangedUser = '';
    exports.rememberMe = false;
    document.cookie = AUTH_COOKIE_NAME + '=; expires=' + new Date( 2000 ).toUTCString();
  };

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
    return ( exports.isAuthenticated() && Bridge.user );
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
  exports.isUserModified = function isUserModified() {
    return JSON.stringify( exports.user ) === exports.unchangedUser;
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
  exports.stripTrailingSlash = function stripTrailingSlash( str ) {
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
  exports.onRequestCalled = function onRequestCalled( method, url, data ) {
    // Do nothing until overridden by an implementor
  };

  /**
   *
   * @private
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
  var resolve = function resolve( name, deferred, data ) {
    if ( exports.debug === true ) {
      console.log( "BRIDGE | " + name + " | " + JSON.stringify( data ) );
    }
    deferred.resolve( data );
  };

  /**
   *
   * @private
   *
   * @function     reject
   *
   * @description  Rejects the provided deferred and returns the provided data.
   *
   * @param  {String} name        An identifier to use when printing debug information.
   *
   * @param  {Deferred} deferred  The Q deferred object to resolve.
   *
   * @param  {Object} data        The object to return with the rejection.
   *
   * @return {undefined}
   *
   */
  var reject = function reject( name, deferred, data ) {
    if ( exports.debug === true ) {
      console.error( "BRIDGE | " + name + " | " + data.status + " >> Code " + data.errorCode +
        ": " + errors.getExplanation( data.errorCode ) );
    }
    deferred.reject( data );
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
  exports.request = function request( method, url, data ) {

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

        // Validate the top-level structure of the response format, and if invalid, reject the
        // request with a new error object indicating that the response is malformed.
        if ( !data.content || !( data.content instanceof Object ) ) {
          reject( "Request", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
          return;
        }

        // If the response format is valid, resolve the request with the response data object.
        resolve( "Request", deferred, data );

      },
      /////////////////////////////////////////////////////////////////////////////////////////////

      // Request was rejected /////////////////////////////////////////////////////////////////////
      function ( error ) {

        // If the response failed, reject the request with the error object passed up from below.
        reject( "Request", deferred, error );

      }
      /////////////////////////////////////////////////////////////////////////////////////////////

    );

    return deferred.promise;

  };

} )();
