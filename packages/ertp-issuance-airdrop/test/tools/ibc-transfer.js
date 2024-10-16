"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.createFundedWalletAndClient = exports.makeIBCTransferMsg = exports.getTimeout = exports.DEFAULT_TIMEOUT_NS = exports.makeFeeObject = void 0;
var proto_signing_1 = require("@cosmjs/proto-signing");
var stargate_1 = require("@cosmjs/stargate");
var starshipjs_1 = require("starshipjs");
var time_js_1 = require("@agoric/orchestration/src/utils/time.js");
var tx_js_1 = require("@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js");
var wallet_js_1 = require("./wallet.js");
var starship_chain_info_js_1 = require("../starship-chain-info.js");
var makeFeeObject = function (_a) {
    var denom = _a.denom, gas = _a.gas, gasPrice = _a.gasPrice;
    return ({
        amount: (0, proto_signing_1.coins)(gas * gasPrice, denom || 'uist'),
        gas: String(gas)
    });
};
exports.makeFeeObject = makeFeeObject;
// 2030-01-01T00:00:00Z
exports.DEFAULT_TIMEOUT_NS = 1893456000n * time_js_1.NANOSECONDS_PER_MILLISECOND * time_js_1.MILLISECONDS_PER_SECOND;
/**
 * @param {number} [ms] current time in ms (e.g. Date.now())
 * @param {bigint} [minutes=5n] number of minutes in the future
 * @returns {bigint} nanosecond timestamp absolute since Unix epoch */
var getTimeout = function (ms, minutes) {
    if (ms === void 0) { ms = 0; }
    if (minutes === void 0) { minutes = 5n; }
    // UNTIL #9200. timestamps are getting clobbered somewhere along the way
    // and we are observing failed transfers with timeouts years in the past.
    // see https://github.com/Agoric/agoric-sdk/actions/runs/9967903776/job/27542288963#step:12:336
    return exports.DEFAULT_TIMEOUT_NS;
    var timeoutMS = BigInt(ms) + time_js_1.MILLISECONDS_PER_SECOND * time_js_1.SECONDS_PER_MINUTE * minutes;
    var timeoutNS = timeoutMS * time_js_1.NANOSECONDS_PER_MILLISECOND;
    return timeoutNS;
};
exports.getTimeout = getTimeout;
var makeIBCTransferMsg = function (amount, destination, sender, currentTime, opts) {
    var _a, _b;
    if (opts === void 0) { opts = {}; }
    var timeoutHeight = opts.timeoutHeight, timeoutTimestamp = opts.timeoutTimestamp, _c = opts.memo, memo = _c === void 0 ? '' : _c;
    var destChainInfo = starship_chain_info_js_1["default"][destination.chainName];
    if (!destChainInfo)
        throw Error("No chain info for ".concat(destination.chainName));
    var senderChainInfo = (0, starshipjs_1.useChain)(sender.chainName).chainInfo;
    var connection = (_a = destChainInfo.connections) === null || _a === void 0 ? void 0 : _a[senderChainInfo.chain.chain_id];
    if (!connection)
        throw Error("No connection found between ".concat(sender.chainName, " and ").concat(destination.chainName));
    var _d = connection.transferChannel, counterPartyPortId = _d.counterPartyPortId, counterPartyChannelId = _d.counterPartyChannelId;
    var msgTransfer = tx_js_1.MsgTransfer.fromPartial({
        sender: sender.address,
        receiver: destination.address,
        token: { denom: amount.denom, amount: String(amount.value) },
        sourcePort: counterPartyPortId,
        sourceChannel: counterPartyChannelId,
        timeoutHeight: timeoutHeight,
        timeoutTimestamp: timeoutHeight
            ? undefined
            : (timeoutTimestamp !== null && timeoutTimestamp !== void 0 ? timeoutTimestamp : (0, exports.getTimeout)(currentTime)),
        memo: memo
    });
    var fee_tokens = ((_b = senderChainInfo.chain.fees) !== null && _b !== void 0 ? _b : {}).fee_tokens;
    if (!fee_tokens || !fee_tokens.length) {
        throw Error('no fee tokens in chain config for' + sender.chainName);
    }
    var _e = fee_tokens[0], high_gas_price = _e.high_gas_price, denom = _e.denom;
    if (!high_gas_price)
        throw Error('no high gas price in chain config');
    var fee = (0, exports.makeFeeObject)({
        denom: denom,
        gas: 150000,
        gasPrice: high_gas_price
    });
    return [
        msgTransfer.sender,
        msgTransfer.receiver,
        msgTransfer.token,
        msgTransfer.sourcePort,
        msgTransfer.sourceChannel,
        msgTransfer.timeoutHeight,
        Number(msgTransfer.timeoutTimestamp),
        fee,
        msgTransfer.memo,
    ];
};
exports.makeIBCTransferMsg = makeIBCTransferMsg;
var createFundedWalletAndClient = function (t, chainName) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, chain, creditFromFaucet, getRpcEndpoint, wallet, address, client, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = (0, starshipjs_1.useChain)(chainName), chain = _a.chain, creditFromFaucet = _a.creditFromFaucet, getRpcEndpoint = _a.getRpcEndpoint;
                return [4 /*yield*/, (0, wallet_js_1.createWallet)(chain.bech32_prefix)];
            case 1:
                wallet = _d.sent();
                return [4 /*yield*/, wallet.getAccounts()];
            case 2:
                address = (_d.sent())[0].address;
                t.log("Requesting faucet funds for ".concat(address));
                return [4 /*yield*/, creditFromFaucet(address)];
            case 3:
                _d.sent();
                _c = (_b = stargate_1.SigningStargateClient).connectWithSigner;
                return [4 /*yield*/, getRpcEndpoint()];
            case 4: return [4 /*yield*/, _c.apply(_b, [_d.sent(), wallet])];
            case 5:
                client = _d.sent();
                return [2 /*return*/, { client: client, wallet: wallet, address: address }];
        }
    });
}); };
exports.createFundedWalletAndClient = createFundedWalletAndClient;
