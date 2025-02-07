//@ts-nocheck
import * as _33 from './auth/v1beta1/auth.js';
import * as _34 from './auth/v1beta1/genesis.js';
import * as _35 from './auth/v1beta1/query.js';
import * as _36 from './authz/v1beta1/authz.js';
import * as _37 from './authz/v1beta1/event.js';
import * as _38 from './authz/v1beta1/genesis.js';
import * as _39 from './authz/v1beta1/query.js';
import * as _40 from './authz/v1beta1/tx.js';
import * as _41 from './bank/v1beta1/authz.js';
import * as _42 from './bank/v1beta1/bank.js';
import * as _43 from './bank/v1beta1/genesis.js';
import * as _44 from './bank/v1beta1/query.js';
import * as _45 from './bank/v1beta1/tx.js';
import * as _46 from './base/abci/v1beta1/abci.js';
import * as _47 from './base/node/v1beta1/query.js';
import * as _48 from './base/query/v1beta1/pagination.js';
import * as _49 from './base/reflection/v2alpha1/reflection.js';
import * as _50 from './base/v1beta1/coin.js';
import * as _51 from './crypto/ed25519/keys.js';
import * as _52 from './crypto/hd/v1/hd.js';
import * as _53 from './crypto/keyring/v1/record.js';
import * as _54 from './crypto/multisig/keys.js';
import * as _55 from './crypto/secp256k1/keys.js';
import * as _56 from './crypto/secp256r1/keys.js';
import * as _57 from './distribution/v1beta1/distribution.js';
import * as _58 from './distribution/v1beta1/genesis.js';
import * as _59 from './distribution/v1beta1/query.js';
import * as _60 from './distribution/v1beta1/tx.js';
import * as _61 from './feegrant/v1beta1/feegrant.js';
import * as _62 from './feegrant/v1beta1/genesis.js';
import * as _63 from './feegrant/v1beta1/query.js';
import * as _64 from './feegrant/v1beta1/tx.js';
import * as _65 from './gov/v1/genesis.js';
import * as _66 from './gov/v1/gov.js';
import * as _67 from './gov/v1/query.js';
import * as _68 from './gov/v1/tx.js';
import * as _69 from './gov/v1beta1/genesis.js';
import * as _70 from './gov/v1beta1/gov.js';
import * as _71 from './gov/v1beta1/query.js';
import * as _72 from './gov/v1beta1/tx.js';
import * as _73 from './group/v1/events.js';
import * as _74 from './group/v1/genesis.js';
import * as _75 from './group/v1/query.js';
import * as _76 from './group/v1/tx.js';
import * as _77 from './group/v1/types.js';
import * as _78 from './mint/v1beta1/genesis.js';
import * as _79 from './mint/v1beta1/mint.js';
import * as _80 from './mint/v1beta1/query.js';
import * as _81 from './params/v1beta1/params.js';
import * as _82 from './params/v1beta1/query.js';
import * as _83 from './staking/v1beta1/authz.js';
import * as _84 from './staking/v1beta1/genesis.js';
import * as _85 from './staking/v1beta1/query.js';
import * as _86 from './staking/v1beta1/staking.js';
import * as _87 from './staking/v1beta1/tx.js';
import * as _88 from './tx/signing/v1beta1/signing.js';
import * as _89 from './tx/v1beta1/service.js';
import * as _90 from './tx/v1beta1/tx.js';
import * as _91 from './upgrade/v1beta1/query.js';
import * as _92 from './upgrade/v1beta1/tx.js';
import * as _93 from './upgrade/v1beta1/upgrade.js';
import * as _94 from './vesting/v1beta1/tx.js';
import * as _95 from './vesting/v1beta1/vesting.js';
export namespace cosmos {
  export namespace auth {
    export const v1beta1 = {
      ..._33,
      ..._34,
      ..._35,
    };
  }
  export namespace authz {
    export const v1beta1 = {
      ..._36,
      ..._37,
      ..._38,
      ..._39,
      ..._40,
    };
  }
  export namespace bank {
    export const v1beta1 = {
      ..._41,
      ..._42,
      ..._43,
      ..._44,
      ..._45,
    };
  }
  export namespace base {
    export namespace abci {
      export const v1beta1 = {
        ..._46,
      };
    }
    export namespace node {
      export const v1beta1 = {
        ..._47,
      };
    }
    export namespace query {
      export const v1beta1 = {
        ..._48,
      };
    }
    export namespace reflection {
      export const v2alpha1 = {
        ..._49,
      };
    }
    export const v1beta1 = {
      ..._50,
    };
  }
  export namespace crypto {
    export const ed25519 = {
      ..._51,
    };
    export namespace hd {
      export const v1 = {
        ..._52,
      };
    }
    export namespace keyring {
      export const v1 = {
        ..._53,
      };
    }
    export const multisig = {
      ..._54,
    };
    export const secp256k1 = {
      ..._55,
    };
    export const secp256r1 = {
      ..._56,
    };
  }
  export namespace distribution {
    export const v1beta1 = {
      ..._57,
      ..._58,
      ..._59,
      ..._60,
    };
  }
  export namespace feegrant {
    export const v1beta1 = {
      ..._61,
      ..._62,
      ..._63,
      ..._64,
    };
  }
  export namespace gov {
    export const v1 = {
      ..._65,
      ..._66,
      ..._67,
      ..._68,
    };
    export const v1beta1 = {
      ..._69,
      ..._70,
      ..._71,
      ..._72,
    };
  }
  export namespace group {
    export const v1 = {
      ..._73,
      ..._74,
      ..._75,
      ..._76,
      ..._77,
    };
  }
  export namespace mint {
    export const v1beta1 = {
      ..._78,
      ..._79,
      ..._80,
    };
  }
  export namespace params {
    export const v1beta1 = {
      ..._81,
      ..._82,
    };
  }
  export namespace staking {
    export const v1beta1 = {
      ..._83,
      ..._84,
      ..._85,
      ..._86,
      ..._87,
    };
  }
  export namespace tx {
    export namespace signing {
      export const v1beta1 = {
        ..._88,
      };
    }
    export const v1beta1 = {
      ..._89,
      ..._90,
    };
  }
  export namespace upgrade {
    export const v1beta1 = {
      ..._91,
      ..._92,
      ..._93,
    };
  }
  export namespace vesting {
    export const v1beta1 = {
      ..._94,
      ..._95,
    };
  }
}
