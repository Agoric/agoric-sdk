import { makeTracer } from '@agoric/internal';
import type {
  CosmosChainAddress,
  OrchestrationAccount,
} from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import type { ZCF } from '@agoric/zoe';
import { Fail, q } from '@endo/errors';
import { YieldProtocol } from './constants.js';
import { MsgSwap } from '@agoric/cosmic-proto/noble/swap/v1/tx.js';
import { MsgUnlock } from '@agoric/cosmic-proto/noble/dollar/vaults/v1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';

const interfaceTODO = undefined;

const trace = makeTracer('PortExo');

type Accounts = {
  Aave: never; // TODO
  Compound: never; // TODO
  USDN: OrchestrationAccount<{ chainId: 'noble-any' }>;
};

const makeUnlockSwapMessages = (
  nobleAddr: CosmosChainAddress,
  amountValue: bigint,
  { poolId = 0n, denom = 'uusdn', denomTo = 'uusdc', vault = 1 } = {},
) => {
  const amount = `${amountValue}`;
  const msgUnlock = {
    signer: nobleAddr.value,
    vault,
    amount,
  };
  const msgSwap: MsgSwap = {
    signer: nobleAddr.value,
    amount: { denom, amount },
    routes: [{ poolId, denomTo }],
    min: { denom: denomTo, amount }, // XXX: min could use slippage logic
  };
  return { msgUnlock, msgSwap };
};

export const preparePortfolioKit = (zone: Zone, zcf: ZCF) =>
  zone.exoClassKit(
    'Portfolio',
    interfaceTODO,
    () =>
      ({
        USDN: undefined,
      }) as Partial<Accounts>,
    {
      keeper: {
        init<P extends YieldProtocol>(key: P, account: Accounts[P]) {
          this.state[key] = account;
          trace('stored', key, '=>', `${account}`);
        },
        getAccount<P extends YieldProtocol>(key: P) {
          const { [key]: account } = this.state;
          if (!account) throw Fail`not set: ${q(key)}`;
          return account;
        },
      },
      invitationMakers: {
        makeWithdrawInvitation() {
          return zcf.makeInvitation(
            async (_seat: ZCFSeat, offerArgs: { amountValue?: bigint } = {}) => {
              const key = 'USDN';
              // TODO: using 333n for testing, remove it when not needed
              const amountValue = offerArgs.amountValue ?? 333n;
              const { [key]: account } = this.state;
              if (!account) throw Fail`not set: ${q(key)}`;

              const nobleICAAddress = account.getAddress();
              const { msgSwap, msgUnlock } = makeUnlockSwapMessages(
                nobleICAAddress,
                amountValue,
              );

              try {
                const result = await account.executeEncodedTx([
                  Any.toJSON(MsgUnlock.toProtoMsg(msgUnlock)),
                  Any.toJSON(MsgSwap.toProtoMsg(msgSwap)),
                ]);
                trace('Unlock result:', result);
              } catch (err) {
                trace('Error during unlock:', err);
                // Add recovery logic here
              }
            },
            'makeWithdrawInvitation',
          );
        },
      },
    },
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
