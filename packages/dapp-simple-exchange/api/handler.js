import harden from '@agoric/harden';

export default harden((_terms, _inviteMaker) => {
  return harden({
    getCommandHandler() {
      return harden({
        processInbound(obj, _home) {
          switch (obj.type) {
            case '@DIR@Message': {
              return harden({ type: '@DIR@Response', orig: obj });
            }
            default:
              return undefined;
          }
        },
      });
    },
  });
});
