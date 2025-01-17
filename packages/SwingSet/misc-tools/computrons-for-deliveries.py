import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# Given a slogfile argument, emit a CSV for every matching delivery:
#   crankNum,computrons
# If the delivery is supposed to take constant time, this might reveal
# JS-level growth (e.g. `serialize()`  taking longer because the data it
# is working with is growing).

# These match criteria can be changed by hand:
vatID = "v7"
ko = None # "ko258"
method = "serialize"

print("crankNum,computrons")

crankNum = None

opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        if not line.strip():
            continue

        data = json.loads(line.strip())
        type = data["type"]
        when = data["time"]

        if type == 'deliver':
            if vatID and data["vatID"] != vatID:
                continue
            kd = data["kd"]
            if kd[0] == "message":
                target = kd[1]
                if ko and target != ko:
                    continue
                msg = kd[2]
                methargsCD = msg["methargs"]
                result = msg["result"]
                if method and method != json.loads(methargsCD["body"])[0]:
                    continue
                crankNum = data["crankNum"] # want this one
            #elif kd[0] == "notify":
            #    method = "(notify)"
            #    start = when
        if crankNum is not None and type == 'deliver-result' and data["crankNum"] == crankNum:
            computrons = data["dr"][2]["compute"]
            print("%d,%d" % (crankNum,computrons))
            crankNum = None

