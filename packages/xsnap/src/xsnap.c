#include "xsAll.h"
#include "xsScript.h"
#include "xsSnapshot.h"
#include "xs.h"

extern txScript* fxLoadScript(txMachine* the, txString path, txUnsigned flags);

typedef struct sxAliasIDLink txAliasIDLink;
typedef struct sxAliasIDList txAliasIDList;
typedef struct sxJob txJob;
typedef void (*txJobCallback)(txJob*);

struct sxAliasIDLink {
	txAliasIDLink* previous;
	txAliasIDLink* next;
	txInteger id;
	txInteger flag;
};

struct sxAliasIDList {
	txAliasIDLink* first;
	txAliasIDLink* last;
	txFlag* aliases;
	txInteger errorCount;
};

struct sxJob {
	txJob* next;
	txMachine* the;
	txNumber when;
	txJobCallback callback;
	txSlot function;
	txSlot argument;
	txNumber interval;
};

static void fxBuildAgent(xsMachine* the);
static txInteger fxCheckAliases(txMachine* the);
static void fxCheckAliasesError(txMachine* the, txAliasIDList* list, txFlag flag);
static void fxCheckEnvironmentAliases(txMachine* the, txSlot* environment, txAliasIDList* list);
static void fxCheckInstanceAliases(txMachine* the, txSlot* instance, txAliasIDList* list);
static void fxFreezeBuiltIns(txMachine* the);
static void fxPatchBuiltIns(txMachine* the);
static void fxPrintUsage();

static void fx_Array_prototype_meter(xsMachine* the);

extern void fx_clearTimer(txMachine* the);
static void fx_destroyTimer(void* data);
static void fx_evalScript(xsMachine* the);
static void fx_gc(xsMachine* the);
static void fx_isPromiseJobQueueEmpty(xsMachine* the);
static void fx_markTimer(txMachine* the, void* it, txMarkRoot markRoot);
static void fx_print(xsMachine* the);
static void fx_setImmediate(txMachine* the);
static void fx_setInterval(txMachine* the);
static void fx_setTimeout(txMachine* the);
static void fx_setTimer(txMachine* the, txNumber interval, txBoolean repeat);
static void fx_setTimerCallback(txJob* job);

static void fxFulfillModuleFile(txMachine* the);
static void fxRejectModuleFile(txMachine* the);
static void fxRunModuleFile(txMachine* the, txString path);
static void fxRunProgramFile(txMachine* the, txString path, txUnsigned flags);
static void fxRunLoop(txMachine* the);

#define mxSnapshotCallbackCount 9
txCallback gxSnapshotCallbacks[mxSnapshotCallbackCount] = {
	fx_clearTimer,
	fx_evalScript,
	fx_gc,
	fx_isPromiseJobQueueEmpty,
	fx_print,
	fx_setImmediate,
	fx_setInterval,
	fx_setTimeout,
	fx_Array_prototype_meter,
};

enum {
	XSL_MODULE_FLAG,
	XSL_EXPORT_FLAG,
	XSL_ENVIRONMENT_FLAG,
	XSL_PROPERTY_FLAG,
	XSL_ITEM_FLAG,
	XSL_GETTER_FLAG,
	XSL_SETTER_FLAG,
	XSL_PROXY_HANDLER_FLAG,
	XSL_PROXY_TARGET_FLAG,
	XSL_GLOBAL_FLAG,
};

#define mxPushLink(name,ID,FLAG) \
	txAliasIDLink name = { C_NULL, C_NULL, ID, FLAG }; \
	name.previous = list->last; \
	if (list->last) \
		list->last->next = &name; \
	else \
		list->first = &name; \
	list->last = &name

#define mxPopLink(name) \
	if (name.previous) \
		name.previous->next = C_NULL; \
	else \
		list->first = C_NULL; \
	list->last = name.previous

static int fxSnapshopRead(void* stream, void* address, size_t size)
{
	return (fread(address, size, 1, stream) == 1) ? 0 : errno;
}

static int fxSnapshopWrite(void* stream, void* address, size_t size)
{
	return (fwrite(address, size, 1, stream) == 1) ? 0 : errno;
}

#define xsBeginMetering(_THE, _CALLBACK, _STEP) \
	do { \
		xsJump __HOST_JUMP__; \
		__HOST_JUMP__.nextJump = (_THE)->firstJump; \
		__HOST_JUMP__.stack = (_THE)->stack; \
		__HOST_JUMP__.scope = (_THE)->scope; \
		__HOST_JUMP__.frame = (_THE)->frame; \
		__HOST_JUMP__.environment = NULL; \
		__HOST_JUMP__.code = (_THE)->code; \
		__HOST_JUMP__.flag = 0; \
		(_THE)->firstJump = &__HOST_JUMP__; \
		if (setjmp(__HOST_JUMP__.buffer) == 0) { \
			fxBeginMetering(_THE, _CALLBACK, _STEP)

#define xsEndMetering(_THE) \
			fxEndMetering(_THE); \
		} \
		(_THE)->stack = __HOST_JUMP__.stack, \
		(_THE)->scope = __HOST_JUMP__.scope, \
		(_THE)->frame = __HOST_JUMP__.frame, \
		(_THE)->code = __HOST_JUMP__.code, \
		(_THE)->firstJump = __HOST_JUMP__.nextJump; \
		break; \
	} while(1)
	
