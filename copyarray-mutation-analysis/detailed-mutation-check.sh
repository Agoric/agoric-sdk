#!/bin/bash
# Detailed analysis of potential readonly array mutations

echo "=== DETAILED MUTATION ANALYSIS ===" > /tmp/copyarray-analysis/27-detailed-analysis.txt

FILES=(
  "packages/internal/src/ses-utils.js"
  "packages/internal/src/testing-utils.js"
  "packages/telemetry/src/make-slog-sender.js"
  "packages/fast-usdc-contract/src/utils/settlement-matcher.ts"
  "packages/portfolio-contract/src/evm-facade.ts"
  "packages/orchestration/src/utils/viem-utils/hashTypedData.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "\n========================================" >> /tmp/copyarray-analysis/27-detailed-analysis.txt
    echo "FILE: $file" >> /tmp/copyarray-analysis/27-detailed-analysis.txt
    echo "========================================" >> /tmp/copyarray-analysis/27-detailed-analysis.txt
    
    # Show lines with readonly declarations
    echo -e "\n--- Readonly array declarations ---" >> /tmp/copyarray-analysis/27-detailed-analysis.txt
    grep -n "readonly.*\[\]" "$file" >> /tmp/copyarray-analysis/27-detailed-analysis.txt 2>&1 || echo "None found" >> /tmp/copyarray-analysis/27-detailed-analysis.txt
    
    # Show lines with mutations
    echo -e "\n--- Mutation operations ---" >> /tmp/copyarray-analysis/27-detailed-analysis.txt
    grep -n "\.push(\|\.pop(\|\.splice(\|\.shift(\|\.unshift(\|\.sort(\|\.reverse(" "$file" >> /tmp/copyarray-analysis/27-detailed-analysis.txt 2>&1 || echo "None found" >> /tmp/copyarray-analysis/27-detailed-analysis.txt
  fi
done

cat /tmp/copyarray-analysis/27-detailed-analysis.txt
