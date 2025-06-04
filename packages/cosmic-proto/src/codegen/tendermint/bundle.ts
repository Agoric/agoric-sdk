//@ts-nocheck
import * as _203 from './abci/types.js';
import * as _204 from './crypto/keys.js';
import * as _205 from './crypto/proof.js';
import * as _206 from './libs/bits/types.js';
import * as _207 from './p2p/types.js';
import * as _208 from './types/block.js';
import * as _209 from './types/evidence.js';
import * as _210 from './types/params.js';
import * as _211 from './types/types.js';
import * as _212 from './types/validator.js';
import * as _213 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._203,
  };
  export const crypto = {
    ..._204,
    ..._205,
  };
  export namespace libs {
    export const bits = {
      ..._206,
    };
  }
  export const p2p = {
    ..._207,
  };
  export const types = {
    ..._208,
    ..._209,
    ..._210,
    ..._211,
    ..._212,
  };
  export const version = {
    ..._213,
  };
}
