//@ts-nocheck
import * as _37 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _38 from './applications/interchain_accounts/controller/v1/query.js';
import * as _39 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _40 from './applications/interchain_accounts/host/v1/host.js';
import * as _41 from './applications/interchain_accounts/host/v1/query.js';
import * as _42 from './applications/interchain_accounts/v1/account.js';
import * as _43 from './applications/interchain_accounts/v1/metadata.js';
import * as _44 from './applications/interchain_accounts/v1/packet.js';
import * as _45 from './applications/transfer/v1/authz.js';
import * as _46 from './applications/transfer/v1/query.js';
import * as _47 from './applications/transfer/v1/transfer.js';
import * as _48 from './applications/transfer/v1/tx.js';
import * as _49 from './applications/transfer/v2/packet.js';
import * as _50 from './core/channel/v1/channel.js';
import * as _51 from './core/client/v1/client.js';
import * as _82 from './applications/interchain_accounts/controller/v1/tx.amino.js';
import * as _83 from './applications/transfer/v1/tx.amino.js';
import * as _84 from './applications/interchain_accounts/controller/v1/tx.registry.js';
import * as _85 from './applications/transfer/v1/tx.registry.js';
import * as _86 from './applications/interchain_accounts/controller/v1/query.rpc.Query.js';
import * as _87 from './applications/interchain_accounts/host/v1/query.rpc.Query.js';
import * as _88 from './applications/transfer/v1/query.rpc.Query.js';
import * as _89 from './applications/interchain_accounts/controller/v1/tx.rpc.msg.js';
import * as _90 from './applications/transfer/v1/tx.rpc.msg.js';
import * as _95 from './rpc.query.js';
import * as _96 from './rpc.tx.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._37,
          ..._38,
          ..._39,
          ..._82,
          ..._84,
          ..._86,
          ..._89,
        };
      }
      export namespace host {
        export const v1 = {
          ..._40,
          ..._41,
          ..._87,
        };
      }
      export const v1 = {
        ..._42,
        ..._43,
        ..._44,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._45,
        ..._46,
        ..._47,
        ..._48,
        ..._83,
        ..._85,
        ..._88,
        ..._90,
      };
      export const v2 = {
        ..._49,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._50,
      };
    }
    export namespace client {
      export const v1 = {
        ..._51,
      };
    }
  }
  export const ClientFactory = {
    ..._95,
    ..._96,
  };
}