#define xsPatchHostFunction(_FUNCTION,_PATCH) \
	(xsOverflow(-1), \
	fxPush(_FUNCTION), \
	fxPatchHostFunction(the, _PATCH), \
	fxPop())
#define xsMeterHostFunction(_COUNT) \
	fxMeterHostFunction(the, _COUNT)
	
static xsUnsignedValue gxMeteringLimit = 0;
static xsBooleanValue fxMeteringCallback(xsMachine* the, xsUnsignedValue index)
{
	if (index > gxMeteringLimit) {
		fprintf(stderr, "too much computation\n");
		return 0;
	}
// 	fprintf(stderr, "%d\n", index);
	return 1;
}
static xsBooleanValue gxMeteringPrint = 0;

int main(int argc, char* argv[]) 
{
	int argi;
	int argr = 0;
	int argw = 0;
	int error = 0;
	int interval = 0;
	int option = 0;
	int freeze = 0;
	xsCreation _creation = {
		16 * 1024 * 1024, 	/* initialChunkSize */
		16 * 1024 * 1024, 	/* incrementalChunkSize */
		1 * 1024 * 1024, 	/* initialHeapCount */
		1 * 1024 * 1024, 	/* incrementalHeapCount */
		4096, 				/* stackCount */
		4096*3, 			/* keyCount */
		1993, 				/* nameModulo */
		127, 				/* symbolModulo */
		256 * 1024,			/* parserBufferSize */
		1993,				/* parserTableModulo */
	};
	xsCreation* creation = &_creation;
	txSnapshot snapshot = {
		"xsnap 1.0.2",
		11,
		gxSnapshotCallbacks,
		mxSnapshotCallbackCount,
		fxSnapshopRead,
		fxSnapshopWrite,
		NULL,
		0,
		NULL,
		NULL,
		NULL,
	};
	xsMachine* machine;
	char path[C_PATH_MAX];
	char* dot;

	if (argc == 1) {
		fxPrintUsage();
		return 0;
	}
	for (argi = 1; argi < argc; argi++) {
		if (argv[argi][0] != '-')
			continue;
		if (!strcmp(argv[argi], "-e"))
			option = 1;
		else if (!strcmp(argv[argi], "-f")) {
			if (argw) {
				fxPrintUsage();
				return 1;
			}
			freeze = 1;
		}
		else if (!strcmp(argv[argi], "-h"))
			fxPrintUsage();
		else if (!strcmp(argv[argi], "-i")) {
			argi++;
			if (argi < argc)
				interval = atoi(argv[argi]);
			else {
				fxPrintUsage();
				return 1;
			}
		}
		else if (!strcmp(argv[argi], "-l")) {
			argi++;
			if (argi < argc)
				gxMeteringLimit = atoi(argv[argi]);
			else {
				fxPrintUsage();
				return 1;
			}
		}
		else if (!strcmp(argv[argi], "-m"))
			option = 2;
		else if (!strcmp(argv[argi], "-p"))
			gxMeteringPrint = 1;
		else if (!strcmp(argv[argi], "-r")) {
			argi++;
			if (argi < argc)
				argr = argi;
			else {
				fxPrintUsage();
				return 1;
			}
		}
		else if (!strcmp(argv[argi], "-s"))
			option = 3;
		else if (!strcmp(argv[argi], "-v"))
			printf("XS %d.%d.%d\n", XS_MAJOR_VERSION, XS_MINOR_VERSION, XS_PATCH_VERSION);
		else if (!strcmp(argv[argi], "-w")) {
			if (freeze) {
				fxPrintUsage();
				return 1;
			}
			argi++;
			if (argi < argc)
				argw = argi;
			else {
				fxPrintUsage();
				return 1;
			}
		}
		else {
			fxPrintUsage();
			return 1;
		}
	}
	if (gxMeteringLimit) {
		if (interval == 0)
			interval = 1;
	}
	fxInitializeSharedCluster();
	if (argr) {
		snapshot.stream = fopen(argv[argr], "rb");
		if (snapshot.stream) {
			machine = fxReadSnapshot(&snapshot, "xsnap", NULL);
			fclose(snapshot.stream);
		}
		else
			snapshot.error = errno;
		if (snapshot.error) {
			fprintf(stderr, "cannot read snapshot %s: %s\n", argv[argr], strerror(snapshot.error));
			return 1;
		}
	}
	else {
		machine = xsCreateMachine(creation, "xsnap", NULL);
		fxBuildAgent(machine);
		fxPatchBuiltIns(machine);
	}
	if (freeze) {
		fxFreezeBuiltIns(machine);
		fxShareMachine(machine);
		fxCheckAliases(machine);
		machine = xsCloneMachine(creation, machine, "xsnap", NULL);
	}
	xsBeginMetering(machine, fxMeteringCallback, interval);
	{
		xsBeginHost(machine);
		{
			xsVars(1);
			xsTry {
				for (argi = 1; argi < argc; argi++) {
					if (!strcmp(argv[argi], "-i")) {
						argi++;
						continue;
					}
					if (!strcmp(argv[argi], "-l")) {
						argi++;
						continue;
					}
					if (argv[argi][0] == '-')
						continue;
					if (argi == argr)
						continue;
					if (argi == argw)
						continue;
					if (option == 1) {
						xsResult = xsString(argv[argi]);
						xsCall1(xsGlobal, xsID("eval"), xsResult);
					}
					else {	
						if (!c_realpath(argv[argi], path))
							xsURIError("file not found: %s", argv[argi]);
						dot = strrchr(path, '.');
						if (((option == 0) && dot && !c_strcmp(dot, ".mjs")) || (option == 2))
							fxRunModuleFile(the, path);
						else
							fxRunProgramFile(the, path, mxProgramFlag | mxDebugFlag);
					}
				}
			}
			xsCatch {
				if (xsTypeOf(xsException) != xsUndefinedType) {
					fprintf(stderr, "%s\n", xsToString(xsException));
					error = 1;
					xsException = xsUndefined;
				}
			}
		}
		xsEndHost(machine);
		fxRunLoop(machine);
		xsBeginHost(machine);
		{
			if (xsTypeOf(xsException) != xsUndefinedType) {
				fprintf(stderr, "%s\n", xsToString(xsException));
				error = 1;
			}
		}
		xsEndHost(machine);
		if (argw) {
			snapshot.stream = fopen(argv[argw], "wb");
			if (snapshot.stream) {
				fxWriteSnapshot(machine, &snapshot);
				fclose(snapshot.stream);
			}
			else
				snapshot.error = errno;
			if (snapshot.error) {
				fprintf(stderr, "cannot write snapshot %s: %s\n", argv[argw], strerror(snapshot.error));
			}
		}
	}
	xsEndMetering(machine);
	xsDeleteMachine(machine);
	fxTerminateSharedCluster();
	return error;
}

