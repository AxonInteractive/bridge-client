///////////////////////////////////////////////////////////////////////////////////////////////////
// Bridge Client AngularJS Plugin
//
// This plugin can be included after bridge-client.js to interface the Bridge Client with the
// AngularJS runtime through the $http and $httpProvider services, and by making the Bridge global
// available to the AngularJS injector as $bridge.
//
// Specifically, Bridge requests (those initiated by Bridge functions such as requestLogin) are
// configured to use Angular's $http service to send XHR requests instead of the default $.ajax().
// Also, all outgoing requests from the $http service are configured to have the Bridge header
// added to their HTTP headers so that the Bridge Server can authenticate all requests received
// from client and therefore maintain security for any static assets that are served.
//
///////////////////////////////////////////////////////////////////////////////////////////////////

// This script expects angular and Bridge to be defined by the time it runs.
/* global angular: false */
/* global Bridge: false */

( function () {

  'use strict';

  // Define the Bridge module
  var app = angular.module( 'Bridge', [] );

  app.factory( '$bridge', [ function () {

    // Make Bridge available through Angular's $injector as $bridge.
    return Bridge;

  } ] );

  app.run( [
    '$bridge', '$http',
    function ( $bridge, $http ) {

      $bridge.getBridge().sendRequest = function ( deferred, method, url, data ) {

        // Use $http to send a request to the Bridge Server and return a Q promise that is
        // consistent with the Bridge Client promise signatures for reject() and resolve().
        $http( {
          method: method,
          url: url,
          headers: {
            'Accept': 'application/json',
            'Bridge': JSON.stringify( data )
          }
        } )

        // Success Handler ////////////////////////////////////////////////////////////////////////
        .success( function ( data, status, headers, config ) {

          // Resolve the request with the response data as the argument.
          deferred.resolve( data );

        } )
        ///////////////////////////////////////////////////////////////////////////////////////////

        // Failure Handler ////////////////////////////////////////////////////////////////////////
        .error( function ( data, status, headers, config ) {

          // If the content property is missing from the response, the response is malformed. Reject
          // the request with a new error object indicating that the response is malformed.
          if ( !data.content ) {
            deferred.reject( new $bridge.errors.BridgeError( $bridge.errors.MALFORMED_RESPONSE ) );
          }

          // If the content property exists, then reject the request with the content of the
          // response data as the argument.
          deferred.reject( data.content );

        } );
        ///////////////////////////////////////////////////////////////////////////////////////////

        return deferred.promise;

      };
    }
  ] );

} )();
