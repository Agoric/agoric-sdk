# SES-adapter

```js
import { harden, Compartment, HandledPromise } from 'ses-adapter';
```

This `ses-adapter` module provides a future-proof way to access three
SES-related functions:

* `harden`: recursively freeze the API surface of an object
* `Compartment`: create a new Compartment, in which code can be evaluated
* `HandledPromise`: augment Promises with eventual-send pipelining methods

If the program is running in a SES environment when this module is first
loaded, `ses-adapter` will return the SES versions of those functions. If
not, it will provide an insecure simulation, which should be good enough for
unit tests.

The safe versions of these functions are provided as globals inside a SES
environment. The easiest way to turn a Node.js or browser web-page context
into a SES environment is to use the SES-shim package (published to NPM as
`ses`) and call its `lockdown` function:

```js
import { lockdown } from 'ses';
lockdown();
```

Applications should create a local module, perhaps named `install-SES.js`,
which performs that `lockdown` step. The application should then import
`./install-SES.js` before it imports anything else. This will ensure that the
entire applications runs in a secure SES environment.

Library code which wants to use harden/etc, and which does not want to impose
a particular execution environment on the application which eventually uses
it, should not import `ses` or call `lockdown` itself. Instead, it should
merely import `ses-adapter` to access harden/etc.

Library code that wants to run unit tests under SES, to verify it behaves
correctly in a full SES environment, should create an `install-SES.js` and
import it at the beginning of the unit test, before any of the
code-under-test is imported. It should not import `install-SES.js` from the
library code, but only from the unit test files (which are like applications,
in that they are the first code run by Node).

