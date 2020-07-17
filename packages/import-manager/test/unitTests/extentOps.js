// Copyright (C) 2019 Agoric, under Apache License 2.0

// These represent two functions that could be provided by different sources,
// but which we want to call polymorphically using the import manager.
function numIsEmpty(value) {
  return value === 0;
}

function listIsEmpty(list) {
  return list.length === 0;
}

export { numIsEmpty, listIsEmpty };
