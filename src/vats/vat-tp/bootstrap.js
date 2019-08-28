// this is just an example of what a mailbox-using machine must do in the
// bootstrap vat to glue together the three comms pieces (mailbox device,
// VatTP vat, comms vat).

export async function doVatTPBootstrap(D, E, vats, devices) {
  D(devices.mailbox).registerInboundHandler(vats.vattp);
  E(vats.vattp).registerMailboxDevice(devices.mailbox);
  const name = 'remote1';
  const { transmitter, setReceiver } = await E(vats.vattp).addRemote(name);
  const receiver = await E(vats.comms).addRemote(name, transmitter);
  await E(setReceiver).setReceiver(receiver);
}
