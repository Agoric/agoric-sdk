import sys, gzip, json, re
from collections import defaultdict

# We load the entire kerneldb into memory. The uncompressed kerneldb was 27MB
# after a week-long testnet; it does not contain transcripts or XS heap
# snapshots, but does contain vat source code and all virtualized data

vat_names = {}
try:
    with open("vat-map.json") as f:
        vat_names = json.load(f)
except EnvironmentError:
    pass

def name_vat(vatID):
    if vatID in vat_names:
        return "%s:%s" % (vatID, vat_names[vatID]["name"])
    return vatID

db = {}
fn = sys.argv[1] # kerneldb.jsonlines[.gz] , from db-dump.js
opener = gzip.open if fn.endswith(".gz") else open
with opener(sys.argv[1]) as f:
    for line in f:
        key, value = json.loads(line.strip())
        db[key] = value


# Of all the objects exported by vat X, how many are retained because of
# imports by vat Y?

# objects_imported_by_vat[exportingVatID][importingVatID] = [reachable, recognizable]
objects_imported_by_vat = defaultdict(lambda: defaultdict(lambda: [0,0]))

# Of all the objects exported by vat X, how many are retained because of the
# kernel, through resolved (but unretired) promises, or the run-queue

# objects_imported_by_kernel[exportingVatID] = count
objects_imported_by_kernel = defaultdict(int)

# Of all the promises that vat X subscribes to, how many are decided by vat
# Y?

# promises_decided_by_vat[subscribingVatID][decidingVatID] = count
promises_decided_by_vat = defaultdict(lambda: defaultdict(int))

# Of all the promises that vat X subscribes to, how many are decided by the
# kernel?

# promises_decided_by_kernel[subscribingVatID] = count
promises_decided_by_kernel = defaultdict(int)

clist_import_re = re.compile(r'^(v\d+)\.c\.(o-\d+)$') # vNN.c.o-NN -> koNN
#ko_refcount_re = re.compile(r'^(ko\d+)\.refCount$') # koNN.refCount -> reachable,recognizable

for key in db:
    if key.startswith("kp"):
        pieces = key.split(".")
        kpid = pieces[0]
        if pieces[1] == "state":
            state = db[key]
            if state == "unresolved":
                decider = db[kpid+".decider"] # vatid or ""
                subscribers = db[kpid+".subscribers"].split(",")
                for s in subscribers:
                    if decider:
                        promises_decided_by_vat[s][decider] += 1
                    else:
                        promises_decided_by_kernel[s] += 1
    mo = clist_import_re.match(key)
    if mo:
        importing_vat_id = mo.group(1)
        vref = mo.group(2)
        kref = db[key]
        owner = db[kref+".owner"]
        objects_imported_by_vat[owner][importing_vat_id][1] += 1
        reachable = db["%s.c.%s" % (importing_vat_id, kref)][0] == "R"
        if reachable:
            objects_imported_by_vat[owner][importing_vat_id][0] += 1
    #mo = ko_refcount_re.match(key)
    #if mo:
    #    kref = mo.group(1)
    #    reachable, recognizable = db[key].split(",").map(int)
    #    ko_refcounts[kref] = [reachable, recognizable]


vat_ids = set(promises_decided_by_vat)
vat_ids.update(promises_decided_by_kernel)
vat_ids.update(objects_imported_by_vat)

def sortVatID(vatID):
    return int(vatID[1:])

for vat_id in sorted(vat_ids, key=sortVatID):
    some = 0
    upstream_vat_ids = set(promises_decided_by_vat[vat_id])
    upstream_vat_ids.update(objects_imported_by_vat[vat_id])
    for upstream_vat_id in sorted(upstream_vat_ids, key=sortVatID):
        count = promises_decided_by_vat[vat_id][upstream_vat_id]
        some += count
        if count:
            print("%20s   subs to %5d       promises from decider %s" % (name_vat(vat_id), count, name_vat(upstream_vat_id)))
        (reachable, recognizable) = objects_imported_by_vat[vat_id][upstream_vat_id]
        some += reachable + recognizable
        if reachable or recognizable:
            s = "%5d/%-5d" % (reachable, recognizable)
            print("%20s   imports %11s objects from owner %s" % (name_vat(vat_id), s, name_vat(upstream_vat_id)))
    count = promises_decided_by_kernel[vat_id]
    some += count
    if count:
        print("%20s   subs to %5d       promises from kernel" % (name_vat(vat_id), count))
    if some:
        print()
