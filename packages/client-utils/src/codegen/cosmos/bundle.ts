//@ts-nocheck
import * as _33 from './app/runtime/v1alpha1/module.js';
import * as _34 from './auth/module/v1/module.js';
import * as _35 from './auth/v1beta1/auth.js';
import * as _36 from './auth/v1beta1/genesis.js';
import * as _37 from './auth/v1beta1/query.js';
import * as _38 from './auth/v1beta1/tx.js';
import * as _39 from './authz/module/v1/module.js';
import * as _40 from './authz/v1beta1/authz.js';
import * as _41 from './authz/v1beta1/event.js';
import * as _42 from './authz/v1beta1/genesis.js';
import * as _43 from './authz/v1beta1/query.js';
import * as _44 from './authz/v1beta1/tx.js';
import * as _45 from './bank/module/v1/module.js';
import * as _46 from './bank/v1beta1/authz.js';
import * as _47 from './bank/v1beta1/bank.js';
import * as _48 from './bank/v1beta1/genesis.js';
import * as _49 from './bank/v1beta1/query.js';
import * as _50 from './bank/v1beta1/tx.js';
import * as _51 from './base/abci/v1beta1/abci.js';
import * as _52 from './base/node/v1beta1/query.js';
import * as _53 from './base/query/v1beta1/pagination.js';
import * as _54 from './base/reflection/v2alpha1/reflection.js';
import * as _55 from './base/v1beta1/coin.js';
import * as _56 from './circuit/module/v1/module.js';
import * as _57 from './circuit/v1/query.js';
import * as _58 from './circuit/v1/tx.js';
import * as _59 from './circuit/v1/types.js';
import * as _60 from './consensus/module/v1/module.js';
import * as _61 from './consensus/v1/query.js';
import * as _62 from './consensus/v1/tx.js';
import * as _63 from './crisis/module/v1/module.js';
import * as _64 from './crypto/ed25519/keys.js';
import * as _65 from './crypto/hd/v1/hd.js';
import * as _66 from './crypto/keyring/v1/record.js';
import * as _67 from './crypto/multisig/keys.js';
import * as _68 from './crypto/secp256k1/keys.js';
import * as _69 from './crypto/secp256r1/keys.js';
import * as _70 from './distribution/module/v1/module.js';
import * as _71 from './distribution/v1beta1/distribution.js';
import * as _72 from './distribution/v1beta1/genesis.js';
import * as _73 from './distribution/v1beta1/query.js';
import * as _74 from './distribution/v1beta1/tx.js';
import * as _75 from './evidence/module/v1/module.js';
import * as _76 from './feegrant/module/v1/module.js';
import * as _77 from './feegrant/v1beta1/feegrant.js';
import * as _78 from './feegrant/v1beta1/genesis.js';
import * as _79 from './feegrant/v1beta1/query.js';
import * as _80 from './feegrant/v1beta1/tx.js';
import * as _81 from './genutil/module/v1/module.js';
import * as _82 from './gov/module/v1/module.js';
import * as _83 from './gov/v1/genesis.js';
import * as _84 from './gov/v1/gov.js';
import * as _85 from './gov/v1/query.js';
import * as _86 from './gov/v1/tx.js';
import * as _87 from './gov/v1beta1/genesis.js';
import * as _88 from './gov/v1beta1/gov.js';
import * as _89 from './gov/v1beta1/query.js';
import * as _90 from './gov/v1beta1/tx.js';
import * as _91 from './group/module/v1/module.js';
import * as _92 from './group/v1/events.js';
import * as _93 from './group/v1/genesis.js';
import * as _94 from './group/v1/query.js';
import * as _95 from './group/v1/tx.js';
import * as _96 from './group/v1/types.js';
import * as _97 from './ics23/v1/proofs.js';
import * as _98 from './mint/module/v1/module.js';
import * as _99 from './mint/v1beta1/genesis.js';
import * as _100 from './mint/v1beta1/mint.js';
import * as _101 from './mint/v1beta1/query.js';
import * as _102 from './mint/v1beta1/tx.js';
import * as _103 from './msg/textual/v1/textual.js';
import * as _104 from './nft/module/v1/module.js';
import * as _105 from './params/module/v1/module.js';
import * as _106 from './params/v1beta1/params.js';
import * as _107 from './params/v1beta1/query.js';
import * as _108 from './query/v1/query.js';
import * as _109 from './reflection/v1/reflection.js';
import * as _110 from './slashing/module/v1/module.js';
import * as _111 from './staking/module/v1/module.js';
import * as _112 from './staking/v1beta1/authz.js';
import * as _113 from './staking/v1beta1/genesis.js';
import * as _114 from './staking/v1beta1/query.js';
import * as _115 from './staking/v1beta1/staking.js';
import * as _116 from './staking/v1beta1/tx.js';
import * as _117 from './store/internal/kv/v1beta1/kv.js';
import * as _118 from './store/snapshots/v1/snapshot.js';
import * as _119 from './store/streaming/abci/grpc.js';
import * as _120 from './store/v1beta1/commit_info.js';
import * as _121 from './store/v1beta1/listening.js';
import * as _122 from './tx/config/v1/config.js';
import * as _123 from './tx/signing/v1beta1/signing.js';
import * as _124 from './tx/v1beta1/service.js';
import * as _125 from './tx/v1beta1/tx.js';
import * as _126 from './upgrade/module/v1/module.js';
import * as _127 from './upgrade/v1beta1/query.js';
import * as _128 from './upgrade/v1beta1/tx.js';
import * as _129 from './upgrade/v1beta1/upgrade.js';
import * as _130 from './vesting/module/v1/module.js';
import * as _131 from './vesting/v1beta1/tx.js';
import * as _132 from './vesting/v1beta1/vesting.js';
import * as _235 from './auth/v1beta1/query.rpc.Query.js';
import * as _236 from './authz/v1beta1/query.rpc.Query.js';
import * as _237 from './bank/v1beta1/query.rpc.Query.js';
import * as _238 from './base/node/v1beta1/query.rpc.Service.js';
import * as _239 from './circuit/v1/query.rpc.Query.js';
import * as _240 from './consensus/v1/query.rpc.Query.js';
import * as _241 from './distribution/v1beta1/query.rpc.Query.js';
import * as _242 from './feegrant/v1beta1/query.rpc.Query.js';
import * as _243 from './gov/v1/query.rpc.Query.js';
import * as _244 from './gov/v1beta1/query.rpc.Query.js';
import * as _245 from './group/v1/query.rpc.Query.js';
import * as _246 from './mint/v1beta1/query.rpc.Query.js';
import * as _247 from './params/v1beta1/query.rpc.Query.js';
import * as _248 from './staking/v1beta1/query.rpc.Query.js';
import * as _249 from './tx/v1beta1/service.rpc.Service.js';
import * as _250 from './upgrade/v1beta1/query.rpc.Query.js';
import * as _251 from './auth/v1beta1/tx.rpc.msg.js';
import * as _252 from './authz/v1beta1/tx.rpc.msg.js';
import * as _253 from './bank/v1beta1/tx.rpc.msg.js';
import * as _254 from './circuit/v1/tx.rpc.msg.js';
import * as _255 from './consensus/v1/tx.rpc.msg.js';
import * as _256 from './distribution/v1beta1/tx.rpc.msg.js';
import * as _257 from './feegrant/v1beta1/tx.rpc.msg.js';
import * as _258 from './gov/v1/tx.rpc.msg.js';
import * as _259 from './gov/v1beta1/tx.rpc.msg.js';
import * as _260 from './group/v1/tx.rpc.msg.js';
import * as _261 from './mint/v1beta1/tx.rpc.msg.js';
import * as _262 from './staking/v1beta1/tx.rpc.msg.js';
import * as _263 from './upgrade/v1beta1/tx.rpc.msg.js';
import * as _264 from './vesting/v1beta1/tx.rpc.msg.js';
import * as _295 from './rpc.query.js';
import * as _296 from './rpc.tx.js';
export namespace cosmos {
  export namespace app {
    export namespace runtime {
      export const v1alpha1 = {
        ..._33,
      };
    }
  }
  export namespace auth {
    export namespace module {
      export const v1 = {
        ..._34,
      };
    }
    export const v1beta1 = {
      ..._35,
      ..._36,
      ..._37,
      ..._38,
      ..._235,
      ..._251,
    };
  }
  export namespace authz {
    export namespace module {
      export const v1 = {
        ..._39,
      };
    }
    export const v1beta1 = {
      ..._40,
      ..._41,
      ..._42,
      ..._43,
      ..._44,
      ..._236,
      ..._252,
    };
  }
  export namespace bank {
    export namespace module {
      export const v1 = {
        ..._45,
      };
    }
    export const v1beta1 = {
      ..._46,
      ..._47,
      ..._48,
      ..._49,
      ..._50,
      ..._237,
      ..._253,
    };
  }
  export namespace base {
    export namespace abci {
      export const v1beta1 = {
        ..._51,
      };
    }
    export namespace node {
      export const v1beta1 = {
        ..._52,
        ..._238,
      };
    }
    export namespace query {
      export const v1beta1 = {
        ..._53,
      };
    }
    export namespace reflection {
      export const v2alpha1 = {
        ..._54,
      };
    }
    export const v1beta1 = {
      ..._55,
    };
  }
  export namespace circuit {
    export namespace module {
      export const v1 = {
        ..._56,
      };
    }
    export const v1 = {
      ..._57,
      ..._58,
      ..._59,
      ..._239,
      ..._254,
    };
  }
  export namespace consensus {
    export namespace module {
      export const v1 = {
        ..._60,
      };
    }
    export const v1 = {
      ..._61,
      ..._62,
      ..._240,
      ..._255,
    };
  }
  export namespace crisis {
    export namespace module {
      export const v1 = {
        ..._63,
      };
    }
  }
  export namespace crypto {
    export const ed25519 = {
      ..._64,
    };
    export namespace hd {
      export const v1 = {
        ..._65,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._66,
      };
    }
    export const multisig = {
      ..._67,
    };
    export const secp256k1 = {
      ..._68,
    };
    export const secp256r1 = {
      ..._69,
    };
  }
  export namespace distribution {
    export namespace module {
      export const v1 = {
        ..._70,
      };
    }
    export const v1beta1 = {
      ..._71,
      ..._72,
      ..._73,
      ..._74,
      ..._241,
      ..._256,
    };
  }
  export namespace evidence {
    export namespace module {
      export const v1 = {
        ..._75,
      };
    }
  }
  export namespace feegrant {
    export namespace module {
      export const v1 = {
        ..._76,
      };
    }
    export const v1beta1 = {
      ..._77,
      ..._78,
      ..._79,
      ..._80,
      ..._242,
      ..._257,
    };
  }
  export namespace genutil {
    export namespace module {
      export const v1 = {
        ..._81,
      };
    }
  }
  export namespace gov {
    export namespace module {
      export const v1 = {
        ..._82,
      };
    }
    export const v1 = {
      ..._83,
      ..._84,
      ..._85,
      ..._86,
      ..._243,
      ..._258,
    };
    export const v1beta1 = {
      ..._87,
      ..._88,
      ..._89,
      ..._90,
      ..._244,
      ..._259,
    };
  }
  export namespace group {
    export namespace module {
      export const v1 = {
        ..._91,
      };
    }
    export const v1 = {
      ..._92,
      ..._93,
      ..._94,
      ..._95,
      ..._96,
      ..._245,
      ..._260,
    };
  }
  export namespace ics23 {
    export const v1 = {
      ..._97,
    };
  }
  export namespace mint {
    export namespace module {
      export const v1 = {
        ..._98,
      };
    }
    export const v1beta1 = {
      ..._99,
      ..._100,
      ..._101,
      ..._102,
      ..._246,
      ..._261,
    };
  }
  export namespace msg {
    export namespace textual {
      export const v1 = {
        ..._103,
      };
    }
  }
  export namespace nft {
    export namespace module {
      export const v1 = {
        ..._104,
      };
    }
  }
  export namespace params {
    export namespace module {
      export const v1 = {
        ..._105,
      };
    }
    export const v1beta1 = {
      ..._106,
      ..._107,
      ..._247,
    };
  }
  export namespace query {
    export const v1 = {
      ..._108,
    };
  }
  export namespace reflection {
    export const v1 = {
      ..._109,
    };
  }
  export namespace slashing {
    export namespace module {
      export const v1 = {
        ..._110,
      };
    }
  }
  export namespace staking {
    export namespace module {
      export const v1 = {
        ..._111,
      };
    }
    export const v1beta1 = {
      ..._112,
      ..._113,
      ..._114,
      ..._115,
      ..._116,
      ..._248,
      ..._262,
    };
  }
  export namespace store {
    export namespace internal {
      export namespace kv {
        export const v1beta1 = {
          ..._117,
        };
      }
    }
    export namespace snapshots {
      export const v1 = {
        ..._118,
      };
    }
    export namespace streaming {
      export const abci = {
        ..._119,
      };
    }
    export const v1beta1 = {
      ..._120,
      ..._121,
    };
  }
  export namespace tx {
    export namespace config {
      export const v1 = {
        ..._122,
      };
    }
    export namespace signing {
      export const v1beta1 = {
        ..._123,
      };
    }
    export const v1beta1 = {
      ..._124,
      ..._125,
      ..._249,
    };
  }
  export namespace upgrade {
    export namespace module {
      export const v1 = {
        ..._126,
      };
    }
    export const v1beta1 = {
      ..._127,
      ..._128,
      ..._129,
      ..._250,
      ..._263,
    };
  }
  export namespace vesting {
    export namespace module {
      export const v1 = {
        ..._130,
      };
    }
    export const v1beta1 = {
      ..._131,
      ..._132,
      ..._264,
    };
  }
  export const ClientFactory = {
    ..._295,
    ..._296,
  };
}
