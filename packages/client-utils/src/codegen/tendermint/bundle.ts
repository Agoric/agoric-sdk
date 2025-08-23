//@ts-nocheck
import * as _218 from './abci/types.js';
import * as _219 from './crypto/keys.js';
import * as _220 from './crypto/proof.js';
import * as _221 from './libs/bits/types.js';
import * as _222 from './p2p/types.js';
import * as _223 from './types/block.js';
import * as _224 from './types/evidence.js';
import * as _225 from './types/params.js';
import * as _226 from './types/types.js';
import * as _227 from './types/validator.js';
import * as _228 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._218,
  };
  export const crypto = {
    ..._219,
    ..._220,
  };
  export namespace libs {
    export const bits = {
      ..._221,
    };
  }
  export const p2p = {
    ..._222,
  };
  export const types = {
    ..._223,
    ..._224,
    ..._225,
    ..._226,
    ..._227,
  };
  export const version = {
    ..._228,
  };
}
