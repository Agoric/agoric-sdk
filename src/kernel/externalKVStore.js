import stringify from './json-stable-stringify';

// This is the 'kvstore' API. It provides a tree structure in which each node
// has get()/set()/has() calls that accept child names (always a string).
// Each node also has keys()/entries()/values() methods which return a
// list/iterator of child names/nodes, and size() which counts them.

// The value at each leaf node can be arbitrary JSON-able data. If a getter
// accesses a value which is actually an intermediate node (not a leaf node),
// the return value will be a 'kvstore'-API wrapped around that intermediate
// node (so root.get('child1').get('child2') retrieves a grandchild value).
// Likewise you can create an intermediate node by passing a kvstore-API
// object into a setter.

// Internally, this wraps a backing-store object (here named "ES") with the
// "externalStorage" API, and emulates the tree structure. Each path in the
// tree is mapped to a dot-separated pathname. Intermediate nodes are written
// to the externalStorage with a special value of "kvstore", so when ES.get()
// returns "kvstore", this get() returns a new kvstore-API object (which
// internally remembers the path prefix string).

// The externalStorage API consists of an object with a single "sendMsg()"
// method that accepts one string and returns a string. The argument must be
// the JSON serialization of a record with {method, key, value}. The method
// (get/set/etc) will match the kvstore-API method name.

// externalStorage provides a tree structure, but unlike kvstore:
// * all nodes have a value, not just leaf nodes
// * values must be strings, and cannot be arbitrary objects
// * the tree can only be entered from the root, so all keys passed into
//   externalStorage are fully-qualified dot-separated strings (foo.bar.baz,
//   foo.bar.boz). The keys/entries getters single-hop child names, so
//   keys(foo.bar) would return [baz,boz] instead of [foo.bar.baz,
//   foo.bar.boz].

// As a result, key passed to externalStorage will be a dot-separated
// pathname, formed by joining the prefix (which each kvstore remembers
// internally) with the child name given to the kvstore-API 'key' argument.

// The value, if present, is the JSON encoding of the kvstore-API 'value'
// argument (hence all values will be double-encoded in the argument of
// sendMsg). The special 'kvstore' marker is *not* encoded, so it can be
// distinguished from values which are actually strings. So a value of
// 'kvstore' means an intermediate node, '"kvstore"' is an actual string, and
// '[]' is e.g. an array.

// The return value of sendMsg() is always a string, but
// keys()/values()/entries() will return a list, and has() returns a boolean,
// so the result must be JSON-decoded. Additionally, anything which is a
// value must be decoded (again) to honor the kvstore-API in which values are
// arbitrary objects. So the value returned by get() must be decoded twice.

// constraints:
// * Previous data structures used Maps, so e.g. integer promiseIDs could be
//   used as keys into the kernel promise table. In the kvstore-API, keys
//   must be strings, so the kernel must stringify the (integer) promiseID
//   before using it as a key.
// * sendMsg() is designed to cross the kernel-realm/primal-realm boundary,
//   hence is implemented in terms of strings
// * The kernel data structures would be annoying to manage without a
//   hierarchy. In particular, we need to iterate over the lists of vats and
//   devices when resuming from state, and kernel.dump() wants to iterate
//   over the promise and vat-clist tables.
// * The cosmos-sdk backing store (effectively) offers only a single kvstore,
//   so our hierarchy must be mapped to single strings. (cosmos-sdk's Storage
//   database is a single flat string-to-string map, but they implement a
//   prefix scheme similar to ours which provides nested sections, and
//   different Keepers can withhold access to different portions)
// * The cosmos-sdk storage values must be strings, but kvstore-API takes
//   arbitrary objects (e.g. nextPromiseID is an integer), so we must encode
//   all values before sending them downstairs, and decode them on the way
//   up. The magic value "kvstore" (a 7-letter string starting with 'k') is
//   used to recognize intermediate nodes.
// * When get() in our cosmos-sdk storage manager (storage.go) does not find
//   the key, it returns an empty string instead of undefined. get() in
//   stateInMemory.js/makeKVStore() returns undefined (like normal JS
//   objects), which is not JSON-serializable (it causes JSON.stringify to
//   return undefined, which is not a string). We arrange for both to return
//   null instead.

// TODO: all calls to external.sendMsg must be guarded with try, and the
// catch() must throw a new exception with only stringified pieces of the
// original, to prevent kernel-side code from getting access to a
// primal-realm exception object. It must also check that all return values
// are strings and not something more sinister. In fact, makeExternalKVStore
// should be given a safe object, and the wrapping should happen elsewhere.

