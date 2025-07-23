package vibc

import (
	"fmt"

	sdkioerrors "cosmossdk.io/errors"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"
	"github.com/cosmos/cosmos-sdk/baseapp"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// NewHandler returns a handler for "vibc" type messages.
func NewHandler(keeper Keeper, bankKeeper types.BankKeeper) baseapp.MsgServiceHandler {
	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		switch msg := msg.(type) {
		case *MsgSendPacket:
			if err := msg.Validate(); err != nil {
				return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
			}
			return handleMsgSendPacket(ctx, keeper, bankKeeper, msg)

		default:
			errMsg := fmt.Sprintf("Unrecognized vibc Msg type: %T", msg)
			return nil, sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, errMsg)
		}
	}
}

type sendPacketAction struct {
	*vm.ActionHeader `actionType:"IBC_EVENT"`
	Event            string `json:"event" default:"sendPacket"`
	*MsgSendPacket
}

func handleMsgSendPacket(
	ctx sdk.Context,
	keeper Keeper,
	bankKeeper types.BankKeeper,
	msg *MsgSendPacket,
) (*sdk.Result, error) {
	onePass := sdk.NewInt64Coin("sendpacketpass", 1)
	senderAddress, err := keeper.GetAddressCodec().StringToBytes(msg.Sender)
	if err != nil {
		return nil, err
	}
	balance := bankKeeper.GetBalance(ctx, senderAddress, onePass.Denom)
	if balance.IsLT(onePass) {
		return nil, sdkioerrors.Wrap(
			sdkerrors.ErrInsufficientFee,
			fmt.Sprintf("sender %s needs at least %s", senderAddress, onePass.String()),
		)
	}

	action := sendPacketAction{
		MsgSendPacket: msg,
	}

	err = keeper.PushAction(ctx, action)
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}
	return &sdk.Result{
		Events: ctx.EventManager().Events().ToABCIEvents(),
	}, nil
}
