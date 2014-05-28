( function ( root, factory ) {

    "use strict";

    if ( typeof define === 'function' ) {

      define( factory );

    } else if ( typeof exports === 'object' ) {

      module.exports = factory();

    } else {

      // change "myLib" to whatever your library is called
      root.AxonBridge = factory();

    }

  } ( this, function () {

