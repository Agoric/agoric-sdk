#include <napi.h>
#include <napi-thread-safe-callback.hpp>
#include <iostream>
#include "libcoss.h"

namespace coss {

using namespace std;

static shared_ptr<ThreadSafeCallback> dispatch;

static int last_instance = 0;

void DispatchToSwingSet(int instance, char* str) {
    cerr << "Dispatch to SwingSet instance " << instance << " " << str << endl;
    char* instr = strdup(str);
    dispatch->call([instr](Napi::Env env, vector<napi_value>& args){
        cerr << "Calling threadsafe callback with " << instr << endl;
        args = {
            Napi::Number::New(env, last_instance),
            Napi::String::New(env, instr),
        };
        free(instr);
    });
    cerr << "Ending Dispatch to SwingSet" << str << endl;
}

static Napi::Value SyscallToGo(const Napi::CallbackInfo& info) {
    cerr << "Syscall to Go" << endl;
    Napi::Env env = info.Env();
    int instance = info[0].As<Napi::Number>();
    string tmp = info[1].As<Napi::String>().Utf8Value();
    char* ret = SyscallToCosmos(instance, const_cast<char*>(tmp.c_str()));
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
    StartCOSS(last_instance, DispatchToSwingSet, args);

    for (unsigned int i = 0; i < argc; i ++) {
        free(argv[i]);
    }
    delete[] argv;
    cerr << "End of starting GO COSS from Node COSS" << endl;
    return Napi::Number::New(env, last_instance);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
        Napi::String::New(env, "start"),
        Napi::Function::New(env, Start, "Start"));
    exports.Set(
        Napi::String::New(env, "syscall"),
        Napi::Function::New(env, SyscallToGo, "SyscallToGo"));
    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)

}
