#!/usr/bin/env python3
import sys, json, time, hashlib, base64
from collections import defaultdict

# track the ratio of delivery computrons and wallclock to the number of
# inbound messages being delivered

cranks = [] # crankNum
deliveries = {} # crankNum: { deliveryNum, message_count, computrons, elapsed }
last_crank = None
num_syscalls = None
syscall_start = None
syscall_type = None
syscall_times = defaultdict(list)

for line in sys.stdin:
    data = json.loads(line)
    if data.get("vatID", None) != "v14":
        continue
    if data["type"] == "deliver" and data["kd"][0] == "message" and data["vd"][1] == "o+0" and data["kd"][2]["method"] == "deliverInboundMessages":
        start = data["time"]
        last_crank = data["crankNum"]
        cranks.append(last_crank)
        body = json.loads(data["kd"][2]["args"]["body"])
        addr = body[0]
        message_count = len(body[1])
        deliveries[last_crank] = {
            "message_count": message_count,
            "deliveryNum": data["deliveryNum"],
            "addr": addr,
            }
        num_syscalls = 0
        syscall_start = None
    if data["type"] == "syscall":
        num_syscalls = data["syscallNum"] + 1
        # deliverInboundMessages does one ( ~.receive() , subscribe, invoke(ackInbound) ) per non-dup
        syscall_type = data["ksc"][0]
        syscall_start = data["time"]
    if data["type"] == "syscall-result" and syscall_start is not None:
        syscall_elapsed = data["time"] - syscall_start
        syscall_times[syscall_type].append(syscall_elapsed)
    if data["type"] == "deliver-result" and data["crankNum"] == last_crank:
        computrons = data["dr"][2]["compute"]
        finish = data["time"]
        elapsed = finish - start
        d = deliveries[last_crank]
        d["computrons"] = computrons
        d["elapsed"] = elapsed
        d["computron_ratio"] = computrons / d["message_count"]
        d["elapsed_ratio"] = elapsed / d["message_count"]
        d["syscalls"] = num_syscalls
        assert num_syscalls % 3 == 0
        d["nondups"] = num_syscalls / 3
        d["nondup_ratio"] = computrons / d["nondups"] if d["nondups"] else 0
        predict = 14015 + 117 * d["message_count"] + 64069 * d["nondups"]
        #assert computrons == predict # differs by a few hundred early in the chain
        d["predict"] = predict
        print


for crankNum in sorted(cranks, key=lambda crankNum: deliveries[crankNum]["message_count"]):
    d = deliveries[crankNum]
    clocksc = ("%6.6f" % (d["elapsed"] / d["syscalls"])) if d["syscalls"] else ""
    print("%6d [%2dm] %8dc %3ds / %6d %6.6f  %s  %6d  %8dcp %8s" % (
        crankNum, d["message_count"],
        d["computrons"], d["syscalls"],
        d["computron_ratio"], d["elapsed_ratio"], d["addr"], d["nondup_ratio"],
        d["predict"] - d["computrons"], clocksc,
    ))

for syscall_type in sorted(syscall_times):
    total = sum(syscall_times[syscall_type])
    avg = total / len(syscall_times[syscall_type])
    print("%10s: avg=%.6f  total=%2.6f" % (syscall_type, avg, total))
