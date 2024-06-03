package vlocalchain

import (
	"context"
	"encoding/json"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/gogo/protobuf/jsonpb"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/types"
)

var _ vm.PortHandler = (*portHandler)(nil)

type portHandler struct {
	keeper keeper.Keeper
}

type portMessage struct {
	Type     string          `json:"type"`
	Address  string          `json:"address,omitempty"`
	Messages json.RawMessage `json:"messages,omitempty"`
}

func NewReceiver(keeper keeper.Keeper) portHandler {
	return portHandler{keeper: keeper}
}

func (h portHandler) Receive(cctx context.Context, str string) (ret string, err error) {
	var msg portMessage
	err = json.Unmarshal([]byte(str), &msg)
	if err != nil {
		return
	}

	switch msg.Type {
	case "VLOCALCHAIN_ALLOCATE_ADDRESS":
		addr := h.keeper.AllocateAddress(cctx)
		var bz []byte
		if bz, err = json.Marshal(addr.String()); err != nil {
			return
		}
		ret = string(bz)

	case "VLOCALCHAIN_QUERY_MANY":
		// Copy the JSON messages string into a CosmosTx object so we can
		// deserialize it with just proto3 JSON.
		cosmosTxBz := []byte(`{"messages":` + string(msg.Messages) + `}`)

		var qms []types.QueryRequest
		qms, err = h.keeper.DeserializeRequests(cosmosTxBz)
		if err != nil {
			return
		}

		// We need jsonpb for its access to the global registry.
		marshaller := jsonpb.Marshaler{EmitDefaults: true, OrigName: false}

		var s string
		resps := make([]json.RawMessage, len(qms))
		for i, qm := range qms {
			var qr *types.QueryResponse
			qr, err = h.keeper.Query(cctx, qm)
			if err != nil {
				return
			}
			if s, err = marshaller.MarshalToString(qr); err != nil {
				return
			}
			resps[i] = []byte(s)
		}

		var bz []byte
		if bz, err = json.Marshal(resps); err != nil {
			return
		}
		ret = string(bz)

	case "VLOCALCHAIN_EXECUTE_TX":
		origCtx := sdk.UnwrapSDKContext(cctx)

		// Copy the JSON messages string into a CosmosTx object so we can
		// deserialize it with just proto3 JSON.
		cosmosTxBz := []byte(`{"messages":` + string(msg.Messages) + `}`)

		var msgs []sdk.Msg
		if msgs, err = h.keeper.DeserializeTxMessages(cosmosTxBz); err != nil {
			return
		}

		var resps []interface{}
		resps, err = h.keeper.ExecuteTx(origCtx, msg.Address, msgs)
		if err != nil {
			return
		}

		var bz []byte
		if bz, err = json.Marshal(resps); err != nil {
			return
		}
		ret = string(bz)
	default:
		err = fmt.Errorf("unrecognized message type %s", msg.Type)
	}
	return
}
