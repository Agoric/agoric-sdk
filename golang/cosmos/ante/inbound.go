package ante

import (
	"github.com/armon/go-metrics"

	"github.com/cosmos/cosmos-sdk/telemetry"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	swingtypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

const (
	QueueInbound        = "inbound"
	QueueInboundMempool = "inbound_mempool"
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
			if inboundsAllowed == -1 {
				state := ia.sk.GetState(ctx)
				entry := QueueInbound
				if simulate {
					entry = QueueInboundMempool
				}
				allowed, found := swingtypes.QueueSizeEntry(state.QueueAllowed, entry)
				if !found && simulate {
					entry = QueueInbound
					allowed, found = swingtypes.QueueSizeEntry(state.QueueAllowed, entry)
					allowed /= 2
				}
				if found {
					actions, err := ia.sk.ActionQueueLength(ctx)
					if err != nil {
						return ctx, err
					}
					if actions < allowed {
						inboundsAllowed = allowed - actions
					} else {
						inboundsAllowed = 0
					}
				} else {
					// no inbound allowed size from swingset
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
