//@ts-nocheck
import * as _243 from './abci/types.js';
import * as _244 from './crypto/keys.js';
import * as _245 from './crypto/proof.js';
import * as _246 from './libs/bits/types.js';
import * as _247 from './p2p/types.js';
import * as _248 from './types/block.js';
import * as _249 from './types/evidence.js';
import * as _250 from './types/params.js';
import * as _251 from './types/types.js';
import * as _252 from './types/validator.js';
import * as _253 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._243,
  };
  export const crypto = {
    ..._244,
    ..._245,
  };
  export namespace libs {
    export const bits = {
      ..._246,
    };
  }
  export const p2p = {
    ..._247,
  };
  export const types = {
    ..._248,
    ..._249,
    ..._250,
    ..._251,
    ..._252,
  };
  export const version = {
    ..._253,
  };
}
