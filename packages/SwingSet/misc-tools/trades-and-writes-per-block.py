#
# Given a slogfile on stdin, this measures which deliveries happened
# in which blocks, and emits a CSV of (blockHeight, bridges, write-metrics, write-wallet)

import sys, json
from collections import defaultdict

write_metrics = 0
write_wallet = 0
bridges = 0

blocknum = None

print("blocknum,bridges,write-metrics,write-wallet")

for line in sys.stdin:
    d = json.loads(line)
    time = d["time"]
    stype = d["type"]
    if stype == "syscall" and d["ksc"][0] == "invoke" and d["ksc"][2] == "callOutbound":
        msg = json.loads(d["ksc"][3]["body"])
        if msg[0] == "storage":
            key = msg[1]["key"]
            if key == "published.psm.IST.AUSD.metrics":
                write_metrics += 1
            if key.startswith("published.wallet."):
                write_wallet += 1
    if stype == "cosmic-swingset-bridge-inbound":
        bridges += 1
    if stype == "cosmic-swingset-begin-block":
        blocknum = d["blockHeight"]
    if stype == "cosmic-swingset-end-block-finish":
        print("%d,%d,%d,%d" % (blocknum, bridges, write_metrics, write_wallet))
        bridges = 0
        write_metrics = 0
        write_wallet = 0
