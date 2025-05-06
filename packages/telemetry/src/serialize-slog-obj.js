export const serializeSlogObj = slogObj =>
  JSON.stringify(slogObj, (_, arg) =>
    typeof arg === 'bigint' ? Number(arg) : arg,
  );
