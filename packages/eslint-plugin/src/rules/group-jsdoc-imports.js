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

module.exports = {
  meta: {
    type: /** @type {const} */ ('suggestion'),
    docs: {
      description: 'Move inline type import to top-level JSDoc import block',
      category: 'Stylistic Issues',
      recommended: false,
    },
    fixable: /** @type {const} */ ('code'),
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
      if (
        importPath.startsWith('./') ||
        importPath.startsWith('../') ||
        importPath === '.' ||
        importPath === '..'
      ) {
        return true; // always allow relative paths
      }
      if (!allowedPaths.length) {
        return true; // no filtering if no paths configured
      }
      return allowedPaths.some(prefix => importPath.startsWith(prefix));
    }

    /**
     * Finds an existing top-level `@import` block comment (one that contains "@import")
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

    const buildImportLine = (typeName, importPath) =>
      ` * @import {${typeName}} from '${importPath}';\n`;

    const buildNewBlock = (typeName, importPath) =>
      ['/**', buildImportLine(typeName, importPath).trimEnd(), ' */', ''].join(
        '\n',
      );

    const appendImportToComment = (commentNode, typeName, importPath) => {
      const existingText = sourceCode.getText(commentNode);
      const closingIndex = existingText.lastIndexOf('*/');
      const importLine = buildImportLine(typeName, importPath);

      if (closingIndex === -1) {
        return `${existingText}\n${importLine}`;
      }

      const beforeCloseFull = existingText.slice(0, closingIndex);
      const lastNewlineIndex = beforeCloseFull.lastIndexOf('\n');
      let beforeClose = beforeCloseFull;
      let closingIndent = '';

      if (lastNewlineIndex !== -1) {
        const tail = beforeCloseFull.slice(lastNewlineIndex + 1);
        if (/^[\t ]*$/.test(tail)) {
          closingIndent = tail;
          beforeClose = beforeCloseFull.slice(0, lastNewlineIndex + 1);
        }
      } else {
        beforeClose = beforeCloseFull.trimEnd();
      }

      const suffixIndent =
        closingIndent !== ''
          ? closingIndent
          : existingText.startsWith('/*')
            ? ' '
            : '';
      const suffix = `${suffixIndent}${existingText.slice(closingIndex)}`;
      const needsNewline = beforeClose.endsWith('\n') ? '' : '\n';

      return `${beforeClose}${needsNewline}${importLine}${suffix}`;
    };

    const advancePastWhitespaceNewline = startIndex => {
      const match = sourceCode.text.slice(startIndex).match(/^[^\S\r\n]*\r?\n/);
      if (match) {
        return { matched: true, nextIndex: startIndex + match[0].length };
      }
      return { matched: false, nextIndex: startIndex };
    };

    const getNewBlockInsertPlacement = () => {
      const programBody = sourceCode.ast.body || [];
      const importNodes = programBody.filter(
        node => node.type === 'ImportDeclaration',
      );
      const firstContentIndex = sourceCode.text.search(/\S/);
      let insertIndex = firstContentIndex === -1 ? 0 : firstContentIndex;
      let prefix = '';
      let needsTrailingBlankLine = false;

      if (importNodes.length) {
        insertIndex = importNodes[importNodes.length - 1].range[1];

        let step = advancePastWhitespaceNewline(insertIndex);
        const hasNewlineAfterImports = step.matched;
        insertIndex = step.nextIndex;

        step = advancePastWhitespaceNewline(insertIndex);
        const hasBlankLine = step.matched;
        insertIndex = step.nextIndex;

        if (!hasNewlineAfterImports) {
          prefix += '\n';
        }
        if (!hasBlankLine) {
          prefix += '\n';
        } else {
          needsTrailingBlankLine = true;
        }
      } else {
        const blankLineMatch = /\r?\n[^\S\r\n]*\r?\n/.exec(sourceCode.text);
        if (blankLineMatch) {
          insertIndex = blankLineMatch.index + blankLineMatch[0].length;
          needsTrailingBlankLine = true;
        }
      }

      return { insertIndex, prefix, needsTrailingBlankLine };
    };

    // Walk all block comments and look for inline imports.
    for (const comment of allComments) {
      if (comment.type !== 'Block') {
        continue;
      }
      const { value: commentText } = comment;

      // We collect all matches in this comment for `import('...').SomeType`
      const matches = [...commentText.matchAll(INLINE_IMPORT_REGEX)];
      for (const match of matches) {
        const [fullMatch, importPath, rawTypeName] = match;
        if (!isAllowedPath(importPath)) {
          continue; // skip if path is not in allowedPaths
        }
        const typeName =
          typeof rawTypeName === 'string'
            ? rawTypeName
            : String(rawTypeName ?? '');
        const importTypeName = typeName.includes('<')
          ? typeName.slice(0, typeName.indexOf('<'))
          : typeName;

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
              const {
                insertIndex,
                prefix: newBlockPrefix,
                needsTrailingBlankLine,
              } = getNewBlockInsertPlacement();
              const trailingSpacer = needsTrailingBlankLine ? '\n' : '';
              fixOps.push(
                fixer.insertTextBeforeRange(
                  [insertIndex, insertIndex],
                  `${newBlockPrefix}${buildNewBlock(importTypeName, importPath)}${trailingSpacer}`,
                ),
              );
            } else {
              // If we do have a block, ensure it includes `@import {typeName} from 'importPath'`
              if (
                !alreadyHasImport(
                  topBlockComment.value,
                  importTypeName,
                  importPath,
                )
              ) {
                fixOps.push(
                  fixer.replaceTextRange(
                    topBlockComment.range,
                    appendImportToComment(
                      topBlockComment,
                      importTypeName,
                      importPath,
                    ),
                  ),
                );
              }
            }

            // (b) Remove the inline usage from *this* comment
            // Replace `import('...').Foo` → `Foo`
            const inlineStart =
              comment.range[0] +
              2 +
              (match.index ?? commentText.indexOf(fullMatch));
            fixOps.push(
              fixer.replaceTextRange(
                [inlineStart, inlineStart + fullMatch.length],
                typeName,
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
