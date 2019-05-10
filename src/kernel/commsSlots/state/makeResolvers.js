export function makeResolvers() {
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
    dump() {
      return promiseToResolver;
    },
  };
}
