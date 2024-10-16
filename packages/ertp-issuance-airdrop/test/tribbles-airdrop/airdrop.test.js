"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
exports.__esModule = true;
// @ts-nocheck
var prepare_endo_js_1 = require("@endo/ses-ava/prepare-endo.js");
var e2e_tools_js_1 = require("../tools/e2e-tools.js");
var support_js_1 = require("./support.js");
var genesis_keys_js_1 = require("./airdrop-data/genesis.keys.js");
var index_js_1 = require("./airdrop-data/merkle-tree/index.js");
var test = prepare_endo_js_1["default"];
var contractName = 'tribblesAirdrop';
var contractBuilder = '../packages/builders/scripts/testing/start-tribbles-airdrop.js';
var getPubkeyKey = function (_a) {
    var pubkey = _a.pubkey;
    return "".concat(pubkey.key);
};
var agoricPubkeys = genesis_keys_js_1.agoricGenesisAccounts.map(getPubkeyKey);
var generateInt = function (x) { return function () { return Math.floor(Math.random() * (x + 1)); }; };
var createTestTier = generateInt(4); // ?
var accounts = ['alice', 'bob', 'carol'];
test.before(function (t) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, deleteTestKeys, setupTestKeys, rest, wallets, startContract;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, (0, support_js_1.commonSetup)(t)];
            case 1:
                _a = _b.sent(), deleteTestKeys = _a.deleteTestKeys, setupTestKeys = _a.setupTestKeys, rest = __rest(_a, ["deleteTestKeys", "setupTestKeys"]);
                return [4 /*yield*/, deleteTestKeys(accounts)["catch"]()];
            case 2:
                _b.sent();
                return [4 /*yield*/, setupTestKeys(accounts)];
            case 3:
                wallets = _b.sent();
                t.context = __assign(__assign({}, rest), { wallets: wallets, deleteTestKeys: deleteTestKeys });
                startContract = rest.startContract;
                console.group('################ START inside test.before logger ##############');
                console.log('----------------------------------------');
                console.log('t.context ::::', t.context);
                console.log('----------------------------------------');
                console.log('wallets ::::', wallets);
                console.log('--------------- END insi ®de test.before logger -------------------');
                console.groupEnd();
                return [4 /*yield*/, startContract(contractName, contractBuilder)];
            case 4:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
