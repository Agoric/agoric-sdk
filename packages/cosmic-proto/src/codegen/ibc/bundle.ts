//@ts-nocheck
import * as _140 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _141 from './applications/interchain_accounts/controller/v1/query.js';
import * as _142 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _143 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _144 from './applications/interchain_accounts/host/v1/host.js';
import * as _145 from './applications/interchain_accounts/host/v1/query.js';
import * as _146 from './applications/interchain_accounts/host/v1/tx.js';
import * as _147 from './applications/interchain_accounts/v1/account.js';
import * as _148 from './applications/interchain_accounts/v1/metadata.js';
import * as _149 from './applications/interchain_accounts/v1/packet.js';
import * as _150 from './applications/transfer/v1/authz.js';
import * as _151 from './applications/transfer/v1/genesis.js';
import * as _152 from './applications/transfer/v1/query.js';
import * as _153 from './applications/transfer/v1/transfer.js';
import * as _154 from './applications/transfer/v1/tx.js';
import * as _155 from './applications/transfer/v2/packet.js';
import * as _156 from './core/channel/v1/channel.js';
import * as _157 from './core/channel/v1/genesis.js';
import * as _158 from './core/channel/v1/query.js';
import * as _159 from './core/channel/v1/tx.js';
import * as _160 from './core/channel/v1/upgrade.js';
import * as _161 from './core/client/v1/client.js';
import * as _162 from './core/client/v1/genesis.js';
import * as _163 from './core/client/v1/query.js';
import * as _164 from './core/client/v1/tx.js';
import * as _165 from './core/commitment/v1/commitment.js';
import * as _166 from './core/connection/v1/connection.js';
import * as _167 from './core/connection/v1/genesis.js';
import * as _168 from './core/connection/v1/query.js';
import * as _169 from './core/connection/v1/tx.js';
import * as _170 from './lightclients/localhost/v1/localhost.js';
import * as _171 from './lightclients/localhost/v2/localhost.js';
import * as _172 from './lightclients/solomachine/v1/solomachine.js';
import * as _173 from './lightclients/solomachine/v2/solomachine.js';
import * as _174 from './lightclients/solomachine/v3/solomachine.js';
import * as _175 from './lightclients/tendermint/v1/tendermint.js';
import * as _176 from './lightclients/wasm/v1/genesis.js';
import * as _177 from './lightclients/wasm/v1/query.js';
import * as _178 from './lightclients/wasm/v1/tx.js';
import * as _179 from './lightclients/wasm/v1/wasm.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._140,
          ..._141,
          ..._142,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._143,
        };
      }
      export namespace host {
        export const v1 = {
          ..._144,
          ..._145,
          ..._146,
        };
      }
      export const v1 = {
        ..._147,
        ..._148,
        ..._149,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._150,
        ..._151,
        ..._152,
        ..._153,
        ..._154,
      };
      export const v2 = {
        ..._155,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._156,
        ..._157,
        ..._158,
        ..._159,
        ..._160,
      };
    }
    export namespace client {
      export const v1 = {
        ..._161,
        ..._162,
        ..._163,
        ..._164,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._165,
      };
    }
    export namespace connection {
      export const v1 = {
        ..._166,
        ..._167,
        ..._168,
        ..._169,
      };
    }
  }
  export namespace lightclients {
    export namespace localhost {
      export const v1 = {
        ..._170,
      };
      export const v2 = {
        ..._171,
      };
    }
    export namespace solomachine {
      export const v1 = {
        ..._172,
      };
      export const v2 = {
        ..._173,
      };
      export const v3 = {
        ..._174,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._175,
      };
    }
    export namespace wasm {
      export const v1 = {
        ..._176,
        ..._177,
        ..._178,
        ..._179,
      };
    }
  }
}
