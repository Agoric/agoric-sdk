package swingset

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"

	sdkioerrors "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// NewHandler returns a handler for "swingset" type messages.
func NewHandler(k Keeper) sdk.Handler {
	msgServer := keeper.NewMsgServerImpl(k)

	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		ctx = ctx.WithEventManager(sdk.NewEventManager())

		switch msg := msg.(type) {
		// Legacy deliver inbound.
		// TODO: Sometime merge with IBC?
		case *MsgDeliverInbound:
			res, err := msgServer.DeliverInbound(sdk.WrapSDKContext(ctx), msg)
			return sdk.WrapServiceResult(ctx, res, err)

		case *MsgProvision:
			res, err := msgServer.Provision(sdk.WrapSDKContext(ctx), msg)
			return sdk.WrapServiceResult(ctx, res, err)

		default:
			errMsg := fmt.Sprintf("Unrecognized swingset Msg type: %T", msg)
			return nil, sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, errMsg)
		}
	}
}
