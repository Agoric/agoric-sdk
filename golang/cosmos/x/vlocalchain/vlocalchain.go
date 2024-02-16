package vlocalchain

import (
	"context"
	"encoding/json"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/types"
	transfer "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
)

var _ vm.PortHandler = (*portHandler)(nil)

type portHandler struct {
	keeper         keeper.Keeper
	transferKeeper types.TransferKeeper
}

type portMessage struct {
	Type     string          `json:"type"`
	Address  string          `json:"address,omitempty"`
	Messages json.RawMessage `json:"messages,omitempty"`
}

func NewReceiver(keeper keeper.Keeper, transferKeeper types.TransferKeeper) portHandler {
	// TODO: In app.go, add query services to queryServer
	// app.RegisterGRPCServer(queryServer)
	return portHandler{keeper: keeper, transferKeeper: transferKeeper}
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

	case "VLOCALCHAIN_QUERY":
		// Copy the JSON messages string into a CosmosTx object so we can
		// deserialize it with just proto3 JSON.
		cosmosTxBz := []byte(`{"messages":` + string(msg.Messages) + `}`)

		var qs []interface{}
		qs, err = h.keeper.DeserializeRequests(cosmosTxBz)
		if err != nil {
			return
		}
		resps := make([]interface{}, len(qs))
		for i, q := range qs {
			resps[i], err = h.query(cctx, q)
			if err != nil {
				return
			}
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

		// CacheContext returns a new context with the multi-store branched into a cached storage object
		// writeCache is called only if all msgs succeed, performing state transitions atomically
		cacheCtx, writeCache := origCtx.CacheContext()
		ctx := sdk.WrapSDKContext(cacheCtx)

		if err = h.authenticateTx(msgs, msg.Address); err != nil {
			return
		}

		resps := make([]interface{}, len(msgs))
		if err = h.executeTx(ctx, msgs, resps); err != nil {
			return
		}

		// NOTE: The context returned by CacheContext() creates a new EventManager, so events must be correctly propagated back to the current context
		origCtx.EventManager().EmitEvents(cacheCtx.EventManager().Events())
		writeCache()

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

func (h portHandler) query(ctx context.Context, m interface{}) (interface{}, error) {
	var res interface{}
	var err error
	// We currently only handle a few kinds of requests.
	// TODO: Enable more request types.
	switch req := m.(type) {
	case *banktypes.QueryAllBalancesRequest:
		var coins sdk.Coins
		coins = h.keeper.GetAllBalances(ctx, req.Address)
		res = banktypes.QueryAllBalancesResponse{Balances: coins}
	default:
		err = fmt.Errorf("unrecognized message type %T", m)
	}
	return res, err
}

func (h portHandler) authenticateTx(msgs []sdk.Msg, address string) error {
	for _, m := range msgs {
		if err := m.ValidateBasic(); err != nil {
			return err
		}

		// Validate that the signers are correct (i.e. they match the address).
		for _, addr := range m.GetSigners() {
			if addr.String() != address {
				err := fmt.Errorf("signer %s does not match address %s", addr, address)
				return err
			}
		}
	}
	return nil
}

func (h portHandler) executeTx(ctx context.Context, msgs []sdk.Msg, resps []interface{}) error {
	for i, m := range msgs {
		// We currently only handle a few kinds of messages.
		// TODO: Enable more message types.
		var res interface{}
		var err error
		switch req := m.(type) {
		case *banktypes.MsgSend:
			err = h.keeper.SendCoins(ctx, req.FromAddress, req.ToAddress, req.Amount)
		case *transfer.MsgTransfer:
			res, err = h.transferKeeper.Transfer(ctx, req)
		default:
			err = fmt.Errorf("unrecognized message type %T", m)
		}
		if err != nil {
			return err
		}
		resps[i] = res
	}
	return nil
}
