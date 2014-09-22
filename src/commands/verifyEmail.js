/**
 * @module  verifyEmail
 */
/* global exports: true */
var Q = require( '../include/q' );
var core = require( '../core' );
var errors = require( '../errors' );

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
      if ( !data.content || !( data.content.message instanceof String ) ) {
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
