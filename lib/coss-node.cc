#include <node.h>
#include <iostream>
#include "libcoss.h"

namespace coss {

using v8::Local;
using v8::FunctionCallbackInfo;
using v8::Object;
using v8::Value;
using namespace std;

void Start(const FunctionCallbackInfo<Value>& args) {
    cerr << "Starting Go COSS from Node COSS" << endl;
    // FIXME: Supply number of arguments to skip.
    StartCOSS(1);
    cerr << "End of starting GO COSS from Node COSS" << endl;
}

void init(Local<Object> exports) {
    NODE_SET_METHOD(exports, "start", Start);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, init)

}