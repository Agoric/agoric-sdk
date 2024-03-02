//@ts-nocheck
import * as _62 from './abci/types.js';
import * as _63 from './crypto/keys.js';
import * as _64 from './crypto/proof.js';
import * as _65 from './types/block.js';
import * as _66 from './types/evidence.js';
import * as _67 from './types/params.js';
import * as _68 from './types/types.js';
import * as _69 from './types/validator.js';
import * as _70 from './version/types.js';
export namespace tendermint {
  export const abci = {
    ..._62,
  };
  export const crypto = {
    ..._63,
    ..._64,
  };
  export const types = {
    ..._65,
    ..._66,
    ..._67,
    ..._68,
    ..._69,
  };
  export const version = {
    ..._70,
  };
}
