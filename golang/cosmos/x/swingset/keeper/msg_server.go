package keeper

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/hex"
	"fmt"

	sdkioerrors "cosmossdk.io/errors"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

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

	if msg.Submitter.Empty() {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidAddress, "Submitter address cannot be empty")
	}
	if len(msg.Messages) != len(msg.Nums) {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Messages and Nums must be the same length")
	}
	for _, m := range msg.Messages {
		if len(m) == 0 {
			return nil, sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Messages cannot be empty")
		}
	}

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

func (keeper msgServer) validateMsgInstallBundle(goCtx context.Context, msg *types.MsgInstallBundle) error {
	if err := msg.ValidateBasic(); err != nil {
		return err
	}
	ctx := sdk.UnwrapSDKContext(goCtx)
	params := keeper.GetParams(ctx)
	if msg.UncompressedSize >= params.BundleUncompressedSizeLimitBytes {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Uncompressed size out of range")
	}
	return keeper.validateChunkedArtifact(goCtx, msg.ChunkedArtifact)
}

func (keeper msgServer) validateChunkedArtifact(goCtx context.Context, msg *types.ChunkedArtifact) error {
	if msg == nil {
		return nil
	}
	if err := msg.ValidateBasic(); err != nil {
		return err
	}
	ctx := sdk.UnwrapSDKContext(goCtx)
	params := keeper.GetParams(ctx)
	if msg.SizeBytes == 0 || int64(msg.SizeBytes) >= params.BundleUncompressedSizeLimitBytes {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Bundle size out of range")
	}
	chunkIndexLimit := types.MaxArtifactChunksCount(params.BundleUncompressedSizeLimitBytes, params.ChunkSizeLimitBytes)
	if int64(len(msg.Chunks)) > chunkIndexLimit {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Number of bundle chunks must be less than %d", chunkIndexLimit)
	}
	for i, chunk := range msg.Chunks {
		if chunk.SizeBytes == 0 || int64(chunk.SizeBytes) > params.ChunkSizeLimitBytes {
			return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk %d size out of range", i)
		}
	}
	return nil
}

func (keeper msgServer) validateMsgSendChunk(goCtx context.Context, msg *types.MsgSendChunk) error {
	if err := msg.ValidateBasic(); err != nil {
		return err
	}
	ctx := sdk.UnwrapSDKContext(goCtx)
	params := keeper.GetParams(ctx)
	if int64(len(msg.ChunkData)) > params.ChunkSizeLimitBytes {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk size must be at most %d bytes", params.ChunkSizeLimitBytes)
	}
	chunkIndexLimit := types.MaxArtifactChunksCount(params.BundleUncompressedSizeLimitBytes, params.ChunkSizeLimitBytes)
	if int64(msg.ChunkIndex) >= chunkIndexLimit {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk index must be less than %d", chunkIndexLimit)
	}
	return nil
}

func (keeper msgServer) InstallBundle(goCtx context.Context, msg *types.MsgInstallBundle) (*types.MsgInstallBundleResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)
	if err := keeper.validateMsgInstallBundle(goCtx, msg); err != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	if msg.ChunkedArtifact == nil || len(msg.ChunkedArtifact.Chunks) == 0 {
		return keeper.InstallFinishedBundle(goCtx, msg)
	}

	// Mark all the chunks as in-flight.
	ca := *msg.ChunkedArtifact
	chunks := make([]*types.ChunkInfo, len(ca.Chunks))
	for i, chunk := range ca.Chunks {
		if chunk == nil {
			return nil, fmt.Errorf("chunk %d is nil", i)
		}
		ci := *chunk
		if ci.State != types.ChunkState_CHUNK_STATE_UNSPECIFIED {
			return nil, fmt.Errorf("chunk %d state must be unspecified", i)
		}
		ci.State = types.ChunkState_CHUNK_STATE_IN_FLIGHT
		chunks[i] = &ci
	}
	ca.Chunks = chunks
	msg.ChunkedArtifact = &ca

	chunkedArtifactId, err := keeper.AddPendingBundleInstall(ctx, msg)
	if err != nil {
		return nil, err
	}
	return &types.MsgInstallBundleResponse{ChunkedArtifactId: chunkedArtifactId}, nil
}

func (keeper msgServer) InstallFinishedBundle(goCtx context.Context, msg *types.MsgInstallBundle) (*types.MsgInstallBundleResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := msg.Uncompress(); err != nil {
		return nil, err
	}

	if err := msg.ValidateBasic(); err != nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	action := installBundleAction{
		MsgInstallBundle: msg,
	}

	if err := keeper.routeAction(ctx, msg, action); err != nil {
		// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
		return nil, err
	}

	return &types.MsgInstallBundleResponse{}, nil
}

