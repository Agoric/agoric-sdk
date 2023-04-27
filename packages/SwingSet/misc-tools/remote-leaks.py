import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# point this at a slogfile and it will scan the inbound/outbound comms
# messages, emitting a report on all objects/promises that are still
# outstanding by the end of the log


# incidentally, here's a snippet to extract the comms messages for a
# single remote, if you know ko716 is the "receiver" object on
# v3-comms, and ko676 is the "transmitter" object on v4-vattp:
#
# gzcat slogfile.slog.gz |jq -c --raw-output 'select(.type=="deliver" and .vatID=="v3" and .kd[0]=="message" and .kd[1]=="ko716") | .kd[2].methargs.body|fromjson|.[1]|.[0]' >rx-ko716
# gzcat slogfile.slog.gz |jq -c --raw-output 'select(.type=="deliver" and .vatID=="v4" and .kd[0]=="message" and .kd[1]=="ko676") | .kd[2].methargs.body|fromjson|.[1]|.[0]' >tx-ko676

def extract(kd):
    methargs = kd[2]["methargs"]
    (method, args) = json.loads(methargs["body"])
    return method, args, methargs["slots"]

def parse_remote(payload):
    (seq1, seq2, rest) = payload.split(":", 2)
    messages = []
    for msg in rest.split("\n"):
        target = None
        result = None
        header = msg.split(";", 1)[0] # ignore body for now
        p = header.split(":")
        action = p[0]
        if action == "deliver":
            target = p[1]
            mode = None
            result = p[2] if p[2] else None # maybe empty string
            slots = p[3:]
        if action == "resolve":
            mode = p[1] # 'fulfill' or 'reject'
            target = p[2]
            slots = p[3:]
        if action == "gc":
            mode = p[1] # 'dropExport' or 'retireExport' or 'retireImport'
            slots = p[2:]
        #print (action, mode, target, result, slots)
        messages.append((action, mode, target, result, slots))
    return messages

def polarity(rref):
    return rref[2]

def flip(rref):
    if rref[2] == "+":
        return rref[:2] + "-" + rref[3:]
    elif rref[2] == "-":
        return rref[:2] + "+" + rref[3:]
    else:
        raise Error("bad rref '%s'" % rref)

REACHABLE = "reachable"
RECOGNIZABLE = "recognizable"

class Remote:
    def __init__(self, remote, tx_kref):
        self.remote = remote
        self.tx_kref_vattp = tx_kref
        self.exports = {} # ro+N, all are mine
        self.imports = {} # ro-N, all are theirs, arrives in rx deliver/resolve
    def set_rx_kref_comms(self, rx_kref_comms):
        self.rx_kref_comms = rx_kref_comms
    def print(self):
        print(self.remote, self.tx_kref_vattp, self.rx_kref_comms)

    def rx(self, payload):
        #print("rx payload", payload.replace("\n", " \n"))
        for (action, mode, target, result, slots) in parse_remote(payload):
            # they are polite, so 'slots' contains our-format rrefs
            if action in ("deliver", "resolve"):
                allslots = slots[:]
                if result:
                    allslots.append(result)
                for my_rref in allslots:
                    if polarity(my_rref) == "-": # import
                        if my_rref not in self.imports:
                            self.imports[my_rref] = [REACHABLE, payload]
                    if polarity(my_rref) == "+": # must be one of our exports
                        assert my_rref in self.exports, "fake export %s" % my_rref
            if action == "resolve": # assumer we're the decider
                my_rref = target
                if my_rref in self.exports:
                    del self.exports[my_rref]
                if my_rref in self.imports:
                    del self.imports[my_rref]
            if action == "gc":
                if mode == "dropExport":
                    for my_rref in slots:
                        assert my_rref in self.exports
                        assert self.exports[my_rref][0] == REACHABLE
                        self.exports[my_rref][0] = RECOGNIZABLE
                if mode == "retireExport":
                    for my_rref in slots:
                        assert my_rref in self.exports
                        assert self.exports[my_rref][0] == RECOGNIZABLE
                        del self.exports[my_rref]
                if mode == "retireImport":
                    for my_rref in slots:
                        assert my_rref in self.imports
                        assert self.imports[my_rref][0] == RECOGNIZABLE
                        del self.imports[my_rref]

    def tx(self, payload):
        #print("tx payload", payload.replace("\n", " \n"))
        for (action, mode, target, result, slots) in parse_remote(payload):
            # we are polite, so we sent their-format refs, and must flip to our-format
            if action in ("deliver", "resolve"):
                allslots = slots[:]
                if result:
                    allslots.append(result)
                for their_rref in allslots:
                    my_rref = flip(their_rref)
                    if polarity(my_rref) == "-": # must be one of our imports
                        assert my_rref in self.imports, "fake import %s" % my_rref
                    if polarity(my_rref) == "+": # export
                        if my_rref in self.exports:
                            self.exports[my_rref][0] = REACHABLE # maybe only RECOGNIZABLE before
                        else:
                            self.exports[my_rref] = [REACHABLE, payload] # new
            if action == "resolve": # assumer we're the decider
                my_rref = flip(target)
                if my_rref in self.exports:
                    del self.exports[my_rref]
                if my_rref in self.imports:
                    del self.imports[my_rref]
            if action == "gc":
                if mode == "dropExport":
                    for their_rref in slots:
                        my_rref = flip(their_rref)
                        assert my_rref in self.imports
                        assert self.imports[my_rref][0] == REACHABLE
                        self.imports[my_rref][0] = RECOGNIZABLE
                if mode == "retireExport":
                    for their_rref in slots:
                        my_rref = flip(their_rref)
                        assert my_rref in self.imports
                        assert self.imports[my_rref][0] == RECOGNIZABLE
                        del self.imports[my_rref]
                if mode == "retireImport":
                    for their_rref in slots:
                        my_rref = flip(their_rref)
                        assert my_rref in self.exports
                        assert self.exports[my_rref][0] == RECOGNIZABLE
                        del self.exports[my_rref]




