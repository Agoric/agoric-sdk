import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# point this at a slogfile and it will figure out the comms
# connections, printing the remote address, the transmitter object
# (within vat-vattp), and the receiver object (within vat-comms)

def extract(kd):
    methargs = kd[2]["methargs"]
    (method, args) = json.loads(methargs["body"])
    return method, args, methargs["slots"]

class Remote:
    def __init__(self, remote, tx_kref):
        self.remote = remote
        self.tx_kref_vattp = tx_kref
    def set_rx_kref_comms(self, rx_kref_comms):
        self.rx_kref_comms = rx_kref_comms
    def print(self):
        print(self.remote, self.tx_kref_vattp, self.rx_kref_comms)

comms_vatid = None
vattp_vatid = None
remotes = {} # remote -> Remote
setters = {} # setter kref -> remote

print("remote                                        tx    rx")
#      agoric164mdr2vmh2vy3kge6k9a79rf0rjlpqsqg5c8az ko666 ko711

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
                    setters[setter_kref] = remote
                    #print(remote, tx_kref, setter_kref)

        if vattp_vatid and type == "deliver" and data["vatID"] == vattp_vatid:
            kd = data["kd"]
            if kd[0] == "message":
                (method, args, slots) = extract(kd)
                target = kd[1]
                if target in setters:
                    remote = setters[target]
                    (method, args, slogs) = extract(kd)
                    assert method == "setReceiver"
                    assert args[0]["@qclass"] == "slot"
                    # no iface
                    assert args[0]["index"] == 0
                    rx_kref_comms = slots[0]
                    remotes[remote].set_rx_kref_comms(rx_kref_comms)
                    remotes[remote].print()


print()
