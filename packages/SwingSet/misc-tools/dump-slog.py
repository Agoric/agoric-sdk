#!/usr/bin/env python3
import sys, re, json
from pprint import pprint

names = {}
names["ko31"] = "to-right"
names["ko33"] = "from-right"
names["ko39"] = "bob"
names["kp54"] = "resPX"
names["kp55"] = "argPY"
names["ko42"] = "amy"
names["ko41"] = "alice"

def named(kslot, vslot):
    if kslot in names:
        return "%s/%s/%s" % (kslot, vslot, names[kslot])
    return "%s/%s" % (kslot, vslot)

class Vat:
    def __init__(self, vatID, description):
        self.vatID = vatID
        self.description = description
        self.deliveries = []

    def addDelivery(self, crankNum, deliveryNum, kd, vd):
        assert deliveryNum not in self.deliveries
        assert deliveryNum == len(self.deliveries)
        self.deliveries.append(Delivery(self.vatID, deliveryNum, crankNum, kd, vd))

    def finishDelivery(self, crankNum, deliveryNum, results):
        self.deliveries[deliveryNum].finish(results)

    def addSyscall(self, crankNum, deliveryNum, syscallNum, ksc, vsc):
        self.deliveries[deliveryNum].addSyscall(syscallNum, ksc, vsc)

    def finishSyscall(self, crankNum, deliveryNum, syscallNum, ksr, vsr):
        self.deliveries[deliveryNum].finishSyscall(syscallNum, ksr, vsr)

    def console(self, crankNum, deliveryNum, level, args):
        self.deliveries[deliveryNum].console(level, args)

class Delivery:
    def __init__(self, vatID, deliveryNum, crankNum, kd, vd):
        self.vatID = vatID
        self.deliveryNum = deliveryNum
        self.crankNum = crankNum
        self.kd = kd
        self.vd = vd
        self.syscalls = []
        self.consoles = [] # ('log', level, args) or ('syscall', syscallNum)
        self.finished = False

    def finish(self, results):
        self.finished = True
        self.results = results

    def console(self, level, args):
        self.consoles.append(('log', level, args))

    def addSyscall(self, syscallNum, ksc, vsc):
        assert not self.finished
        assert syscallNum == len(self.syscalls)
        self.consoles.append(('syscall', syscallNum))
        self.syscalls.append(Syscall(syscallNum, ksc, vsc))

    def finishSyscall(self, syscallNum, ksr, vsr):
        assert not self.finished
        self.syscalls[syscallNum].finish(ksr, vsr)

    def render_delivery(self):
        print("## %s(%s) d#%d cr#%d" % (self.vatID, vats[self.vatID].description, self.deliveryNum, self.crankNum))
        if self.kd[0] == "message":
            [ktarget, kmessage] = self.kd[1:]
            kresult = kmessage.get("result", "-")
            method = kmessage["method"]
            [vtarget, vmessage] = self.vd[1:]
            vresult = vmessage.get("result", "-")
            print(" %s . %s -> %s" % (named(ktarget, vtarget), method, named(kresult, vresult)))
            kslots = kmessage["args"]["slots"]
            vslots = vmessage["args"]["slots"]
            body = demarshal(kmessage["args"]["body"], kslots, vslots)
            print(" ", end="")
            pprint(body, indent=5)
        elif self.kd[0] == "notify":
            [ktarget, kresolution] = self.kd[1:]
            [vtarget, vresolution] = self.vd[1:]
            state = kresolution["state"]
            if state in ["fulfilledToData", "rejected"]:
                kslots = kresolution["data"]["slots"]
                vslots = vresolution["data"]["slots"]
                body = demarshal(kresolution["data"]["body"], kslots, vslots)
                print(" %s %s" % (named(ktarget, vtarget), state))
                print(" ", end="")
                pprint(body, indent=5)
            elif state == "fulfilledToPresence":
                kslot = kresolution["slot"]
                vslot = vresolution["slot"]
                print(" %s %s %s" % (named(ktarget, vtarget), state, named(kslot, vslot)))
            else:
                raise ValueError("resolution: %s" % state)
        else:
            print("??", self.kd[0])

    def render(self):
        self.render_delivery()
        for c in self.consoles:
            if c[0] == 'syscall':
                self.syscalls[c[1]].render()
            elif c[0] == 'log':
                [level, args] = c[1:]
                assert isinstance(args, list)
                if len(args) == 1:
                    print("  --[%s] " % level, end="")
                    pprint(args[0])
                else:
                    print("  --[%s]" % level)
                    print("    ", end="")
                    pprint(args)
            else:
                raise ValueError("um %s" % c[0])
        print()



