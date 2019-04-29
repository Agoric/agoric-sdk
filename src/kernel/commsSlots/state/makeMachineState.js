export function makeMachineState() {
  let myMachineName;
  let myProofMaterial;
  return {
    getMachineName() {
      return myMachineName;
    },
    getProofMaterial() {
      return myProofMaterial;
    },
    setMachineName(machineName) {
      myMachineName = machineName;
    },
    setProofMaterial(proofMaterial) {
      myProofMaterial = proofMaterial;
    },
    dump() {
      return JSON.stringify({
        myMachineName: `${myMachineName}`,
        myProofMaterial: `${myProofMaterial}`,
      });
    },
  };
}
