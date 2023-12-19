package types

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	ibcexported "github.com/cosmos/ibc-go/v6/modules/core/exported"
)

const RouterKey = ModuleName // this was defined in your key.go file

type IBCMiddlewareEvent struct {
	*vm.ActionHeader `actionType:"VTRANSFER_INVOKE"`
	Event            string              `json:"event"` // callContract
	Packet           ibcexported.PacketI `json:"packet"`
	PendingAck       []byte              `json:"pendingAck"`
	BlockHeight      int64               `json:"blockHeight"`
	BlockTime        int64               `json:"blockTime"`
}

type ContractInvoke struct {
	Contract string `json:"contract"`
	Method   string `json:"method"`
	Args     string `json:"args"`
}
