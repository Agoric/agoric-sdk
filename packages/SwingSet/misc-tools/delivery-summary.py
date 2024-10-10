#
# Given a slogfile on stdin, emit a CSV of notify/message deliveries:
#   blockHeight,number,number,...
# in which the header line enumerates vatID.kind deliveries by
# decreasing total footprint, each number is a sum of count (or of
# computrons as requested by the first argument), and blockHeight
# identifies the start of a 100-block batch.
# It may be useful to get a sense of when a chain is doing lots of
# different things, vs. when it settles down into catching up on a
# backlog that consists of lots of  instances of the same thing.

# this overlaps with delivery-time-computrons.py a lot, and should probably
# merge, see https://github.com/Agoric/agoric-sdk/pull/10037/files#r1783212225

import sys, json
from collections import defaultdict
from itertools import count

from unmarshal import unmarshal_method

mode = "count"
if len(sys.argv) > 1:
    mode = sys.argv[1]
assert mode in ["count","computrons"]

# blocks[n] = [blocknum, deliveryTypeCounts]
blocks = []
all_dtypes = defaultdict(int)

blocknum = None
deliveryTypeCounts = None
dtype = None

def name_delivery(vatID, kd):
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
    if stype == "cosmic-swingset-begin-block":
        blocknum = d["blockHeight"]
        deliveryTypeCounts = defaultdict(int)
    if blocknum is not None and stype == "deliver":
        dtype = name_delivery(d["vatID"], d["kd"])
        crankNum = d["crankNum"]
    if dtype and crankNum is not None and stype == "deliver-result":
        crankNum = None
        computrons = d["dr"][2]["compute"]
        increment = 1 if mode == "count" else computrons
        deliveryTypeCounts[dtype] += increment
        all_dtypes[dtype] += increment

    if blocknum is not None and stype == "cosmic-swingset-end-block-finish":
        blocks.append((blocknum, deliveryTypeCounts))

batch_size = 100
if batch_size:
    batched = []
    for start in count(0, batch_size):
        if start > blocks[-1][0]:
            break
        batch = defaultdict(int)
        for (blocknum, deliveryTypeCounts) in blocks[start:start+batch_size]:
            for (dtype,value) in deliveryTypeCounts.items():
                batch[dtype] += value
        batched.append((start, batch))
    blocks = batched

# Using Google Sheets to plot this as a column chart: the left-most
# columns get the distinctive colors, so use reverse=True
# (i.e. descending) so the most common deliveries are distinctive.
# Move the legend to the bottom, otherwise only the right-most column
# names will be visible.

dtypes = sorted(all_dtypes, key=lambda t: all_dtypes[t], reverse=True)
print(",".join(["height"] + dtypes))
for (blocknum, deliveries) in blocks:
    print(",".join([str(blocknum)] + [str(deliveries[dtype]) for dtype in dtypes]))
