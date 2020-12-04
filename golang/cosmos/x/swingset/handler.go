package swingset

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	// "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var committedHeight int64 = 0

// IsSimulation tells if we are simulating the transaction
func IsSimulation(ctx sdk.Context) bool {
	return committedHeight == ctx.BlockHeight()
}

type deliverInboundAction struct {
	Type        string          `json:"type"`
	Peer        string          `json:"peer"`
	Messages    [][]interface{} `json:"messages"`
	Ack         uint64          `json:"ack"`
	StoragePort int             `json:"storagePort"`
	BlockHeight int64           `json:"blockHeight"`
	BlockTime   int64           `json:"blockTime"`
}

// NewHandler returns a handler for "swingset" type messages.
func NewHandler(keeper Keeper) sdk.Handler {
	return func(ctx sdk.Context, msg sdk.Msg) (*sdk.Result, error) {
		if IsSimulation(ctx) {
			// We don't support simulation.
			return &sdk.Result{}, nil
		} else {
			// The simulation was done, so now allow infinite gas.
			ctx = ctx.WithGasMeter(sdk.NewInfiniteGasMeter())
		}

		switch msg := msg.(type) {
		// Legacy deliver inbound.
		// TODO: Sometime merge with IBC?
		case *MsgDeliverInbound:
			return handleMsgDeliverInbound(ctx, keeper, msg)

		case *MsgProvision:
			return handleMsgProvision(ctx, keeper, msg)

		default:
			errMsg := fmt.Sprintf("Unrecognized swingset Msg type: %v", msg.Type())
			return nil, sdkerrors.Wrap(sdkerrors.ErrUnknownRequest, errMsg)
		}
	}
}

func mailboxPeer(key string) (string, error) {
	path := strings.Split(key, ".")
	if len(path) != 2 || path[0] != "mailbox" {
		return "", errors.New("Can only access 'mailbox.PEER'")
	}
	return path[1], nil
}

func handleMsgDeliverInbound(ctx sdk.Context, keeper Keeper, msg *MsgDeliverInbound) (*sdk.Result, error) {
	messages := make([][]interface{}, len(msg.Messages))
	for i, message := range msg.Messages {
		messages[i] = make([]interface{}, 2)
		messages[i][0] = msg.Nums[i]
		messages[i][1] = message
	}

	action := &deliverInboundAction{
		Type:        "DELIVER_INBOUND",
		Peer:        msg.Submitter.String(),
		Messages:    messages,
		Ack:         msg.Ack,
		StoragePort: GetPort("controller"),
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}
	// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)
	b, err := json.Marshal(action)
	if err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = keeper.CallToController(ctx, string(b))
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}
	return &sdk.Result{}, nil
	/*		Events: ctx.EventManager().Events().ToABCIEvents(),
	}, nil */
}

type provisionAction struct {
	*MsgProvision
	Type        string `json:"type"` // PLEASE_PROVISION
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

func handleMsgProvision(ctx sdk.Context, keeper Keeper, msg *MsgProvision) (*sdk.Result, error) {
	onePass := sdk.NewInt64Coin("provisionpass", 1)
	balance := keeper.GetBalance(ctx, msg.Submitter, onePass.Denom)
	if balance.IsLT(onePass) {
		return nil, sdkerrors.Wrap(
			sdkerrors.ErrInsufficientFee,
			fmt.Sprintf("submitter %s needs at least %s", msg.Submitter, onePass.String()),
		)
	}

	action := &provisionAction{
		MsgProvision: msg,
		Type:         "PLEASE_PROVISION",
		BlockHeight:  ctx.BlockHeight(),
		BlockTime:    ctx.BlockTime().Unix(),
	}
	// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)
	b, err := json.Marshal(action)
	if err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	// Create the account, if it doesn't already exist.
	egress := types.NewEgress(msg.Nickname, msg.Address, msg.PowerFlags)
	err = keeper.SetEgress(ctx, egress)
	if err != nil {
		return nil, err
	}

	_, err = keeper.CallToController(ctx, string(b))
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}

	return &sdk.Result{
		Events: ctx.EventManager().Events().ToABCIEvents(),
	}, nil
}
