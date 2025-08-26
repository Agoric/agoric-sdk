//@ts-nocheck
import * as _217 from './abci/types.js';
import * as _218 from './crypto/keys.js';
import * as _219 from './crypto/proof.js';
import * as _220 from './libs/bits/types.js';
import * as _221 from './p2p/types.js';
import * as _222 from './types/block.js';
import * as _223 from './types/evidence.js';
import * as _224 from './types/params.js';
import * as _225 from './types/types.js';
import * as _226 from './types/validator.js';
import * as _227 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._217,
  };
  export const crypto = {
    ..._218,
    ..._219,
  };
  export namespace libs {
    export const bits = {
      ..._220,
    };
  }
  export const p2p = {
    ..._221,
  };
  export const types = {
    ..._222,
    ..._223,
    ..._224,
    ..._225,
    ..._226,
  };
  export const version = {
    ..._227,
  };
}
