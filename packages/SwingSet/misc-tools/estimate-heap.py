import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint
from find_activity import find_activity

# Track vat import/exports and record the counts after each delivery, to
# estimate the size of the heap over time. We'll compare this against runtime
# (especially GC time) to look for a correlation.

# we track current vat imports and exports by vref
vat_clist = {} # vref => { kref, reachable, data }

def add_to_vat(vrefs, data):
    for vref in vrefs:
        if vref not in vat_clist:
                vat_clist[vref] = { "reachable": True, "data": data }
        vat_clist[vref]["reachable"] = True

def drop_from_vat(vrefs):
    for vref in vrefs:
        assert vref in vat_clist, vref
        assert vat_clist[vref]["reachable"], vref
        vat_clist[vref]["reachable"] = False

def retire_from_vat(vrefs):
    for vref in vrefs:
        if vref not in vat_clist:
            print("odd: retire(%s) not in clist" % vref)
            continue
        assert vref in vat_clist, vref
        if vref[0] == "o":
            assert not vat_clist[vref]["reachable"], vref
        del vat_clist[vref]

fn = sys.argv[1]
vatID = sys.argv[2]

(last_use, active, activity, could_drop, drop_schedule) = find_activity(fn, vatID)

print("deliverynum,promises,imports,exports,exports_used")
def print_heapsize(deliverynum, could_drop):
    imports = 0
    exports = 0
    promises = 0
    exports_used = 0
    for vref in vat_clist:
        if vref.startswith("o+"):
            exports += 1
            if vref not in could_drop or deliverynum < could_drop[vref]:
                exports_used += 1
        elif vref.startswith("o-"):
            imports += 1
        elif vref.startswith("p"):
            promises += 1
    print("%d,%d,%d,%d,%d" % (deliverynum, promises, imports, exports, exports_used))

opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        if not line.strip():
            continue

        data = json.loads(line.strip())
        type = data["type"]
        if type not in ["deliver", "syscall", "deliver-result"]:
            continue
        if data["vatID"] != vatID:
            continue
        #print()
        #print(sorted(vat_clist.keys()))
        #print("line:", line.strip())
        deliverynum = data["deliveryNum"]
        added = set()
        dropped = set()
        retired = set()

        # For each non-dropped exported object, record the last delivery
        # which cited it. Our report has a column for what the heap size
        # would have been if we'd dropped both imports and exports as soon as
        # possible.

        if type == "deliver":
            vd = data["vd"]
            dtype = vd[0]

            if dtype == "message":
                _, target, msg = vd
                for vref in msg["args"]["slots"]:
                    added.add(vref)
                result_vpid = msg.get("result") # maybe null/None
                if result_vpid:
                    added.add(result_vpid)

            if dtype == "notify":
                _, resolutions = vd
                for (vpid, reject, resdata) in resolutions:
                    retired.add(vpid)
                    for vref in resdata["slots"]:
                        added.add(vref)

            if dtype == "dropExports":
                dropped.update(set(vd[1]))
            if dtype == "retireExports":
                retired.update(set(vd[1]))
            if dtype == "retireImports":
                retired.update(set(vd[1]))

        if type == "syscall":
            vsc = data["vsc"]
            stype = vsc[0]
            if stype == "send":
                _, target, msg = vsc
                for vref in msg["args"]["slots"]:
                    added.add(vref)
                result_vpid = msg.get("result")
                if result_vpid:
                    added.add(result_vpid)
            if stype == "invoke":
                raise Error("unable to handle syscall.invoke yet")
            if stype == "resolve":
                _, resolutions = vsc
                for (vpid, reject, resdata) in resolutions:
                    retired.add(vpid)
                    for vref in resdata["slots"]:
                        added.add(vref)
            if stype == "dropImports":
                dropped.update(set(vsc[1]))
            if stype == "retireImports":
                retired.update(set(vsc[1]))
            if stype == "retireExports":
                retired.update(set(vsc[1]))

        #print(deliverynum, "add/drop/retire", added, dropped, retired)
        add_to_vat(added, data)
        drop_from_vat(dropped)
        retire_from_vat(retired)
        if type == "deliver-result":
            print_heapsize(deliverynum, could_drop)
