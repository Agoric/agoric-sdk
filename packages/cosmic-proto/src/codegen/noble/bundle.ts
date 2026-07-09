//@ts-nocheck
import * as _210 from './dollar/vaults/v1/tx.js';
import * as _211 from './dollar/vaults/v1/vaults.js';
import * as _212 from './swap/v1/algorithm.js';
import * as _213 from './swap/v1/swap.js';
import * as _214 from './swap/v1/tx.js';
export namespace noble {
  export namespace dollar {
    export namespace vaults {
      export const v1 = {
        ..._210,
        ..._211,
      };
    }
  }
  export namespace swap {
    export const v1 = {
      ..._212,
      ..._213,
      ..._214,
    };
  }
}
