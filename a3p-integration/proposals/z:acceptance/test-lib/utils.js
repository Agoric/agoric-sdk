import { makeAgd, agops } from '@agoric/synthetic-chain';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

/**
 * @param {string} fileName base file name without .tjs extension
 * @param {Record<string, string>} replacements
 */
export const replaceTemplateValuesInFile = async (fileName, replacements) => {
  let script = await readFile(`${fileName}.tjs`, 'utf-8');
  for (const [template, value] of Object.entries(replacements)) {
    script = script.replaceAll(`{{${template}}}`, value);
  }
  await writeFile(`${fileName}.js`, script);
};

const showAndExec = (file, args, opts) => {
  console.log('$', file, ...args);
  return execFileSync(file, args, opts);
};

// @ts-expect-error string is not assignable to Buffer
export const agd = makeAgd({ execFileSync: showAndExec }).withOpts({
  keyringBackend: 'test',
});

/**
 * @param {string[]} addresses
 * @param {string} [targetDenom]
 */
export const getBalances = async (addresses, targetDenom = undefined) => {
  const balancesList = await Promise.all(
    addresses.map(async address => {
      const { balances } = await agd.query(['bank', 'balances', address]);

      if (targetDenom) {
        const balance = balances.find(({ denom }) => denom === targetDenom);
        return balance ? BigInt(balance.amount) : undefined;
      }

      return balances;
    }),
  );

  return addresses.length === 1 ? balancesList[0] : balancesList;
};

export const agopsVaults = async addr =>
  await agops.vaults('list', '--from', addr);
