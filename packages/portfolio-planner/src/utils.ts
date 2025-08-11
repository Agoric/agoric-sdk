import { config } from 'dotenv';
import { execa } from 'execa';
import { writeFile } from 'fs/promises';
import { makeAgoricNames, makeVstorageKit } from '@agoric/client-utils';

config();

const runCommand = async (command: string, { captureOutput = false } = {}) => {
  try {
    const result = await execa(`docker exec agoric ${command}`, {
      shell: true,
      stdio: captureOutput ? 'pipe' : 'inherit',
    });

    return captureOutput
      ? { stdout: result.stdout, stderr: result.stderr }
      : undefined;
  } catch (err) {
    console.error('❌ ERROR:', err);
    process.exit(1);
  }
};

const executeWalletAction = async ({ OFFER_FILE, FROM_ADDRESS }) => {
  const cmd = `agd tx swingset wallet-action "$(cat ${OFFER_FILE})" \
    --allow-spend \
    --from=${FROM_ADDRESS} \
    --keyring-backend=test \
    --chain-id=agoricdev-25 --node=https://devnet.rpc.agoric.net:443 -y`;
  return runCommand(cmd);
};

export const makeOffer = async ({
  offer,
  OFFER_FILE,
  CONTAINER_PATH,
  FROM_ADDRESS,
}) => {
  console.log('Writing offer to file...');
  await writeFile(OFFER_FILE, JSON.stringify(offer, null, 2));
  console.log(`Written ${OFFER_FILE}`);

  console.log('Copy offer file in container');
  await execa(`docker cp ${OFFER_FILE} agoric:${CONTAINER_PATH}`, {
    shell: true,
    stdio: 'inherit',
  });

  console.log('Executing wallet action...');
  await executeWalletAction({ OFFER_FILE, FROM_ADDRESS });
};

type PrepareOfferParams = {
  instanceName: string;
  source: string;
  publicInvitationMaker: string;
  offerArgs: object;
};

export const prepareOffer = async ({
  instanceName,
  source,
  publicInvitationMaker,
  offerArgs = {},
}: PrepareOfferParams) => {
  if (!instanceName) throw new Error('instanceName is required');
  if (!source) throw new Error('source is required');

  const CONFIG = {
    rpcAddrs: ['https://devnet.rpc.agoric.net:443'],
    chainName: 'agoricdev-25',
  };

  const { vstorage, fromBoard, marshaller } = makeVstorageKit(
    { fetch },
    CONFIG,
  );
  const { instance } = await makeAgoricNames(fromBoard, vstorage);

  const offerId = `offer-${Date.now()}`;

  const invitationSpec = {
    publicInvitationMaker,
    source,
    instance: instance[instanceName],
  };

  const body = {
    method: 'executeOffer',
    offer: {
      id: offerId,
      invitationSpec,
      offerArgs: { ...offerArgs },
      proposal: {},
    },
  };

  return marshaller.toCapData(harden(body));
};
