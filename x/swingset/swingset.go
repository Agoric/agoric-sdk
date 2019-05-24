package swingset

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

const SWINGSET_PORT = 17

type swingSetName = struct {
	Type  string `json:"type"`
	Name  string `json:"name"`
	Value string `json:"value"`
}

var NodeMessageSender func(port int, needReply bool, str string) (string, error)

func SendToNode(str string) error {
	_, err := NodeMessageSender(SWINGSET_PORT, false, str)
	return err
}

func CallToNode(str string) (string, error) {
	return NodeMessageSender(SWINGSET_PORT, true, str)
}

var mySetName func(string, string)

func ReceiveFromNode(str string) (string, error) {
	action := new(swingSetName)
	err := json.Unmarshal([]byte(str), &action)
	if err != nil {
		return "", err
	}

	switch action.Type {
	case "SET_NAME":
		fmt.Fprintln(os.Stderr, "Setting name", action.Name, action.Value)
		mySetName(action.Name, action.Value)
		return "true", nil
	}
	return "", errors.New("Unrecognized action.type " + action.Type)
}

func handleSwingSetName(ctx sdk.Context, keeper Keeper, name, value string) error {
	ssn := &swingSetName{
		Type:  "SET_NAME",
		Name:  name,
		Value: value,
	}
	b, err := json.Marshal(ssn)
	if err != nil {
		return err
	}
	fmt.Fprintln(os.Stderr, "About to call SwingSet")
	mySetName = func(name, value string) {
		keeper.SetName(ctx, name, value)
	}
	out, err := CallToNode(string(b))
	fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	return err
}
