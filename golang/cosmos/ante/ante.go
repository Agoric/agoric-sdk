package ante

import (
	sdkioerrors "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	ibcante "github.com/cosmos/ibc-go/v6/modules/core/ante"
	ibckeeper "github.com/cosmos/ibc-go/v6/modules/core/keeper"
)

// HandlerOptions extend the SDK's AnteHandler options by requiring the IBC
// channel keeper.
type HandlerOptions struct {
	ante.HandlerOptions

	IBCKeeper        *ibckeeper.Keeper
	FeeCollectorName string
	AdmissionData    interface{}
	SwingsetKeeper   SwingsetKeeper
}

func NewAnteHandler(opts HandlerOptions) (sdk.AnteHandler, error) {
	if opts.AccountKeeper == nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrLogic, "account keeper is required for AnteHandler")
	}
	if opts.BankKeeper == nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrLogic, "bank keeper is required for AnteHandler")
	}
	if opts.SignModeHandler == nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrLogic, "sign mode handler is required for ante builder")
	}
	if opts.AdmissionData == nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrLogic, "admission data is required for AnteHandler")
	}
	if opts.SwingsetKeeper == nil {
		return nil, sdkioerrors.Wrap(sdkerrors.ErrLogic, "swingset keeper is required for AnteHandler")
	}

	var sigGasConsumer = opts.SigGasConsumer
	if sigGasConsumer == nil {
		sigGasConsumer = ante.DefaultSigVerificationGasConsumer
	}

	anteDecorators := []sdk.AnteDecorator{
		ante.NewSetUpContextDecorator(),
		ante.NewExtensionOptionsDecorator(nil), // reject all extensions
		ante.NewValidateBasicDecorator(),
		ante.NewTxTimeoutHeightDecorator(),
		ante.NewValidateMemoDecorator(opts.AccountKeeper),
		ante.NewConsumeGasForTxSizeDecorator(opts.AccountKeeper),
		NewInboundDecorator(opts.SwingsetKeeper),

		// We use a custom fee-deduction decorator
		// to support a dynamically-configurable collector destination.
		// [cosmos-sdk v0.46.16] NewDeductFeeDecorator(options.AccountKeeper, options.BankKeeper, options.FeegrantKeeper, options.TxFeeChecker),
		NewDeductFeeDecorator(opts.AccountKeeper, opts.BankKeeper, opts.FeegrantKeeper, opts.FeeCollectorName, opts.TxFeeChecker),

		// SetPubKeyDecorator must be called before all signature verification decorators
		ante.NewSetPubKeyDecorator(opts.AccountKeeper),
		ante.NewValidateSigCountDecorator(opts.AccountKeeper),
		ante.NewSigGasConsumeDecorator(opts.AccountKeeper, sigGasConsumer),
		ante.NewSigVerificationDecorator(opts.AccountKeeper, opts.SignModeHandler),
		NewAdmissionDecorator(opts.AdmissionData),
		ante.NewIncrementSequenceDecorator(opts.AccountKeeper),
		ibcante.NewRedundantRelayDecorator(opts.IBCKeeper),
	}

	return sdk.ChainAnteDecorators(anteDecorators...), nil
}
