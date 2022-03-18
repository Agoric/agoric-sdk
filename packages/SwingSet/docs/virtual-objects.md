# TODO (update to include new stores and durable objects stuff)

# Vat Secondary Storage

The kernel currently provides two secondary storage mechanisms for the use of (application) code running in a vat:

- Virtual objects
- Persistent stores

Each of these is accessed via a global made available to vat code.

## Virtual Objects

A virtual object is an object with a durable identity whose state is automatically and transparently backed up in secondary storage.  This means that when a given virtual object is not in active use, it need not occupy any memory within the executing vat.  Thus a vat can manage an arbitrarily large number of such objects without concern about running out of memory.

A virtual object has a "kind", which defines what sort of behavior and state it will possess.  A kind is not exactly a data type, since it comes with a concrete implementation, but it indicates a family of objects that share a set of common behaviors and a common state template.

A vat can define new kinds of virtual object by calling the `defineKind` function provided as a vat global:

  `defineKind(descriptionTag, init, actualize, finish)`

The return value from `defineKind` is a maker function which the vat can use to create instances of the newly defined object kind.

The `descriptionTag` parameter is a short description string for the kind.  This is the same kind of tag string you would use in a call to `Far`.  It will appear on `.toString()` representations of corresponding `Presence` objects that are exported to remote vats.

The `init` parameter is a function that will be called when new instances are first created. It is expected to return a simple JavaScript object that represents the initialized state for the new virtual object instance.  Any parameters passed to the maker function returned by `defineKind` are passed directly to the `init` function.

The `actualize` parameter is a function that binds an in-memory instance (the "Representative") of the virtual object with the virtual object's state, associating such instances with the virtual object's behavior.  It is passed the virtual object's state as a parameter and is expected to return either:

1. A new JavaScript object with methods that close over the given state.  This returned object will become the body of the new instance.  This object can be empty; in such a case it can serve as a powerless but unforgeable "marker" handle.

2. A new JavaScript object populated with objects as described in (1).  These will become facets of the new instance.  The returned object will be an object mapping to the facets by name.

The `actualize` function is called whenever a new virtual object instance is created, whenever such an instance is swapped in from secondary storage, and whenever a reference to a virtual object is received as a parameter of a message and deserialized.  The `actualize` function for a given VDO kind must always return the same shape of result: if it returns a single instance body, it must always return a single instance body; if it returns a object full of facets, it must always return an object with the exact same facet names.

The `finish` parameter will, if present (it is optional), be called exactly once as part of instance initialization.  It will be invoked immediately after the `actualize` function is called for the first time.  In other words, it will be called after the instance per se exists but before that instance is returned from the maker function and thus becomes available to whoever requested its creation.  `finish` is passed two parameters: the virtual object's state (exactly as passed to the `actualize` function) and the virtual object itself. The `finish` function can modify the object's state in the context of knowing the object's identity, and thus can be used in cases where a validly initialized instance requires it to participate in some kind of cyclical object graph with other virtual objects.  It can also be used, for example, to register the object with outside tracking data structures, or do whatever other post-creation setup is needed for the object to do its job.  In particular, if one or more of the object's methods need to refer to the object itself (for example, so it can pass itself to other objects), the `finish` function provides a way to capture that identity as part of the object's state.

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

This defines a simple counter object with two properties in its state, a count and a name.  You'd use it like this:

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

Suppose you instead wanted to provide the the increment and decrement capabilities as independent facets.  A simplified version of the above (without the name property, counter registry, and `reset` method) might look like:

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

Which you'd use like:

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

- A virtual object can be passed as a parameter in messages to other vats.  It will be passed by presence, just like any other non-data object you might send in a message parameter.

- A virtual object's state may include references to other virtual objects. The latter objects will be persisted separately and only deserialized as needed, so "swapping in" a virtual object that references other virtual objects does not entail swapping in the entire associated object graph.
