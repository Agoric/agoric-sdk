// @ts-check

const { details: X, quote: q } = assert;

/**
 * @returns {{getTime: () => Timestamp, updateTime: (currentTime:
 * Timestamp) => void}}
 */
const makeStoredTime = () => {
  let storedTime = 0n;

  const getTime = () => storedTime;

  const updateTime = currentTime => {
    assert(
      currentTime >= storedTime,
      X`The currentTime ${q(
        currentTime,
      )} must be greater than or equal to the last recorded time ${q(
        storedTime,
      )}`,
    );
    storedTime = currentTime;
  };

  return harden({
    getTime,
    updateTime,
  });
};
harden(makeStoredTime);
export { makeStoredTime };
