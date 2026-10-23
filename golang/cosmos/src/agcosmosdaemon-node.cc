// This file is formatted with Alt-Shift-F in VSCode.
#include <napi.h>
#include <napi-thread-safe-callback.hpp>
#include <iostream>
#include <cmath>
#include <limits>
#include "../build/libagcosmosdaemon.h"

namespace ss {

static std::shared_ptr<ThreadSafeCallback> dispatcher;

class NodeReplier : public Napi::ObjectWrap<NodeReplier> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);
        Napi::Function func = DefineClass(
            env, "NodeReplier",
            {
                InstanceMethod("resolve", &NodeReplier::Resolve),
                InstanceMethod("reject", &NodeReplier::Reject),
            });

        constructor = Napi::Persistent(func);
        constructor.SuppressDestruct();

        return exports;
    }

    NodeReplier(const Napi::CallbackInfo& info) : Napi::ObjectWrap<NodeReplier>(info) {
        // Do nothing, we're initialized by New.
    }

    static Napi::Object New(Napi::Env env, int replyPort) {
        Napi::Object obj = constructor.New({});
        NodeReplier* self = Unwrap(obj);
        self->replyPort_ = replyPort;
        return obj;
    }

private:
    static Napi::FunctionReference constructor;
    void doReply(bool isRejection, std::string value) {
        const int replyID = replyPort_;
        replyPort_ = 0; // Settle at most once, like a promise-kit replier.
        try {
            // std::cerr << "Replying to Go with " << value << " " << isRejection << std::endl;
            if (replyID) {
                ReplyToGo(replyID, isRejection, value.c_str());
            }
        } catch (std::exception& e) {
            // std::cerr << "Exceptioning " << e.what() << std::endl;
            if (replyID) {
                ReplyToGo(replyID, true, e.what());
            }
        }
        // std::cerr << "Replier is finished" << std::endl;
    }

    void Resolve(const Napi::CallbackInfo& info) {
        doReply(false, info[0].As<Napi::String>().Utf8Value());
    }

    void Reject(const Napi::CallbackInfo& info) {
        doReply(true, info[0].As<Napi::String>().Utf8Value());
    }

    int replyPort_;
};

Napi::FunctionReference NodeReplier::constructor;

int SendToNode(int port, int replyPort, Body msg) {
    std::string msgStr(msg);
    // This call is queued on the main thread, so we can return immediately to Golang.
    dispatcher->call(
        // Prepare arguments.
        [port, msgStr, replyPort](Napi::Env env, std::vector<napi_value>& args) {
            // std::cerr << "Calling threadsafe callback with " << msgStr << std::endl;
            args = {
                Napi::Number::New(env, port),
                Napi::String::New(env, msgStr),
                NodeReplier::New(env, replyPort),
            };
        });
    // std::cerr << "Ending Send to Node " << msg << std::endl;
    return 0;
}

static Napi::Value send(const Napi::CallbackInfo& info) {
    // std::cerr << "Send to Go" << std::endl;
    Napi::Env env = info.Env();
    if (info.Length() < 2 || info.Length() > 3 || !info[0].IsNumber() || !info[1].IsString()) {
        Napi::TypeError::New(env, "send expects a positive Go service port and a string").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    double portValue = info[0].As<Napi::Number>().DoubleValue();
    if (!(portValue > 0 && portValue <= std::numeric_limits<int>::max() && std::floor(portValue) == portValue)) {
        Napi::TypeError::New(env, "invalid Go service port").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Value handleError = env.Undefined();
    if (info.Length() == 3 && !info[2].IsUndefined()) {
        if (!info[2].IsObject() || info[2].IsNull()) {
            Napi::TypeError::New(env, "send options must be an object").ThrowAsJavaScriptException();
            return env.Undefined();
        }
        handleError = info[2].As<Napi::Object>().Get("handleError");
        if (!handleError.IsUndefined() && !handleError.IsFunction()) {
            Napi::TypeError::New(env, "handleError must be a function").ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }
    int port = static_cast<int>(portValue);
    std::string msg = info[1].As<Napi::String>().Utf8Value();
    int isError = 0;
    Body resp = SendToGo(port, msg.c_str(), &isError);
    if (isError && handleError.IsFunction()) {
        auto json = env.Global().Get("JSON").As<Napi::Object>();
        auto error = json.Get("parse").As<Napi::Function>().Call(json, {Napi::String::New(env, resp)}).As<Napi::Object>().Get("error");
        return handleError.As<Napi::Function>().Call({error});
    }
    return Napi::String::New(env, resp);
}

static Napi::Value start(const Napi::CallbackInfo& info) {
    static bool singleton = false;
    Napi::Env env = info.Env();
    // std::cerr << "Starting Go agcosmosdaemon from ag-chain-cosmos Controller" << std::endl;

    if (singleton) {
        Napi::TypeError::New(env, "Cannot start multiple agcosmosdaemon instances").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (info.Length() != 2 || !info[0].IsFunction() || !info[1].IsArray()) {
        Napi::TypeError::New(env, "start expects a message handler and argv array").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Array daemonArgv = info[1].As<Napi::Array>();
    unsigned int argc = daemonArgv.Length();
    if (argc == 0) {
        Napi::TypeError::New(env, "argv must be a nonempty array of strings").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    for (unsigned int i = 0; i < argc; i++) {
        if (!daemonArgv.Has(i) || !daemonArgv.Get(i).IsString()) {
            Napi::TypeError::New(env, "argv must be a nonempty array of strings").ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }
    singleton = true;
    dispatcher = std::make_shared<ThreadSafeCallback>(info[0].As<Napi::Function>());
    char** argv = new char*[argc];
    for (unsigned int i = 0; i < argc; i++) {
        if (daemonArgv.Has(i)) {
            std::string tmp = daemonArgv.Get(i).As<Napi::String>().Utf8Value();
            argv[i] = strdup(tmp.c_str());
        } else {
            argv[i] = nullptr;
        }
    }

    GoSlice args = {argv, argc, argc};
    RunAgCosmosDaemon(SendToNode, args);

    for (unsigned int i = 0; i < argc; i++) {
        free(argv[i]);
    }
    delete[] argv;
    // std::cerr << "End of starting agcosmosdaemon from Node ag-chain-cosmos" << std::endl;
    Napi::Object sender = Napi::Object::New(env);
    sender.Set("send", Napi::Function::New(env, send, "send"));
    return sender;
}

static Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    exports = NodeReplier::Init(env, exports);
    exports.Set(
        Napi::String::New(env, "start"),
        Napi::Function::New(env, start, "start"));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)

} // namespace ss
