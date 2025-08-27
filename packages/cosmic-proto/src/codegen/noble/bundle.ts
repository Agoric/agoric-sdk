//@ts-nocheck
import * as _168 from './dollar/vaults/v1/tx.js';
import * as _169 from './dollar/vaults/v1/vaults.js';
import * as _170 from './swap/v1/algorithm.js';
import * as _171 from './swap/v1/swap.js';
import * as _172 from './swap/v1/tx.js';
export namespace noble {
  export namespace dollar {
    export namespace vaults {
      export const v1 = {
        ..._168,
        ..._169,
      };
    }
  }
  export namespace swap {
    export const v1 = {
      ..._170,
      ..._171,
      ..._172,
    };
  }
}
