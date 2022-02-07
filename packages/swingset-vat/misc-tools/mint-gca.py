#!/usr/bin/env python3
import sys, json, time, hashlib, base64
from collections import defaultdict

# vat-mint (v5) .getCurrentAmount is a really simple method: it looks up a
# Presence in a WeakMap, and returns the value. The only syscall it makes is
# the resolve. There are four timestamps of interest:
# A: delivery sent from kernel
# B: resolve syscall received by kernel
# C: resolve syscall result sent by kernel
# D: delivery result received by kernel
#
# A-B includes delivery marshalling, early vat processing (including WeakMap
#     lookup), syscall.resolve marshalling
# B-C records the kernel time spent updating the promise table and queueing
#     notify() events
# C-D includes syscall result marshalling, end-of-crank GC processing

# For a first pass, we record the three deltas and the deliveryNum

deliveryNums = [] # deliveryNum
deliveries = {} # deliveryNum: { AB, BC, CD, computrons }
last_delivery = None
num_syscalls = None
syscall_start = None
syscall_type = None
syscall_times = defaultdict(list)

for line in sys.stdin:
    data = json.loads(line)
    if data.get("vatID", None) != "v5":
        continue
    if data["type"] == "deliver":
        last_delivery = None
        if data["kd"][0] == "message" and data["kd"][2]["method"] == "getCurrentAmount":
            delivery_start = data["time"]
            last_delivery = data["deliveryNum"]
            deliveryNums.append(last_delivery)
            deliveries[last_delivery] = {}
            num_syscalls = 0
    if last_delivery is None:
        continue
    if data["type"] == "syscall":
        num_syscalls += 1
        assert num_syscalls == 1
        syscall_type = data["ksc"][0]
        assert syscall_type == "resolve"
        syscall_start = data["time"]
        resolutions = data["ksc"][2]
        count = len(resolutions)
        assert count == 1
        rejected = resolutions[0][1]
        assert not rejected
    if data["type"] == "syscall-result":
        syscall_finish = data["time"]
    if data["type"] == "deliver-result":
        computrons = data["dr"][2]["compute"]
        delivery_finish = data["time"]
        AB = syscall_start - delivery_start
        BC = syscall_finish - syscall_start
        CD = delivery_finish - syscall_finish
        elapsed = delivery_finish - delivery_start
        d = deliveries[last_delivery]
        d["AB"] = AB
        d["BC"] = BC
        d["CD"] = CD
        d["elapsed"] = elapsed
        d["computrons"] = computrons
        # print milliseconds
        print("%6d %8dc  %1.2f  %1.2f  %1.2f  = %1.2f" % (
            last_delivery,
            d["computrons"],
            1000*d["AB"], 1000*d["BC"], 1000*d["CD"], 1000*d["elapsed"],
        ))


if 0:
    for deliveryNum in deliveryNum:
        d = deliveries[deliveryNum]
        print("%6d %8dc %.6f %.6f $.6f = $.6f" % (
            deliveryNum,
            d["computrons"],
            d["AB"], d["BC"], d["CD"], d["elapsed"],
        ))
