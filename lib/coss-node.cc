#include <napi.h>
#include <napi-thread-safe-callback.hpp>
#include <iostream>
#include "libcoss.h"

namespace coss {

using namespace std;

static shared_ptr<ThreadSafeCallback> dispatch;

int SendToNode(int port, int replyPort, Body str) {
    cerr << "Send to node port " << port << " " << str << endl;
    string instr(str);
    std::thread([instr, port, replyPort]{
        auto future = dispatch->call<string>(
            // Prepare arguments.
            [port, instr](Napi::Env env, vector<napi_value>& args){
                cerr << "Calling threadsafe callback with " << instr << endl;
                args = {
                    Napi::Number::New(env, port),
                    Napi::String::New(env, instr),
                };
            },
            // Prepare return value.
            [](const Napi::Value &val) {
                cerr << "Returning threadsafe callback" << endl;
                string str = val.As<Napi::String>().Utf8Value();
                cerr << "returning " << str;
                return str;
            });
        if (replyPort) {
            cerr << "Waiting on future" << endl;
            try {
                string ret = future.get();
                cerr << "Replying to Go" << endl;
                ReplyToGo(replyPort, false, ret.c_str());
            } catch (std::exception& e) {
                cerr << "Exceptioning " << e.what() << endl;
                ReplyToGo(replyPort, true, e.what());
            }
        }
        cerr << "Thread is finished" << endl;
    }).detach();
    cerr << "Ending Send to Node " << str << endl;
    return 0;
}

static Napi::Value send(const Napi::CallbackInfo& info) {
    cerr << "Send to Go" << endl;
    Napi::Env env = info.Env();
    int instance = info[0].As<Napi::Number>();
    string tmp = info[1].As<Napi::String>().Utf8Value();
    Body ret = SendToGo(instance, tmp.c_str());
    return Napi::String::New(env, ret);
}

static Napi::Value start(const Napi::CallbackInfo& info) {
    static bool singleton = false;
    Napi::Env env = info.Env();
    cerr << "Starting Go COSS from Node COSS" << endl;

    if (singleton) {
        Napi::TypeError::New(env, "Cannot start multiple COSS instances").ThrowAsJavaScriptException();
        return env.Null();
    }
    singleton = true;

    auto cb = make_shared<ThreadSafeCallback>(info[0].As<Napi::Function>());
    dispatch.swap(cb);
    Napi::Array cosmosArgv = info[1].As<Napi::Array>();
    unsigned int argc = cosmosArgv.Length();
    char** argv = new char*[argc];
    for (unsigned int i = 0; i < argc; i ++) {
        if (cosmosArgv.Has(i)) {
            string tmp = cosmosArgv.Get(i).As<Napi::String>().Utf8Value();
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
    cerr << "End of starting GO COSS from Node COSS" << endl;
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
