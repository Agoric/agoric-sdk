package loc

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

type portHandler struct {
	keeper Keeper
}

type portMessage struct {
	Type string `json:"type"`
}

func NewPortHandler(k Keeper) vm.PortHandler {
	return portHandler{keeper: k}
}

func (ch portHandler) Receive(ctx *vm.ControllerContext, str string) (string, error) {
	var msg portMessage
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("unrecognized type %s", msg.Type)
}
