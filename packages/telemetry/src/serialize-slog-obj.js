const { hasOwn } = Object;

const replacer = (_key, value) => {
  switch (typeof value) {
    case 'object': {
      if (value instanceof Error) {
        // Represent each error as a serialization-friendly
        // { errorType, message, cause?, errors?, stack? } object
        // (itself subject to recursive replacement, particularly in `cause` and
        // `errors`).
        const obj = { errorType: value.name, message: value.message };
        if (hasOwn(value, 'cause')) obj.cause = value.cause;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TS2339 property "errors" is only on AggregateError
        if (hasOwn(value, 'errors')) obj.errors = value.errors;
        const stack = value.stack;
        if (stack) obj.stack = stack;
        return obj;
      }
      break;
    }
    case 'bigint':
      // Represent each bigint as a JSON-serializable number, accepting the
      // possible loss of precision.
      return Number(value);
    default:
      break;
  }
  return value;
};

export const serializeSlogObj = slogObj => JSON.stringify(slogObj, replacer);
