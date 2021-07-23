// @ts-check

/**
 * @returns {{getTime: () => Timestamp, updateTime: (currentTime:
 * Timestamp) => void}}
 */
const makeStoredTime = () => {
  let storedTime = 0n;

  const getTime = () => storedTime;

  const updateTime = currentTime => {
    assert.typeof(currentTime, 'bigint');
    if (currentTime > storedTime) {
      storedTime = currentTime;
    }
  };

  return harden({
    getTime,
    updateTime,
  });
};
harden(makeStoredTime);
export { makeStoredTime };
