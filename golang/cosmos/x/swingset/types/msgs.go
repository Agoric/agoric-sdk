package types

import (
	"bytes"
	"compress/gzip"
	"crypto/sha512"
	"encoding/json"
	"io"
	"regexp"
	"strings"

	sdkioerrors "cosmossdk.io/errors"
	sdkmath "cosmossdk.io/math"
	"cosmossdk.io/x/tx/signing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/protoadapt"
	"google.golang.org/protobuf/reflect/protoreflect"
)

const RouterKey = ModuleName // this was defined in your key.go file

var (
	_ sdk.Msg = &MsgDeliverInbound{}
	_ sdk.Msg = &MsgProvision{}
	_ sdk.Msg = &MsgInstallBundle{}
	_ sdk.Msg = &MsgSendChunk{}
	_ sdk.Msg = &MsgWalletAction{}
	_ sdk.Msg = &MsgWalletSpendAction{}
	_ sdk.Msg = &MsgCoreEval{}

	_ vm.ControllerAdmissionMsg = &MsgDeliverInbound{}
	_ vm.ControllerAdmissionMsg = &MsgInstallBundle{}
	_ vm.ControllerAdmissionMsg = &MsgSendChunk{}
	_ vm.ControllerAdmissionMsg = &MsgProvision{}
	_ vm.ControllerAdmissionMsg = &MsgWalletAction{}
	_ vm.ControllerAdmissionMsg = &MsgWalletSpendAction{}
)

// Replacing msg.GetSigners() but before we can adopt AddressString.
// https://github.com/cosmos/cosmos-sdk/issues/20077#issuecomment-2062601533
func createSignerFieldFunc(fieldName protoreflect.Name) signing.GetSignersFunc {
	return func(msgIn proto.Message) ([][]byte, error) {
		msg := msgIn.ProtoReflect()
		if !msg.Has(msg.Descriptor().Fields().ByName(fieldName)) {
			return nil, sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "message %T does not have field %s", msgIn, fieldName)
		}
		addr := msg.Get(msg.Descriptor().Fields().ByName(fieldName)).Interface().([]byte)
		return [][]byte{addr}, nil
	}
}

func DefineCustomGetSigners(options *signing.Options) {
	options.DefineCustomGetSigners(
		proto.MessageName(protoadapt.MessageV2Of(&MsgDeliverInbound{})),
		createSignerFieldFunc("submitter"),
	)
	options.DefineCustomGetSigners(
		proto.MessageName(protoadapt.MessageV2Of(&MsgProvision{})),
		createSignerFieldFunc("submitter"),
	)
	options.DefineCustomGetSigners(
		proto.MessageName(protoadapt.MessageV2Of(&MsgInstallBundle{})),
		createSignerFieldFunc("submitter"),
	)
	options.DefineCustomGetSigners(
		proto.MessageName(protoadapt.MessageV2Of(&MsgWalletAction{})),
		createSignerFieldFunc("owner"),
	)
	options.DefineCustomGetSigners(
		proto.MessageName(protoadapt.MessageV2Of(&MsgWalletSpendAction{})),
		createSignerFieldFunc("owner"),
	)
}

// IsHexBytes defines a regular expression to check if the string represents
// only hexadecimal bytes.
var IsHexBytes = regexp.MustCompile(`^([0-9a-fA-F]{2})+$`).MatchString

// Contextual information about the message source of an action on an inbound queue.
// This context should be unique per inboundQueueRecord.
type ActionContext struct {
	// The block height in which the corresponding action was enqueued
	BlockHeight int64 `json:"blockHeight"`
	// The hash of the cosmos transaction that included the message
	// If the action didn't result from a transaction message, a substitute value
	// may be used. For example the VBANK_BALANCE_UPDATE actions use `x/vbank`.
	TxHash string `json:"txHash"`
	// The index of the message within the transaction. If the action didn't
	// result from a cosmos transaction, a number should be chosen to make the
	// actionContext unique. (for example a counter per block and source module).
	MsgIdx int `json:"msgIdx"`
}

