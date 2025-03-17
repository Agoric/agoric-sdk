//@ts-nocheck
import * as _198 from './abci/types.js';
import * as _199 from './crypto/keys.js';
import * as _200 from './crypto/proof.js';
import * as _201 from './libs/bits/types.js';
import * as _202 from './p2p/types.js';
import * as _203 from './types/block.js';
import * as _204 from './types/evidence.js';
import * as _205 from './types/params.js';
import * as _206 from './types/types.js';
import * as _207 from './types/validator.js';
import * as _208 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._198,
  };
  export const crypto = {
    ..._199,
    ..._200,
  };
  export namespace libs {
    export const bits = {
      ..._201,
    };
  }
  export const p2p = {
    ..._202,
  };
  export const types = {
    ..._203,
    ..._204,
    ..._205,
    ..._206,
    ..._207,
  };
  export const version = {
    ..._208,
  };
}
