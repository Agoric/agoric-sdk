//@ts-nocheck
import * as _215 from './abci/types.js';
import * as _216 from './crypto/keys.js';
import * as _217 from './crypto/proof.js';
import * as _218 from './libs/bits/types.js';
import * as _219 from './p2p/types.js';
import * as _220 from './types/block.js';
import * as _221 from './types/evidence.js';
import * as _222 from './types/params.js';
import * as _223 from './types/types.js';
import * as _224 from './types/validator.js';
import * as _225 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._215,
  };
  export const crypto = {
    ..._216,
    ..._217,
  };
  export namespace libs {
    export const bits = {
      ..._218,
    };
  }
  export const p2p = {
    ..._219,
  };
  export const types = {
    ..._220,
    ..._221,
    ..._222,
    ..._223,
    ..._224,
  };
  export const version = {
    ..._225,
  };
}
