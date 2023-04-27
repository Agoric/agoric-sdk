#!/usr/bin/env python3
import sys, json, time, hashlib, base64
from collections import defaultdict
import subprocess

# run like this:
#   tail -n 10000 -F chain.slog | python3 monitor-slog-block-time.py [keys.txt]
# produces output like:
#

# - block  blockTime    lag  -> cranks(avg) computrons  swingset(avg)  +  cosmos = proc% (avg) [sigs2/3/tot] rounds proposer
#   74081    6(11.2)   6.331 ->  114( 29.7)    3934989 10.873( 4.247)  +   0.004 =  64% (17.6) [ 65/  0/ 65] r0 aliefaisala
#   74082    5(10.7)  17.998 ->    0( 27.4)          0  0.001( 3.920)  +   0.002 =   0% (16.2) [ 44/  0/ 44] r0 (2CBE7F)
#   74083   17(11.1)   6.907 ->   17( 26.6)     550822  1.279( 3.732)  +   0.002 =  17% (16.4) [ 58/  7/ 65] r1 (2CBE7F)
#   74084    6(10.8)   6.638 ->    0( 24.9)          0  0.000( 3.483)  +   0.002 =   0% (15.3) [ 65/  0/ 65] r0 rudolfhe-55
#   74085    6(10.5)  11.113 ->  192( 35.3)    9282644 21.492( 4.608)  +   0.007 =  67% (18.5) [ 65/  0/ 65] r0 bakarapara
#   74086   10(10.5)  42.836 ->   57( 36.6)    2730956 23.531( 5.721)  +   0.002 =  53% (20.6) [ 39/  0/ 39] r1 nataagoric

# All times are in seconds. The values in parentheses are a 20-block trailing
# average. For each block, the fields are:
#
#  blockTime: The delta between the consensus timestamps of this block and
#             the previous one (always an integer, since blockTime has low
#             resolution)
#  lag: Time elapsed from (consensus) blockTime to the BEGIN_BLOCK timestamp
#       in the slogfile. This includes the block proposer's timeout_commit delay,
#       network propagation to the monitoring node, and any local tendermint
#       verification.
#  cranks: The number of swingset cranks performed in the block.
#  computrons: The total computrons of execution performed in the block. The
#              current run-policy stops doing cranks when this exceeds 8M. In
#              the above example, block 74085 exceeded the (current) 8M
#              computron run-policy limit, so some of the 57 cranks executed
#              in block 74086 were leftovers from 74085.
#  swingset: The amount of time spent in the kernel for this block. This is
#            from cosmic-swingset-end-block-start to -end-block-finish
#  cosmos: The amount of time spent in non-swingset block work. This is from
#          cosmic-swingset-begin-block to -end-block-start, and includes all
#          cosmos-sdk modules like Bank and Staking.
#  proc%: The percentage of time spent doing block processing, out of the total
#         time from one block to the next. 100% means the monitoring node has
#         no idle time between blocks, and is probably falling behind.

# If enabled, this tool will also run `ag-chain-cosmos` to learn about
# consensus-protocol details for each block, which will populate additional
# fields:
#
# [sigs2/3/tot]: The number of signatures on the block, of type 2 ("COMMIT")
#                or type 3 ("NIL"), and the total of both. Tendermint docs at
#                https://github.com/tendermint/tendermint/blob/HEAD/spec/core/data_structures.md#blockidflag
#                might provide an interpretation of these flags. If the
#                number of signatures drops, it might indicate that
#                validators are falling behind and were unable to deliver
#                their signature in time to be counted.
# rounds: The number of proposal rounds that were necessary to select a
#         block. Normally this is 0, but if a block proposer did not provide
#         a block fast enough, or if 2/3rds of the voting power did not
#         approve it fast enough, more rounds may be needed, and this field
#         will show "r1" or "r2" or higher. Elevated round counts may
#         indicate that the proposer, or validators, are falling behind.
# proposer: The moniker (if available via keys.txt) or abbreviated address of
#           the validator which proposed this block.


blocks = defaultdict(dict)
recent_blocks = []

def abbrev(t):
    return "%1.3f" % t
def abbrev1(t):
    return "%1.1f" % t
def perc(n):
    return "%3d%%" % (n * 100)

# Activating do_count_signatures causes the tool to query the chain for each
# block (by running agd, which must be in your $PATH), to
# retrieve the number of rounds required, the number and types of signatures,
# and the address of the block proposer. If we were given a suitable keys.txt
# in sys.argv, use it to translate addresses to monikers. keys.txt can be
# generated (for validators who were present in the genesis block) by
# running:
#
# cat ~/.ag-chain-cosmos/config/genesis.json |jq -c
# '.app_state | .genutil.gen_txs | map(.body.messages[0]) |
# map([.description.moniker, .pubkey.key])' > keys.txt

do_count_signatures = True

validators = {} # hexaddr -> moniker

def load_genesis_keys(fn):
    with open(fn) as f:
        keys = json.load(f)
    for (moniker, key_b64) in keys:
        hexaddr = hashlib.sha256(base64.b64decode(key_b64)).hexdigest()[:40].upper()
        # hexaddr appears in `query block` | jq .block_header.proposer_address
        validators[hexaddr] = moniker