type InboundQueueRecord struct {
	Action  vm.Jsonable   `json:"action"`
	Context ActionContext `json:"context"`
}

const (
	// BundleUncompressedSizeLimit is the (exclusive) limit on uncompressed bundle size.
	// We must ensure there is an exclusive int64 limit in order to detect an underflow.
	BundleUncompressedSizeLimit uint64 = 10 * 1024 * 1024 // 10MB
	ChunkSizeLimit              uint64 = 512 * 1024       // 512KB
	ChunkIndexLimit             uint64 = (BundleUncompressedSizeLimit + ChunkSizeLimit - 1) / ChunkSizeLimit
)

// Charge an account address for the beans associated with given messages and storage.
// See list of bean charges in default-params.go
func chargeAdmission(
	ctx sdk.Context,
	keeper SwingSetKeeper,
	beansPerUnit map[string]sdkmath.Uint,
	addr sdk.AccAddress,
	msgs []string,
	storageLen uint64,
) error {
	// A flat charge for each transaction.
	beans := beansPerUnit[BeansPerInboundTx]
	// A charge for each message in the transaction.
	beans = beans.Add(beansPerUnit[BeansPerMessage].MulUint64((uint64(len(msgs)))))
	// A charge for the total byte length of all messages.
	for _, msg := range msgs {
		beans = beans.Add(beansPerUnit[BeansPerMessageByte].MulUint64(uint64(len(msg))))
	}
	// A charge for persistent storage.
	beans = beans.Add(beansPerUnit[BeansPerStorageByte].MulUint64(storageLen))

	return keeper.ChargeBeans(ctx, beansPerUnit, addr, beans)
}

// checkSmartWalletProvisioned verifies if a smart wallet message (MsgWalletAction
// and MsgWalletSpendAction) can be delivered for the owner's address. A message
// is allowed if a smart wallet is already provisioned for the address, or if the
// provisioning fee is charged successfully.
// All messages for non-provisioned smart wallets allowed here will result in
// an auto-provision action generated by the msg server.
func checkSmartWalletProvisioned(
	ctx sdk.Context,
	keeper SwingSetKeeper,
	beansPerUnit map[string]sdkmath.Uint,
	addr sdk.AccAddress,
) error {
	walletState := keeper.GetSmartWalletState(ctx, addr)

	switch walletState {
	case SmartWalletStateProvisioned:
		// The address already has a smart wallet
		return nil
	case SmartWalletStatePending:
		// A provision (either explicit or automatic) may be pending execution in
		// the controller, or if we ever allow multiple swingset messages per
		// transaction, a previous message may have provisioned the wallet.
		return nil
	default:
		// Charge for the smart wallet.
		// This is a separate charge from the smart wallet action which triggered the check
		// TODO: Currently this call does not mark the smart wallet provisioning as
		// pending, resulting in multiple provisioning charges for the owner.
		return keeper.ChargeForSmartWallet(ctx, beansPerUnit, addr)
	}
}

func NewMsgDeliverInbound(msgs *Messages, submitter sdk.AccAddress) *MsgDeliverInbound {
	return &MsgDeliverInbound{
		Messages:  msgs.Messages,
		Nums:      msgs.Nums,
		Ack:       msgs.Ack,
		Submitter: submitter,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgDeliverInbound) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}

	/*
		// The nondeterministic torture test.  Mark every third message as not inadmissible.
		if rand.Intn(3) == 0 {
			return fmt.Errorf("FIGME: MsgDeliverInbound is randomly not admissible")
		}
	*/

	beansPerUnit := keeper.GetBeansPerUnit(ctx)
	return chargeAdmission(ctx, keeper, beansPerUnit, msg.Submitter, msg.Messages, 0)
}

