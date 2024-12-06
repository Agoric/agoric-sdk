/**
 * @import {Command} from 'commander';
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 * @import {ExecuteOfferAction} from '@agoric/smart-wallet/src/smartWallet.js';
 */

import { fetchEnvNetworkConfig, makeVstorageKit } from '@agoric/client-utils';
import { Nat } from '@endo/nat';
import { InvalidArgumentError } from 'commander';
import { outputActionAndHint } from './bridge-action.js';

/** @param {string} arg */
const parseNat = arg => {
  try {
    const n = Nat(BigInt(arg));
    return n;
  } catch {
    throw new InvalidArgumentError('Not a number');
  }
};

/**
 * @param {Command} program
 * @param {{
 *   fetch?: Window['fetch'];
 *   vstorageKit?: Awaited<ReturnType<typeof makeVstorageKit>>;
 *   stdout: typeof process.stdout;
 *   stderr: typeof process.stderr;
 *   env: typeof process.env;
 *   now: typeof Date.now;
 * }} io
 */
export const addLPCommands = (
  program,
  { fetch, vstorageKit, stderr, stdout, env, now },
) => {
  const operator = program
    .command('lp')
    .description('Liquidity Provider commands');

  const loadVsk = async () => {
    if (vstorageKit) {
      return vstorageKit;
    }
    assert(fetch);
    const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
    return makeVstorageKit({ fetch }, networkConfig);
  };
  /** @type {undefined | ReturnType<typeof loadVsk>} */
  let vskP;

  operator
    .command('deposit')
    .description('Deposit USDC into pool')
    .addHelpText(
      'after',
      '\nPipe the STDOUT to a file such as deposit.json, then use the Agoric CLI to broadcast it:\n  agoric wallet send --offer accept.json --from gov1 --keyring-backend="test"',
    )
    .requiredOption('--amount <number>', 'uUSDC amount', parseNat)
    .option('--offerId <string>', 'Offer id', String, `lpDeposit-${now()}`)
    .action(async opts => {
      vskP ||= loadVsk();
      const vsk = await vskP;

      /** @type {Brand<'nat'>} */
      // @ts-expect-error it doesnt recognize usdc as a Brand type
      const usdc = vsk.agoricNames.brand.USDC;
      assert(usdc, 'USDC brand not in agoricNames');

      /** @type {OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['fastUsdc'],
          callPipe: [['makeDepositInvitation', []]],
        },
        proposal: {
          give: {
            USDC: { brand: usdc, value: opts.amount },
          },
        },
      };

      /** @type {ExecuteOfferAction} */
      const bridgeAction = {
        method: 'executeOffer',
        offer,
      };

      outputActionAndHint(bridgeAction, { stderr, stdout }, vsk.marshaller);
    });

  operator
    .command('withdraw')
    .description("Withdraw USDC from the LP's pool share")
    .addHelpText(
      'after',
      '\nPipe the STDOUT to a file such as withdraw.json, then use the Agoric CLI to broadcast it:\n  agoric wallet send --offer accept.json --from gov1 --keyring-backend="test"',
    )
    .requiredOption('--amount <number>', 'FastLP amount', parseNat)
    .option('--offerId <string>', 'Offer id', String, `lpWithdraw-${now()}`)
    .action(async opts => {
      vskP ||= loadVsk();
      const vsk = await vskP;

      /** @type {Brand<'nat'>} */
      // @ts-expect-error it doesnt recognize usdc as a Brand type
      const poolShare = vsk.agoricNames.brand.FastLP;
      assert(poolShare, 'FastLP brand not in agoricNames');

      /** @type {OfferSpec} */
      const offer = {
        id: opts.offerId,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: ['fastUsdc'],
          callPipe: [['makeWithdrawInvitation', []]],
        },
        proposal: {
          give: {
            PoolShare: { brand: poolShare, value: opts.amount },
          },
        },
      };

      outputActionAndHint(
        { method: 'executeOffer', offer },
        { stderr, stdout },
        vsk.marshaller,
      );
    });

  return operator;
};
