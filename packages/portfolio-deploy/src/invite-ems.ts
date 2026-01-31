import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type {
  reflectWalletStore,
  SigningSmartWalletKit,
  SmartWalletKit,
} from '@agoric/client-utils';
import { makeTracer } from '@agoric/internal';
import type { Bech32Address } from '@agoric/orchestration';
import type { StartedInstanceKit as ZStarted } from '@agoric/zoe/src/zoeService/utils.js';
// import type { E } from '@endo/eventual-send';

// #region move to deploy-scripts-support?
export type SigningSmartWalletKitWithStore = SigningSmartWalletKit & {
  store: ReturnType<typeof reflectWalletStore>;
};

export interface RunTools {
  scriptArgs: string[];
  makeAccount(name: string): Promise<SigningSmartWalletKitWithStore>;
  walletKit: SmartWalletKit;
  //   E: typeof E;
  harden: typeof harden;
}
// #endregion

type CFMethods = ZStarted<typeof YMaxStart>['creatorFacet'];

const Usage = `invite-ems ymax1 | ymax0`;

const trace = makeTracer('invite-ems');

const inviteEMS = async ({ scriptArgs, makeAccount, walletKit }: RunTools) => {
  const [contract] = scriptArgs;
  if (!(contract === 'ymax0' || contract === 'ymax1')) throw Usage;
  const traceC = trace.sub(contract);
  const prefix = contract.toLocaleUpperCase();

  const instances = Object.fromEntries(
    await walletKit.readPublished('agoricNames.instance'),
  );

  const invite = async (emsAddr: Bech32Address) => {
    const ctrlAcct = await makeAccount(`${prefix}_CTRL`);
    traceC.sub('ymaxControl')(ctrlAcct.address);

    const creatorFacet = ctrlAcct.store.get<CFMethods>('creatorFacet');

    traceC('deliver EMS invitation to', emsAddr);
    await creatorFacet.deliverEVMWalletHandlerInvitation(
      emsAddr,
      instances.postalService,
    );
  };

  const go = async (description = 'ems') => {
    const emsAcct = await makeAccount(`${prefix}_EMS`);
    traceC.sub('EMS')(emsAcct.address);
    await invite(emsAcct.address as Bech32Address);

    const instance = instances[contract];
    const saveTo = description.replace(/^deliver /, '');
    const result = await emsAcct.store.saveOfferResult(
      { instance, description },
      saveTo,
    );
    traceC('redeem result', result);
  };

  await go();
};

export default inviteEMS;
