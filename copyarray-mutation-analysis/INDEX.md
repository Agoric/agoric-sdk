# CopyArray Mutation Analysis - File Index

This directory contains all intermediary files and artifacts from the analysis of CopyArray mutations in the Agoric SDK codebase.

## Analysis Files (in order of creation)

1. **PLAN.md** - Initial analysis plan and methodology
2. **01-copyarray-imports.txt** - Search for CopyArray imports
3. **02-all-copyarray-references.txt** - All CopyArray references found
4. **03-endo-copyarray.txt** - Search in @endo package imports
5. **04-types-copyarray.txt** - Search in types directory
6. **05-packages-dts-copyarray.txt** - Search in .d.ts files
7. **06-endo-definitions.txt** - Search in @endo node_modules
8. **07-copyarray-definitions.txt** - CopyArray type definitions
9. **08-jsdoc-type-copyarray.txt** - JSDoc @type with CopyArray
10. **09-ts-type-copyarray.txt** - TypeScript CopyArray types
11. **10-jsdoc-param-copyarray.txt** - JSDoc @param with CopyArray
12. **11-jsdoc-typedef-copyarray.txt** - JSDoc @typedef with CopyArray
13. **12-import-copyarray.txt** - @import statements with CopyArray
14. **13-phase1-summary.txt** - Phase 1 summary
15. **14-jsdoc-type-setvalue.txt** - JSDoc @type with SetValue
16. **15-ts-type-setvalue.txt** - TypeScript SetValue types
17. **16-jsdoc-param-setvalue.txt** - JSDoc @param with SetValue
18. **17-jsdoc-returns-setvalue.txt** - JSDoc @returns with SetValue
19. **18-import-setvalue.txt** - @import statements with SetValue
20. **19-phase2-summary.txt** - Phase 2 summary (5 files found)
21. **20-mutation-search-results.txt** - Mutation search in SetValue files
22. **21-array-type-annotations.txt** - Array type annotations in JSDoc
23. **22-ts-array-declarations.txt** - TypeScript array declarations
24. **23-readonly-arrays.txt** - Files with readonly array types
25. **24-jsdoc-readonly.txt** - JSDoc with readonly
26. **25-files-with-readonly.txt** - List of 20 files with readonly
27. **26-readonly-mutation-analysis.txt** - Mutation analysis results
28. **27-detailed-analysis.txt** - Detailed inspection of suspect files
29. **FINAL_REPORT.md** - Comprehensive final report
30. **INDEX.md** - This file

## Scripts Used

- **search-script.sh** - Phase 1 CopyArray search
- **search-setvalue.sh** - Phase 2 SetValue search
- **search-mutations.sh** - Phase 3 mutation pattern search
- **broad-search.sh** - Broader array type search
- **analyze-readonly-mutations.sh** - Readonly array analysis (v1, had bug)
- **analyze-readonly-mutations-v2.sh** - Fixed readonly array analysis
- **detailed-mutation-check.sh** - Detailed mutation verification

## Key Findings

- **CopyArray**: No direct usage in Agoric SDK source
- **SetValue**: 5 files use it, 0 mutations found
- **readonly arrays**: 20 files, 9 flagged for inspection, 0 violations confirmed
- **Total violations**: 0

See FINAL_REPORT.md for complete analysis.
