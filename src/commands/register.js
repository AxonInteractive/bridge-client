/**
 * @module  register
 */
/* global exports: true */
var CryptoEncHex = require( '../include/crypto-js/enc-hex' );
var CryptoSha256 = require( '../include/crypto-js/sha256' );
var Q = require( '../include/q' );
var core = require( '../core' );
var errors = require( '../errors' );
var login = require( '../commands/login' );

/**
 *
 * @public
 *
 * @function      register [POST users >> login]
 *
 * @description   Ask the server to register a user with the given email/password pair, name, and
 *                application-specific data. The password is transmitted in the content of the
 *                message SHA-256 encrypted to protect the user's password to a minimal extent
 *                even under insecure connections.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @param         {String} email        The user's email address.
 *
 * @param         {String} password     The user's password (not yet hashed).
 *
 * @param         {String} firstName    The user's first name.
 *
 * @param         {String} lastName     The user's last name.
 *
 * @param         {String} appData      A JSON.stringify()ed JavaScript object of any application-
 *                                      specific data to store for this user.
 *
 * @returns       {Promise}           A q.js promise object.
 *
 */
module.exports = function register( apiUrl, email, password, firstName, lastName, appData ) {

  'use strict';

  // Build the request payload (hash the password with SHA256).
  var payload = {
    "appData": appData,
    "email": email,
    "firstName": firstName,
    "lastName": lastName,
    "password": CryptoSha256( password ).toString( CryptoEncHex ),
  };

  // Send the request and handle the response.
  var deferred = Q.defer();
  core.request( 'POST', core.stripTrailingSlash( apiUrl ) + '/user', payload ).then(

    // Request was resolved ///////////////////////////////////////////////////////////////////////
    function ( data ) {

      // Validate the structure of the response, and if invalid, reject the request with a
      // new error object indicating that the response is malformed.
      if ( typeof( data ) !== 'string' ) {
        core.reject( "Register", deferred, new errors.BridgeError( errors.MALFORMED_RESPONSE ) );
        return;
      }

      // If the user login is successful, resolve the request with the response data.
      core.resolve( "Register", deferred, data );

    },
    ///////////////////////////////////////////////////////////////////////////////////////////////

    // Request was rejected ///////////////////////////////////////////////////////////////////////
    function ( error ) {

      // If registration failed, reject the request with the error object passed up from below.
      core.reject( "Register", deferred, error );

    }
    ///////////////////////////////////////////////////////////////////////////////////////////////

  );
  return deferred.promise;
};
