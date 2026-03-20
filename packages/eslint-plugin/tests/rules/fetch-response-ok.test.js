const { RuleTester } = require('eslint');
const rule = require('../../src/rules/fetch-response-ok.js');

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('fetch-response-ok', rule, {
  valid: [
    {
      code: `
async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw Error('bad response');
  }
  return response.json();
}
`,
    },
    {
      code: `
async function readText(url) {
  const response = await globalThis.fetch(url);
  const ok = response.ok;
  if (!ok) {
    throw Error('bad response');
  }
  return response.text();
}
`,
    },
    {
      code: `
function passthrough(url) {
  const promise = fetch(url);
  return promise.then(x => x);
}
`,
    },
  ],
  invalid: [
    {
      code: `
async function readJson(url) {
  const response = await fetch(url);
  return response.json();
}
`,
      errors: [{ messageId: 'fetchResponseOk' }],
    },
    {
      code: `
async function getStatus(url) {
  const response = await fetch(url);
  const status = response.status;
  if (!response.ok) {
    throw Error(status);
  }
}
`,
      errors: [{ messageId: 'fetchResponseOk' }],
    },
  ],
});
