// @ts-check
import { Far } from '@endo/far';

export const makeJsonRPCInterceptor = dispatch => {
  const idToInterceptor = new Map();
  const service = Far('jsonRPCInterceptor', {
    resolve(res) {
      for (const [id, interceptor] of idToInterceptor.entries()) {
        idToInterceptor.delete(id);
        interceptor({ id, result: String(res) });
      }
    },
    reject(rej) {
      for (const [id, interceptor] of idToInterceptor.entries()) {
        idToInterceptor.delete(id);
        interceptor({ id, error: String((rej && rej.stack) || rej) });
      }
    },
    handler(line) {
      const obj = JSON.parse(line);

      if (!('method' in obj)) {
        const { id } = obj;
        const interceptor = idToInterceptor.get(id);
        if (interceptor) {
          idToInterceptor.delete(id);
          interceptor(obj);
          return;
        }
      }

      // Just use the default dispatch.
      dispatch(obj);
    },
    interceptId(id, interceptor) {
      if (idToInterceptor.has(id)) {
        throw Error(`Duplicate reply interceptor for id ${id}`);
      }
      idToInterceptor.set(id, interceptor);
    },
  });

  return service;
};
