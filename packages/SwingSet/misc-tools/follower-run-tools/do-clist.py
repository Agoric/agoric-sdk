#!/usr/bin/env python3

# extract the #8400/#8401 counts from kvdata.json
# and the exported-object counts from clist.sqlite

import os.path, sys, json, sqlite3

datafn = sys.argv[1]
clistfn = sys.argv[2]

with open(datafn) as f:
    vats = json.load(f)

a = 2

# total cycles   v9.c24 seatHandleToZoeSeatAdmin
# ATOM           v29.c12 zcfSeatToSeatHandle
# stATOM         v68.c12
# vaultFactory   v48.c12

def getC12(name, vatID):
    if vatID in vats:
        count = vats[vatID]["collections"]["12"]["entries"]
        print("{:8s} {:>4s}.c12: {:>7d}".format(name, vatID, count))

print("{:8s} {:>4s}.c24: {:>7d}".format("zoe", "v9", vats["v9"]["collections"]["24"]["entries"]))
getC12("vaultF", "v48")
getC12("ATOM", "v29")
getC12("stATOM", "v68")
getC12("stTIA", "v104")
getC12("stOSMO", "v98")
getC12("stkATOM", "v111")

print()

# QuotePayments
# ATOM           v29.k22
# scaled-ATOM    v46.k22

def getK22(name, vatID):
    if vatID in vats:
        count = vats[vatID]["kinds"]["22"]["defined"]
        print("{:12s} {:>4s}.k22: {:>7d}".format(name, vatID, count))
getK22("ATOM", "v29")
getK22("sPA-ATOM", "v46")
getK22("stATOM", "v68")
getK22("sPA-stATOM", "v69")
getK22("stOSMO", "v98")
getK22("sPA-stOSMO", "v99")
getK22("stTIA", "v104")
getK22("sPA-stTIA", "v105")
getK22("stkATOM", "v111")
getK22("sPA-stkATOM", "v112")

print()

assert(os.path.exists(clistfn))
db = sqlite3.connect(clistfn)
print("exported objects:")
print("v9-zoe", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v9" AND exported=1').fetchone()[0])
print("v29-pf-ATOM", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v29" AND exported=1').fetchone()[0])
print("v46-sPA-ATOM", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v9" AND exported=1').fetchone()[0])
print("v69-sPA-stATOM", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v69" AND exported=1').fetchone()[0])
print("v99-sPA-stOSMO", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v99" AND exported=1').fetchone()[0])
print("v105-sPA-stTIA", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v105" AND exported=1').fetchone()[0])
print("v112-sPA-stkATOM", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v112" AND exported=1').fetchone()[0])

print()
print("imported objects:")
print("v29", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v29" AND exported=0').fetchone()[0])
print("v68", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v68" AND exported=0').fetchone()[0])
print("v98", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v98" AND exported=0').fetchone()[0])
print("v104", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v104" AND exported=0').fetchone()[0])
print("v111", db.execute('SELECT COUNT(*) FROM clist WHERE vatID="v111" AND exported=0').fetchone()[0])

