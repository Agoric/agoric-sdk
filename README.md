# `@agoric/mini-captp`

A miniature CapTP implementation leveraging Agoric's published modules.

## Usage

```
import makeCapTP from '@agoric/mini-captp';
import { E } from '@agoric/eventual-send';

// Create a message handler and bootstrap.
// Messages on myconn are exchanged with JSON-able objects.
const [handler, getBootstrap] = makeCapTP('myid', myconn.send, myBootstrap);
myconn.onReceive = obj => handler[obj.type](obj);

// Get the remote's bootstrap object and call a remote method.
E(getBootstrap()).method(args).then(res => console.log('got res', res));
```
