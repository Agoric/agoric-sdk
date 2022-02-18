// Copyright (C) 2019 Agoric, under Apache License 2.0

// These represent two functions that could be provided by different sources,
// but which we want to call polymorphically using the import manager.
const numIsEmpty = value => value === 0;

const listIsEmpty = list => list.length === 0;

export { numIsEmpty, listIsEmpty };
