package gaia

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/cosmos/cosmos-sdk/x/auth/ante"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

// TODO: We don't have a more appropriate error type for this.
var ErrAdmissionRefused = sdkerrors.ErrMempoolIsFull

// AdmissionDecorator will ask the Controller (such as SwingSet) if it is
// temporarily rejecting inbound messages.  If CheckAdmissibility passes for all
// messages, decorator calls next AnteHandler in chain.
type AdmissionDecorator struct {
	CallToController func(sdk.Context, string) (string, error)
}

func NewAdmissionDecorator(callToController func(sdk.Context, string) (string, error)) AdmissionDecorator {
	return AdmissionDecorator{CallToController: callToController}
}

// AnteHandle calls CheckAdmissibility for all messages that implement the
// vm.ControllerAdmissionMsg interface.  If it returns an error, refuse the
// entire transaction.
func (ad AdmissionDecorator) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	if !simulate {
		// Ask the controller if we are rejecting messages.
		for _, msg := range tx.GetMsgs() {
			if camsg, ok := msg.(vm.ControllerAdmissionMsg); ok {
				if err := camsg.CheckAdmissibility(ctx, ad.CallToController); err != nil {
					return ctx, sdkerrors.Wrapf(ErrAdmissionRefused, "controller refused message admission: %s", err.Error())
				}
			}
		}
	}

	return next(ctx, tx, simulate)
}

// NewAgoricAnteHandler returns an AnteHandler with the Agoric customisations.
func NewAgoricAnteHandler(options ante.HandlerOptions, callToController func(sdk.Context, string) (string, error)) (sdk.AnteHandler, error) {
	if options.AccountKeeper == nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "account keeper is required for ante builder")
	}

	if options.BankKeeper == nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "bank keeper is required for ante builder")
	}

	if options.SignModeHandler == nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "sign mode handler is required for ante builder")
	}

	if callToController == nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrLogic, "call to controller is required for ante builder")
	}

	var sigGasConsumer = options.SigGasConsumer
	if sigGasConsumer == nil {
		sigGasConsumer = ante.DefaultSigVerificationGasConsumer
	}

	anteDecorators := []sdk.AnteDecorator{
		ante.NewSetUpContextDecorator(), // outermost AnteDecorator. SetUpContext must be called first
		ante.NewRejectExtensionOptionsDecorator(),
		ante.NewMempoolFeeDecorator(),
		ante.NewValidateBasicDecorator(),
		ante.NewTxTimeoutHeightDecorator(),
		ante.NewValidateMemoDecorator(options.AccountKeeper),
		ante.NewConsumeGasForTxSizeDecorator(options.AccountKeeper),
		ante.NewDeductFeeDecorator(options.AccountKeeper, options.BankKeeper, options.FeegrantKeeper),
		ante.NewSetPubKeyDecorator(options.AccountKeeper), // SetPubKeyDecorator must be called before all signature verification decorators
		ante.NewValidateSigCountDecorator(options.AccountKeeper),
		ante.NewSigGasConsumeDecorator(options.AccountKeeper, sigGasConsumer),
		ante.NewSigVerificationDecorator(options.AccountKeeper, options.SignModeHandler),
		NewAdmissionDecorator(callToController),
		ante.NewIncrementSequenceDecorator(options.AccountKeeper),
	}

	return sdk.ChainAnteDecorators(anteDecorators...), nil
}
