package vtransfer

import (
	"fmt"

	sdkioerrors "cosmossdk.io/errors"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/keeper"
	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"

	sdkioerrors "cosmossdk.io/errors"
	sdktypeserrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// NewHandler returns a handler for "vtransfer" type messages.
func NewHandler(keeper keeper.Keeper) baseapp.MsgServiceHandler {
	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		switch msg := msg.(type) {
		default:
			errMsg := fmt.Sprintf("Unrecognized vtransfer Msg type: %T", msg)
			return nil, sdkioerrors.Wrap(sdktypeserrors.ErrUnknownRequest, errMsg)
		}
	}
}
