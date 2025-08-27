//@ts-nocheck
import * as _201 from './abci/types.js';
import * as _202 from './crypto/keys.js';
import * as _203 from './crypto/proof.js';
import * as _204 from './libs/bits/types.js';
import * as _205 from './p2p/types.js';
import * as _206 from './types/block.js';
import * as _207 from './types/evidence.js';
import * as _208 from './types/params.js';
import * as _209 from './types/types.js';
import * as _210 from './types/validator.js';
import * as _211 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._201,
  };
  export const crypto = {
    ..._202,
    ..._203,
  };
  export namespace libs {
    export const bits = {
      ..._204,
    };
  }
  export const p2p = {
    ..._205,
  };
  export const types = {
    ..._206,
    ..._207,
    ..._208,
    ..._209,
    ..._210,
  };
  export const version = {
    ..._211,
  };
}
