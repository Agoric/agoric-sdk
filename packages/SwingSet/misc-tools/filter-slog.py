#!/usr/bin/env python3

import sys, json

# Given a slogfile on stdin, emit a filtered subset to stdout. ARGV specifies
# the allowed types: each entry is a prefix, unless it starts with "=" in which
# case it specifies a complete match. For example:
#
#  zcat slog.gz | filter-slog.py cosmic-swingset- deliver =syscall
#
# will emit rows with .type= values of:
#  cosmic-swingset-run-start
#  cosmic-swingset-run-finish
#  deliver
#  deliver-result
#  syscall
# but will discard rows with:
#  syscall-result
#  console
#  clist

prefixes = []
exacts = []
for arg in sys.argv[1:]:
    if arg.startswith("="):
        exacts.append(arg[1:])
    else:
        prefixes.append(arg)

memo = {}
def check(t):
    res = memo.get(t)
    if res != None:
        return res
    for prefix in prefixes:
        if t.startswith(prefix):
            res = True
            break
    if res is None:
        res = t in exacts
    memo[t] = res
    return res

for line in sys.stdin:
    d = json.loads(line)
    if check(d["type"]):
        print(line, end="")

# create-vat
# vat-startup (-start, -finish)
# heap-snapshot-load, -save
# start-replay, ...,  finish-replay

# or ignore: clist, crank-start, crank-finish, syscall, syscall-result, console

