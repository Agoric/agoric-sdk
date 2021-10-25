package lien

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	"github.com/cosmos/cosmos-sdk/crypto/keys/ed25519"
	sdk "github.com/cosmos/cosmos-sdk/types"
	stakingTypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	"github.com/tendermint/tendermint/crypto/secp256k1"
)

func makeAccAddress() sdk.AccAddress {
	priv := secp256k1.GenPrivKey()
	return sdk.AccAddress(priv.PubKey().Address())
}

func makeValidator() stakingTypes.Validator {
	valPriv := ed25519.GenPrivKey()
	valPub := valPriv.PubKey()
	vaddr := sdk.ValAddress(valPub.Address().Bytes())
	validator, err := stakingTypes.NewValidator(vaddr, valPub, stakingTypes.Description{})
	if err != nil {
		panic(err)
	}
	return validator
}

var (
	addr1      = makeAccAddress().String()
	i          = sdk.NewInt
	zero       = i(0)
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
	states      map[string]keeper.AccountState
	validators  map[string]stakingTypes.Validator
	delegations map[string][]stakingTypes.Delegation
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

func (m *mockLienKeeper) BondDenom(ctx sdk.Context) string {
	return "ubld"
}

func (m *mockLienKeeper) GetValidator(ctx sdk.Context, valAddr sdk.ValAddress) (stakingTypes.Validator, bool) {
	v, found := m.validators[valAddr.String()]
	return v, found
}

func (m *mockLienKeeper) GetDelegatorDelegations(ctx sdk.Context, delegator sdk.AccAddress, maxRetrieve uint16) []stakingTypes.Delegation {
	if d, found := m.delegations[delegator.String()]; found {
		return d
	}
	return []stakingTypes.Delegation{}
}

func TestBadType(t *testing.T) {
	ctx := sdk.Context{}
	ctlCtx := &vm.ControllerContext{Context: ctx}
	keeper := mockLienKeeper{
		states: map[string]keeper.AccountState{},
	}
	ph := NewPortHandler(&keeper)

	msg := portMessage{
		Type: "LIEN_BAD_TYPE",
	}
	jsonMsg, err := json.Marshal(&msg)
	if err != nil {
		t.Fatalf("cannot marshal message: %v", err)
	}
	reply, err := ph.Receive(ctlCtx, string(jsonMsg))
	if err == nil {
		t.Errorf("bad type got %v, want error", reply)
	}
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
		Total:       i(123),
		Bonded:      zero,
		Unbonding:   zero,
		Locked:      zero,
		Liened:      zero,
	}
	if !reflect.DeepEqual(acctState, want) {
		t.Errorf("got account state %v, want %v", acctState, want)
	}
}

