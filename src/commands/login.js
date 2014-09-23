/**
 * @module  login
 */
/* global exports: true */
var Q = require( '../include/q' );
var core = require( '../core' );
var errors = require( '../errors' );
var authenticate = require( '../commands/authenticate' );
var getUserProfile = require( '../commands/getUserProfile' );

/**
 *
 * @public
 *
 * @function      login [authenticate >> getUserProfile]
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
      getUserProfile( apiUrl, email ).then(
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
