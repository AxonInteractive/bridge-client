/**
 * @module  login
 */
/* global exports: true */
var deauthenticate = require( '../commands/deauthenticate' );

/**
 *
 * @public
 *
 * @function      logout [deauthenticate (alias)]
 *
 * @description   Ask the server to invalidate the current session by expiring the authentication
 *                cookie used by this client. This function is merely an alias for deauthenticate()
 *                such that login and logout form a logical pair of operations for API consistency.
 *
 * @param         {String} apiUrl       The base URL of the API to send this request to. It doesn't
 *                                      matter whether the trailing forward-slash is left on or not
 *                                      because either case is handled appropriately.
 *
 * @returns       {Promise}             A q.js promise object.
 *
 */
module.exports = deauthenticate;