def demarshal(msg, kslots, vslots):
    def hook(obj):
        qclass = obj.get("@qclass")
        if not qclass:
            return obj
        if qclass == "slot":
            idx = obj["index"]
            return "~%s~" % named(kslots[idx], vslots[idx])
        if qclass == "undefined":
            return None
        return obj
    decoder = json.JSONDecoder(object_hook=hook)
    return decoder.decode(msg)

class Syscall:
    def __init__(self, syscallNum, ksc, vsc):
        self.syscallNum = syscallNum
        self.ksc = ksc
        self.vsc = vsc
    def finish(self, ksr, vsr):
        self.ksr = ksr
        self.vsr = vsr
    def render(self):
        print("  -- s#%d  " % self.syscallNum, end="")
        call = self.ksc[0]
        if call == "send":
            # sigh, not uniform
            # KSC: ['send', target, { method, args, result }]
            # VSC: ['send', target, method, args, result]
            ktarget = self.ksc[1]
            vtarget = self.vsc[1]
            kmessage = self.ksc[2]
            method = kmessage["method"]
            assert method == self.vsc[2]
            kresult = kmessage["result"] or "-"
            vresult = "-"
            if len(self.vsc) > 4:
                vresult = self.vsc[4]
            print("%s . %s -> %s" % (named(ktarget, vtarget), method, named(kresult, vresult)))
            kslots = kmessage["args"]["slots"]
            vargs = self.vsc[3]
            vslots = vargs["slots"]
            body = demarshal(kmessage["args"]["body"], kslots, vslots)
            print("   ", end="")
            pprint(body, indent=5)
        elif call in ("fulfillToData", "reject"):
            # KSC: ['fulfillToData', vatID, target, data]
            # VSC: ['fulfillToData', target, data]
            ktarget = self.ksc[2]
            vtarget = self.vsc[1]
            kdata = self.ksc[3]
            vdata = self.vsc[2]
            kslots = kdata["slots"]
            vslots = vdata["slots"]
            body = demarshal(kdata["body"], kslots, vslots)
            print("%s %s" % (named(ktarget, vtarget), call))
            print("   ", end="")
            pprint(body, indent=5)
        elif call == "fulfillToPresence":
            ktarget = self.ksc[2]
            vtarget = self.vsc[1]
            kslot = self.ksc[3]
            vslot = self.vsc[2]
            print("%s %s %s" % (named(ktarget, vtarget), call, named(kslot, vslot)))
        else:
            pprint(self.ksc)

class Crank:
    def __init__(self, vatID, deliveryNum):
        self.vatID = vatID
        self.deliveryNum = deliveryNum

vats = {} # [vatID] -> Vat
cranks = {} # [crankNum]

for linum0,line in enumerate(open(".slog", "r")):
    try:
        data = json.loads(line)
        vatID = data["vatID"] # currently present in all types
        if data["type"] == "create-vat":
            description = data["description"]
            vats[vatID] = Vat(vatID, description)
        elif data["type"] == "deliver":
            vats[vatID].addDelivery(data["crankNum"], data["deliveryNum"], data["kd"], data["vd"])
        elif data["type"] == "deliver-result":
            results = None # no results yet
            vats[vatID].finishDelivery(data["crankNum"], data["deliveryNum"], results)
        elif data["type"] == "syscall":
            vats[vatID].addSyscall(data["crankNum"], data["deliveryNum"], data["syscallNum"], data["ksc"], data["vsc"])
        elif data["type"] == "syscall-result":
            vats[vatID].finishSyscall(data["crankNum"], data["deliveryNum"], data["syscallNum"], data["ksr"], data["vsr"])
        elif data["type"] == "console":
            vats[vatID].console(data["crankNum"], data["deliveryNum"], data["level"], data["args"])
        else:
            print("unrecognized type '%s'" % data["type"], data)
    except:
        print("error parsing line %d: '%s'" % (linum0+1, line))
        raise

def numeric(id):
    mo = re.search(r'^([^\d]*)(\d+)$', id)
    return (mo.group(1), int(mo.group(2)))

vats_by_name = {}
for vatID in sorted(vats, key=numeric):
    vat = vats[vatID]
    vats_by_name[vat.description] = vatID

if sys.argv[1] == "--list-vats":
    for vatID in sorted(vats, key=numeric):
        print("%s: %s" % (vatID, vats[vatID].description))
    sys.exit(0)

# v8 (leftcomms) unknown vatSlot p-64
vat_of_interest = vats_by_name.get(sys.argv[1], sys.argv[1])
for d in vats[vat_of_interest].deliveries:
    d.render()



