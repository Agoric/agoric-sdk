//@ts-nocheck
import * as _39 from './swap/v1/tx.js';
import * as _40 from './swap/v1/swap.js';
import * as _41 from './swap/v1/algorithm.js';
import * as _42 from './dollar/vaults/v1/vaults.js';
import * as _43 from './dollar/vaults/v1/tx.js';
export namespace noble {
  export namespace swap {
    export const v1 = {
      ..._39,
      ..._40,
      ..._41,
    };
  }
  export namespace dollar {
    export namespace vaults {
      export const v1 = {
        ..._42,
        ..._43,
      };
    }
  }
}
