// This file is formatted with Alt-Shift-F in VSCode.
#include <napi.h>
#include <napi-thread-safe-callback.hpp>
#include <iostream>
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

        exports.Set("NodeReplier", func);
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
        try {
            // std::cerr << "Replying to Go with " << value << " " << isRejection << std::endl;
            if (replyPort_) {
                ReplyToGo(replyPort_, isRejection, value.c_str());
            }
        } catch (std::exception& e) {
            // std::cerr << "Exceptioning " << e.what() << std::endl;
            if (replyPort_) {
                ReplyToGo(replyPort_, true, e.what());
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

static int daemonPort = -1;
int SendToNode(int port, int replyPort, Body msg) {
    // std::cerr << "Send to node port " << port << " " << msg << std::endl;
    // FIXME: Make a better bootstrap, honouring an AG_COSMOS_START message.
    if (daemonPort < 0) {
        daemonPort = replyPort;
    }
    std::string msgStr(msg);
    // This call is queued on the main thread, so we can return immediately to Golang.
    dispatcher->call(
        // Prepare arguments.
        [msgStr, port, replyPort](Napi::Env env, std::vector<napi_value>& args) {
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
    int port = info[0].As<Napi::Number>();
    std::string msg = info[1].As<Napi::String>().Utf8Value();
    Body resp = SendToGo(port, msg.c_str());
    return Napi::String::New(env, resp);
}

static Napi::Value runAgCosmosDaemon(const Napi::CallbackInfo& info) {
    static bool singleton = false;
    Napi::Env env = info.Env();
    // std::cerr << "Starting Go agcosmosdaemon from ag-chain-cosmos Controller" << std::endl;

    if (singleton) {
        Napi::TypeError::New(env, "Cannot start multiple agcosmosdaemon instances").ThrowAsJavaScriptException();
        return env.Null();
    }
    singleton = true;

    int nodePort = info[0].As<Napi::Number>().ToNumber();
    dispatcher = std::make_shared<ThreadSafeCallback>(info[1].As<Napi::Function>());
    Napi::Array daemonArgv = info[2].As<Napi::Array>();
    unsigned int argc = daemonArgv.Length();
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
    RunAgCosmosDaemon(nodePort, SendToNode, args);

    for (unsigned int i = 0; i < argc; i++) {
        free(argv[i]);
    }
    delete[] argv;
    // std::cerr << "End of starting agcosmosdaemon from Node ag-chain-cosmos" << std::endl;
    return Napi::Number::New(env, daemonPort);
}

static Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    exports = NodeReplier::Init(env, exports);
    exports.Set(
        Napi::String::New(env, "runAgCosmosDaemon"),
        Napi::Function::New(env, runAgCosmosDaemon, "runAgCosmosDaemon"));
    exports.Set(
        Napi::String::New(env, "send"),
        Napi::Function::New(env, send, "send"));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)

} // namespace ss
