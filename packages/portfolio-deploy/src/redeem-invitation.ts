/** @file redeem a privileged invitation from a wallet */
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';

const options = {
  contract: { type: 'string', default: 'ymax0' },
  description: { type: 'string' },
  'save-as': { type: 'string' },
  'no-save': { type: 'boolean', default: false },
  'mnemonic-env': { type: 'string' },
} as const;

const getMnemonicEnv = (description: string, explicit?: string): string =>
  explicit ||
  (description.includes('evmWalletHandler')
    ? 'MNEMONIC_EVM_MESSAGE_HANDLER'
    : 'MNEMONIC');

const redeemInvitation = async ({
  scriptArgs,
  walletKit,
  makeAccount,
}: RunTools) => {
  const { values } = parseArgs({ args: scriptArgs, options });
  const {
    contract,
    description,
    'save-as': saveAs,
    'no-save': noSave,
    'mnemonic-env': explicitMnemonicEnv,
  } = values;
  if (!description) throw Error('--description missing');

  const mnemonicEnv = getMnemonicEnv(description, explicitMnemonicEnv);
  const account = await makeAccount(mnemonicEnv);
  const { [contract]: instance } = walletKit.agoricNames.instance;
  if (!instance) throw Error(`contract? ${contract}`);

  if (noSave) {
    const id = `redeem-${new Date().toISOString()}`;
    await account.sendBridgeAction({
      method: 'executeOffer',
      offer: {
        id,
        invitationSpec: { source: 'purse', description, instance },
        proposal: {},
      },
    });
    await account.pollOffer(account.address, id, undefined, true);
    return;
  }

  const defaultSaveAs = description.replace(/^deliver /, '');
  await account.store.saveOfferResult(
    { instance, description },
    saveAs || defaultSaveAs,
  );
};

export default redeemInvitation;
