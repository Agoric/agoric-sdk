import { makeTracer } from '@agoric/internal';
import type { OrchestrationAccount } from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import type { YieldProtocol } from './constants.js';

const interfaceTODO = undefined;

const trace = makeTracer('PortExo');

export const preparePortfolioKit = (zone: Zone) =>
  zone.exoClassKit(
    'Portfolio',
    interfaceTODO,
    (initial: Iterable<[YieldProtocol, OrchestrationAccount<any>]> = []) => {
      const accounts = zone
        .detached()
        .mapStore<
          YieldProtocol,
          OrchestrationAccount<any>
        >('accounts', { keyShape: M.string() });
      accounts.addAll(initial);
      return { accounts };
    },
    {
      keeper: {
        init(key: YieldProtocol, account: OrchestrationAccount<any>) {
          const { accounts } = this.state;
          accounts.init(key, account);
          trace('stored', key, '=>', `${account}`);
        },
      },
      invitationMakers: {},
    },
  );

export type PortfolioKit = ReturnType<ReturnType<typeof preparePortfolioKit>>;
