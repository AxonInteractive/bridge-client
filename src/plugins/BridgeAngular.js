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
/* global Q: false */

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
            config.headers.Bridge = $bridge.getBridge()
              .createRequestHeader( {} );
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
  ] );

  ////////////////////////////////////////
  // Create the Bridge Angular wrapper //
  //////////////////////////////////////

  app.factory( '$bridge', [

    function () {

      ///////////
      // Init //
      /////////

      var init = function ( apiUrl ) {
        Bridge.init( apiUrl );
      };

      /////////////////
      // Properties //
      ///////////////

      // These functions are getters and setters for Bridge internal variables.

      var getUserAppData = function () {
        if ( Bridge.user ) {
          return Bridge.user.appData;
        } else {
          return null;
        }
      };
      var getBridge = function () {
        return Bridge;
      };
      var getDebug = function () {
        return Bridge.debug;
      };
      var setDebug = function ( value ) {
        Bridge.debug = value;
      };
      var getBaseUrl = function () {
        return Bridge.baseUrl;
      };
      var setBaseUrl = function ( value ) {
        Bridge.baseUrl = value;
      };
      var getIsErrorCodeResponse = function ( status ) {
        return Bridge.isErrorCodeResponse( status );
      };
      var getIsLoggedIn = function () {
        return Bridge.isLoggedIn();
      };
      var getIsUsingLocalStorage = function () {
        return Bridge.useLocalStorage;
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
        init: init,
        getBridge: getBridge,
        getDebug: getDebug,
        setDebug: setDebug,
        getBaseUrl: getBaseUrl,
        setBaseUrl: setBaseUrl,
        getIsErrorCodeResponse: getIsErrorCodeResponse,
        getIsLoggedIn: getIsLoggedIn,
        getIsUsingLocalStorage: getIsUsingLocalStorage,
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

      // Set $bridge.createRequest() so Bridge requests flow through $http
      $bridge.getBridge()
        .createRequest = function ( method, resource, signedHeader ) {

          var deferred = $q.defer();

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
            .success( function ( data, status, headers, config ) {
              deferred.resolve( data );
            } )
            .error( function ( data, status, headers, config ) {
              deferred.reject( data );
            } );

          return deferred.promise;

      };

    }
  ] );

} )();
