import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# Given a slogfile, for each method name, report the number of times
# that message was delivered into a vat, the total time spent on those
# kinds of deliveries, and the average time per delivery.

fn = sys.argv[1]
vatID = sys.argv[2] if len(sys.argv) > 2 else None

start = None
method = None
deliveries = defaultdict(lambda: (0, 0.0)) # of (count, elapsed)
total = 0.0

opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        if not line.strip():
            continue

        data = json.loads(line.strip())
        if vatID and data["vatID"] != vat:
            continue
        type = data["type"]
        when = data["time"]

        if type == 'deliver':
            vd = data["vd"]
            if vd[0] == "message":
                target = vd[1]
                msg = vd[2]
                methargsCD = msg["methargs"]
                result = msg["result"]
                method = json.loads(methargsCD["body"])[0]
                start = when
            elif vd[0] == "notify":
                method = "(notify)"
                start = when
        if type == 'deliver-result':
            if start is not None:
                elapsed = when - start
                (old_count, old_elapsed) = deliveries[method]
                new_count = old_count + 1
                new_elapsed = old_elapsed + elapsed
                total += elapsed
                deliveries[method] = (new_count, new_elapsed)
                start = None
                method = None

print("| count| method                         | total time |  avg each |")
print("| ---- | ------------------------------ | ---------- | --------- |")
for method in sorted(deliveries, key=lambda method: deliveries[method][1], reverse=True):
    (count, elapsed) = deliveries[method]
    avg = elapsed / count
    print("| %3dx | %30s |    %2.3f s |   %.3f s |" % (count, method, elapsed, avg))
print("total: %2.3f s" % total)
