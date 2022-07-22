import sys, json, gzip, re, time
from collections import defaultdict
from pprint import pprint

# python vat-map.py SLOGFILE[.gz] > vat-map.json
#
# Determines a name for each vatID, also the manager type and number of
# deliveries. The resulting vat-map.json can be read by other tools to put a
# description on each vat. Static vats get a name from their bundle, e.g.
# "bank" or "mints" or "zoe". Dynamic contract vats find the agoric-sdk
# -relative filename of the entry point of the contract, e.g.
# "packages/inter-protocol/src/vaultFactory/vaultFactory.js", and emit an abbreviation
# (for known contracts) or the full string.

unknown_vats = set() # vatID
vats = {} # vatID -> { name, managerType, cranks }
unnamed_zcf_vats = set()

abbreviations = {
    "packages/inter-protocol/src/vaultFactory/vaultFactory.js": "vaultFactory",
    "packages/pegasus/src/pegasus.js": "pegasus",
    "packages/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap.js": "amm",
    "packages/inter-protocol/src/vaultFactory/liquidateMinimum.js": "liquidateMinimum",
    "packages/inter-protocol/src/vaultFactory/liquidateIncrementally.js": "liquidate",
    }

EPRE = re.compile(r'const entrypoint = "([^"]+)"')
def entrypoint_of_bundle(vatID, bundle):
    mf = bundle["moduleFormat"]
    if mf == "nestedEvaluate":
        source = bundle["source"]
        mo = EPRE.search(source)
        return mo.group(1)
    else:
        print("unknown moduleFormat='%s' in vat %s" % (mf, vatID))
    return None

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
            vatID = data["vatID"]
            if not data["dynamic"]:
                vats[vatID] = { "name": data["name"], "managerType": data["managerType"],
                                "cranks": 0 }
            else:
                name = None
                bundle = data["vatSourceBundle"]
                entrypoint = entrypoint_of_bundle(vatID, bundle)
                if entrypoint == "packages/zoe/contractFacet.js":
                    unnamed_zcf_vats.add(vatID)
                    name = "<zcf>"
                else:
                    name = abbreviations.get(entrypoint, entrypoint)
                vats[vatID] = { "name": name, "managerType": data["managerType"],
                                "cranks": 0 }

        if type == "deliver":
            vatID = data["vatID"]
            if vatID in unnamed_zcf_vats:
                kd = data["kd"]
                if kd[0] == "message":
                    method = kd[2]["method"]
                    if method == "executeContract":
                        bundle = json.loads(kd[2]["args"]["body"])[0]
                        entrypoint = entrypoint_of_bundle(vatID, bundle)
                        name = abbreviations.get(entrypoint, entrypoint)
                        vats[vatID]["name"] = name
                        unnamed_zcf_vats.remove(vatID)
            vats[vatID]["cranks"] += 1

print("{")
for count,vatID in enumerate(sorted(vats, key=lambda vatID: int(vatID[1:]))):
    d = vats[vatID]
    name = d.get("name", "<unknown>")
    comma = "," if count < len(vats)-1 else ""
    print('%6s: {"mtype": %12s, "deliveries": %10d,  "name": %-22s}%s' % (
        '"%s"' % vatID, '"%s"' % d["managerType"], d["cranks"], '"%s"' % name, comma))
print("}")
#for vatID in sorted(unknown_vats, key=lambda vatID: int(vatID[1:])):
#    print("%4s: unknown" % (vatID,))

