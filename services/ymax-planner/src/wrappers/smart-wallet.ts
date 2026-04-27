import {
  makeSmartWalletKitFromVstorageKit,
  type MinimalNetworkConfig,
} from '@agoric/client-utils';
import makeVstorageKit from './vstorage-kit.ts';

const makeSmartWalletKit = async (
  {
    fetch,
    delay: _delay,
    names = true,
  }: {
    delay: (ms: number) => Promise<void>;
    fetch: typeof globalThis.fetch;
    names?: boolean;
  },
  networkConfig: MinimalNetworkConfig,
) =>
  makeSmartWalletKitFromVstorageKit(makeVstorageKit({ fetch }, networkConfig), {
    names,
  });

harden(makeSmartWalletKit);

export default makeSmartWalletKit;
