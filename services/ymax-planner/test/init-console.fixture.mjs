import '../src/init.js';

const err = Error('something');
assert.note(err, assert.details`caused by ${Error('something else')}, eh?`);
console.log('My error:', err, '> you like?');
