import harden from '@agoric/harden';

export default harden((terms, _inviteMaker) => {
  return harden({
    getCommandHandler() {
      return harden({
        processInbound(obj, home) {
          switch (obj.type) {
            case '@DIR@Message': {
              return harden({type: '@DIR@Response', orig: obj});
            }
          }
          return undefined;
        },
      });
    }
  });
});