func TestGetAccountState_badRequest(t *testing.T) {
	ctx := sdk.Context{}
	ctlCtx := &vm.ControllerContext{Context: ctx}
	keeper := mockLienKeeper{
		states: map[string]keeper.AccountState{},
	}
	ph := NewPortHandler(&keeper)

	msg := portMessage{
		Type:    "LIEN_GET_ACCOUNT_STATE",
		Address: "foo",
		Denom:   "ubld",
	}
	jsonMsg, err := json.Marshal(&msg)
	if err != nil {
		t.Fatalf("cannot marshal message: %v", err)
	}
	reply, err := ph.Receive(ctlCtx, string(jsonMsg))
	if err == nil {
		t.Errorf("bad address got %v, want error", reply)
	}

	msg = portMessage{
		Type:    "LIEN_GET_ACCOUNT_STATE",
		Address: addr1,
		Denom:   "x",
	}
	jsonMsg, err = json.Marshal(&msg)
	if err != nil {
		t.Fatalf("cannot marshal message: %v", err)
	}
	reply, err = ph.Receive(ctlCtx, string(jsonMsg))
	if err == nil {
		t.Errorf("bad denom got %v, want error", reply)
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
		Amount:  i(123),
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
		Amount:  i(123),
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
				Amount:  i(tt.newLien),
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

func TestGetStaking(t *testing.T) {
	val1, _ := makeValidator().AddTokensFromDel(i(12300))
	val2, _ := makeValidator().AddTokensFromDel(i(2345))
	val3, _ := makeValidator().AddTokensFromDel(i(34567))
	addr1 := makeAccAddress()
	addr2 := makeAccAddress()
	addr3 := makeAccAddress()
	addr4 := makeAccAddress()

	keeper := mockLienKeeper{
		validators:  make(map[string]stakingTypes.Validator),
		delegations: make(map[string][]stakingTypes.Delegation),
	}
	keeper.validators[val1.OperatorAddress] = val1
	keeper.validators[val2.OperatorAddress] = val2
	keeper.validators[val3.OperatorAddress] = val3
	keeper.delegations[addr1.String()] = []stakingTypes.Delegation{
		{
			DelegatorAddress: addr1.String(),
			ValidatorAddress: val1.OperatorAddress,
			Shares:           sdk.NewDec(456),
		},
		{
			DelegatorAddress: addr1.String(),
			ValidatorAddress: val2.OperatorAddress,
			Shares:           sdk.NewDec(54),
		},
	}
	keeper.delegations[addr2.String()] = []stakingTypes.Delegation{
		{
			DelegatorAddress: addr2.String(),
			ValidatorAddress: val1.OperatorAddress,
			Shares:           sdk.NewDec(101),
		},
		{
			DelegatorAddress: addr2.String(),
			ValidatorAddress: val3.OperatorAddress,
			Shares:           sdk.NewDec(424),
		},
	}
	keeper.delegations[addr3.String()] = []stakingTypes.Delegation{
		{
			DelegatorAddress: addr3.String(),
			ValidatorAddress: val3.OperatorAddress,
			Shares:           sdk.NewDec(1025),
		},
	}
	keeper.delegations[addr4.String()] = []stakingTypes.Delegation{}

	ph := NewPortHandler(&keeper)
	ctx := sdk.Context{}
	ctlCtx := &vm.ControllerContext{Context: ctx}

	pi := func(x int64) *sdk.Int {
		n := i(x)
		return &n
	}

	null := (*sdk.Int)(nil)

	for _, tt := range []struct {
		name       string
		validators []string
		delegators []string
		wantVals   []*sdk.Int
		wantStates []*delegatorState
	}{
		{
			name:       "empty",
			validators: []string{},
			delegators: []string{},
			wantVals:   []*sdk.Int{},
			wantStates: []*delegatorState{},
		},
		{
			name:       "one_val",
			validators: []string{val1.OperatorAddress},
			delegators: []string{},
			wantVals:   []*sdk.Int{pi(12300)},
			wantStates: []*delegatorState{},
		},
		{
			name:       "one_del",
			validators: []string{},
			delegators: []string{addr1.String()},
			wantVals:   []*sdk.Int{},
			wantStates: []*delegatorState{
				{
					ValidatorIdx: []int{},
					Values:       []sdk.Int{},
					Other:        i(510),
				},
			},
		},
		{
			name:       "one_each",
			validators: []string{val1.OperatorAddress},
			delegators: []string{addr1.String()},
			wantVals:   []*sdk.Int{pi(12300)},
			wantStates: []*delegatorState{
				{
					ValidatorIdx: []int{0},
					Values:       []sdk.Int{i(456)},
					Other:        i(54),
				},
			},
		},
		{
			name:       "full",
			validators: []string{val1.OperatorAddress, val2.OperatorAddress, val3.OperatorAddress},
			delegators: []string{addr1.String(), addr2.String(), addr3.String(), addr4.String()},
			wantVals:   []*sdk.Int{pi(12300), pi(2345), pi(34567)},
			wantStates: []*delegatorState{
				{
					ValidatorIdx: []int{0, 1},
					Values:       []sdk.Int{i(456), i(54)},
					Other:        zero,
				},
				{
					ValidatorIdx: []int{0, 2},
					Values:       []sdk.Int{i(101), i(424)},
					Other:        zero,
				},
				{
					ValidatorIdx: []int{2},
					Values:       []sdk.Int{i(1025)},
					Other:        zero,
				},
				{
					ValidatorIdx: []int{},
					Values:       []sdk.Int{},
					Other:        zero,
				},
			},
		},
		{
			name:       "dup",
			validators: []string{val1.OperatorAddress, val1.OperatorAddress},
			delegators: []string{addr1.String(), addr1.String()},
			wantVals:   []*sdk.Int{pi(12300), pi(12300)},
			wantStates: []*delegatorState{
				{
					ValidatorIdx: []int{1}, // selects last index
					Values:       []sdk.Int{i(456)},
					Other:        i(54),
				},
				{
					ValidatorIdx: []int{1}, // selects last index
					Values:       []sdk.Int{i(456)},
					Other:        i(54),
				},
			},
		},
		{
			name:       "bad_addr",
			validators: []string{"foo", val1.OperatorAddress},
			delegators: []string{"bar", addr1.String()},
			wantVals:   []*sdk.Int{null, pi(12300)},
			wantStates: []*delegatorState{
				nil,
				{
					ValidatorIdx: []int{1},
					Values:       []sdk.Int{i(456)},
					Other:        i(54),
				},
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			msg := portMessage{
				Type:       "LIEN_GET_STAKING",
				Validators: tt.validators,
				Delegators: tt.delegators,
			}
			j, err := json.Marshal(&msg)
			if err != nil {
				t.Fatalf("cannot marshal message: %v", err)
			}
			reply, err := ph.Receive(ctlCtx, string(j))
			if err != nil {
				t.Fatalf("Receive error: %v", err)
			}
			result := msgStaking{}
			err = json.Unmarshal([]byte(reply), &result)
			if err != nil {
				t.Fatalf("cannot unmarshal reply %s: %v", reply, err)
			}
			if result.Denom != "ubld" {
				t.Errorf("denom got %s, want ubld", result.Denom)
			}
			if len(result.ValidatorValues) != len(tt.wantVals) {
				t.Errorf("wrong # of vals returned - got %v, want %v", result.ValidatorValues, tt.wantVals)
			} else {
				for j, got := range result.ValidatorValues {
					want := tt.wantVals[j]
					if got == nil {
						if want != nil {
							t.Errorf("validator %d got null, want %v", j, want)
						}
					} else if want == nil {
						t.Errorf("validator %d got %v, want nil", j, *got)
					} else if !got.Equal(*want) {
						t.Errorf("validator %d got %v, want %v", j, got, want)
					}
				}
			}
			if len(result.DelegatorStates) != len(tt.wantStates) {
				t.Errorf("wrong # of states returned - got %v, want %v", result.DelegatorStates, tt.wantStates)
			} else {
				for s, got := range result.DelegatorStates {
					want := tt.wantStates[s]
					if got == nil {
						if want != nil {
							t.Errorf("delegator %d got nil, want %v", s, want)
						}
						continue
					}
					if want == nil {
						t.Errorf("delegator %d got %v, want nil", s, got)
						continue
					}
					if !reflect.DeepEqual(got.ValidatorIdx, want.ValidatorIdx) {
						t.Errorf("state %d bad validator indexes - got %v, want %v", s, got.ValidatorIdx, want.ValidatorIdx)
					}
					if len(got.Values) != len(want.Values) {
						t.Errorf("state %d wrong # values - got %v, want %v", s, got.Values, want.Values)
					} else {
						for v, gotVal := range got.Values {
							if !gotVal.Equal(want.Values[v]) {
								t.Errorf("state %d value %d got %v, want %v", s, v, gotVal, want.Values[v])
							}
						}
					}
					if !got.Other.Equal(want.Other) {
						t.Errorf("state %d wrong 'other' got %v, want %v", s, got.Other, want.Other)
					}
				}
			}
		})
	}
}
