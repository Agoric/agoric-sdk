package lien

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tendermint/tendermint/crypto/secp256k1"
)

var (
	priv1      = secp256k1.GenPrivKey()
	addr1      = sdk.AccAddress(priv1.PubKey().Address()).String()
	zero       = sdk.NewInt(0)
	zeroCoins  = sdk.NewCoins()
	c          = sdk.NewInt64Coin
	emptyState = keeper.AccountState{
		Total:     zeroCoins,
		Bonded:    zeroCoins,
		Unbonding: zeroCoins,
		Locked:    zeroCoins,
		Liened:    zeroCoins,
	}
)

func ubld(amt int64) sdk.Coins {
	return sdk.NewCoins(c("ubld", amt))
}

type mockLienKeeper struct {
	states map[string]keeper.AccountState
}

var _ Keeper = &mockLienKeeper{}

func (m *mockLienKeeper) GetAccountWrapper() types.AccountWrapper {
	return types.DefaultAccountWrapper
}

func (m *mockLienKeeper) GetLien(ctx sdk.Context, addr sdk.AccAddress) types.Lien {
	state := m.GetAccountState(ctx, addr)
	return types.Lien{Coins: state.Liened}
}

func (m *mockLienKeeper) SetLien(ctx sdk.Context, addr sdk.AccAddress, lien types.Lien) {
	state := m.GetAccountState(ctx, addr)
	state.Liened = lien.Coins
	m.states[addr.String()] = state
}

func (m *mockLienKeeper) IterateLiens(ctx sdk.Context, cb func(addr sdk.AccAddress, lien types.Lien) bool) {
}

func (m *mockLienKeeper) GetAccountState(ctx sdk.Context, addr sdk.AccAddress) keeper.AccountState {
	state, found := m.states[addr.String()]
	if !found {
		return emptyState
	}
	return state
}

func TestGetAccountState(t *testing.T) {
	ctx := sdk.Context{}
	ctlCtx := &vm.ControllerContext{Context: ctx}

	keeper := mockLienKeeper{
		states: map[string]keeper.AccountState{
			addr1: {Total: sdk.NewCoins(c("ubld", 123), c("urun", 456))},
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
	want := msgAccountState{
		CurrentTime: acctState.CurrentTime,
		Total:       sdk.NewInt(123),
		Bonded:      zero,
		Unbonding:   zero,
		Locked:      zero,
		Liened:      zero,
	}
	if !reflect.DeepEqual(acctState, want) {
		t.Errorf("got account state %v, want %v", acctState, want)
	}
}

func TestSetLiened_badAddr(t *testing.T) {
	ctx := sdk.Context{}
	ctlCtx := &vm.ControllerContext{Context: ctx}
	keeper := mockLienKeeper{}
	ph := NewPortHandler(&keeper)
	msg := portMessage{
		Type:    "LIEN_SET_LIENED",
		Address: "foo",
		Denom:   "ubld",
		Amount:  sdk.NewInt(123),
	}
	jsonMsg, err := json.Marshal(&msg)
	if err != nil {
		t.Fatalf("cannot marshal message: %v", err)
	}
	reply, err := ph.Receive(ctlCtx, string(jsonMsg))
	if err == nil {
		t.Fatalf("got %v, want err", reply)
	}
}

func TestSetLiened_badDenom(t *testing.T) {
	ctx := sdk.Context{}
	ctlCtx := &vm.ControllerContext{Context: ctx}
	keeper := mockLienKeeper{}
	ph := NewPortHandler(&keeper)
	msg := portMessage{
		Type:    "LIEN_SET_LIENED",
		Address: addr1,
		Denom:   "x",
		Amount:  sdk.NewInt(123),
	}
	jsonMsg, err := json.Marshal(&msg)
	if err != nil {
		t.Fatalf("cannot marshal message: %v", err)
	}
	reply, err := ph.Receive(ctlCtx, string(jsonMsg))
	if err == nil {
		t.Fatalf("got %v, want err", reply)
	}
}

func TestSetLiened(t *testing.T) {
	for _, tt := range []struct {
		name     string
		state    keeper.AccountState
		newLien  int64
		wantErr  bool
		wantFail bool
	}{
		{
			name:    "empty zero",
			state:   emptyState,
			newLien: 0,
		},
		{
			name:     "empty some",
			state:    emptyState,
			newLien:  123,
			wantFail: true,
		},
		{
			name: "same",
			state: keeper.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(1),
				Unbonding: ubld(2),
				Locked:    ubld(4),
				Liened:    ubld(8),
			},
			newLien: 8,
		},
		{
			name: "reduce",
			state: keeper.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(1),
				Unbonding: ubld(2),
				Locked:    ubld(4),
				Liened:    ubld(8),
			},
			newLien: 7,
		},
		{
			name: "insufficient bonded",
			state: keeper.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(1),
				Unbonding: ubld(2),
				Locked:    ubld(4),
				Liened:    ubld(8),
			},
			newLien:  9,
			wantFail: true,
		},
		{
			name: "unbonding not good enough",
			state: keeper.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(0),
				Unbonding: ubld(15),
				Locked:    ubld(0),
				Liened:    ubld(8),
			},
			newLien:  9,
			wantFail: true,
		},
		{
			name: "locked ok",
			state: keeper.AccountState{
				Total:     ubld(15),
				Bonded:    ubld(15),
				Unbonding: ubld(0),
				Locked:    ubld(15),
				Liened:    ubld(0),
			},
			newLien: 1,
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			ctx := sdk.Context{}
			ctlCtx := &vm.ControllerContext{Context: ctx}
			keeper := mockLienKeeper{
				states: map[string]keeper.AccountState{
					addr1: tt.state,
				},
			}
			ph := NewPortHandler(&keeper)
			msg := portMessage{
				Type:    "LIEN_SET_LIENED",
				Address: addr1,
				Denom:   "ubld",
				Amount:  sdk.NewInt(tt.newLien),
			}
			jsonMsg, err := json.Marshal(&msg)
			if err != nil {
				t.Fatalf("cannot marshal message: %v", err)
			}
			reply, err := ph.Receive(ctlCtx, string(jsonMsg))
			if err != nil {
				if tt.wantErr {
					return
				}
				t.Fatalf("receive Error: %v", err)
			}
			if tt.wantErr {
				t.Fatalf("wanted error, got %v", reply)
			}
			var succ bool
			err = json.Unmarshal([]byte(reply), &succ)
			if err != nil {
				t.Fatalf("cannot unmarshal reply %s: %v", reply, err)
			}
			if succ != !tt.wantFail {
				t.Errorf("got result %v, want $%v", succ, !tt.wantFail)
			}
			wantState := tt.state
			if !tt.wantFail {
				wantState.Liened = sdk.NewCoins(c("ubld", tt.newLien))
			}
			if !reflect.DeepEqual(keeper.states[addr1], wantState) {
				t.Errorf("bad account state %+v, want %+v", keeper.states[addr1], wantState)
			}
		})

	}
}
