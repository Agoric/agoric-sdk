import { makeFollower } from '@agoric/casting';
import { Far } from '@endo/captp';

export const getScopedBridge = (origin, suggestedDappPetname, bridge) => {
  const { getPursesNotifier, dappService, offerService, leader, unserializer } =
    bridge;

  const { dapps, addDapp, setDappPetname, deleteDapp, enableDapp } =
    dappService;

  const setPetname = petname => setDappPetname(origin, petname);

  let dapp = dapps.get(origin);
  if (!dapp) {
    let enableAction;
    const approvedP = new Promise(res => {
      enableAction = () => {
        enableDapp(origin);
        res();
      };
    });

    dapp = {
      id: origin,
      meta: { id: origin },
      petname: suggestedDappPetname,
      origin,
      enable: false,
      actions: {
        enable: enableAction,
        setPetname,
        delete: () => deleteDapp(origin),
      },
      approvedP,
    };
    addDapp(dapp);
  }

  return Far('scoped bridge', {
    async addOffer(config) {
      const currentTime = new Date().getTime();
      const id = `${currentTime}`;
      await dapp.approvedP;
      offerService.addOffer({
        id,
        instancePetname: `instance@${config.instanceHandleBoardId}`,
        requestContext: { dappOrigin: origin, origin },
        meta: {
          id: `${currentTime}`,
          creationStamp: currentTime,
        },
        status: 'proposed',
        ...config,
      });
      return id;
    },
    async suggestIssuer(petname, boardId) {
      await dapp.approvedP;
      console.log('TODO: implement suggest issuer', petname, boardId);
    },
    async suggestInstallation(petname, boardId) {
      await dapp.approvedP;
      console.log('TODO: suggest installation', petname, boardId);
    },
    async suggestInstance(petname, boardId) {
      await dapp.approvedP;
      console.log('TODO: suggest instance', petname, boardId);
    },
    async getPursesNotifier() {
      await dapp.approvedP;
      // TODO: attenuate purses? maybe not needed if they're from follower
      return getPursesNotifier();
    },
    async getOffersNotifier() {
      await dapp.approvedP;
      // TODO: filter offers by dapp origin
      return offerService.notifier;
    },
    async makeFollower(spec) {
      await dapp.approvedP;
      return makeFollower(spec, leader, { unserializer });
    },
  });
};
