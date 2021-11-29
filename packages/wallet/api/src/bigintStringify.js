// A temporary measure only until we delete the
// inboxStateChangeHandler and purseStateChangeHandler which cannot
// deal with presences and use CapTP instead in all our dapps
// https://github.com/Agoric/agoric-sdk/issues/2510
export const bigintStringify = x =>
  JSON.stringify(x, (_key, value) => {
    if (typeof value !== 'bigint') {
      // If not a bigint, JSON.stringify as usual.
      return value;
    }
    if (value <= BigInt(Number.MAX_SAFE_INTEGER)) {
      // If the value can safely be represented as a number, do that
      return Number(value);
    }
    // It cannot safely be represented as a number, so represent it
    // as a string
    return value.toString();
  });
