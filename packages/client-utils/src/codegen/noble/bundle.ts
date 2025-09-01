//@ts-nocheck
import * as _182 from './dollar/vaults/v1/tx.js';
import * as _183 from './dollar/vaults/v1/vaults.js';
import * as _184 from './swap/v1/algorithm.js';
import * as _185 from './swap/v1/swap.js';
import * as _186 from './swap/v1/tx.js';
import * as _279 from './dollar/vaults/v1/tx.rpc.msg.js';
import * as _280 from './swap/v1/tx.rpc.msg.js';
import * as _299 from './rpc.tx.js';
export namespace noble {
  export namespace dollar {
    export namespace vaults {
      export const v1 = {
        ..._182,
        ..._183,
        ..._279,
      };
    }
  }
  export namespace swap {
    export const v1 = {
      ..._184,
      ..._185,
      ..._186,
      ..._280,
    };
  }
  export const ClientFactory = {
    ..._299,
  };
}
