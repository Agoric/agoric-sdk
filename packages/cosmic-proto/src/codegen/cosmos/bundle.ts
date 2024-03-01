//@ts-nocheck
import * as _16 from './bank/v1beta1/bank.js';
import * as _17 from './bank/v1beta1/query.js';
import * as _18 from './bank/v1beta1/tx.js';
import * as _19 from './base/query/v1beta1/pagination.js';
import * as _20 from './base/v1beta1/coin.js';
import * as _21 from './upgrade/v1beta1/upgrade.js';
import * as _37 from './bank/v1beta1/tx.amino.js';
import * as _38 from './bank/v1beta1/tx.registry.js';
import * as _39 from './bank/v1beta1/query.rpc.Query.js';
import * as _40 from './bank/v1beta1/tx.rpc.msg.js';
import * as _43 from './rpc.query.js';
import * as _44 from './rpc.tx.js';
export namespace cosmos {
  export namespace bank {
    export const v1beta1 = {
      ..._16,
      ..._17,
      ..._18,
      ..._37,
      ..._38,
      ..._39,
      ..._40,
    };
  }
  export namespace base {
    export namespace query {
      export const v1beta1 = {
        ..._19,
      };
    }
    export const v1beta1 = {
      ..._20,
    };
  }
  export namespace upgrade {
    export const v1beta1 = {
      ..._21,
    };
  }
  export const ClientFactory = {
    ..._43,
    ..._44,
  };
}
