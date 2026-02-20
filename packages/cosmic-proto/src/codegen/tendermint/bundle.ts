//@ts-nocheck
import * as _0 from './version/types.js';
import * as _1 from './types/validator.js';
import * as _2 from './types/types.js';
import * as _3 from './types/params.js';
import * as _4 from './types/evidence.js';
import * as _5 from './types/block.js';
import * as _6 from './p2p/types.js';
import * as _7 from './libs/bits/types.js';
import * as _8 from './crypto/proof.js';
import * as _9 from './crypto/keys.js';
import * as _10 from './abci/types.js';
export namespace tendermint {
  export const version = {
    ..._0,
  };
  export const types = {
    ..._1,
    ..._2,
    ..._3,
    ..._4,
    ..._5,
  };
  export const p2p = {
    ..._6,
  };
  export namespace libs {
    export const bits = {
      ..._7,
    };
  }
  export const crypto = {
    ..._8,
    ..._9,
  };
  export const abci = {
    ..._10,
  };
}
