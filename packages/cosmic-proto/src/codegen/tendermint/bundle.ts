//@ts-nocheck
import * as _87 from './abci/types.js';
import * as _88 from './crypto/keys.js';
import * as _89 from './crypto/proof.js';
import * as _90 from './libs/bits/types.js';
import * as _91 from './p2p/types.js';
import * as _92 from './types/block.js';
import * as _93 from './types/evidence.js';
import * as _94 from './types/params.js';
import * as _95 from './types/types.js';
import * as _96 from './types/validator.js';
import * as _97 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._87,
  };
  export const crypto = {
    ..._88,
    ..._89,
  };
  export namespace libs {
    export const bits = {
      ..._90,
    };
  }
  export const p2p = {
    ..._91,
  };
  export const types = {
    ..._92,
    ..._93,
    ..._94,
    ..._95,
    ..._96,
  };
  export const version = {
    ..._97,
  };
}
