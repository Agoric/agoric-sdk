package swingset

import (
	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	vstoragetypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// portHandler implements a vm.PortHandler.
type portHandler struct {
	keeper Keeper
}

type swingsetMessage struct {
	Type    string          `json:"type"`
	Request json.RawMessage `json:"request"`
}

type swingsetStoreSetRequest struct {
	Entries []json.RawMessage `json:"entries"`
}

const (
	SWINGSET_STORE_SET = "SWINGSET_STORE_SET"
)

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
	case SWINGSET_STORE_SET:
		var request swingsetStoreSetRequest

		err := json.Unmarshal(msg.Request, &request)
		if err != nil {
			return "", err
		}
		return ph.handleStoreSet(ctx.Context, request.Entries)

	default:
		return "", fmt.Errorf("unrecognized type %s", msg.Type)
	}
}

func (ph portHandler) handleStoreSet(ctx sdk.Context, entries []json.RawMessage) (ret string, err error) {
	store := ph.keeper.GetSwingStore(ctx)
	for _, arg := range entries {
		var entry vstoragetypes.StorageEntry
		entry, err = vstoragetypes.UnmarshalStorageEntry(arg)
		if err != nil {
			return
		}
		if !entry.HasData() {
			store.Delete([]byte(entry.Path()))
		} else {
			store.Set([]byte(entry.Path()), []byte(entry.StringValue()))
		}
	}
	return "true", nil
}
