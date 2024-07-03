//@ts-nocheck
import * as _124 from './downtime-detector/v1beta1/downtime_duration.js';
import * as _125 from './downtime-detector/v1beta1/genesis.js';
import * as _126 from './downtime-detector/v1beta1/query.js';
import * as _127 from './epochs/genesis.js';
import * as _128 from './epochs/query.js';
import * as _129 from './gamm/pool-models/balancer/balancerPool.js';
import * as _130 from './gamm/v1beta1/genesis.js';
import * as _131 from './gamm/v1beta1/query.js';
import * as _132 from './gamm/v1beta1/tx.js';
import * as _133 from './gamm/pool-models/balancer/tx/tx.js';
import * as _134 from './gamm/pool-models/stableswap/stableswap_pool.js';
import * as _135 from './gamm/pool-models/stableswap/tx.js';
import * as _136 from './gamm/v2/query.js';
import * as _137 from './ibc-rate-limit/v1beta1/params.js';
import * as _138 from './ibc-rate-limit/v1beta1/query.js';
import * as _139 from './incentives/gauge.js';
import * as _140 from './incentives/genesis.js';
import * as _141 from './incentives/params.js';
import * as _142 from './incentives/query.js';
import * as _143 from './incentives/tx.js';
import * as _144 from './lockup/genesis.js';
import * as _145 from './lockup/lock.js';
import * as _146 from './lockup/params.js';
import * as _147 from './lockup/query.js';
import * as _148 from './lockup/tx.js';
import * as _149 from './mint/v1beta1/genesis.js';
import * as _150 from './mint/v1beta1/mint.js';
import * as _151 from './mint/v1beta1/query.js';
import * as _152 from './pool-incentives/v1beta1/genesis.js';
import * as _153 from './pool-incentives/v1beta1/gov.js';
import * as _154 from './pool-incentives/v1beta1/incentives.js';
import * as _155 from './pool-incentives/v1beta1/query.js';
import * as _156 from './protorev/v1beta1/genesis.js';
import * as _157 from './protorev/v1beta1/gov.js';
import * as _158 from './protorev/v1beta1/params.js';
import * as _159 from './protorev/v1beta1/protorev.js';
import * as _160 from './protorev/v1beta1/query.js';
import * as _161 from './protorev/v1beta1/tx.js';
import * as _162 from './sumtree/v1beta1/tree.js';
import * as _163 from './superfluid/genesis.js';
import * as _164 from './superfluid/params.js';
import * as _165 from './superfluid/query.js';
import * as _166 from './superfluid/superfluid.js';
import * as _167 from './superfluid/tx.js';
import * as _168 from './swaprouter/v1beta1/genesis.js';
import * as _169 from './swaprouter/v1beta1/module_route.js';
import * as _170 from './swaprouter/v1beta1/query.js';
import * as _171 from './swaprouter/v1beta1/swap_route.js';
import * as _172 from './swaprouter/v1beta1/tx.js';
import * as _173 from './tokenfactory/v1beta1/authorityMetadata.js';
import * as _174 from './tokenfactory/v1beta1/genesis.js';
import * as _175 from './tokenfactory/v1beta1/params.js';
import * as _176 from './tokenfactory/v1beta1/query.js';
import * as _177 from './tokenfactory/v1beta1/tx.js';
import * as _178 from './twap/v1beta1/genesis.js';
import * as _179 from './twap/v1beta1/query.js';
import * as _180 from './twap/v1beta1/twap_record.js';
import * as _181 from './txfees/v1beta1/feetoken.js';
import * as _182 from './txfees/v1beta1/genesis.js';
import * as _183 from './txfees/v1beta1/gov.js';
import * as _184 from './txfees/v1beta1/query.js';
import * as _185 from './valset-pref/v1beta1/query.js';
import * as _186 from './valset-pref/v1beta1/state.js';
import * as _187 from './valset-pref/v1beta1/tx.js';
export namespace osmosis {
  export namespace downtimedetector {
    export const v1beta1 = {
      ..._124,
      ..._125,
      ..._126,
    };
  }
  export namespace epochs {
    export const v1beta1 = {
      ..._127,
      ..._128,
    };
  }
  export namespace gamm {
    export const v1beta1 = {
      ..._129,
      ..._130,
      ..._131,
      ..._132,
    };
    export namespace poolmodels {
      export namespace balancer {
        export const v1beta1 = {
          ..._133,
        };
      }
      export namespace stableswap {
        export const v1beta1 = {
          ..._134,
          ..._135,
        };
      }
    }
    export const v2 = {
      ..._136,
    };
  }
  export namespace ibcratelimit {
    export const v1beta1 = {
      ..._137,
      ..._138,
    };
  }
  export const incentives = {
    ..._139,
    ..._140,
    ..._141,
    ..._142,
    ..._143,
  };
  export const lockup = {
    ..._144,
    ..._145,
    ..._146,
    ..._147,
    ..._148,
  };
  export namespace mint {
    export const v1beta1 = {
      ..._149,
      ..._150,
      ..._151,
    };
  }
  export namespace poolincentives {
    export const v1beta1 = {
      ..._152,
      ..._153,
      ..._154,
      ..._155,
    };
  }
  export namespace protorev {
    export const v1beta1 = {
      ..._156,
      ..._157,
      ..._158,
      ..._159,
      ..._160,
      ..._161,
    };
  }
  export namespace store {
    export const v1beta1 = {
      ..._162,
    };
  }
  export const superfluid = {
    ..._163,
    ..._164,
    ..._165,
    ..._166,
    ..._167,
  };
  export namespace swaprouter {
    export const v1beta1 = {
      ..._168,
      ..._169,
      ..._170,
      ..._171,
      ..._172,
    };
  }
  export namespace tokenfactory {
    export const v1beta1 = {
      ..._173,
      ..._174,
      ..._175,
      ..._176,
      ..._177,
    };
  }
  export namespace twap {
    export const v1beta1 = {
      ..._178,
      ..._179,
      ..._180,
    };
  }
  export namespace txfees {
    export const v1beta1 = {
      ..._181,
      ..._182,
      ..._183,
      ..._184,
    };
  }
  export namespace valsetpref {
    export const v1beta1 = {
      ..._185,
      ..._186,
      ..._187,
    };
  }
}
