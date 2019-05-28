package swingset

import (
	"encoding/json"
	"errors"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type storageHandler struct {
	Keeper  Keeper
	Context sdk.Context
}

type storageMessage struct {
	Method string `json:"method"`
	Key    string `json:"key"`
	Value  string `json:"value"`
}

func NewStorageHandler(context sdk.Context, keeper Keeper) *storageHandler {
	return &storageHandler{
		Keeper:  keeper,
		Context: context,
	}
}

func (sh *storageHandler) Receive(str string) (string, error) {
	msg := new(storageMessage)
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}

	// TODO: Actually use generic store, not just mailboxes.
	switch msg.Method {
	case "set":
		peer, err := mailboxPeer(msg.Key)
		if err != nil {
			return "", err
		}
		mailbox := NewMailbox()
		mailbox.Value = msg.Value
		sh.Keeper.SetMailbox(sh.Context, peer, mailbox)
		return "true", nil

	case "get":
		peer, err := mailboxPeer(msg.Key)
		if err != nil {
			return "", err
		}
		mailbox := sh.Keeper.GetMailbox(sh.Context, peer)
		return mailbox.Value, nil

	case "has":
	case "keys":
	case "entries":
	case "values":
	case "size":
		// TODO: Implement these operations
	}

	return "", errors.New("Unrecognized msg.Method " + msg.Method)
}
