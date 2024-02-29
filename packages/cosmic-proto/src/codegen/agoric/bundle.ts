//@ts-nocheck
import * as _0 from './lien/genesis.js';
import * as _1 from './lien/lien.js';
import * as _2 from './swingset/genesis.js';
import * as _3 from './swingset/msgs.js';
import * as _4 from './swingset/query.js';
import * as _5 from './swingset/swingset.js';
import * as _6 from './vbank/genesis.js';
import * as _7 from './vbank/msgs.js';
import * as _8 from './vbank/query.js';
import * as _9 from './vbank/vbank.js';
import * as _10 from './vibc/msgs.js';
import * as _11 from './vlocalchain/vlocalchain.js';
import * as _12 from './vstorage/genesis.js';
import * as _13 from './vstorage/query.js';
import * as _14 from './vstorage/vstorage.js';
import * as _25 from './swingset/msgs.amino.js';
import * as _26 from './vibc/msgs.amino.js';
import * as _27 from './swingset/msgs.registry.js';
import * as _28 from './vibc/msgs.registry.js';
import * as _29 from './swingset/query.rpc.Query.js';
import * as _30 from './vbank/query.rpc.Query.js';
import * as _31 from './vstorage/query.rpc.Query.js';
import * as _32 from './swingset/msgs.rpc.msg.js';
import * as _33 from './vibc/msgs.rpc.msg.js';
import * as _34 from './rpc.query.js';
import * as _35 from './rpc.tx.js';
export namespace agoric {
  export const lien = {
    ..._0,
    ..._1,
  };
  export const swingset = {
    ..._2,
    ..._3,
    ..._4,
    ..._5,
    ..._25,
    ..._27,
    ..._29,
    ..._32,
  };
  export const vbank = {
    ..._6,
    ..._7,
    ..._8,
    ..._9,
    ..._30,
  };
  export const vibc = {
    ..._10,
    ..._26,
    ..._28,
    ..._33,
  };
  export const vlocalchain = {
    ..._11,
  };
  export const vstorage = {
    ..._12,
    ..._13,
    ..._14,
    ..._31,
  };
  export const ClientFactory = {
    ..._34,
    ..._35,
  };
}
