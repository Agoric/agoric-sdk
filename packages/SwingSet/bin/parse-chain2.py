import sys, json, gzip, re
from collections import defaultdict

def abbreviate_space(s, SI=True):
    """
    Given size in bytes summarize as English by returning unicode string.
    """
    if s is None:
        return "unknown"
    if SI:
        U = 1000.0
        isuffix = "B"
    else:
        U = 1024.0
        isuffix = "iB"
    def r(count, suffix):
        return "%.2f %s%s" % (count, suffix, isuffix)

    if s < 1024: # 1000-1023 get emitted as bytes, even in SI mode
        return "%d B" % s
    if s < U*U:
        return r(s/U, "k")
    if s < U*U*U:
        return r(s/(U*U), "M")
    if s < U*U*U*U:
        return r(s/(U*U*U), "G")
    if s < U*U*U*U*U:
        return r(s/(U*U*U*U), "T")
    if s < U*U*U*U*U*U:
        return r(s/(U*U*U*U*U), "P")
    return r(s/(U*U*U*U*U*U), "E")

first_event_time = None
last_event_time = None
import_kernel_time = None
vat_names = {}
vat_manager_types = {}
vat_size = {}
vat_startup_start = {}
vat_startup = defaultdict(list)
vat_replay_start = {}
vat_replay = defaultdict(list)
vat_delivery_start = {} # vatID -> (deliveryNum, start_time)
vat_delivery = defaultdict(list)
replay_delivery_start = {} # vatID -> (deliveryNum, start_time)
replay_delivery = defaultdict(list)
execute_contract_start = {} # vatID -> start_time
execute_contract = {}
entrypoints = {}
restart_start_time = None
replay_start_time = None
replay_finish_time = None

deduced_names = { "v16": "treasury",
                  "v17": "multipool autoswap",
                  "v18": "treasury liquidateMinimum",
                  "v19": "treasury liquidateMinimum",
                  "v20": "treasury liquidateMinimum",
                  "v21": "loadgen faucet",
                 }

# restart time is:
#  kernel import time ("import-kernel-start" to "import-kernel-finish")
#  SUM(static vat creation time) (trivial)
#  SUM(dynamic vat creation time) (metered, loads zcf)
#   (first "replay-transcript-start")
#  SUM(transcript replay time) (includes executeContract)
#   (last "replay-transcript-finish")
#   (first "deliver")

fn = sys.argv[1]
opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        if not line.strip():
            continue

        data = json.loads(line.strip())
        type = data["type"]
        time = data["time"]
        if not first_event_time:
            first_event_time = time
        last_event_time = time
        vatID = data.get("vatID")
        if type == "create-vat":
            vat_names[vatID] = data.get("name") or data["description"]
            deduced = deduced_names.get(vatID)
            if deduced:
                vat_names[vatID] += " (%s)" % deduced
            vat_size[vatID] = len(json.dumps(data["vatSourceBundle"]))
            vat_manager_types[vatID] = data.get("managerType")
        if type == "import-kernel-start":
            kernel_start = time
            restart_start_time = time
        if type == "import-kernel-finish":
            import_kernel_time = time - kernel_start
        if type == "vat-startup-start":
            vat_startup_start[vatID] = time
        if type == "vat-startup-finish":
            vat_startup[vatID].append(time - vat_startup_start[vatID])
            del vat_startup_start[vatID]
        if type == "replay-transcript-start":
            vat_replay_start[vatID] = time
            if replay_start_time is None:
                replay_start_time = time
        if type == "replay-transcript-finish":
            vat_replay[vatID].append(time - vat_replay_start[vatID])
            del vat_replay_start[vatID]
            replay_finish_time = time # keep updating, use last one

        if type == "deliver":
            vat_delivery_start[vatID] = (data["deliveryNum"], time)
            if "executeContract" in line:
                execute_contract_start[vatID] = time
                mo = re.search(r'const entrypoint = \\\"([^\\]+)\\', line)
                if mo:
                    entrypoints[vatID] = mo.group(1)
        if type == "deliver-result":
            (deliveryNum, start) = vat_delivery_start[vatID]
            if deliveryNum != data["deliveryNum"]:
                raise Error("mismatch")
            vat_delivery[vatID].append(time - start)
            del vat_delivery_start[vatID]
            if vatID in execute_contract_start:
                execute_contract[vatID] = time - execute_contract_start[vatID]
                del execute_contract_start[vatID]

        if type == "start-replay-delivery":
            replay_delivery_start[vatID] = (data["deliveryNum"], time)
            if "executeContract" in line:
                source = json.loads(data["delivery"][2]["args"]["body"])[0]["source"]
                execute_contract_start[vatID] = time
                mo = re.search(r'const entrypoint = "([^"]+)";', source)
                if mo:
                    entrypoints[vatID] = mo.group(1)
        if type == "finish-replay-delivery":
            (deliveryNum, start) = replay_delivery_start[vatID]
            if deliveryNum != data["deliveryNum"]:
                raise Error("mismatch")
            replay_delivery[vatID].append(time - start)
            del replay_delivery_start[vatID]
            if vatID in execute_contract_start:
                execute_contract[vatID] = time - execute_contract_start[vatID]
                del execute_contract_start[vatID]

def stats(deliveries):
    dsum = sum(deliveries)
    dmin = deliveries[0]
    davg = dsum / len(deliveries)
    dmax = deliveries[-1]
    d50 = deliveries[int(0.5*len(deliveries))]
    d90 = deliveries[int(0.9*len(deliveries))]
    d95 = deliveries[int(0.95*len(deliveries))]
    d99 = deliveries[int(0.99*len(deliveries))]
    print("   min %.06f / avg %.06f / max %.06f / sum %.06f" % (dmin, davg, dmax, dsum))
    print("   50p %.06f / 90p %.06f / 95p %.06f / 95p %.06f" % (d50, d90, d95, d99))


print("total slog time: %.1f" % (last_event_time - first_event_time))
print("overall startup time: %.06f" % (replay_finish_time - restart_start_time))
print("  import kernel: %.06f" % import_kernel_time)
print("  reload vats :  %.06f" % (replay_start_time - restart_start_time))
print("  replay vats :  %.06f" % (replay_finish_time - replay_start_time))

vatIDs = sorted(vat_startup, key=lambda vatID: int(vatID[1:]))
for vatID in vatIDs:
    print("vat %s: %s [%s] (bundle size: %s)" % (vatID, vat_names[vatID],
                                                 vat_manager_types.get(vatID),
                                                 abbreviate_space(vat_size[vatID]),
                                                 ))
    if vatID in entrypoints:
        print(" entrypoint: %s" % entrypoints[vatID])
    print(" startup: %s" % ("/".join(["%.06f" % t for t in vat_startup[vatID]])))
    if vatID in execute_contract:
        print(" execute contract: %.06f" % execute_contract[vatID])
    print(" replay : %s" % ("/".join(["%.06f" % t for t in vat_replay[vatID]])))
    rdeliveries = sorted(replay_delivery[vatID])
    print(" replay: %d deliveries" % len(rdeliveries))
    if rdeliveries:
        print("   removing worst: %.06f" % rdeliveries[-1])
        if len(rdeliveries) > 1:
            rdeliveries.pop()
        stats(rdeliveries)

    deliveries = sorted(vat_delivery[vatID])
    print(" deliver: %d deliveries" % len(deliveries))
    if deliveries:
        print("   worst: %.06f" % deliveries[-1])
        if len(deliveries) > 1:
            deliveries.pop()
        stats(deliveries)
    print()
