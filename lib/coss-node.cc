#include <napi.h>
#include <iostream>
#include "libcoss.h"

namespace coss {

using namespace std;

static Napi::Function dispatch;

static int last_instance = 0;

void DoDispatchToNode(int instance, char* str) {
    Napi::Env env = dispatch.Env();
    if (last_instance != instance) {
        cerr << "Dispatch to instance " << instance << " not supported!" << endl;
    }
    dispatch.MakeCallback(env.Global(), {
        Napi::Number::New(env, last_instance),
        Napi::String::New(env, str),
    });
}

static Napi::Value DoDispatchToGo(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    int instance = info[0].As<Napi::Number>();
    string tmp = info[1].As<Napi::String>().Utf8Value();
    char* ret = DispatchToCosmos(instance, const_cast<char*>(tmp.c_str()));
    return Napi::String::New(env, ret);
}

static Napi::Value Start(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    cerr << "Starting Go COSS from Node COSS" << endl;

    if (last_instance > 0) {
        Napi::TypeError::New(env, "Cannot start multiple COSS instances").ThrowAsJavaScriptException();
        return env.Null();
    }
    last_instance ++;

    dispatch = info[0].As<Napi::Function>();
    Napi::Array cosmosArgv = info[1].As<Napi::Array>();
    unsigned int argc = cosmosArgv.Length();
    char** argv = new char*[argc];
    for (unsigned int i = 0; i < argc; i ++) {
        if (cosmosArgv.Has(i)) {
            string tmp = cosmosArgv.Get(i).As<Napi::String>().Utf8Value();
            argv[i] = strdup(tmp.c_str());
        }
    }

    GoSlice args = {argv, argc, argc};
    StartCOSS(last_instance, DoDispatchToNode, args);

    for (unsigned int i = 0; i < argc; i ++) {
        free(argv[i]);
    }
    cerr << "End of starting GO COSS from Node COSS" << endl;
    return Napi::Number::New(env, last_instance);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
        Napi::String::New(env, "start"),
        Napi::Function::New(env, Start, "Start"));
    exports.Set(
        Napi::String::New(env, "dispatch"),
        Napi::Function::New(env, DoDispatchToGo, "DoDispatchToGo"));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)

}
