#!/bin/bash
# Broader search for array type annotations and mutations

echo "=== Searching for array type annotations in JSDoc ==="
# Look for @type {Array, @type {string[], etc. in JSDoc
grep -rn "@type\s*{.*\[\]" --include="*.js" --include="*.ts" packages/ 2>/dev/null | head -100 > /tmp/copyarray-analysis/21-array-type-annotations.txt
wc -l /tmp/copyarray-analysis/21-array-type-annotations.txt

echo -e "\n=== Searching for const/let/var with array types ==="
# Look for variable declarations with array types
grep -rn ":\s*[A-Z][a-zA-Z]*\[\]" --include="*.ts" packages/ 2>/dev/null | head -100 > /tmp/copyarray-analysis/22-ts-array-declarations.txt
wc -l /tmp/copyarray-analysis/22-ts-array-declarations.txt

echo -e "\n=== Looking for 'readonly' array annotations ==="
grep -rn "readonly.*\[\]" --include="*.ts" --include="*.js" packages/ 2>/dev/null | head -50 > /tmp/copyarray-analysis/23-readonly-arrays.txt
wc -l /tmp/copyarray-analysis/23-readonly-arrays.txt

echo -e "\n=== Looking for @type with 'readonly' ==="
grep -rn "@type.*readonly" --include="*.js" packages/ 2>/dev/null | head -50 > /tmp/copyarray-analysis/24-jsdoc-readonly.txt
wc -l /tmp/copyarray-analysis/24-jsdoc-readonly.txt