func (k msgServer) CoreEval(goCtx context.Context, msg *types.MsgCoreEval) (*types.MsgCoreEvalResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if msg.Authority != k.authority {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrUnauthorized, "only governance authority can call CoreEval")
	}

	action := coreEvalAction{
		Evals: []types.CoreEval{
			{
				JsonPermits: msg.JsonPermits,
				JsCode:      msg.JsCode,
			},
		},
	}

	err := k.PushCoreEvalAction(ctx, action)
	if err != nil {
		return &types.MsgCoreEvalResponse{
			Result: err.Error(),
		}, err
	}

	return &types.MsgCoreEvalResponse{}, nil
}

func (keeper msgServer) SendChunk(goCtx context.Context, msg *types.MsgSendChunk) (*types.MsgSendChunkResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if err := keeper.validateMsgSendChunk(goCtx, msg); err != nil {
		return nil, err
	}

	inst := keeper.GetPendingBundleInstall(ctx, msg.ChunkedArtifactId)
	if inst == nil {
		return nil, fmt.Errorf("no upload in progress for chunked artifact identifier %d", msg.ChunkedArtifactId)
	}

	ca := inst.ChunkedArtifact

	if msg.ChunkIndex >= uint64(len(ca.Chunks)) {
		return nil, fmt.Errorf("chunk index %d out of range for chunked artifact identifier %d", msg.ChunkIndex, msg.ChunkedArtifactId)
	}

	if ca.Chunks[msg.ChunkIndex].State != types.ChunkState_CHUNK_STATE_IN_FLIGHT {
		return nil, fmt.Errorf("chunk %d must be in flight for chunked artifact id %d", msg.ChunkIndex, msg.ChunkedArtifactId)
	}

	// Verify the chunk data.
	ci := ca.Chunks[msg.ChunkIndex]
	if ci.SizeBytes != uint64(len(msg.ChunkData)) {
		return nil, fmt.Errorf("chunk %d size mismatch for chunked artifact id %d", msg.ChunkIndex, msg.ChunkedArtifactId)
	}

	expectedSha512, err := hex.DecodeString(ci.Sha512)
	if err != nil {
		return nil, fmt.Errorf("chunk %d cannot decode hash %s: %s", msg.ChunkIndex, ci.Sha512, err)
	}

	actualSha512 := sha512.Sum512(msg.ChunkData)
	if len(expectedSha512) != sha512.Size {
		return nil, fmt.Errorf(
			"chunk %d hash length mismatch; expected %d, got %d",
			msg.ChunkIndex,
			sha512.Size,
			len(expectedSha512),
		)
	}
	if !bytes.Equal(actualSha512[:], expectedSha512) {
		return nil, fmt.Errorf("chunk %d hash mismatch; expected %x, got %x", msg.ChunkIndex, expectedSha512, actualSha512)
	}

	// Data is valid, so store it.
	keeper.SetPendingChunkData(ctx, msg.ChunkedArtifactId, msg.ChunkIndex, msg.ChunkData)

	// Mark the chunk as received, and store the pending installation.
	ci.State = types.ChunkState_CHUNK_STATE_RECEIVED
	if err := keeper.SetPendingBundleInstall(ctx, msg.ChunkedArtifactId, inst); err != nil {
		return nil, err
	}

	err = keeper.MaybeFinalizeBundle(ctx, msg.ChunkedArtifactId)
	if err != nil {
		return nil, err
	}

	return &types.MsgSendChunkResponse{
		ChunkedArtifactId: msg.ChunkedArtifactId,
		Chunk:             ci,
	}, err
}

func (keeper msgServer) MaybeFinalizeBundle(ctx sdk.Context, chunkedArtifactId uint64) error {
	msg := keeper.GetPendingBundleInstall(ctx, chunkedArtifactId)
	if msg == nil {
		return nil
	}

	// If any chunks are not received, then bail (without error).
	ca := msg.ChunkedArtifact
	var totalSize uint64
	for _, chunk := range ca.Chunks {
		if chunk.State != types.ChunkState_CHUNK_STATE_RECEIVED {
			return nil
		}
		totalSize += chunk.SizeBytes
	}

	chunkData := make([]byte, 0, totalSize)
	for i := range ca.Chunks {
		bz := keeper.GetPendingChunkData(ctx, chunkedArtifactId, uint64(i))
		chunkData = append(chunkData, bz...)
	}

	// Verify the hash of the concatenated chunks.
	actualSha512 := sha512.Sum512(chunkData)
	expectedSha512, err := hex.DecodeString(ca.Sha512)
	if err != nil {
		return fmt.Errorf("cannot decode hash %s: %s", ca.Sha512, err)
	}
	if !bytes.Equal(expectedSha512, actualSha512[:]) {
		return fmt.Errorf("bundle hash mismatch; expected %x, got %x", expectedSha512, actualSha512)
	}

	// Is it compressed or not?
	if msg.UncompressedSize > 0 {
		msg.CompressedBundle = chunkData
	} else {
		msg.Bundle = string(chunkData)
	}

	// Clean up the pending installation state.
	msg.ChunkedArtifact = nil
	if err := keeper.SetPendingBundleInstall(ctx, chunkedArtifactId, nil); err != nil {
		return err
	}

	// Install the bundle now that all the chunks are processed.
	_, err = keeper.InstallFinishedBundle(ctx, msg)
	return err
}
