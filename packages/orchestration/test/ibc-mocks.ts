const responses = {
  // MsgDelegateResponse {}
  delegate:
    'eyJyZXN1bHQiOiJFaTBLS3k5amIzTnRiM011YzNSaGEybHVaeTUyTVdKbGRHRXhMazF6WjBSbGJHVm5ZWFJsVW1WemNHOXVjMlU9In0=',
  // QueryBalanceResponse 0 uatom
  queryBalance:
    'eyJyZXN1bHQiOiJleUprWVhSaElqb2lRMmMwZVVSQmIwdERaMVl4V1ZoU2RtSlNTVUpOUVQwOUluMD0ifQ==',
  // {"error":"ABCI code: 5: error handling packet: see events for details"}
  error5:
    'eyJlcnJvciI6IkFCQ0kgY29kZTogNTogZXJyb3IgaGFuZGxpbmcgcGFja2V0OiBzZWUgZXZlbnRzIGZvciBkZXRhaWxzIn0=',
};

export const protoMsgMocks = {
  delegate: {
    // delegate 10 uatom from cosmos1test to cosmosvaloper1test
    msg: 'eyJ0eXBlIjoxLCJkYXRhIjoiQ2xVS0l5OWpiM050YjNNdWMzUmhhMmx1Wnk1Mk1XSmxkR0V4TGsxelowUmxiR1ZuWVhSbEVpNEtDMk52YzIxdmN6RjBaWE4wRWhKamIzTnRiM04yWVd4dmNHVnlNWFJsYzNRYUN3b0ZkV0YwYjIwU0FqRXciLCJtZW1vIjoiIn0=',
    ack: responses.delegate,
  },
  queryBalance: {
    // query balance of uatom for cosmos1test
    msg: 'eyJkYXRhIjoiQ2pvS0ZBb0xZMjl6Ylc5ek1YUmxjM1FTQlhWaGRHOXRFaUl2WTI5emJXOXpMbUpoYm1zdWRqRmlaWFJoTVM1UmRXVnllUzlDWVd4aGJtTmwiLCJtZW1vIjoiIn0=',
    ack: responses.queryBalance,
  },
  error: {
    ack: responses.error5,
  },
};

export function defaultMockAck(packetData: string): string {
  switch (packetData) {
    case protoMsgMocks.delegate.msg:
      return protoMsgMocks.delegate.ack;
    case protoMsgMocks.queryBalance.msg:
      return protoMsgMocks.queryBalance.ack;
    default:
      return protoMsgMocks.error.ack;
  }
}
