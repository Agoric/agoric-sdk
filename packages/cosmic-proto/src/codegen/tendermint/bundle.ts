//@ts-nocheck
import * as _140 from './abci/types.js';
import * as _141 from './crypto/keys.js';
import * as _142 from './crypto/proof.js';
import * as _143 from './libs/bits/types.js';
import * as _144 from './p2p/types.js';
import * as _145 from './types/block.js';
import * as _146 from './types/evidence.js';
import * as _147 from './types/params.js';
import * as _148 from './types/types.js';
import * as _149 from './types/validator.js';
import * as _150 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._140,
  };
  export const crypto = {
    ..._141,
    ..._142,
  };
  export namespace libs {
    export const bits = {
      ..._143,
    };
  }
  export const p2p = {
    ..._144,
  };
  export const types = {
    ..._145,
    ..._146,
    ..._147,
    ..._148,
    ..._149,
  };
  export const version = {
    ..._150,
  };
}
