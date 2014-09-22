/**
 * @module  authenticate
 */
/* global exports: true */
var CryptoEncHex = require( '../include/crypto-js/enc-hex' );
var CryptoSha256 = require( '../include/crypto-js/sha256' );
var Q = require( '../include/q' );
var core = require( '../core' );
var errors = require( '../errors' );

/**
 *
 * @public
 *
 * @function      authenticate [POST]
 *
 * @description   Ask the server to change the password of the currently logged-in user. This
 *                operation requires the user's current password to be supplied to re-authenticate
 *                the user to verify that another individual didn't just hop onto a logged-in
 *                computer and change a user's password while they were away from their computer.
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
 *                                      on the order of 2 weeks from the user's last request (but
 *                                      can be modified in the server settings). If false, the
 *                                      expiry will only be about 1 hour from the last request
 *                                      (again, this is configurable).
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = function authenticate( apiUrl, email, password, rememberMe ) {

  'use strict';

  // Set the remember me flag
  core.rememberMe = rememberMe;

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
      if ( !data.content.message || !( data.content.message instanceof String ) ) {
        core.reject( "Authenticate", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // Print a debug message to confirm that the authentication cookie is set.
      if ( core.debug ) {
        console.log( "Authorized: " + core.isAuthorized() );
        console.log( "Auth Token: " + core.getAuthToken() );
        console.log( "Auth Expiry: " + core.getAuthExpiry().toUTCString() );
      }

      // If the response format is valid, resolve the request with the response data object.
      core.resolve( "Request", deferred, data );

    },
    /////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected /////////////////////////////////////////////////////////////////////
    function ( error ) {

      // Clear any existing auth cookie if one was set.
      core.logout();

      // If the response failed, reject the request with the error object passed up from below.
      core.reject( "Request", deferred, error );

    }
    /////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};
