import type { IBCChannelID, IBCConnectionID, IBCPortID } from '@agoric/vats';
import {
  type LocalIbcAddress,
  type RemoteIbcAddress,
} from '@agoric/vats/tools/ibc-utils.js';

// XXX consider moving to vats/tools/ibc-utils by updating current values or renaming as `NEGOTIATED_...`
// These take those values and build off of them
const REMOTE_ADDR_RE =
  /^(?<hops>(?:\/ibc-hop\/[^/]+)*)\/ibc-port\/(?<portID>[^/]+)\/(?<order>ordered|unordered)\/(?<version>{[^}]+})\/ibc-channel\/(?<channelID>[^/]+)$/;
const LOCAL_ADDR_RE =
  /^\/ibc-port\/(?<portID>[^/]+)\/(?<order>ordered|unordered)\/(?<version>{[^}]+})\/ibc-channel\/(?<channelID>[^/]+)$/;

export const parseRemoteAddress = (
  address: RemoteIbcAddress,
): {
  rConnectionID: IBCConnectionID;
  rPortID: IBCPortID;
  rChannelID: IBCChannelID;
} => {
  const match = address.match(REMOTE_ADDR_RE);
  if (!match || !match.groups) {
    throw Error('Invalid remote address format');
  }

  const { portID, version, channelID } = match.groups;
  const versionObj = JSON.parse(version);

  return {
    rConnectionID: versionObj.host_connection_id,
    rPortID: portID,
    rChannelID: channelID as IBCChannelID,
  };
};

export const parseLocalAddress = (
  address: LocalIbcAddress,
): {
  lConnectionID: IBCConnectionID;
  lPortID: IBCPortID;
  lChannelID: IBCChannelID;
} => {
  const match = address.match(LOCAL_ADDR_RE);
  if (!match || !match.groups) {
    throw Error('Invalid local address format');
  }

  const { portID, version, channelID } = match.groups;
  const versionObj = JSON.parse(version);

  return {
    lConnectionID: versionObj.controller_connection_id,
    lPortID: portID,
    lChannelID: channelID as IBCChannelID,
  };
};
