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
import * as _54 from './capability/module/v1/module.js';
import * as _55 from './consensus/module/v1/module.js';
import * as _56 from './consensus/v1/query.js';
import * as _57 from './consensus/v1/tx.js';
import * as _58 from './crisis/module/v1/module.js';
import * as _59 from './crypto/ed25519/keys.js';
import * as _60 from './crypto/hd/v1/hd.js';
import * as _61 from './crypto/keyring/v1/record.js';
import * as _62 from './crypto/multisig/keys.js';
import * as _63 from './crypto/secp256k1/keys.js';
import * as _64 from './crypto/secp256r1/keys.js';
import * as _65 from './distribution/module/v1/module.js';
import * as _66 from './distribution/v1beta1/distribution.js';
import * as _67 from './distribution/v1beta1/genesis.js';
import * as _68 from './distribution/v1beta1/query.js';
import * as _69 from './distribution/v1beta1/tx.js';
import * as _70 from './evidence/module/v1/module.js';
import * as _71 from './feegrant/module/v1/module.js';
import * as _72 from './feegrant/v1beta1/feegrant.js';
import * as _73 from './feegrant/v1beta1/genesis.js';
import * as _74 from './feegrant/v1beta1/query.js';
import * as _75 from './feegrant/v1beta1/tx.js';
import * as _76 from './genutil/module/v1/module.js';
import * as _77 from './gov/module/v1/module.js';
import * as _78 from './gov/v1/genesis.js';
import * as _79 from './gov/v1/gov.js';
import * as _80 from './gov/v1/query.js';
import * as _81 from './gov/v1/tx.js';
import * as _82 from './gov/v1beta1/genesis.js';
import * as _83 from './gov/v1beta1/gov.js';
import * as _84 from './gov/v1beta1/query.js';
import * as _85 from './gov/v1beta1/tx.js';
import * as _86 from './group/module/v1/module.js';
import * as _87 from './group/v1/events.js';
import * as _88 from './group/v1/genesis.js';
import * as _89 from './group/v1/query.js';
import * as _90 from './group/v1/tx.js';
import * as _91 from './group/v1/types.js';
import * as _92 from './ics23/v1/proofs.js';
import * as _93 from './mint/module/v1/module.js';
import * as _94 from './mint/v1beta1/genesis.js';
import * as _95 from './mint/v1beta1/mint.js';
import * as _96 from './mint/v1beta1/query.js';
import * as _97 from './mint/v1beta1/tx.js';
import * as _98 from './nft/module/v1/module.js';
import * as _99 from './params/module/v1/module.js';
import * as _100 from './params/v1beta1/params.js';
import * as _101 from './params/v1beta1/query.js';
import * as _102 from './query/v1/query.js';
import * as _103 from './reflection/v1/reflection.js';
import * as _104 from './slashing/module/v1/module.js';
import * as _105 from './staking/module/v1/module.js';
import * as _106 from './staking/v1beta1/authz.js';
import * as _107 from './staking/v1beta1/genesis.js';
import * as _108 from './staking/v1beta1/query.js';
import * as _109 from './staking/v1beta1/staking.js';
import * as _110 from './staking/v1beta1/tx.js';
import * as _111 from './tx/config/v1/config.js';
import * as _112 from './tx/signing/v1beta1/signing.js';
import * as _113 from './tx/v1beta1/service.js';
import * as _114 from './tx/v1beta1/tx.js';
import * as _115 from './upgrade/module/v1/module.js';
import * as _116 from './upgrade/v1beta1/query.js';
import * as _117 from './upgrade/v1beta1/tx.js';
import * as _118 from './upgrade/v1beta1/upgrade.js';
import * as _119 from './vesting/module/v1/module.js';
import * as _120 from './vesting/v1beta1/tx.js';
import * as _121 from './vesting/v1beta1/vesting.js';
import * as _219 from './auth/v1beta1/query.rpc.Query.js';
import * as _220 from './authz/v1beta1/query.rpc.Query.js';
import * as _221 from './bank/v1beta1/query.rpc.Query.js';
import * as _222 from './base/node/v1beta1/query.rpc.Service.js';
import * as _223 from './consensus/v1/query.rpc.Query.js';
import * as _224 from './distribution/v1beta1/query.rpc.Query.js';
import * as _225 from './feegrant/v1beta1/query.rpc.Query.js';
import * as _226 from './gov/v1/query.rpc.Query.js';
import * as _227 from './gov/v1beta1/query.rpc.Query.js';
import * as _228 from './group/v1/query.rpc.Query.js';
import * as _229 from './mint/v1beta1/query.rpc.Query.js';
import * as _230 from './params/v1beta1/query.rpc.Query.js';
import * as _231 from './staking/v1beta1/query.rpc.Query.js';
import * as _232 from './tx/v1beta1/service.rpc.Service.js';
import * as _233 from './upgrade/v1beta1/query.rpc.Query.js';
import * as _234 from './auth/v1beta1/tx.rpc.msg.js';
import * as _235 from './authz/v1beta1/tx.rpc.msg.js';
import * as _236 from './bank/v1beta1/tx.rpc.msg.js';
import * as _237 from './consensus/v1/tx.rpc.msg.js';
import * as _238 from './distribution/v1beta1/tx.rpc.msg.js';
import * as _239 from './feegrant/v1beta1/tx.rpc.msg.js';
import * as _240 from './gov/v1/tx.rpc.msg.js';
import * as _241 from './gov/v1beta1/tx.rpc.msg.js';
import * as _242 from './group/v1/tx.rpc.msg.js';
import * as _243 from './mint/v1beta1/tx.rpc.msg.js';
import * as _244 from './staking/v1beta1/tx.rpc.msg.js';
import * as _245 from './upgrade/v1beta1/tx.rpc.msg.js';
import * as _246 from './vesting/v1beta1/tx.rpc.msg.js';
import * as _275 from './rpc.query.js';
import * as _276 from './rpc.tx.js';
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
      ..._219,
      ..._234,
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
      ..._220,
      ..._235,
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
      ..._221,
      ..._236,
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
        ..._222,
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
  export namespace capability {
    export namespace module {
      export const v1 = {
        ..._54,
      };
    }
  }
  export namespace consensus {
    export namespace module {
      export const v1 = {
        ..._55,
      };
    }
    export const v1 = {
      ..._56,
      ..._57,
      ..._223,
      ..._237,
    };
  }
  export namespace crisis {
    export namespace module {
      export const v1 = {
        ..._58,
      };
    }
  }
  export namespace crypto {
    export const ed25519 = {
      ..._59,
    };
    export namespace hd {
      export const v1 = {
        ..._60,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._61,
      };
    }
    export const multisig = {
      ..._62,
    };
    export const secp256k1 = {
      ..._63,
    };
    export const secp256r1 = {
      ..._64,
    };
  }
  export namespace distribution {
    export namespace module {
      export const v1 = {
        ..._65,
      };
    }
    export const v1beta1 = {
      ..._66,
      ..._67,
      ..._68,
      ..._69,
      ..._224,
      ..._238,
    };
  }
  export namespace evidence {
    export namespace module {
      export const v1 = {
        ..._70,
      };
    }
  }
  export namespace feegrant {
    export namespace module {
      export const v1 = {
        ..._71,
      };
    }
    export const v1beta1 = {
      ..._72,
      ..._73,
      ..._74,
      ..._75,
      ..._225,
      ..._239,
    };
  }
  export namespace genutil {
    export namespace module {
      export const v1 = {
        ..._76,
      };
    }
  }
  export namespace gov {
    export namespace module {
      export const v1 = {
        ..._77,
      };
    }
    export const v1 = {
      ..._78,
      ..._79,
      ..._80,
      ..._81,
      ..._226,
      ..._240,
    };
    export const v1beta1 = {
      ..._82,
      ..._83,
      ..._84,
      ..._85,
      ..._227,
      ..._241,
    };
  }
  export namespace group {
    export namespace module {
      export const v1 = {
        ..._86,
      };
    }
    export const v1 = {
      ..._87,
      ..._88,
      ..._89,
      ..._90,
      ..._91,
      ..._228,
      ..._242,
    };
  }
  export namespace ics23 {
    export const v1 = {
      ..._92,
    };
  }
  export namespace mint {
    export namespace module {
      export const v1 = {
        ..._93,
      };
    }
    export const v1beta1 = {
      ..._94,
      ..._95,
      ..._96,
      ..._97,
      ..._229,
      ..._243,
    };
  }
  export namespace nft {
    export namespace module {
      export const v1 = {
        ..._98,
      };
    }
  }
  export namespace params {
    export namespace module {
      export const v1 = {
        ..._99,
      };
    }
    export const v1beta1 = {
      ..._100,
      ..._101,
      ..._230,
    };
  }
  export namespace query {
    export const v1 = {
      ..._102,
    };
  }
  export namespace reflection {
    export const v1 = {
      ..._103,
    };
  }
  export namespace slashing {
    export namespace module {
      export const v1 = {
        ..._104,
      };
    }
  }
  export namespace staking {
    export namespace module {
      export const v1 = {
        ..._105,
      };
    }
    export const v1beta1 = {
      ..._106,
      ..._107,
      ..._108,
      ..._109,
      ..._110,
      ..._231,
      ..._244,
    };
  }
  export namespace tx {
    export namespace config {
      export const v1 = {
        ..._111,
      };
    }
    export namespace signing {
      export const v1beta1 = {
        ..._112,
      };
    }
    export const v1beta1 = {
      ..._113,
      ..._114,
      ..._232,
    };
  }
  export namespace upgrade {
    export namespace module {
      export const v1 = {
        ..._115,
      };
    }
    export const v1beta1 = {
      ..._116,
      ..._117,
      ..._118,
      ..._233,
      ..._245,
    };
  }
  export namespace vesting {
    export namespace module {
      export const v1 = {
        ..._119,
      };
    }
    export const v1beta1 = {
      ..._120,
      ..._121,
      ..._246,
    };
  }
  export const ClientFactory = {
    ..._275,
    ..._276,
  };
}
