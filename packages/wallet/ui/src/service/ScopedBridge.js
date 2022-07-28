import { makeFollower } from '@agoric/casting';
import { Far } from '@endo/captp';

export const getScopedBridge = (origin, suggestedDappPetname, bridge) => {
  const {
    getPursesNotifier,
    getOffersNotifier,
    dappService,
    leader,
    unserializer,
  } = bridge;

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
    async addOffer(offer) {
      await dapp.approvedP;
      console.log('TODO: implement add offer', offer);
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
      return getOffersNotifier();
    },
    async makeFollower(spec) {
      await dapp.approvedP;
      return makeFollower(spec, leader, { unserializer });
    },
  });
};
