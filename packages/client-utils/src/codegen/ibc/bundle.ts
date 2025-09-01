//@ts-nocheck
import * as _137 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _138 from './applications/interchain_accounts/controller/v1/query.js';
import * as _139 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _140 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _141 from './applications/interchain_accounts/host/v1/host.js';
import * as _142 from './applications/interchain_accounts/host/v1/query.js';
import * as _143 from './applications/interchain_accounts/host/v1/tx.js';
import * as _144 from './applications/interchain_accounts/v1/account.js';
import * as _145 from './applications/interchain_accounts/v1/metadata.js';
import * as _146 from './applications/interchain_accounts/v1/packet.js';
import * as _147 from './applications/transfer/v1/authz.js';
import * as _148 from './applications/transfer/v1/genesis.js';
import * as _149 from './applications/transfer/v1/query.js';
import * as _150 from './applications/transfer/v1/transfer.js';
import * as _151 from './applications/transfer/v1/tx.js';
import * as _152 from './applications/transfer/v2/packet.js';
import * as _153 from './core/channel/v1/channel.js';
import * as _154 from './core/channel/v1/genesis.js';
import * as _155 from './core/channel/v1/query.js';
import * as _156 from './core/channel/v1/tx.js';
import * as _157 from './core/channel/v1/upgrade.js';
import * as _158 from './core/client/v1/client.js';
import * as _159 from './core/client/v1/genesis.js';
import * as _160 from './core/client/v1/query.js';
import * as _161 from './core/client/v1/tx.js';
import * as _162 from './core/commitment/v1/commitment.js';
import * as _163 from './core/connection/v1/connection.js';
import * as _164 from './core/connection/v1/genesis.js';
import * as _165 from './core/connection/v1/query.js';
import * as _166 from './core/connection/v1/tx.js';
import * as _167 from './lightclients/localhost/v1/localhost.js';
import * as _168 from './lightclients/localhost/v2/localhost.js';
import * as _169 from './lightclients/solomachine/v1/solomachine.js';
import * as _170 from './lightclients/solomachine/v2/solomachine.js';
import * as _171 from './lightclients/solomachine/v3/solomachine.js';
import * as _172 from './lightclients/tendermint/v1/tendermint.js';
import * as _173 from './lightclients/wasm/v1/genesis.js';
import * as _174 from './lightclients/wasm/v1/query.js';
import * as _175 from './lightclients/wasm/v1/tx.js';
import * as _176 from './lightclients/wasm/v1/wasm.js';
import * as _263 from './applications/interchain_accounts/controller/v1/query.rpc.Query.js';
import * as _264 from './applications/interchain_accounts/host/v1/query.rpc.Query.js';
import * as _265 from './applications/transfer/v1/query.rpc.Query.js';
import * as _266 from './core/channel/v1/query.rpc.Query.js';
import * as _267 from './core/client/v1/query.rpc.Query.js';
import * as _268 from './core/connection/v1/query.rpc.Query.js';
import * as _269 from './lightclients/wasm/v1/query.rpc.Query.js';
import * as _270 from './applications/interchain_accounts/controller/v1/tx.rpc.msg.js';
import * as _271 from './applications/interchain_accounts/host/v1/tx.rpc.msg.js';
import * as _272 from './applications/transfer/v1/tx.rpc.msg.js';
import * as _273 from './core/channel/v1/tx.rpc.msg.js';
import * as _274 from './core/client/v1/tx.rpc.msg.js';
import * as _275 from './core/connection/v1/tx.rpc.msg.js';
import * as _276 from './lightclients/wasm/v1/tx.rpc.msg.js';
import * as _295 from './rpc.query.js';
import * as _296 from './rpc.tx.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._137,
          ..._138,
          ..._139,
          ..._263,
          ..._270,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._140,
        };
      }
      export namespace host {
        export const v1 = {
          ..._141,
          ..._142,
          ..._143,
          ..._264,
          ..._271,
        };
      }
      export const v1 = {
        ..._144,
        ..._145,
        ..._146,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._147,
        ..._148,
        ..._149,
        ..._150,
        ..._151,
        ..._265,
        ..._272,
      };
      export const v2 = {
        ..._152,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._153,
        ..._154,
        ..._155,
        ..._156,
        ..._157,
        ..._266,
        ..._273,
      };
    }
    export namespace client {
      export const v1 = {
        ..._158,
        ..._159,
        ..._160,
        ..._161,
        ..._267,
        ..._274,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._162,
      };
    }
    export namespace connection {
      export const v1 = {
        ..._163,
        ..._164,
        ..._165,
        ..._166,
        ..._268,
        ..._275,
      };
    }
  }
  export namespace lightclients {
    export namespace localhost {
      export const v1 = {
        ..._167,
      };
      export const v2 = {
        ..._168,
      };
    }
    export namespace solomachine {
      export const v1 = {
        ..._169,
      };
      export const v2 = {
        ..._170,
      };
      export const v3 = {
        ..._171,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._172,
      };
    }
    export namespace wasm {
      export const v1 = {
        ..._173,
        ..._174,
        ..._175,
        ..._176,
        ..._269,
        ..._276,
      };
    }
  }
  export const ClientFactory = {
    ..._295,
    ..._296,
  };
}
