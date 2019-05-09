export function makeResolvers() {
  const resolverToPromise = new Map();
  const promiseToResolver = new Map();

  return {
    add(promise, resolver) {
      promiseToResolver.set(promise, resolver);
      resolverToPromise.set(resolver, promise);
    },
    getResolver(promise) {
      return promiseToResolver.get(promise);
    },
    dump() {
      return promiseToResolver;
    },
  };
}
