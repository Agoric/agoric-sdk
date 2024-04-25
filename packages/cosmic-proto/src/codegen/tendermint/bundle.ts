//@ts-nocheck
import * as _119 from './abci/types.js';
import * as _120 from './crypto/keys.js';
import * as _121 from './crypto/proof.js';
import * as _122 from './libs/bits/types.js';
import * as _123 from './p2p/types.js';
import * as _124 from './types/block.js';
import * as _125 from './types/evidence.js';
import * as _126 from './types/params.js';
import * as _127 from './types/types.js';
import * as _128 from './types/validator.js';
import * as _129 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._119,
  };
  export const crypto = {
    ..._120,
    ..._121,
  };
  export namespace libs {
    export const bits = {
      ..._122,
    };
  }
  export const p2p = {
    ..._123,
  };
  export const types = {
    ..._124,
    ..._125,
    ..._126,
    ..._127,
    ..._128,
  };
  export const version = {
    ..._129,
  };
}
