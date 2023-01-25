#!/bin/bash
set -o xtrace
SCRIPT_DIR=$( cd ${0%/*} && pwd -P )

for pkg in ./packages/*/_testoutput.txt
do
    echo "processing $pkg"
    junit=$(dirname "$pkg")/junit.xml
    echo "dest $junit"
    $SCRIPT_DIR/ava-etap-to-junit.mjs $pkg > $junit
done
