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
/* global Bridge: false */

( function init () {

  'use strict';

  // Define the Bridge module
  angular.module( 'Bridge', [] )

    //////////////////////////////////////////////
    // Force all Bridge requests through $http //
    ////////////////////////////////////////////

    .factory( '$bridge', [
      function () {

        // Fetch the Bridge global as the $bridge factory in angular's injector.
        return Bridge;

      }
    ] )
    .run( [
      '$bridge', '$http', '$q',
      function ( $bridge, $http, $q ) {

        var deferred = $q.defer();

        // Set $bridge.xhrInterface() so Bridge requests flow through $http
        $bridge.createRequest = function ( method, resource, signedHeader ) {

          // Use $http to send a request to the Bridge Server and return a Q promise that is 
          // consistent with the Bridge Client promise signatures for reject() and resolve().
          $http( {
            method: method,
            url: resource,
            headers: {
              'Accept': 'application/json',
              'Bridge': JSON.stringify( signedHeader )
            }
          } )
          .then( function ( response ) {
            // Use isErrorCodeResponse() to screen for error codes that might be returned by the 
            // Bridge Server. If the status code we got back can't be classified as anything by 
            // isErrorCodeResponse(), a null error is returned and we can consider the response a
            // successful communication.
            var error = $bridge.isErrorCodeResponse( response.status );
            if ( error !== null ) {
              deferred.reject( error );
            }
            else {
              deferred.resolve( response.data );
            }
          } )
          .fail( function ( response ) {
            // Use isErrorCodeResponse() to screen for error codes that might be returned by the Bridge 
            // Server. If the status code we got back can't be classified as anything hy 
            // isErrorCodeResponse(), a null error is returned and the Bridge Client will handle the 
            // problem internally.
            var error = $bridge.isErrorCodeResponse( response.status );
            deferred.reject( error );
          } );

        };

        return deferred.promise;

      }
    ] )

    /////////////////////////////////////////////////
    // Add Bridge header to all outgoing requests //
    ///////////////////////////////////////////////

    .factory( '$interceptor', [
      '$bridge', 
      function ( $bridge ) {

        // Add the Bridge header to the request if it isn't already there
        return {
          request: function ( config ) {
            if ( !config.headers.Bridge ) {
              config.headers.Bridge = $bridge.createRequestHeader( 
                config.method, 
                config.url, 
                $bridge.createHeader( {} ) 
              );
            }
          }
        };

      } 
    ] )
    .run( [
      '$interceptor', '$httpProvider', 
      function ( $interceptor, $httpProvider ) {

        // Set up the $httpProvider interceptor
        $httpProvider.interceptors.push( $interceptor );

      }
    ]);

} )();