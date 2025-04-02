package keeper

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
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

func (keeper msgServer) WalletSpendAction(goCtx context.Context, msg *types.MsgWalletSpendAction) (*types.MsgWalletSpendActionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	err := keeper.provisionIfNeeded(ctx, msg.Owner)
	if err != nil {
		return nil, err
	}

	action := walletSpendAction{
		Owner:       msg.Owner.String(),
		SpendAction: msg.SpendAction,
	}
	// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)
	err = keeper.routeAction(ctx, msg, action)
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
	if walletState == types.SmartWalletStateProvisioned {
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
	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return err
	}

	return nil
}

func (keeper msgServer) Provision(goCtx context.Context, msg *types.MsgProvision) (*types.MsgProvisionResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	err := keeper.ChargeForProvisioning(ctx, msg.Submitter, msg.PowerFlags)
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
	if msg.BundleChunks == nil || len(msg.BundleChunks.Chunks) == 0 {
		return keeper.InstallFinishedBundle(goCtx, msg)
	}

	// Mark all the chunks as in-flight.
	bc := *msg.BundleChunks
	bc.Chunks = make([]*types.ChunkInfo, len(bc.Chunks))
	for i, chunk := range bc.Chunks {
		ci := *chunk
		ci.State = types.ChunkState_CHUNK_STATE_IN_FLIGHT
		bc.Chunks[i] = &ci
	}
	msg.BundleChunks = &bc

	pendingId := keeper.AddPendingBundleInstall(ctx, msg)
	return &types.MsgInstallBundleResponse{PendingId: pendingId}, nil
}

func (keeper msgServer) InstallFinishedBundle(goCtx context.Context, msg *types.MsgInstallBundle) (*types.MsgInstallBundleResponse, error) {
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

func (keeper msgServer) SendChunk(goCtx context.Context, msg *types.MsgSendChunk) (*types.MsgSendChunkResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	inst := keeper.GetPendingBundleInstall(ctx, msg.PendingId)
	if inst == nil {
		return nil, fmt.Errorf("no upload in progress for pending Id %d", msg.PendingId)
	}

	bc := inst.BundleChunks

	if msg.ChunkIndex < 0 || msg.ChunkIndex >= uint64(len(bc.Chunks)) {
		return nil, fmt.Errorf("chunk index %d out of range for pending Id %d", msg.ChunkIndex, msg.PendingId)
	}

	if bc.Chunks[msg.ChunkIndex].State != types.ChunkState_CHUNK_STATE_IN_FLIGHT {
		return nil, fmt.Errorf("chunk %d is not in flight for pending Id %d", msg.ChunkIndex, msg.PendingId)
	}

	// Verify the chunk data.
	ci := bc.Chunks[msg.ChunkIndex]
	if ci.ChunkSize != uint64(len(msg.ChunkData)) {
		return nil, fmt.Errorf("chunk %d size mismatch for pending Id %d", msg.ChunkIndex, msg.PendingId)
	}

	sha256Hash, err := hex.DecodeString(ci.Hash)
	if err != nil {
		return nil, fmt.Errorf("chunk %d cannot decode hash %s: %s", msg.ChunkIndex, ci.Hash, err)
	}

	hasher := sha256.New()
	sum := hasher.Sum(msg.ChunkData)
	if !bytes.Equal(sum, sha256Hash) {
		return nil, fmt.Errorf("chunk %d hash mismatch; expected %x, got %x", msg.ChunkIndex, sha256Hash, sum)
	}

	// Data is valid, so store it.
	keeper.SetPendingChunkData(ctx, msg.PendingId, msg.ChunkIndex, msg.ChunkData)

	// Mark the chunk as received, and store the pending installation.
	ci.State = types.ChunkState_CHUNK_STATE_RECEIVED
	keeper.SetPendingBundleInstall(ctx, msg.PendingId, inst)

	res, err := keeper.MaybeFinalizeBundle(ctx, msg.PendingId)

	return &types.MsgSendChunkResponse{
		PendingId:       msg.PendingId,
		Chunk:           ci,
		InstallResponse: res,
	}, err
}

func (keeper msgServer) MaybeFinalizeBundle(ctx sdk.Context, pendingId uint64) (*types.MsgInstallBundleResponse, error) {
	msg := keeper.GetPendingBundleInstall(ctx, pendingId)
	if msg == nil {
		return nil, nil
	}

	// If any chunks are not received, then bail (without error).
	bc := msg.BundleChunks
	totalChunkSize := uint64(0)
	for _, chunk := range bc.Chunks {
		if chunk.State != types.ChunkState_CHUNK_STATE_RECEIVED {
			return nil, nil
		}
		totalChunkSize += chunk.ChunkSize
	}

	chunkData := make([]byte, 0, totalChunkSize)
	for i := range bc.Chunks {
		bz := keeper.GetPendingChunkData(ctx, pendingId, uint64(i))
		chunkData = append(chunkData, bz...)
	}

	// Verify the hash of the concatenated chunks.
	hasher := sha256.New()
	sum := hasher.Sum(chunkData)
	sha256Hash, err := hex.DecodeString(bc.BundleHash)
	if err != nil {
		return nil, fmt.Errorf("cannot decode hash %s: %s", bc.BundleHash, err)
	}
	if !bytes.Equal(sum, sha256Hash) {
		return nil, fmt.Errorf("bundle hash mismatch; expected %x, got %x", sha256Hash, sum)
	}

	// Is it compressed or not?
	if msg.UncompressedSize > 0 {
		msg.CompressedBundle = chunkData
	} else {
		msg.Bundle = string(chunkData)
	}

	// Clean up the pending installation state.
	msg.BundleChunks = nil
	keeper.SetPendingBundleInstall(ctx, pendingId, nil)

	// Install the bundle now that all the chunks are processed.
	return keeper.InstallFinishedBundle(ctx, msg)
}
