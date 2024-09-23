import type { IBCConnectionID } from '@agoric/vats';
import type { Vow } from '@agoric/vow';
import type { IcaAccount } from '../cosmos-api.ts';
import type { ICAChannelAddressOpts } from '../utils/address';
import type { ICQConnection } from './icq-connection-kit';

/**
 * Authority to make a Cosmos interchain account or an interchain query connection.
 */
export interface CosmosInterchainService {
  /**
   * @param {string} chainId
   * @param {IBCConnectionID} hostConnectionId the counterparty
   *   connection_id
   * @param {IBCConnectionID} controllerConnectionId self connection_id
   * @param {ICAChannelAddressOpts} [opts] optional to configure the
   *   channel address, such as version and ordering
   * @returns {Vow<IcaAccount>}
   */
  makeAccount(
    chainId: string,
    hostConnectionId: IBCConnectionID,
    controllerConnectionId: IBCConnectionID,
    opts?: ICAChannelAddressOpts | undefined,
  ): Vow<IcaAccount>;
  /**
   * @param {IBCConnectionID} controllerConnectionId
   * @param {string} [version]
   * @returns {Vow<ICQConnection> | ICQConnection}
   */
  provideICQConnection(
    controllerConnectionId: IBCConnectionID,
    version?: string | undefined,
  ): Vow<ICQConnection> | ICQConnection;
}
