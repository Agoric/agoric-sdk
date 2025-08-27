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
import * as _54 from './circuit/module/v1/module.js';
import * as _55 from './circuit/v1/query.js';
import * as _56 from './circuit/v1/tx.js';
import * as _57 from './circuit/v1/types.js';
import * as _58 from './consensus/module/v1/module.js';
import * as _59 from './consensus/v1/query.js';
import * as _60 from './consensus/v1/tx.js';
import * as _61 from './crisis/module/v1/module.js';
import * as _62 from './crypto/ed25519/keys.js';
import * as _63 from './crypto/hd/v1/hd.js';
import * as _64 from './crypto/keyring/v1/record.js';
import * as _65 from './crypto/multisig/keys.js';
import * as _66 from './crypto/secp256k1/keys.js';
import * as _67 from './crypto/secp256r1/keys.js';
import * as _68 from './distribution/module/v1/module.js';
import * as _69 from './distribution/v1beta1/distribution.js';
import * as _70 from './distribution/v1beta1/genesis.js';
import * as _71 from './distribution/v1beta1/query.js';
import * as _72 from './distribution/v1beta1/tx.js';
import * as _73 from './evidence/module/v1/module.js';
import * as _74 from './feegrant/module/v1/module.js';
import * as _75 from './feegrant/v1beta1/feegrant.js';
import * as _76 from './feegrant/v1beta1/genesis.js';
import * as _77 from './feegrant/v1beta1/query.js';
import * as _78 from './feegrant/v1beta1/tx.js';
import * as _79 from './genutil/module/v1/module.js';
import * as _80 from './gov/module/v1/module.js';
import * as _81 from './gov/v1/genesis.js';
import * as _82 from './gov/v1/gov.js';
import * as _83 from './gov/v1/query.js';
import * as _84 from './gov/v1/tx.js';
import * as _85 from './gov/v1beta1/genesis.js';
import * as _86 from './gov/v1beta1/gov.js';
import * as _87 from './gov/v1beta1/query.js';
import * as _88 from './gov/v1beta1/tx.js';
import * as _89 from './group/module/v1/module.js';
import * as _90 from './group/v1/events.js';
import * as _91 from './group/v1/genesis.js';
import * as _92 from './group/v1/query.js';
import * as _93 from './group/v1/tx.js';
import * as _94 from './group/v1/types.js';
import * as _95 from './ics23/v1/proofs.js';
import * as _96 from './mint/module/v1/module.js';
import * as _97 from './mint/v1beta1/genesis.js';
import * as _98 from './mint/v1beta1/mint.js';
import * as _99 from './mint/v1beta1/query.js';
import * as _100 from './mint/v1beta1/tx.js';
import * as _101 from './msg/textual/v1/textual.js';
import * as _102 from './nft/module/v1/module.js';
import * as _103 from './params/module/v1/module.js';
import * as _104 from './params/v1beta1/params.js';
import * as _105 from './params/v1beta1/query.js';
import * as _106 from './query/v1/query.js';
import * as _107 from './reflection/v1/reflection.js';
import * as _108 from './slashing/module/v1/module.js';
import * as _109 from './staking/module/v1/module.js';
import * as _110 from './staking/v1beta1/authz.js';
import * as _111 from './staking/v1beta1/genesis.js';
import * as _112 from './staking/v1beta1/query.js';
import * as _113 from './staking/v1beta1/staking.js';
import * as _114 from './staking/v1beta1/tx.js';
import * as _115 from './store/internal/kv/v1beta1/kv.js';
import * as _116 from './store/snapshots/v1/snapshot.js';
import * as _117 from './store/streaming/abci/grpc.js';
import * as _118 from './store/v1beta1/commit_info.js';
import * as _119 from './store/v1beta1/listening.js';
import * as _120 from './tx/config/v1/config.js';
import * as _121 from './tx/signing/v1beta1/signing.js';
import * as _122 from './tx/v1beta1/service.js';
import * as _123 from './tx/v1beta1/tx.js';
import * as _124 from './upgrade/module/v1/module.js';
import * as _125 from './upgrade/v1beta1/query.js';
import * as _126 from './upgrade/v1beta1/tx.js';
import * as _127 from './upgrade/v1beta1/upgrade.js';
import * as _128 from './vesting/module/v1/module.js';
import * as _129 from './vesting/v1beta1/tx.js';
import * as _130 from './vesting/v1beta1/vesting.js';
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
  export namespace circuit {
    export namespace module {
      export const v1 = {
        ..._54,
      };
    }
    export const v1 = {
      ..._55,
      ..._56,
      ..._57,
    };
  }
  export namespace consensus {
    export namespace module {
      export const v1 = {
        ..._58,
      };
    }
    export const v1 = {
      ..._59,
      ..._60,
    };
  }
  export namespace crisis {
    export namespace module {
      export const v1 = {
        ..._61,
      };
    }
  }
  export namespace crypto {
    export const ed25519 = {
      ..._62,
    };
    export namespace hd {
      export const v1 = {
        ..._63,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._64,
      };
    }
    export const multisig = {
      ..._65,
    };
    export const secp256k1 = {
      ..._66,
    };
    export const secp256r1 = {
      ..._67,
    };
  }
  export namespace distribution {
    export namespace module {
      export const v1 = {
        ..._68,
      };
    }
    export const v1beta1 = {
      ..._69,
      ..._70,
      ..._71,
      ..._72,
    };
  }
  export namespace evidence {
    export namespace module {
      export const v1 = {
        ..._73,
      };
    }
  }
  export namespace feegrant {
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
  export namespace genutil {
    export namespace module {
      export const v1 = {
        ..._79,
      };
    }
  }
  export namespace gov {
    export namespace module {
      export const v1 = {
        ..._80,
      };
    }
    export const v1 = {
      ..._81,
      ..._82,
      ..._83,
      ..._84,
    };
    export const v1beta1 = {
      ..._85,
      ..._86,
      ..._87,
      ..._88,
    };
  }
  export namespace group {
    export namespace module {
      export const v1 = {
        ..._89,
      };
    }
    export const v1 = {
      ..._90,
      ..._91,
      ..._92,
      ..._93,
      ..._94,
    };
  }
  export namespace ics23 {
    export const v1 = {
      ..._95,
    };
  }
  export namespace mint {
    export namespace module {
      export const v1 = {
        ..._96,
      };
    }
    export const v1beta1 = {
      ..._97,
      ..._98,
      ..._99,
      ..._100,
    };
  }
  export namespace msg {
    export namespace textual {
      export const v1 = {
        ..._101,
      };
    }
  }
  export namespace nft {
    export namespace module {
      export const v1 = {
        ..._102,
      };
    }
  }
  export namespace params {
    export namespace module {
      export const v1 = {
        ..._103,
      };
    }
    export const v1beta1 = {
      ..._104,
      ..._105,
    };
  }
  export namespace query {
    export const v1 = {
      ..._106,
    };
  }
  export namespace reflection {
    export const v1 = {
      ..._107,
    };
  }
  export namespace slashing {
    export namespace module {
      export const v1 = {
        ..._108,
      };
    }
  }
  export namespace staking {
    export namespace module {
      export const v1 = {
        ..._109,
      };
    }
    export const v1beta1 = {
      ..._110,
      ..._111,
      ..._112,
      ..._113,
      ..._114,
    };
  }
  export namespace store {
    export namespace internal {
      export namespace kv {
        export const v1beta1 = {
          ..._115,
        };
      }
    }
    export namespace snapshots {
      export const v1 = {
        ..._116,
      };
    }
    export namespace streaming {
      export const abci = {
        ..._117,
      };
    }
    export const v1beta1 = {
      ..._118,
      ..._119,
    };
  }
  export namespace tx {
    export namespace config {
      export const v1 = {
        ..._120,
      };
    }
    export namespace signing {
      export const v1beta1 = {
        ..._121,
      };
    }
    export const v1beta1 = {
      ..._122,
      ..._123,
    };
  }
  export namespace upgrade {
    export namespace module {
      export const v1 = {
        ..._124,
      };
    }
    export const v1beta1 = {
      ..._125,
      ..._126,
      ..._127,
    };
  }
  export namespace vesting {
    export namespace module {
      export const v1 = {
        ..._128,
      };
    }
    export const v1beta1 = {
      ..._129,
      ..._130,
    };
  }
}
