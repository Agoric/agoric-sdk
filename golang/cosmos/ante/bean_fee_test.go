package ante

import (
	"context"
	"testing"
	"time"

	"cosmossdk.io/core/address"
	storetypes "cosmossdk.io/store/types"
	swingtypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authante "github.com/cosmos/cosmos-sdk/x/auth/ante"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	protov2 "google.golang.org/protobuf/proto"
)

func TestBeanFeeDecoratorDeductsNetFeeAndPreservesTotalFeegrant(t *testing.T) {
	feePayer := sdk.AccAddress("fee-payer-addr1")
	feeGranter := sdk.AccAddress("fee-granter-1")
	txFee := sdk.NewCoins(sdk.NewInt64Coin("ubld", 100))
	beanFee := sdk.NewCoins(sdk.NewInt64Coin("ubld", 30))
	netFee := sdk.NewCoins(sdk.NewInt64Coin("ubld", 70))
	msg := &authtypes.MsgUpdateParams{}
	tx := &fakeFeeTx{
		msgs:       []sdk.Msg{msg},
		fee:        txFee,
		gas:        1000,
		feePayer:   feePayer,
		feeGranter: feeGranter,
	}

	accountKeeper := fakeAccountKeeper{
		accounts: map[string]sdk.AccountI{
			feeGranter.String(): authtypes.NewBaseAccountWithAddress(feeGranter),
		},
		moduleAddresses: map[string]sdk.AccAddress{
			"reserve": sdk.AccAddress("reserve-module-"),
		},
	}
	bankKeeper := &capturingBankKeeper{}
	feegrantKeeper := &capturingFeegrantKeeper{}
	msgTypeURL := sdk.MsgTypeURL(msg)
	beanAccountant := &fakeBeanAccountant{
		settleFee:     beanFee,
		optedMsgTypes: map[string]bool{msgTypeURL: true},
	}
	var disposedFrom sdk.AccAddress
	var disposedFees sdk.Coins
	beanDisposer := func(ctx sdk.Context, deductFrom sdk.AccAddress, fees sdk.Coins) error {
		disposedFrom = deductFrom
		disposedFees = fees
		return nil
	}

	ctx := sdk.Context{}.
		WithContext(context.Background()).
		WithEventManager(sdk.NewEventManager()).
		WithGasMeter(storetypes.NewGasMeter(100000))
	decorator := NewBeanFeeDecorator(accountKeeper, bankKeeper, feegrantKeeper, "reserve", beanAccountant, beanDisposer)
	var downstreamTx sdk.Tx
	_, err := decorator.AnteHandle(ctx, tx, false, func(ctx sdk.Context, tx sdk.Tx, simulate bool) (sdk.Context, error) {
		downstreamTx = tx
		return ctx, nil
	})
	if err != nil {
		t.Fatalf("AnteHandle returned error: %v", err)
	}

	if downstreamTx != tx {
		t.Fatalf("downstream tx = %#v, want original tx %#v", downstreamTx, tx)
	}
	if !disposedFrom.Equals(feeGranter) {
		t.Fatalf("bean disposer deductFrom = %s, want %s", disposedFrom, feeGranter)
	}
	if !disposedFees.Equal(beanFee) {
		t.Fatalf("bean disposer fees = %s, want %s", disposedFees, beanFee)
	}
	if !feegrantKeeper.fee.Equal(txFee) {
		t.Fatalf("feegrant fee = %s, want total tx fee %s", feegrantKeeper.fee, txFee)
	}
	if !feegrantKeeper.granter.Equals(feeGranter) {
		t.Fatalf("feegrant granter = %s, want %s", feegrantKeeper.granter, feeGranter)
	}
	if !feegrantKeeper.grantee.Equals(feePayer) {
		t.Fatalf("feegrant grantee = %s, want %s", feegrantKeeper.grantee, feePayer)
	}
	if bankKeeper.recipientModule != "reserve" {
		t.Fatalf("bank recipient = %s, want reserve", bankKeeper.recipientModule)
	}
	if !bankKeeper.sender.Equals(feeGranter) {
		t.Fatalf("bank sender = %s, want %s", bankKeeper.sender, feeGranter)
	}
	if !bankKeeper.amount.Equal(netFee) {
		t.Fatalf("bank amount = %s, want net fee %s", bankKeeper.amount, netFee)
	}
	if len(beanAccountant.charges) != 3 {
		t.Fatalf("bean charges = %v, want inboundTx plus opted message charges", beanAccountant.charges)
	}
	charge := beanAccountant.charges[0]
	if charge.msgTypeURL != "" {
		t.Fatalf("inboundTx msgTypeURL = %q, want empty string", charge.msgTypeURL)
	}
	if charge.unit != swingtypes.BeansPerInboundTx {
		t.Fatalf("charge unit = %q, want %s", charge.unit, swingtypes.BeansPerInboundTx)
	}
	if charge.amount != 1 {
		t.Fatalf("charge amount = %d, want 1", charge.amount)
	}
}

