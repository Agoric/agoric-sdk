const harden = require('@agoric/harden');

export default function setup(_syscall, _state, _helpers, _endowments) {
  const dispatch = harden({
    invoke(_target, _method, _argsData, _argsSlots) {
      const args = '';
      const slots = [];
      return { args, slots };
    },
    getState() {
      return '';
    },
  });
  return dispatch;
}
