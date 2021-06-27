package types

const RouterKey = ModuleName // this was defined in your key.go file

type VbankSingleBalanceUpdate struct {
	Address string `json:"address"`
	Denom   string `json:"denom"`
	Amount  string `json:"amount"`
}

type VbankBalanceUpdate struct {
	Nonce   uint64                     `json:"nonce"`
	Type    string                     `json:"type"`
	Updated []VbankSingleBalanceUpdate `json:"updated"`
}
