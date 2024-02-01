package vibc

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// NewHandler returns a handler for "vibc" type messages.
func NewHandler(keeper Keeper) sdk.Handler {
	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		switch msg := msg.(type) {
		case *MsgSendPacket:
			return handleMsgSendPacket(ctx, keeper, msg)

		default:
			errMsg := fmt.Sprintf("Unrecognized vibc Msg type: %T", msg)
			return nil, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, errMsg)
		}
	}
}

type sendPacketAction struct {
	*MsgSendPacket
	vm.ActionHeader `actionType:"IBC_EVENT"`
	Event           string `json:"event" default:"sendPacket"`
}

func handleMsgSendPacket(ctx sdk.Context, keeper Keeper, msg *MsgSendPacket) (*sdk.Result, error) {
	onePass := sdk.NewInt64Coin("sendpacketpass", 1)
	balance := keeper.GetBalance(ctx, msg.Sender, onePass.Denom)
	if balance.IsLT(onePass) {
		return nil, sdkerrors.Wrap(
			sdkerrors.ErrInsufficientFee,
			fmt.Sprintf("sender %s needs at least %s", msg.Sender, onePass.String()),
		)
	}

	action := &sendPacketAction{
		MsgSendPacket: msg,
	}
	// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)

	err := keeper.PushAction(ctx, action)
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}
	return &sdk.Result{
		Events: ctx.EventManager().Events().ToABCIEvents(),
	}, nil
}
