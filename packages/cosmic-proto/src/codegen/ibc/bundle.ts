//@ts-nocheck
import * as _49 from './lightclients/wasm/v1/wasm.js';
import * as _50 from './lightclients/wasm/v1/tx.js';
import * as _51 from './lightclients/wasm/v1/query.js';
import * as _52 from './lightclients/wasm/v1/genesis.js';
import * as _53 from './lightclients/tendermint/v1/tendermint.js';
import * as _54 from './lightclients/solomachine/v3/solomachine.js';
import * as _55 from './lightclients/solomachine/v2/solomachine.js';
import * as _56 from './lightclients/solomachine/v1/solomachine.js';
import * as _57 from './lightclients/localhost/v2/localhost.js';
import * as _58 from './lightclients/localhost/v1/localhost.js';
import * as _59 from './core/connection/v1/tx.js';
import * as _60 from './core/connection/v1/query.js';
import * as _61 from './core/connection/v1/genesis.js';
import * as _62 from './core/connection/v1/connection.js';
import * as _63 from './core/commitment/v1/commitment.js';
import * as _64 from './core/client/v1/tx.js';
import * as _65 from './core/client/v1/query.js';
import * as _66 from './core/client/v1/genesis.js';
import * as _67 from './core/client/v1/client.js';
import * as _68 from './core/channel/v1/upgrade.js';
import * as _69 from './core/channel/v1/tx.js';
import * as _70 from './core/channel/v1/query.js';
import * as _71 from './core/channel/v1/genesis.js';
import * as _72 from './core/channel/v1/channel.js';
import * as _73 from './applications/transfer/v2/packet.js';
import * as _74 from './applications/transfer/v1/tx.js';
import * as _75 from './applications/transfer/v1/transfer.js';
import * as _76 from './applications/transfer/v1/query.js';
import * as _77 from './applications/transfer/v1/genesis.js';
import * as _78 from './applications/transfer/v1/authz.js';
import * as _79 from './applications/interchain_accounts/v1/packet.js';
import * as _80 from './applications/interchain_accounts/v1/metadata.js';
import * as _81 from './applications/interchain_accounts/v1/account.js';
import * as _82 from './applications/interchain_accounts/host/v1/tx.js';
import * as _83 from './applications/interchain_accounts/host/v1/query.js';
import * as _84 from './applications/interchain_accounts/host/v1/host.js';
import * as _85 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _86 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _87 from './applications/interchain_accounts/controller/v1/query.js';
import * as _88 from './applications/interchain_accounts/controller/v1/controller.js';
export namespace ibc {
  export namespace lightclients {
    export namespace wasm {
      export const v1 = {
        ..._49,
        ..._50,
        ..._51,
        ..._52,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._53,
      };
    }
    export namespace solomachine {
      export const v3 = {
        ..._54,
      };
      export const v2 = {
        ..._55,
      };
      export const v1 = {
        ..._56,
      };
    }
    export namespace localhost {
      export const v2 = {
        ..._57,
      };
      export const v1 = {
        ..._58,
      };
    }
  }
  export namespace core {
    export namespace connection {
      export const v1 = {
        ..._59,
        ..._60,
        ..._61,
        ..._62,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._63,
      };
    }
    export namespace client {
      export const v1 = {
        ..._64,
        ..._65,
        ..._66,
        ..._67,
      };
    }
    export namespace channel {
      export const v1 = {
        ..._68,
        ..._69,
        ..._70,
        ..._71,
        ..._72,
      };
    }
  }
  export namespace applications {
    export namespace transfer {
      export const v2 = {
        ..._73,
      };
      export const v1 = {
        ..._74,
        ..._75,
        ..._76,
        ..._77,
        ..._78,
      };
    }
    export namespace interchain_accounts {
      export const v1 = {
        ..._79,
        ..._80,
        ..._81,
      };
      export namespace host {
        export const v1 = {
          ..._82,
          ..._83,
          ..._84,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._85,
        };
      }
      export namespace controller {
        export const v1 = {
          ..._86,
          ..._87,
          ..._88,
        };
      }
    }
  }
}
