# TODO (update to include new stores and durable objects stuff)

# Vat Secondary Storage

The kernel currently provides two secondary storage mechanisms for the use of (application) code running in a vat:

- Virtual objects
- Persistent stores

Each of these is accessed via a global made available to vat code.

## Virtual Objects

A virtual object is an object with a durable identity whose state is automatically and transparently backed up in secondary storage.  This means that when a given virtual object is not in active use, it need not occupy any memory within the executing vat.  Thus a vat can manage an arbitrarily large number of such objects without concern about running out of memory.

A virtual object has a "kind", which defines what sort of behavior and state it will possess.  A kind is not exactly a data type, since it comes with a concrete implementation, but it indicates a family of objects that share a set of common behaviors and a common state template.

A vat can define new kinds of virtual object by calling the `makeKind` function provided as a vat global:

  `makeKind(instanceKitMaker)`

The return value from `makeKind` is a maker function which the vat can use to create instances of the newly defined object kind.

The `instanceKitMaker` parameter is a user provided function that binds an in-memory instance of the virtual object with the virtual object's state, associating such instances with the virtual object's behavior.  It is called whenever a new virtual object instance is created, whenever such an instance is swapped in from secondary storage, and whenever a reference to a virtual object is received as a parameter of a message and deserialized.

The `instanceKitMaker` function is passed the virtual object's state as a parameter, and is expected to return a kit object with two properties: `init`, an initialization function; and `self`, a new Javascript object with methods that close over the given state, that will become the body of the new instance.

The `init` function is called when new instances are first created, and is expected to initialize the state object.  Any parameters passed to the maker function returned by `makeKind` are passed directly to the `init` function.

For example:

```javascript
  function counterKitMaker(state) {
    return {
      init(name = 'thing') {
        state.counter = 0;
        state.name = name;
      },
      self: Far('counter', {
        inc() {
          state.counter += 1;
        },
        dec() {
          state.counter -= 1;
        },
        reset() {
          state.counter = 0;
        },
        rename(newName) {
          state.name = newName;
        },
        getCount() {
          return state.counter;
        },
        getName() {
          return state.name;
        },
      }),
    };
  }
```

This function defines a simple counter object with two properties in its state, a count and a name.

You'd define the corresponding virtual object kind with:

  `const counterMaker = makeKind(counterKitMaker);`

and then use it like this:

```javascript
  const fooCounter = counterMaker('foo');
  const barCounter = counterMaker('bar');

  fooCounter.inc();
  fooCounter.inc();
  barCounter.inc();
  barCounter.rename('new bar');
  console.log(`${fooCounter.getName()} count is ${fooCounter.getCount()`); // "foo count is 2"
  console.log(`${barCounter.getName()} count is ${barCounter.getCount()`); // "new bar count is 1"
```

Additional important details:

- The set of state properties is determined by the `init` function.  The properties that exist when `init` returns _are_ the properties of the object.  State properties cannot thereafter be added or removed.

- The values a state property may take are limited to things that are serializable and which may be hardened (and, in fact, _are_ hardened and serialized the moment they are assigned).  That is, you can replace what value a state property _has_, but you cannot modify a state property's value in situ.  In other words, you can do things like:

  `state.zot = [1, 2, 3];`

  but you can't do things like:

  `state.zot.push(4);`

- A virtual object can be passed as a parameter in messages to other vats.  It will be passed by presence, just like any other non-data object you might send in a message parameter.

- A virtual object's state may include references to other virtual objects. The latter objects will be persisted separately and only deserialized as needed, so "swapping in" a virtual object that references other virtual objects does not entail swapping in the entire associated object graph.

- The `self` object returned by the `instanceKitMaker` function _is_ the in-memory representation of the virtual object, so you can capture it inside any of the body methods (as well as the `init` function) in order to pass the virtual object to somebody else.  So you can write things like the following:

```javascript
  function thingKitMaker(state) {
    const self = Far('thing', {
      sendMeTo(somebodyElse) {
        somebodyElse.hereIAm(self);
      },
      ... // and so on
    });
    function init(someParam) {
      otherObject.doSomethingWithMe(self, someParam);
      state.foo = 47;
    },
    return { init, self };
  }
```

- As illustrated above, the `self` object must be made `Far`, since it will be subject to serialization.
