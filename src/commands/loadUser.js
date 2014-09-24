/**
 * @module  getUserProfile
 */
/* global exports: true */
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
