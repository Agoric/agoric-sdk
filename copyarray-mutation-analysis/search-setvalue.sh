#!/bin/bash
# Phase 2: Search for SetValue (CopyArray equivalent) usage

echo "=== Searching for SetValue in @type annotations ==="
grep -rn "@type.*{.*SetValue" --include="*.js" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/14-jsdoc-type-setvalue.txt

echo -e "\n=== Searching for SetValue in TypeScript type annotations ==="
grep -rn ":\s*SetValue" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/15-ts-type-setvalue.txt

echo -e "\n=== Searching for SetValue in @param annotations ==="
grep -rn "@param.*{.*SetValue" --include="*.js" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/16-jsdoc-param-setvalue.txt

echo -e "\n=== Searching for SetValue in @returns annotations ==="
grep -rn "@returns.*{.*SetValue" --include="*.js" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/17-jsdoc-returns-setvalue.txt

echo -e "\n=== Searching for SetValue in @import statements ==="
grep -rn "@import.*SetValue" --include="*.js" --include="*.ts" packages/ 2>/dev/null | tee /tmp/copyarray-analysis/18-import-setvalue.txt

echo -e "\n=== Summary of Phase 2 ==="
echo "Files found with SetValue type declarations:"
cat /tmp/copyarray-analysis/14-jsdoc-type-setvalue.txt /tmp/copyarray-analysis/15-ts-type-setvalue.txt /tmp/copyarray-analysis/16-jsdoc-param-setvalue.txt /tmp/copyarray-analysis/17-jsdoc-returns-setvalue.txt /tmp/copyarray-analysis/18-import-setvalue.txt 2>/dev/null | cut -d: -f1 | sort -u | tee /tmp/copyarray-analysis/19-phase2-summary.txt
wc -l /tmp/copyarray-analysis/19-phase2-summary.txt
