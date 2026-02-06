/**
 * @file for use with ymax-admin
 */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import { makeTracer } from '@agoric/internal';
import type { Bech32Address } from '@agoric/orchestration';
import type { StartedInstanceKit as ZStarted } from '@agoric/zoe/src/zoeService/utils.js';
import type { Details } from 'ses';
import type { RunTools } from './wallet-admin-types.ts';

const Usage = `invite-ems ymax1 | ymax0`;

// #region import from portfolio-deploy
type CFMethods = ZStarted<typeof YMaxStart>['creatorFacet'];

type YmaxContractName = 'ymax0' | 'ymax1';

function assertYmaxContractName(
  specimen: unknown,
  details?: Details,
): asserts specimen is YmaxContractName {
  assert(specimen === 'ymax0' || specimen === 'ymax1', details);
}

const EVM_WALLET_HANDLER_KEY = 'evmWalletHandler';
// #endregion

const trace = makeTracer('invite-ems');

const inviteEMS = async ({ scriptArgs, makeAccount, walletKit }: RunTools) => {
  const [contract] = scriptArgs;
  assertYmaxContractName(contract, Usage);

  const traceC = trace.sub(contract);
  const prefix = contract.toUpperCase();

  const { postalService, ...instances } = Object.fromEntries(
    await walletKit.readPublished('agoricNames.instance'),
  );

  const deliverInvitation = async (emsAddr: Bech32Address) => {
    const ctrlAcct = await makeAccount(`${prefix}_CTRL`);
    traceC.sub('ymaxControl')(ctrlAcct.address);

    const creatorFacet = ctrlAcct.store.get<CFMethods>('creatorFacet');

    traceC('deliver EMS invitation to', emsAddr);
    await creatorFacet.deliverEVMWalletHandlerInvitation(
      emsAddr,
      postalService,
    );
  };

  const makeEMS = async () => {
    const emsAcct = await makeAccount(`${prefix}_EMS`);
    traceC.sub('EMS')(emsAcct.address);

    return harden({
      getAddress: () => emsAcct.address,
      redeem: async (description = EVM_WALLET_HANDLER_KEY) => {
        const instance = instances[contract];
        const saveTo = description.replace(/^deliver /, '');
        const result = await emsAcct.store.saveOfferResult(
          { instance, description },
          saveTo,
        );
        traceC('redeem result', result);
      },
    });
  };

  const ems = await makeEMS();
  await deliverInvitation(ems.getAddress() as Bech32Address);
  await ems.redeem();
};

export default inviteEMS;
