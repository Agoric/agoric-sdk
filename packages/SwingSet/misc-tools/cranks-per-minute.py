import sys, gzip, json
from collections import defaultdict

# Given a slogfile, emit a CSV of cranks performed in each minute, to
# look for slowdowns over time

fn = sys.argv[1]
minutes = defaultdict(int)
def minof(s): # round to start of nearest minute
    return 60 * int(s / 60)

opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for lino,line in enumerate(f):
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        data = json.loads(line.strip())
        if data.get("replay"):
            continue
        if data["type"] == "deliver":
            minutes[minof(data["time"])] += 1
            #print(minof(data["time"]))
        #if len(minutes) > 10:
        #    break

for time in sorted(minutes):
    print("%d,%d" % (time, minutes[time]))