void fxBuildAgent(xsMachine* the) 
{
	txSlot* slot;
	mxPush(mxGlobal);
	slot = fxLastProperty(the, fxToInstance(the, the->stack));
	slot = fxNextHostFunctionProperty(the, slot, fx_clearTimer, 1, xsID("clearImmediate"), XS_DONT_ENUM_FLAG);
	slot = fxNextHostFunctionProperty(the, slot, fx_clearTimer, 1, xsID("clearInterval"), XS_DONT_ENUM_FLAG);
	slot = fxNextHostFunctionProperty(the, slot, fx_clearTimer, 1, xsID("clearTimeout"), XS_DONT_ENUM_FLAG);
	slot = fxNextHostFunctionProperty(the, slot, fx_evalScript, 1, xsID("evalScript"), XS_DONT_ENUM_FLAG); 
	slot = fxNextHostFunctionProperty(the, slot, fx_gc, 1, xsID("gc"), XS_DONT_ENUM_FLAG);
	slot = fxNextHostFunctionProperty(the, slot, fx_isPromiseJobQueueEmpty, 1, xsID("isPromiseJobQueueEmpty"), XS_DONT_ENUM_FLAG);
	slot = fxNextHostFunctionProperty(the, slot, fx_print, 1, xsID("print"), XS_DONT_ENUM_FLAG);
	slot = fxNextHostFunctionProperty(the, slot, fx_setImmediate, 1, xsID("setImmediate"), XS_DONT_ENUM_FLAG);
	slot = fxNextHostFunctionProperty(the, slot, fx_setInterval, 1, xsID("setInterval"), XS_DONT_ENUM_FLAG);
	slot = fxNextHostFunctionProperty(the, slot, fx_setTimeout, 1, xsID("setTimeout"), XS_DONT_ENUM_FLAG);
	
	mxPush(mxObjectPrototype);
	fxNextHostFunctionProperty(the, fxLastProperty(the, fxNewObjectInstance(the)), fx_print, 1, xsID("log"), XS_DONT_ENUM_FLAG);
	slot = fxNextSlotProperty(the, slot, the->stack, xsID("console"), XS_DONT_ENUM_FLAG);
	mxPop();
	
	mxPop();
}

