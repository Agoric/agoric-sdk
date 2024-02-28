package keeper

import (
	"fmt"
	"strings"

	abci "github.com/tendermint/tendermint/abci/types"

	sdkioerrors "cosmossdk.io/errors"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	vstoragetypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
)

// query endpoints supported by the swingset Querier
const (
	QueryEgress        = "egress"
	QueryMailbox       = "mailbox"
	LegacyQueryStorage = "storage"
	LegacyQueryKeys    = "keys"
)

// NewQuerier is the module level router for state queries
func NewQuerier(keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) sdk.Querier {
	return func(ctx sdk.Context, path []string, req abci.RequestQuery) (res []byte, err error) {
		var queryType string
		if len(path) > 0 {
			queryType = path[0]
		}
		switch queryType {
		case QueryEgress:
			if len(path) < 2 || path[1] == "" {
				return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, "missing egress address")
			}
			return queryEgress(ctx, path[1], req, keeper, legacyQuerierCdc)
		case QueryMailbox:
			if len(path) < 2 || path[1] == "" {
				return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, "missing mailbox peer")
			}
			return queryMailbox(ctx, path[1], req, keeper, legacyQuerierCdc)
		case LegacyQueryStorage:
			return legacyQueryStorage(ctx, strings.Join(path[1:], "/"), req, keeper, legacyQuerierCdc)
		case LegacyQueryKeys:
			return legacyQueryKeys(ctx, strings.Join(path[1:], "/"), req, keeper, legacyQuerierCdc)
		default:
			return nil, sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "unknown swingset query path")
		}
	}
}

// nolint: unparam
func queryEgress(ctx sdk.Context, bech32 string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) ([]byte, error) {
	acc, err := sdk.AccAddressFromBech32(bech32)
	if err != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	egress := keeper.GetEgress(ctx, acc)
	if egress.Peer.Empty() {
		return []byte{}, sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, fmt.Sprintf("egress %s not found", bech32))
	}

	bz, err := codec.MarshalJSONIndent(legacyQuerierCdc, egress)
	if err != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	return bz, nil
}

// nolint: unparam
func queryMailbox(ctx sdk.Context, peer string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	value := keeper.GetMailbox(ctx, peer)

	if value == "" {
		return []byte{}, sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "could not get peer mailbox")
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, vstoragetypes.Data{Value: value})
	if err2 != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrJSONMarshal, err2.Error())
	}

	return bz, nil
}

// nolint: unparam
func legacyQueryStorage(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	entry := keeper.vstorageKeeper.GetEntry(ctx, path)
	if !entry.HasValue() {
		return []byte{}, sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "could not get swingset %+v", path)
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, vstoragetypes.Data{Value: entry.StringValue()})
	if err2 != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrJSONMarshal, err2.Error())
	}

	return bz, nil
}

// nolint: unparam
func legacyQueryKeys(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	children := keeper.vstorageKeeper.GetChildren(ctx, path)
	chlist := children.Children

	if chlist == nil {
		chlist = []string{}
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, vstoragetypes.Children{Children: chlist})
	if err2 != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrJSONMarshal, err2.Error())
	}

	return bz, nil
}
