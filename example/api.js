// [API Init]
// The DefaultApi object supplies Bridge with the necessary login functionality in the absence
// of a fully fleshed-out user-developed API. This module should also serve as a best-practices
// example of how to develop an API for the Bridge client.
var api = {

  // [RESOURCE] login
  // This resource is required by Bridge to provide a way to fetch user data from the
  // database in response to correct authentication credentials being provided.
  login: {

    // [METHOD] DELETE
    // Not implemented.
    'delete': null,

    // [METHOD] GET
    // Use the native Bridge login() call to handle this request/response.
    // Signature: function ( email, password, useLocalStorage )
    'get': Bridge.login,

    // [METHOD] POST
    // Not implemented.
    'post': null,

    // [METHOD] PUT
    // Not implemented.
    'put': null

  },

  // The users resource will probably be the next that you want to implement. Use this template
  // to guide you as you begin to develop your first API route and the resource it returns.
  users: {

    // [METHOD] DELETE
    // Use this to delete existing users.
    'delete': null,

    // [METHOD] GET
    // Use this to fetch users.
    'get': function ( filters ) {

      // Request a login package from the server
      Bridge.request( 'GET', 'users/' + filters, {} )
      .done( function ( data, textStatus, jqXHR ) {

        // Set the user object using the user data that was returned, as long as the data
        // in the response is well-formed.
        if ( typeof data !== 'object' || typeof data.content !== 'object' ) {

          // Notify the user of the login error and stop handling this here.
          var error = { status: 417, message: '417 (Expectation Failed) Malformed response.' };
          console.error( "API | GET Users | " + error.status.toString() + " >> " + error.message );
          if ( typeof self.onLoginError === 'function' ) {
            self.onLoginError( data, error );
          }
          return;

        }

        // NOTE
        // Implement handling of a successful request here. Anything that needs to happen in
        // response to this resource being returned should happen here.

        // Example:
        console.log( "API | GET Users | Request successful!" );

      } )
      .failed( function ( jqXHR, textStatus, errorThrown ) {

        // Reject the obvious error codes
        var error = Bridge.isErrorCodeResponse( jqXHR );
        if ( error !== null ) {

          // Report the error code and message
          console.error( "API | GET Users | " + error.status.toString() + " >> " + error.message );

          // Notify the user of the login error.
          if ( typeof self.onLoginError === 'function' ) {
            self.onLoginError( error );
          }

        } 
        else // Connection timeout
        {

          // Report the communication failure
          console.error( "API | GET Users | Error >> No response from the server." );

          // Notify the user of the failure to connect to the server.
          if ( typeof self.onLoginTimeout === 'function' ) {
            self.onLoginTimeout();
          }

        }

      } );

    },

    // [METHOD] POST
    // Use this for editing existing users.
    'post': null,

    // [METHOD] PUT
    // Use this for creation of new users.
    'put': function ( payload ) {

      // Request a login package from the server
      Bridge.request( 'PUT', 'users/', payload )
      .done( function ( data, textStatus, jqXHR ) {

        // Set the user object using the user data that was returned, as long as the data
        // in the response is well-formed.
        if ( typeof data !== 'object' || typeof data.content !== 'object' ) {

          // Notify the user of the login error and stop handling this here.
          var error = { status: 417, message: '417 (Expectation Failed) Malformed response.' };
          console.error( "API | GET Users | " + error.status.toString() + " >> " + error.message );
          if ( typeof self.onLoginError === 'function' ) {
            self.onLoginError( data, error );
          }
          return;

        }

        // NOTE
        // Implement handling of a successful request here. Anything that needs to happen in
        // response to this resource being returned should happen here.

        // Example:
        console.log( "API | PUT Users | Request successful!" );

      } )
      .failed( function ( jqXHR, textStatus, errorThrown ) {

        // Reject the obvious error codes
        var error = Bridge.isErrorCodeResponse( jqXHR );
        if ( error !== null ) {

          // Report the error code and message
          console.error( "API | PUT Users | " + error.status.toString() + " >> " + error.message );

          // Notify the user of the login error.
          if ( typeof self.onLoginError === 'function' ) {
            self.onLoginError( error );
          }

        } 
        else // Connection timeout
        {

          // Report the communication failure
          console.error( "API | PUT Users | Error >> No response from the server." );

          // Notify the user of the failure to connect to the server.
          if ( typeof self.onLoginTimeout === 'function' ) {
            self.onLoginTimeout();
          }

        }

      } );

    }

  }

};
