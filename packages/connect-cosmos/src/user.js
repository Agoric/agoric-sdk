import { E } from '@agoric/eventual-send';

import crypto from 'crypto';
import * as bip39 from 'bip39';

export const makeUser = ({ console }) => {
  let mnemonicP;
  return harden({
    async recoverOrGenerateMnemonic(user, entropyBits) {
      if (mnemonicP) {
        return mnemonicP;
      }
      mnemonicP = E(user).generateMnemonic(user, entropyBits);
      const mnemonic = await mnemonicP;
      await E(user).notifyMnemonic(user, mnemonic);
      return mnemonicP;
    },

    async notifyMnemonic(_user, mnemonic) {
      console.warn(`\

vvvvvvvvvvvvvv
**Important** write this mnemonic phrase in a safe place.
It is the only way to recover your account if you ever forget your password.

${mnemonic}
^^^^^^^^^^^^^^
`);
    },

    async generateMnemonic(user, entropyBits) {
      /** @type {Buffer} */
      const entropy = await new Promise((resolve, reject) =>
        crypto.randomBytes(Math.ceil(entropyBits / 8), (err, buf) => {
          if (err) {
            return reject(err);
          }
          return resolve(buf);
        }),
      );
      const mnemonic = bip39.entropyToMnemonic(entropy);
      return mnemonic;
    },
  });
};
