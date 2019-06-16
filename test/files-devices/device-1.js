const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers, endowments) {
  const { log } = helpers;
  const dispatch = harden({
    invoke(targetID, method, _argsData, _argsSlots) {
      log(`invoke ${targetID} ${method}`);
      endowments.shared.push('pushed');
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