function insistString(s, msg) {
  if (`${s}` !== s) {
    console.log(`${msg} must be string, but was '${s}'`, s, typeof s);
    throw new Error(`${msg} must be string, not '${s}'`);
  }
}

export default function makeExternalKVStore(pathToRoot, external) {
  // kvstore has set, get, has, delete methods
  // set (key []byte, value []byte)
  // get (key []byte)  => value []byte
  // has (key []byte) => exists bool
  // delete (key []byte)
  // iterator, reverseIterator

  return {
    get(key) {
      insistString(key, `externalKVstore.get(root=${pathToRoot}) key`);
      const msg = stringify({
        method: 'get',
        key: `${pathToRoot}.${key}`,
      });
      const retStr = external.sendMsg(msg);
      //console.log(`exKVs.get(${pathToRoot}.${key}) got`, retStr, typeof retStr);
      // every sendMsg response is JSON-encoded
      const encodedValue = JSON.parse(retStr);
      if (encodedValue === 'kvstore') {
        return makeExternalKVStore(`${pathToRoot}.${key}`, external);
      }
      // if it isn't a kvstore, the 'value' we get from get() is also
      // JSON-encoded
      const value = JSON.parse(encodedValue);
      return value;
    },

    set(key, value) {
      insistString(key, `externalKVstore.set(root=${pathToRoot}) key`);
      let encodedValue;
      if (value.get) {
        // is a kvstore itself
        encodedValue = 'kvstore';
      } else {
        encodedValue = stringify(value);
        // note that value=(a kvstore) means encodedValue='kvstore', while
        // value='kvstore' means encodedValue='"kvstore"', so we can tell
        // them apart
      }

      //console.log(`external.set(${key})`, typeof key);
      if (key.indexOf('vats') !== -1) {
        //console.log(`external.set(${key}) encoding ${value} into ${encodedValue}`);
      }
      const msg = stringify({
        method: 'set',
        key: `${pathToRoot}.${key}`,
        value: encodedValue,
      });
      return external.sendMsg(msg);
    },

    has(key) {
      insistString(key, `externalKVstore.has(root=${pathToRoot}) key`);
      //console.log(`external.has(${key})`, typeof key);
      const msg = stringify({
        method: 'has',
        key: `${pathToRoot}.${key}`,
      });

      const retStr = external.sendMsg(msg);
      const ret = JSON.parse(retStr);
      if (Boolean(ret) !== ret) {
        throw new Error(`has(${pathToRoot}.${key} got non-boolean ${ret}`);
      }
      return ret;
    },

    keys() {
      const msg = stringify({
        method: 'keys',
        key: `${pathToRoot}`,
      });
      const retStr = external.sendMsg(msg);
      const keys = JSON.parse(retStr);
      return keys;
    },

    entries() {
      const msg = stringify({
        method: 'entries',
        key: `${pathToRoot}`,
      });
      const retStr = external.sendMsg(msg);
      const entries = JSON.parse(retStr);
      const results = [];
      for (const entry of entries) {
        const encodedValue = entry.value;
        if (encodedValue === 'kvstore') {
          results.push({
            key: entry.key,
            value: makeExternalKVStore(`${pathToRoot}.${entry.key}`, external),
          });
        } else {
          const value = JSON.parse(encodedValue);
          results.push({ key: entry.key, value });
        }
      }
      return results;
    },

    values() {
      // note: when the value indicates an intermediate node, we need to know
      // it's key so we can construct the new kvstore object. So we use
      // method=entries instead of method=values.
      const msg = stringify({
        method: 'entries',
        key: `${pathToRoot}`,
      });
      const retStr = external.sendMsg(msg);
      const values = [];
      const entries = JSON.parse(retStr);
      for (const entry of entries) {
        const encodedValue = entry.value;
        if (encodedValue === 'kvstore') {
          values.push(
            makeExternalKVStore(`${pathToRoot}.${entry.key}`, external),
          );
        } else {
          const value = JSON.parse(encodedValue);
          values.push(value);
        }
      }
      return values;
    },

    size() {
      const msg = stringify({
        method: 'size',
        key: `${pathToRoot}`,
      });
      const retStr = external.sendMsg(msg);
      const size = JSON.parse(retStr);
      return size;
    },
  };
}
