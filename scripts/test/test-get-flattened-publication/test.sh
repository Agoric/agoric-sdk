#!/bin/bash
FILE="$(realpath "$BASH_SOURCE")"
cd "$(dirname "$FILE")"
export PATH="./bin:$PATH"

failed=0

out="$(RESPONSE=NAKED ../../get-flattened-publication.sh HOST STORAGE_KEY)"
if [ "$out" != "$(cat fixtures/flattened-naked.json)" ]; then
  failed=1
  echo 'Output did not match expectations for a naked result.'
  printf '%s\n' "$out" | ${DIFF:-diff -u} fixtures/flattened-naked.json - || true
fi

out="$(RESPONSE=STREAM_CELL ../../get-flattened-publication.sh HOST STORAGE_KEY)"
if [ "$out" != "$(cat fixtures/flattened-streamcell.json)" ]; then
  failed=1
  echo 'Output did not match expectations for a stream cell result.'
  printf '%s\n' "$out" | ${DIFF:-diff -u} fixtures/flattened-streamcell.json - || true
fi

out="$(RESPONSE=STREAM_CELL ../../get-flattened-publication.sh HOST STORAGE_KEY QUERY_HEIGHT)"
if [ $? -ne 0 ]; then
  failed=1
  echo 'Optional query height argument was not accepted.'
fi

out="$(RESPONSE=STREAM_CELL ../../get-flattened-publication.sh HOST STORAGE_KEY QUERY_HEIGHT EXTRA 2>&1)"
if [ $? -eq 0 ]; then
  failed=1
  echo 'Extra argument was not rejected.'
fi

[ $failed = 1 ] && exit 1
echo 'get-flattened-publication.sh tests passed!' >&2

