//@ts-nocheck
import * as _52 from './crypto/keys.js';
import * as _53 from './crypto/proof.js';
import * as _54 from './types/block.js';
import * as _55 from './types/evidence.js';
import * as _56 from './types/params.js';
import * as _57 from './types/types.js';
import * as _58 from './types/validator.js';
import * as _59 from './version/types.js';
export namespace tendermint {
  export const crypto = {
    ..._52,
    ..._53,
  };
  export const types = {
    ..._54,
    ..._55,
    ..._56,
    ..._57,
    ..._58,
  };
  export const version = {
    ..._59,
  };
}
