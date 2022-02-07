#!/usr/bin/env python3

# goal: of the 6230 objects exported by v5 (vat-mints), how many are Purses vs Payments vs other?

import sys, json, time, hashlib, base64
from collections import defaultdict

exports = {} # kref -> type
double_spent = set()
unspent = set() # kref
died_unspent = {}

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


for line in sys.stdin:
    data = json.loads(line)
    if data.get("vatID", None) != "v5":
        continue
    if data["type"] == "syscall":
        if data["ksc"][0] == "send":
            raise Error("vat-mints never exports anything")
        if data["ksc"][0] == "resolve":
            resolutions = data["ksc"][2]
            for (kref, rejection, capdata) in resolutions:
                slots = capdata["slots"]
                for (index, iface) in find_interfaces(json.loads(capdata["body"])):
                    kref = slots[index]
                    #print("export", kref, iface)
                    exports[kref] = iface
                    unspent.add(kref)

    if data["type"] == "deliver":
        if data["kd"][0] == "message" and data["kd"][2]["method"] in ["deposit", "burn"]:
            kref = data["kd"][2]["args"]["slots"][0]
            if kref not in unspent:
                double_spent.add(kref)
            unspent.discard(kref)
        if data["kd"][0] == "dropExports":
            for kref in data["kd"][1]:
                #print("delete", kref)
                if kref in unspent:
                    print("died unspent:", kref)
                    died_unspent[kref] = exports[kref]
                    unspent.remove(kref)
                del exports[kref]

counts = defaultdict(int)
for kref in sorted(exports):
    iface = exports[kref].removeprefix("Alleged: ")
    counts[iface] += 1
    #print(kref, exports[kref])
for iface in sorted(counts):
    print("%20s : %4d" % (iface, counts[iface]))
print("total:", sum(counts.values()))

print("live unspent:", len(unspent))
counts = defaultdict(int)
for kref in unspent:
    iface = exports[kref].removeprefix("Alleged: ")
    counts[iface] += 1
for iface in sorted(counts):
    print(" %20s : %4d" % (iface, counts[iface]))

print("died unspent:", len(died_unspent))
counts = defaultdict(int)
for kref,iface in died_unspent.items():
    iface = iface.removeprefix("Alleged: ")
    counts[iface] += 1
for iface in sorted(counts):
    print(" %20s : %4d" % (iface, counts[iface]))
print("double spent:", len(double_spent))

