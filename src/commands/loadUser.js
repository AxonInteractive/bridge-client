/**
 * @module  getUserProfile
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
