
//export function createVatFromSource(source/*, syscall*/) @ "createVatFromSource1";

export class Vat @ "xs_Vat_destructor" {
  constructor(source) @ "xs_Vat";

  _sendToVat(deliveryString) @ "xs_Vat_sendToVat";
  sendToVat(delivery) {
    return JSON.parse(this._sendToVat(JSON.stringify(delivery)));
  }

  //createSnapshot() @ "xs_Vat_createSnapshot";
  //deleteVat() @ "xs_Vat_deleteVat; // TODO explicit GC??
};
