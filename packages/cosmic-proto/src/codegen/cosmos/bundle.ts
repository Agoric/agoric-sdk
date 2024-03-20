//@ts-nocheck
import * as _17 from './auth/v1beta1/auth.js';
import * as _18 from './auth/v1beta1/genesis.js';
import * as _19 from './auth/v1beta1/query.js';
import * as _20 from './authz/v1beta1/authz.js';
import * as _21 from './authz/v1beta1/event.js';
import * as _22 from './authz/v1beta1/genesis.js';
import * as _23 from './authz/v1beta1/query.js';
import * as _24 from './authz/v1beta1/tx.js';
import * as _25 from './bank/v1beta1/authz.js';
import * as _26 from './bank/v1beta1/bank.js';
import * as _27 from './bank/v1beta1/genesis.js';
import * as _28 from './bank/v1beta1/query.js';
import * as _29 from './bank/v1beta1/tx.js';
import * as _30 from './base/abci/v1beta1/abci.js';
import * as _31 from './base/query/v1beta1/pagination.js';
import * as _32 from './base/reflection/v2alpha1/reflection.js';
import * as _33 from './base/v1beta1/coin.js';
import * as _34 from './crypto/ed25519/keys.js';
import * as _35 from './crypto/hd/v1/hd.js';
import * as _36 from './crypto/keyring/v1/record.js';
import * as _37 from './crypto/multisig/keys.js';
import * as _38 from './crypto/secp256k1/keys.js';
import * as _39 from './crypto/secp256r1/keys.js';
import * as _40 from './distribution/v1beta1/distribution.js';
import * as _41 from './distribution/v1beta1/genesis.js';
import * as _42 from './distribution/v1beta1/query.js';
import * as _43 from './distribution/v1beta1/tx.js';
import * as _44 from './feegrant/v1beta1/feegrant.js';
import * as _45 from './feegrant/v1beta1/genesis.js';
import * as _46 from './feegrant/v1beta1/query.js';
import * as _47 from './feegrant/v1beta1/tx.js';
import * as _48 from './gov/v1/genesis.js';
import * as _49 from './gov/v1/gov.js';
import * as _50 from './gov/v1/query.js';
import * as _51 from './gov/v1/tx.js';
import * as _52 from './gov/v1beta1/genesis.js';
import * as _53 from './gov/v1beta1/gov.js';
import * as _54 from './gov/v1beta1/query.js';
import * as _55 from './gov/v1beta1/tx.js';
import * as _56 from './group/v1/events.js';
import * as _57 from './group/v1/genesis.js';
import * as _58 from './group/v1/query.js';
import * as _59 from './group/v1/tx.js';
import * as _60 from './group/v1/types.js';
import * as _61 from './mint/v1beta1/genesis.js';
import * as _62 from './mint/v1beta1/mint.js';
import * as _63 from './mint/v1beta1/query.js';
import * as _64 from './params/v1beta1/params.js';
import * as _65 from './params/v1beta1/query.js';
import * as _66 from './staking/v1beta1/authz.js';
import * as _67 from './staking/v1beta1/genesis.js';
import * as _68 from './staking/v1beta1/query.js';
import * as _69 from './staking/v1beta1/staking.js';
import * as _70 from './staking/v1beta1/tx.js';
import * as _71 from './tx/signing/v1beta1/signing.js';
import * as _72 from './tx/v1beta1/service.js';
import * as _73 from './tx/v1beta1/tx.js';
import * as _74 from './upgrade/v1beta1/query.js';
import * as _75 from './upgrade/v1beta1/tx.js';
import * as _76 from './upgrade/v1beta1/upgrade.js';
import * as _77 from './vesting/v1beta1/tx.js';
import * as _78 from './vesting/v1beta1/vesting.js';
import * as _107 from './authz/v1beta1/tx.amino.js';
import * as _108 from './bank/v1beta1/tx.amino.js';
import * as _109 from './distribution/v1beta1/tx.amino.js';
import * as _110 from './feegrant/v1beta1/tx.amino.js';
import * as _111 from './gov/v1/tx.amino.js';
import * as _112 from './gov/v1beta1/tx.amino.js';
import * as _113 from './group/v1/tx.amino.js';
import * as _114 from './staking/v1beta1/tx.amino.js';
import * as _115 from './upgrade/v1beta1/tx.amino.js';
import * as _116 from './vesting/v1beta1/tx.amino.js';
import * as _117 from './authz/v1beta1/tx.registry.js';
import * as _118 from './bank/v1beta1/tx.registry.js';
import * as _119 from './distribution/v1beta1/tx.registry.js';
import * as _120 from './feegrant/v1beta1/tx.registry.js';
import * as _121 from './gov/v1/tx.registry.js';
import * as _122 from './gov/v1beta1/tx.registry.js';
import * as _123 from './group/v1/tx.registry.js';
import * as _124 from './staking/v1beta1/tx.registry.js';
import * as _125 from './upgrade/v1beta1/tx.registry.js';
import * as _126 from './vesting/v1beta1/tx.registry.js';
import * as _127 from './auth/v1beta1/query.rpc.Query.js';
import * as _128 from './authz/v1beta1/query.rpc.Query.js';
import * as _129 from './bank/v1beta1/query.rpc.Query.js';
import * as _130 from './distribution/v1beta1/query.rpc.Query.js';
import * as _131 from './feegrant/v1beta1/query.rpc.Query.js';
import * as _132 from './gov/v1/query.rpc.Query.js';
import * as _133 from './gov/v1beta1/query.rpc.Query.js';
import * as _134 from './group/v1/query.rpc.Query.js';
import * as _135 from './mint/v1beta1/query.rpc.Query.js';
import * as _136 from './params/v1beta1/query.rpc.Query.js';
import * as _137 from './staking/v1beta1/query.rpc.Query.js';
import * as _138 from './tx/v1beta1/service.rpc.Service.js';
import * as _139 from './upgrade/v1beta1/query.rpc.Query.js';
import * as _140 from './authz/v1beta1/tx.rpc.msg.js';
import * as _141 from './bank/v1beta1/tx.rpc.msg.js';
import * as _142 from './distribution/v1beta1/tx.rpc.msg.js';
import * as _143 from './feegrant/v1beta1/tx.rpc.msg.js';
import * as _144 from './gov/v1/tx.rpc.msg.js';
import * as _145 from './gov/v1beta1/tx.rpc.msg.js';
import * as _146 from './group/v1/tx.rpc.msg.js';
import * as _147 from './staking/v1beta1/tx.rpc.msg.js';
import * as _148 from './upgrade/v1beta1/tx.rpc.msg.js';
import * as _149 from './vesting/v1beta1/tx.rpc.msg.js';
import * as _152 from './rpc.query.js';
import * as _153 from './rpc.tx.js';
export namespace cosmos {
  export namespace auth {
    export const v1beta1 = {
      ..._17,
      ..._18,
      ..._19,
      ..._127,
    };
  }
  export namespace authz {
    export const v1beta1 = {
      ..._20,
      ..._21,
      ..._22,
      ..._23,
      ..._24,
      ..._107,
      ..._117,
      ..._128,
      ..._140,
    };
  }
  export namespace bank {
    export const v1beta1 = {
      ..._25,
      ..._26,
      ..._27,
      ..._28,
      ..._29,
      ..._108,
      ..._118,
      ..._129,
      ..._141,
    };
  }
  export namespace base {
    export namespace abci {
      export const v1beta1 = {
        ..._30,
      };
    }
    export namespace query {
      export const v1beta1 = {
        ..._31,
      };
    }
    export namespace reflection {
      export const v2alpha1 = {
        ..._32,
      };
    }
    export const v1beta1 = {
      ..._33,
    };
  }
  export namespace crypto {
    export const ed25519 = {
      ..._34,
    };
    export namespace hd {
      export const v1 = {
        ..._35,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._36,
      };
    }
    export const multisig = {
      ..._37,
    };
    export const secp256k1 = {
      ..._38,
    };
    export const secp256r1 = {
      ..._39,
    };
  }
  export namespace distribution {
    export const v1beta1 = {
      ..._40,
      ..._41,
      ..._42,
      ..._43,
      ..._109,
      ..._119,
      ..._130,
      ..._142,
    };
  }
  export namespace feegrant {
    export const v1beta1 = {
      ..._44,
      ..._45,
      ..._46,
      ..._47,
      ..._110,
      ..._120,
      ..._131,
      ..._143,
    };
  }
  export namespace gov {
    export const v1 = {
      ..._48,
      ..._49,
      ..._50,
      ..._51,
      ..._111,
      ..._121,
      ..._132,
      ..._144,
    };
    export const v1beta1 = {
      ..._52,
      ..._53,
      ..._54,
      ..._55,
      ..._112,
      ..._122,
      ..._133,
      ..._145,
    };
  }
  export namespace group {
    export const v1 = {
      ..._56,
      ..._57,
      ..._58,
      ..._59,
      ..._60,
      ..._113,
      ..._123,
      ..._134,
      ..._146,
    };
  }
  export namespace mint {
    export const v1beta1 = {
      ..._61,
      ..._62,
      ..._63,
      ..._135,
    };
  }
  export namespace params {
    export const v1beta1 = {
      ..._64,
      ..._65,
      ..._136,
    };
  }
  export namespace staking {
    export const v1beta1 = {
      ..._66,
      ..._67,
      ..._68,
      ..._69,
      ..._70,
      ..._114,
      ..._124,
      ..._137,
      ..._147,
    };
  }
  export namespace tx {
    export namespace signing {
      export const v1beta1 = {
        ..._71,
      };
    }
    export const v1beta1 = {
      ..._72,
      ..._73,
      ..._138,
    };
  }
  export namespace upgrade {
    export const v1beta1 = {
      ..._74,
      ..._75,
      ..._76,
      ..._115,
      ..._125,
      ..._139,
      ..._148,
    };
  }
  export namespace vesting {
    export const v1beta1 = {
      ..._77,
      ..._78,
      ..._116,
      ..._126,
      ..._149,
    };
  }
  export const ClientFactory = {
    ..._152,
    ..._153,
  };
}
