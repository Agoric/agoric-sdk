//@ts-nocheck
import * as _168 from './abci/types.js';
import * as _169 from './crypto/keys.js';
import * as _170 from './crypto/proof.js';
import * as _171 from './libs/bits/types.js';
import * as _172 from './p2p/types.js';
import * as _173 from './types/block.js';
import * as _174 from './types/evidence.js';
import * as _175 from './types/params.js';
import * as _176 from './types/types.js';
import * as _177 from './types/validator.js';
import * as _178 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._168,
  };
  export const crypto = {
    ..._169,
    ..._170,
  };
  export namespace libs {
    export const bits = {
      ..._171,
    };
  }
  export const p2p = {
    ..._172,
  };
  export const types = {
    ..._173,
    ..._174,
    ..._175,
    ..._176,
    ..._177,
  };
  export const version = {
    ..._178,
  };
}
