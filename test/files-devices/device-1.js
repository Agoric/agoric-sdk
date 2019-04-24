const harden = require('@agoric/harden');

export default function setup(syscall, helpers, _endowments) {
  const { log } = helpers;
  const dispatch = harden({
    invoke(targetID, method, _argsData, _argsSlots) {
      log(`invoke ${targetID} ${method}`);
      const data = '{}';
      const slots = [];
      return { data, slots };
    },
    getState() {
      return '';
    },
  });
  return dispatch;
}
