package ante

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"
	ibcante "github.com/cosmos/ibc-go/v3/modules/core/ante"
	ibckeeper "github.com/cosmos/ibc-go/v3/modules/core/keeper"
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
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "account keeper is required for AnteHandler")
	}
	if opts.BankKeeper == nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "bank keeper is required for AnteHandler")
	}
	if opts.SignModeHandler == nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "sign mode handler is required for ante builder")
	}
	if opts.AdmissionData == nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "admission data is required for AnteHandler")
	}
	if opts.SwingsetKeeper == nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "swingset keeper is required for AnteHandler")
	}

	var sigGasConsumer = opts.SigGasConsumer
	if sigGasConsumer == nil {
		sigGasConsumer = ante.DefaultSigVerificationGasConsumer
	}

	anteDecorators := []sdk.AnteDecorator{
		ante.NewSetUpContextDecorator(),
		ante.NewRejectExtensionOptionsDecorator(),
		ante.NewMempoolFeeDecorator(),
		ante.NewValidateBasicDecorator(),
		ante.NewTxTimeoutHeightDecorator(),
		ante.NewValidateMemoDecorator(opts.AccountKeeper),
		ante.NewConsumeGasForTxSizeDecorator(opts.AccountKeeper),
		NewDeductFeeDecorator(opts.AccountKeeper, opts.BankKeeper, opts.FeegrantKeeper, opts.FeeCollectorName),
		// SetPubKeyDecorator must be called before all signature verification decorators
		ante.NewSetPubKeyDecorator(opts.AccountKeeper),
		ante.NewValidateSigCountDecorator(opts.AccountKeeper),
		ante.NewSigGasConsumeDecorator(opts.AccountKeeper, sigGasConsumer),
		ante.NewSigVerificationDecorator(opts.AccountKeeper, opts.SignModeHandler),
		NewAdmissionDecorator(opts.AdmissionData),
		NewInboundDecorator(opts.SwingsetKeeper),
		ante.NewIncrementSequenceDecorator(opts.AccountKeeper),
		ibcante.NewAnteDecorator(opts.IBCKeeper),
	}

	return sdk.ChainAnteDecorators(anteDecorators...), nil
}