// GetInboundMsgCount implements InboundMsgCarrier.
func (msg MsgDeliverInbound) GetInboundMsgCount() int32 {
	return 1
}

// IsHighPriority implements the vm.ControllerAdmissionMsg interface.
func (msg MsgDeliverInbound) IsHighPriority(ctx sdk.Context, data interface{}) (bool, error) {
	return false, nil
}

// Route should return the name of the module
func (msg MsgDeliverInbound) Route() string { return RouterKey }

// Type should return the action
func (msg MsgDeliverInbound) Type() string { return "eventualSend" }

// ValidateBasic runs stateless checks on the message
func (msg MsgDeliverInbound) ValidateBasic() error {
	if msg.Submitter.Empty() {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidAddress, "Submitter address cannot be empty")
	}
	if len(msg.Messages) != len(msg.Nums) {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Messages and Nums must be the same length")
	}
	for _, m := range msg.Messages {
		if len(m) == 0 {
			return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Messages cannot be empty")
		}
	}
	return nil
}

// GetSigners defines whose signature is required
func (msg MsgDeliverInbound) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}

func NewMsgWalletAction(owner sdk.AccAddress, action string) *MsgWalletAction {
	return &MsgWalletAction{
		Owner:  owner,
		Action: action,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgWalletAction) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}

	beansPerUnit := keeper.GetBeansPerUnit(ctx)
	err := checkSmartWalletProvisioned(ctx, keeper, beansPerUnit, msg.Owner)
	if err != nil {
		return err
	}

	return chargeAdmission(ctx, keeper, beansPerUnit, msg.Owner, []string{msg.Action}, 0)
}

// GetInboundMsgCount implements InboundMsgCarrier.
func (msg MsgWalletAction) GetInboundMsgCount() int32 {
	return 1
}

// IsHighPriority implements the vm.ControllerAdmissionMsg interface.
func (msg MsgWalletAction) IsHighPriority(ctx sdk.Context, data interface{}) (bool, error) {
	return false, nil
}

// GetSigners defines whose signature is required
func (msg MsgWalletAction) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Owner}
}

// Route should return the name of the module
func (msg MsgWalletAction) Route() string { return RouterKey }

// Type should return the action
func (msg MsgWalletAction) Type() string { return "wallet_action" }

// ValidateBasic runs stateless checks on the message
func (msg MsgWalletAction) ValidateBasic() error {
	if msg.Owner.Empty() {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidAddress, "Owner address cannot be empty")
	}
	if len(strings.TrimSpace(msg.Action)) == 0 {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Action cannot be empty")
	}
	if !json.Valid([]byte(msg.Action)) {
		return sdkioerrors.Wrap(sdkerrors.ErrJSONUnmarshal, "Wallet action must be valid JSON")
	}
	return nil
}

func NewMsgWalletSpendAction(owner sdk.AccAddress, spendAction string) *MsgWalletSpendAction {
	return &MsgWalletSpendAction{
		Owner:       owner,
		SpendAction: spendAction,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgWalletSpendAction) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}

	beansPerUnit := keeper.GetBeansPerUnit(ctx)
	err := checkSmartWalletProvisioned(ctx, keeper, beansPerUnit, msg.Owner)
	if err != nil {
		return err
	}

	return chargeAdmission(ctx, keeper, beansPerUnit, msg.Owner, []string{msg.SpendAction}, 0)
}

// GetInboundMsgCount implements InboundMsgCarrier.
func (msg MsgWalletSpendAction) GetInboundMsgCount() int32 {
	return 1
}

// IsHighPriority implements the vm.ControllerAdmissionMsg interface.
func (msg MsgWalletSpendAction) IsHighPriority(ctx sdk.Context, data interface{}) (bool, error) {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return false, sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}

	return keeper.IsHighPriorityAddress(ctx, msg.Owner)
}

