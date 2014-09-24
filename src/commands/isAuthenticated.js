/**
 * @module  authenticate
 */
/* global exports: true */
var Q = require( '../include/q' );
var core = require( '../core' );
var errors = require( '../errors' );

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
