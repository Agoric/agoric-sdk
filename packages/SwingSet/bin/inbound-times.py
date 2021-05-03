import sys, json, gzip, re, time
from collections import defaultdict

def abbreviate_space(s, SI=True):
    """
    Given size in bytes summarize as English by returning unicode string.
    """
    if s is None:
        return "unknown"
    if SI:
        U = 1000.0
        isuffix = "B"
    else:
        U = 1024.0
        isuffix = "iB"
    def r(count, suffix):
        return "%.2f %s%s" % (count, suffix, isuffix)

    if s < 1024: # 1000-1023 get emitted as bytes, even in SI mode
        return "%d B" % s
    if s < U*U:
        return r(s/U, "k")
    if s < U*U*U:
        return r(s/(U*U), "M")
    if s < U*U*U*U:
        return r(s/(U*U*U), "G")
    if s < U*U*U*U*U:
        return r(s/(U*U*U*U), "T")
    if s < U*U*U*U*U*U:
        return r(s/(U*U*U*U*U), "P")
    return r(s/(U*U*U*U*U*U), "E")

names = {
    "v12": "comms",
    "v9": "zoe",
    "v13": "vattp",
    "v23": "mint",
    }

#per_block = []
vat_allocate_chunks_at_start = defaultdict(float)
vat_allocate_slots_at_start = defaultdict(float)
vat_gc_at_start = defaultdict(float)
vat_allocate_chunks_at_end = defaultdict(float)
vat_allocate_slots_at_end = defaultdict(float)
vat_gc_at_end = defaultdict(float)
prev = None
block_slog_size = 0
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
        when = data["time"]
        vatID = data.get("vatID")
        if type == "cosmic-swingset-begin-block":
            block_height = data["blockHeight"]
            begin_block_time = when
            block_deliveries = 0
            block_slog_size = 0
            for vatID in vat_allocate_chunks_at_end:
                vat_allocate_chunks_at_start[vatID] = vat_allocate_chunks_at_end[vatID]
                vat_allocate_slots_at_start[vatID] = vat_allocate_slots_at_end[vatID]
                vat_gc_at_start[vatID] = vat_gc_at_end[vatID]
            vat_syscall_count = defaultdict(float)
            vat_syscall_linesize = defaultdict(float)
            vat_syscall_result_linesize = defaultdict(float)
            vat_delivery_times = defaultdict(float)
            vat_allocation = defaultdict(float)
            vat_compute = defaultdict(float)
        block_slog_size += len(line)
        if type == "deliver":
            block_deliveries += 1
            deliver_start = when
        if type == "syscall":
            vat_syscall_count[vatID] += 1
            vat_syscall_linesize[vatID] += len(line)
        if type == "syscall-result":
            vat_syscall_result_linesize[vatID] += len(line)
        if type == "deliver-result":
            deliver_time = when - deliver_start
            vat_delivery_times[vatID] += deliver_time
            if data["dr"][0] == "ok":
                meter = data["dr"][2]
                if meter:
                    vat_allocation[vatID] = max(vat_allocation[vatID], meter["allocate"])
                    vat_compute[vatID] += meter["compute"]
                    if "allocateChunksCalls" in meter:
                        vat_allocate_chunks_at_end[vatID] = meter["allocateChunksCalls"]
                    if "allocateSlotsCalls" in meter:
                        vat_allocate_slots_at_end[vatID] = meter["allocateSlotsCalls"]
                    if "garbageCollectionCount" in meter:
                        vat_gc_at_end[vatID] = meter["garbageCollectionCount"]
        if type == "cosmic-swingset-end-block-start":
            end_block_start_time = when
        if type == "cosmic-swingset-end-block-finish":
            t1 = end_block_start_time - begin_block_time
            t2 = when - end_block_start_time
            print("%s #%4d %.03f %.03f [%d] slog=%s" % (time.ctime(when), block_height, t1, t2, block_deliveries, abbreviate_space(block_slog_size)))
            for vatID in sorted(names):
                if vatID not in names:
                    print()
                    continue
                print(" %6s   %.02f %8s sys:(%3d %12d %12d) meter:(comp=%12d +%2dchunk +%2dslot +%2dgc =%dch =%dsl =%dgc) %12d" % (
                    names[vatID], vat_delivery_times[vatID],
                    abbreviate_space(vat_allocation[vatID]),
                    vat_syscall_count[vatID],
                    vat_syscall_linesize[vatID],
                    vat_syscall_result_linesize[vatID],
                    vat_compute[vatID],
                    vat_allocate_chunks_at_end[vatID] - vat_allocate_chunks_at_start[vatID],
                    vat_allocate_slots_at_end[vatID] - vat_allocate_slots_at_start[vatID],
                    vat_gc_at_end[vatID] - vat_gc_at_start[vatID],
                    vat_allocate_chunks_at_end[vatID],
                    vat_allocate_slots_at_end[vatID],
                    vat_gc_at_end[vatID],
                    vat_allocation[vatID],
                    ))
                #if names[vatID] == "mint":
                #    per_block.append([block_height, vat_delivery_times[vatID]])
            #if block_height > 400 and block_deliveries < 40:
            #    break
            #if t2 > 4.0:
            #    break
            #if block_height > 1000:
            #    break
        if type == "cosmic-swingset-deliver-inbound":
            if prev:
                delta = when - prev
                #print("%s #%d %.1f [%d]" % (time.ctime(when), block_height, delta, data["count"]))
            prev = when
#with open("per_block.csv", "w") as f:
#    for t in per_block:
#        print(",".join((str(i) for i in t)), file=f)
