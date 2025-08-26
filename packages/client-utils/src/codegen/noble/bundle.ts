//@ts-nocheck
import * as _184 from './dollar/vaults/v1/tx.js';
import * as _185 from './dollar/vaults/v1/vaults.js';
import * as _186 from './swap/v1/algorithm.js';
import * as _187 from './swap/v1/swap.js';
import * as _188 from './swap/v1/tx.js';
import * as _281 from './dollar/vaults/v1/tx.rpc.msg.js';
import * as _282 from './swap/v1/tx.rpc.msg.js';
import * as _301 from './rpc.tx.js';
export namespace noble {
  export namespace dollar {
    export namespace vaults {
      export const v1 = {
        ..._184,
        ..._185,
        ..._281,
      };
    }
  }
  export namespace swap {
    export const v1 = {
      ..._186,
      ..._187,
      ..._188,
      ..._282,
    };
  }
  export const ClientFactory = {
    ..._301,
  };
}
