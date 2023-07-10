package swingset

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

// portHandler implements a vm.PortHandler.
type portHandler struct {
	keeper Keeper
}

type swingsetMessage struct {
	Type    string          `json:"type"`
	Request json.RawMessage `json:"request"`
}

// NewPortHandler returns a port handler for the Keeper.
func NewPortHandler(k Keeper) vm.PortHandler {
	return portHandler{keeper: k}
}

// Receive implements the vm.PortHandler method.
// Receives and processes a bridge message, returning the
// JSON-encoded response or error.
func (ph portHandler) Receive(ctx *vm.ControllerContext, str string) (string, error) {
	var msg swingsetMessage
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}

	switch msg.Type {
	default:
		return "", fmt.Errorf("unrecognized type %s", msg.Type)
	}
}
