//@ts-nocheck
import * as _128 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _129 from './applications/interchain_accounts/controller/v1/query.js';
import * as _130 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _131 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _132 from './applications/interchain_accounts/host/v1/host.js';
import * as _133 from './applications/interchain_accounts/host/v1/query.js';
import * as _134 from './applications/interchain_accounts/host/v1/tx.js';
import * as _135 from './applications/interchain_accounts/v1/account.js';
import * as _136 from './applications/interchain_accounts/v1/metadata.js';
import * as _137 from './applications/interchain_accounts/v1/packet.js';
import * as _138 from './applications/transfer/v1/authz.js';
import * as _139 from './applications/transfer/v1/genesis.js';
import * as _140 from './applications/transfer/v1/query.js';
import * as _141 from './applications/transfer/v1/transfer.js';
import * as _142 from './applications/transfer/v1/tx.js';
import * as _143 from './applications/transfer/v2/packet.js';
import * as _144 from './core/channel/v1/channel.js';
import * as _145 from './core/channel/v1/genesis.js';
import * as _146 from './core/channel/v1/query.js';
import * as _147 from './core/channel/v1/tx.js';
import * as _148 from './core/client/v1/client.js';
import * as _149 from './core/client/v1/genesis.js';
import * as _150 from './core/client/v1/query.js';
import * as _151 from './core/client/v1/tx.js';
import * as _152 from './core/commitment/v1/commitment.js';
import * as _153 from './core/connection/v1/connection.js';
import * as _154 from './core/connection/v1/genesis.js';
import * as _155 from './core/connection/v1/query.js';
import * as _156 from './core/connection/v1/tx.js';
import * as _157 from './lightclients/localhost/v1/localhost.js';
import * as _158 from './lightclients/localhost/v2/localhost.js';
import * as _159 from './lightclients/solomachine/v1/solomachine.js';
import * as _160 from './lightclients/solomachine/v2/solomachine.js';
import * as _161 from './lightclients/solomachine/v3/solomachine.js';
import * as _162 from './lightclients/tendermint/v1/tendermint.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._128,
          ..._129,
          ..._130,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._131,
        };
      }
      export namespace host {
        export const v1 = {
          ..._132,
          ..._133,
          ..._134,
        };
      }
      export const v1 = {
        ..._135,
        ..._136,
        ..._137,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._138,
        ..._139,
        ..._140,
        ..._141,
        ..._142,
      };
      export const v2 = {
        ..._143,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._144,
        ..._145,
        ..._146,
        ..._147,
      };
    }
    export namespace client {
      export const v1 = {
        ..._148,
        ..._149,
        ..._150,
        ..._151,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._152,
      };
    }
    export namespace connection {
      export const v1 = {
        ..._153,
        ..._154,
        ..._155,
        ..._156,
      };
    }
  }
  export namespace lightclients {
    export namespace localhost {
      export const v1 = {
        ..._157,
      };
      export const v2 = {
        ..._158,
      };
    }
    export namespace solomachine {
      export const v1 = {
        ..._159,
      };
      export const v2 = {
        ..._160,
      };
      export const v3 = {
        ..._161,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._162,
      };
    }
  }
}
