#!/bin/bash
# Phase 1: Search for CopyArray type declarations

echo "=== Searching for CopyArray in JSDoc @type annotations ==="
grep -rn "@type.*{.*CopyArray" --include="*.js" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/08-jsdoc-type-copyarray.txt

echo -e "\n=== Searching for CopyArray in TypeScript type annotations ==="
grep -rn ":\s*CopyArray" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/09-ts-type-copyarray.txt

echo -e "\n=== Searching for CopyArray in @param annotations ==="
grep -rn "@param.*{.*CopyArray" --include="*.js" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/10-jsdoc-param-copyarray.txt

echo -e "\n=== Searching for CopyArray in @typedef annotations ==="
grep -rn "@typedef.*{.*CopyArray" --include="*.js" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/11-jsdoc-typedef-copyarray.txt

echo -e "\n=== Searching for CopyArray in @import statements ==="
grep -rn "@import.*CopyArray" --include="*.js" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/12-import-copyarray.txt

echo -e "\n=== Summary of Phase 1 ==="
echo "Files found with CopyArray type declarations:"
cat /tmp/copyarray-analysis/08-jsdoc-type-copyarray.txt /tmp/copyarray-analysis/09-ts-type-copyarray.txt /tmp/copyarray-analysis/10-jsdoc-param-copyarray.txt /tmp/copyarray-analysis/11-jsdoc-typedef-copyarray.txt /tmp/copyarray-analysis/12-import-copyarray.txt 2>/dev/null | cut -d: -f1 | sort -u | tee /tmp/copyarray-analysis/13-phase1-summary.txt
