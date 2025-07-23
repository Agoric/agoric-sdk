package keeper

import (
	"fmt"

	abci "github.com/cometbft/cometbft/abci/types"

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

// nolint: unparam
func queryEgress(ctx sdk.Context, bech32 string, req abci.RequestQuery, keeper Keeper, legacyQuerierCdc *codec.LegacyAmino) ([]byte, error) {
	acc, err := sdk.AccAddressFromBech32(bech32)
	if err != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	egress := keeper.GetEgress(ctx, acc)
	if egress.Peer == "" {
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
