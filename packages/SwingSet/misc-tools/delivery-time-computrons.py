#
# Given a slogfile on stdin, this emits a CSV that can be used to make
# a horizontal bar chart of deliveries, where the width of each bar is
# either wallclock time or computrons. This can give a sense of which
# deliveries are more expensive than others.

import sys, json
from collections import defaultdict
from itertools import count

from unmarshal import unmarshal_method

# this overlaps with delivery-summary.py a lot, and should probably merge, see
# https://github.com/Agoric/agoric-sdk/pull/10037/files#r1783212225

cranks = [] # (cranknum, wallclock, computrons)
cranknum = None
start = None
summary = None

def summarize_delivery(vatID, kd):
    if kd[0] == "notify":
        return "%s.<notify>" % vatID
    if kd[0] == "message":
        method = unmarshal_method(kd[2]["methargs"])
        return "%s.%s" % (vatID, method)
    return None # ignore BOYD, GC

for line in sys.stdin:
    d = json.loads(line)
    time = d["time"]
    stype = d["type"]
    if stype == "deliver":
        summary = summarize_delivery(d["vatID"], d["kd"])
        cranknum = d["crankNum"]
        start = time
    if stype and cranknum is not None and stype == "deliver-result":
        wallclock = time - start
        computrons = d["dr"][2]["compute"]
        cranks.append((summary, wallclock, computrons))
        cranknum = None

print(",".join([""] + [c[0] for c in cranks]))
print(",".join(["wallclock"] + [str(c[1]) for c in cranks]))
print(",".join(["computrons"] + [str(c[2]) for c in cranks]))
