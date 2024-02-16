package keeper

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkaddress "github.com/cosmos/cosmos-sdk/types/address"

	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	key storetypes.StoreKey
	cdc codec.Codec

	bankKeeper types.BankKeeper
}

// NewKeeper creates a new dIBC Keeper instance
func NewKeeper(
	cdc codec.Codec,
	key storetypes.StoreKey,
	bankKeeper types.BankKeeper,
) Keeper {
	return Keeper{
		key:        key,
		cdc:        cdc,
		bankKeeper: bankKeeper,
	}
}

type fakeAny struct {
	TypeURL string `json:"@type"`
}

type fakeCosmosTx struct {
	Messages []json.RawMessage `json:"messages"`
}

// DeserializeRequests interprets a JSON-encoded array of Anys as Cosmos Query
// requests.
func (k Keeper) DeserializeRequests(bz []byte) ([]interface{}, error) {
	// TODO replace these internals with the ones from TODODeserializeRequests
	var cosmosTx fakeCosmosTx
	if err := json.Unmarshal(bz, &cosmosTx); err != nil {
		return nil, err
	}

	msgs := make([]interface{}, len(cosmosTx.Messages))
	for i, anyMsg := range cosmosTx.Messages {
		var someAny fakeAny
		if err := json.Unmarshal(anyMsg, &someAny); err != nil {
			return nil, err
		}

		switch someAny.TypeURL {
		case "/cosmos.bank.v1beta1.QueryAllBalancesRequest":
			var req banktypes.QueryAllBalancesRequest
			if err := json.Unmarshal(anyMsg, &req); err != nil {
				return nil, err
			}
			msgs[i] = &req
		default:
			return nil, fmt.Errorf("unrecognized type: %s", someAny.TypeURL)
		}
	}

	return msgs, nil
}

// TODODeserializeRequests uses the codec's proto3 JSON unmarshaller and then
// unpacks the Any types into actual objects.  FIXME: This is currently broken
// with the following error:
//
// unable to resolve type URL /cosmos.bank.v1beta1.QueryAllBalancesRequest
func (k Keeper) TODODeserializeRequests(bz []byte) ([]interface{}, error) {
	var cosmosTx types.CosmosTx
	if err := k.cdc.UnmarshalJSON(bz, &cosmosTx); err != nil {
		return nil, err
	}

	msgs := make([]interface{}, len(cosmosTx.Messages))
	for i, anyMsg := range cosmosTx.Messages {
		err := k.cdc.UnpackAny(anyMsg, &msgs[i])
		if err != nil {
			return nil, err
		}
	}
	return msgs, nil
}

func (k Keeper) DeserializeTxMessages(bz []byte) ([]sdk.Msg, error) {
	var cosmosTx types.CosmosTx
	if err := k.cdc.UnmarshalJSON(bz, &cosmosTx); err != nil {
		return nil, err
	}
	msgs := make([]sdk.Msg, len(cosmosTx.Messages))
	for i, anyMsg := range cosmosTx.Messages {
		err := k.cdc.UnpackAny(anyMsg, &msgs[i])
		if err != nil {
			return nil, err
		}
	}

	return msgs, nil
}

// AllocateAddress returns an sdk.AccAddress derived using a host module account
// address, sequence number, the current block app hash, and the current block
// data hash.  The sdk.AccAddress returned is a sub-address of the host module
// account.
func (k Keeper) AllocateAddress(cctx context.Context) sdk.AccAddress {
	ctx := sdk.UnwrapSDKContext(cctx)
	store := ctx.KVStore(k.key)

	transferModuleAcc := sdkaddress.Module(types.ModuleName, []byte("transfer-accounts"))
	header := ctx.BlockHeader()

	// Increment our sequence number.
	seq := store.Get(types.KeyLastSequence)
	seq = types.IncrementSequence(seq)
	store.Set(types.KeyLastSequence, seq)

	buf := seq
	buf = append(buf, header.AppHash...)
	buf = append(buf, header.DataHash...)

	return sdkaddress.Derive(transferModuleAcc, buf)
}

func (k Keeper) GetAllBalances(cctx context.Context, addr string) sdk.Coins {
	ctx := sdk.UnwrapSDKContext(cctx)
	return k.bankKeeper.GetAllBalances(ctx, sdk.MustAccAddressFromBech32(addr))
}

func (k Keeper) SendCoins(cctx context.Context, fromAddr, toAddr string, amt sdk.Coins) error {
	ctx := sdk.UnwrapSDKContext(cctx)
	return k.bankKeeper.SendCoins(ctx, sdk.AccAddress(fromAddr), sdk.AccAddress(toAddr), amt)
}
