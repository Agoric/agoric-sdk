#
# Given a slogfile on stdin, find the block and cranknums of the
# smart-wallet account provisioning events

import sys, json
from collections import defaultdict
from itertools import count

targetVatID = "v1" # vat-bootstrap
targetKref = "ko26"
blockNum = None
crankNum = None
blockTime = None


print("blockNum,crankNum,blockTime")
#print("crankNum,deliveryNum,elapsed,computrons,follower restart,provision")

for line in sys.stdin:
    d = json.loads(line)
    stype = d["type"]
    if stype == "cosmic-swingset-begin-block":
        blockNum = d["blockHeight"]
        blockTime = d["blockTime"]
    if stype == "deliver" and not d["replay"]:
        vatID = d["vatID"]
        kd = d["kd"]
        #print(line)
        #print(vatID, kd[0], kd[1])
        if vatID == targetVatID and kd[0] == "message" and kd[1] == targetKref:
            body = json.loads(kd[2]["methargs"]["body"])
            method = body[0]
            if method == "inbound":
                source = body[1][0]
                if source == "provision":
                    crankNum = d["crankNum"]
                    print("%s,%s,%s" % (blockNum, crankNum, blockTime))
                    #print("%s,,,,,0" % crankNum)

