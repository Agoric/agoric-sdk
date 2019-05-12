const testLogs = {
  'left does: E(right.0).method() => returnData': [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    'sendOverChannel from left, to: right message: {"target":{"type":"your-egress","id":0},"methodName":"method","args":[],"slots":[],"resultSlot":{"type":"your-resolver","id":2}}',
    'bootstrap call resolved to undefined',
    '=> right.method was invoked',
    'sendOverChannel from right, to: left: {"event":"notifyFulfillToData","promise":{"type":"your-promise","id":2},"args":"\\"called method\\"","slots":[]}',
    '=> left vat receives the returnedData: called method',
  ],
  'left does: E(right.1).method() => returnData': [
    '=> setup called',
    '=> bootstrap() called',
    'init called with name right',
    'init called with name left',
    'connect called with otherMachineName left, channelName channel',
    'connect called with otherMachineName right, channelName channel',
    'addEgress called with sender left, index 0, valslot [object Object]',
    'addIngress called with machineName right, index 0',
    '=> right.1.method was invoked',
    '=> left vat receives the returnedData: called method',
  ],
};

export default testLogs;