// GetSigners defines whose signature is required
func (msg MsgWalletSpendAction) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Owner}
}

// Route should return the name of the module
func (msg MsgWalletSpendAction) Route() string { return RouterKey }

// Type should return the action
func (msg MsgWalletSpendAction) Type() string { return "wallet_spend_action" }

// ValidateBasic runs stateless checks on the message
func (msg MsgWalletSpendAction) ValidateBasic() error {
	if msg.Owner.Empty() {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidAddress, "Owner address cannot be empty")
	}
	if len(strings.TrimSpace(msg.SpendAction)) == 0 {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Spend action cannot be empty")
	}
	if !json.Valid([]byte(msg.SpendAction)) {
		return sdkioerrors.Wrap(sdkerrors.ErrJSONUnmarshal, "Wallet spend action must be valid JSON")
	}
	return nil
}

func NewMsgProvision(nickname string, addr sdk.AccAddress, powerFlags []string, submitter sdk.AccAddress) *MsgProvision {
	return &MsgProvision{
		Nickname:   nickname,
		Address:    addr,
		PowerFlags: powerFlags,
		Submitter:  submitter,
	}
}

// Route should return the name of the module
func (msg MsgProvision) Route() string { return RouterKey }

// Type should return the action
func (msg MsgProvision) Type() string { return "provision" }

// ValidateBasic runs stateless checks on the message
func (msg MsgProvision) ValidateBasic() error {
	if msg.Submitter.Empty() {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidAddress, "Submitter address cannot be empty")
	}
	if msg.Address.Empty() {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidAddress, "Peer address cannot be empty")
	}
	if len(msg.Nickname) == 0 {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Nickname cannot be empty")
	}
	return nil
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgProvision) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	// TODO: consider disallowing a provision message for a smart wallet if the
	// smart wallet is already provisioned or pending provisioning. However we
	// currently do not track whether a smart wallet is pending provisioning.

	// For explicitly provisioning, swingset will take care of charging,
	// so we skip admission fees.
	return nil
}

// GetInboundMsgCount implements InboundMsgCarrier.
func (msg MsgProvision) GetInboundMsgCount() int32 {
	return 1
}

// IsHighPriority implements the vm.ControllerAdmissionMsg interface.
func (msg MsgProvision) IsHighPriority(ctx sdk.Context, data interface{}) (bool, error) {
	return false, nil
}

// GetSigners defines whose signature is required
func (msg MsgProvision) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}

func NewMsgInstallBundle(bundleJson string, submitter sdk.AccAddress) *MsgInstallBundle {
	return &MsgInstallBundle{
		Bundle:    bundleJson,
		Submitter: submitter,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgInstallBundle) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}
	beansPerUnit := keeper.GetBeansPerUnit(ctx)
	return chargeAdmission(ctx, keeper, beansPerUnit, msg.Submitter, []string{msg.Bundle}, msg.ExpectedUncompressedSize())
}

// GetInboundMsgCount implements InboundMsgCarrier.
func (msg MsgInstallBundle) GetInboundMsgCount() int32 {
	return 1
}

// IsHighPriority implements the vm.ControllerAdmissionMsg interface.
func (msg MsgInstallBundle) IsHighPriority(ctx sdk.Context, data interface{}) (bool, error) {
	return false, nil
}

// Route should return the name of the module
func (msg MsgInstallBundle) Route() string { return RouterKey }

// Type should return the action
func (msg MsgInstallBundle) Type() string { return "installBundle" }

