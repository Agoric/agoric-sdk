# Import Manager

ImportManager allows a package to make some code available that can be run
locally by a calling vat without requiring a remote round trip to the hosting
vat. Remote code can indicate what function to run using a key.

Long term, we may want to import from a well-known repository, and manage
version upgrades, but for now, we just import the code from the file system.

A package that wanted to export some code for clients to run in their own vat
would import or define some functions, then call

```js
  const mgr = importManager();
  return mgr.addExports(
    {
       'usefulFn', export1,
       'helpfulFn', export2,
     });
```

then it could pass strings like 'usefulFn' to clients, who could import the
manager above, then call

```js
const genericFn = importer.lookupImport(name);
```
