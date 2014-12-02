/**
 * @module  updateUserProfile
 */
/* global exports: true */
var CryptoEncHex = require( '../include/crypto-js/enc-hex' );
var CryptoSha256 = require( '../include/crypto-js/sha256' );
var Q = require( '../include/q' );
var core = require( '../core' );
var errors = require( '../errors' );
var authenticate = require( '../commands/authenticate' );

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
  if ( currentPassword && newPassword && newPassword.length > 1 ) {
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
