package ante

import (
	"fmt"

	sdkmath "cosmossdk.io/math"
	swingtypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	"github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/tx"
	"github.com/cosmos/cosmos-sdk/types/tx/signing"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	authsigning "github.com/cosmos/cosmos-sdk/x/auth/signing"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	"github.com/gogo/protobuf/proto"
)

func makeTestTx(msgs ...proto.Message) sdk.Tx {
	wrappedMsgs := make([]*types.Any, len(msgs))
	for i, m := range msgs {
		any, err := types.NewAnyWithValue(m)
		if err != nil {
			panic(err)
		}
		wrappedMsgs[i] = any
	}
	return &tx.Tx{
		Body: &tx.TxBody{
			Messages: wrappedMsgs,
		},
	}
}

func nilAnteHandler(ctx sdk.Context, tx sdk.Tx, simulate bool) (newCtx sdk.Context, err error) {
	return ctx, nil
}

type mockAccountKeeper struct{}

var _ ante.AccountKeeper = mockAccountKeeper{}

func (mak mockAccountKeeper) GetParams(ctx sdk.Context) (params authtypes.Params) {
	return authtypes.Params{}
}

func (mak mockAccountKeeper) GetAccount(ctx sdk.Context, addr sdk.AccAddress) authtypes.AccountI {
	return authtypes.NewBaseAccountWithAddress(addr)
}

func (mak mockAccountKeeper) SetAccount(ctx sdk.Context, acc authtypes.AccountI) {

}

func (mak mockAccountKeeper) GetModuleAddress(moduleName string) sdk.AccAddress {
	return []byte{}
}

type mockBankKeeper struct {
	balances map[string]sdk.Coins
}

var _ authtypes.BankKeeper = &mockBankKeeper{}

func newMockBankKeeper() *mockBankKeeper {
	return &mockBankKeeper{
		balances: map[string]sdk.Coins{},
	}
}

func (mbk *mockBankKeeper) sendCoinsInternal(from, to string, amt sdk.Coins) error {
	fromBalance := mbk.balances[from]
	if !fromBalance.IsAllGTE(amt) {
		return fmt.Errorf("insufficient balance for [%s] want %s, have %s", from, amt, fromBalance)
	}
	mbk.balances[from] = fromBalance.Sub(amt...)
	toBalance := mbk.balances[to]
	mbk.balances[to] = toBalance.Add(amt...)
	return nil
}

func (mbk *mockBankKeeper) SendCoins(ctx sdk.Context, from, to sdk.AccAddress, amt sdk.Coins) error {
	return mbk.sendCoinsInternal(from.String(), to.String(), amt)
}

func (mbk *mockBankKeeper) SendCoinsFromAccountToModule(ctx sdk.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins) error {
	return mbk.sendCoinsInternal(senderAddr.String(), recipientModule, amt)
}

type mockSignModeHandler struct{}

var _ authsigning.SignModeHandler = mockSignModeHandler{}

// DefaultMode is the default mode that is to be used with this handler if no
// other mode is specified. This can be useful for testing and CLI usage
func (msmh mockSignModeHandler) DefaultMode() signing.SignMode {
	return signing.SignMode_SIGN_MODE_DIRECT
}

// Modes is the list of modes supporting by this handler
func (msmh mockSignModeHandler) Modes() []signing.SignMode {
	return []signing.SignMode{signing.SignMode_SIGN_MODE_DIRECT}
}

// GetSignBytes returns the sign bytes for the provided SignMode, SignerData and Tx,
// or an error
func (msmh mockSignModeHandler) GetSignBytes(mode signing.SignMode, data authsigning.SignerData, tx sdk.Tx) ([]byte, error) {
	return []byte{}, nil
}

type mockSwingsetKeeper struct {
	inboundQueueLength    int32
	inboundQueueLengthErr error
	inboundLimit          int32
	mempoolLimit          int32
	emptyQueueAllowed     bool
	isHighPriorityOwner   bool
}

var _ SwingsetKeeper = mockSwingsetKeeper{}
var _ swingtypes.SwingSetKeeper = mockSwingsetKeeper{}

func (msk mockSwingsetKeeper) InboundQueueLength(ctx sdk.Context) (int32, error) {
	return msk.inboundQueueLength, msk.inboundQueueLengthErr
}

func (msk mockSwingsetKeeper) GetState(ctx sdk.Context) swingtypes.State {
	if msk.emptyQueueAllowed {
		return swingtypes.State{}
	}
	return swingtypes.State{
		QueueAllowed: []swingtypes.QueueSize{
			swingtypes.NewQueueSize(swingtypes.QueueInbound, msk.inboundLimit),
			swingtypes.NewQueueSize(swingtypes.QueueInboundMempool, msk.mempoolLimit),
		},
	}
}

func (msk mockSwingsetKeeper) IsHighPriorityAddress(ctx sdk.Context, addr sdk.AccAddress) (bool, error) {
	return msk.isHighPriorityOwner, nil
}

func (msk mockSwingsetKeeper) GetBeansPerUnit(ctx sdk.Context) map[string]sdkmath.Uint {
	return nil
}

func (msk mockSwingsetKeeper) ChargeBeans(ctx sdk.Context, addr sdk.AccAddress, beans sdkmath.Uint) error {
	return fmt.Errorf("not implemented")
}

func (msk mockSwingsetKeeper) GetSmartWalletState(ctx sdk.Context, addr sdk.AccAddress) swingtypes.SmartWalletState {
	panic(fmt.Errorf("not implemented"))
}

func (msk mockSwingsetKeeper) ChargeForSmartWallet(ctx sdk.Context, addr sdk.AccAddress) error {
	return fmt.Errorf("not implemented")
}
