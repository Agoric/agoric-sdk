#!/bin/bash
# Analyze readonly array files for mutations

echo "=== Analyzing files with readonly arrays for mutations ==="

# Extract unique file paths from readonly arrays list
cat /tmp/copyarray-analysis/23-readonly-arrays.txt | cut -d: -f1 | sort -u > /tmp/copyarray-analysis/25-files-with-readonly.txt

echo "Found $(wc -l < /tmp/copyarray-analysis/25-files-with-readonly.txt) files with readonly arrays"

# For each file, check for mutation patterns
echo -e "\n=== Checking for mutations in readonly array files ===" > /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt

while IFS= read -r file; do
  if [ -f "$file" ]; then
    # Check if file has both readonly arrays AND mutations
    has_push=$(grep -c "\.push(" "$file" 2>/dev/null || echo 0)
    has_pop=$(grep -c "\.pop(" "$file" 2>/dev/null || echo 0)
    has_splice=$(grep -c "\.splice(" "$file" 2>/dev/null || echo 0)
    has_shift=$(grep -c "\.shift(" "$file" 2>/dev/null || echo 0)
    has_unshift=$(grep -c "\.unshift(" "$file" 2>/dev/null || echo 0)
    has_sort=$(grep -c "\.sort(" "$file" 2>/dev/null || echo 0)
    has_reverse=$(grep -c "\.reverse(" "$file" 2>/dev/null || echo 0)
    
    total=$((has_push + has_pop + has_splice + has_shift + has_unshift + has_sort + has_reverse))
    
    if [ $total -gt 0 ]; then
      echo "FILE: $file" >> /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
      [ $has_push -gt 0 ] && echo "  - .push(): $has_push occurrences" >> /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
      [ $has_pop -gt 0 ] && echo "  - .pop(): $has_pop occurrences" >> /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
      [ $has_splice -gt 0 ] && echo "  - .splice(): $has_splice occurrences" >> /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
      [ $has_shift -gt 0 ] && echo "  - .shift(): $has_shift occurrences" >> /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
      [ $has_unshift -gt 0 ] && echo "  - .unshift(): $has_unshift occurrences" >> /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
      [ $has_sort -gt 0 ] && echo "  - .sort(): $has_sort occurrences" >> /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
      [ $has_reverse -gt 0 ] && echo "  - .reverse(): $has_reverse occurrences" >> /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
    fi
  fi
done < /tmp/copyarray-analysis/25-files-with-readonly.txt

cat /tmp/copyarray-analysis/26-readonly-mutation-analysis.txt
