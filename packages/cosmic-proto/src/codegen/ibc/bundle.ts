//@ts-nocheck
import * as _86 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _87 from './applications/interchain_accounts/controller/v1/query.js';
import * as _88 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _89 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _90 from './applications/interchain_accounts/host/v1/host.js';
import * as _91 from './applications/interchain_accounts/host/v1/query.js';
import * as _92 from './applications/interchain_accounts/v1/account.js';
import * as _93 from './applications/interchain_accounts/v1/metadata.js';
import * as _94 from './applications/interchain_accounts/v1/packet.js';
import * as _95 from './applications/transfer/v1/authz.js';
import * as _96 from './applications/transfer/v1/genesis.js';
import * as _97 from './applications/transfer/v1/query.js';
import * as _98 from './applications/transfer/v1/transfer.js';
import * as _99 from './applications/transfer/v1/tx.js';
import * as _100 from './applications/transfer/v2/packet.js';
import * as _101 from './core/channel/v1/channel.js';
import * as _102 from './core/channel/v1/genesis.js';
import * as _103 from './core/channel/v1/query.js';
import * as _104 from './core/channel/v1/tx.js';
import * as _105 from './core/client/v1/client.js';
import * as _106 from './core/client/v1/genesis.js';
import * as _107 from './core/client/v1/query.js';
import * as _108 from './core/client/v1/tx.js';
import * as _109 from './core/commitment/v1/commitment.js';
import * as _110 from './core/connection/v1/connection.js';
import * as _111 from './core/connection/v1/genesis.js';
import * as _112 from './core/connection/v1/query.js';
import * as _113 from './core/connection/v1/tx.js';
import * as _114 from './lightclients/localhost/v1/localhost.js';
import * as _115 from './lightclients/solomachine/v1/solomachine.js';
import * as _116 from './lightclients/solomachine/v2/solomachine.js';
import * as _117 from './lightclients/tendermint/v1/tendermint.js';
import * as _164 from './applications/interchain_accounts/controller/v1/query.rpc.Query.js';
import * as _165 from './applications/interchain_accounts/host/v1/query.rpc.Query.js';
import * as _166 from './applications/transfer/v1/query.rpc.Query.js';
import * as _167 from './core/channel/v1/query.rpc.Query.js';
import * as _168 from './core/client/v1/query.rpc.Query.js';
import * as _169 from './core/connection/v1/query.rpc.Query.js';
import * as _170 from './applications/interchain_accounts/controller/v1/tx.rpc.msg.js';
import * as _171 from './applications/transfer/v1/tx.rpc.msg.js';
import * as _172 from './core/channel/v1/tx.rpc.msg.js';
import * as _173 from './core/client/v1/tx.rpc.msg.js';
import * as _174 from './core/connection/v1/tx.rpc.msg.js';
import * as _181 from './rpc.query.js';
import * as _182 from './rpc.tx.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._86,
          ..._87,
          ..._88,
          ..._164,
          ..._170,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._89,
        };
      }
      export namespace host {
        export const v1 = {
          ..._90,
          ..._91,
          ..._165,
        };
      }
      export const v1 = {
        ..._92,
        ..._93,
        ..._94,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._95,
        ..._96,
        ..._97,
        ..._98,
        ..._99,
        ..._166,
        ..._171,
      };
      export const v2 = {
        ..._100,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._101,
        ..._102,
        ..._103,
        ..._104,
        ..._167,
        ..._172,
      };
    }
    export namespace client {
      export const v1 = {
        ..._105,
        ..._106,
        ..._107,
        ..._108,
        ..._168,
        ..._173,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._109,
      };
    }
    export namespace connection {
      export const v1 = {
        ..._110,
        ..._111,
        ..._112,
        ..._113,
        ..._169,
        ..._174,
      };
    }
  }
  export namespace lightclients {
    export namespace localhost {
      export const v1 = {
        ..._114,
      };
    }
    export namespace solomachine {
      export const v1 = {
        ..._115,
      };
      export const v2 = {
        ..._116,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._117,
      };
    }
  }
  export const ClientFactory = {
    ..._181,
    ..._182,
  };
}
