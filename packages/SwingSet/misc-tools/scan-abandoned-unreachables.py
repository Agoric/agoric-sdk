#!/usr/bin/env python3

import sys, re

# Given stdin consisting of `${key}|${value}` lines (as from
# `sqlite3 -cmd 'SELECT * from kvStore;' swingstore.sqlite` with default
# configuration or `-list -separator '|'`), emit a list
# of krefs which are both:
# * not owned by any vat (i.e. they were abandoned by termination or upgrade)
# * not reachable by any vat (i.e. they are merely-recognizable == weakly-referenced)
#
# These are the krefs that https://github.com/Agoric/agoric-sdk/issues/7212 is
# about retiring.

ko_re = re.compile(r"^(ko\d+)\.(\w+)$")
owners = {}
reachable = set()
recognizable = set()
all_krefs = set()

for line in sys.stdin:
    key,value = line.strip().split("|", maxsplit=1)
    mo = ko_re.search(key)
    if mo:
        kref, sub = mo.groups()
        all_krefs.add(kref)
        if sub == "owner":
            owners[kref] = value
        if sub == "refCount":
            reach_count, recognize_count = map(int, value.split(","))
            if reach_count:
                reachable.add(kref)
            if recognize_count:
                recognizable.add(kref)

print("%d krefs" % len(all_krefs))
print("%d owned" % len(owners))
print("%d recognizable" % len(recognizable))
print("%d reachable" % len(reachable))

abandoned_unreachable = set()
for kref in all_krefs:
    if kref not in owners and kref not in reachable:
        abandoned_unreachable.add(kref)
print("%d abandoned unreachable" % len(abandoned_unreachable))
if len(abandoned_unreachable) < 10:
    print(abandoned_unreachable)

# as of run-17 (dec-2023), only ko111 (v9.c.ko111|_ o-54) is in this state
