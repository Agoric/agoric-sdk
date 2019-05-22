export function doVatTPBootstrap(D, E, vats, devices) {
  D(devices.mailbox).registerInboundHandler(vats.vattp);
  E(vats.vattp).registerMailboxDevice(devices.mailbox);
  E(vats.vattp).registerCommsHandler(vats.comms);
}
