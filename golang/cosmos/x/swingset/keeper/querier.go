package keeper

import (
	"fmt"
	"strings"

	abci "github.com/tendermint/tendermint/abci/types"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

// query endpoints supported by the swingset Querier
const (
	QueryEgress  = "egress"
	QueryMailbox = "mailbox"
	QueryStorage = "storage"
	QueryKeys    = "keys"
)

// NewQuerier is the module level router for state queries
func NewQuerier(keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) sdk.Querier {
	return func(ctx sdk.Context, path []string, req abci.RequestQuery) (res []byte, err error) {
		switch path[0] {
		case QueryEgress:
			return queryEgress(ctx, path[1], req, keeper, legacyQuerierCdc)
		case QueryStorage:
			return queryStorage(ctx, strings.Join(path[1:], "/"), req, keeper, legacyQuerierCdc)
		case QueryKeys:
			return queryKeys(ctx, strings.Join(path[1:], "/"), req, keeper, legacyQuerierCdc)
		case QueryMailbox:
			return queryMailbox(ctx, path[1:], req, keeper, legacyQuerierCdc)
		default:
			return nil, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "unknown swingset query endpoint")
		}
	}
}

// nolint: unparam
func queryEgress(ctx sdk.Context, bech32 string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) ([]byte, error) {
	acc, err := sdk.AccAddressFromBech32(bech32)
	if err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	egress := keeper.GetEgress(ctx, acc)
	if egress.Peer.Empty() {
		return []byte{}, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, fmt.Sprintf("egress %s not found", bech32))
	}

	bz, err := codec.MarshalJSONIndent(legacyQuerierCdc, egress)
	if err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	return bz, nil
}

// nolint: unparam
func queryStorage(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	storage := keeper.GetStorage(ctx, path)
	value := storage.Value

	if value == "" {
		return []byte{}, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "could not get storage")
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, types.Storage{value})
	if err2 != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err2.Error())
	}

	return bz, nil
}

// nolint: unparam
func queryKeys(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	keys := keeper.GetKeys(ctx, path)
	klist := keys.Keys

	if klist == nil {
		return []byte{}, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "could not get keys")
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, types.Keys{klist})
	if err2 != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err2.Error())
	}

	return bz, nil
}

// nolint: unparam
func queryMailbox(ctx sdk.Context, path []string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	peer := path[0]

	mailbox := keeper.GetMailbox(ctx, peer)
	value := mailbox.Value

	if value == "" {
		return []byte{}, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "could not get peer mailbox")
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, types.Storage{value})
	if err2 != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err2.Error())
	}

	return bz, nil
}
