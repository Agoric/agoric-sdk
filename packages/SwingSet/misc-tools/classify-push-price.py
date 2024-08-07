import sys, json

# given the run slog of a PushPrice operation on stdin, compute the denom,
# round, and progress status of the operation

# we look for the first delivery to one of the price-feed vats. This happens
# about the 5th crank of the run: v10-bridge, v43-wallet, v7-board, v43-wallet,
# then eg v98-stOSMO-USD_price_feed

pf_vats = {
    "v29": "ATOM-USD",
    "v68": "stATOM-USD",
    "v98": "stOSMO-USD",
    "v104": "stTIA-USD",
    "v111": "stkATOM-USD",
    }

run_id = None
computrons = 0
deliveries = 0
run_start = None
elapsed = 0
denom = None
round = None
price = None
status = "none"
address = None

for line in sys.stdin:
    d = json.loads(line)
    stype = d["type"]
    if stype == "cosmic-swingset-run-start":
        if run_id is None:
            block = d["blockHeight"]
            run = d["runNum"]
            run_id = "b%d-r%d" % (block, run)
        run_start = d["time"]
    if stype == "cosmic-swingset-run-finish":
        elapsed += d["time"] - run_start
    if stype == "deliver":
        deliveries += 1
        if address is None and d["vatID"] == "v10":
            kd = d["kd"]
            meth, args = json.loads(kd[2]["methargs"]["body"][1:])
            assert(meth == "inbound")
            address = args[1]["owner"]
        if denom is None and d["vatID"] in pf_vats and d["kd"][0] == "message":
            denom = pf_vats[d["vatID"]]
            kd = d["kd"]
            meth, args = json.loads(kd[2]["methargs"]["body"][1:])
            assert(meth == "PushPrice")
            round = args[0]["roundId"]
            price_s = args[0]["unitPrice"]
            assert(price_s.startswith("+"))
            price = int(price_s[1:])
            #print(denom, round, price)
            #break
    if stype == "deliver-result":
        m = d["dr"][2]
        if m:
            computrons += m["compute"]
    if stype == "console":
        args = d["args"]
        if "invalid round to report" in args[0]:
            status = "invalid-round-1"
        if "cannot report on previous rounds" in args[0]:
            status = "invalid-round-2"
        if len(args) > 2 and args[2] == "new quote":
            status = "new-quote"

#print(",".join([denom, "%6s" % round, run_id, " %s" % address, "%8s" % price, "%3s" % deliveries,
#                "%8s" % computrons, "%6s" % ("%.2f" % elapsed), " " + status]))
#print(json.dumps([denom, round, run_id, address, price, deliveries, computrons, elapsed, status]))
print(json.dumps([run_id, address, denom, round, deliveries, status]))

