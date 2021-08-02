// @ts-check

const { details: X, quote: q } = assert;
const { ownKeys } = Reflect;

/**
 * The well known symbols are static symbol values on the `Symbol` constructor.
 */
const wellKnownSymbolNames = new Map(
  ownKeys(Symbol)
    .filter(
      name => typeof name === 'string' && typeof Symbol[name] === 'symbol',
    )
    .filter(name => {
      // @ts-ignore It doesn't know name cannot be a symbol
      assert(!name.startsWith('@@'), X``);
      return true;
    })
    // @ts-ignore It doesn't know name cannot be a symbol
    .map(name => [Symbol[name], `@@${name}`]),
);

export const isPassableSymbol = sym =>
  typeof sym === 'symbol' &&
  (typeof Symbol.keyFor(sym) === 'string' || wellKnownSymbolNames.has(sym));
harden(isPassableSymbol);

export const assertPassableSymbol = sym =>
  assert(
    isPassableSymbol(sym),
    X`Only registered symbols or well-known symbols are passable: ${q(sym)}`,
  );
harden(assertPassableSymbol);

export const nameForPassableSymbol = sym => {
  const name = Symbol.keyFor(sym);
  if (name === undefined) {
    return wellKnownSymbolNames.get(sym);
  }
  if (name.startsWith('@@')) {
    // Hilbert hotel
    return `@@${name}`;
  }
  return name;
};
harden(nameForPassableSymbol);

export const AtAtPrefixPattern = /@@(.*)/;
harden(AtAtPrefixPattern);

export const passableSymbolForName = name => {
  if (typeof name !== 'string') {
    return undefined;
  }
  const match = AtAtPrefixPattern.exec(name);
  if (match) {
    const suffix = match[1];
    if (suffix.startsWith('@@')) {
      return Symbol.for(suffix);
    } else {
      const sym = Symbol[suffix];
      if (typeof sym === 'symbol') {
        return sym;
      }
      assert.fail(X`Reserved for well known symbol ${q(suffix)}: ${q(name)}`);
    }
  }
  return Symbol.for(name);
};
harden(passableSymbolForName);
