#include <napi.h>
#include <napi-thread-safe-callback.hpp>
#include <iostream>
#include "libcoss.h"

namespace coss {

static std::shared_ptr<ThreadSafeCallback> dispatcher;

int SendToNode(int port, int replyPort, Body str) {
    std::cerr << "Send to node port " << port << " " << str << std::endl;
    std::string instr(str);
    std::thread([instr, port, replyPort]{
        auto future = dispatcher->call<std::string>(
            // Prepare arguments.
            [port, instr](Napi::Env env, std::vector<napi_value>& args){
                std::cerr << "Calling threadsafe callback with " << instr << std::endl;
                args = {
                    Napi::Number::New(env, port),
                    Napi::String::New(env, instr),
                };
            },
            [](const Napi::Value& val){
                return val.As<Napi::String>().Utf8Value();
            });
        if (replyPort) {
            std::cerr << "Waiting on future" << std::endl;
            try {
                std::string ret = future.get();
                std::cerr << "Replying to Go with " << ret << std::endl;
                ReplyToGo(replyPort, false, ret.c_str());
            } catch (std::exception& e) {
                std::cerr << "Exceptioning " << e.what() << std::endl;
                ReplyToGo(replyPort, true, e.what());
            }
        }
        std::cerr << "Thread is finished" << std::endl;
    }).detach();
    std::cerr << "Ending Send to Node " << str << std::endl;
    return 0;
}

static Napi::Value send(const Napi::CallbackInfo& info) {
    std::cerr << "Send to Go" << std::endl;
    Napi::Env env = info.Env();
    int instance = info[0].As<Napi::Number>();
    std::string tmp = info[1].As<Napi::String>().Utf8Value();
    Body ret = SendToGo(instance, tmp.c_str());
    return Napi::String::New(env, ret);
}

static Napi::Value start(const Napi::CallbackInfo& info) {
    static bool singleton = false;
    Napi::Env env = info.Env();
    std::cerr << "Starting Go COSS from Node COSS" << std::endl;

    if (singleton) {
        Napi::TypeError::New(env, "Cannot start multiple COSS instances").ThrowAsJavaScriptException();
        return env.Null();
    }
    singleton = true;

    dispatcher = std::make_shared<ThreadSafeCallback>(info[0].As<Napi::Function>());
    Napi::Array cosmosArgv = info[1].As<Napi::Array>();
    unsigned int argc = cosmosArgv.Length();
    char** argv = new char*[argc];
    for (unsigned int i = 0; i < argc; i ++) {
        if (cosmosArgv.Has(i)) {
            std::string tmp = cosmosArgv.Get(i).As<Napi::String>().Utf8Value();
            argv[i] = strdup(tmp.c_str());
        } else {
            argv[i] = nullptr;
        }
    }

    GoSlice args = {argv, argc, argc};
    int cosmosPort = StartCOSS(SendToNode, args);

    for (unsigned int i = 0; i < argc; i ++) {
        free(argv[i]);
    }
    delete[] argv;
    std::cerr << "End of starting GO COSS from Node COSS" << std::endl;
    return Napi::Number::New(env, cosmosPort);
}

static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
        Napi::String::New(env, "start"),
        Napi::Function::New(env, start, "start"));
    exports.Set(
        Napi::String::New(env, "send"),
        Napi::Function::New(env, send, "send"));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)

}
