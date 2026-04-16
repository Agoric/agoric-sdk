//@ts-nocheck
import * as _31 from './app/runtime/v1alpha1/module.js';
import * as _32 from './auth/module/v1/module.js';
import * as _33 from './auth/v1beta1/auth.js';
import * as _34 from './auth/v1beta1/genesis.js';
import * as _35 from './auth/v1beta1/query.js';
import * as _36 from './auth/v1beta1/tx.js';
import * as _37 from './authz/module/v1/module.js';
import * as _38 from './authz/v1beta1/authz.js';
import * as _39 from './authz/v1beta1/event.js';
import * as _40 from './authz/v1beta1/genesis.js';
import * as _41 from './authz/v1beta1/query.js';
import * as _42 from './authz/v1beta1/tx.js';
import * as _43 from './bank/module/v1/module.js';
import * as _44 from './bank/v1beta1/authz.js';
import * as _45 from './bank/v1beta1/bank.js';
import * as _46 from './bank/v1beta1/genesis.js';
import * as _47 from './bank/v1beta1/query.js';
import * as _48 from './bank/v1beta1/tx.js';
import * as _49 from './base/abci/v1beta1/abci.js';
import * as _50 from './base/node/v1beta1/query.js';
import * as _51 from './base/query/v1beta1/pagination.js';
import * as _52 from './base/reflection/v2alpha1/reflection.js';
import * as _53 from './base/v1beta1/coin.js';
import * as _54 from './benchmark/module/v1/module.js';
import * as _55 from './benchmark/v1/benchmark.js';
import * as _56 from './benchmark/v1/tx.js';
import * as _57 from './circuit/module/v1/module.js';
import * as _58 from './circuit/v1/query.js';
import * as _59 from './circuit/v1/tx.js';
import * as _60 from './circuit/v1/types.js';
import * as _61 from './consensus/module/v1/module.js';
import * as _62 from './consensus/v1/query.js';
import * as _63 from './consensus/v1/tx.js';
import * as _64 from './counter/module/v1/module.js';
import * as _65 from './counter/v1/query.js';
import * as _66 from './counter/v1/tx.js';
import * as _67 from './crisis/module/v1/module.js';
import * as _68 from './crypto/ed25519/keys.js';
import * as _69 from './crypto/hd/v1/hd.js';
import * as _70 from './crypto/keyring/v1/record.js';
import * as _71 from './crypto/multisig/keys.js';
import * as _72 from './crypto/secp256k1/keys.js';
import * as _73 from './crypto/secp256r1/keys.js';
import * as _74 from './distribution/module/v1/module.js';
import * as _75 from './distribution/v1beta1/distribution.js';
import * as _76 from './distribution/v1beta1/genesis.js';
import * as _77 from './distribution/v1beta1/query.js';
import * as _78 from './distribution/v1beta1/tx.js';
import * as _79 from './epochs/module/v1/module.js';
import * as _80 from './epochs/v1beta1/events.js';
import * as _81 from './epochs/v1beta1/genesis.js';
import * as _82 from './epochs/v1beta1/query.js';
import * as _83 from './evidence/module/v1/module.js';
import * as _84 from './feegrant/module/v1/module.js';
import * as _85 from './feegrant/v1beta1/feegrant.js';
import * as _86 from './feegrant/v1beta1/genesis.js';
import * as _87 from './feegrant/v1beta1/query.js';
import * as _88 from './feegrant/v1beta1/tx.js';
import * as _89 from './genutil/module/v1/module.js';
import * as _90 from './gov/module/v1/module.js';
import * as _91 from './gov/v1/genesis.js';
import * as _92 from './gov/v1/gov.js';
import * as _93 from './gov/v1/query.js';
import * as _94 from './gov/v1/tx.js';
import * as _95 from './gov/v1beta1/genesis.js';
import * as _96 from './gov/v1beta1/gov.js';
import * as _97 from './gov/v1beta1/query.js';
import * as _98 from './gov/v1beta1/tx.js';
import * as _99 from './group/module/v1/module.js';
import * as _100 from './group/v1/events.js';
import * as _101 from './group/v1/genesis.js';
import * as _102 from './group/v1/query.js';
import * as _103 from './group/v1/tx.js';
import * as _104 from './group/v1/types.js';
import * as _105 from './ics23/v1/proofs.js';
import * as _106 from './mint/module/v1/module.js';
import * as _107 from './mint/v1beta1/genesis.js';
import * as _108 from './mint/v1beta1/mint.js';
import * as _109 from './mint/v1beta1/query.js';
import * as _110 from './mint/v1beta1/tx.js';
import * as _111 from './msg/textual/v1/textual.js';
import * as _112 from './nft/module/v1/module.js';
import * as _113 from './params/module/v1/module.js';
import * as _114 from './params/v1beta1/params.js';
import * as _115 from './params/v1beta1/query.js';
import * as _116 from './protocolpool/module/v1/module.js';
import * as _117 from './protocolpool/v1/genesis.js';
import * as _118 from './protocolpool/v1/query.js';
import * as _119 from './protocolpool/v1/tx.js';
import * as _120 from './protocolpool/v1/types.js';
import * as _121 from './query/v1/query.js';
import * as _122 from './reflection/v1/reflection.js';
import * as _123 from './slashing/module/v1/module.js';
import * as _124 from './staking/module/v1/module.js';
import * as _125 from './staking/v1beta1/authz.js';
import * as _126 from './staking/v1beta1/genesis.js';
import * as _127 from './staking/v1beta1/query.js';
import * as _128 from './staking/v1beta1/staking.js';
import * as _129 from './staking/v1beta1/tx.js';
import * as _130 from './store/internal/kv/v1beta1/kv.js';
import * as _131 from './store/snapshots/v1/snapshot.js';
import * as _132 from './store/streaming/abci/grpc.js';
import * as _133 from './store/v1beta1/commit_info.js';
import * as _134 from './store/v1beta1/listening.js';
import * as _135 from './tx/config/v1/config.js';
import * as _136 from './tx/signing/v1beta1/signing.js';
import * as _137 from './tx/v1beta1/service.js';
import * as _138 from './tx/v1beta1/tx.js';
import * as _139 from './upgrade/module/v1/module.js';
import * as _140 from './upgrade/v1beta1/query.js';
import * as _141 from './upgrade/v1beta1/tx.js';
import * as _142 from './upgrade/v1beta1/upgrade.js';
import * as _143 from './vesting/module/v1/module.js';
import * as _144 from './vesting/v1beta1/tx.js';
import * as _145 from './vesting/v1beta1/vesting.js';
export namespace cosmos {
  export namespace app {
    export namespace runtime {
      export const v1alpha1 = {
        ..._31,
      };
    }
  }
  export namespace auth {
    export namespace module {
      export const v1 = {
        ..._32,
      };
    }
    export const v1beta1 = {
      ..._33,
      ..._34,
      ..._35,
      ..._36,
    };
  }
  export namespace authz {
    export namespace module {
      export const v1 = {
        ..._37,
      };
    }
    export const v1beta1 = {
      ..._38,
      ..._39,
      ..._40,
      ..._41,
      ..._42,
    };
  }
  export namespace bank {
    export namespace module {
      export const v1 = {
        ..._43,
      };
    }
    export const v1beta1 = {
      ..._44,
      ..._45,
      ..._46,
      ..._47,
      ..._48,
    };
  }
  export namespace base {
    export namespace abci {
      export const v1beta1 = {
        ..._49,
      };
    }
    export namespace node {
      export const v1beta1 = {
        ..._50,
      };
    }
    export namespace query {
      export const v1beta1 = {
        ..._51,
      };
    }
    export namespace reflection {
      export const v2alpha1 = {
        ..._52,
      };
    }
    export const v1beta1 = {
      ..._53,
    };
  }
  export namespace benchmark {
    export namespace module {
      export const v1 = {
        ..._54,
      };
    }
    export const v1 = {
      ..._55,
      ..._56,
    };
  }
  export namespace circuit {
    export namespace module {
      export const v1 = {
        ..._57,
      };
    }
    export const v1 = {
      ..._58,
      ..._59,
      ..._60,
    };
  }
  export namespace consensus {
    export namespace module {
      export const v1 = {
        ..._61,
      };
    }
    export const v1 = {
      ..._62,
      ..._63,
    };
  }
  export namespace counter {
    export namespace module {
      export const v1 = {
        ..._64,
      };
    }
    export const v1 = {
      ..._65,
      ..._66,
    };
  }
  export namespace crisis {
    export namespace module {
      export const v1 = {
        ..._67,
      };
    }
  }
  export namespace crypto {
    export const ed25519 = {
      ..._68,
    };
    export namespace hd {
      export const v1 = {
        ..._69,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._70,
      };
    }
    export const multisig = {
      ..._71,
    };
    export const secp256k1 = {
      ..._72,
    };
    export const secp256r1 = {
      ..._73,
    };
  }
  export namespace distribution {
    export namespace module {
      export const v1 = {
        ..._74,
      };
    }
    export const v1beta1 = {
      ..._75,
      ..._76,
      ..._77,
      ..._78,
    };
  }
  export namespace epochs {
    export namespace module {
      export const v1 = {
        ..._79,
      };
    }
    export const v1beta1 = {
      ..._80,
      ..._81,
      ..._82,
    };
  }
  export namespace evidence {
    export namespace module {
      export const v1 = {
        ..._83,
      };
    }
  }
  export namespace feegrant {
    export namespace module {
      export const v1 = {
        ..._84,
      };
    }
    export const v1beta1 = {
      ..._85,
      ..._86,
      ..._87,
      ..._88,
    };
  }
  export namespace genutil {
    export namespace module {
      export const v1 = {
        ..._89,
      };
    }
  }
  export namespace gov {
    export namespace module {
      export const v1 = {
        ..._90,
      };
    }
    export const v1 = {
      ..._91,
      ..._92,
      ..._93,
      ..._94,
    };
    export const v1beta1 = {
      ..._95,
      ..._96,
      ..._97,
      ..._98,
    };
  }
  export namespace group {
    export namespace module {
      export const v1 = {
        ..._99,
      };
    }
    export const v1 = {
      ..._100,
      ..._101,
      ..._102,
      ..._103,
      ..._104,
    };
  }
  export namespace ics23 {
    export const v1 = {
      ..._105,
    };
  }
  export namespace mint {
    export namespace module {
      export const v1 = {
        ..._106,
      };
    }
    export const v1beta1 = {
      ..._107,
      ..._108,
      ..._109,
      ..._110,
    };
  }
  export namespace msg {
    export namespace textual {
      export const v1 = {
        ..._111,
      };
    }
  }
  export namespace nft {
    export namespace module {
      export const v1 = {
        ..._112,
      };
    }
  }
  export namespace params {
    export namespace module {
      export const v1 = {
        ..._113,
      };
    }
    export const v1beta1 = {
      ..._114,
      ..._115,
    };
  }
  export namespace protocolpool {
    export namespace module {
      export const v1 = {
        ..._116,
      };
    }
    export const v1 = {
      ..._117,
      ..._118,
      ..._119,
      ..._120,
    };
  }
  export namespace query {
    export const v1 = {
      ..._121,
    };
  }
  export namespace reflection {
    export const v1 = {
      ..._122,
    };
  }
  export namespace slashing {
    export namespace module {
      export const v1 = {
        ..._123,
      };
    }
  }
  export namespace staking {
    export namespace module {
      export const v1 = {
        ..._124,
      };
    }
    export const v1beta1 = {
      ..._125,
      ..._126,
      ..._127,
      ..._128,
      ..._129,
    };
  }
  export namespace store {
    export namespace internal {
      export namespace kv {
        export const v1beta1 = {
          ..._130,
        };
      }
    }
    export namespace snapshots {
      export const v1 = {
        ..._131,
      };
    }
    export namespace streaming {
      export const abci = {
        ..._132,
      };
    }
    export const v1beta1 = {
      ..._133,
      ..._134,
    };
  }
  export namespace tx {
    export namespace config {
      export const v1 = {
        ..._135,
      };
    }
    export namespace signing {
      export const v1beta1 = {
        ..._136,
      };
    }
    export const v1beta1 = {
      ..._137,
      ..._138,
    };
  }
  export namespace upgrade {
    export namespace module {
      export const v1 = {
        ..._139,
      };
    }
    export const v1beta1 = {
      ..._140,
      ..._141,
      ..._142,
    };
  }
  export namespace vesting {
    export namespace module {
      export const v1 = {
        ..._143,
      };
    }
    export const v1beta1 = {
      ..._144,
      ..._145,
    };
  }
}
