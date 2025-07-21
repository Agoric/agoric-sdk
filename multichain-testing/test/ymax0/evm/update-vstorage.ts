import { prepareOffer, makeOffer } from './utils.ts';

const OFFER_FILE = 'offer.json';
const CONTAINER_PATH = `/usr/src/${OFFER_FILE}`;
const FROM_ADDRESS = 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q';

/**
 * Updates vstorage on the Agoric chain by making an offer to the `resolverMock` contract on devnet.
 *
 * This function prepares an offer using the `vPusherInvitation` and sends it via the
 * specified container and address. It is used to insert dummy or test data
 * into vstorage for testing purposes.
 *
 * Requirements:
 * - The local A3P chain must be running.
 */
export const updateVStorage = async ({ vPath, vData }) => {
  try {
    console.log('Preparing offer...');
    const offer = await prepareOffer({
      publicInvitationMaker: 'vPusherInvitation',
      instanceName: 'resolverMock',
      emptyProposal: true,
      source: 'contract',
      offerArgs: {
        vPath,
        vData,
      },
    });

    await makeOffer({
      offer,
      OFFER_FILE,
      CONTAINER_PATH,
      FROM_ADDRESS,
    });
  } catch (err) {
    console.error('ERROR:', err.shortMessage || err.message);
    process.exit(1);
  }
};
