export function makeGetNextImportID() {
  let nextImportID = 1;

  return {
    getNextImportID() {
      const id = nextImportID;
      nextImportID += 1;
      return id;
    },
    dump() {
      return JSON.stringify(nextImportID);
    },
  };
}
