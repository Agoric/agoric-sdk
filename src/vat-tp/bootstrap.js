// this is just an example of what a mailbox-using machine must do in the
// bootstrap vat to glue together the three comms pieces (mailbox device,
// VatTP vat, comms vat).

export function doVatTPBootstrap(D, E, vats, devices) {
  D(devices.mailbox).registerInboundHandler(vats.vattp);
  E(vats.vattp).registerMailboxDevice(devices.mailbox);
  E(vats.comms).init(vats.vattp);
}
