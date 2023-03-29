import { Far } from '@endo/far';

export function buildRootObject(vatPowers, _vatParameters) {
  const { D } = vatPowers;
  return Far('root', {
    async bootstrap(vats, devices) {
      let got;
      try {
        // ideally, device nodes can round-trip through unrelated devices
        const second = D(devices.d6first).pleaseReturn(devices.d6second);
        got = second === devices.d6second;
      } catch (e) {
        // but deviceSlots.js cannot handle foreign device nodes yet, so we
        // expect a catchable device error. If/when deviceSlots is enhanced
        // to handle this, or if the target is raw device, this can start to
        // work.
        got = e;
      }
      return harden(['got', got]);
    },
  });
}
