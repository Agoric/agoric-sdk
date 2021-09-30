package lien

import (
	"encoding/json"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tendermint/tendermint/crypto/secp256k1"
)

var (
	priv1 = secp256k1.GenPrivKey()
	addr1 = sdk.AccAddress(priv1.PubKey().Address()).String()
)

type mockLienKeeper struct {
	liens  map[string]types.Lien
	states map[string]keeper.AccountState
}

var _ Keeper = &mockLienKeeper{}

func (m *mockLienKeeper) GetAccountWrapper() types.AccountWrapper {
	return types.DefaultAccountWrapper
}

func (m *mockLienKeeper) GetLien(ctx sdk.Context, addr sdk.AccAddress) types.Lien {
	return m.liens[addr.String()]
}

func (m *mockLienKeeper) SetLien(ctx sdk.Context, addr sdk.AccAddress, lien types.Lien) {
	m.liens[addr.String()] = lien
}

func (m *mockLienKeeper) IterateLiens(ctx sdk.Context, cb func(addr sdk.AccAddress, lien types.Lien) bool) {
}

func (m *mockLienKeeper) GetAccountState(ctx sdk.Context, addr sdk.AccAddress) keeper.AccountState {
	return m.states[addr.String()]
}

func TestGetAccountState(t *testing.T) {
	ctx := sdk.Context{}
	ctlCtx := &vm.ControllerContext{Context: ctx}

	keeper := mockLienKeeper{
		states: map[string]keeper.AccountState{
			addr1: {Total: sdk.NewCoins(sdk.NewInt64Coin("ubld", 123), sdk.NewInt64Coin("urun", 456))},
		},
	}
	ph := NewPortHandler(&keeper)
	msg := portMessage{
		Type:    "LIEN_GET_ACCOUNT_STATE",
		Address: addr1,
		Denom:   "ubld",
	}
	jsonMsg, err := json.Marshal(&msg)
	if err != nil {
		t.Fatalf("cannot marshal message: %v", err)
	}
	reply, err := ph.Receive(ctlCtx, string(jsonMsg))
	if err != nil {
		t.Fatalf("receive error: %v", err)
	}
	var acctState msgAccountState
	err = json.Unmarshal([]byte(reply), &acctState)
	if err != nil {
		t.Fatalf("cannot unmarshal reply %s: %v", reply, err)
	}
	acctState.CurrentTime = int64(123456789)
	zero := sdk.NewInt(0)
	want := msgAccountState{
		CurrentTime: acctState.CurrentTime,
		Total:       sdk.NewInt(123),
		Bonded:      zero,
		Unbonding:   zero,
		Locked:      zero,
		Liened:      zero,
	}
	if acctState != want {
		t.Errorf("got account state %v, want %v", acctState, want)
	}
}

// TODO: tests for LIEN_SET_TOTAL
