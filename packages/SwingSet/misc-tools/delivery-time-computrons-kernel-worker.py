#
# Given a slogfile argument and optional vatID, emit a CSV of every
# non-replay delivery (including BOYD and GC actions) or non-replay
# delivery to that vat, with their wallclock time, computrons (if any),
# and how much wallclock time was spent in the worker vs. in the kernel
# (syscalls).
# This can be turned into a scatter chart which might show trends like
# organic GC taking longer over time.

import sys
from parse_timestamps import stream_file

fn = sys.argv[1]
vatID = sys.argv[2]

print("blockHeight,blockTime,tx_delivery,crankNum,deliveryNum,total,worker,kernel,pipe,computrons")
for d in stream_file(fn, vatID):
    print("%s,%s,%s,%s,%s,%s,%s,%s,%s,%s" % (d.blockheight, d.blocktime, d.tx_delivery,
                                    d.cranknum, d.deliverynum,
                                    d.k_to_k, d.total_worker, d.total_kernel, d.total_pipe,
                                    d.computrons or 0))