txInteger fxCheckAliases(txMachine* the) 
{
	txAliasIDList _list = { C_NULL, C_NULL }, *list = &_list;
	txSlot* module = mxProgram.value.reference->next; //@@
	list->aliases = c_calloc(the->aliasCount, sizeof(txFlag));
	while (module) {
		txSlot* export = mxModuleExports(module)->value.reference->next;
		if (export) {
			mxPushLink(moduleLink, module->ID, XSL_MODULE_FLAG);
			while (export) {
				txSlot* closure = export->value.export.closure;
				if (closure) {
					mxPushLink(exportLink, export->ID, XSL_EXPORT_FLAG);
					if (closure->ID != XS_NO_ID) {
						if (list->aliases[closure->ID] == 0) {
							list->aliases[closure->ID] = 1;
							fxCheckAliasesError(the, list, 0);
						}
					}
					if (closure->kind == XS_REFERENCE_KIND) {
						fxCheckInstanceAliases(the, closure->value.reference, list);
					}
					mxPopLink(exportLink);
				}
				export = export->next;
			}
			mxPopLink(moduleLink);
		}
		module = module->next;
	}
	{
		txSlot* global = mxGlobal.value.reference->next->next;
		while (global) {
			if ((global->ID != mxID(_global)) && (global->ID != mxID(_globalThis))) {
				mxPushLink(globalLink, global->ID, XSL_GLOBAL_FLAG);
				if (global->kind == XS_REFERENCE_KIND) {
					fxCheckInstanceAliases(the, global->value.reference, list);
				}
				mxPopLink(globalLink);
			}
			global = global->next;
		}
	}
	{
		fxCheckEnvironmentAliases(the, mxException.value.reference, list);
	}
	return list->errorCount;
}

void fxCheckAliasesError(txMachine* the, txAliasIDList* list, txFlag flag) 
{
	txAliasIDLink* link = list->first;
	if (flag > 1)
		fprintf(stderr, "### error");
	else
		fprintf(stderr, "### warning");
	while (link) {
		switch (link->flag) {
		case XSL_PROPERTY_FLAG: fprintf(stderr, "."); break;
		case XSL_ITEM_FLAG: fprintf(stderr, "["); break;
		case XSL_GETTER_FLAG: fprintf(stderr, ".get "); break;
		case XSL_SETTER_FLAG: fprintf(stderr, ".set "); break;
		case XSL_ENVIRONMENT_FLAG: fprintf(stderr, "() "); break;
		case XSL_PROXY_HANDLER_FLAG: fprintf(stderr, ".(handler)"); break;
		case XSL_PROXY_TARGET_FLAG: fprintf(stderr, ".(target)"); break;
		default: fprintf(stderr, ": "); break;
		}
		if (link->id < 0) {
			if (link->id != XS_NO_ID) {
				char* string = fxGetKeyName(the, link->id);
				if (string) {
					if (link->flag == XSL_MODULE_FLAG) {
						char* dot = c_strrchr(string, '.');
						if (dot) {
							*dot = 0;
							fprintf(stderr, "\"%s\"", string);
							*dot = '.';
						}
						else
							fprintf(stderr, "%s", string);
					}
					else if (link->flag == XSL_GLOBAL_FLAG) {
						fprintf(stderr, "globalThis."); 
						fprintf(stderr, "%s", string);
					}
					else
						fprintf(stderr, "%s", string);
				}
				else
					fprintf(stderr, "%d", link->id);
			}
		}
		else 
			fprintf(stderr, "%d", link->id);
		if (link->flag == XSL_ITEM_FLAG)
			fprintf(stderr, "]");
		link = link->next;
	}
	if (flag == 3) {
		fprintf(stderr, ": generator\n");
		list->errorCount++;
	}
	else if (flag == 2) {
		fprintf(stderr, ": regexp\n");
		list->errorCount++;
	}
	else if (flag)
		fprintf(stderr, ": not frozen\n");
	else
		fprintf(stderr, ": no const\n");
}

void fxCheckEnvironmentAliases(txMachine* the, txSlot* environment, txAliasIDList* list) 
{
	txSlot* closure = environment->next;
	if (environment->flag & XS_LEVEL_FLAG)
		return;
	environment->flag |= XS_LEVEL_FLAG;
	if (environment->value.instance.prototype)
		fxCheckEnvironmentAliases(the, environment->value.instance.prototype, list);
	while (closure) {
		if (closure->kind == XS_CLOSURE_KIND) {
			txSlot* slot = closure->value.closure;
			mxPushLink(closureLink, closure->ID, XSL_ENVIRONMENT_FLAG);
			if (slot->ID != XS_NO_ID) {
				if (list->aliases[slot->ID] == 0) {
					list->aliases[slot->ID] = 1;
					fxCheckAliasesError(the, list, 0);
				}
			}
			if (slot->kind == XS_REFERENCE_KIND) {
				fxCheckInstanceAliases(the, slot->value.reference, list);
			}
			mxPopLink(closureLink);
		}
		closure = closure->next;
	}
	//environment->flag &= ~XS_LEVEL_FLAG;
}