// ValidateBasic runs stateless checks on the message
func (msg MsgInstallBundle) ValidateBasic() error {
	if msg.Submitter.Empty() {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidAddress, "Submitter address cannot be empty")
	}
	hasBundle, hasCompressed, hasChunks := len(msg.Bundle) > 0, len(msg.CompressedBundle) > 0, msg.ChunkedArtifact != nil && len(msg.ChunkedArtifact.Chunks) > 0
	switch {
	case hasBundle && hasCompressed, hasBundle && hasChunks, hasCompressed && hasChunks:
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Cannot submit more than one of bundle, compressed bundle, or chunks")
	case !hasBundle && !hasCompressed && !hasChunks:
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Bundle cannot be empty")
	case msg.UncompressedSize < 0:
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Uncompressed size cannot be negative")
	case msg.UncompressedSize == 0 && hasCompressed:
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Uncompressed size must be set with a compressed bundle")
	case msg.UncompressedSize != 0 && hasBundle:
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Uncompressed size cannot be set with a legacy bundle")
	case uint64(msg.UncompressedSize) >= BundleUncompressedSizeLimit:
		// must enforce a limit to avoid overflow when computing its successor in Uncompress()
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Uncompressed size out of range")
	}
	if !hasChunks {
		// We don't check the accuracy of the uncompressed size here, since it could comsume significant CPU.
		return nil
	}

	// Check that the chunks are valid.
	return msg.ChunkedArtifact.ValidateBasic()
}

// GetSigners defines whose signature is required
func (msg MsgInstallBundle) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}

// ExpectedUncompressedSize returns the expected uncompressed size of the bundle.
func (msg MsgInstallBundle) ExpectedUncompressedSize() uint64 {
	if msg.UncompressedSize > 0 {
		return uint64(msg.UncompressedSize)
	}
	return uint64(len(msg.Bundle))
}

// Compress ensures that a validated bundle has been gzip-compressed.
func (msg *MsgInstallBundle) Compress() error {
	if len(msg.Bundle) == 0 {
		return nil
	}
	msg.UncompressedSize = int64(len(msg.Bundle))
	inBuf := strings.NewReader(msg.Bundle)
	var outBuf bytes.Buffer
	gzipWriter := gzip.NewWriter(&outBuf)
	_, err := io.Copy(gzipWriter, inBuf)
	if err != nil {
		return err
	}
	gzipWriter.Close() // required to flush to underlying buffer
	msg.CompressedBundle = outBuf.Bytes()
	msg.Bundle = ""
	return nil
}

// Uncompress ensures that a validated bundle is uncompressed,
// gzip-uncompressing it if necessary.
// Returns an error (and ends uncompression early) if the uncompressed
// size does not match the expected uncompressed size.
// The successor of the uncompressed size must not overflow.
func (msg *MsgInstallBundle) Uncompress() error {
	if len(msg.Bundle) > 0 {
		return nil
	}
	bytesReader := bytes.NewReader(msg.CompressedBundle)
	ungzipReader, err := gzip.NewReader(bytesReader)
	if err != nil {
		return err
	}
	// Read at most one byte over expected size.
	// Computation doesn't overflow because of ValidateBasic check.
	// Setting the limit over the expected size is needed to detect
	// expansion beyond expectations.
	limitedReader := io.LimitedReader{R: ungzipReader, N: msg.UncompressedSize + 1}
	var buf bytes.Buffer
	n, err := io.Copy(&buf, &limitedReader)
	if err != nil {
		return err
	}
	if n != msg.UncompressedSize {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidRequest, "Uncompressed size does not match expected value")
	}
	msg.Bundle = buf.String()
	msg.CompressedBundle = []byte{}
	msg.UncompressedSize = 0
	return nil
}

