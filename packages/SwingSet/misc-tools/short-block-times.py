# feed this the output of block-times.py

# assume the chain performs cycles of (idle, busy, recovering), where
# 'idle' and 'recovering' have computrons=0, 'busy' has elevated block
# times, and 'recovering' has depressed block times. Also assume that
# the bootstrap block (not included in the output of block-times.py)
# is "busy", so we start out in the 'recovering' state.

import sys, csv
(RECOVERING, IDLE, BUSY, POSTBUSY) = ('recovering', 'idle', 'busy', 'post-busy')
state = RECOVERING
enter_height = None

fields = None
for row in csv.reader(sys.stdin):
    if not fields:
        fields = row
        continue
    data = dict(zip(fields, row))
    #print(data)
    height = int(data["height"])
    computrons = int(data["computrons"])
    block_time = float(data["block_time"])
    if enter_height is None:
        enter_height = height
    if computrons > 0:
        new_state = BUSY
    elif block_time < 5.0:
        new_state = RECOVERING
    elif block_time > 7.0:
        new_state = POSTBUSY
    else:
        new_state = IDLE
    if new_state != state:
        spent = height - enter_height
        print("b%5d: spent %d in %s, -> %s" % (height, spent, state, new_state))
        state = new_state
        enter_height = height
