package ante

import (
	"context"
	"sync"

	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	authante "github.com/cosmos/cosmos-sdk/x/auth/ante"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	gogoproto "github.com/cosmos/gogoproto/proto"

	swingtypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

type BeanAccountant interface {
	AddBeansOwing(ctx sdk.Context, addr sdk.AccAddress, msgTypeURL string, unit string, amount uint64)
	SettleBeansOwing(ctx sdk.Context, addr sdk.AccAddress, feeBudget sdk.Coins, dispose func(uint64, sdk.Coins) error) error
	HasMsgType(ctx sdk.Context, msgTypeURL string) bool
	MinGasPrice(ctx sdk.Context) sdk.DecCoins
}

type BeanDisposer func(ctx sdk.Context, deductFrom sdk.AccAddress, beanFees sdk.Coins) error

type msgBeanCharger func(ctx sdk.Context, feePayer sdk.AccAddress, msgTypeURL string, msg sdk.Msg) error

type BeanFeeDecorator struct {
	beanAccountant  BeanAccountant
	beanDisposer    BeanDisposer
	msgBeanChargers map[string]msgBeanCharger
	netFeeBank      *netFeeBankKeeper
	deduct          authante.DeductFeeDecorator
}

func NewBeanFeeDecorator(
	accountKeeper authante.AccountKeeper,
	bankKeeper authtypes.BankKeeper,
	feegrantKeeper authante.FeegrantKeeper,
	feeCollectorName string,
	beanAccountant BeanAccountant,
	beanDisposer BeanDisposer,
) BeanFeeDecorator {
	netFeeBank := &netFeeBankKeeper{
		BankKeeper:       bankKeeper,
		feeCollectorName: feeCollectorName,
	}
	bfd := BeanFeeDecorator{
		beanAccountant: beanAccountant,
		beanDisposer:   beanDisposer,
		netFeeBank:     netFeeBank,
		deduct: authante.NewDeductFeeDecoratorWithName(
			accountKeeper,
			netFeeBank,
			feegrantKeeper,
			nil,
			feeCollectorName,
		),
	}
	bfd.msgBeanChargers = map[string]msgBeanCharger{
		sdk.MsgTypeURL(&swingtypes.MsgDeliverInbound{}): func(ctx sdk.Context, feePayer sdk.AccAddress, msgTypeURL string, msg sdk.Msg) error {
			deliverInbound := msg.(*swingtypes.MsgDeliverInbound)
			bfd.beanAccountant.AddBeansOwing(ctx, feePayer, msgTypeURL, swingtypes.BeansPerMessage, uint64(len(deliverInbound.Messages)))
			return nil
		},
		sdk.MsgTypeURL(&swingtypes.MsgInstallBundle{}): func(ctx sdk.Context, feePayer sdk.AccAddress, msgTypeURL string, msg sdk.Msg) error {
			installBundle := msg.(*swingtypes.MsgInstallBundle)
			bfd.beanAccountant.AddBeansOwing(ctx, feePayer, msgTypeURL, swingtypes.BeansPerStorageByte, installBundle.ExpectedUncompressedSize())
			return nil
		},
		sdk.MsgTypeURL(&swingtypes.MsgWalletAction{}): func(ctx sdk.Context, feePayer sdk.AccAddress, msgTypeURL string, msg sdk.Msg) error {
			walletAction := msg.(*swingtypes.MsgWalletAction)
			return bfd.addSmartWalletProvisionCharge(ctx, feePayer, walletAction.Owner)
		},
		sdk.MsgTypeURL(&swingtypes.MsgWalletSpendAction{}): func(ctx sdk.Context, feePayer sdk.AccAddress, msgTypeURL string, msg sdk.Msg) error {
			walletSpendAction := msg.(*swingtypes.MsgWalletSpendAction)
			return bfd.addSmartWalletProvisionCharge(ctx, feePayer, walletSpendAction.Owner)
		},
		sdk.MsgTypeURL(&swingtypes.MsgProvision{}): func(ctx sdk.Context, feePayer sdk.AccAddress, msgTypeURL string, msg sdk.Msg) error {
			provision := msg.(*swingtypes.MsgProvision)
			return bfd.addProvisioningCharge(ctx, feePayer, provision.PowerFlags)
		},
	}
	return bfd
}

func (bfd BeanFeeDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	feeTx, ok := tx.(sdk.FeeTx)
	if !ok {
		return ctx, sdkerrors.ErrTxDecode.Wrap("Tx must be a FeeTx")
	}
	if !simulate && ctx.BlockHeight() > 0 && feeTx.GetGas() == 0 {
		return ctx, sdkerrors.ErrInvalidGasLimit.Wrap("must provide positive gas")
	}

	feePayer := sdk.AccAddress(feeTx.FeePayer())
	chargedInboundTx := false
	msgs := tx.GetMsgs()
	for _, msg := range msgs {
		msgTypeURL := sdk.MsgTypeURL(msg)
		if bfd.beanAccountant.HasMsgType(ctx, msgTypeURL) {
			if !chargedInboundTx {
				bfd.beanAccountant.AddBeansOwing(ctx, feePayer, "", swingtypes.BeansPerInboundTx, 1)
				chargedInboundTx = true
			}
			bfd.beanAccountant.AddBeansOwing(ctx, feePayer, msgTypeURL, swingtypes.BeansPerMessage, 1)
			bfd.beanAccountant.AddBeansOwing(ctx, feePayer, msgTypeURL, swingtypes.BeansPerMessageByte, uint64(gogoproto.Size(msg)))
		}
		if charge := bfd.msgBeanChargers[msgTypeURL]; charge != nil {
			if err := charge(ctx, feePayer, msgTypeURL, msg); err != nil {
				return ctx, err
			}
		}
	}

	suppliedFees := feeTx.GetFee()
	if !simulate {
		if err := enforceMinGasPrice(suppliedFees, feeTx.GetGas(), bfd.beanAccountant.MinGasPrice(ctx)); err != nil {
			return ctx, err
		}
	}
	feeBudget := suppliedFees
	if simulate {
		feeBudget = nil
	}
	var beanFees sdk.Coins
	dispose := func(beanGas uint64, fees sdk.Coins) error {
		if beanGas > 0 {
			ctx.GasMeter().ConsumeGas(beanGas, "bean fee")
		}
		beanFees = fees
		if simulate || fees.IsZero() {
			return nil
		}
		return bfd.beanDisposer(ctx, deductFrom(feeTx), fees)
	}
	if err := bfd.beanAccountant.SettleBeansOwing(ctx, feePayer, feeBudget, dispose); err != nil {
		return ctx, err
	}
	if !simulate && !beanFees.IsZero() && !suppliedFees.IsAllGTE(beanFees) {
		return ctx, sdkerrors.ErrInsufficientFee.Wrapf("insufficient fees for bean charge; got: %s required: %s", suppliedFees, beanFees)
	}
	netFees := suppliedFees
	if !simulate && !beanFees.IsZero() {
		netFees = suppliedFees.Sub(beanFees...)
	}
	unlockNetFees := bfd.netFeeBank.lockNetFees(netFees)
	defer unlockNetFees()
	return bfd.deduct.AnteHandle(ctx, tx, simulate, func(newCtx sdk.Context, tx sdk.Tx, simulate bool) (sdk.Context, error) {
		unlockNetFees()
		return next(newCtx, tx, simulate)
	})
}

func (bfd BeanFeeDecorator) addSmartWalletProvisionCharge(ctx sdk.Context, feePayer sdk.AccAddress, owner sdk.AccAddress) error {
	keeper, ok := bfd.beanAccountant.(interface {
		AddBeansOwingForSmartWallet(ctx sdk.Context, feePayer sdk.AccAddress, owner sdk.AccAddress)
	})
	if ok {
		keeper.AddBeansOwingForSmartWallet(ctx, feePayer, owner)
	}
	return nil
}

func (bfd BeanFeeDecorator) addProvisioningCharge(ctx sdk.Context, feePayer sdk.AccAddress, powerFlags []string) error {
	keeper, ok := bfd.beanAccountant.(interface {
		AddBeansOwingForProvisioning(ctx sdk.Context, addr sdk.AccAddress, powerFlags []string) error
	})
	if !ok {
		return nil
	}
	return keeper.AddBeansOwingForProvisioning(ctx, feePayer, powerFlags)
}

type netFeeBankKeeper struct {
	authtypes.BankKeeper
	mu               sync.Mutex
	feeCollectorName string
	netFees          sdk.Coins
}

func (bk *netFeeBankKeeper) lockNetFees(netFees sdk.Coins) func() {
	bk.mu.Lock()
	bk.setNetFees(netFees)
	unlocked := false
	return func() {
		if unlocked {
			return
		}
		bk.setNetFees(nil)
		bk.mu.Unlock()
		unlocked = true
	}
}

func (bk *netFeeBankKeeper) setNetFees(netFees sdk.Coins) {
	bk.netFees = netFees
}

func (bk *netFeeBankKeeper) SendCoinsFromAccountToModule(ctx context.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins) error {
	if recipientModule == bk.feeCollectorName {
		amt = bk.netFees
	}
	if amt.IsZero() {
		return nil
	}
	return bk.BankKeeper.SendCoinsFromAccountToModule(ctx, senderAddr, recipientModule, amt)
}

func deductFrom(feeTx sdk.FeeTx) sdk.AccAddress {
	if feeGranter := feeTx.FeeGranter(); feeGranter != nil {
		return sdk.AccAddress(feeGranter)
	}
	return sdk.AccAddress(feeTx.FeePayer())
}

func enforceMinGasPrice(fees sdk.Coins, gas uint64, minGasPrice sdk.DecCoins) error {
	if minGasPrice.IsZero() {
		return nil
	}
	if gas == 0 {
		return sdkerrors.ErrInvalidGasLimit.Wrap("must provide positive gas")
	}
	requiredFees := make(sdk.Coins, 0, len(minGasPrice))
	gasDec := sdkmath.LegacyNewDecFromInt(sdkmath.NewIntFromUint64(gas))
	for _, gp := range minGasPrice {
		requiredFees = append(requiredFees, sdk.NewCoin(gp.Denom, gp.Amount.Mul(gasDec).Ceil().RoundInt()))
	}
	if !fees.IsAnyGTE(requiredFees) {
		return sdkerrors.ErrInsufficientFee.Wrapf("insufficient fees; got: %s required: %s", fees, requiredFees)
	}
	return nil
}
