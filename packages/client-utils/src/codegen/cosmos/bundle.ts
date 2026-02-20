//@ts-nocheck
import * as _96 from './vesting/v1beta1/vesting.js';
import * as _97 from './vesting/v1beta1/tx.js';
import * as _98 from './vesting/module/v1/module.js';
import * as _99 from './upgrade/v1beta1/upgrade.js';
import * as _100 from './upgrade/v1beta1/tx.js';
import * as _101 from './upgrade/v1beta1/query.js';
import * as _102 from './upgrade/module/v1/module.js';
import * as _103 from './tx/v1beta1/tx.js';
import * as _104 from './tx/v1beta1/service.js';
import * as _105 from './tx/signing/v1beta1/signing.js';
import * as _106 from './tx/config/v1/config.js';
import * as _107 from './store/v1beta1/listening.js';
import * as _108 from './store/v1beta1/commit_info.js';
import * as _109 from './store/streaming/abci/grpc.js';
import * as _110 from './store/snapshots/v1/snapshot.js';
import * as _111 from './store/internal/kv/v1beta1/kv.js';
import * as _112 from './staking/v1beta1/tx.js';
import * as _113 from './staking/v1beta1/staking.js';
import * as _114 from './staking/v1beta1/query.js';
import * as _115 from './staking/v1beta1/genesis.js';
import * as _116 from './staking/v1beta1/authz.js';
import * as _117 from './staking/module/v1/module.js';
import * as _118 from './slashing/module/v1/module.js';
import * as _119 from './reflection/v1/reflection.js';
import * as _120 from './query/v1/query.js';
import * as _121 from './params/v1beta1/query.js';
import * as _122 from './params/v1beta1/params.js';
import * as _123 from './params/module/v1/module.js';
import * as _124 from './nft/module/v1/module.js';
import * as _125 from './msg/textual/v1/textual.js';
import * as _126 from './mint/v1beta1/tx.js';
import * as _127 from './mint/v1beta1/query.js';
import * as _128 from './mint/v1beta1/mint.js';
import * as _129 from './mint/v1beta1/genesis.js';
import * as _130 from './mint/module/v1/module.js';
import * as _131 from './ics23/v1/proofs.js';
import * as _132 from './group/v1/types.js';
import * as _133 from './group/v1/tx.js';
import * as _134 from './group/v1/query.js';
import * as _135 from './group/v1/genesis.js';
import * as _136 from './group/v1/events.js';
import * as _137 from './group/module/v1/module.js';
import * as _138 from './gov/v1beta1/tx.js';
import * as _139 from './gov/v1beta1/query.js';
import * as _140 from './gov/v1beta1/gov.js';
import * as _141 from './gov/v1beta1/genesis.js';
import * as _142 from './gov/v1/tx.js';
import * as _143 from './gov/v1/query.js';
import * as _144 from './gov/v1/gov.js';
import * as _145 from './gov/v1/genesis.js';
import * as _146 from './gov/module/v1/module.js';
import * as _147 from './genutil/module/v1/module.js';
import * as _148 from './feegrant/v1beta1/tx.js';
import * as _149 from './feegrant/v1beta1/query.js';
import * as _150 from './feegrant/v1beta1/genesis.js';
import * as _151 from './feegrant/v1beta1/feegrant.js';
import * as _152 from './feegrant/module/v1/module.js';
import * as _153 from './evidence/module/v1/module.js';
import * as _154 from './distribution/v1beta1/tx.js';
import * as _155 from './distribution/v1beta1/query.js';
import * as _156 from './distribution/v1beta1/genesis.js';
import * as _157 from './distribution/v1beta1/distribution.js';
import * as _158 from './distribution/module/v1/module.js';
import * as _159 from './crypto/secp256r1/keys.js';
import * as _160 from './crypto/secp256k1/keys.js';
import * as _161 from './crypto/multisig/keys.js';
import * as _162 from './crypto/keyring/v1/record.js';
import * as _163 from './crypto/hd/v1/hd.js';
import * as _164 from './crypto/ed25519/keys.js';
import * as _165 from './crisis/module/v1/module.js';
import * as _166 from './consensus/v1/tx.js';
import * as _167 from './consensus/v1/query.js';
import * as _168 from './consensus/module/v1/module.js';
import * as _169 from './circuit/v1/types.js';
import * as _170 from './circuit/v1/tx.js';
import * as _171 from './circuit/v1/query.js';
import * as _172 from './circuit/module/v1/module.js';
import * as _173 from './base/v1beta1/coin.js';
import * as _174 from './base/reflection/v2alpha1/reflection.js';
import * as _175 from './base/query/v1beta1/pagination.js';
import * as _176 from './base/node/v1beta1/query.js';
import * as _177 from './base/abci/v1beta1/abci.js';
import * as _178 from './bank/v1beta1/tx.js';
import * as _179 from './bank/v1beta1/query.js';
import * as _180 from './bank/v1beta1/genesis.js';
import * as _181 from './bank/v1beta1/bank.js';
import * as _182 from './bank/v1beta1/authz.js';
import * as _183 from './bank/module/v1/module.js';
import * as _184 from './authz/v1beta1/tx.js';
import * as _185 from './authz/v1beta1/query.js';
import * as _186 from './authz/v1beta1/genesis.js';
import * as _187 from './authz/v1beta1/event.js';
import * as _188 from './authz/v1beta1/authz.js';
import * as _189 from './authz/module/v1/module.js';
import * as _190 from './auth/v1beta1/tx.js';
import * as _191 from './auth/v1beta1/query.js';
import * as _192 from './auth/v1beta1/genesis.js';
import * as _193 from './auth/v1beta1/auth.js';
import * as _194 from './auth/module/v1/module.js';
import * as _195 from './app/runtime/v1alpha1/module.js';
import * as _278 from './upgrade/v1beta1/query.rpc.func.js';
import * as _279 from './tx/v1beta1/service.rpc.func.js';
import * as _280 from './staking/v1beta1/query.rpc.func.js';
import * as _281 from './reflection/v1/reflection.rpc.func.js';
import * as _282 from './params/v1beta1/query.rpc.func.js';
import * as _283 from './mint/v1beta1/query.rpc.func.js';
import * as _284 from './group/v1/query.rpc.func.js';
import * as _285 from './gov/v1beta1/query.rpc.func.js';
import * as _286 from './gov/v1/query.rpc.func.js';
import * as _287 from './feegrant/v1beta1/query.rpc.func.js';
import * as _288 from './distribution/v1beta1/query.rpc.func.js';
import * as _289 from './consensus/v1/query.rpc.func.js';
import * as _290 from './circuit/v1/query.rpc.func.js';
import * as _291 from './base/reflection/v2alpha1/reflection.rpc.func.js';
import * as _292 from './base/node/v1beta1/query.rpc.func.js';
import * as _293 from './bank/v1beta1/query.rpc.func.js';
import * as _294 from './authz/v1beta1/query.rpc.func.js';
import * as _295 from './auth/v1beta1/query.rpc.func.js';
import * as _296 from './upgrade/v1beta1/query.rpc.Query.js';
import * as _297 from './tx/v1beta1/service.rpc.Service.js';
import * as _298 from './staking/v1beta1/query.rpc.Query.js';
import * as _299 from './params/v1beta1/query.rpc.Query.js';
import * as _300 from './mint/v1beta1/query.rpc.Query.js';
import * as _301 from './group/v1/query.rpc.Query.js';
import * as _302 from './gov/v1beta1/query.rpc.Query.js';
import * as _303 from './gov/v1/query.rpc.Query.js';
import * as _304 from './feegrant/v1beta1/query.rpc.Query.js';
import * as _305 from './distribution/v1beta1/query.rpc.Query.js';
import * as _306 from './consensus/v1/query.rpc.Query.js';
import * as _307 from './circuit/v1/query.rpc.Query.js';
import * as _308 from './base/node/v1beta1/query.rpc.Service.js';
import * as _309 from './bank/v1beta1/query.rpc.Query.js';
import * as _310 from './authz/v1beta1/query.rpc.Query.js';
import * as _311 from './auth/v1beta1/query.rpc.Query.js';
import * as _312 from './vesting/v1beta1/tx.rpc.func.js';
import * as _313 from './upgrade/v1beta1/tx.rpc.func.js';
import * as _314 from './staking/v1beta1/tx.rpc.func.js';
import * as _315 from './mint/v1beta1/tx.rpc.func.js';
import * as _316 from './group/v1/tx.rpc.func.js';
import * as _317 from './gov/v1beta1/tx.rpc.func.js';
import * as _318 from './gov/v1/tx.rpc.func.js';
import * as _319 from './feegrant/v1beta1/tx.rpc.func.js';
import * as _320 from './distribution/v1beta1/tx.rpc.func.js';
import * as _321 from './consensus/v1/tx.rpc.func.js';
import * as _322 from './circuit/v1/tx.rpc.func.js';
import * as _323 from './bank/v1beta1/tx.rpc.func.js';
import * as _324 from './authz/v1beta1/tx.rpc.func.js';
import * as _325 from './auth/v1beta1/tx.rpc.func.js';
import * as _326 from './vesting/v1beta1/tx.rpc.msg.js';
import * as _327 from './upgrade/v1beta1/tx.rpc.msg.js';
import * as _328 from './staking/v1beta1/tx.rpc.msg.js';
import * as _329 from './mint/v1beta1/tx.rpc.msg.js';
import * as _330 from './group/v1/tx.rpc.msg.js';
import * as _331 from './gov/v1beta1/tx.rpc.msg.js';
import * as _332 from './gov/v1/tx.rpc.msg.js';
import * as _333 from './feegrant/v1beta1/tx.rpc.msg.js';
import * as _334 from './distribution/v1beta1/tx.rpc.msg.js';
import * as _335 from './consensus/v1/tx.rpc.msg.js';
import * as _336 from './circuit/v1/tx.rpc.msg.js';
import * as _337 from './bank/v1beta1/tx.rpc.msg.js';
import * as _338 from './authz/v1beta1/tx.rpc.msg.js';
import * as _339 from './auth/v1beta1/tx.rpc.msg.js';
import * as _361 from './rpc.query.js';
import * as _362 from './rpc.tx.js';
export namespace cosmos {
  export namespace vesting {
    export const v1beta1 = {
      ..._96,
      ..._97,
      ..._312,
      ..._326,
    };
    export namespace module {
      export const v1 = {
        ..._98,
      };
    }
  }
  export namespace upgrade {
    export const v1beta1 = {
      ..._99,
      ..._100,
      ..._101,
      ..._278,
      ..._296,
      ..._313,
      ..._327,
    };
    export namespace module {
      export const v1 = {
        ..._102,
      };
    }
  }
  export namespace tx {
    export const v1beta1 = {
      ..._103,
      ..._104,
      ..._279,
      ..._297,
    };
    export namespace signing {
      export const v1beta1 = {
        ..._105,
      };
    }
    export namespace config {
      export const v1 = {
        ..._106,
      };
    }
  }
  export namespace store {
    export const v1beta1 = {
      ..._107,
      ..._108,
    };
    export namespace streaming {
      export const abci = {
        ..._109,
      };
    }
    export namespace snapshots {
      export const v1 = {
        ..._110,
      };
    }
    export namespace internal {
      export namespace kv {
        export const v1beta1 = {
          ..._111,
        };
      }
    }
  }
  export namespace staking {
    export const v1beta1 = {
      ..._112,
      ..._113,
      ..._114,
      ..._115,
      ..._116,
      ..._280,
      ..._298,
      ..._314,
      ..._328,
    };
    export namespace module {
      export const v1 = {
        ..._117,
      };
    }
  }
  export namespace slashing {
    export namespace module {
      export const v1 = {
        ..._118,
      };
    }
  }
  export namespace reflection {
    export const v1 = {
      ..._119,
      ..._281,
    };
  }
  export namespace query {
    export const v1 = {
      ..._120,
    };
  }
  export namespace params {
    export const v1beta1 = {
      ..._121,
      ..._122,
      ..._282,
      ..._299,
    };
    export namespace module {
      export const v1 = {
        ..._123,
      };
    }
  }
  export namespace nft {
    export namespace module {
      export const v1 = {
        ..._124,
      };
    }
  }
  export namespace msg {
    export namespace textual {
      export const v1 = {
        ..._125,
      };
    }
  }
  export namespace mint {
    export const v1beta1 = {
      ..._126,
      ..._127,
      ..._128,
      ..._129,
      ..._283,
      ..._300,
      ..._315,
      ..._329,
    };
    export namespace module {
      export const v1 = {
        ..._130,
      };
    }
  }
  export namespace ics23 {
    export const v1 = {
      ..._131,
    };
  }
  export namespace group {
    export const v1 = {
      ..._132,
      ..._133,
      ..._134,
      ..._135,
      ..._136,
      ..._284,
      ..._301,
      ..._316,
      ..._330,
    };
    export namespace module {
      export const v1 = {
        ..._137,
      };
    }
  }
  export namespace gov {
    export const v1beta1 = {
      ..._138,
      ..._139,
      ..._140,
      ..._141,
      ..._285,
      ..._302,
      ..._317,
      ..._331,
    };
    export const v1 = {
      ..._142,
      ..._143,
      ..._144,
      ..._145,
      ..._286,
      ..._303,
      ..._318,
      ..._332,
    };
    export namespace module {
      export const v1 = {
        ..._146,
      };
    }
  }
  export namespace genutil {
    export namespace module {
      export const v1 = {
        ..._147,
      };
    }
  }
  export namespace feegrant {
    export const v1beta1 = {
      ..._148,
      ..._149,
      ..._150,
      ..._151,
      ..._287,
      ..._304,
      ..._319,
      ..._333,
    };
    export namespace module {
      export const v1 = {
        ..._152,
      };
    }
  }
  export namespace evidence {
    export namespace module {
      export const v1 = {
        ..._153,
      };
    }
  }
  export namespace distribution {
    export const v1beta1 = {
      ..._154,
      ..._155,
      ..._156,
      ..._157,
      ..._288,
      ..._305,
      ..._320,
      ..._334,
    };
    export namespace module {
      export const v1 = {
        ..._158,
      };
    }
  }
  export namespace crypto {
    export const secp256r1 = {
      ..._159,
    };
    export const secp256k1 = {
      ..._160,
    };
    export const multisig = {
      ..._161,
    };
    export namespace keyring {
      export const v1 = {
        ..._162,
      };
    }
    export namespace hd {
      export const v1 = {
        ..._163,
      };
    }
    export const ed25519 = {
      ..._164,
    };
  }
  export namespace crisis {
    export namespace module {
      export const v1 = {
        ..._165,
      };
    }
  }
  export namespace consensus {
    export const v1 = {
      ..._166,
      ..._167,
      ..._289,
      ..._306,
      ..._321,
      ..._335,
    };
    export namespace module {
      export const v1 = {
        ..._168,
      };
    }
  }
  export namespace circuit {
    export const v1 = {
      ..._169,
      ..._170,
      ..._171,
      ..._290,
      ..._307,
      ..._322,
      ..._336,
    };
    export namespace module {
      export const v1 = {
        ..._172,
      };
    }
  }
  export namespace base {
    export const v1beta1 = {
      ..._173,
    };
    export namespace reflection {
      export const v2alpha1 = {
        ..._174,
        ..._291,
      };
    }
    export namespace query {
      export const v1beta1 = {
        ..._175,
      };
    }
    export namespace node {
      export const v1beta1 = {
        ..._176,
        ..._292,
        ..._308,
      };
    }
    export namespace abci {
      export const v1beta1 = {
        ..._177,
      };
    }
  }
  export namespace bank {
    export const v1beta1 = {
      ..._178,
      ..._179,
      ..._180,
      ..._181,
      ..._182,
      ..._293,
      ..._309,
      ..._323,
      ..._337,
    };
    export namespace module {
      export const v1 = {
        ..._183,
      };
    }
  }
  export namespace authz {
    export const v1beta1 = {
      ..._184,
      ..._185,
      ..._186,
      ..._187,
      ..._188,
      ..._294,
      ..._310,
      ..._324,
      ..._338,
    };
    export namespace module {
      export const v1 = {
        ..._189,
      };
    }
  }
  export namespace auth {
    export const v1beta1 = {
      ..._190,
      ..._191,
      ..._192,
      ..._193,
      ..._295,
      ..._311,
      ..._325,
      ..._339,
    };
    export namespace module {
      export const v1 = {
        ..._194,
      };
    }
  }
  export namespace app {
    export namespace runtime {
      export const v1alpha1 = {
        ..._195,
      };
    }
  }
  export const ClientFactory = {
    ..._361,
    ..._362,
  };
}
