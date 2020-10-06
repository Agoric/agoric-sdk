#include "xsAll.h"
#include "xs.h"
//#include "xsmc.h"
#include "mc.xs.h"

// DONE 1: return object, not undefined, from createVatFromSource1
// DONE 2: load module inside new machine
// DONE 3: export cross-machine calling object for dispatch->vat calls
// 4: pass cross-machine calling object for vat->dispatch calls
// 5: return deleteVat callable
// 6: return createSnapshot callable
// 7: implement createVatFromSnapshot, with all of the above too
// 8: dispatch->vat should return a promise


typedef struct {
    xsMachine *m;
    xsSlot handle;
} xsVatRecord, *xsVat;

void xs_Vat(xsMachine *the) {
    xsVatRecord vat;

    fprintf(stderr, "entering createVatFromSource1\n");
    /*
    int argc = xsToInteger(xsArgc);
    if (argc < 1) {
        xsTypeError("expected source as arg[0]");
    }
    char *source = xsToString(xsArg(0));
*/

    // todo: get these values from JS arguments
    xsCreation _creation = {
        16 * 1024 * 1024, 	/* initialChunkSize */
        16 * 1024 * 1024, 	/* incrementalChunkSize */
        1 * 1024 * 1024, 	/* initialHeapCount */
        1 * 1024 * 1024, 	/* incrementalHeapCount */
        4096, 				/* stackCount */
        4096*3, 			/* keyCount */
        1993, 				/* nameModulo */
        127, 				/* symbolModulo */
        64 * 1024,			/* parserBufferSize */
        1993,				/* parserTableModulo */
    };
    xsCreation* creation = &_creation;
    void *context = NULL;

/*
    fprintf(stderr, "about to xsCreateMachine\n");
    vat.m = xsCreateMachine(creation, "vat", context);
    fprintf(stderr, "did xsCreateMachine %p\n", vat.m);
    if (!vat.m) {
        fprintf(stderr, "cannot allocate new machine\n"); // TODO remove before production
        xsUnknownError("cannot allocate new machine");
    }
*/

    void* preparation = xsPreparation(); // copies stuff from linker/module table
    vat.m = fxPrepareMachine(creation, preparation, "vatHost", context, NULL);
    xsIndex handleID = xsID("handle");

    xsBeginHost(vat.m);
    {
        xsVars(2);
        fprintf(stderr, "glue: loading vatHost\n");
        xsVar(0) = xsAwaitImport("vatHost", XS_IMPORT_DEFAULT);
        fprintf(stderr, " glue: loaded vatHost\n");
        if (xsTest(xsVar(0)) && xsIsInstanceOf(xsVar(0), xsFunctionPrototype))
            xsCallFunction0(xsVar(0), xsUndefined);
        fprintf(stderr, " glue: called vatHost.main()\n");
        
        //fetch(global, "handle")
        xsVar(1) = xsGet(xsGlobal, handleID);//xsID("handle")); // no idea why this coredumps
        fprintf(stderr, " glue: globalThis.handle gotten\n");
        fprintf(stderr, " glue: globalThis.handle is %d\n", xsVar(1).kind);
        xsCallFunction0(xsVar(1), xsUndefined);
        vat.handle = xsVar(1);
        xsRemember(vat.handle);

        // fprintf(stderr, "glue: invoking vatHost.main() vatHost\n");
        //xsVar(2) = xsCallFunction1(xsVar(1), xsUndefined, xsUndefined);

        //xsCall1(xsString("this"), xsID("eval"), xsString(source));
    }
    xsEndHost(vat.m);

    xsSetHostChunk(xsThis, &vat, sizeof(vat));
}

void xs_Vat_sendToVat(xsMachine *the) {
    int argc = xsToInteger(xsArgc);
    fprintf(stderr, " xs_Vat_sendToVat(argc=%d)\n", argc);
    if (argc < 1) {
        xsTypeError("expected handler arg as arg[0]");
    }
    char *arg = xsToString(xsArg(0));
    char *newResponse;

    xsVat vat = xsGetHostChunk(xsThis);
    xsBeginHost(vat->m);
    {
        xsVars(1);
        char *newArg = c_calloc(c_strlen(arg), 1);
        c_strcpy(newArg, arg);
        xsVar(0) = xsCallFunction1(vat->handle, xsUndefined, xsString(newArg));
        char *oldResponse = xsToString(xsVar(0));
        newResponse = c_calloc(c_strlen(oldResponse), 1);
        c_strcpy(newResponse, oldResponse);
    }
    xsEndHost(vat->m);

    xsResult = xsString(newResponse);
}


void xs_Vat_destructor(void* data) {
    return; // still coredumps
    xsVat vat = data;
    xsBeginHost(vat->m);
    {
        xsForget(vat->handle);
    }
    xsEndHost(vat->m);
}
