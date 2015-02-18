# Bridge Client

Written by Jeff Rose and James Zinger of Axon Interactive

## Description

This browser library is the client-side portion of Bridge, Axon's own API development framework for database-backed browser applications. It provides a direction function call interface to each of the default Bridge API routes as well as some convenience functions for higher-order operations that are common to client-side webapps.

This version of bridge-client (v0.2.12) in intended to be compatible with v0.2.12 of bridge-server (the counterpart server-side module).

## Usage

This module is available from the Bower package registry. Install it with the following command:

```bash
bower install axon-bridge-client
```

Once installed, simply point your build process to 

`<bower_components>/axon-bridge-client/lib/axon-bridge-client.js` 

Once it is being included in your website, you will be able to access Bridge globally (as window.Bridge).

## Dependencies

### CryptoJS

Internal security computations are done using hash functions provided by CryptoJS.

### Q

In order to maintain consistency with the server-side API framework and to handle asynchrony better and more intuitively, this client-side library comes packaged with the Q.js promise library. All Bridge API call functions return promises that adhere to the Promise A+ spec.
