from collections import defaultdict
import sys

# feed this the stdout of classify-runs.py, to display a table of historical
# time/computron consumption statistics

def make_type():
    return {
        "count": 0,
        "computronses": [],
        "elapsedses": [],
        "ns_per_computronses": [],
        }
type_counts = defaultdict(make_type)

for line in sys.stdin:
    type, run_id, computrons, elapsed = line.split(",")
    t = type_counts[type]
    t["count"] += 1
    t["computronses"].append(float(computrons))
    t["elapsedses"].append(float(elapsed))
    if int(computrons):
        t["ns_per_computronses"].append(1e9 * float(elapsed) / float(computrons))


counts = [[kv[1]["count"], kv[0]] for kv in type_counts.items()]
counts.sort(reverse=True)
types = [kv[1] for kv in counts]
total = sum([t["count"] for t in type_counts.values()])

def percentile(values, p):
    return sorted(values)[int((p/100.0)*len(values))]

def stats(values):
    s = {
        "mean": sum(values) / len(values),
        "p50": percentile(values, 50),
        "p90": percentile(values, 90),
        "p95": percentile(values, 95),
        }
    return s
    #print(" %s: mean/50/90/95 = %.3f / %.3f / %.3f / %.3f" % (name, mean, p50, p90, p95))

print("elapsed:")
print("| type | count | mean | median | 90pct |")
print("|------+-------+------+--------+-------|")
datas = []
for name in types:
    type = type_counts[name]
    s = stats(type["elapsedses"])
    data = (name, type["count"], s["mean"], s["p50"], s["p90"])
    datas.append(data)
datas.sort(key=lambda data: data[2], reverse=True)
for data in datas:
    print("| {:s} | {:d} | {:.3f} | {:.3f} | {:.3f} |".format(*data))
print()

print("computrons:")
print("| type | count | mean | median | 90pct |")
print("|------+-------+------+--------+-------|")
datas = []
for name in types:
    type = type_counts[name]
    s = stats(type["computronses"])
    data = (name, type["count"], int(s["mean"]), int(s["p50"]), int(s["p90"]))
    datas.append(data)
datas.sort(key=lambda data: data[2], reverse=True)
for data in datas:
    print("| {:s} | {:,d} | {:,d} | {:,d} | {:,d} |".format(*data))
print()

print("ns/computron:")
print("| type | count | mean | median | 90pct |")
print("|------+-------+------+--------+-------|")
datas = []
for name in types:
    type = type_counts[name]
    s = stats(type["ns_per_computronses"])
    data = (name, type["count"], s["mean"], s["p50"], s["p90"])
    datas.append(data)
datas.sort(key=lambda data: data[2], reverse=True)
for data in datas:
    print("| {:s} | {:d} | {:3f} | {:3f} | {:3f} |".format(*data))
print()
print(total, "total")
