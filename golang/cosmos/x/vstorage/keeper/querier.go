package keeper

import (
	abci "github.com/cometbft/cometbft/abci/types"

	sdkioerrors "cosmossdk.io/errors"
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

// getVstorageEntryPath validates that a request URL path represents a valid
// entry path with no extra data, and returns the path of that vstorage entry.
func getVstorageEntryPath(urlPathSegments []string) (string, error) {
	if len(urlPathSegments) != 1 || types.ValidatePath(urlPathSegments[0]) != nil {
		return "", sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, "invalid vstorage entry path")
	}
	return urlPathSegments[0], nil
}

// nolint: unparam
func queryData(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	entry := keeper.GetEntry(ctx, path)
	if !entry.HasValue() {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrNotFound, "no data for vstorage path")
	}

	bz, marshalErr := codec.MarshalJSONIndent(legacyQuerierCdc, types.Data{Value: entry.StringValue()})
	if marshalErr != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrJSONMarshal, marshalErr.Error())
	}

	return bz, nil
}

// nolint: unparam
func queryChildren(ctx sdk.Context, path string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) (res []byte, err error) {
	children := keeper.GetChildren(ctx, path)
	klist := children.Children

	if klist == nil {
		klist = []string{}
	}

	bz, err2 := codec.MarshalJSONIndent(legacyQuerierCdc, types.Children{Children: klist})
	if err2 != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrJSONMarshal, err2.Error())
	}

	return bz, nil
}
