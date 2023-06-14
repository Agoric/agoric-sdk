package vm

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

type ControllerAdmissionMsg interface {
	sdk.Msg
	CheckAdmissibility(sdk.Context, interface{}) error

	// GetInboundMsgCount returns the number of Swingset messages which will
	// be added to the inboundQueue.
	GetInboundMsgCount() int32

	// IsHighPriority returns whether the message should be considered for
	// high priority processing, including bypass of some inbound checks
	// and queueing on higher priority queues.
	IsHighPriority(sdk.Context, interface{}) (bool, error)
}

// Jsonable is a value, j, that can be passed through json.Marshal(j).
type Jsonable interface{}

// ActionPusher enqueues data for later consumption by the controller.
type ActionPusher func(ctx sdk.Context, action Jsonable) error
