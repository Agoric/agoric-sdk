package swingset

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

// NewSwingSetProposalHandler defines the SwingSet proposal handler
func NewSwingSetProposalHandler(k keeper.Keeper) govtypes.Handler {
	return func(ctx sdk.Context, content govtypes.Content) error {
		switch c := content.(type) {
		case *types.CoreEvalProposal:
			return k.CoreEvalProposal(ctx, c)

		default:
			return sdkerrors.Wrapf(sdkerrors.ErrUnknownRequest, "unrecognized swingset proposal content type: %T", c)
		}
	}
}
