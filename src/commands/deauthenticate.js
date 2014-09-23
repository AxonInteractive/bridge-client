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
      if ( !data.content.message || typeof( data.content.message ) !== 'string' ) {
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
