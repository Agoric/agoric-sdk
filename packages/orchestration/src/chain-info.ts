/**
 * @file static declaration of known chain types will allow type support for
 * additional chain-specific operations like `liquidStake`
 */

import type {
  CosmosChainInfo,
  EthChainInfo,
  IcaAccount,
  ICQConnection,
  LiquidStakingMethods,
  StakingAccountActions,
  StakingAccountQueries,
} from './types.js';

// TODO generate this automatically with a build script drawing on data sources such as https://github.com/cosmos/chain-registry

// XXX methods ad-hoc and not fully accurate
export type KnownChains = {
  stride: {
    info: CosmosChainInfo;
    methods: IcaAccount &
      ICQConnection &
      StakingAccountActions &
      StakingAccountQueries &
      LiquidStakingMethods;
  };
  cosmos: {
    info: CosmosChainInfo;
    methods: IcaAccount &
      ICQConnection &
      StakingAccountActions &
      StakingAccountQueries;
  };
  agoric: {
    info: CosmosChainInfo;
    methods: {
      // TODO reference type from #8624 `packages/vats/src/localchain.js`
      /**
       * Register a hook to intercept an incoming IBC Transfer and handle it.
       * Calling without arguments will unregister the hook.
       */
      interceptTransfer: (tap?: {
        upcall: (args: any) => Promise<any>;
      }) => Promise<void>;
    };
  };
  celestia: {
    info: CosmosChainInfo;
    methods: IcaAccount &
      ICQConnection &
      StakingAccountActions &
      StakingAccountQueries;
  };
  osmosis: {
    info: CosmosChainInfo;
    methods: IcaAccount &
      ICQConnection &
      StakingAccountActions &
      StakingAccountQueries;
  };
};

export type ChainInfo = CosmosChainInfo | EthChainInfo;
