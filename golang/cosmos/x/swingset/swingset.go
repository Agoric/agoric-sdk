package swingset

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	sdk "github.com/cosmos/cosmos-sdk/types"
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

const (
	SwingStoreUpdateExportData = "swingStoreUpdateExportData"
)

// NewPortHandler returns a port handler for a swingset Keeper.
func NewPortHandler(k Keeper) vm.PortHandler {
	return portHandler{keeper: k}
}

// Receive implements the vm.PortHandler method.
// It receives and processes an inbound message, returning the
// JSON-serialized response or an error.
func (ph portHandler) Receive(cctx context.Context, str string) (string, error) {
	ctx := sdk.UnwrapSDKContext(cctx)
	var msg swingsetMessage
	err := json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return "", err
	}

	switch msg.Method {
	case SwingStoreUpdateExportData:
		return ph.handleSwingStoreUpdateExportData(ctx, msg.Args)

	default:
		return "", fmt.Errorf("unrecognized swingset method %s", msg.Method)
	}
}

func (ph portHandler) handleSwingStoreUpdateExportData(ctx sdk.Context, entries []json.RawMessage) (ret string, err error) {
	store := ph.keeper.GetSwingStore(ctx)
	exportDataReader := agoric.NewJsonRawMessageKVEntriesReader(entries)
	defer exportDataReader.Close()
	for {
		entry, err := exportDataReader.Read()
		if err == io.EOF {
			return "true", nil
		} else if err != nil {
			return ret, err
		}

		key := []byte(entry.Key())
		if !entry.HasValue() {
			store.Delete(key)
		} else {
			store.Set(key, []byte(entry.StringValue()))
		}
	}
}