func TestBeanFeeDecoratorSkipsInboundTxForNonOptedMessages(t *testing.T) {
	feePayer := sdk.AccAddress("fee-payer-addr1")
	tx := &fakeFeeTx{
		msgs:     []sdk.Msg{&authtypes.MsgUpdateParams{}},
		fee:      sdk.NewCoins(sdk.NewInt64Coin("ubld", 100)),
		gas:      1000,
		feePayer: feePayer,
	}
	accountKeeper := fakeAccountKeeper{
		accounts: map[string]sdk.AccountI{
			feePayer.String(): authtypes.NewBaseAccountWithAddress(feePayer),
		},
		moduleAddresses: map[string]sdk.AccAddress{
			"reserve": sdk.AccAddress("reserve-module-"),
		},
	}
	beanAccountant := &fakeBeanAccountant{}
	ctx := sdk.Context{}.
		WithContext(context.Background()).
		WithEventManager(sdk.NewEventManager()).
		WithGasMeter(storetypes.NewGasMeter(100000))
	decorator := NewBeanFeeDecorator(accountKeeper, &capturingBankKeeper{}, nil, "reserve", beanAccountant, func(ctx sdk.Context, deductFrom sdk.AccAddress, fees sdk.Coins) error {
		return nil
	})

	_, err := decorator.AnteHandle(ctx, tx, false, nilAnteHandler)
	if err != nil {
		t.Fatalf("AnteHandle returned error: %v", err)
	}
	if len(beanAccountant.charges) != 0 {
		t.Fatalf("bean charges = %v, want none", beanAccountant.charges)
	}
}

type fakeFeeTx struct {
	msgs       []sdk.Msg
	fee        sdk.Coins
	gas        uint64
	feePayer   sdk.AccAddress
	feeGranter sdk.AccAddress
}

func (tx fakeFeeTx) GetMsgs() []sdk.Msg {
	return tx.msgs
}

func (tx fakeFeeTx) GetMsgsV2() ([]protov2.Message, error) {
	return nil, nil
}

func (tx fakeFeeTx) GetGas() uint64 {
	return tx.gas
}

func (tx fakeFeeTx) GetFee() sdk.Coins {
	return tx.fee
}

func (tx fakeFeeTx) FeePayer() []byte {
	return tx.feePayer
}

func (tx fakeFeeTx) FeeGranter() []byte {
	return tx.feeGranter
}

type fakeAccountKeeper struct {
	accounts        map[string]sdk.AccountI
	moduleAddresses map[string]sdk.AccAddress
}

func (ak fakeAccountKeeper) GetParams(ctx context.Context) authtypes.Params {
	return authtypes.DefaultParams()
}

