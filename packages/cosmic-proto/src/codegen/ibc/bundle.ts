//@ts-nocheck
import * as _47 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _48 from './applications/interchain_accounts/controller/v1/query.js';
import * as _49 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _50 from './applications/interchain_accounts/host/v1/host.js';
import * as _51 from './applications/interchain_accounts/host/v1/query.js';
import * as _52 from './applications/interchain_accounts/v1/account.js';
import * as _53 from './applications/interchain_accounts/v1/metadata.js';
import * as _54 from './applications/interchain_accounts/v1/packet.js';
import * as _55 from './applications/transfer/v1/authz.js';
import * as _56 from './applications/transfer/v1/query.js';
import * as _57 from './applications/transfer/v1/transfer.js';
import * as _58 from './applications/transfer/v1/tx.js';
import * as _59 from './applications/transfer/v2/packet.js';
import * as _60 from './core/channel/v1/channel.js';
import * as _61 from './core/client/v1/client.js';
import * as _94 from './applications/interchain_accounts/controller/v1/tx.amino.js';
import * as _95 from './applications/transfer/v1/tx.amino.js';
import * as _96 from './applications/interchain_accounts/controller/v1/tx.registry.js';
import * as _97 from './applications/transfer/v1/tx.registry.js';
import * as _98 from './applications/interchain_accounts/controller/v1/query.rpc.Query.js';
import * as _99 from './applications/interchain_accounts/host/v1/query.rpc.Query.js';
import * as _100 from './applications/transfer/v1/query.rpc.Query.js';
import * as _101 from './applications/interchain_accounts/controller/v1/tx.rpc.msg.js';
import * as _102 from './applications/transfer/v1/tx.rpc.msg.js';
import * as _107 from './rpc.query.js';
import * as _108 from './rpc.tx.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._47,
          ..._48,
          ..._49,
          ..._94,
          ..._96,
          ..._98,
          ..._101,
        };
      }
      export namespace host {
        export const v1 = {
          ..._50,
          ..._51,
          ..._99,
        };
      }
      export const v1 = {
        ..._52,
        ..._53,
        ..._54,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._55,
        ..._56,
        ..._57,
        ..._58,
        ..._95,
        ..._97,
        ..._100,
        ..._102,
      };
      export const v2 = {
        ..._59,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._60,
      };
    }
    export namespace client {
      export const v1 = {
        ..._61,
      };
    }
  }
  export const ClientFactory = {
    ..._107,
    ..._108,
  };
}
