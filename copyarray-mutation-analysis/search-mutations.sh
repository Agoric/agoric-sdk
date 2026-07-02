#!/bin/bash
# Phase 3: Search for array mutations

echo "=== Searching for array mutations in files with SetValue/CopyArray types ==="

FILES=(
  "packages/ERTP/src/amountMath.js"
  "packages/ERTP/src/mathHelpers/setMathHelpers.js"
  "packages/ERTP/src/typeGuards.js"
  "packages/notifier/tools/testSupports.js"
  "packages/zoe/test/unitTests/setupNonFungibleMints.js"
)

echo "Analyzing ${#FILES[@]} files for mutations..."

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "\n=== File: $file ==="
    
    # Search for various mutation patterns
    echo "--- Looking for .push() ---"
    grep -n "\.push(" "$file" || echo "None found"
    
    echo "--- Looking for .pop() ---"
    grep -n "\.pop(" "$file" || echo "None found"
    
    echo "--- Looking for .shift() ---"
    grep -n "\.shift(" "$file" || echo "None found"
    
    echo "--- Looking for .unshift() ---"
    grep -n "\.unshift(" "$file" || echo "None found"
    
    echo "--- Looking for .splice() ---"
    grep -n "\.splice(" "$file" || echo "None found"
    
    echo "--- Looking for array[index] = ---"
    grep -n "\[[^]]*\]\s*=" "$file" || echo "None found"
    
    echo "--- Looking for .sort() ---"
    grep -n "\.sort(" "$file" || echo "None found"
    
    echo "--- Looking for .reverse() ---"
    grep -n "\.reverse(" "$file" || echo "None found"
    
    echo "--- Looking for .fill() ---"
    grep -n "\.fill(" "$file" || echo "None found"
  fi
done > /tmp/copyarray-analysis/20-mutation-search-results.txt

cat /tmp/copyarray-analysis/20-mutation-search-results.txt
