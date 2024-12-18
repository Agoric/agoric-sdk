#!/bin/sh

# run in the background with:
#  cd run-NN
#  ../process.sh NN </dev/null >process.out 2>&1 &
#
# if you omit the </dev/null and logout , the python commands will fail in
# init_sys_streams as it tries to open the missing stdin
#
#Fatal Python error: init_sys_streams: can't initialize sys standard streams
#Python runtime state: core initialized
#OSError: [Errno 9] Bad file descriptor
#Current thread 0x00000001e8b24c00 (most recent call first):
#  <no Python frame>

# exit on any error
set -e
# error on undefined variables
set -u
# print command before execution
set -x
# exit on command pipe failure
set -o pipefail

# $@ is the run number
FULL_COMPRESSED=run-$@-swingstore.sqlite.gz
TMPDB=ss.sqlite
PRUNED=run-$@-swingstore-pruned.sqlite
PRUNED_COMPRESSED=${PRUNED}.gz

if [ ! -f ${FULL_COMPRESSED} ]; then
  echo "missing run-NN-swingstore.sqlite.gz (${FULL_COMPRESSED}), bailing"
  exit 1
fi

echo "decompressing.."
gzcat ${FULL_COMPRESSED} > ${TMPDB}

echo "measuring size-full.."
python3 ../size-report.py ${TMPDB} | tee size-full.json

# this takes several hours
echo "pruning (takes several hours).."
time node ~/stuff/agoric/agoric-sdk/packages/swing-store/misc-tools/prune-transcripts.js ${TMPDB} --vacuum-into ${PRUNED}
rm ${TMPDB}

echo "measuring size-pruned.."
python3 ../size-report.py ${PRUNED} | tee size-pruned.json

echo "using categorize-kvstore.js to create kvdata.json.."
node ~/stuff/agoric/agoric-sdk/packages/SwingSet/misc-tools/categorize-kvstore.js --datafile kvdata.json ingest ${PRUNED}

echo "using extract-clist-db.js to create clist.sqlite.."
node ~/stuff/agoric/agoric-sdk/packages/SwingSet/misc-tools/extract-clist-db.js ${PRUNED} clist.sqlite

echo "extracting #8400/#8401 counts"
python3 ../do-clist.py kvdata.json clist.sqlite

echo "extracting whole kvStore"
sqlite3 ${PRUNED} 'select * from kvStore' | sort | gzip > all-kv.txt.gz

echo "compressing kvdata.json.."
gzip kvdata.json

echo "compressing clist.sqlite.."
gzip clist.sqlite

echo "compressing to ${PRUNED_COMPRESSED} .."
gzip ${PRUNED}

echo "Done"
