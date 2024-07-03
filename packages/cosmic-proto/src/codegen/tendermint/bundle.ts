//@ts-nocheck
import * as _189 from './abci/types.js';
import * as _190 from './crypto/keys.js';
import * as _191 from './crypto/proof.js';
import * as _192 from './libs/bits/types.js';
import * as _193 from './p2p/types.js';
import * as _194 from './types/block.js';
import * as _195 from './types/evidence.js';
import * as _196 from './types/params.js';
import * as _197 from './types/types.js';
import * as _198 from './types/validator.js';
import * as _199 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._189,
  };
  export const crypto = {
    ..._190,
    ..._191,
  };
  export namespace libs {
    export const bits = {
      ..._192,
    };
  }
  export const p2p = {
    ..._193,
  };
  export const types = {
    ..._194,
    ..._195,
    ..._196,
    ..._197,
    ..._198,
  };
  export const version = {
    ..._199,
  };
}
