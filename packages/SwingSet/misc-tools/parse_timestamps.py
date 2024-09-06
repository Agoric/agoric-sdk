import sys, json, gzip, re, time

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
            method = json.loads(methargsCD["body"].removeprefix("#"))[0]
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
    def __init__(self, vatID, cranknum, deliverynum, vd, when, monotime, blockheight, blocktime):
        self.vatID = vatID
        self.cranknum = cranknum
        self.deliverynum = deliverynum
        self.blockheight = blockheight
        self.blocktime = blocktime
        self.syscalls = []
        self.consoles = []
        self.events = [] # includes both
        self.tx_delivery = when
        self.tx_delivery_monotime = monotime
        self.rx_delivery = None
        self.tx_result = None
        self.rx_result = None
        self.computrons = None
        self.vd = vd
        if vd[0] == "message":
            target = vd[1]
            msg = vd[2]
            methargsCD = msg["methargs"]
            method = json.loads(methargsCD["body"].removeprefix("#"))[0]
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
    def set_computrons(self, computrons):
        self.computrons = computrons

    def complete(self):
        # figure out total_pipe, total_worker, total_kernel, total (k->k)
        total_pipe = 0
        total_worker = 0
        total_kernel = 0
        if self.rx_delivery:
            # k -> w: sending the delivery
            total_pipe += (self.rx_delivery - self.tx_delivery)
            # else unknown
        prev_event = None
        for event in self.events:
            if not prev_event and self.rx_delivery and event.tx_request:
                # work done after receiving delivery, before first syscall
                total_worker += (event.tx_request - self.rx_delivery)
            if prev_event and prev_event.rx_result and event.tx_request:
                # work done between syscalls
                total_worker += (event.tx_request - prev_event.rx_result)
            prev_event = event
            if event.tx_request and event.rx_result:
                # from sending a syscall to receiving the result, we
                # have pipe send, kernel time, pipe receive
                total_pipe += (event.rx_request - event.tx_request)
                total_kernel += (event.tx_result - event.rx_request)
                total_pipe += (event.rx_result - event.tx_result)
                # else unknown
        if prev_event and self.tx_result:
            # work done after the last syscall, before sending results
            total_worker += (self.tx_result - prev_event.rx_result)
            # else unknown
        if not prev_event and self.tx_result:
            # no syscalls, just worker time
            total_worker += (self.tx_result - self.rx_delivery)
        if self.tx_result:
            # sending results to kernel counts towards pipe time
            total_pipe += (self.rx_result - self.tx_result)
        self.total_pipe = total_pipe
        self.total_worker = total_worker
        self.total_kernel = total_kernel
        self.k_to_k = self.rx_result - self.tx_delivery

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

def stream_file(fn, vatID):
    deliveries = []
    blockheight = None
    blocktime = None
    opener = gzip.open if fn.endswith(".gz") else open
    opener = (lambda fn: sys.stdin) if fn == "-" else opener
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
            if type == "cosmic-swingset-bootstrap-block-start":
                blockheight = 0
                blocktime = data["blockTime"]
            if type == 'cosmic-swingset-begin-block':
                blockheight = data["blockHeight"]
                blocktime = data["blockTime"]
            if type == 'cosmic-swingset-end-block-finish':
                blockheight = None
                blocktime = None
            if data.get("replay") == True:
                continue
            when = data["time"]

            if type == 'deliver':
                cranknum = data["crankNum"]
                deliverynum = data["deliveryNum"]
                monotime = data["monotime"]
                d = Delivery(data.get("vatID"), cranknum, deliverynum, data["vd"], when, monotime, blockheight, blocktime)
                deliveries.append(d)
            if type == "console" and deliveries:
                deliveries[-1].add_console(when)
            if type == 'syscall' and deliveries:
                syscallNum = data['syscallNum']
                deliveries[-1].add_syscall(data['vsc'], syscallNum, when)
            if type == 'syscall-result' and deliveries:
                deliveries[-1].get_syscall(-1).got_result(when)
            if type == 'deliver-result' and deliveries:
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
                if mr and "compute" in dr[2]:
                    deliveries[-1].set_computrons(dr[2]["compute"])
                d.complete()
                yield deliveries[-1]
                deliveries.pop()

def parse_file(fn, vatID):
    return list(stream_file(fn, vatID))
