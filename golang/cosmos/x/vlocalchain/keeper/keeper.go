package keeper

import (
	"context"
	"encoding/json"

	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkaddress "github.com/cosmos/cosmos-sdk/types/address"

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

func (k Keeper) DeserializeTxMessages(msgBzs []json.RawMessage) ([]sdk.Msg, error) {
	msgs := make([]sdk.Msg, len(msgBzs))
	for i, bz := range msgBzs {
		var any codectypes.Any
		if err := k.cdc.UnmarshalJSON(bz, &any); err != nil {
			return nil, err
		}

		err := k.cdc.UnpackAny(&any, &msgs[i])
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
	return k.bankKeeper.GetAllBalances(ctx, sdk.AccAddress(addr))
}

func (k Keeper) SendCoins(cctx context.Context, fromAddr, toAddr string, amt sdk.Coins) error {
	ctx := sdk.UnwrapSDKContext(cctx)
	return k.bankKeeper.SendCoins(ctx, sdk.AccAddress(fromAddr), sdk.AccAddress(toAddr), amt)
}
