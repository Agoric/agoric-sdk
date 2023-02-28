package ante

import (
	"github.com/armon/go-metrics"

	"github.com/cosmos/cosmos-sdk/telemetry"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	swingtypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

// TODO: We don't have a more appropriate error type for this.
var ErrInboundQueueFull = sdkerrors.ErrMempoolIsFull

type inboundAnte struct {
	sk SwingsetKeeper
}

// NewInboundDecorator return an AnteDecorator which honors the allowed size of the inbound queue.
// The swingset message types will consume one allowed entry each, and will be reflected
// in the action queue when executed.
func NewInboundDecorator(sk SwingsetKeeper) sdk.AnteDecorator {
	return inboundAnte{sk: sk}
}

// AnteHandle implements sdk.AnteDecorator
func (ia inboundAnte) AnteHandle(ctx sdk.Context, tx sdk.Tx, simulate bool, next sdk.AnteHandler) (sdk.Context, error) {
	msgs := tx.GetMsgs()
	inboundsAllowed := int32(-1)
	for _, msg := range msgs {
		switch msg.(type) {
		case *swingtypes.MsgDeliverInbound,
			*swingtypes.MsgInstallBundle,
			*swingtypes.MsgProvision,
			*swingtypes.MsgWalletAction,
			*swingtypes.MsgWalletSpendAction:
			// Lazily compute the number of allowed messages when the transaction
			// includes a SwingSet message. This number is the difference between
			// the number of allowed messages initially returned by SwingSet, and
			// the number of messages already added into the actionQueue by other
			// transactions included in the block.
			// We store the number of allowed messages locally since messages are
			// added to the actionQueue after going through the ante handler (in
			// CheckTx) and before the next transaction is processed.
			// However in CheckTx (mempool admission check), no state is
			// changed so it's possible for a set of transactions to exist which
			// if all included in a block would push the actionQueue over, and thus
			// end up in rejections instead of simply not admitting them in the
			// mempool. To mitigate this, Swingset should compute the number of
			// messages allowed for mempool admission as if its max queue length
			// was lower (e.g. 50%). This is the QueueInboundMempool entry.
			if inboundsAllowed == -1 {
				state := ia.sk.GetState(ctx)
				entry := swingtypes.QueueInbound
				if ctx.IsCheckTx() {
					entry = swingtypes.QueueInboundMempool
				}
				allowed, found := swingtypes.QueueSizeEntry(state.QueueAllowed, entry)
				if found {
					actions, err := ia.sk.ActionQueueLength(ctx)
					if err != nil {
						return ctx, err
					}
					if actions < allowed {
						inboundsAllowed = 1
					} else {
						inboundsAllowed = 0
					}
				} else {
					// if number of allowed entries not given, fail closed
					inboundsAllowed = 0
				}
			}
			if inboundsAllowed > 0 {
				inboundsAllowed--
			} else {
				defer func() {
					telemetry.IncrCounterWithLabels(
						[]string{"tx", "ante", "inbound_not_allowed"},
						1,
						[]metrics.Label{
							telemetry.NewLabel("msg", sdk.MsgTypeURL(msg)),
						},
					)
				}()
				return ctx, ErrInboundQueueFull
			}
		}
	}
	return next(ctx, tx, simulate)
}
