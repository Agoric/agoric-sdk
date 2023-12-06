package types

const RouterKey = ModuleName // this was defined in your key.go file

type ReceiveInvokeEvent struct {
	Type        string         `json:"type"`  // VTRANSFER_INVOKE
	Event       string         `json:"event"` // callContract
	Call        ContractInvoke `json:"call"`
	BlockHeight int64          `json:"blockHeight"`
	BlockTime   int64          `json:"blockTime"`
}

type ContractInvoke struct {
	Contract string `json:"contract"`
	Method   string `json:"method"`
	Args     string `json:"args"`
}
