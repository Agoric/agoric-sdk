"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.makeHermes = void 0;
var kubectlBinary = 'kubectl';
// based on config.yaml
var relayerMap = {
    osmosis: 'hermes-agoric-osmosis-0',
    cosmoshub: 'hermes-agoric-gaia-0'
};
var makeKubeArgs = function (chainName) {
    if (!relayerMap[chainName])
        throw Error('Unsupported chain: ' + chainName);
    return [
        'exec',
        '-i',
        relayerMap[chainName],
        '-c',
        'relayer',
        '--tty=false',
        '--',
        'hermes',
    ];
};
var makeHermes = function (_a) {
    var execFileSync = _a.execFileSync;
    var exec = function (chainName, args, opts) {
        if (opts === void 0) { opts = { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }; }
        return execFileSync(kubectlBinary, __spreadArray(__spreadArray([], makeKubeArgs(chainName), true), args, true), opts);
    };
    /** Submit MsgChannelCloseInit to the src chain */
    var channelCloseInit = function (chainName, dst, src) {
        return exec(chainName, [
            'tx',
            'chan-close-init',
            "--dst-chain=".concat(dst.chainId),
            "--src-chain=".concat(src.chainId),
            "--dst-connection=".concat(dst.connectionID),
            "--dst-port=".concat(dst.portID),
            "--src-port=".concat(src.portID),
            "--dst-channel=".concat(dst.channelID),
            "--src-channel=".concat(src.channelID),
        ]);
    };
    return {
        exec: exec,
        channelCloseInit: channelCloseInit
    };
};
exports.makeHermes = makeHermes;
