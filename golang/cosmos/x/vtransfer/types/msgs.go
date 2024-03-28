package types

const RouterKey = ModuleName // this was defined in your key.go file

type InvokeMemo struct {
	InvokeOnAcknowledgementPacket string `json:"invokeOnAcknowledgementPacket"`
	InvokeOnTimeoutPacket         string `json:"invokeOnTimeoutPacket"`
	InvokeWriteAcknowledgement    string `json:"invokeWriteAcknowledgement"`
}
