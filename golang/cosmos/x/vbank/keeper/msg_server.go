package keeper

import (
	"context"

	sdkioerrors "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
)

type msgServer struct {
	Keeper
}

// NewMsgServerImpl returns an implementation of the vbank MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

var _ types.MsgServer = msgServer{}

// SetDenomMetaData implements the Msg/SetDenomMetaData method.
func (k msgServer) SetDenomMetaData(goCtx context.Context, msg *types.MsgSetDenomMetaData) (*types.MsgSetDenomMetaDataResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Verify that the authority is correct
	if k.authority != msg.Authority {
		return nil, sdkioerrors.Wrapf(sdkerrors.ErrUnauthorized, "invalid authority; expected %s, got %s", k.authority, msg.Authority)
	}

	// Validate the metadata
	if err := msg.Metadata.Validate(); err != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Convert the vbank Metadata to bank Metadata
	bankMetadata := banktypes.Metadata{
		Description: msg.Metadata.Description,
		DenomUnits:  make([]*banktypes.DenomUnit, len(msg.Metadata.DenomUnits)),
		Base:        msg.Metadata.Base,
		Display:     msg.Metadata.Display,
		Name:        msg.Metadata.Name,
		Symbol:      msg.Metadata.Symbol,
		URI:         msg.Metadata.URI,
		URIHash:     msg.Metadata.URIHash,
	}

	for i, unit := range msg.Metadata.DenomUnits {
		bankMetadata.DenomUnits[i] = &banktypes.DenomUnit{
			Denom:    unit.Denom,
			Exponent: unit.Exponent,
			Aliases:  unit.Aliases,
		}
	}

	// Set the denom metadata
	k.bankKeeper.SetDenomMetaData(ctx, bankMetadata)

	return &types.MsgSetDenomMetaDataResponse{}, nil
}
