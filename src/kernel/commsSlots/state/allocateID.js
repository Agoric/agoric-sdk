export function makeAllocateID() {
  let nextID = 1;

  return {
    allocateID() {
      const id = nextID;
      nextID += 1;
      return id;
    },
    dump() {
      return JSON.stringify(nextID);
    },
  };
}
