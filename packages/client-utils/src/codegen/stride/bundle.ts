//@ts-nocheck
import * as _173 from './epochs/genesis.js';
import * as _174 from './epochs/query.js';
import * as _175 from './records/callbacks.js';
import * as _176 from './records/genesis.js';
import * as _177 from './records/params.js';
import * as _178 from './records/query.js';
import * as _179 from './records/records.js';
import * as _180 from './stakedym/genesis.js';
import * as _181 from './stakedym/query.js';
import * as _182 from './stakedym/stakedym.js';
import * as _183 from './stakedym/tx.js';
import * as _184 from './stakeibc/address_unbonding.js';
import * as _185 from './stakeibc/callbacks.js';
import * as _186 from './stakeibc/epoch_tracker.js';
import * as _187 from './stakeibc/genesis.js';
import * as _188 from './stakeibc/gov.js';
import * as _189 from './stakeibc/host_zone.js';
import * as _190 from './stakeibc/ica_account.js';
import * as _191 from './stakeibc/packet.js';
import * as _192 from './stakeibc/params.js';
import * as _193 from './stakeibc/query.js';
import * as _194 from './stakeibc/trade_route.js';
import * as _195 from './stakeibc/tx.js';
import * as _196 from './stakeibc/validator.js';
import * as _197 from './staketia/genesis.js';
import * as _198 from './staketia/query.js';
import * as _199 from './staketia/staketia.js';
import * as _200 from './staketia/tx.js';
import * as _263 from './epochs/query.rpc.Query.js';
import * as _264 from './records/query.rpc.Query.js';
import * as _265 from './stakedym/query.rpc.Query.js';
import * as _266 from './stakeibc/query.rpc.Query.js';
import * as _267 from './staketia/query.rpc.Query.js';
import * as _268 from './stakedym/tx.rpc.msg.js';
import * as _269 from './stakeibc/tx.rpc.msg.js';
import * as _270 from './staketia/tx.rpc.msg.js';
import * as _282 from './rpc.query.js';
import * as _283 from './rpc.tx.js';
export namespace stride {
  export const epochs = {
    ..._173,
    ..._174,
    ..._263,
  };
  export const records = {
    ..._175,
    ..._176,
    ..._177,
    ..._178,
    ..._179,
    ..._264,
  };
  export const stakedym = {
    ..._180,
    ..._181,
    ..._182,
    ..._183,
    ..._265,
    ..._268,
  };
  export const stakeibc = {
    ..._184,
    ..._185,
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
    ..._266,
    ..._269,
  };
  export const staketia = {
    ..._197,
    ..._198,
    ..._199,
    ..._200,
    ..._267,
    ..._270,
  };
  export const ClientFactory = {
    ..._282,
    ..._283,
  };
}
