/**
 * ESLint rule: no-typedef-import
 *
 * Finds inline `import()` expressions inside `@typedef` declarations and replaces
 * them with a corresponding `@import` directive. This prevents generating new type aliases
 * and unwittingly exporting them from the module.
 *
 * If the module should be exporting the types, `@typedef` is still the only way in JSDoc
 * so disable this rule in those files.
 *
 * @see https://github.com/microsoft/typescript/issues/60831
 */

const LINE_REGEX =
  /^(\s*\*?\s*)@typedef\s+\{\s*import\((['"])([^'"]+)\2\)\.([A-Za-z0-9_$]+)([^}]*)\}\s+([A-Za-z0-9_$]+)(.*)$/;

const getConversionPlan = value => {
  const lines = value.split('\n');
  const convertible = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(LINE_REGEX);
    if (!match) {
      continue;
    }

    const [
      ,
      indent,
      quote,
      importPath,
      importedType,
      rawSuffix = '',
      ,
      // typedefName (unused),
      trailing = '',
    ] = match;

    if (rawSuffix && rawSuffix.trim() !== '') {
      continue; // skip typedefs that add generics or other suffixes
    }

    convertible.push({
      index,
      indent,
      quote,
      importPath,
      importedType,
      trailing,
    });
  }

  return { lines, convertible };
};

const transformCommentValue = value => {
  const { lines, convertible } = getConversionPlan(value);
  if (!convertible.length) {
    return null;
  }

  for (const {
    index,
    indent,
    quote,
    importPath,
    importedType,
    trailing,
  } of convertible) {
    const trailingText = trailing || '';
    lines[index] =
      `${indent}@import {${importedType}} from ${quote}${importPath}${quote};${trailingText}`;
  }

  return lines.join('\n');
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow inline import() expressions inside @typedef; prefer @import directives.',
      recommended: false,
    },
    fixable: 'code',
    schema: [],
    messages: {
      noTypedefImport:
        'Use an @import directive instead of an inline import() inside @typedef.',
    },
  },

  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type !== 'Block') {
            continue;
          }
          if (!comment.value.includes('@typedef')) {
            continue;
          }

          const { convertible } = getConversionPlan(comment.value);
          if (!convertible.length) {
            continue;
          }

          const { range, loc } = comment;
          if (!range) {
            continue;
          }

          const originalText = sourceCode.text.slice(range[0], range[1]);
          const reportLoc = loc ?? {
            start: sourceCode.getLocFromIndex(range[0]),
            end: sourceCode.getLocFromIndex(range[1]),
          };

          const descriptor = {
            loc: reportLoc,
            messageId: 'noTypedefImport',
            fix(fixer) {
              const newValue = transformCommentValue(comment.value);
              if (!newValue) {
                return null;
              }

              const newCommentText = originalText.replace(
                comment.value,
                newValue,
              );
              return fixer.replaceTextRange(range, newCommentText);
            },
          };

          context.report(descriptor);
        }
      },
    };
  },
};
