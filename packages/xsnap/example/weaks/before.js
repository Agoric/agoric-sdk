let weak = {};
const strong = {};

const wm = new WeakMap;
wm.set(weak, "weak");
wm.set(strong, "strong");

const ws = new WeakSet;
ws.add(weak);
ws.add(strong);

const wr0 = new WeakRef(weak);
const wr1 = new WeakRef(strong);

const fr = new FinalizationRegistry(value => {
  print("FinalizationRegistry:", value)
});
fr.register(weak, "weak");
fr.register(strong, "strong");



