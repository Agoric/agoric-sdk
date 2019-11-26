# Default Evaluate Options

This repository provides default evaluation options for use with Realms and SES.

Semantic versioning of this package is important, so that you don't introduce
incompatible changes into your repositories.

```
import makeDefaultEvaluateOptions from '@agoric/default-evaluate-options';
[...]
const options = makeDefaultEvaluateOptions();
const r = Realm.makeRootRealm(options);
```
