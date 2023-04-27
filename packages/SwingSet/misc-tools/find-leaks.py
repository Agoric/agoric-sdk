import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# Point this at a slogfile and an optional vatID to filter on. It
# rebuilds the state of the c-lists and emits a report with the
# objects that are still present at the end of the slog. For each
# object, it reports the Remotable-registered interface of the object,
# and the delivery which introduced it. These may represent leaked
# objects.

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

def get_iface(vref, vcapdata):
    ifaces = [""]
    def check(dct):
        if dct.get("@qclass") == "slot" and vcapdata["slots"][dct["index"]] == vref:
            ifaces.append("(%s)" % dct.get("iface"))
        return dct
    json.loads(vcapdata["body"], object_hook=check)
    return ifaces[-1]

def describe_delivery(vref, d):
    data = d["data"]
    if data["type"] == "deliver":
        kd = data["kd"]
        vd = data["vd"]
        if kd[0] == "message":
            vtarget = vd[1]
            ktarget = kd[1]
            method = json.loads(kd[2]["methargs"]["body"])[0]
            kresult = kd[2].get("result")
            vresult = vd[2].get("result")
            iface = get_iface(vref, vd[2]["methargs"])
            return "d.deliver %s/%s.%s() -> r=%s/%s %s" % (vtarget, ktarget, method, vresult, kresult, iface)
        if kd[0] == "notify":
            vpids = ",".join([res[0] for res in vd[1]])
            kpids = ",".join([res[0] for res in kd[1]])
            iface = get_iface(vref, [res[2] for res in vd[1] if vref in res[2]["slots"]][0])
            return "d.notify %s/%s %s" % (vpids, kpids, iface)
    if data["type"] == "syscall":
        ksc = data["ksc"]
        vsc = data["vsc"]
        if ksc[0] == "send":
            ktarget = ksc[1]
            vtarget = vsc[1]
            method = json.loads(ksc[2]["methargs"]["body"])[0]
            iface = get_iface(vref, vsc[2]["methargs"])
            kresult = ksc[2].get("result")
            vresult = vsc[2].get("result")
            return "s.send %s/%s.%s() -> r=%s/%s %s" % (vtarget, ktarget, method, vresult, kresult, iface)
        if ksc[0] == "resolve":
            vpids = ",".join([res[0] for res in vsc[1]])
            kpids = ",".join([res[0] for res in ksc[2]])
            iface = get_iface(vref, [res[2] for res in vsc[1] if vref in res[2]["slots"]][0])
            return "s.resolve %s/%s %s" % (vpids, kpids, iface)
    return "?"

fn = sys.argv[1]
vatID = sys.argv[2] if len(sys.argv) > 2 else None

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
        if vatID and data["vatID"] != vatID:
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
                added[0].extend(vd[2]["methargs"]["slots"])
                result_vpid = vd[2].get("result") # maybe null/None
                if result_vpid:
                    added[0].append(result_vpid)
                added[1].extend(kd[2]["methargs"]["slots"])
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
                added[0].extend(vsc[2]["methargs"]["slots"])
                result_vpid = vsc[2].get("result")
                if result_vpid:
                    added[0].append(result_vpid)
                added[1].extend(ksc[2]["methargs"]["slots"])
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
    print("  b %6s (%6s) [%s]: added bl%s cr%d dl%d %s" % (
        vref, d["kref"], "reachable" if d["reachable"] else "recognizable",
        d["block"], d["crank"], d["delivery"], describe_delivery(vref, d),
        ))
    #pprint(d["data"]) ; print()
print()
