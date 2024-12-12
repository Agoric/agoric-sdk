import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

from unmarshal import unmarshal_method

# Given a slogfile argument and optional vatID, report for each method name (or
# the special name "(notify)" for notifies) the total count of deliveries,
# total computrons, total duration, and mean duration for that method's
# deliveries (limited to those inbound to the vatID if specified), sorted by
# decreasing count.

fn = sys.argv[1]
vatID = sys.argv[2] if len(sys.argv) > 2 else None

start = None
method = None
deliveries = defaultdict(lambda: (0, 0.0, 0)) # of (count, elapsed, computrons)
total_deliveries = 0
total_time = 0.0
total_computrons = 0

opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        if not line.strip():
            continue

        data = json.loads(line.strip())
        if vatID and data.get("vatID") != vatID:
            continue
        type = data["type"]
        when = data["time"]

        if type == 'deliver':
            vd = data["vd"]
            if vd[0] == "message":
                target = vd[1]
                msg = vd[2]
                method = unmarshal_method(msg["methargs"])
                result = msg["result"]
                start = when
            elif vd[0] == "notify":
                method = "(notify)"
                start = when
        if type == 'deliver-result':
            if start is not None:
                elapsed = when - start
                computrons = data["dr"][2]["compute"]
                (old_count, old_elapsed, old_computrons) = deliveries[method]
                new_count = old_count + 1
                new_elapsed = old_elapsed + elapsed
                total_time += elapsed
                new_computrons = old_computrons + computrons
                total_computrons += computrons
                deliveries[method] = (new_count, new_elapsed, new_computrons)
                total_deliveries += 1
                start = None
                method = None


print("| count | method                         | total computrons | total secs | avg secs |")
print("| ----- | ------------------------------ | ---------------- | ---------- | -------- |")
for method in sorted(deliveries, key=lambda method: deliveries[method][1], reverse=True):
    (count, elapsed, computrons) = deliveries[method]
    avg = elapsed / count
    f = "| {:5d} | {:>30} | {:>16_d} | {:>10.3f} | {:>8.3f} |"
    print(f.format(count, method, computrons, elapsed, avg))
print("total: {:_d} deliveries, {:2.3f} s, {:_d} computrons".format(total_deliveries, total_time, total_computrons))
