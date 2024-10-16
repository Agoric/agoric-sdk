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
exports.__esModule = true;
exports.makeRetryUntilCondition = exports.sleep = void 0;
var ambientSetTimeout = globalThis.setTimeout;
var sleep = function (ms, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.log, log = _c === void 0 ? function () { } : _c, _d = _b.setTimeout, setTimeout = _d === void 0 ? ambientSetTimeout : _d;
    return new Promise(function (resolve) {
        log("Sleeping for ".concat(ms, "ms..."));
        setTimeout(resolve, ms);
    });
};
exports.sleep = sleep;
var retryUntilCondition = function (operation, condition, message, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.maxRetries, maxRetries = _c === void 0 ? 6 : _c, _d = _b.retryIntervalMs, retryIntervalMs = _d === void 0 ? 3500 : _d, _e = _b.log, log = _e === void 0 ? function () { } : _e, _f = _b.setTimeout, setTimeout = _f === void 0 ? ambientSetTimeout : _f;
    return __awaiter(void 0, void 0, void 0, function () {
        var retries, result, error_1;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    console.log({ maxRetries: maxRetries, retryIntervalMs: retryIntervalMs, message: message });
                    retries = 0;
                    _g.label = 1;
                case 1:
                    if (!(retries < maxRetries)) return [3 /*break*/, 7];
                    _g.label = 2;
                case 2:
                    _g.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, operation()];
                case 3:
                    result = _g.sent();
                    if (condition(result)) {
                        return [2 /*return*/, result];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _g.sent();
                    if (error_1 instanceof Error) {
                        log("Error: ".concat(error_1.message));
                    }
                    else {
                        log("Unknown error: ".concat(String(error_1)));
                    }
                    return [3 /*break*/, 5];
                case 5:
                    retries++;
                    console.log("Retry ".concat(retries, "/").concat(maxRetries, " - Waiting for ").concat(retryIntervalMs, "ms for ").concat(message, "..."));
                    return [4 /*yield*/, (0, exports.sleep)(retryIntervalMs, { log: log, setTimeout: setTimeout })];
                case 6:
                    _g.sent();
                    return [3 /*break*/, 1];
                case 7: throw Error("".concat(message, " condition failed after ").concat(maxRetries, " retries."));
            }
        });
    });
};
var makeRetryUntilCondition = function (defaultOptions) {
    if (defaultOptions === void 0) { defaultOptions = {}; }
    /**
     * Retry an asynchronous operation until a condition is met.
     * Defaults to maxRetries = 6, retryIntervalMs = 3500
     */
    return function (operation, condition, message, options) {
        return retryUntilCondition(operation, condition, message, __assign(__assign({}, defaultOptions), options));
    };
};
exports.makeRetryUntilCondition = makeRetryUntilCondition;
