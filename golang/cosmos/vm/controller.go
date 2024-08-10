package vm

import (
	"context"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Sender makes a request of our associated VM.
type Sender func(ctx context.Context, needReply bool, jsonRequest string) (jsonReply string, err error)

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

type PortHandler interface {
	Receive(context.Context, string) (string, error)
}

type protectedPortHandler struct {
	inner PortHandler
}

func (h protectedPortHandler) Receive(ctx context.Context, str string) (ret string, err error) {
	defer func() {
		if r := recover(); r != nil {
			// Propagate just the string, not the error stack or we will invite
			// nondeterminism.
			err = fmt.Errorf("panic: %s", r)
		}
	}()
	ret, err = h.inner.Receive(ctx, str)
	return
}

func NewProtectedPortHandler(inner PortHandler) PortHandler {
	return protectedPortHandler{inner}
}