def wait_for_block(height):
    while True:
        out = subprocess.check_output(["agd", "status"]).decode()
        now = int(json.loads(out)["SyncInfo"]["latest_block_height"])
        if now >= height:
            return
        time.sleep(1)

def count_signatures(height):
    if not do_count_signatures:
        return (0, 0, 0, "")
    wait_for_block(height)
    out = subprocess.check_output(["agd", "query", "block", str(height)]).decode()
    block = json.loads(out)["block"]
    sigs = block["last_commit"]["signatures"]
    twos = len([s for s in sigs if s["block_id_flag"] == 2])
    threes = len([s for s in sigs if s["block_id_flag"] == 3])
    good = len([s for s in sigs if s["block_id_flag"] in [2,3]])
    rounds = block["last_commit"]["round"]
    proposer = block["header"]["proposer_address"]
    return (twos,threes, rounds, proposer)

head = "- block  blockTime    lag  -> cranks(avg) computrons  swingset(avg)  +  cosmos = proc% (avg) [sigs2/3/tot] rounds proposer"
fmt  = "  %5d   %2d(%4s)  %6s -> %4s(%5s)  %9d %6s(%6s)  +  %6s = %4s (%4s) [%3d/%3d/%3d] r%d %s"

class Summary:
    headline_counter = 0
    def summarize(self):
        if self.headline_counter == 0:
            print(head)
            self.headline_counter = 20
        self.headline_counter -= 1
        ( height, cranks,
          block_time, proc_frac, cosmos_time, chain_block_time,
          swingset_time, swingset_percentage,
          lag, computrons, sigs ) = recent_blocks[-1]
        cranks_s = "%3d" % cranks if cranks is not None else " "*4
        # 2 minutes is nominally 120/6= 20 blocks
        recent = recent_blocks[-20:]
        avg_cranks = sum(b[1] or 0 for b in recent) / len(recent)
        avg_cranks_s = "%3.1f" % avg_cranks
        avg_block_time = sum(b[2] for b in recent) / len(recent)
        avg_proc_frac = sum(b[3] for b in recent) / len(recent)
        avg_chain_block_time = sum(b[5] for b in recent) / len(recent)
        avg_swingset_time = sum(b[6] for b in recent) / len(recent)
        avg_swingset_percentage = sum(b[7] for b in recent) / len(recent)
        moniker = validators.get(sigs[3], "(%s)" % sigs[3][:6])

        print(fmt % (height,
                     chain_block_time, "%2.1f" % avg_chain_block_time,
                     abbrev(lag),
                     cranks_s, avg_cranks_s,
                     computrons,
                     abbrev(swingset_time), abbrev(avg_swingset_time),
                     abbrev(cosmos_time),
                     perc(proc_frac), abbrev1(100.0 * avg_proc_frac),
                     sigs[0], sigs[1], sigs[0]+sigs[1], sigs[2],
                     moniker,
              ))

s = Summary()

last_crank = None
computrons = 0

if len(sys.argv) > 1:
    load_genesis_keys(sys.argv[1])

for line in sys.stdin:
    data = json.loads(line)
    if data["type"] == "deliver" and "crankNum" in data:
        last_crank = data["crankNum"]
    if data["type"] == "deliver-result":
        mr = data["dr"][2];
        if mr and "compute" in mr:
            computrons += mr["compute"]
    if data["type"] in ["cosmic-swingset-begin-block",
                        "cosmic-swingset-end-block-start",
                        "cosmic-swingset-end-block-finish"]:
        t = data["type"][len("cosmic-swingset-"):]
        height = data["blockHeight"]
        blocks[height][t] = data["time"]
        blocks[height]["blockTime"] = data["blockTime"]
        if len(blocks) < 2:
            continue
        if t == "begin-block":
            computrons = 0
        if t == "end-block-finish":
            if last_crank:
                blocks[height]["last-crank"] = last_crank
            idle_time = None
            block_time = None
            cosmos_time = blocks[height]["end-block-start"] - blocks[height]["begin-block"]
            swingset_time = blocks[height]["end-block-finish"] - blocks[height]["end-block-start"]
            lag = blocks[height]["begin-block"] - blocks[height]["blockTime"]
            if blocks[height-1]:
                idle_time = blocks[height]["begin-block"] - blocks[height-1]["end-block-finish"]
                block_time = blocks[height]["end-block-finish"] - blocks[height-1]["end-block-finish"]
                proc_time = blocks[height]["end-block-finish"] - blocks[height]["begin-block"]
                proc_frac = 1.0 * proc_time / block_time
                swingset_percentage = swingset_time / block_time
                cranks = None
                if "last-crank" in blocks[height-1]:
                    cranks = blocks[height]["last-crank"] - blocks[height-1]["last-crank"]
                chain_block_time = blocks[height]["blockTime"] - blocks[height-1]["blockTime"]
            sigs = count_signatures(height)
            recent_blocks.append([ height, cranks,
                                   block_time, proc_frac, cosmos_time, chain_block_time,
                                   swingset_time, swingset_percentage,
                                   lag, computrons, sigs])
            s.summarize()

