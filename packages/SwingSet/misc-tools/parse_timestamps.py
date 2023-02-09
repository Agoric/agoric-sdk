import json, gzip, re, time

# Library for use by correlate_timestamps.py and friends, to extract
# and correlate timestamps. Returns a list of Deliveries, each with
# Syscall and Console events, all with tx/rx timestamps.

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

    def elapsed(self):
        if self.tx_request and self.rx_result:
            return self.rx_result - self.tx_request
        return None
    def pipetime(self):
        if (self.tx_request and self.rx_request
            and self.tx_result and self.rx_result):
            return ((self.rx_request - self.tx_request)
                    +(self.rx_result - self.tx_result))
        return None
    def kerneltime(self):
        if self.rx_request and self.tx_result:
            return self.tx_result - self.rx_request
        return None

class Console:
    def __init__(self, rx_request):
        self.tx_request = None
        self.rx_request = rx_request
        # console events have only one kernel-side timestamp
        self.tx_result = rx_request
        self.rx_result = None
        self.description = "console"
    def set_tx_request(self, when):
        self.tx_request = when
    def set_rx_result(self, when):
        self.rx_result = when

    def elapsed(self):
        if self.tx_request and self.rx_result:
            return self.rx_result - self.tx_request
        return None
    def pipetime(self):
        if (self.tx_request and self.rx_request
            and self.tx_result and self.rx_result):
            return ((self.rx_request - self.tx_request)
                    +(self.rx_result - self.tx_result))
        return None
    def kerneltime(self):
        return 0

class Delivery:
    def __init__(self, vatID, cranknum, vd, when, monotime):
        self.vatID = vatID
        self.cranknum = cranknum
        self.syscalls = []
        self.consoles = []
        self.events = [] # includes both
        self.tx_delivery = when
        self.tx_delivery_monotime = monotime
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
    def add_syscall(self, vsc, syscallNum, when):
        s = Syscall(vsc, syscallNum, when)
        self.syscalls.append(s)
        self.events.append(s)
    def add_console(self, when):
        c = Console(when)
        self.consoles.append(c)
        self.events.append(c)
    def num_syscalls(self):
        return len(self.syscalls)
    def get_event(self, which):
        return self.events[which]
    def get_syscall(self, which):
        return self.syscalls[which]
    def set_rx_result(self, when):
        self.rx_result = when
    def set_rx_delivery(self, when):
        self.rx_delivery = when
    def set_tx_result(self, when):
        self.tx_result = when

    def firsttime(self):
        # time between receipt of delivery and (first syscall) or (results)
        if self.rx_delivery:
            if self.events:
                return self.events[0].tx_request - self.rx_delivery
            return self.tx_result - self.rx_delivery
        return None

    def pipetime(self):
        # just the k->delivery->w and w->result->k part
        if (self.tx_delivery and self.rx_delivery
            and self.tx_result and self.rx_result):
            return ((self.rx_delivery - self.tx_delivery)
                    +(self.rx_result - self.tx_result))
        return None

def parse_file(fn, vatID):
    deliveries = []
    opener = gzip.open if fn.endswith(".gz") else open
    with opener(fn) as f:
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
                cranknum = data["crankNum"]
                deliverynum = data["deliveryNum"]
                monotime = data["monotime"]
                d = Delivery(data.get("vatID"), cranknum, data["vd"], when, monotime)
                deliveries.append(d)
            if type == "console":
                deliveries[-1].add_console(when)
            if type == 'syscall':
                syscallNum = data['syscallNum']
                deliveries[-1].add_syscall(data['vsc'], syscallNum, when)
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
                        #if len(timestamps) != 1 + 2*len(d.events) + 1:
                        #    print("timestamp overflow on c%d" % d.cranknum)
                        d.set_rx_delivery(timestamps.pop(0))
                    for event in d.events:
                        if len(timestamps):
                            event.set_tx_request(timestamps.pop(0))
                        if len(timestamps):
                            event.set_rx_result(timestamps.pop(0))
                    if len(timestamps):
                        d.set_tx_result(timestamps.pop(0))
    return deliveries
