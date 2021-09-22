import gzip, json
from collections import defaultdict

# For each non-dropped exported object, record the last delivery which cited
# it. Other tools can use this to synthesize or simulate a dropExport
# immediately after this delivery num, to examine what would happen if
# downstream vats had dropped our exports as soon as possible. If the slog
# recorded a drop for the object, do not include it (i.e. don't accelerate
# existing drops)

def find_activity(fn, vatID):
    active = set()
    activity = defaultdict(list) # vref -> [(start, drop)..]
    last_use = {} # vref -> deliverynum

    opener = gzip.open if fn.endswith(".gz") else open
    with opener(fn) as f:
        for line in f:
            if isinstance(line, bytes):
                line = line.decode("utf-8")
            if not line.strip():
                continue

            data = json.loads(line.strip())
            type = data["type"]
            if type not in ["deliver", "syscall"]:
                continue
            if data["vatID"] != vatID:
                continue
            deliverynum = data["deliveryNum"]
            def use(vref):
                last_use[vref] = deliverynum
                if vref not in active:
                    activity[vref].append([deliverynum, None])
                    active.add(vref)
            def drop(vref):
                assert vref in active
                assert activity[vref][-1][1] is None
                activity[vref][-1][1] = deliverynum

            if type == "deliver":
                vd = data["vd"]
                dtype = vd[0]

                if dtype == "message":
                    _, target, msg = vd
                    use(target)
                    for vref in msg["args"]["slots"]:
                        use(vref)
                    result_vpid = msg.get("result") # maybe null/None
                    if result_vpid:
                        use(result_vpid)

                if dtype == "notify":
                    _, resolutions = vd
                    for (vpid, reject, resdata) in resolutions:
                        for vref in resdata["slots"]:
                            use(vref)
                        drop(vpid)

                if dtype == "dropExports":
                    for vref in vd[1]:
                        drop(vref)

            if type == "syscall":
                vsc = data["vsc"]
                stype = vsc[0]
                if stype == "send":
                    _, target, msg = vsc
                    for vref in msg["args"]["slots"]:
                        use(vref)
                    result_vpid = msg.get("result")
                    if result_vpid:
                        use(result_vpid)
                if stype == "invoke":
                    raise Error("unable to handle syscall.invoke yet")
                if stype == "resolve":
                    _, resolutions = vsc
                    for (vpid, reject, resdata) in resolutions:
                        for vref in resdata["slots"]:
                            use(vref)
                        drop(vpid)
                if stype == "dropImports":
                    for vref in vsc[1]:
                        drop(vref)
    could_drop = {} # vref -> deliverynum where a drop could be synthesized
    drop_schedule = defaultdict(list) # deliverynum -> list(vrefs)
    for vref in active:
        if vref.startswith("o+"):
            deliverynum = last_use[vref]
            could_drop[vref] = deliverynum
            drop_schedule[deliverynum].append(vref)
    return last_use, active, activity, could_drop, drop_schedule
