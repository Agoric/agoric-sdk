// @ts-check

/**
 * @template T,U
 * @param {Iterable<T>} baseIterable
 * @param {(value: T) => U} func
 * @returns {Iterable<U>}
 */
export const mapIterable = (baseIterable, func) =>
  /** @type {Iterable<U>} */
  harden({
    [Symbol.iterator]: () => {
      const baseIterator = baseIterable[Symbol.iterator]();
      return harden({
        next: () => {
          const { value: baseValue, done } = baseIterator.next();
          const value = done ? baseValue : func(baseValue);
          return harden({ value, done });
        },
      });
    },
  });
harden(mapIterable);

/**
 * @template T
 * @param {Iterable<T>} baseIterable
 * @param {(value: T) => boolean} pred
 * @returns {Iterable<T>}
 */
export const filterIterable = (baseIterable, pred) =>
  /** @type {Iterable<U>} */
  harden({
    [Symbol.iterator]: () => {
      const baseIterator = baseIterable[Symbol.iterator]();
      return harden({
        next: () => {
          for (;;) {
            const result = baseIterator.next();
            const { value, done } = result;
            if (done || pred(value)) {
              return result;
            }
          }
        },
      });
    },
  });
harden(filterIterable);
