/**
 * Execute one step of iteration over a range of vatstore keys.
 *
 * @param {string} [foo='hi']
 * @param {string} vatID  The vat whose vatstore is being iterated
 * @param {string} priorKey  The key that was returned by the prior cycle of
 *   the iteration, or '' if this is the first cycle
 * @param {string} lowerBound  The lower bound of the iteration range
 * @param {string} [upperBound]  The uppper bound of the iteration range.  If
 *   omitted, this defaults to a string equivalent to the `lowerBound` string
 *   with its rightmost character replaced by the lexically next character.
 *   For example, if `lowerBound` is 'hello', then `upperBound` would default
 *   to 'hellp')
 *
 * @returns {['ok', [string, string]|[undefined, undefined]]} A pair of a
 *   status code and a result value.  In the case of this operation, the
 *   status code is always 'ok'.  The result value is a pair of the key and
 *   value of the first vatstore entry whose key is lexically greater than
 *   both `priorKey` and `lowerBound`.  If there are no such entries or if the
 *   first such entry has a key that is lexically greater than or equal to
 *   `upperBound`, then result value is a pair of undefineds instead,
 *   signalling the end of iteration.
 *
 * Usage notes:
 *
 * Iteration is accomplished by repeatedly calling `vatstoreGetAfter` in a
 * loop, each time pass the key that was returned in the previous iteration,
 * until undefined is returned.  While the initial value for `priorKey` is
 * conventionally the empty string, in fact any value that is less than
 * `lowerBound` may be used to the same effect.
 *
 * Keys in the vatstore are arbitrary strings, but subsets of the keyspace are
 * often organized hierarchically.  This iteration API allows simple iteration
 * over an explicit key range or iteration over the set of keys with a given
 * prefix, depending on how you use it:
 *
 * Explicitly providing both a lower and an upper bound will enable iteration
 * over the key range `lowerBound` <= key < `upperBound`
 *
 * Providing only the lower bound while letting the upper bound default will
 * iterate over all keys that have `lowerBound` as a prefix.
 *
 * For example, if the stored keys are:
 * bar
 * baz
 * foocount
 * foopriority
 * joober
 * plugh.3
 * plugh.47
 * plugh.8
 * zot
 *
 * Then the bounds    would iterate over the key sequence
 * ----------------   -----------------------------------
 * 'bar', 'goomba'    bar, baz, foocount, foopriority
 * 'bar', 'joober'    bar, baz, foocount, foopriority
 * 'foo'              foocount, foopriority
 * 'plugh.'           plugh.3, plugh.47, plugh.8
 * 'baz', 'plugh'     baz, foocount, foopriority, joober
 * 'bar', '~'         bar, baz, foocount, foopriority, joober, plugh.3, plugh.47, plugh.8, zot
 */
function vatstoreGetAfter(vatID, priorKey, lowerBound, upperBound) {}