void fxCheckInstanceAliases(txMachine* the, txSlot* instance, txAliasIDList* list) 
{
	txSlot* property = instance->next;
	if (instance->flag & XS_LEVEL_FLAG)
		return;
	instance->flag |= XS_LEVEL_FLAG;
	if (instance->value.instance.prototype) {
		mxPushLink(propertyLink, mxID(___proto__), XSL_PROPERTY_FLAG);
		fxCheckInstanceAliases(the, instance->value.instance.prototype, list);
		mxPopLink(propertyLink);
	}
	if (instance->ID != XS_NO_ID) {
		if (list->aliases[instance->ID] == 0) {
			list->aliases[instance->ID] = 1;
			fxCheckAliasesError(the, list, 1);
		}
	}
	while (property) {
		if (property->kind == XS_ACCESSOR_KIND) {
			if (property->value.accessor.getter) {
				mxPushLink(propertyLink, property->ID, XSL_GETTER_FLAG);
				fxCheckInstanceAliases(the, property->value.accessor.getter, list);
				mxPopLink(propertyLink);
			}
			if (property->value.accessor.setter) {
				mxPushLink(propertyLink, property->ID, XSL_SETTER_FLAG);
				fxCheckInstanceAliases(the, property->value.accessor.setter, list);
				mxPopLink(propertyLink);
			}
		}
		else if (property->kind == XS_ARRAY_KIND) {
			txSlot* item = property->value.array.address;
			txInteger length = (txInteger)fxGetIndexSize(the, property);
			while (length > 0) {
				if (item->kind == XS_REFERENCE_KIND) {
					mxPushLink(propertyLink,  (txInteger)(item->next), XSL_ITEM_FLAG);
					fxCheckInstanceAliases(the, item->value.reference, list);
					mxPopLink(propertyLink);
				}
				item++;
				length--;
			}
		}
		else if ((property->kind == XS_CODE_KIND) || (property->kind == XS_CODE_X_KIND)) {
			if (property->value.code.closures)
				fxCheckEnvironmentAliases(the, property->value.code.closures, list);
		}
		else if (property->kind == XS_PROXY_KIND) {
			if (property->value.proxy.handler) {
				mxPushLink(propertyLink, XS_NO_ID, XSL_PROXY_HANDLER_FLAG);
				fxCheckInstanceAliases(the, property->value.proxy.handler, list);
				mxPopLink(propertyLink);
			}
			if (property->value.proxy.target) {
				mxPushLink(propertyLink, XS_NO_ID, XSL_PROXY_TARGET_FLAG);
				fxCheckInstanceAliases(the, property->value.proxy.target, list);
				mxPopLink(propertyLink);
			}
		}
		else if (property->kind == XS_REFERENCE_KIND) {
			mxPushLink(propertyLink, property->ID, XSL_PROPERTY_FLAG);
			fxCheckInstanceAliases(the, property->value.reference, list);
			mxPopLink(propertyLink);
		}
		property = property->next;
	}
// 	instance->flag &= ~XS_LEVEL_FLAG;
}

void fxFreezeBuiltIns(txMachine* the)
{
#define mxFreezeBuiltInCall \
	mxPush(mxObjectConstructor); \
	mxPushSlot(freeze); \
	mxCall()
#define mxFreezeBuiltInRun \
	mxPushBoolean(1); \
	mxRunCount(2); \
	mxPop()

	txSlot* freeze;
	txInteger id;

	mxTemporary(freeze);
	mxPush(mxObjectConstructor);
	fxGetID(the, mxID(_freeze));
	mxPullSlot(freeze);
	
	for (id = XS_SYMBOL_ID_COUNT; id < _Infinity; id++) {
		mxFreezeBuiltInCall; mxPush(the->stackPrototypes[-1 - id]); mxFreezeBuiltInRun;
	}
	for (id = _Compartment; id < XS_INTRINSICS_COUNT; id++) {
		mxFreezeBuiltInCall; mxPush(the->stackPrototypes[-1 - id]); mxFreezeBuiltInRun;
	}
	mxFreezeBuiltInCall; mxPush(mxGlobal); fxGetID(the, xsID("gc")); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxGlobal); fxGetID(the, xsID("evalScript")); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxGlobal); fxGetID(the, xsID("print")); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxGlobal); fxGetID(the, xsID("clearInterval")); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxGlobal); fxGetID(the, xsID("clearTimeout")); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxGlobal); fxGetID(the, xsID("setInterval")); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxGlobal); fxGetID(the, xsID("setTimeout")); mxFreezeBuiltInRun;
	
	mxFreezeBuiltInCall; mxPush(mxArgumentsSloppyPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxArgumentsStrictPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxArrayIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxAsyncFromSyncIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxAsyncFunctionPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxAsyncGeneratorFunctionPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxAsyncGeneratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxAsyncIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxGeneratorFunctionPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxGeneratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxHostPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxMapEntriesIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxMapKeysIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxMapValuesIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxModulePrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxRegExpStringIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxSetEntriesIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxSetKeysIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxSetValuesIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxStringIteratorPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxTransferPrototype); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxTypedArrayPrototype); mxFreezeBuiltInRun;

	mxFreezeBuiltInCall; mxPush(mxAssignObjectFunction); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxCopyObjectFunction); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxEnumeratorFunction); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxInitializeRegExpFunction); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxOnRejectedPromiseFunction); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxOnResolvedPromiseFunction); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPush(mxOnThenableFunction); mxFreezeBuiltInRun;
	
	mxFreezeBuiltInCall; mxPushReference(mxArrayLengthAccessor.value.accessor.getter); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPushReference(mxArrayLengthAccessor.value.accessor.setter); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPushReference(mxStringAccessor.value.accessor.getter); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPushReference(mxStringAccessor.value.accessor.setter); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPushReference(mxProxyAccessor.value.accessor.getter); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPushReference(mxProxyAccessor.value.accessor.setter); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPushReference(mxTypedArrayAccessor.value.accessor.getter); mxFreezeBuiltInRun;
	mxFreezeBuiltInCall; mxPushReference(mxTypedArrayAccessor.value.accessor.setter); mxFreezeBuiltInRun;
	
	mxFreezeBuiltInCall; mxPush(mxArrayPrototype); fxGetID(the, mxID(_Symbol_unscopables)); mxFreezeBuiltInRun;
	
	mxFreezeBuiltInCall; mxPush(mxProgram); mxFreezeBuiltInRun; //@@
	mxFreezeBuiltInCall; mxPush(mxHosts); mxFreezeBuiltInRun; //@@
	
	mxPop();
}

