import sys
import statistics

data = [float(line.strip()) for line in sys.stdin]

def ms(elapsed):
    return int(elapsed * 1e3)
def us(elapsed):
    return int(elapsed * 1e6)

print("count         %6d" % len(data))
#print("median %5.1f ms" % ms(statistics.median(data)))
print("min    %5.1f ms" % ms(min(data)))
q = statistics.quantiles(data, n=100)
for i in [10,20,30,40,50,60,70,80,90,95,99]:
    extra = ""
    if i == 50:
        extra = " (median)"
        print("(mean) %5.1f ms" % ms(statistics.mean(data)))
    print("p%2d    %5.1f ms%s" % (i, ms(q[i-1]), extra))
print("max    %5.1f ms" % ms(max(data)))
