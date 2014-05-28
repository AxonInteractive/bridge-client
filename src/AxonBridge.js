// Include dependencies
var jquery = require( 'include/jquery-1.11.0' );
var jstorage = require( 'include/jstorage' );
var Bridge = require( 'Bridge' );

var self = {

  // [PUBLIC] build()
  // Calling build() builds a Bridge object to communicate with to the API at the 
  // specified URL.
  build: function ( apiURL, apiTimeout ) {

    AxonBridge = new Bridge( apiURL, apiTimeout );

  }

};

// [INIT FUNCTION]
// This jumpstarts the Bridge library state by checking local storage for an existing 
// Bridge to start up as. If no other Bridge is found, then the AxonBridge object will 
// wait to be bootstrapped by a call to its build() function.
( function () {

  // Check for an existing bridge in local storage.
  var storedBridge = jQuery.jStorage.get( 'axon-bridge', null );
  if ( storedBridge !== null ) {

    // Configure this bridge with the stored settings and start up the bridge.
    self.build( storedBridge.url, storedBridge.timeout );

    // Check if an identity is in local storage to use for authentication.
    var storedIdentity = jQuery.jStorage.get( 'axon-bridge-identity', null );
    if ( storedIdentity !== null ) {

      // Perform a login using the stored credentials to get the most recent
      // user data from the API.
      // Note: We assume here that the user wishes to continue using local storage.
      self.login( storedIdentity.email, storedIdentity.password, true );

    }

  }

} )();

module.exports = self;
