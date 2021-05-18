#!/bin/bash

for name in nothing list hardList listHard; do
    for branding in BOTH POSITIVE NEGATIVE; do
        # 'listHard' is the most time consuming, 10000 takes 90s
        for count in 10 100 1000 10000; do
            node -r esm ./t-node-perf.js $branding $name $count |grep -v "Removing"
        done
    done
done
