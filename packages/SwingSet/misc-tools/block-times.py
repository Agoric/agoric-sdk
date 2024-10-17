#
# Given a slogfile on stdin, emit a CSV for every end-block:
#   height,start,lag,swingset,deliveries,computrons,bridge_inbounds,consensus_time,block_time
# "lag" is the duration between begin-block `blockTime` and `time`, "swingset"
# is the duration of end-block, "deliveries" and "computrons" and
# "bridge_inbounds" are counts, "consensus_time" is the duration from
# after-commit-block to the next begin-block, "block_time" is the duration
# between consecutive begin-blocks, and all durations are in seconds.

import sys, json, statistics

print("height,start,lag,swingset,deliveries,computrons,bridge_inbounds,consensus_time,block_time")

lag = None # time - blockTime, how far was the node behind
start = None # latest cosmic-swingset-end-block-start time
last_after_commit_block = None
last_begin_block = None
deliveries = 0
computrons = 0
bridge_inbounds = 0
consensus_time = 0
block_time = 0

for line in sys.stdin:
    d = json.loads(line)
    time = d["time"]
    dtype = d["type"]
    if dtype == "cosmic-swingset-begin-block":
        if last_begin_block is not None:
            block_time = time - last_begin_block
        last_begin_block = time
        lag = d["time"] - d["blockTime"]
    if dtype == "cosmic-swingset-bridge-inbound":
        bridge_inbounds += 1
    if dtype == "cosmic-swingset-end-block-start":
        start = time
    if dtype == "cosmic-swingset-after-commit-block":
        last_after_commit_block = time
    if dtype == "cosmic-swingset-begin-block" and last_after_commit_block is not None:
        consensus_time = time - last_after_commit_block
    if start is not None and dtype == "deliver-result":
        deliveries += 1
        if d["dr"][2] and "compute" in d["dr"][2]:
            computrons += d["dr"][2]["compute"]
    if start is not None and dtype == "cosmic-swingset-end-block-finish":
        height = d["blockHeight"]
        swingset = time - start # end-block-start to end-block-finish
        print("%d,%f,%f,%f,%d,%d,%d,%f,%f" % (height, start, lag, swingset, deliveries,
                                              computrons, bridge_inbounds,
                                              consensus_time, block_time))
        start = None
        deliveries = 0
        computrons = 0
        bridge_inbounds = 0
