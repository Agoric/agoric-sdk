import test from 'ava';
import {
  defangEvaluableCode,
  compartmentEvaluate,
} from '../scripts/clean-core-eval.js';

test('defangEvaluableCode is working', t => {
  const samples = [
    [''],
    [
      `\n// <!-- foo\n\n`,
      `\n// <\\!-- foo\n\n`,
      { message: /\(SES_HTML_COMMENT_REJECTED\)/ },
    ],
    [
      `\n// --> foo\n\n`,
      `\n// --\\> foo\n\n`,
      { message: /\(SES_HTML_COMMENT_REJECTED\)/ },
    ],
    [
      `\n\`import('foo')\`\n`,
      `\n\`import\\('foo')\`\n`,
      { message: /\(SES_IMPORT_REJECTED\)/ },
    ],
    [
      `\n123; import('foo')\n`,
      `\n123; import\\('foo')\n`,
      { message: /\(SES_IMPORT_REJECTED\)/ },
      { message: /Invalid or unexpected token/ },
    ],
  ];
  for (const [
    code,
    transformed,
    originalExpected,
    defangedExpected,
  ] of samples) {
    const defanged = defangEvaluableCode(code);
    if (originalExpected) {
      // Transform is necessary, and the original code throws.
      t.is(defanged, transformed);
      t.throws(() => compartmentEvaluate(code), originalExpected);
    } else {
      // No transform is necessary, and the code doesn't throw.
      t.is(defanged, code);
      t.notThrows(() => compartmentEvaluate(code));
    }
    if (defangedExpected) {
      t.throws(() => compartmentEvaluate(defanged), defangedExpected);
    } else {
      // The transformed code doesn't throw.
      t.notThrows(() => compartmentEvaluate(defanged));
    }
  }
});
