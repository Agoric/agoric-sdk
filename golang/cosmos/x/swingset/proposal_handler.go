package swingset

import (
	sdkioerrors "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	govv1beta1 "github.com/cosmos/cosmos-sdk/x/gov/types/v1beta1"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

// NewSwingSetProposalHandler defines the SwingSet proposal handler
func NewSwingSetProposalHandler(k keeper.Keeper) govv1beta1.Handler {
	return func(ctx sdk.Context, content govv1beta1.Content) error {
		switch c := content.(type) {
		case *types.CoreEvalProposal:
			return k.CoreEvalProposal(ctx, c)

		default:
			return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "unrecognized swingset proposal content type: %T", c)
		}
	}
}
