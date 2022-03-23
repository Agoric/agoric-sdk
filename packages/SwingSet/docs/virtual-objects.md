# TODO (update to include new stores stuff)

# Vat Secondary Storage

The kernel currently provides two secondary storage mechanisms for the use of (application) code running in a vat:

- Virtual and durable objects
- Persistent stores

These are accessed via properties of the `VatData` global made available to vat code, or more stylishly by importing from `@agoric/vat-data` (that's a working placeholder module which we will be replacing it with a more ergonomic package name once we figure out what that should be).

The APIs described here all have to do with storing data on disk.  However, you should understand an important distinction made in these APIs between the labels "virtual" and "durable".  In our usage here, things that are "virtual" will automatically swap their state to disk storage and thus don't eat up RAM space in the running vat process even if they grow large in number.  In contrast, things that are "durable" are not only stored on disk but survive the lifetime of the vat process holding them and may be retrieved later in a future version of the vat.

## Virtual and Durable Objects

A virtual or durable object (which we'll abbreviate VDO to save breath) is an object whose state is automatically and transparently backed up in secondary storage.  This means that when a given VDO is not in active use, it need not occupy any memory within the executing vat.  Thus a vat can manage an arbitrarily large number of such objects without concern about running out of memory.

A VDO has a "kind", which defines what sort of behavior and state it will possess.  A kind is not exactly a data type, since it comes with a concrete implementation, but it indicates a family of objects that share a set of common behaviors and a common state template.

A vat can define new kinds of VDOs by calling the `defineKind` or `defineDurableKind` functions:

  `maker = defineKind(descriptionTag, init, actualize, finish)`
or
  `maker = defineDurableKind(kindHandle, init, actual, finish)`

The return value from `defineKind` or `defineDurableKind` is a maker function which the vat can use to create instances of the newly defined VDO kind.

The `descriptionTag` parameter is a short description string for the kind.  This is the same kind of tag string you would use in a call to `Far`.  It will appear on `.toString()` representations of corresponding `Presence` objects that are exported to remote vats.  Note that this string should only be used for diagnostics and debugging, as it is not safe from substitution by adversarial intermediaries.

A `kindHandle` is a type of durable object that can be used to identify the kind in a later incarnation of the vat.  The usage of a kind handle rather than a simple tag string is the main thing that distinguished the two kind definition functions.  You obtain a kind handle for use in `defineDurableKind` by calling

  `kindHandle = makeKindHandle(descriptionTag)`

where `descriptionTag` is exactly the same as the same named parameter of `defineKind`.  The difference is that a kind handle is itself that a durable object that may be stored for later retrieval, and used in a future call to `defineDurableKind` to associate new behavior with the kind in question.

The `init` parameter is a function that will be called when new instances are first created. It is expected to return a simple JavaScript object that represents the initialized state for the new VDO instance.  Any parameters passed to the maker function returned by `defineKind`/`defineDurableKind` are passed directly to the `init` function.

The `actualize` parameter is a function that binds an in-memory instance (the "Representative") of the VDO with the VDO's state, associating such instances with the VDO's behavior.  It is passed the VDO's state as a parameter and is expected to return either:

1. A new JavaScript object with methods that close over the given state.  This returned object will become the body of the new instance.  This object can be empty; in such a case it can serve as a powerless but unforgeable "marker" handle.

2. A new JavaScript object populated with objects as described in (1).  These will become facets of the new instance.  The returned object will be an object mapping to the facets by name.

The `actualize` function is called whenever a new VDO instance is created, whenever such an instance is swapped in from secondary storage, and whenever a reference to a VDO is received as a parameter of a message and deserialized.  Note that for any given VDO kind, the shape of the value returned by the `actualize` function may not vary over successive calls.  That is, if it's a single facet, it must always be a single facet, and if it's multiple facets it must always be the same set of multiple facets.

The `finish` parameter is optional. It is a function that, if present, will be called exactly once as part of instance initialization.  It will be invoked _immediately_ after the `actualize` function for that instance is called for the very first time.  In other words, it will be called after the instance per se exists but before that instance is returned from the maker function to whoever requested its creation.  `finish` is passed two parameters: the VDO's state (exactly as passed to the `actualize` function) and the VDO itself. The `finish` function can modify the object's state in the context of knowing the object's identity, and thus can be used in cases where a validly initialized instance requires it to participate in some kind of cyclical object graph with other VDOs.  It can also be used, for example, to register the object with outside tracking data structures, or do whatever other post-creation setup is needed for the object to do its job.  In particular, if one or more of the object's methods need to refer to the object itself (for example, so it can pass itself to other objects), the `finish` function provides a way to capture that identity as part of the object's state.

For example:

```javascript
  const initCounter = (name) => ({ counter: 0, name });

  const actualizeCounter = (state) => ({
    inc: () => {
      state.counter += 1;
    },
    dec: () => {
      state.counter -= 1;
    },
    reset: () => {
      state.counter = 0;
    },
    rename: (newName) => {
      state.name = newName;
    },
    getCount: () => state.counter,
    getName: () => state.name,
  });

  const finishCounter = (state, counter) => {
    addToCounterRegistry(counter, state.name);
  };

  const makeCounter = defineKind('counter', initCounter, actualizeCounter, finishCounter);
```

This defines a simple virtual counter object with two properties in its state, a count and a name.  You'd use it like this:

```javascript
  const fooCounter = makeCounter('foo');
  const barCounter = makeCounter('bar');

  fooCounter.inc();
  fooCounter.inc();
  barCounter.inc();
  barCounter.rename('new bar');
  console.log(`${fooCounter.getName()} count is ${fooCounter.getCount()`); // "foo count is 2"
  console.log(`${barCounter.getName()} count is ${barCounter.getCount()`); // "new bar count is 1"
```

Suppose you instead wanted to provide a version with the increment and decrement capabilities made available as independent facets.  A simplified version of the above (without the name property, counter registry, and `reset` method) might look like:

```javascript
  const initFacetedCounter = () => ({ counter: 0 });

  const actualizeFacetedCounter = (state) => {
    const getCount = () => state.counter;
    return {
      incr: {
        step: () => {
          state.counter += 1;
        },
        getCount,
      },
      decr: {
        step: () => {
          state.counter -= 1;
        },
        getCount,
      },
    };
  }

  const makeFacetedCounter = defineKind('counter', initCounter, actualizeCounter);
```

If you wanted to also make this durable, instead of the last line you'd generate
the kind with something more like:

```javascript
  const facetedCounterKind = makeKindHandle('durable counter');
  const makeFacetedCounter = defineDurableKind(facetedCounterKind, initCounter, actualizeCounter);
```

In either case you'd use it like:

```javascript
  const { incr, decr } = makeFacetedCounter('foo');

  incr.step();
  incr.step();
  console.log(`count is ${decr.getCount()`); // "count is 2"
  decr.step();
  console.log(`count is ${incr.getCount()`); // "count is 1"
```

Note that the `init`, `actualize`, and `finish` functions are defined explicitly in the above examples for clarity of exposition, but in practice you'd usually declare them inline in the parameters of the `defineKind` call:

```javascript
  const makeFacetedCounter = defineKind(
    'counter',
    () => ({ counter: 0 }),
    (state) => {
      const getCount = () => state.counter;
      return {
        incr: {
          step: () => {
            state.counter += 1;
          },
          getCount,
        },
        decr: {
          step: () => {
            state.counter -= 1;
          },
          getCount,
        },
      };
    },
  );
```

Additional important details:

- The set of state properties of an instance is fully determined by the `init` function.  That is, the set of properties that exist on in instance's `state` is completely determined by the enumerable properties of the object that `init` returns.  State properties cannot thereafter be added or removed.  Currently there is no requirement that all instances of a given kind have the same set of properties, but code authors should not rely on this as such enforcement may be added in the future.

- The values a state property may take are limited to things that are serializable and which may be hardened (and, in fact, _are_ hardened and serialized the moment they are assigned).  That is, you can replace what value a state property _has_, but you cannot modify a state property's value in situ.  In other words, you can do things like:

  `state.zot = [1, 2, 3];`

  but you can't do things like:

  `state.zot.push(4);`

- A VDO can be passed as a parameter in messages to other vats.  It will be passed by presence, just like any other non-data object you might send in a message parameter.

- A VDO's state may include references to other VDOs. The latter objects will be persisted separately and only deserialized as needed, so "swapping in" a VDO that references other VDOs does not entail swapping in the entire associated object graph.
