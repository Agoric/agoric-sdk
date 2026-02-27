# CopyArray Mutation Analysis Plan

## Understanding
- CopyArray is a type from @endo/pass-style representing pass-by-copy arrays
- It's not directly used much in the Agoric SDK codebase
- Related pattern: SetValue (deprecated array-based, basically a CopyArray of keys)
- Modern replacement: CopySet

## Search Strategy

### Phase 1: Find CopyArray Type Declarations
1. Search for JSDoc @type annotations with CopyArray
2. Search for TypeScript type annotations with CopyArray
3. Search for @param annotations with CopyArray
4. Search for variable declarations with CopyArray type

### Phase 2: Find SetValue (CopyArray equivalent) Usage
1. Search for SetValue type annotations
2. Search for variables typed as SetValue
3. Track these variables through code

### Phase 3: Identify Mutations
For each array declared as CopyArray or SetValue:
1. Check for .push() calls
2. Check for .pop() calls
3. Check for .shift() calls
4. Check for .unshift() calls
5. Check for .splice() calls
6. Check for array[index] = value assignments
7. Check for .sort() calls (in-place mutation)
8. Check for .reverse() calls (in-place mutation)
9. Check for .fill() calls

### Phase 4: Report Findings
Create a report with:
- File path
- Line number
- Variable name
- Type declaration
- Mutation location and type
