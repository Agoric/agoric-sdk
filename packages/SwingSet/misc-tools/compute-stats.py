import sys
import statistics

data = [float(line.strip()) for line in sys.stdin]

as_ms = False

if len(sys.argv) > 1:
    if sys.argv[1] == "--ms":
        as_ms = True
def ms(elapsed):
    return int(elapsed * 1e3)
def us(elapsed):
    return int(elapsed * 1e6)

print("count         %6d" % len(data))
#print("median %5.1f ms" % ms(statistics.median(data)))
def show(name, number, extra=""):
    if as_ms:
        print("%6s %5.1f ms%s" % (name, ms(number), extra))
    else:
        print("%6s %5d%s" % (name, number, extra))

show("min", min(data))
q = statistics.quantiles(data, n=100)
# TODO: the p99 value doesn't make sense, it's larger than max()
for i in [10,20,30,40,50,60,70,80,90,95,99]:
    extra = ""
    if i == 50:
        show("(mean)", statistics.mean(data))
        extra = " (median)"
    show("p%2d" % i, q[i-1], extra)
show("max", max(data))
