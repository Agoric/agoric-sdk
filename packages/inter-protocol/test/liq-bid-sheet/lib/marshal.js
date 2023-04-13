export const Far = (iface, methods) => {
  const r = Object.create({ toStringTag: `Alleged: ${iface}` });
  Object.assign(r, methods);
  return harden(r);
};
