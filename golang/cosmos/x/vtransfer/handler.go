package vtransfer

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/keeper"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// NewHandler returns a handler for "vtransfer" type messages.
func NewHandler(keeper keeper.Keeper) sdk.Handler {
	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		switch msg := msg.(type) {
		default:
			errMsg := fmt.Sprintf("Unrecognized vtransfer Msg type: %T", msg)
			return nil, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, errMsg)
		}
	}
}