test.after(function (t) { return __awaiter(void 0, void 0, void 0, function () {
    var deleteTestKeys;
    return __generator(this, function (_a) {
        deleteTestKeys = t.context.deleteTestKeys;
        deleteTestKeys(accounts);
        return [2 /*return*/];
    });
}); });
var makeMakeOfferArgs = function (keys) {
    if (keys === void 0) { keys = publicKeys; }
    return function (_a) {
        var _b = _a.pubkey.key, key = _b === void 0 ? '' : _b, _c = _a.address, address = _c === void 0 ? 'agoric12d3fault' : _c;
        return ({
            key: key,
            proof: index_js_1.merkleTreeAPI.generateMerkleProof(key, keys),
            address: address,
            tier: createTestTier()
        });
    };
};
var makeOfferArgs = makeMakeOfferArgs(genesis_keys_js_1.pubkeys);
var simulatreClaim = test.macro({
    title: function (_, agoricAccount) {
        return "Simulate claim for account ".concat(agoricAccount.name, " with address ").concat(agoricAccount.address);
    },
    exec: function (t, agoricAccount) { return __awaiter(void 0, void 0, void 0, function () {
        var address, pubkey, _a, useChain, wallets, provisionSmartWallet, vstorageClient, retryUntilCondition, makeTestBalances, _b, brands, instances, istBrand, feeAmount, eligibleAccounts, currentAcct, alicesWallet, doOffer, id, offerId, walletViewResults, walletCurrent, agQueryClient, _c, balances;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log(t.context);
                    address = agoricAccount.address, pubkey = agoricAccount.pubkey;
                    console.log("testing makeCreateAndFundScenario for account ".concat(agoricAccount.name, ", and pubkey ").concat(pubkey));
                    _a = t.context, useChain = _a.useChain, wallets = _a.wallets, provisionSmartWallet = _a.provisionSmartWallet, vstorageClient = _a.vstorageClient, retryUntilCondition = _a.retryUntilCondition;
                    makeTestBalances = function (_a) {
                        var _b = _a.IST, IST = _b === void 0 ? 50n : _b, _c = _a.BLD, BLD = _c === void 0 ? 100n : _c;
                        return ({
                            IST: IST,
                            BLD: BLD
                        });
                    };
                    t.log(wallets[accounts[0]], Object.values(wallets).map(function (x) { return x; }));
                    return [4 /*yield*/, Promise.all([
                            vstorageClient.queryData('published.agoricNames.brand'),
                            vstorageClient.queryData('published.agoricNames.instance'),
                        ])];
                case 1:
                    _b = _e.sent(), brands = _b[0], instances = _b[1];
                    console.log('Brands::', brands);
                    istBrand = Object.fromEntries(brands).IST;
                    console.group('################ START AIRDROP.TEST.TS logger ##############');
                    console.log('----------------------------------------');
                    console.log('brands ::::', brands);
                    console.log('----------------------------------------');
                    console.log('instances ::::', Object.fromEntries(instances));
                    console.log('----------------------------------');
                    console.log('--------------- END AIRDROP.TEST.TS logger -------------------');
                    console.groupEnd();
                    feeAmount = harden({
                        brand: istBrand,
                        value: 5n
                    });
                    eligibleAccounts = genesis_keys_js_1.agoricGenesisAccounts.map(function (x) { return x.address; });
                    currentAcct = agoricAccount;
                    return [4 /*yield*/, provisionSmartWallet(currentAcct.address, {
                            IST: 10n,
                            BLD: 30n
                        })];
                case 2:
                    alicesWallet = _e.sent();
                    doOffer = (0, e2e_tools_js_1.makeDoOffer)(alicesWallet);
                    id = 0;
                    offerId = "offer-".concat(Date.now());
                    return [4 /*yield*/, doOffer({
                            id: offerId,
                            invitationSpec: {
                                source: 'agoricContract',
                                instancePath: [contractName],
                                callPipe: [['makeClaimTokensInvitation']]
                            },
                            offerArgs: __assign(__assign({}, makeOfferArgs(currentAcct)), { proof: index_js_1.merkleTreeAPI.generateMerkleProof(currentAcct.pubkey.key, genesis_keys_js_1.agoricGenesisAccounts.map(function (x) { return x.pubkey.key; })), tier: 3 }),
                            proposal: {
                                give: { Fee: feeAmount }
                            }
                        })];
                case 3:
                    _e.sent();
                    return [4 /*yield*/, Promise.all(Object.values(wallets).map(function (x) { return vstorageClient.walletView(x); }))];
                case 4:
                    walletViewResults = _e.sent();
                    console.group('################ START walletViewResults logger ##############');
                    console.log('----------------------------------------');
                    console.log('walletViewResults ::::', walletViewResults);
                    console.log('----------------------------------------');
                    console.log('alicesWallet ::::', alicesWallet);
                    console.log('--------------- END walletViewResults logger -------------------');
                    console.groupEnd();
                    return [4 /*yield*/, vstorageClient.queryData("published.wallet.".concat(currentAcct.address, ".current"))];
                case 5:
                    walletCurrent = _e.sent();
                    t.like(walletCurrent, { liveOffers: [], offerToPublicSubscriberPaths: [] });
                    _c = makeQueryClient;
                    return [4 /*yield*/, useChain('agoric').getRestEndpoint()];
                case 6:
                    agQueryClient = _c.apply(void 0, [_e.sent()]);
                    return [4 /*yield*/, agQueryClient.queryBalances(alicesWallet)];
                case 7:
                    balances = (_e.sent()).balances;
                    t.deepEqual(balances, [
                        { denom: 'ubld', amount: String(90000000n) },
                        { denom: 'uist', amount: String(250000n) },
                    ], 'faucet request minus 10 BLD, plus 0.25 IST provisioning credit');
                    t.log((_d = {}, _d[currentAcct.address] = balances, _d));
                    return [2 /*return*/];
            }
        });
    }); }
});
test.serial(simulatreClaim, genesis_keys_js_1.agoricGenesisAccounts[genesis_keys_js_1.agoricGenesisAccounts.length - 1]);