void fx_Array_prototype_meter(xsMachine* the)
{
	xsIntegerValue length = xsToInteger(xsGet(xsThis, xsID("length")));
	xsMeterHostFunction(length);
}

void fxPatchBuiltIns(txMachine* machine)
{
	xsBeginHost(machine);
	xsVars(2);
	xsVar(0) = xsGet(xsGlobal, xsID("Array"));
	xsVar(0) = xsGet(xsVar(0), xsID("prototype"));
	xsVar(1) = xsGet(xsVar(0), xsID("reverse"));
	xsPatchHostFunction(xsVar(1), fx_Array_prototype_meter);
	xsVar(1) = xsGet(xsVar(0), xsID("sort"));
	xsPatchHostFunction(xsVar(1), fx_Array_prototype_meter);
	xsEndHost(machine);
}

void fxPrintUsage()
{
	printf("xsnap [-h] [-e] [-f] [i <interval] [l <limit] [-m] [-r <snapshot>] [-s] [-v] [-w <snapshot>] strings...\n");
	printf("\t-e: eval strings\n");
	printf("\t-f: freeze the XS machine\n");
	printf("\t-h: print this help message\n");
	printf("\t-i <interval>: metering interval (default to 1)\n");
	printf("\t-l <limit>: metering limit (default to none)\n");
	printf("\t-m: strings are paths to modules\n");
	printf("\t-r <snapshot>: read snapshot to create the XS machine\n");
	printf("\t-s: strings are paths to scripts\n");
	printf("\t-v: print XS version\n");
	printf("\t-w <snapshot>: write snapshot of the XS machine at exit\n");
	printf("without -e, -m, -s:\n");
	printf("\tif the extension is .mjs, strings are paths to modules\n");
	printf("\telse strings are paths to scripts\n");
	printf("-f and -w are incompatible\n");
}

void fx_evalScript(xsMachine* the)
{
	txSlot* realm = mxProgram.value.reference->next->value.module.realm;
	txStringStream aStream;
	aStream.slot = mxArgv(0);
	aStream.offset = 0;
	aStream.size = c_strlen(fxToString(the, mxArgv(0)));
	fxRunScript(the, fxParseScript(the, &aStream, fxStringGetter, mxProgramFlag | mxDebugFlag), mxRealmGlobal(realm), C_NULL, mxRealmClosures(realm)->value.reference, C_NULL, mxProgram.value.reference);
	mxPullSlot(mxResult);
}

void fx_gc(xsMachine* the)
{
	xsCollectGarbage();
}

void fx_isPromiseJobQueueEmpty(txMachine* the)
{
	xsResult = (the->promiseJobs) ? xsFalse : xsTrue;
}

void fx_print(xsMachine* the)
{
	xsIntegerValue c = xsToInteger(xsArgc), i;
	if (gxMeteringPrint)
		fprintf(stdout, "[%u] ", the->meterIndex);
	for (i = 0; i < c; i++) {
		if (i)
			fprintf(stdout, " ");
		fprintf(stdout, "%s", xsToString(xsArg(i)));
	}
	fprintf(stdout, "\n");
}

void fx_setImmediate(txMachine* the)
{
	fx_setTimer(the, 0, 0);
}

void fx_setInterval(txMachine* the)
{
	fx_setTimer(the, fxToNumber(the, mxArgv(1)), 1);
}

void fx_setTimeout(txMachine* the)
{
	fx_setTimer(the, fxToNumber(the, mxArgv(1)), 0);
}

static txHostHooks gxTimerHooks = {
	fx_destroyTimer,
	fx_markTimer
};

void fx_clearTimer(txMachine* the)
{
	txJob* data = fxGetHostData(the, mxThis);
	if (data) {
		txJob* job;
		txJob** address;
		address = (txJob**)&(the->timerJobs);
		while ((job = *address)) {
			if (job == data) {
				*address = job->next;
				c_free(job);
				break;
			}
			address = &(job->next);
		}
		fxSetHostData(the, mxThis, NULL);
	}
}

void fx_destroyTimer(void* data)
{
}

void fx_markTimer(txMachine* the, void* it, txMarkRoot markRoot)
{
	txJob* job = it;
	if (job) {
		(*markRoot)(the, &job->function);
		(*markRoot)(the, &job->argument);
	}
}

