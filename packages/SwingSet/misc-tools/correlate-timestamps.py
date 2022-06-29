import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# Point this at a slogfile, and optionally a vatid to filter upon. It
# will produce a report per delivery that breaks out the various times
# spent processing within the worker, piping message to/from the
# kernel process, and waiting for the kernel to respond to syscalls.

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

fill = "                         "
prev_d = None
for d in deliveries:
    total_worker = 0
    total_kernel = 0
    total_pipe = 0
    if prev_d:
        kerneltime = d.tx_delivery - prev_d.rx_result
        print("                                          %.6f kern between-cranks" % kerneltime)
    prev_d = d
    print("c%d %s" % (d.cranknum, d.description))
    if d.rx_delivery:
        print("                                                          k -> %.6f -> w   (send delivery)" % (d.rx_delivery - d.tx_delivery))
        #d.tx_result - d.rx_delivery,
        total_pipe += (d.rx_delivery - d.tx_delivery)
    else:
        print("                                             k -> w   (send delivery)")
    prev_s = None
    for s in d.syscalls:
        if not prev_s and d.rx_delivery and s.tx_request:
            print("%s%.6f worker" % (fill, s.tx_request - d.rx_delivery))
            total_worker += (s.tx_request - d.rx_delivery)
        if prev_s and prev_s.rx_result and s.tx_request:
            print("%s%.6f worker" % (fill, s.tx_request - prev_s.rx_result))
            total_worker += (s.tx_request - prev_s.rx_result)
        prev_s = s
        if s.tx_request and s.rx_result:
            print("   w -> %.6f -> k,                    %.6f kern,  k -> %.6f -> w : %s" % (
                s.rx_request - s.tx_request,
                s.tx_result - s.rx_request,
                s.rx_result - s.tx_result,
                s.description))
            total_pipe += (s.rx_request - s.tx_request)
            total_kernel += (s.tx_result - s.rx_request)
            total_pipe += (s.rx_result - s.tx_result)
        else:
            print("  w -> k,                    %.6f kern,  k -> w : %s" % (
                s.tx_result - s.rx_request,
                s.description))
    if prev_s and d.tx_result:
        print("%s%.6f worker" % (fill, d.tx_result - prev_s.rx_result))
        total_worker += (d.tx_result - prev_s.rx_result)
    if not prev_s and d.tx_result:
        print("%s%.6f worker" % (fill, d.tx_result - d.rx_delivery))
        total_worker += (d.tx_result - d.rx_delivery)
    if d.tx_result:
        print("   w -> %.6f -> k                                                          (return result)" % (d.rx_result - d.tx_result))
        total_pipe += (d.rx_result - d.tx_result)
    else:
        print("  w -> k                                              (return result)")
    k_to_k = d.rx_result - d.tx_delivery
    if d.tx_result:
        print("   pipe %.6f, worker %.6f, kernel %.6f    total  (k->k %.6f)" % (
            total_pipe, total_worker, total_kernel, k_to_k))
    else:
        print("         total  (k->k %.6f)" % k_to_k)
