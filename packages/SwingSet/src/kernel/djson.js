function replacer(_, val) {
  if (typeof val === 'object') {
    const sortedObject = {};
    const names = Array.from(Object.getOwnPropertyNames(val));
    names.sort();
    for (const name of names) {
      sortedObject[name] = val[name];
    }
    return sortedObject;
  }
  return val;
}

function stringify(val) {
  return JSON.stringify(val, replacer);
}

function parse(s) {
  return JSON.parse(s);
}

export default { stringify, parse };