void fx_setTimer(txMachine* the, txNumber interval, txBoolean repeat)
{
	c_timeval tv;
	txJob* job;
	txJob** address = (txJob**)&(the->timerJobs);
	while ((job = *address))
		address = &(job->next);
	job = *address = malloc(sizeof(txJob));
	c_memset(job, 0, sizeof(txJob));
	job->the = the;
	job->callback = fx_setTimerCallback;
	c_gettimeofday(&tv, NULL);
	if (repeat)
		job->interval = interval;
	job->when = ((txNumber)(tv.tv_sec) * 1000.0) + ((txNumber)(tv.tv_usec) / 1000.0) + interval;
	job->function.kind = mxArgv(0)->kind;
	job->function.value = mxArgv(0)->value;
	if (mxArgc > 2) {
		job->argument.kind = mxArgv(2)->kind;
		job->argument.value = mxArgv(2)->value;
	}
	fxNewHostObject(the, C_NULL);
	fxSetHostData(the, the->stack, job);
	fxSetHostHooks(the, the->stack, &gxTimerHooks);
	mxPullSlot(mxResult);
}

void fx_setTimerCallback(txJob* job)
{
	txMachine* the = job->the;
	fxBeginHost(the);
	{
		mxTry(the) {
			/* THIS */
			mxPushUndefined();
			/* FUNCTION */
			mxPush(job->function);
			mxCall();
			mxPush(job->argument);
			/* ARGC */
			mxRunCount(1);
			mxPop();
		}
		mxCatch(the) {
		}
	}
	fxEndHost(the);
}

/* PLATFORM */

void fxAbort(txMachine* the, int status)
{
	if (status == XS_NOT_ENOUGH_MEMORY_EXIT)
		mxUnknownError("not enough memory");
	else if (status == XS_STACK_OVERFLOW_EXIT)
		mxUnknownError("stack overflow");
	else if (status == XS_TOO_MUCH_COMPUTATION_EXIT)
		fxExitToHost(the);
	else
		c_exit(status);
}

void fxCreateMachinePlatform(txMachine* the)
{
#ifdef mxDebug
	the->connection = mxNoSocket;
#endif
	the->promiseJobs = 0;
	the->timerJobs = NULL;
}

void fxDeleteMachinePlatform(txMachine* the)
{
}

void fxMarkHost(txMachine* the, txMarkRoot markRoot)
{
	txJob* job = the->timerJobs;
	while (job) {
		fx_markTimer(the, job, markRoot);
		job = job->next;
	}
}

void fxQueuePromiseJobs(txMachine* the)
{
	the->promiseJobs = 1;
}

void fxRunLoop(txMachine* the)
{
	c_timeval tv;
	txNumber when;
	txJob* job;
	txJob** address;
	for (;;) {
		while (the->promiseJobs) {
			the->promiseJobs = 0;
			fxRunPromiseJobs(the);
		}
		c_gettimeofday(&tv, NULL);
		when = ((txNumber)(tv.tv_sec) * 1000.0) + ((txNumber)(tv.tv_usec) / 1000.0);
		address = (txJob**)&(the->timerJobs);
		if (!*address)
			break;
		while ((job = *address)) {
			if (job->when <= when) {
				(*job->callback)(job);	
				if (job->interval) {
					job->when += job->interval;
				}
				else {
					*address = job->next;
					c_free(job);
				}
				break;
			}
			address = &(job->next);
		}
	}
}

void fxSweepHost(txMachine* the)
{
}

void fxFulfillModuleFile(txMachine* the)
{
	xsException = xsUndefined;
}

void fxRejectModuleFile(txMachine* the)
{
	xsException = xsArg(0);
}

void fxRunModuleFile(txMachine* the, txString path)
{
	txSlot* realm = mxProgram.value.reference->next->value.module.realm;
	mxPushStringC(path);
	fxRunImport(the, realm, XS_NO_ID);
	mxDub();
	fxGetID(the, mxID(_then));
	mxCall();
	fxNewHostFunction(the, fxFulfillModuleFile, 1, XS_NO_ID);
	fxNewHostFunction(the, fxRejectModuleFile, 1, XS_NO_ID);
	mxRunCount(2);
	mxPop();
}

void fxRunProgramFile(txMachine* the, txString path, txUnsigned flags)
{
	txSlot* realm = mxProgram.value.reference->next->value.module.realm;
	txScript* script = fxLoadScript(the, path, flags);
	mxModuleInstanceInternal(mxProgram.value.reference)->value.module.id = fxID(the, path);
	fxRunScript(the, script, mxRealmGlobal(realm), C_NULL, mxRealmClosures(realm)->value.reference, C_NULL, mxProgram.value.reference);
	mxPullSlot(mxResult);
}

/* DEBUG */

#ifdef mxDebug

