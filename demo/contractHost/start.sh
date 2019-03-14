#!/bin/sh

export VAT=../../bin/vat
# todo: only mkdir this if it doesn't exist yet
mkdir out

# edit driver/argv.json to control which example is run

for i in alice bob driver host mint; do
 $VAT run $i >out/$i 2>&1 &
done

echo "all vats launched"

# now 'grep ++ out/*' until you see "DONE" in driver/out