func (bc ChunkedArtifact) ValidateBasic() error {
	if len(bc.Chunks) == 0 {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Bundle chunks cannot be empty")
	}
	if uint64(len(bc.Chunks)) >= ChunkIndexLimit {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Number of bundle chunks must be less than %d", ChunkIndexLimit)
	}
	if len(bc.Sha512) != sha512.Size*2 {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Bundle hash must be %d characters", sha512.Size*2)
	}
	if !IsHexBytes(bc.Sha512) {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Bundle hash must be a hex byte string")
	}
	if bc.SizeBytes == 0 || bc.SizeBytes >= BundleUncompressedSizeLimit {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Bundle size out of range")
	}
	var totalSize uint64
	for i, chunk := range bc.Chunks {
		if chunk.SizeBytes == 0 || chunk.SizeBytes > ChunkSizeLimit {
			return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk %d size out of range", i)
		}
		totalSize += chunk.SizeBytes
		if len(chunk.Sha512) != sha512.Size*2 {
			return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk %d hash must be %d characters", i, sha512.Size*2)
		}
		if !IsHexBytes(chunk.Sha512) {
			return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk %d hash must be a hex byte string", i)
		}
		switch chunk.State {
		case ChunkState_CHUNK_STATE_UNSPECIFIED,
			ChunkState_CHUNK_STATE_IN_FLIGHT,
			ChunkState_CHUNK_STATE_RECEIVED,
			ChunkState_CHUNK_STATE_PROCESSED:
			// valid states
		default:
			return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk %d state %s is unrecognized", i, chunk.State.String())
		}
	}

	if bc.SizeBytes != totalSize {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "bundle size %d does not match total chunk sizes %d", bc.SizeBytes, totalSize)
	}
	return nil
}

func NewMsgSendChunk(chunkedArtifactId uint64, submitter sdk.AccAddress, chunkIndex uint64, chunkData []byte) *MsgSendChunk {
	return &MsgSendChunk{
		ChunkedArtifactId: chunkedArtifactId,
		Submitter:         submitter,
		ChunkIndex:        chunkIndex,
		ChunkData:         chunkData,
	}
}

// CheckAdmissibility implements the vm.ControllerAdmissionMsg interface.
func (msg MsgSendChunk) CheckAdmissibility(ctx sdk.Context, data interface{}) error {
	keeper, ok := data.(SwingSetKeeper)
	if !ok {
		return sdkioerrors.Wrapf(sdkerrors.ErrInvalidRequest, "data must be a SwingSetKeeper, not a %T", data)
	}
	beansPerUnit := keeper.GetBeansPerUnit(ctx)
	return chargeAdmission(ctx, keeper, beansPerUnit, msg.Submitter, []string{string(msg.ChunkData)}, uint64(len(msg.ChunkData)))
}

// GetInboundMsgCount implements InboundMsgCarrier.
func (msg MsgSendChunk) GetInboundMsgCount() int32 {
	return 1
}

// IsHighPriority implements the vm.ControllerAdmissionMsg interface.
func (msg MsgSendChunk) IsHighPriority(ctx sdk.Context, data interface{}) (bool, error) {
	return false, nil
}

// Route should return the name of the module
func (msg MsgSendChunk) Route() string { return RouterKey }

// Type should return the action
func (msg MsgSendChunk) Type() string { return "SendChunk" }

// ValidateBasic runs stateless checks on the message
func (msg MsgSendChunk) ValidateBasic() error {
	if msg.ChunkedArtifactId == 0 {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Chunked artifact id must be positive")
	}
	if msg.Submitter.Empty() {
		return sdkioerrors.Wrap(sdkerrors.ErrInvalidAddress, "Submitter address cannot be empty")
	}
	if len(msg.ChunkData) == 0 {
		return sdkioerrors.Wrap(sdkerrors.ErrUnknownRequest, "Chunk data cannot be empty")
	}
	if uint64(len(msg.ChunkData)) > ChunkSizeLimit {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk size must be at most %d", ChunkSizeLimit)
	}
	if msg.ChunkIndex >= ChunkIndexLimit {
		return sdkioerrors.Wrapf(sdkerrors.ErrUnknownRequest, "Chunk index must be less than %d", ChunkIndexLimit)
	}
	return nil
}

// GetSigners defines whose signature is required
func (msg MsgSendChunk) GetSigners() []sdk.AccAddress {
	return []sdk.AccAddress{msg.Submitter}
}