void fxConnect(txMachine* the)
{
	char name[256];
	char* colon;
	int port;
	struct sockaddr_in address;
#if mxWindows
	if (GetEnvironmentVariable("XSBUG_HOST", name, sizeof(name))) {
#else
	colon = getenv("XSBUG_HOST");
	if ((colon) && (c_strlen(colon) + 1 < sizeof(name))) {
		c_strcpy(name, colon);
#endif		
		colon = strchr(name, ':');
		if (colon == NULL)
			port = 5002;
		else {
			*colon = 0;
			colon++;
			port = strtol(colon, NULL, 10);
		}
	}
	else {
		strcpy(name, "localhost");
		port = 5002;
	}
	memset(&address, 0, sizeof(address));
  	address.sin_family = AF_INET;
	address.sin_addr.s_addr = inet_addr(name);
	if (address.sin_addr.s_addr == INADDR_NONE) {
		struct hostent *host = gethostbyname(name);
		if (!host)
			return;
		memcpy(&(address.sin_addr), host->h_addr, host->h_length);
	}
  	address.sin_port = htons(port);
#if mxWindows
{  	
	WSADATA wsaData;
	unsigned long flag;
	if (WSAStartup(0x202, &wsaData) == SOCKET_ERROR)
		return;
	the->connection = socket(AF_INET, SOCK_STREAM, 0);
	if (the->connection == INVALID_SOCKET)
		return;
  	flag = 1;
  	ioctlsocket(the->connection, FIONBIO, &flag);
	if (connect(the->connection, (struct sockaddr*)&address, sizeof(address)) == SOCKET_ERROR) {
		if (WSAEWOULDBLOCK == WSAGetLastError()) {
			fd_set fds;
			struct timeval timeout = { 2, 0 }; // 2 seconds, 0 micro-seconds
			FD_ZERO(&fds);
			FD_SET(the->connection, &fds);
			if (select(0, NULL, &fds, NULL, &timeout) == 0)
				goto bail;
			if (!FD_ISSET(the->connection, &fds))
				goto bail;
		}
		else
			goto bail;
	}
 	flag = 0;
 	ioctlsocket(the->connection, FIONBIO, &flag);
}
#else
{  	
	int	flag;
	the->connection = socket(AF_INET, SOCK_STREAM, 0);
	if (the->connection <= 0)
		goto bail;
	c_signal(SIGPIPE, SIG_IGN);
#if mxMacOSX
	{
		int set = 1;
		setsockopt(the->connection, SOL_SOCKET, SO_NOSIGPIPE, (void *)&set, sizeof(int));
	}
#endif
	flag = fcntl(the->connection, F_GETFL, 0);
	fcntl(the->connection, F_SETFL, flag | O_NONBLOCK);
	if (connect(the->connection, (struct sockaddr*)&address, sizeof(address)) < 0) {
    	 if (errno == EINPROGRESS) { 
			fd_set fds;
			struct timeval timeout = { 2, 0 }; // 2 seconds, 0 micro-seconds
			int error = 0;
			unsigned int length = sizeof(error);
			FD_ZERO(&fds);
			FD_SET(the->connection, &fds);
			if (select(the->connection + 1, NULL, &fds, NULL, &timeout) == 0)
				goto bail;
			if (!FD_ISSET(the->connection, &fds))
				goto bail;
			if (getsockopt(the->connection, SOL_SOCKET, SO_ERROR, &error, &length) < 0)
				goto bail;
			if (error)
				goto bail;
		}
		else
			goto bail;
	}
	fcntl(the->connection, F_SETFL, flag);
	c_signal(SIGPIPE, SIG_DFL);
}
#endif
	return;
bail:
	fxDisconnect(the);
}

void fxDisconnect(txMachine* the)
{
#if mxWindows
	if (the->connection != INVALID_SOCKET) {
		closesocket(the->connection);
		the->connection = INVALID_SOCKET;
	}
	WSACleanup();
#else
	if (the->connection >= 0) {
		close(the->connection);
		the->connection = -1;
	}
#endif
}

txBoolean fxIsConnected(txMachine* the)
{
	return (the->connection != mxNoSocket) ? 1 : 0;
}

txBoolean fxIsReadable(txMachine* the)
{
	return 0;
}

void fxReceive(txMachine* the)
{
	int count;
	if (the->connection != mxNoSocket) {
#if mxWindows
		count = recv(the->connection, the->debugBuffer, sizeof(the->debugBuffer) - 1, 0);
		if (count < 0)
			fxDisconnect(the);
		else
			the->debugOffset = count;
#else
	again:
		count = read(the->connection, the->debugBuffer, sizeof(the->debugBuffer) - 1);
		if (count < 0) {
			if (errno == EINTR)
				goto again;
			else
				fxDisconnect(the);
		}
		else
			the->debugOffset = count;
#endif
	}
	the->debugBuffer[the->debugOffset] = 0;
}

void fxSend(txMachine* the, txBoolean more)
{
	if (the->connection != mxNoSocket) {
#if mxWindows
		if (send(the->connection, the->echoBuffer, the->echoOffset, 0) <= 0)
			fxDisconnect(the);
#else
	again:
		if (write(the->connection, the->echoBuffer, the->echoOffset) <= 0) {
			if (errno == EINTR)
				goto again;
			else
				fxDisconnect(the);
		}
#endif
	}
}

#endif /* mxDebug */





