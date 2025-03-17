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
import * as _56 from './capability/module/v1/module.js';
import * as _57 from './consensus/module/v1/module.js';
import * as _58 from './consensus/v1/query.js';
import * as _59 from './consensus/v1/tx.js';
import * as _60 from './crisis/module/v1/module.js';
import * as _61 from './crypto/ed25519/keys.js';
import * as _62 from './crypto/hd/v1/hd.js';
import * as _63 from './crypto/keyring/v1/record.js';
import * as _64 from './crypto/multisig/keys.js';
import * as _65 from './crypto/secp256k1/keys.js';
import * as _66 from './crypto/secp256r1/keys.js';
import * as _67 from './distribution/module/v1/module.js';
import * as _68 from './distribution/v1beta1/distribution.js';
import * as _69 from './distribution/v1beta1/genesis.js';
import * as _70 from './distribution/v1beta1/query.js';
import * as _71 from './distribution/v1beta1/tx.js';
import * as _72 from './evidence/module/v1/module.js';
import * as _73 from './feegrant/module/v1/module.js';
import * as _74 from './feegrant/v1beta1/feegrant.js';
import * as _75 from './feegrant/v1beta1/genesis.js';
import * as _76 from './feegrant/v1beta1/query.js';
import * as _77 from './feegrant/v1beta1/tx.js';
import * as _78 from './genutil/module/v1/module.js';
import * as _79 from './gov/module/v1/module.js';
import * as _80 from './gov/v1/genesis.js';
import * as _81 from './gov/v1/gov.js';
import * as _82 from './gov/v1/query.js';
import * as _83 from './gov/v1/tx.js';
import * as _84 from './gov/v1beta1/genesis.js';
import * as _85 from './gov/v1beta1/gov.js';
import * as _86 from './gov/v1beta1/query.js';
import * as _87 from './gov/v1beta1/tx.js';
import * as _88 from './group/module/v1/module.js';
import * as _89 from './group/v1/events.js';
import * as _90 from './group/v1/genesis.js';
import * as _91 from './group/v1/query.js';
import * as _92 from './group/v1/tx.js';
import * as _93 from './group/v1/types.js';
import * as _94 from './ics23/v1/proofs.js';
import * as _95 from './mint/module/v1/module.js';
import * as _96 from './mint/v1beta1/genesis.js';
import * as _97 from './mint/v1beta1/mint.js';
import * as _98 from './mint/v1beta1/query.js';
import * as _99 from './mint/v1beta1/tx.js';
import * as _100 from './nft/module/v1/module.js';
import * as _101 from './params/module/v1/module.js';
import * as _102 from './params/v1beta1/params.js';
import * as _103 from './params/v1beta1/query.js';
import * as _104 from './query/v1/query.js';
import * as _105 from './reflection/v1/reflection.js';
import * as _106 from './slashing/module/v1/module.js';
import * as _107 from './staking/module/v1/module.js';
import * as _108 from './staking/v1beta1/authz.js';
import * as _109 from './staking/v1beta1/genesis.js';
import * as _110 from './staking/v1beta1/query.js';
import * as _111 from './staking/v1beta1/staking.js';
import * as _112 from './staking/v1beta1/tx.js';
import * as _113 from './tx/config/v1/config.js';
import * as _114 from './tx/signing/v1beta1/signing.js';
import * as _115 from './tx/v1beta1/service.js';
import * as _116 from './tx/v1beta1/tx.js';
import * as _117 from './upgrade/module/v1/module.js';
import * as _118 from './upgrade/v1beta1/query.js';
import * as _119 from './upgrade/v1beta1/tx.js';
import * as _120 from './upgrade/v1beta1/upgrade.js';
import * as _121 from './vesting/module/v1/module.js';
import * as _122 from './vesting/v1beta1/tx.js';
import * as _123 from './vesting/v1beta1/vesting.js';
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
  export namespace capability {
    export namespace module {
      export const v1 = {
        ..._56,
      };
    }
  }
  export namespace consensus {
    export namespace module {
      export const v1 = {
        ..._57,
      };
    }
    export const v1 = {
      ..._58,
      ..._59,
    };
  }
  export namespace crisis {
    export namespace module {
      export const v1 = {
        ..._60,
      };
    }
  }
  export namespace crypto {
    export const ed25519 = {
      ..._61,
    };
    export namespace hd {
      export const v1 = {
        ..._62,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._63,
      };
    }
    export const multisig = {
      ..._64,
    };
    export const secp256k1 = {
      ..._65,
    };
    export const secp256r1 = {
      ..._66,
    };
  }
  export namespace distribution {
    export namespace module {
      export const v1 = {
        ..._67,
      };
    }
    export const v1beta1 = {
      ..._68,
      ..._69,
      ..._70,
      ..._71,
    };
  }
  export namespace evidence {
    export namespace module {
      export const v1 = {
        ..._72,
      };
    }
  }
  export namespace feegrant {
    export namespace module {
      export const v1 = {
        ..._73,
      };
    }
    export const v1beta1 = {
      ..._74,
      ..._75,
      ..._76,
      ..._77,
    };
  }
  export namespace genutil {
    export namespace module {
      export const v1 = {
        ..._78,
      };
    }
  }
  export namespace gov {
    export namespace module {
      export const v1 = {
        ..._79,
      };
    }
    export const v1 = {
      ..._80,
      ..._81,
      ..._82,
      ..._83,
    };
    export const v1beta1 = {
      ..._84,
      ..._85,
      ..._86,
      ..._87,
    };
  }
  export namespace group {
    export namespace module {
      export const v1 = {
        ..._88,
      };
    }
    export const v1 = {
      ..._89,
      ..._90,
      ..._91,
      ..._92,
      ..._93,
    };
  }
  export namespace ics23 {
    export const v1 = {
      ..._94,
    };
  }
  export namespace mint {
    export namespace module {
      export const v1 = {
        ..._95,
      };
    }
    export const v1beta1 = {
      ..._96,
      ..._97,
      ..._98,
      ..._99,
    };
  }
  export namespace nft {
    export namespace module {
      export const v1 = {
        ..._100,
      };
    }
  }
  export namespace params {
    export namespace module {
      export const v1 = {
        ..._101,
      };
    }
    export const v1beta1 = {
      ..._102,
      ..._103,
    };
  }
  export namespace query {
    export const v1 = {
      ..._104,
    };
  }
  export namespace reflection {
    export const v1 = {
      ..._105,
    };
  }
  export namespace slashing {
    export namespace module {
      export const v1 = {
        ..._106,
      };
    }
  }
  export namespace staking {
    export namespace module {
      export const v1 = {
        ..._107,
      };
    }
    export const v1beta1 = {
      ..._108,
      ..._109,
      ..._110,
      ..._111,
      ..._112,
    };
  }
  export namespace tx {
    export namespace config {
      export const v1 = {
        ..._113,
      };
    }
    export namespace signing {
      export const v1beta1 = {
        ..._114,
      };
    }
    export const v1beta1 = {
      ..._115,
      ..._116,
    };
  }
  export namespace upgrade {
    export namespace module {
      export const v1 = {
        ..._117,
      };
    }
    export const v1beta1 = {
      ..._118,
      ..._119,
      ..._120,
    };
  }
  export namespace vesting {
    export namespace module {
      export const v1 = {
        ..._121,
      };
    }
    export const v1beta1 = {
      ..._122,
      ..._123,
    };
  }
}
