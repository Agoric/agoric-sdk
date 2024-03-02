//@ts-nocheck
import * as _16 from './auth/v1beta1/auth.js';
import * as _17 from './auth/v1beta1/query.js';
import * as _18 from './authz/v1beta1/authz.js';
import * as _19 from './authz/v1beta1/query.js';
import * as _20 from './authz/v1beta1/tx.js';
import * as _21 from './bank/v1beta1/authz.js';
import * as _22 from './bank/v1beta1/bank.js';
import * as _23 from './bank/v1beta1/query.js';
import * as _24 from './bank/v1beta1/tx.js';
import * as _25 from './base/query/v1beta1/pagination.js';
import * as _26 from './base/v1beta1/coin.js';
import * as _27 from './staking/v1beta1/authz.js';
import * as _28 from './staking/v1beta1/query.js';
import * as _29 from './staking/v1beta1/staking.js';
import * as _30 from './staking/v1beta1/tx.js';
import * as _31 from './upgrade/v1beta1/upgrade.js';
import * as _69 from './authz/v1beta1/tx.amino.js';
import * as _70 from './bank/v1beta1/tx.amino.js';
import * as _71 from './staking/v1beta1/tx.amino.js';
import * as _72 from './authz/v1beta1/tx.registry.js';
import * as _73 from './bank/v1beta1/tx.registry.js';
import * as _74 from './staking/v1beta1/tx.registry.js';
import * as _75 from './auth/v1beta1/query.rpc.Query.js';
import * as _76 from './authz/v1beta1/query.rpc.Query.js';
import * as _77 from './bank/v1beta1/query.rpc.Query.js';
import * as _78 from './staking/v1beta1/query.rpc.Query.js';
import * as _79 from './authz/v1beta1/tx.rpc.msg.js';
import * as _80 from './bank/v1beta1/tx.rpc.msg.js';
import * as _81 from './staking/v1beta1/tx.rpc.msg.js';
import * as _93 from './rpc.query.js';
import * as _94 from './rpc.tx.js';
export namespace cosmos {
  export namespace auth {
    export const v1beta1 = {
      ..._16,
      ..._17,
      ..._75,
    };
  }
  export namespace authz {
    export const v1beta1 = {
      ..._18,
      ..._19,
      ..._20,
      ..._69,
      ..._72,
      ..._76,
      ..._79,
    };
  }
  export namespace bank {
    export const v1beta1 = {
      ..._21,
      ..._22,
      ..._23,
      ..._24,
      ..._70,
      ..._73,
      ..._77,
      ..._80,
    };
  }
  export namespace base {
    export namespace query {
      export const v1beta1 = {
        ..._25,
      };
    }
    export const v1beta1 = {
      ..._26,
    };
  }
  export namespace staking {
    export const v1beta1 = {
      ..._27,
      ..._28,
      ..._29,
      ..._30,
      ..._71,
      ..._74,
      ..._78,
      ..._81,
    };
  }
  export namespace upgrade {
    export const v1beta1 = {
      ..._31,
    };
  }
  export const ClientFactory = {
    ..._93,
    ..._94,
  };
}
