import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# given a slogfile, display a report of how many syscalls were made
# (indexed by type), and how long each one took

# % python3 ../../syscall-by-type.py block30.slog
# | count | syscall type    | total measured | avg each | #uncor | extrapolated total |
# | ----- | --------------- | -------------- | -------- | ------ | ------------------ |
# |   83x |            send |       69865 us |   841 us |     5x |           74073 us |
# |   88x |         resolve |       57743 us |   656 us |     2x |           59056 us |
# |   21x |         callNow |       53533 us |  2549 us |     0x |           53533 us |
# |  433x |     vatstoreGet |       38175 us |    88 us |   221x |           57659 us |
# |   87x |       subscribe |       32611 us |   374 us |     5x |           34486 us |
# |  255x |     vatstoreSet |       30901 us |   121 us |    56x |           37687 us |
# |   45x |  vatstoreDelete |        4232 us |    94 us |    11x |            5267 us |
# | totals|
# | 1012x |           (all) |      287063 us |   317 us |   300x |          321764 us |

# This block included a delivery which did about 350 syscalls, which
# exceeds the xsnap timestamp buffer (#defined MAX_TIMESTAMPS 100), so
# 300 of them could not be correlated. Those are enumerated in the
# '#uncor' column, and the average of the successfully correlated ones
# are used to extrapolate a total amount of time for each type.

# The block as a whole performed 1012 syscalls, taking an extrapolated
# 321.764 ms. The slowest syscalls were callNow(), i.e. device
# invocations.

class Syscall:
    def __init__(self, vsc, num, rx_request):
        self.num = num
        self.vsc = vsc
        self.tx_request = None
        self.rx_request = rx_request
        self.tx_result = None
        self.rx_result = None
        if vsc[0] == "send":
            target = vsc[1]
            msg = vsc[2]
            methargsCD = msg["methargs"]
            method = json.loads(methargsCD["body"])[0]
            result = msg.get("result")
            self.description = "(%s).%s -> %s" % (target, method, result)
        elif vsc[0] == "callNow":
            target = vsc[1]
            method = vsc[2]
            self.description = "D(%s).%s" % (target, method)
        elif vsc[0] == "subscribe":
            vpid = vsc[1]
            self.description = "subscribe(%s)" % vpid
        elif vsc[0] == "resolve":
            vpid_strings = []
            for [vpid, reject, data] in vsc[1]:
                r = "!" if reject else ""
                vpid_strings.append(r + vpid)
            self.description = "resolve %s" % ",".join(vpid_strings)
        elif vsc[0] in ["dropImports", "retireImports", "retireExports"]:
            self.description = "%s(%s)" % (vsc[0], ",".join(vsc[1]))
        else:
            self.description = vsc[0]
    def got_result(self, when):
        self.tx_result = when
    def set_tx_request(self, when):
        self.tx_request = when
    def set_rx_result(self, when):
        self.rx_result = when

class Delivery:
    def __init__(self, cranknum, vd, when):
        self.cranknum = cranknum
        self.syscalls = []
        self.tx_delivery = when
        self.rx_delivery = None
        self.tx_result = None
        self.rx_result = None
        self.vd = vd
        if vd[0] == "message":
            target = vd[1]
            msg = vd[2]
            methargsCD = msg["methargs"]
            method = json.loads(methargsCD["body"])[0]
            result = msg.get("result")
            self.description = "(%s).%s -> %s" % (target, method, result)
        elif vd[0] == "notify":
            vpid_strings = []
            for [vpid, reject, data] in vd[1]:
                r = "!" if reject else ""
                vpid_strings.append(r + vpid)
            self.description = "notify %s" % ",".join(vpid_strings)
        else:
            self.description = vd[0]
    def add_syscall(self, vsc, when):
        num = len(self.syscalls)
        s = Syscall(vsc, num, when)
        self.syscalls.append(s)
    def num_syscalls(self):
        return len(self.syscalls)
    def get_syscall(self, which):
        return self.syscalls[which]
    def set_rx_result(self, when):
        self.rx_result = when
    def set_rx_delivery(self, when):
        self.rx_delivery = when
    def set_tx_result(self, when):
        self.tx_result = when

fn = sys.argv[1]
vatID = sys.argv[2] if len(sys.argv) > 2 else None

deliveries = []

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
            cranknum = data["crankNum"]
            deliverynum = data["deliveryNum"]
            d = Delivery(cranknum, data["vd"], when)
            deliveries.append(d)
        if type == 'syscall':
            deliveries[-1].add_syscall(data['vsc'], when)
        if type == 'syscall-result':
            deliveries[-1].get_syscall(-1).got_result(when)
        if type == 'deliver-result':
            deliveries[-1].set_rx_result(when)
            dr = data["dr"]
            mr = dr[2]
            if mr and "timestamps" in dr[2]:
                timestamps = mr["timestamps"]
                d = deliveries[-1]
                if len(timestamps):
                    d.set_rx_delivery(timestamps.pop(0))
                for syscallnum in range(d.num_syscalls()):
                    s = d.get_syscall(syscallnum)
                    if len(timestamps):
                        s.set_tx_request(timestamps.pop(0))
                    if len(timestamps):
                        s.set_rx_result(timestamps.pop(0))
                if len(timestamps):
                    d.set_tx_result(timestamps.pop(0))

syscall_types = defaultdict(lambda: (0, 0.0)) # (count, elapsed)
total_syscalls = 0
total_time_correlated = 0.0
uncorrelated_syscalls = defaultdict(lambda: 0)
total_uncorrelated = 0

for d in deliveries:
    for sn in range(d.num_syscalls()):
        s = d.get_syscall(sn)
        stype = s.vsc[0]
        (count, elapsed) = syscall_types[stype]
        count += 1
        total_syscalls += 1
        if s.rx_result and s.tx_request:
            elapsed += s.rx_result - s.tx_request
            total_time_correlated += s.rx_result - s.tx_request
        else:
            uncorrelated_syscalls[stype] += 1
            total_uncorrelated += 1
        syscall_types[stype] = (count, elapsed)


def us(elapsed):
    return int(elapsed * 1e6)

total_measured = 0.0
total_estimated = 0.0

print("| count | syscall type    | total measured | avg each | #uncor | extrapolated total |")
print("| ----- | --------------- | -------------- | -------- | ------ | ------------------ |")
for stype in sorted(syscall_types, key=lambda stype: syscall_types[stype][1], reverse=True):
    (count, elapsed) = syscall_types[stype]
    avg = elapsed / count
    estimated = elapsed
    uncorrelated = uncorrelated_syscalls[stype]
    estimated += uncorrelated * avg
    total_measured += elapsed
    total_estimated += estimated
    print("| %4dx | %15s |  %10s us |  %4s us | %5dx |      %10s us |" %
          (count, stype, us(elapsed), us(avg), uncorrelated, us(estimated)))
print("| totals|")
print("| %4dx | %15s |  %10s us |  %4s us | %5dx |      %10s us |" %
      (total_syscalls, "(all)", us(total_measured), us(total_estimated / total_syscalls), total_uncorrelated, us(total_estimated)))
