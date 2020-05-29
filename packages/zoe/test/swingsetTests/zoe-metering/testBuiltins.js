import harden from '@agoric/harden';

export const makeContract = zcf => {
  const invite = zcf.makeInvitation(() => {}, 'tester');
  zcf.initPublicAPI(
    harden({
      doTest: () => {
        new Array(1e7).map(Object.create);
      },
    }),
  );
  return invite;
};
