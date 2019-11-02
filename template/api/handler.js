import harden from '@agoric/harden';

export default harden((terms, _inviteMaker) => {
  const {contracts} = terms;
  return harden({
    getCommandHandler() {
      return harden({
        processInbound(obj, home) {
          switch (obj.type) {
            case '@DIR@Message': {
              return harden({type: '@DIR@Response', orig: obj, contracts});
            }
          }
          return undefined;
        },
      });
    }
  });
});
