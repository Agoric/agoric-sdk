package keeper

import (
	"strings"

	abci "github.com/tendermint/tendermint/abci/types"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
)

// query endpoints supported by the vstorage Querier
const (
	QueryData     = "data"
	QueryChildren = "children"
)

// NewQuerier is the module level router for state queries
func NewQuerier(keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) sdk.Querier {
	return func(ctx sdk.Context, path []string, req abci.RequestQuery) (res []byte, err error) {
		switch path[0] {
		case QueryData:
			return queryData(ctx, strings.Join(path[1:], "/"), req, keeper, legacyQuerierCdc)
		case QueryChildren:
			return queryKeys(ctx, strings.Join(path[1:], "/"), req, keeper, legacyQuerierCdc)
		default:
			return nil, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, "unknown vstorage query endpoint")
		}
	}
}

// nolint: unparam
func queryData(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	value := keeper.GetData(ctx, path)
	if value == "" {
		return []byte{}, sdkerrors.Wrapf(sdkerrors.ErrUnknownRequest, "could not get vstorage %+v", path)
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, types.Data{Value: value})
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
		klist = []string{}
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, types.Keys{Keys: klist})
	if err2 != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err2.Error())
	}

	return bz, nil
}
