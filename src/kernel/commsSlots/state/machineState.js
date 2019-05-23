export function makeMachineState() {
  let vattp;
  return {
    getVatTP() {
      return vattp;
    },
    setVatTP(v) {
      vattp = v;
    },
    dump() {
      return JSON.stringify({});
    },
  };
}
