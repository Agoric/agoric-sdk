//@ts-nocheck
import * as _175 from './epochs/genesis.js';
import * as _176 from './epochs/query.js';
import * as _177 from './records/callbacks.js';
import * as _178 from './records/genesis.js';
import * as _179 from './records/params.js';
import * as _180 from './records/query.js';
import * as _181 from './records/records.js';
import * as _182 from './stakedym/genesis.js';
import * as _183 from './stakedym/query.js';
import * as _184 from './stakedym/stakedym.js';
import * as _185 from './stakedym/tx.js';
import * as _186 from './stakeibc/address_unbonding.js';
import * as _187 from './stakeibc/callbacks.js';
import * as _188 from './stakeibc/epoch_tracker.js';
import * as _189 from './stakeibc/genesis.js';
import * as _190 from './stakeibc/gov.js';
import * as _191 from './stakeibc/host_zone.js';
import * as _192 from './stakeibc/ica_account.js';
import * as _193 from './stakeibc/packet.js';
import * as _194 from './stakeibc/params.js';
import * as _195 from './stakeibc/query.js';
import * as _196 from './stakeibc/trade_route.js';
import * as _197 from './stakeibc/tx.js';
import * as _198 from './stakeibc/validator.js';
import * as _199 from './staketia/genesis.js';
import * as _200 from './staketia/query.js';
import * as _201 from './staketia/staketia.js';
import * as _202 from './staketia/tx.js';
import * as _265 from './epochs/query.rpc.Query.js';
import * as _266 from './records/query.rpc.Query.js';
import * as _267 from './stakedym/query.rpc.Query.js';
import * as _268 from './stakeibc/query.rpc.Query.js';
import * as _269 from './staketia/query.rpc.Query.js';
import * as _270 from './stakedym/tx.rpc.msg.js';
import * as _271 from './stakeibc/tx.rpc.msg.js';
import * as _272 from './staketia/tx.rpc.msg.js';
import * as _284 from './rpc.query.js';
import * as _285 from './rpc.tx.js';
export namespace stride {
  export const epochs = {
    ..._175,
    ..._176,
    ..._265,
  };
  export const records = {
    ..._177,
    ..._178,
    ..._179,
    ..._180,
    ..._181,
    ..._266,
  };
  export const stakedym = {
    ..._182,
    ..._183,
    ..._184,
    ..._185,
    ..._267,
    ..._270,
  };
  export const stakeibc = {
    ..._186,
    ..._187,
    ..._188,
    ..._189,
    ..._190,
    ..._191,
    ..._192,
    ..._193,
    ..._194,
    ..._195,
    ..._196,
    ..._197,
    ..._198,
    ..._268,
    ..._271,
  };
  export const staketia = {
    ..._199,
    ..._200,
    ..._201,
    ..._202,
    ..._269,
    ..._272,
  };
  export const ClientFactory = {
    ..._284,
    ..._285,
  };
}
