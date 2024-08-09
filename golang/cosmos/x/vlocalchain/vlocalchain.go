package vlocalchain

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/types/conv"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/types"
)

var _ vm.PortHandler = (*portHandler)(nil)

var (
	messagesObjStart = []byte(`{"messages":`)
	objEnd           = []byte(`}`)
)

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
	err = conv.UnmarshalJSONString(str, &msg)
	if err != nil {
		return
	}

	switch msg.Type {
	case "VLOCALCHAIN_ALLOCATE_ADDRESS":
		addr := h.keeper.AllocateAddress(cctx)
		if ret, err = conv.MarshalToJSONString(addr.String()); err != nil {
			return
		}

	case "VLOCALCHAIN_QUERY_MANY":
		// Copy the JSON messages string into a CosmosTx object so we can
		// deserialize it with just proto3 JSON.
		cosmosTxBz := bytes.Join([][]byte{messagesObjStart, msg.Messages, objEnd}, []byte{})

		var qms []types.QueryRequest
		qms, err = h.keeper.DeserializeRequests(cosmosTxBz)
		if err != nil {
			return
		}

		var errs []error
		resps := make([]interface{}, len(qms))
		for i, qm := range qms {
			var qr *types.QueryResponse
			qr, err = h.keeper.Query(cctx, qm)
			if err == nil {
				// Only fill out the response if the query was successful.
				resps[i] = qr
			} else {
				errs = append(errs, err) // Accumulate errors
				resps[i] = &types.QueryResponse{Error: err.Error()}
			}
		}

		str, err := vm.ProtoJSONMarshalSlice(resps)
		if err != nil {
			return "", err
		}

		switch len(errs) {
		case 0:
			err = nil
		case 1:
			err = errs[0]
		case len(resps):
			err = fmt.Errorf("all queries in batch failed: %v", errs)
		default:
			// Let them inspect the individual errors manually.
		}
		return str, err

	case "VLOCALCHAIN_EXECUTE_TX":
		origCtx := sdk.UnwrapSDKContext(cctx)

		// Copy the JSON messages string into a CosmosTx object so we can
		// deserialize it with just proto3 JSON.
		cosmosTxBz := bytes.Join([][]byte{messagesObjStart, msg.Messages, objEnd}, []byte{})

		var msgs []sdk.Msg
		if msgs, err = h.keeper.DeserializeTxMessages(cosmosTxBz); err != nil {
			return
		}

		var resps []interface{}
		resps, err = h.keeper.ExecuteTx(origCtx, msg.Address, msgs)
		if err != nil {
			return
		}

		// Marshal the responses to proto3 JSON.
		str, e := vm.ProtoJSONMarshalSlice(resps)
		return str, e
	default:
		err = fmt.Errorf("unrecognized message type %s", msg.Type)
	}
	return
}
