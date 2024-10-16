"use strict";
exports.__esModule = true;
exports.parseLocalAddress = exports.parseRemoteAddress = void 0;
// XXX consider moving to vats/tools/ibc-utils by updating current values or renaming as `NEGOTIATED_...`
// These take those values and build off of them
var REMOTE_ADDR_RE = /^(?<hops>(?:\/ibc-hop\/[^/]+)*)\/ibc-port\/(?<portID>[^/]+)\/(?<order>ordered|unordered)\/(?<version>{[^}]+})\/ibc-channel\/(?<channelID>[^/]+)$/;
var LOCAL_ADDR_RE = /^\/ibc-port\/(?<portID>[^/]+)\/(?<order>ordered|unordered)\/(?<version>{[^}]+})\/ibc-channel\/(?<channelID>[^/]+)$/;
var parseRemoteAddress = function (address) {
    var match = address.match(REMOTE_ADDR_RE);
    if (!match || !match.groups) {
        throw Error('Invalid remote address format');
    }
    var _a = match.groups, portID = _a.portID, version = _a.version, channelID = _a.channelID;
    var versionObj = JSON.parse(version);
    return {
        rConnectionID: versionObj.host_connection_id,
        rPortID: portID,
        rChannelID: channelID
    };
};
exports.parseRemoteAddress = parseRemoteAddress;
var parseLocalAddress = function (address) {
    var match = address.match(LOCAL_ADDR_RE);
    if (!match || !match.groups) {
        throw Error('Invalid local address format');
    }
    var _a = match.groups, portID = _a.portID, version = _a.version, channelID = _a.channelID;
    var versionObj = JSON.parse(version);
    return {
        lConnectionID: versionObj.controller_connection_id,
        lPortID: portID,
        lChannelID: channelID
    };
};
exports.parseLocalAddress = parseLocalAddress;
