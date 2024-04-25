//@ts-nocheck
import * as _88 from './abci/types.js';
import * as _89 from './crypto/keys.js';
import * as _90 from './crypto/proof.js';
import * as _91 from './libs/bits/types.js';
import * as _92 from './p2p/types.js';
import * as _93 from './types/block.js';
import * as _94 from './types/evidence.js';
import * as _95 from './types/params.js';
import * as _96 from './types/types.js';
import * as _97 from './types/validator.js';
import * as _98 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._88,
  };
  export const crypto = {
    ..._89,
    ..._90,
  };
  export namespace libs {
    export const bits = {
      ..._91,
    };
  }
  export const p2p = {
    ..._92,
  };
  export const types = {
    ..._93,
    ..._94,
    ..._95,
    ..._96,
    ..._97,
  };
  export const version = {
    ..._98,
  };
}
