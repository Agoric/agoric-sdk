#include <napi.h>
#include <iostream>
#include "libcoss.h"

namespace coss {

using namespace std;

static Napi::Function dispatch;
static Napi::Env dispatch_env;

static char* DoDispatchToNode(int instance, char* str) {
    Napi::Env env = dispatch_env;
    dispatch.Call(env.Global(), {
        Napi::Number::New(env, last_instance),
        Napi::String::New(env, str),
    });
}

static Napi::Value Start(const Napi::CallbackInfo& info) {
    static int last_instance = 0;

    Napi::Env env = info.Env();
    cerr << "Starting Go COSS from Node COSS" << endl;

    if (last_instance > 0) {
        Napi::TypeError::New(env, "Cannot start multiple COSS instances").ThrowAsJavaScriptException();
        return env.Null();
    }
    last_instance ++;

    dispatch = info[0].As<Napi::Function>();
    Napi::Array cosmosArgv = info[1].As<Napi::Function>();
    int argc = cosmosArgv.Length();
    char* argv[argc] = {nullptr};
    for (unsigned int i = 0; i < argc; i ++) {
        if (array.Has(i)) {
            string tmp = array.Get(i).As<Napi::String>.Utf8Value();
            argv[i] = strdup(tmp.c_str());
        }
    }

    GoSlice args = {argv, argc, argc};
    StartCoss(last_instance, DoDispatchToNode, args);
    cerr << "End of starting GO COSS from Node COSS" << endl;

    return Napi::Number::New(env, last_instance);
}

static Napi::Value DoDispatchToGo(const Napi::CallbackInfo& info) {
    int instance = info[0].As<Napi::Number>();
    string tmp = info[1].As<Napi::String>().Utf8Value();
    char* ret = DispatchToCosmos(instance, tmp.c_str());
    return Napi::String::New(env, ret);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
        Napi::String::New(env, "start"),
        Napi::Function::New(env, Start));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)

}
