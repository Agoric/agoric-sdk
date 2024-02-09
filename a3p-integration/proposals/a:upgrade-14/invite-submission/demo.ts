#!/usr/bin/env tsx

import fsp from 'node:fs/promises';

function template(templateString, templateVars) {
  return new Function(`return \`${templateString}\``).call(templateVars);
}

const tpl = await fsp.readFile('./sendInvite.tpl', 'utf8');

const rendered = template(tpl, {
  address: 'tz1KqTpEZ7Yob7QbPE4Hy4Wo8fHG8LhKxZSx',
});

console.log(rendered);
