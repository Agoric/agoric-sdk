#!/bin/bash
set -o xtrace
SCRIPT_DIR=$( cd ${0%/*} && pwd -P )

for pkg in ./packages/*/_testoutput.txt
do
    # skip if unable to expand if there are no test files
    if [[ $pkg != "./packages/*/_testoutput.txt" ]]; then
        echo "processing $pkg"
        junit=$(dirname "$pkg")/junit.xml
        echo "dest $junit"
        $SCRIPT_DIR/ava-etap-to-junit.mjs $pkg > $junit
    fi
done
