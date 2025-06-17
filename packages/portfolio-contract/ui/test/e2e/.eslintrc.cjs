const path = require('path');
const cwd = process.cwd();
const directories = cwd.split(path.sep);
directories.pop();
const updatedPath = directories.join(path.sep);
const synpressPath = path.join(updatedPath, '/node_modules/@agoric/synpress');

module.exports = {
  extends: `${synpressPath}/.eslintrc.js`,
};
