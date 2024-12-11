/**
 * ESLint rule: group-jsdoc-imports
 *
 * Moves inline JSDoc type imports (e.g. \@type {import('foo').Bar})
 * into a top-level JSDoc block with \@import lines, then references the
 * import by name (e.g. \@type {Bar}).
 *
 * Usage example in your .eslintrc.js:
 *
 *  {
 *    "plugins": ["@agoric"],
 *    "rules": {
 *      "@agoric/group-jsdoc-imports": "warning"
 *    }
 *  }
 *
 * @type {import('eslint').Rule.RuleModule}
 */
/**
 * ESLint rule: group-jsdoc-imports (one-fix-per-inline-import version)
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Move inline type import to top-level JSDoc import block',
      category: 'Stylistic Issues',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          paths: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      moveInline: 'Move inline type import to top-level JSDoc import block',
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const { paths: allowedPaths = [] } = context.options[0] || {};

    // Use the `g` flag so we can match multiple inline imports in one comment.
    const INLINE_IMPORT_REGEX =
      /import\(['"]([^'"]+)['"]\)\.([A-Za-z0-9_$]+(?:<[A-Za-z0-9_<>{},\s]+>)?)/g;

    function isAllowedPath(importPath) {
      if (!allowedPaths.length) {
        return true; // no filtering if no paths configured
      }
      return allowedPaths.some(prefix => importPath.startsWith(prefix));
    }

    /**
     * Finds an existing top-level @import block comment (one that contains "@import")
     * or returns `null` if none exists.
     */
    function findTopBlockComment(allComments) {
      for (const comment of allComments) {
        if (comment.type === 'Block') {
          // Rebuild with the /* ... */ so we can search for "@import"
          const text = `/*${comment.value}*/`;
          if (text.includes('@import ')) {
            return comment;
          }
        }
      }
      return null;
    }

    /**
     * Checks if the doc block already imports a specific type from a path,
     * returning `true` if found.
     */
    function alreadyHasImport(blockValue, typeName, importPath) {
      // blockValue is the text inside /* ... */
      // Look for lines like: @import {Type} from 'xyz'
      // Possibly could handle multiple types in one line, but let's keep it simple:
      const lines = blockValue.split('\n');
      for (const line of lines) {
        const m = line.match(/@import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
        if (m) {
          const importedTypes = m[1].split(',').map(s => s.trim());
          const fromPath = m[2];
          if (fromPath === importPath && importedTypes.includes(typeName)) {
            return true; // Found a matching import already
          }
        }
      }
      return false;
    }

    const allComments = sourceCode.getAllComments();

    // Walk all block comments and look for inline imports.
    for (const comment of allComments) {
      if (comment.type !== 'Block') {
        continue;
      }
      const { value: commentText } = comment;

      // We collect all matches in this comment for `import('...').SomeType`
      const matches = [...commentText.matchAll(INLINE_IMPORT_REGEX)];
      for (const match of matches) {
        const [fullMatch, importPath, typeName] = match;
        if (!isAllowedPath(importPath)) {
          continue; // skip if path is not in allowedPaths
        }

        // We have an inline import. We'll report exactly one error
        // for *this* inline import. The fix will:
        // 1) Insert/update the doc block
        // 2) Remove inline usage from this comment
        context.report({
          loc: comment.loc,
          messageId: 'moveInline',
          fix: fixer => {
            // We'll build a set of fix operations for both the doc block
            // (somewhere in the file) and this inline usage.
            const fixOps = [];

            // (a) We locate or create a top-level block
            const topBlockComment = findTopBlockComment(allComments);

            if (!topBlockComment) {
              // If no block with @import found, create a new block at top
              const lines = [
                '/**',
                ` * @import {${typeName}} from '${importPath}';`,
                ' */\n',
              ];
              // Insert at the very start of the file:
              fixOps.push(
                fixer.insertTextBeforeRange([0, 0], lines.join('\n')),
              );
            } else {
              // If we do have a block, ensure it includes `@import {typeName} from 'importPath'`
              const originalLines = topBlockComment.value.split('\n');

              // Only add if it's not already imported
              if (
                !alreadyHasImport(topBlockComment.value, typeName, importPath)
              ) {
                // Insert a new line with that import just before final '*/'
                const newLines = [...originalLines];
                const lastLineIndex = newLines.length - 1;
                newLines.splice(
                  lastLineIndex,
                  0,
                  `* @import {${typeName}} from '${importPath}';`,
                );
                const newCommentValue = newLines.join('\n');
                fixOps.push(
                  fixer.replaceTextRange(
                    [topBlockComment.range[0], topBlockComment.range[1]],
                    `/*${newCommentValue}*/`,
                  ),
                );
              }
            }

            // (b) Remove the inline usage from *this* comment
            // Replace `import('...').Foo` → `Foo`
            const updatedCommentText = commentText.replace(fullMatch, typeName);
            fixOps.push(
              fixer.replaceTextRange(
                [comment.range[0], comment.range[1]],
                `/*${updatedCommentText}*/`,
              ),
            );

            return fixOps;
          },
        });
      }
    }

    // We do NOT do anything in Program:exit, because each inline usage
    // is already handled in a single fix above.
    return {};
  },
};
