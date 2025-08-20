//@ts-nocheck
import * as _170 from './dollar/vaults/v1/tx.js';
import * as _171 from './dollar/vaults/v1/vaults.js';
import * as _172 from './swap/v1/algorithm.js';
import * as _173 from './swap/v1/swap.js';
import * as _174 from './swap/v1/tx.js';
import * as _263 from './dollar/vaults/v1/tx.rpc.msg.js';
import * as _264 from './swap/v1/tx.rpc.msg.js';
import * as _283 from './rpc.tx.js';
export namespace noble {
  export namespace dollar {
    export namespace vaults {
      export const v1 = {
        ..._170,
        ..._171,
        ..._263,
      };
    }
  }
  export namespace swap {
    export const v1 = {
      ..._172,
      ..._173,
      ..._174,
      ..._264,
    };
  }
  export const ClientFactory = {
    ..._283,
  };
}
