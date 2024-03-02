//@ts-nocheck
import * as _16 from './auth/v1beta1/auth.js';
import * as _17 from './auth/v1beta1/query.js';
import * as _18 from './authz/v1beta1/authz.js';
import * as _19 from './authz/v1beta1/query.js';
import * as _20 from './authz/v1beta1/tx.js';
import * as _21 from './bank/v1beta1/authz.js';
import * as _22 from './bank/v1beta1/bank.js';
import * as _23 from './bank/v1beta1/query.js';
import * as _24 from './bank/v1beta1/tx.js';
import * as _25 from './base/abci/v1beta1/abci.js';
import * as _26 from './base/query/v1beta1/pagination.js';
import * as _27 from './base/v1beta1/coin.js';
import * as _28 from './crypto/ed25519/keys.js';
import * as _29 from './crypto/hd/v1/hd.js';
import * as _30 from './crypto/keyring/v1/record.js';
import * as _31 from './crypto/multisig/keys.js';
import * as _32 from './crypto/secp256k1/keys.js';
import * as _33 from './crypto/secp256r1/keys.js';
import * as _34 from './staking/v1beta1/authz.js';
import * as _35 from './staking/v1beta1/query.js';
import * as _36 from './staking/v1beta1/staking.js';
import * as _37 from './staking/v1beta1/tx.js';
import * as _38 from './tx/signing/v1beta1/signing.js';
import * as _39 from './tx/v1beta1/service.js';
import * as _40 from './tx/v1beta1/tx.js';
import * as _41 from './upgrade/v1beta1/upgrade.js';
import * as _80 from './authz/v1beta1/tx.amino.js';
import * as _81 from './bank/v1beta1/tx.amino.js';
import * as _82 from './staking/v1beta1/tx.amino.js';
import * as _83 from './authz/v1beta1/tx.registry.js';
import * as _84 from './bank/v1beta1/tx.registry.js';
import * as _85 from './staking/v1beta1/tx.registry.js';
import * as _86 from './auth/v1beta1/query.rpc.Query.js';
import * as _87 from './authz/v1beta1/query.rpc.Query.js';
import * as _88 from './bank/v1beta1/query.rpc.Query.js';
import * as _89 from './staking/v1beta1/query.rpc.Query.js';
import * as _90 from './tx/v1beta1/service.rpc.Service.js';
import * as _91 from './authz/v1beta1/tx.rpc.msg.js';
import * as _92 from './bank/v1beta1/tx.rpc.msg.js';
import * as _93 from './staking/v1beta1/tx.rpc.msg.js';
import * as _105 from './rpc.query.js';
import * as _106 from './rpc.tx.js';
export namespace cosmos {
  export namespace auth {
    export const v1beta1 = {
      ..._16,
      ..._17,
      ..._86,
    };
  }
  export namespace authz {
    export const v1beta1 = {
      ..._18,
      ..._19,
      ..._20,
      ..._80,
      ..._83,
      ..._87,
      ..._91,
    };
  }
  export namespace bank {
    export const v1beta1 = {
      ..._21,
      ..._22,
      ..._23,
      ..._24,
      ..._81,
      ..._84,
      ..._88,
      ..._92,
    };
  }
  export namespace base {
    export namespace abci {
      export const v1beta1 = {
        ..._25,
      };
    }
    export namespace query {
      export const v1beta1 = {
        ..._26,
      };
    }
    export const v1beta1 = {
      ..._27,
    };
  }
  export namespace crypto {
    export const ed25519 = {
      ..._28,
    };
    export namespace hd {
      export const v1 = {
        ..._29,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._30,
      };
    }
    export const multisig = {
      ..._31,
    };
    export const secp256k1 = {
      ..._32,
    };
    export const secp256r1 = {
      ..._33,
    };
  }
  export namespace staking {
    export const v1beta1 = {
      ..._34,
      ..._35,
      ..._36,
      ..._37,
      ..._82,
      ..._85,
      ..._89,
      ..._93,
    };
  }
  export namespace tx {
    export namespace signing {
      export const v1beta1 = {
        ..._38,
      };
    }
    export const v1beta1 = {
      ..._39,
      ..._40,
      ..._90,
    };
  }
  export namespace upgrade {
    export const v1beta1 = {
      ..._41,
    };
  }
  export const ClientFactory = {
    ..._105,
    ..._106,
  };
}
