package swingset

import (
	// "fmt"

	"encoding/json"
	"fmt"

	"github.com/Agoric/agoric-sdk/packages/cosmic-swingset/x/swingset/internal/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

type GenesisState struct {
	// TODO: Provisioning records
	Egresses []types.Egress `json:"egresses"`
}

func NewGenesisState() GenesisState {
	return GenesisState{
		Egresses: []types.Egress{},
	}
}

func ValidateGenesis(data GenesisState) error {
	for _, egress := range data.Egresses {
		if egress.Peer.Empty() {
			return fmt.Errorf("empty peer for egress nicknamed %s", egress.Nickname)
		}
	}
	return nil
}

func DefaultGenesisState() GenesisState {
	return GenesisState{
		Egresses: []types.Egress{},
	}
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data GenesisState) []abci.ValidatorUpdate {
	for _, egress := range data.Egresses {
		msg := MsgProvision{
			Address:  egress.Peer,
			Nickname: egress.Nickname,
		}
		action := &provisionAction{
			MsgProvision: msg,
			Type:         "PLEASE_PROVISION",
			BlockHeight:  ctx.BlockHeight(),
			BlockTime:    ctx.BlockTime().Unix(),
		}

		// fmt.Fprintf(os.Stderr, "Context is %+v\n", ctx)
		b, err := json.Marshal(action)
		if err != nil {
			continue
		}

		// Reproduce the egress in our state.
		egress := types.NewEgress(msg.Nickname, msg.Address)
		err = keeper.SetEgress(ctx, egress)
		if err != nil {
			panic(err)
		}

		_, err = keeper.CallToController(ctx, string(b))
		// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
		if err != nil {
			panic(err)
		}
	}
	// Flush the genesis transactions.
	valup, err := EndBlock(ctx, abci.RequestEndBlock{}, keeper)
	if err != nil {
		panic(err)
	}
	return valup
}

func ExportGenesis(ctx sdk.Context, k Keeper) GenesisState {
	// TODO: Preserve the SwingSet transcript
	gs := NewGenesisState()
	gs.Egresses = k.ExportEgresses(ctx)
	return gs
}
