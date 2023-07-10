package swingset

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

// portHandler implements vm.PortHandler
// for processing inbound messages from Swingset.
type portHandler struct {
	keeper Keeper
}

type swingsetMessage struct {
	Method string            `json:"method"`
	Args   []json.RawMessage `json:"args"`
}

// NewPortHandler returns a port handler for a swingset Keeper.
func NewPortHandler(k Keeper) vm.PortHandler {
	return portHandler{keeper: k}
}

// Receive implements the vm.PortHandler method.
// It receives and processes an inbound message, returning the
// JSON-serialized response or an error.
func (ph portHandler) Receive(ctx *vm.ControllerContext, str string) (string, error) {
	var msg swingsetMessage
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}

	switch msg.Method {
	default:
		return "", fmt.Errorf("unrecognized swingset method %s", msg.Method)
	}
}
