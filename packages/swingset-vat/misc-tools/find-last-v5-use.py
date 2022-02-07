#!/usr/bin/env python3

# goal: build a schedule of when we can drop exported objects, to free them as soon as possible

import sys, json, gzip
from collections import defaultdict

exports = {} # vref -> type
interfaces = {} # vref -> interface

def find_interfaces(body):
    if isinstance(body, list):
        for item in body:
            yield from find_interfaces(item)
    elif isinstance(body, dict):
        if "@qclass" in body:
            if body["@qclass"] == "slot":
                iface = body.get("iface", None)
                index = body["index"]
                yield (index, iface)
        else:
            for item in body.values():
                yield from find_interfaces(item)

last_reference = {} # koNN -> deliverynum
fn = sys.argv[1] # transcript-v5.sst.gz
opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for linum, line in enumerate(f):
        if linum == 0:
            continue # skip the initial type:create-vat
        deliverynum = linum - 1
        data = json.loads(line)
        delivery = data["d"]
        syscalls = data["syscalls"]
        # For each non-dropped exported object, record the last delivery
        # which cited it. We'll synthesize drops for those objects immediate
        # after that delivery.

        dtype = delivery[0]
        if dtype == "message":
            target = delivery[1]
            last_reference[target] = deliverynum
            slots = delivery[2]["args"]["slots"]
            for vref in slots:
                if vref.startswith("o+"):
                    last_reference[vref] = deliverynum
        if dtype == "dropExports":
            for vref in delivery[1]:
                #print("delete", vref)
                if vref.startswith("o+"):
                    del last_reference[vref]

        for s in (sc["d"] for sc in syscalls):
            if s[0] == "send":
                raise Error("vat-mints never sends anything")
            if s[0] == "resolve":
                resolutions = s[1]
                for (vref, rejection, capdata) in resolutions:
                    slots = capdata["slots"]
                    for (index, iface) in find_interfaces(json.loads(capdata["body"])):
                        vref = slots[index]
                        #print("export", vref, iface)
                        interfaces[vref] = iface
                        if vref.startswith("o+"):
                            last_reference[vref] = deliverynum

drop_schedule = defaultdict(list) # deliverynum -> [vrefs]
for vref, deliverynum in last_reference.items():
    drop_schedule[deliverynum].append(vref)
for deliverynum in sorted(drop_schedule):
    vrefs = drop_schedule[deliverynum]
    #print(deliverynum, vrefs)
print(json.dumps(drop_schedule))
