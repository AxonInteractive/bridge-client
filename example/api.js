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

  /*
  users: {

    'delete': null,

    'get': function ( filters ) {

      // Request a login package from the server
      Bridge.request( 'GET', 'users/' + filters, {} )
      .done( function ( data, textStatus, jqXHR ) {

        // isErrorCodeResponse() provides an easy way to check a broad range of status codes 
        // that you probably want to reject. You don't have to reject the response if it returns
        // an error, of course, but this function call will allow you to sift through most errors
        // with a 1-liner and handle them however you like.
        var error = Bridge.isErrorCodeResponse( jqXHR );
        if ( error !== null || typeof data !== 'object' || typeof data.content !== 'object' ) {

          // NOTE
          // Implement handling of specific error codes here. If you need particular handling
          // of specific error codes this is a good time to do it.

          // Example:
          console.error( "API | " + error.status.toString() + " >> " + error.message );

        } 
        else // Successful login
        {

          // NOTE
          // Implement handling of a successful request here. Anything that needs to happen in
          // response to this resource being returned should happen here.

          // Example:
          console.log( "API | Request successful!" );

        }

      } )
      .failed( function ( jqXHR, textStatus, errorThrown ) {

        // NOTE
        // Implement handling of a complete request failure here. This means that no response
        // was received from the server. The client machine's internet may be offline, of the
        // server hosting the Bridge API may be offline.

        // Example:
        console.error( "API | Error >> No response from the server." );

      } );

    },

    'post': null,

    'put': function ( payload ) {

      // Request a login package from the server
      Bridge.request( 'PUT', 'users', payload )
      .done( function ( data, textStatus, jqXHR ) {

        // isErrorCodeResponse() provides an easy way to check a broad range of status codes 
        // that you probably want to reject. You don't have to reject the response if it returns
        // an error, of course, but this function call will allow you to sift through most errors
        // with a 1-liner and handle them however you like.
        var error = Bridge.isErrorCodeResponse( jqXHR );
        if ( error !== null || typeof data !== 'object' || typeof data.content !== 'object' ) {

          // NOTE
          // Implement handling of specific error codes here. If you need particular handling
          // of specific error codes this is a good time to do it.

          // Example:
          console.error( "API | " + error.status.toString() + " >> " + error.message );

        } 
        else // Successful login
        {

          // NOTE
          // Implement handling of a successful request here. Anything that needs to happen in
          // response to this resource being returned should happen here.

          // Example:
          console.log( "API | Request successful!" );

        }

      } )
      .failed( function ( jqXHR, textStatus, errorThrown ) {

        // NOTE
        // Implement handling of a complete request failure here. This means that no response
        // was received from the server. The client machine's internet may be offline, of the
        // server hosting the Bridge API may be offline.

        // Example:
        console.error( "API | Error >> No response from the server." );

      } );

    }

  };
  */

};
