//@ts-nocheck
import * as _152 from './applications/interchain_accounts/controller/v1/controller.js';
import * as _153 from './applications/interchain_accounts/controller/v1/query.js';
import * as _154 from './applications/interchain_accounts/controller/v1/tx.js';
import * as _155 from './applications/interchain_accounts/genesis/v1/genesis.js';
import * as _156 from './applications/interchain_accounts/host/v1/host.js';
import * as _157 from './applications/interchain_accounts/host/v1/query.js';
import * as _158 from './applications/interchain_accounts/host/v1/tx.js';
import * as _159 from './applications/interchain_accounts/v1/account.js';
import * as _160 from './applications/interchain_accounts/v1/metadata.js';
import * as _161 from './applications/interchain_accounts/v1/packet.js';
import * as _162 from './applications/transfer/v1/authz.js';
import * as _163 from './applications/transfer/v1/denomtrace.js';
import * as _164 from './applications/transfer/v1/genesis.js';
import * as _165 from './applications/transfer/v1/packet.js';
import * as _166 from './applications/transfer/v1/query.js';
import * as _167 from './applications/transfer/v1/token.js';
import * as _168 from './applications/transfer/v1/transfer.js';
import * as _169 from './applications/transfer/v1/tx.js';
import * as _170 from './applications/transfer/v2/packet.js';
import * as _171 from './core/channel/v1/channel.js';
import * as _172 from './core/channel/v1/genesis.js';
import * as _173 from './core/channel/v1/query.js';
import * as _174 from './core/channel/v1/tx.js';
import * as _175 from './core/channel/v1/upgrade.js';
import * as _176 from './core/channel/v2/genesis.js';
import * as _177 from './core/channel/v2/packet.js';
import * as _178 from './core/channel/v2/query.js';
import * as _179 from './core/channel/v2/tx.js';
import * as _180 from './core/client/v1/client.js';
import * as _181 from './core/client/v1/genesis.js';
import * as _182 from './core/client/v1/query.js';
import * as _183 from './core/client/v1/tx.js';
import * as _184 from './core/client/v2/config.js';
import * as _185 from './core/client/v2/counterparty.js';
import * as _186 from './core/client/v2/genesis.js';
import * as _187 from './core/client/v2/query.js';
import * as _188 from './core/client/v2/tx.js';
import * as _189 from './core/commitment/v1/commitment.js';
import * as _190 from './core/commitment/v2/commitment.js';
import * as _191 from './core/connection/v1/connection.js';
import * as _192 from './core/connection/v1/genesis.js';
import * as _193 from './core/connection/v1/query.js';
import * as _194 from './core/connection/v1/tx.js';
import * as _195 from './lightclients/localhost/v1/localhost.js';
import * as _196 from './lightclients/localhost/v2/localhost.js';
import * as _197 from './lightclients/solomachine/v1/solomachine.js';
import * as _198 from './lightclients/solomachine/v2/solomachine.js';
import * as _199 from './lightclients/solomachine/v3/solomachine.js';
import * as _200 from './lightclients/tendermint/v1/tendermint.js';
import * as _201 from './lightclients/wasm/v1/genesis.js';
import * as _202 from './lightclients/wasm/v1/query.js';
import * as _203 from './lightclients/wasm/v1/tx.js';
import * as _204 from './lightclients/wasm/v1/wasm.js';
export namespace ibc {
  export namespace applications {
    export namespace interchain_accounts {
      export namespace controller {
        export const v1 = {
          ..._152,
          ..._153,
          ..._154,
        };
      }
      export namespace genesis {
        export const v1 = {
          ..._155,
        };
      }
      export namespace host {
        export const v1 = {
          ..._156,
          ..._157,
          ..._158,
        };
      }
      export const v1 = {
        ..._159,
        ..._160,
        ..._161,
      };
    }
    export namespace transfer {
      export const v1 = {
        ..._162,
        ..._163,
        ..._164,
        ..._165,
        ..._166,
        ..._167,
        ..._168,
        ..._169,
      };
      export const v2 = {
        ..._170,
      };
    }
  }
  export namespace core {
    export namespace channel {
      export const v1 = {
        ..._171,
        ..._172,
        ..._173,
        ..._174,
        ..._175,
      };
      export const v2 = {
        ..._176,
        ..._177,
        ..._178,
        ..._179,
      };
    }
    export namespace client {
      export const v1 = {
        ..._180,
        ..._181,
        ..._182,
        ..._183,
      };
      export const v2 = {
        ..._184,
        ..._185,
        ..._186,
        ..._187,
        ..._188,
      };
    }
    export namespace commitment {
      export const v1 = {
        ..._189,
      };
      export const v2 = {
        ..._190,
      };
    }
    export namespace connection {
      export const v1 = {
        ..._191,
        ..._192,
        ..._193,
        ..._194,
      };
    }
  }
  export namespace lightclients {
    export namespace localhost {
      export const v1 = {
        ..._195,
      };
      export const v2 = {
        ..._196,
      };
    }
    export namespace solomachine {
      export const v1 = {
        ..._197,
      };
      export const v2 = {
        ..._198,
      };
      export const v3 = {
        ..._199,
      };
    }
    export namespace tendermint {
      export const v1 = {
        ..._200,
      };
    }
    export namespace wasm {
      export const v1 = {
        ..._201,
        ..._202,
        ..._203,
        ..._204,
      };
    }
  }
}
