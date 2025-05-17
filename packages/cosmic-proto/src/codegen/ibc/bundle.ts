//@ts-nocheck
import * as _102 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _103 from './applications/interchain_accounts/controller/v1/query.js';
import * as _104 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _105 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _106 from './applications/interchain_accounts/host/v1/host.js';
import * as _107 from './applications/interchain_accounts/host/v1/query.js';
import * as _108 from './applications/interchain_accounts/v1/account.js';
import * as _109 from './applications/interchain_accounts/v1/metadata.js';
import * as _110 from './applications/interchain_accounts/v1/packet.js';
import * as _111 from './applications/transfer/v1/authz.js';
import * as _112 from './applications/transfer/v1/genesis.js';
import * as _113 from './applications/transfer/v1/query.js';
import * as _114 from './applications/transfer/v1/transfer.js';
import * as _115 from './applications/transfer/v1/tx.js';
import * as _116 from './applications/transfer/v2/packet.js';
import * as _117 from './core/channel/v1/channel.js';
import * as _118 from './core/channel/v1/genesis.js';
import * as _119 from './core/channel/v1/query.js';
import * as _120 from './core/channel/v1/tx.js';
import * as _121 from './core/client/v1/client.js';
import * as _122 from './core/client/v1/genesis.js';
import * as _123 from './core/client/v1/query.js';
import * as _124 from './core/client/v1/tx.js';
import * as _125 from './core/commitment/v1/commitment.js';
import * as _126 from './core/connection/v1/connection.js';
import * as _127 from './core/connection/v1/genesis.js';
import * as _128 from './core/connection/v1/query.js';
import * as _129 from './core/connection/v1/tx.js';
import * as _130 from './lightclients/localhost/v1/localhost.js';
import * as _131 from './lightclients/solomachine/v1/solomachine.js';
import * as _132 from './lightclients/solomachine/v2/solomachine.js';
import * as _133 from './lightclients/tendermint/v1/tendermint.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._102,
          ..._103,
          ..._104,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._105,
        };
      }
      export namespace host {
        export const v1 = {
          ..._106,
          ..._107,
        };
      }
      export const v1 = {
        ..._108,
        ..._109,
        ..._110,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._111,
        ..._112,
        ..._113,
        ..._114,
        ..._115,
      };
      export const v2 = {
        ..._116,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._117,
        ..._118,
        ..._119,
        ..._120,
      };
    }
    export namespace client {
      export const v1 = {
        ..._121,
        ..._122,
        ..._123,
        ..._124,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._125,
      };
    }
    export namespace connection {
      export const v1 = {
        ..._126,
        ..._127,
        ..._128,
        ..._129,
      };
    }
  }
  export namespace lightclients {
    export namespace localhost {
      export const v1 = {
        ..._130,
      };
    }
    export namespace solomachine {
      export const v1 = {
        ..._131,
      };
      export const v2 = {
        ..._132,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._133,
      };
    }
  }
}
