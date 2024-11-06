package keeper

import (
	"context"
	stdlog "log"
	"os"
	"runtime/debug"
	"strings"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vstoragetesting "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/testing"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

type msgServer struct {
	Keeper
}

// NewMsgServerImpl returns an implementation of the bank MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

var _ types.MsgServer = msgServer{}

type deliverInboundAction struct {
	*vm.ActionHeader `actionType:"DELIVER_INBOUND"`
	Peer             string          `json:"peer"`
	Messages         [][]interface{} `json:"messages"`
	Ack              uint64          `json:"ack"`
}

func (keeper msgServer) routeAction(ctx sdk.Context, msg vm.ControllerAdmissionMsg, action vm.Action) error {
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
	action := deliverInboundAction{
		Peer:     msg.Submitter.String(),
		Messages: messages,
		Ack:      msg.Ack,
	}

	err := keeper.routeAction(ctx, msg, action)
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}
	return &types.MsgDeliverInboundResponse{}, nil
}

type walletAction struct {
	*vm.ActionHeader `actionType:"WALLET_ACTION"`
	Owner            string `json:"owner"`
	Action           string `json:"action"`
}

func (keeper msgServer) WalletAction(goCtx context.Context, msg *types.MsgWalletAction) (*types.MsgWalletActionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	err := keeper.provisionIfNeeded(ctx, msg.Owner)
	if err != nil {
		return nil, err
	}

	action := walletAction{
		Owner:  msg.Owner.String(),
		Action: msg.Action,
	}
	// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)

	err = keeper.routeAction(ctx, msg, action)
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}
	return &types.MsgWalletActionResponse{}, nil
}

type walletSpendAction struct {
	*vm.ActionHeader `actionType:"WALLET_SPEND_ACTION"`
	Owner            string `json:"owner"`
	SpendAction      string `json:"spendAction"`
}

type MultiStoreSpy struct {
	storetypes.MultiStore
}
func (spy MultiStoreSpy) GetKVStore(storeKey storetypes.StoreKey) storetypes.KVStore {
	return KVStoreSpy{spy.MultiStore.GetKVStore(storeKey), storeKey.Name()}
}

type KVStoreSpy struct {
	storetypes.KVStore
	name string
}
func (spy KVStoreSpy) Get(key []byte) []byte {
	got := spy.KVStore.Get(key)
	stdlog.Printf("xxx gibson KVStore(%#q).Get(%#q) = %#q [k+v = %d]\n",
		spy.name, key, got, len(key) + len(got))
	return got
}
func (spy KVStoreSpy) Set(key, value []byte) {
	spy.KVStore.Set(key, value)
	stdlog.Printf("xxx gibson KVStore(%#q).Set(%#q, %#q) [k+v = %d]\n",
		spy.name, key, value, len(key) + len(value))
}
func (spy KVStoreSpy) Has(key []byte) bool {
	found := spy.KVStore.Has(key)
	stdlog.Printf("xxx gibson KVStore(%#q).Has(%#q) = %v\n",
		spy.name, key, found)
	return found
}
func (spy KVStoreSpy) Delete(key []byte) {
	spy.KVStore.Delete(key)
	stdlog.Printf("xxx gibson KVStore(%#q).Delete(%#q)\n",
		spy.name, key)
}

type GasMeterSpy struct {
	storetypes.GasMeter
}
func (spy GasMeterSpy) ConsumeGas(amount storetypes.Gas, descriptor string) {
	stdlog.Printf("xxx gibson ConsumeGas %v %v\n", descriptor, amount)
	spy.GasMeter.ConsumeGas(amount, descriptor)
}

