/**
 * @file Exo class kit for managing portfolio state and accounts
 * 
 * Defines the PortfolioKit exo class that maintains state for different yield protocol
 * accounts (Aave, Compound, USDN) and provides methods for account management and
 * invitation creation.
 */
import { makeTracer } from '@agoric/internal';
import type { OrchestrationAccount } from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { YieldProtocol } from './constants.js';

const interfaceTODO = undefined;

const trace = makeTracer('PortExo');

type Accounts = {
  Aave: never; // TODO
  Compound: never; // TODO
  USDN: OrchestrationAccount<{ chainId: 'noble-any' }>;
};

export const preparePortfolioKit = (zone: Zone) =>
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
        // TODO: withdraw etc.
      },
    },
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