func (ak fakeAccountKeeper) GetAccount(ctx context.Context, addr sdk.AccAddress) sdk.AccountI {
	return ak.accounts[addr.String()]
}

func (ak fakeAccountKeeper) SetAccount(ctx context.Context, acc sdk.AccountI) {
}

func (ak fakeAccountKeeper) GetModuleAddress(moduleName string) sdk.AccAddress {
	return ak.moduleAddresses[moduleName]
}

func (ak fakeAccountKeeper) AddressCodec() address.Codec {
	panic("not implemented")
}

func (ak fakeAccountKeeper) UnorderedTransactionsEnabled() bool {
	return false
}

func (ak fakeAccountKeeper) RemoveExpiredUnorderedNonces(ctx sdk.Context) error {
	return nil
}

func (ak fakeAccountKeeper) TryAddUnorderedNonce(ctx sdk.Context, sender []byte, timestamp time.Time) error {
	return nil
}

type capturingBankKeeper struct {
	sender          sdk.AccAddress
	recipientModule string
	amount          sdk.Coins
}

func (bk *capturingBankKeeper) IsSendEnabledCoins(ctx context.Context, coins ...sdk.Coin) error {
	return nil
}

func (bk *capturingBankKeeper) SendCoins(ctx context.Context, from, to sdk.AccAddress, amt sdk.Coins) error {
	panic("not implemented")
}

func (bk *capturingBankKeeper) SendCoinsFromAccountToModule(ctx context.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins) error {
	bk.sender = senderAddr
	bk.recipientModule = recipientModule
	bk.amount = amt
	return nil
}

func (bk *capturingBankKeeper) MintCoins(ctx context.Context, moduleName string, amt sdk.Coins) error {
	panic("not implemented")
}

func (bk *capturingBankKeeper) SendCoinsFromModuleToAccount(ctx context.Context, senderModule string, recipientAddr sdk.AccAddress, amt sdk.Coins) error {
	panic("not implemented")
}

type capturingFeegrantKeeper struct {
	granter sdk.AccAddress
	grantee sdk.AccAddress
	fee     sdk.Coins
	msgs    []sdk.Msg
}

func (fk *capturingFeegrantKeeper) UseGrantedFees(ctx context.Context, granter, grantee sdk.AccAddress, fee sdk.Coins, msgs []sdk.Msg) error {
	fk.granter = granter
	fk.grantee = grantee
	fk.fee = fee
	fk.msgs = msgs
	return nil
}

type fakeBeanAccountant struct {
	settleFee     sdk.Coins
	optedMsgTypes map[string]bool
	charges       []beanCharge
}

type beanCharge struct {
	addr       sdk.AccAddress
	msgTypeURL string
	unit       string
	amount     uint64
}

func (ba *fakeBeanAccountant) AddBeansOwing(ctx sdk.Context, addr sdk.AccAddress, msgTypeURL string, unit string, amount uint64) {
	ba.charges = append(ba.charges, beanCharge{
		addr:       addr,
		msgTypeURL: msgTypeURL,
		unit:       unit,
		amount:     amount,
	})
}

func (ba *fakeBeanAccountant) SettleBeansOwing(ctx sdk.Context, addr sdk.AccAddress, feeBudget sdk.Coins, dispose func(uint64, sdk.Coins) error) error {
	return dispose(0, ba.settleFee)
}

func (ba *fakeBeanAccountant) HasMsgType(ctx sdk.Context, msgTypeURL string) bool {
	return ba.optedMsgTypes[msgTypeURL]
}

func (ba *fakeBeanAccountant) MinGasPrice(ctx sdk.Context) sdk.DecCoins {
	return nil
}

var _ sdk.FeeTx = (*fakeFeeTx)(nil)
var _ authante.AccountKeeper = fakeAccountKeeper{}
var _ authtypes.BankKeeper = (*capturingBankKeeper)(nil)
var _ BeanAccountant = (*fakeBeanAccountant)(nil)
