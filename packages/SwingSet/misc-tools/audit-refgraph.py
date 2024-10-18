import sys, json, re
from collections import defaultdict

# first build an underscore-separated list of all kvStore values
#  sqlite3 -separator _ ss.sqlite 'SELECT * FROM kvStore' |sort >all-kv.txt

# then feed that into stdin. This tool then attempts to compare the refcounts
# and metadata keys for all virtual objects, looking for discrepancies. This
# tool really wants to be rewritten to read from the kvStore database directly,
# because the DB keys are not guaranteed to avoid underscores. See
# https://github.com/Agoric/agoric-sdk/issues/8759 for directions.

vatRE = re.compile(r'^(v\d+)\.(.*)')
vcRE = re.compile(r'^vc\.(\d+)\.(.*)')
rcRE = re.compile(r'^vom\.rc\.(.*)')

class Collection:
    def __init__(self, vatID, collectionID):
        self.vatID = vatID
        self.collectionID = collectionID
        self.data = {}
        self.meta = {}
        self.ordinals = {}

    def __str__(self):
        return "Collection(%s.c%d)" % (self.vatID, self.collectionID)

    def add(self, c_key, value):
        reachable_vrefs = []
        if c_key in ["|entryCount", "|schemata", "|nextOrdinal"]:
            self.meta[c_key] = value
        elif c_key.startswith("|"):
            # ordinal assignment record
            # 'o+d31/35:1' -> 3
            self.ordinals[c_key[1:]] = int(value)
        else:
            self.data[c_key] = value
            print(c_key, value)
            data = json.loads(value)
            reachable_vrefs.extend(data["slots"])
        return reachable_vrefs

    def audit(self):
        assert(int(self.meta["|entryCount"]) == len(self.data))
        
    def audit_ordinals(self):
        for c_key in self.data:
            if c_key.startswith("r"):
                # data record, where the key is an ordinal
                # 'r0000000003:o+d31/35:1' -> '{"body":"#null","slots":[]}'
                pieces = c_key.split(":", maxsplit=1)
                dr_ordinal_s = pieces[0][1:]
                dr_ordinal = int(dr_ordinal_s)
                dr_ordinal_vref = pieces[1]
                if dr_ordinal_vref not in self.ordinals:
                    raise ValueError("%s.c%s vref=%s ordinal=%s" % (self.vatID, self.collectionID, dr_ordinal_vref, dr_ordinal))
                oa_ordinal = self.ordinals[dr_ordinal_vref]
                if dr_ordinal != oa_ordinal:
                    raise ValueError("%s.c%s vref=%s ordinal=%s/%s" % (self.vatID, self.collectionID, dr_ordinal_vref, dr_ordinal, oa_ordinal))
        for oa_vref, oa_ordinal in self.ordinals.items():
            dr_key = "r%010d:%s" % (oa_ordinal, oa_vref)
            if dr_key not in self.data:
                raise ValueError("%s.c%s vref=%s ordinal=%s" % (self.vatID, self.collectionID, oa_vref, oa_ordinal))


class Vat:
    def __init__(self, vatID):
        self.vatID = vatID
        self.collections = {}
        self.refcounts = {} # vom.rc.$vref: $vref -> reachable_count
        self.refs = defaultdict(set) # $vref -> inbound vrefs

    def add_line(self, v_line, value):
        if v_line.startswith("vs."):
            vs_key = v_line[len("vs."):]
            self.add_vatstore(vs_key, value)
    def add_vatstore(self, vs_key, value): # vom.rc. or vc.$cid. , etc
        #print(vatID, vs_key, value)
        mo = vcRE.match(vs_key) # vc.$cid.
        if mo:
            (collectionID, c_key) = mo.groups()
            collectionID = int(collectionID)
            if collectionID not in self.collections:
                self.collections[collectionID] = Collection(self.vatID, collectionID)
            c = self.collections[collectionID]
            reachable_vrefs = c.add(c_key, value)
            for vref in reachable_vrefs:
                self.refs[vref].add("collection-%d" % collectionID)
        mo = rcRE.search(vs_key) # vom.rc.
        if mo:
            vref = mo.group(1)
            reachable_s = value
            self.refcounts[vref] = int(reachable_s)
        
        

collections_by_vatID = {}


for row in sys.stdin:
    key,value = row.strip().split("_", maxsplit=1)
    mo = vatRE.search(key)
    if mo:
        (vatID, rest)  = mo.groups()
        if vatID not in collections_by_vatID:
            collections_by_vatID[vatID] = Vat(vatID)
        v = collections_by_vatID[vatID]
        v.add_line(rest, value)

# quick hack: dump a particular collection I was looking at
c = collections_by_vatID["v9"].collections[94]
#print(c.data)
#print(c.ordinals)
for v in collections_by_vatID.values():
    for c in v.collections.values():
        c.audit_ordinals()
        print("%s ok" % c)
