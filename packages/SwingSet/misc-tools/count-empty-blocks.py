import os, sys, json, gzip

# given a slogfile on stdin, emit a block utilization report: how many were
# empty (no computrons spent) vs non-empty

# given a filename as an argument, print an ETA, then process the file

eta = None

if len(sys.argv) > 1:
    fn = sys.argv[1]
    size = os.stat(fn).st_size
    if fn.endswith(".gz"):
        eta = 98 * size / 1e9 # on "muon", my MBP(M1)
        f = gzip.open(fn, "rb")
    else:
        eta = 10.34 * size / 1e9
        f = open(fn, "rb")
else:
    f = sys.stdin

if eta:
    print("ETA: %d seconds" % eta)

empty = True
num_blocks = 0
num_empty = 0

for line in f:
    try:
        d = json.loads(line)
    except Exception as e:
        print("error parsing JSON", e)
        continue
    stype = d["type"]
    if stype == "cosmic-swingset-begin-block":
        block_num = d["blockHeight"]
        empty = True
        if block_num % 1000 == 0:
            print("block %d" % block_num, file=sys.stderr)
    elif stype == "cosmic-swingset-bootstrap-block-start":
        block_num = 0
        empty = True
    elif stype == "cosmic-swingset-run-finish":
        if d.get("usedBeans", 0):
            empty = False
    elif stype == "cosmic-swingset-end-block-finish":
        num_blocks += 1
        if empty:
            num_empty += 1


perc = 100.0 * num_empty / num_blocks
full = num_blocks - num_empty
print("%d empty = %.2f%% of %d total (%d full)" % (num_empty, perc, num_blocks, full))

# on muon, run-01 took 60s to process slogfile (800MB .gz, 7.5GB uncompressed)
# run-02: 97s 1,228,000,669 .gz, 11,651,784,879 uncompressed
# that's 78s per 1GB .gz, or 8.23s per 1GB uncompressed

#run-05 123s 1,244,057,795 .gz = 99s/GB.gz
#run-26 287s 2,951,596,979 .gz (246s with 'grep cosmic-swingset-' preprocessor)
#run-39 383s 3,903,070,407 .gz = 97s/GB.gz
#run-41   2,862,818,061 .gz
