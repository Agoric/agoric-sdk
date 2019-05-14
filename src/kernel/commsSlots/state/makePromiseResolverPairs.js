export function makePromiseResolverPairs() {
  const resolverToPromise = new Map();
  const promiseToResolver = new Map();

  return {
    add(promise, resolver) {
      promiseToResolver.set(JSON.stringify(promise), resolver);
      resolverToPromise.set(JSON.stringify(resolver), promise);
    },
    getResolver(promise) {
      return promiseToResolver.get(JSON.stringify(promise));
    },
    getPromise(resolver) {
      return resolverToPromise.get(JSON.stringify(resolver));
    },
    dump() {
      return promiseToResolver;
    },
  };
}
