import { E } from '@endo/far';
import deployConfig from './deploy-config.js';

const deployIbcSendIst = async homeP => {
  const {
    agoricNames,
    scratch,
    wallet,
    zoe,
  } = E.get(homeP);

  console.log('Fetching pegasus publicFacet, ist peg and walletBridge...');
  const pegasusInstanceP = E(agoricNames).lookup('instance', 'Pegasus');

  const [pegPF, istPeg, walletBridge] = await Promise.all([
    E(zoe).getPublicFacet(pegasusInstanceP),
    E(scratch).get(deployConfig.agoric.localPegId),
    E(wallet).getBridge(),
  ]);

  const transferInvitation = E(pegPF).makeInvitationToTransfer(
    istPeg,
    deployConfig.cosmos.address
  );

  const offerConfig = {
    invitation: transferInvitation,
    id: `${Date.now()}`,
    proposalTemplate: {
      give: {
        Transfer: {
          pursePetname: 'Agoric stable token',
          value: 333333333n,
        }
      }
    }
  };

  console.log('Making the offer to send IST to CosmosHub...');
  await E(walletBridge).addOffer(offerConfig);

  console.log('Please check your wallet UI to approve the offer.')
};

export default deployIbcSendIst;