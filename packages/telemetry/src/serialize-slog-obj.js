const { hasOwn } = Object;

const replacer = (_key, value) => {
  switch (typeof value) {
    case 'object': {
      if (value instanceof Error) {
        const obj = { error: value.name, message: value.message };
        if (hasOwn(value, 'cause')) obj.cause = replacer('', value.cause);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TS2339 property "errors" is only on AggregateError
        if (hasOwn(value, 'errors')) obj.errors = replacer('', value.errors);
        const stack = value.stack;
        if (stack) obj.stack = stack;
        return obj;
      }
      break;
    }
    case 'bigint':
      return Number(value);
    default:
      break;
  }
  return value;
};

export const serializeSlogObj = slogObj => JSON.stringify(slogObj, replacer);
