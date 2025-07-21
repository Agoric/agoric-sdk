import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { config } from 'dotenv';
import { stringToPath } from '@cosmjs/crypto';
import { boardSlottingMarshaller } from '@agoric/internal/src/marshal.js';
import { execa } from 'execa';
import fs from 'fs/promises';
import {
  makeAgoricNames,
  makeFromBoard,
  makeVStorage,
} from '@agoric/client-utils';

config();

export const getSigner = async () => {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error('Mnemonic not found in environment variables.');
    process.exit(1);
  }
  const Agoric = {
    Bech32MainPrefix: 'agoric',
    CoinType: 564,
  };
  const hdPath = (coinType = 118, account = 0) =>
    stringToPath(`m/44'/${coinType}'/${account}'/0/0`);

  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: Agoric.Bech32MainPrefix,
    hdPaths: [hdPath(Agoric.CoinType, 0), hdPath(Agoric.CoinType, 1)],
  });
};

export const getSignerWallet = async ({ prefix }) => {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error('Mnemonic not found in environment variables.');
    process.exit(1);
  }

  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix,
  });
};

const writeOfferToFile = async ({ OFFER_FILE, offer }) => {
  await fs.writeFile(OFFER_FILE, JSON.stringify(offer, null, 2));
  console.log(`Written ${OFFER_FILE}`);
};

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
  await writeOfferToFile({ offer, OFFER_FILE });

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
  brandName?: string;
  amount?: bigint;
  offerArgs: object;
  emptyProposal?: boolean;
};

export const prepareOffer = async ({
  instanceName,
  source,
  publicInvitationMaker,
  brandName,
  amount,
  offerArgs = {},
  emptyProposal = false,
}: PrepareOfferParams) => {
  if (!instanceName) throw new Error('instanceName is required');
  if (!source) throw new Error('source is required');

  const LOCAL_CONFIG = {
    rpcAddrs: ['https://devnet.rpc.agoric.net:443'],
    chainName: 'agoricdev-25',
  };

  const vstorage = makeVStorage({ fetch }, LOCAL_CONFIG);
  const fromBoard = makeFromBoard();
  const { brand, instance } = await makeAgoricNames(fromBoard, vstorage);

  const offerId = `offer-${Date.now()}`;

  const invitationSpec = {
    ...(publicInvitationMaker && { publicInvitationMaker }),
    source,
    instance: instance[instanceName],
  };

  const proposal =
    emptyProposal || !amount || !brandName
      ? {}
      : {
          give: {
            [brandName]: {
              brand: brand[brandName],
              value: amount,
            },
          },
        };

  const body = {
    method: 'executeOffer',
    offer: {
      id: offerId,
      invitationSpec,
      offerArgs: { ...offerArgs },
      proposal,
    },
  };

  const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);
  // @ts-expect-error - body structure is correct but TypeScript can't verify it's Passable
  return marshaller.toCapData(harden(body));
};
