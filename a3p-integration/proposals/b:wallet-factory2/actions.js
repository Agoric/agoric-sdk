import { promises as fs } from 'fs';

import { agd, agops } from '@agoric/synthetic-chain/src/lib/cliHelper.js';
import { HOME, ATOM_DENOM } from '@agoric/synthetic-chain/src/lib/constants.js';
import {
  waitForBlock,
  executeOffer,
  getUser,
  provisionSmartWallet,
} from '@agoric/synthetic-chain/src/lib/commonUpgradeHelpers.js';

export const provisionWallet = async user => {
  const userKeyData = await agd.keys('add', user, '--keyring-backend=test');
  await fs.writeFile(`${HOME}/.agoric/${user}.key`, userKeyData.mnemonic);

  const userAddress = await getUser(user);

  await provisionSmartWallet(
    userAddress,
    `20000000ubld,100000000${ATOM_DENOM}`,
  );
  await waitForBlock();
};

export const pushPrice = (oracles, price = 10.0) => {
  console.log(`ACTIONS pushPrice ${price}`);
  const promiseArray = [];

  for (const oracle of oracles) {
    console.log(`Pushing Price from oracle ${oracle.address}`);

    promiseArray.push(
      executeOffer(
        oracle.address,
        agops.oracle(
          'pushPriceRound',
          '--price',
          price,
          '--oracleAdminAcceptOfferId',
          oracle.id,
        ),
      ),
    );
  }

  return Promise.all(promiseArray);
};
