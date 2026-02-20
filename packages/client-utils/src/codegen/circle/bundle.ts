//@ts-nocheck
import * as _196 from './cctp/v1/tx.js';
import * as _197 from './cctp/v1/token_pair.js';
import * as _198 from './cctp/v1/signature_threshold.js';
import * as _199 from './cctp/v1/sending_and_receiving_messages_paused.js';
import * as _200 from './cctp/v1/remote_token_messenger.js';
import * as _201 from './cctp/v1/query.js';
import * as _202 from './cctp/v1/per_message_burn_limit.js';
import * as _203 from './cctp/v1/nonce.js';
import * as _204 from './cctp/v1/message.js';
import * as _205 from './cctp/v1/max_message_body_size.js';
import * as _206 from './cctp/v1/genesis.js';
import * as _207 from './cctp/v1/events.js';
import * as _208 from './cctp/v1/burning_and_minting_paused.js';
import * as _209 from './cctp/v1/burn_message.js';
import * as _210 from './cctp/v1/attester.js';
import * as _282 from './cctp/v1/query.rpc.Query.js';
import * as _283 from './cctp/v1/tx.rpc.msg.js';
import * as _298 from './rpc.query.js';
import * as _299 from './rpc.tx.js';
export namespace circle {
  export namespace cctp {
    export const v1 = {
      ..._196,
      ..._197,
      ..._198,
      ..._199,
      ..._200,
      ..._201,
      ..._202,
      ..._203,
      ..._204,
      ..._205,
      ..._206,
      ..._207,
      ..._208,
      ..._209,
      ..._210,
      ..._282,
      ..._283,
    };
  }
  export const ClientFactory = {
    ..._298,
    ..._299,
  };
}
