package keeper

import (
	"context"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

type msgServer struct {
	Keeper
}

// NewMsgServerImpl returns an implementation of the swingset MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

var _ types.MsgServer = msgServer{}

type ActionMeta struct {
	Type        string `json:"type"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}
type deliverInboundAction struct {
	*ActionMeta
	Peer     string          `json:"peer"`
	Messages [][]interface{} `json:"messages"`
	Ack      uint64          `json:"ack"`
}
type walletAction struct {
	*ActionMeta
	Owner  string `json:"owner"`
	Action string `json:"action"`
}
type walletSpendAction struct {
	*ActionMeta
	Owner       string `json:"owner"`
	SpendAction string `json:"spendAction"`
}
type provisionAction struct {
	*ActionMeta
	*types.MsgProvision
	AutoProvision bool `json:"autoProvision"`
}
type installBundleAction struct {
	*ActionMeta
	*types.MsgInstallBundle
}

// finishAction adds to an "action" instance meta-information that is necessary
// for it to be accepted by the swingset kernel (most notably a type string).
func finishAction[T *deliverInboundAction | *walletAction | *walletSpendAction | *provisionAction | *installBundleAction](action T, ctx sdk.Context) T {
	meta := &ActionMeta{BlockHeight: ctx.BlockHeight(), BlockTime: ctx.BlockTime().Unix()}
	switch typed := any(action).(type) {
	case *deliverInboundAction:
		meta.Type = "DELIVER_INBOUND"
		typed.ActionMeta = meta
	case *walletAction:
		meta.Type = "WALLET_ACTION"
		typed.ActionMeta = meta
	case *walletSpendAction:
		meta.Type = "WALLET_SPEND_ACTION"
		typed.ActionMeta = meta
	case *provisionAction:
		meta.Type = "PLEASE_PROVISION"
		typed.ActionMeta = meta
	case *installBundleAction:
		meta.Type = "INSTALL_BUNDLE"
		typed.ActionMeta = meta
	default:
		panic(fmt.Errorf("Unexpected action: %T", action))
	}
	return action
}

// routeAction appends an action to either the normal or high-priority queue
// based on details of its containing message.
func (keeper msgServer) routeAction(ctx sdk.Context, msg vm.ControllerAdmissionMsg, action vm.Jsonable) error {
	isHighPriority, err := msg.IsHighPriority(ctx, keeper)
	if err != nil {
		return err
	}

	if isHighPriority {
		return keeper.PushHighPriorityAction(ctx, action)
	} else {
		return keeper.PushAction(ctx, action)
	}
}

func (keeper msgServer) DeliverInbound(goCtx context.Context, msg *types.MsgDeliverInbound) (*types.MsgDeliverInboundResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// msg.Nums and msg.Messages must be zipped into an array of [num, message] pairs.
	messages := make([][]interface{}, len(msg.Messages))
	for i, message := range msg.Messages {
		messages[i] = []interface{}{msg.Nums[i], message}
	}
	action := finishAction(&deliverInboundAction{
		Peer:     msg.Submitter.String(),
		Messages: messages,
		Ack:      msg.Ack,
	}, ctx)

	err := keeper.routeAction(ctx, msg, action)
	if err != nil {
		return nil, err
	}
	return &types.MsgDeliverInboundResponse{}, nil
}

func (keeper msgServer) WalletAction(goCtx context.Context, msg *types.MsgWalletAction) (*types.MsgWalletActionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	err := keeper.provisionIfNeeded(ctx, msg.Owner)
	if err != nil {
		return nil, err
	}

	action := finishAction(&walletAction{
		Owner:  msg.Owner.String(),
		Action: msg.Action,
	}, ctx)

	err = keeper.routeAction(ctx, msg, action)
	if err != nil {
		return nil, err
	}
	return &types.MsgWalletActionResponse{}, nil
}

func (keeper msgServer) WalletSpendAction(goCtx context.Context, msg *types.MsgWalletSpendAction) (*types.MsgWalletSpendActionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	err := keeper.provisionIfNeeded(ctx, msg.Owner)
	if err != nil {
		return nil, err
	}

	action := finishAction(&walletSpendAction{
		Owner:       msg.Owner.String(),
		SpendAction: msg.SpendAction,
	}, ctx)

	err = keeper.routeAction(ctx, msg, action)
	if err != nil {
		return nil, err
	}
	return &types.MsgWalletSpendActionResponse{}, nil
}

// provisionIfNeeded generates a provision action if no smart wallet is already
// provisioned for the account. This assumes that all messages for
// non-provisioned smart wallets allowed by the admission AnteHandler should
// auto-provision the smart wallet.
func (keeper msgServer) provisionIfNeeded(ctx sdk.Context, owner sdk.AccAddress) error {
	// We need to generate a provision action until the smart wallet has
	// been fully provisioned by the controller. This is because a provision is
	// not guaranteed to succeed (e.g. lack of provision pool funds)
	walletState := keeper.GetSmartWalletState(ctx, owner)
	if walletState == types.SmartWalletStateProvisioned {
		return nil
	}

	msg := &types.MsgProvision{
		Address:    owner,
		Submitter:  owner,
		PowerFlags: []string{types.PowerFlagSmartWallet},
	}

	action := finishAction(&provisionAction{
		MsgProvision:  msg,
		AutoProvision: true,
	}, ctx)

	err := keeper.routeAction(ctx, msg, action)
	if err != nil {
		return err
	}

	return nil
}

func (keeper msgServer) Provision(goCtx context.Context, msg *types.MsgProvision) (*types.MsgProvisionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	err := keeper.ChargeForProvisioning(ctx, msg.Submitter, msg.Address, msg.PowerFlags)
	if err != nil {
		return nil, err
	}

	action := finishAction(&provisionAction{
		MsgProvision: msg,
	}, ctx)

	// Create the account, if it doesn't already exist.
	egress := types.NewEgress(msg.Nickname, msg.Address, msg.PowerFlags)
	err = keeper.SetEgress(ctx, egress)
	if err != nil {
		return nil, err
	}

	err = keeper.routeAction(ctx, msg, action)
	if err != nil {
		return nil, err
	}

	return &types.MsgProvisionResponse{}, nil
}

func (keeper msgServer) InstallBundle(goCtx context.Context, msg *types.MsgInstallBundle) (*types.MsgInstallBundleResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	err := msg.Uncompress()
	if err != nil {
		return nil, err
	}

	action := finishAction(&installBundleAction{
		MsgInstallBundle: msg,
	}, ctx)

	err = keeper.routeAction(ctx, msg, action)
	if err != nil {
		return nil, err
	}

	return &types.MsgInstallBundleResponse{}, nil
}
