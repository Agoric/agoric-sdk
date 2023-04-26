import sys
from parse_timestamps import parse_file

# Given a slogfile with xsnap timestamps, figure out how much time the
# dispatch.bringOutYourDead deliveries spend in the gc() call. This is
# a decent proxy for the size of the object graph, so a JS-visible
# object leak would cause this number to grow over time. Most of the
# code here is correlating the xsnap timestamps with the
# kernel-recorded ones, so we can exclude the time spent waiting for
# kernel syscalls or manipulating refcounts, and is derived from
# correlate-timestamps.py .

fn = sys.argv[1]
vatID = sys.argv[2] if len(sys.argv) > 2 else None

deliveries = parse_file(fn, vatID)

print("cranknum,deliver_monotime,gc_time")
for d in deliveries:
    if d.vd[0] == "bringOutYourDead":
        # BOYD does the forced GC between receipt of the delivery and
        # the transmission of the first syscall (or the delivery
        # results)
        elapsed = d.firsttime()
        if elapsed is not None:
            print("%d,%.6f,%.6f" % (d.cranknum, d.tx_delivery_monotime, elapsed))
