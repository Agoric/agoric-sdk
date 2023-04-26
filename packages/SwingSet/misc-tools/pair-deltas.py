#
# given a set of jsonlines on stdin with 'time' properties, and a pair
# of 'type' names A and B, measure the time delta between each A-B
# pair and display statistics

import sys, json, statistics

nameA = sys.argv[1]
nameB = sys.argv[2]

lastA = None

deltas = []

for line in sys.stdin:
    d = json.loads(line)
    time = d["time"]
    dtype = d["type"]
    if dtype == nameA:
        lastA = time
    if lastA is not None and dtype == nameB:
        deltas.append(time - lastA)
        lastA = None

def us(elapsed):
    return int(elapsed * 1e6)

print("count         %6d   %s -> %s deltas" % (len(deltas), nameA, nameB))
print("mean   %10d us" % us(statistics.mean(deltas)))
print("median %10d us" % us(statistics.median(deltas)))
q = statistics.quantiles(deltas, n=10)
print("p90    %10d us" % us(q[-1]))
# not sure I'm holding this right
#print("p100   %10d us" % us(q[-1]))
print("max    %10d us" % us(max(deltas)))
print("sum    %10d us" % us(sum(deltas)))
