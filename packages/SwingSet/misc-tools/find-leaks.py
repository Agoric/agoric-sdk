import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# we track current vat imports and exports by vref
vat_clist = {} # vref => { kref, reachable, block, crank, delivery, data }
block_height = None
vat_cranks = 0

def add_to_vat(vrefs, krefs, block, crank, delivery, data):
    assert len(vrefs) == len(krefs)
    for (vref, kref) in zip(vrefs, krefs):
        if vref not in vat_clist:
                vat_clist[vref] = { "kref": kref, "reachable": True,
                                    "block": block, "crank": crank, "delivery": delivery,
                                    "data": data }
        vat_clist[vref]["reachable"] = True

def drop_from_vat(vrefs, krefs):
    assert len(vrefs) == len(krefs)
    for (vref, kref) in zip(vrefs, krefs):
        assert vref in vat_clist, vref
        assert vat_clist[vref]["reachable"], vref
        vat_clist[vref]["reachable"] = False

def retire_from_vat(vrefs, krefs):
    assert len(vrefs) == len(krefs)
    for (vref, kref) in zip(vrefs, krefs):
        if vref not in vat_clist:
            print("odd: retire(%s/%s) not in clist" % (vref, kref))
            continue
        assert vref in vat_clist, vref
        if vref[0] == "o":
            assert not vat_clist[vref]["reachable"], vref
        del vat_clist[vref]

fn = sys.argv[1]
vat = sys.argv[2]

opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        if not line.strip():
            continue

        data = json.loads(line.strip())
        type = data["type"]
        if type == "cosmic-swingset-begin-block":
            block_height = data["blockHeight"]
        if type not in ["deliver", "syscall"]:
            continue
        if data["vatID"] != vat:
            continue
        #print()
        #print(sorted(vat_clist.keys()))
        #print("line:", line.strip())
        vat_cranks += 1
        crankNum = data["crankNum"]
        deliveryNum = data["deliveryNum"]
        added = ([], [])
        dropped = ([], [])
        retired = ([], [])

        if type == "deliver":
            vd = data["vd"]
            kd = data["kd"]
            dtype = vd[0]

            if dtype == "message":
                added[0].extend(vd[2]["args"]["slots"])
                result_vpid = vd[2].get("result") # maybe null/None
                if result_vpid:
                    added[0].append(result_vpid)
                added[1].extend(kd[2]["args"]["slots"])
                result_kpid = kd[2].get("result") # maybe null/None
                if result_vpid:
                    added[1].append(result_kpid)

            if dtype == "notify":
                for (vpid, reject, resdata) in vd[1]:
                    added[0].extend(resdata["slots"])
                    retired[0].append(vpid)
                for (kpid, state) in kd[1]:
                    added[1].extend(state["data"]["slots"])
                    retired[1].append(kpid)


            if dtype == "dropExports":
                dropped[0].extend(vd[1])
                dropped[1].extend(kd[1])
            if dtype == "retireExports":
                retired[0].extend(vd[1])
                retired[1].extend(kd[1])
            if dtype == "retireImports":
                retired[0].extend(vd[1])
                retired[1].extend(kd[1])

        if type == "syscall":
            vsc = data["vsc"]
            ksc = data["ksc"]
            stype = vsc[0]
            if stype == "send":
                added[0].extend(vsc[2]["args"]["slots"])
                result_vpid = vsc[2].get("result")
                if result_vpid:
                    added[0].append(result_vpid)
                added[1].extend(ksc[2]["args"]["slots"])
                result_kpid = ksc[2].get("result")
                if result_kpid:
                    added[1].append(result_kpid)
            if stype == "invoke":
                raise Error("unable to handle syscall.invoke yet")
            if stype == "resolve":
                for (vpid, reject, resdata) in vsc[1]:
                    added[0].extend(resdata["slots"])
                    retired[0].append(vpid)
                for (kpid, reject, resdata) in ksc[2]:
                    added[1].extend(resdata["slots"])
                    retired[1].append(kpid)
            if stype == "dropImports":
                dropped[0].extend(vsc[1])
                dropped[1].extend(ksc[1])
            if stype == "retireImports":
                retired[0].extend(vsc[1])
                retired[1].extend(ksc[1])
            if stype == "retireExports":
                retired[0].extend(vsc[1])
                retired[1].extend(ksc[1])

        add_to_vat(added[0], added[1], block_height, crankNum, deliveryNum, data)
        drop_from_vat(dropped[0], dropped[1])
        retire_from_vat(retired[0], retired[1])



print("%d leftover entries after %d vat cranks" % (len(vat_clist), vat_cranks))
for vref in sorted(vat_clist, key=lambda vref: vat_clist[vref]["crank"]):
    d = vat_clist[vref]
    print("-- %6s (%6s) [%s]: added bl%s cr%d dl%d" % (
        vref, d["kref"], "reachable" if d["reachable"] else "recognizable",
        d["block"], d["crank"], d["delivery"],
        ))
    pprint(d["data"]) ; print()
print()
