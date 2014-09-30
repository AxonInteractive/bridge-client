/**
 * @module  login
 */
/* global exports: true */
var Q = require( '../include/q' );
var core = require( '../core' );
var errors = require( '../errors' );
var isAuthenticated = require( '../commands/isAuthenticated' );
var loadUser = require( '../commands/loadUser' );

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