comms_vatid = None
vattp_vatid = None
remotes = {} # remote -> Remote
setters = {} # setter kref -> remote
transmitters = {} # tx kref -> remote
receivers = {} # rx kref -> remote

follow = set([
    #"agoric15rz7vcgxegyhdr7crmagkaur56c8rrv4s6py4y",
])

fn = sys.argv[1]
opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        if isinstance(line, bytes):
            line = line.decode("utf-8")
        if not line.strip():
            continue

        data = json.loads(line.strip())
        type = data["type"]
        if type == "create-vat":
            if data["description"].startswith("comms "):
                comms_vatid = data["vatID"]
            if data["description"].startswith("vattp "):
                vattp_vatid = data["vatID"]

        if comms_vatid and type == "deliver" and data["vatID"] == comms_vatid:
            kd = data["kd"]
            if kd[0] == "message":
                target = kd[1]
                (method, args, slots) = extract(kd)
                if method == "addRemote":
                    remote = args[0]
                    assert args[1]["@qclass"] == "slot"
                    assert args[1]["iface"] == "Alleged: transmitter"
                    assert args[1]["index"] == 0
                    tx_kref = slots[0]
                    assert args[2]["@qclass"] == "slot"
                    assert args[2]["iface"] == "Alleged: receiver setter"
                    assert args[2]["index"] == 1
                    setter_kref = slots[1]
                    remotes[remote] = Remote(remote, tx_kref)
                    transmitters[tx_kref] = remote
                    setters[setter_kref] = remote
                    #print("addRemote", remote, tx_kref)
                if target in receivers:
                    remote = receivers[target]
                    payload = args[0]
                    #if remote in follow:
                    #    print("RX", payload.replace("\n", " \n"))
                    remotes[remote].rx(payload)

        if vattp_vatid and type == "deliver" and data["vatID"] == vattp_vatid:
            kd = data["kd"]
            if kd[0] == "message":
                target = kd[1]
                (method, args, slots) = extract(kd)
                if target in setters:
                    remote = setters[target]
                    assert method == "setReceiver"
                    assert args[0]["@qclass"] == "slot"
                    # no iface
                    assert args[0]["index"] == 0
                    rx_kref_comms = slots[0]
                    remotes[remote].set_rx_kref_comms(rx_kref_comms)
                    receivers[rx_kref_comms] = remote
                    #print("SETRECEIVER rx", remote, rx_kref_comms)
                if target in transmitters:
                    remote = transmitters[target]
                    payload = args[0]
                    #if remote in follow:
                    #    print("tx", payload.replace("\n","\n "))
                    remotes[remote].tx(payload)

def rref_sort_key(rref):
    typ = rref[1] # o or p
    polarity = rref[2]
    num = int(rref[3:])
    return (polarity, typ, num)

only_stats = not True

print()
for remote in sorted(remotes):
    r = remotes[remote]
    print("REMOTE %s" % remote)
    import_objects = 0
    import_promises = 0
    lines = []
    for my_rref in sorted(r.imports, key=rref_sort_key):
        payload = r.imports[my_rref]
        if my_rref[1] == "o":
            import_objects += 1
            label = "IMPORT-OBJ"
        else:
            import_promises += 1
            label = "IMPORT-PROMISE"
        lines.append("  %s %s %s %s" % (label, my_rref, payload[0], payload[1][:200]))
    if only_stats:
        print(" %s import-obj, %s import-promise" % (import_objects, import_promises))
    else:
        for line in lines:
            print(line)
        print()

    export_objects = 0
    export_promises = 0
    lines = []
    for my_rref in sorted(r.exports, key=rref_sort_key):
        payload = r.exports[my_rref]
        if my_rref[1] == "o":
            export_objects += 1
            label = "EXPORT-OBJ"
        else:
            export_promises += 1
            label = "EXPORT-PROMISE"
        label = "EXPORT-OBJ" if my_rref[1] == "o" else "EXPORT-PROMISE"
        lines.append("  %s %s %s %s" % (label, my_rref, payload[0], payload[1][:200]))
    if only_stats:
        print(" %s export-obj, %s export-promise" % (export_objects, export_promises))
    else:
        for line in lines:
            print(line)

    print()