func (keeper msgServer) WalletSpendAction(goCtx context.Context, msg *types.MsgWalletSpendAction) (*types.MsgWalletSpendActionResponse, error) {
	xxx_gibson := false
	for _, kv := range os.Environ() {
		key, value, ok := strings.Cut(kv, "=")
		xxx_gibson = xxx_gibson || ok && key == "XXX_GIBSON" && value != "" && value != "0"
	}
	ctx := sdk.UnwrapSDKContext(goCtx)
	if xxx_gibson {
		ctx = ctx.WithMultiStore(&MultiStoreSpy{ctx.MultiStore()})
		ctx = ctx.WithGasMeter(&GasMeterSpy{ctx.GasMeter()})
	}

	err := keeper.provisionIfNeeded(ctx, msg.Owner)
	if xxx_gibson {
		stdlog.Println("xxx gibson WalletSpendAction ready", msg.Owner, err)
	}
	if err != nil {
		return nil, err
	}

	if xxx_gibson {
		defer func() {
			if x := recover(); x != nil {
				stdlog.Printf("xxx gibson WalletSpendAction caught panic %v %q\n%s\n", msg.Owner, x,
					debug.Stack())
				panic(x)
			}
			stdlog.Println("xxx gibson WalletSpendAction done", msg.Owner)
		}()
	}
	action := walletSpendAction{
		Owner:       msg.Owner.String(),
		SpendAction: msg.SpendAction,
	}
	// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)
	err = keeper.routeAction(ctx, msg, action)
	highPriorityQueueItems, hpqErr := vstoragetesting.GetQueueItems(
		ctx, keeper.Keeper.vstorageKeeper, StoragePathHighPriorityQueue)
	actionQueueItems, aqErr := vstoragetesting.GetQueueItems(
		ctx, keeper.Keeper.vstorageKeeper, StoragePathActionQueue)
	if xxx_gibson {
		stdlog.Printf(
			"xxx gibson WalletSpendAction routeAction %v: error %v, queues %#q %v %#q %v\n",
			msg.Owner, err, highPriorityQueueItems, hpqErr, actionQueueItems, aqErr)
	}
	if err != nil {
		return nil, err
	}
	return &types.MsgWalletSpendActionResponse{}, nil
}

type provisionAction struct {
	*vm.ActionHeader `actionType:"PLEASE_PROVISION"`
	*types.MsgProvision
	AutoProvision bool `json:"autoProvision"`
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
	xxx_gibson := false
	for _, kv := range os.Environ() {
		key, value, ok := strings.Cut(kv, "=")
		xxx_gibson = xxx_gibson || ok && key == "XXX_GIBSON" && value != "" && value != "0"
	}
	if walletState == types.SmartWalletStateProvisioned {
		if xxx_gibson {
			stdlog.Println("xxx gibson provisionIfNeeded", owner, "already provisioned")
		}
		return nil
	}

	msg := &types.MsgProvision{
		Address:    owner,
		Submitter:  owner,
		PowerFlags: []string{types.PowerFlagSmartWallet},
	}

	action := provisionAction{
		MsgProvision:  msg,
		AutoProvision: true,
	}

	err := keeper.routeAction(ctx, msg, action)
	highPriorityQueueItems, hpqErr := vstoragetesting.GetQueueItems(
		ctx, keeper.Keeper.vstorageKeeper, StoragePathHighPriorityQueue)
	actionQueueItems, aqErr := vstoragetesting.GetQueueItems(
		ctx, keeper.Keeper.vstorageKeeper, StoragePathActionQueue)
	if xxx_gibson {
		stdlog.Printf(
			"xxx gibson provisionIfNeeded routeAction %v: error %v, queues %#q %v %#q %v\n",
			owner, err, highPriorityQueueItems, hpqErr, actionQueueItems, aqErr)
	}
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
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

	action := provisionAction{
		MsgProvision: msg,
	}

	// Create the account, if it doesn't already exist.
	egress := types.NewEgress(msg.Nickname, msg.Address, msg.PowerFlags)
	err = keeper.SetEgress(ctx, egress)
	if err != nil {
		return nil, err
	}

	err = keeper.routeAction(ctx, msg, action)
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}

	return &types.MsgProvisionResponse{}, nil
}

type installBundleAction struct {
	*vm.ActionHeader `actionType:"INSTALL_BUNDLE"`
	*types.MsgInstallBundle
}

func (keeper msgServer) InstallBundle(goCtx context.Context, msg *types.MsgInstallBundle) (*types.MsgInstallBundleResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	err := msg.Uncompress()
	if err != nil {
		return nil, err
	}
	action := installBundleAction{
		MsgInstallBundle: msg,
	}

	err = keeper.routeAction(ctx, msg, action)
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}

	return &types.MsgInstallBundleResponse{}, nil
}
