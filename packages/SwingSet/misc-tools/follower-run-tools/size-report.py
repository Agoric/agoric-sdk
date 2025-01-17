#!/usr/bin/env python3

import os, sys, json
import sqlite3

dbfile = sys.argv[1]
db = sqlite3.connect(dbfile)
def db_exec(stmt):
    return db.execute(stmt).fetchone()[0]

NUM_SNAPSHOTS = "SELECT count(compressedSize) FROM snapshots WHERE compressedSnapshot is not null"
SNAPSHOTS = "SELECT sum(compressedSize) FROM snapshots WHERE compressedSnapshot is not null"

NUM_KVSTORE = "SELECT count(*) FROM kvStore"
KVSTORE = "SELECT sum(length(key)+length(value)) FROM kvStore"

NUM_BUNDLES = "SELECT count(bundle) FROM bundles"
BUNDLES = "SELECT sum(length(bundle)) FROM bundles"

NUM_TRANSCRIPT_SPANS = "SELECT count(*) FROM transcriptSpans"
NUM_TRANSCRIPTS = "SELECT count(*) FROM transcriptItems"
TRANSCRIPTS = "SELECT sum(length(item)) FROM transcriptItems"

sizes = {}

sizes["file_size"] = os.stat(dbfile).st_size

sizes["swingset_snapshot_size"] = db_exec(SNAPSHOTS)                    #    430ms
sizes["swingset_snapshot_count"] = db_exec(NUM_SNAPSHOTS)               #    460ms

sizes["swingset_kvstore_count"] = db_exec(NUM_KVSTORE)                  #     95ms
sizes["swingset_kvstore_size"] = db_exec(KVSTORE) # slow

sizes["swingset_bundle_count"] = db_exec(NUM_BUNDLES)                   #     21ms
sizes["swingset_bundle_size"] = db_exec(BUNDLES)                        #      3ms

sizes["swingset_transcript_span_count"] = db_exec(NUM_TRANSCRIPT_SPANS) #      7ms
sizes["swingset_transcript_count"] = db_exec(NUM_TRANSCRIPTS)           #    550ms
sizes["swingset_transcript_size"] = db_exec(TRANSCRIPTS) # slow

print(json.dumps(sizes, indent=1))
