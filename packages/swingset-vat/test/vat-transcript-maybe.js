export default function setup(syscall, _state, _helpers, vatPowers) {
  let ephemeralCounter = 0;

  function dispatch(vatDeliverObject) {
    if (vatDeliverObject[0] === 'message') {
      ephemeralCounter += 1;
      let sturdyCounter = syscall.vatstoreGet('sturdyCounter');
      if (sturdyCounter) {
        sturdyCounter = Number(sturdyCounter) + 1;
      } else {
        sturdyCounter = 1;
      }
      syscall.vatstoreSet('sturdyCounter', `${sturdyCounter}`);
      vatPowers.testLog(
        `ephemeralCounter=${ephemeralCounter} sturdyCounter=${sturdyCounter}`,
      );
    }
  }
  return dispatch;
}
