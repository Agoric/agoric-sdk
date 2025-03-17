//@ts-nocheck
import * as _130 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _131 from './applications/interchain_accounts/controller/v1/query.js';
import * as _132 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _133 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _134 from './applications/interchain_accounts/host/v1/host.js';
import * as _135 from './applications/interchain_accounts/host/v1/query.js';
import * as _136 from './applications/interchain_accounts/host/v1/tx.js';
import * as _137 from './applications/interchain_accounts/v1/account.js';
import * as _138 from './applications/interchain_accounts/v1/metadata.js';
import * as _139 from './applications/interchain_accounts/v1/packet.js';
import * as _140 from './applications/transfer/v1/authz.js';
import * as _141 from './applications/transfer/v1/genesis.js';
import * as _142 from './applications/transfer/v1/query.js';
import * as _143 from './applications/transfer/v1/transfer.js';
import * as _144 from './applications/transfer/v1/tx.js';
import * as _145 from './applications/transfer/v2/packet.js';
import * as _146 from './core/channel/v1/channel.js';
import * as _147 from './core/channel/v1/genesis.js';
import * as _148 from './core/channel/v1/query.js';
import * as _149 from './core/channel/v1/tx.js';
import * as _150 from './core/client/v1/client.js';
import * as _151 from './core/client/v1/genesis.js';
import * as _152 from './core/client/v1/query.js';
import * as _153 from './core/client/v1/tx.js';
import * as _154 from './core/commitment/v1/commitment.js';
import * as _155 from './core/connection/v1/connection.js';
import * as _156 from './core/connection/v1/genesis.js';
import * as _157 from './core/connection/v1/query.js';
import * as _158 from './core/connection/v1/tx.js';
import * as _159 from './lightclients/localhost/v1/localhost.js';
import * as _160 from './lightclients/localhost/v2/localhost.js';
import * as _161 from './lightclients/solomachine/v1/solomachine.js';
import * as _162 from './lightclients/solomachine/v2/solomachine.js';
import * as _163 from './lightclients/solomachine/v3/solomachine.js';
import * as _164 from './lightclients/tendermint/v1/tendermint.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._130,
          ..._131,
          ..._132,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._133,
        };
      }
      export namespace host {
        export const v1 = {
          ..._134,
          ..._135,
          ..._136,
        };
      }
      export const v1 = {
        ..._137,
        ..._138,
        ..._139,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._140,
        ..._141,
        ..._142,
        ..._143,
        ..._144,
      };
      export const v2 = {
        ..._145,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._146,
        ..._147,
        ..._148,
        ..._149,
      };
    }
    export namespace client {
      export const v1 = {
        ..._150,
        ..._151,
        ..._152,
        ..._153,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._154,
      };
    }
    export namespace connection {
      export const v1 = {
        ..._155,
        ..._156,
        ..._157,
        ..._158,
      };
    }
  }
  export namespace lightclients {
    export namespace localhost {
      export const v1 = {
        ..._159,
      };
      export const v2 = {
        ..._160,
      };
    }
    export namespace solomachine {
      export const v1 = {
        ..._161,
      };
      export const v2 = {
        ..._162,
      };
      export const v3 = {
        ..._163,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._164,
      };
    }
  }
}
