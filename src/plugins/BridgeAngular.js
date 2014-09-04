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

( function () {

  'use strict';

  // Define the Bridge module
  var app = angular.module( 'Bridge', [] );

  /////////////////////////////////////////////////
  // Add Bridge header to all outgoing requests //
  ///////////////////////////////////////////////

  app.factory( '$interceptor', [
    '$bridge', '$log',
    function ( $bridge, $log ) {

      // Add the Bridge header to the request if it isn't already there
      return {
        request: function ( config ) {
          if ( !config.headers.Bridge ) {
            config.headers.Bridge = $bridge.getBridge().createRequestHeader( {} );
          }
          return config;
        }
      };

    } 
  ] );

  app.config( [
    '$httpProvider', 
    function ( $httpProvider ) {

      // Set up the $httpProvider interceptor
      $httpProvider.interceptors.push( '$interceptor' );

    }
  ]);
  
  //////////////////////////////////////////////
  // Force all Bridge requests through $http //
  ////////////////////////////////////////////

  app.factory( '$bridge', [
    function () {

      /////////////////////
      // Initialization //
      ///////////////////

      // This function should be called from somewhere in your app's startup, before any API calls.

      var initBridge = function ( apiUrl, timeout, debug ) {
        Bridge.init( apiUrl, timeout );
        Bridge.debug = debug;
      };

      /////////////////
      // Properties //
      ///////////////

      // These functions are getters and setters for Bridge internal variables.

      var getBridge = function () {
        return Bridge;
      };
      var getDebug = function () {
        return Bridge.debug;
      };
      var getIsErrorCodeResponse = function ( status ) {
        return Bridge.isErrorCodeResponse();
      };
      var getIsLoggedIn = function () {
        return Bridge.isLoggedIn();
      };
      var getIsUsingLocalStorage = function () {
        return Bridge.useLocalStorage;
      };
      var getTimeout = function () {
        return Bridge.timeout;
      };
      var getUrl = function () {
        return Bridge.url;
      };
      var getUser = function () {
        return Bridge.user;
      };

      //////////////////////
      // Event Callbacks //
      ////////////////////

      // These callbacks provide hooks to modify Bridge function behaviour, if necessary.

      var getOnChangePasswordCalled = function () {
        return Bridge.onChangePasswordCalled;
      };
      var setOnChangePasswordCalled = function ( callback ) {
        Bridge.onChangePasswordCalled = callback;
      };
      var getOnForgotPasswordCalled = function () {
        return Bridge.onForgotPasswordCalled;
      };
      var setOnForgotPasswordCalled = function ( callback ) {
        Bridge.onForgotPasswordCalled = callback;
      };
      var getOnLoginCalled = function () {
        return Bridge.onLoginCalled;
      };
      var setOnLoginCalled = function ( callback ) {
        Bridge.onLoginCalled = callback;
      };
      var getOnLogoutCalled = function () {
        return Bridge.onLogoutCalled;
      };
      var setOnLogoutCalled = function ( callback ) {
        Bridge.onLogoutCalled = callback;
      };
      var getOnRecoverPasswordCalled = function () {
        return Bridge.onRecoverPasswordCalled;
      };
      var setOnRecoverPasswordCalled = function ( callback ) {
        Bridge.onRecoverPasswordCalled = callback;
      };
      var getOnRegisterCalled = function () {
        return Bridge.onRegisterCalled;
      };
      var setOnRegisterCalled = function ( callback ) {
        Bridge.onRegisterCalled = callback;
      };
      var getOnRequestCalled = function () {
        return Bridge.onRequestCalled;
      };
      var setOnRequestCalled = function ( callback ) {
        Bridge.onRequestCalled = callback;
      };
      var getOnVerifyEmailCalled = function () {
        return Bridge.onVerifyEmailCalled;
      };
      var setOnVerifyEmailCalled = function ( callback ) {
        Bridge.onVerifyEmailCalled = callback;
      };

      /////////////////
      // Operations //
      ///////////////

      // These functions define the lexicon of operations that can be performed on a user.

      var logout = function () {
        return Bridge.logout();
      };
      var request = function ( method, resource, payload ) {
        return Bridge.request( method, resource, payload );
      };
      var requestChangePassword = function ( oldPassword, newPassword ) {
        return Bridge.requestChangePassword( oldPassword, newPassword );
      };
      var requestForgotPassword = function ( email ) {
        return Bridge.requestForgotPassword( email );
      };
      var requestLogin = function ( email, password, useLocalStorage ) {
        return Bridge.requestLogin( email, password, useLocalStorage );
      };
      var requestLoginStoredIdentity = function () {
        return Bridge.requestLoginStoredIdentity();
      };
      var requestRecoverPassword = function ( password, hash ) {
        return Bridge.requestRecoverPassword( password, hash );
      };
      var requestRegister = function ( email, password, firstName, lastName, appData ) {
        return Bridge.requestRegister( email, password, firstName, lastName, appData );
      };
      var requestVerifyEmail = function ( email, hash ) {
        return Bridge.requestVerifyEmail( email, hash );
      };

      //////////////
      // Exports //
      ////////////
      
      return {
        initBridge: initBridge,
        getBridge: getBridge,
        getDebug: getDebug,
        getIsErrorCodeResponse: getIsErrorCodeResponse,
        getIsLoggedIn: getIsLoggedIn,
        getIsUsingLocalStorage: getIsUsingLocalStorage,
        getTimeout: getTimeout,
        getUrl: getUrl,
        getUser: getUser,
        getOnChangePasswordCalled: getOnChangePasswordCalled, 
        setOnChangePasswordCalled: setOnChangePasswordCalled,
        getOnForgotPasswordCalled: getOnForgotPasswordCalled, 
        setOnForgotPasswordCalled: setOnForgotPasswordCalled, 
        getOnLoginCalled: getOnLoginCalled, 
        setOnLoginCalled: setOnLoginCalled, 
        getOnLogoutCalled: getOnLogoutCalled, 
        setOnLogoutCalled: setOnLogoutCalled, 
        getOnRecoverPasswordCalled: getOnRecoverPasswordCalled, 
        setOnRecoverPasswordCalled: setOnRecoverPasswordCalled, 
        getOnRegisterCalled: getOnRegisterCalled, 
        setOnRegisterCalled: setOnRegisterCalled, 
        getOnRequestCalled: getOnRequestCalled, 
        setOnRequestCalled: setOnRequestCalled, 
        getOnVerifyEmailCalled: getOnVerifyEmailCalled, 
        setOnVerifyEmailCalled: setOnVerifyEmailCalled, 
        logout: logout,
        request: request,
        requestChangePassword: requestChangePassword,
        requestForgotPassword: requestForgotPassword,
        requestLogin: requestLogin,
        requestLoginStoredIdentity: requestLoginStoredIdentity,
        requestRecoverPassword: requestRecoverPassword,
        requestRegister: requestRegister,
        requestVerifyEmail: requestVerifyEmail
      };

    }
  ] );

  app.run( [
    '$bridge', '$http', '$q',
    function ( $bridge, $http, $q ) {

      var deferred = $q.defer();

      // Set $bridge.createRequest() so Bridge requests flow through $http
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
          var error = $bridge.getIsErrorCodeResponse( response.status );
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
          var error = $bridge.getIsErrorCodeResponse( response.status );
          deferred.reject( error );
        } );

      };

      return deferred.promise;

    }
  ] );

} )();