package keeper

import (
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
)

var (
	coins = sdk.NewCoins
)

func testCoin(shortDenom string) func(int64) sdk.Coin {
	return func(amt int64) sdk.Coin {
		return sdk.NewInt64Coin("denom"+shortDenom, amt)
	}
}

var (
	a = testCoin("A")
	b = testCoin("B")
	c = testCoin("C")
)

func TestComputeLienLocked(t *testing.T) {
	for _, tt := range []struct {
		name      string
		liened    sdk.Coins
		bonded    sdk.Coins
		unbonding sdk.Coins
		want      sdk.Coins
	}{
		{"empty", coins(), coins(), coins(), coins()},
		{"no_lien", coins(), coins(a(123)), coins(), coins()},
		{"no_bond", coins(a(234)), coins(), coins(), coins(a(234))},
		{"some_bond", coins(a(100)), coins(a(25)), coins(a(25)), coins(a(50))},
		{"lotsa_bond", coins(a(20)), coins(a(200)), coins(a(10)), coins()},
		{"mixed_denom", coins(a(100), b(20)), coins(a(70), c(15)), coins(b(17)), coins(a(30), b(3))},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got := computeLienLocked(tt.liened, tt.bonded, tt.unbonding)
			if !coinsEq(tt.want, got) {
				t.Errorf("computeLienLocked() = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestWrap(t *testing.T) {
	acc := authtypes.ProtoBaseAccount()
	acc.SetAccountNumber(17)
	wak := types.WrappedAccountKeeper{} // used as a sentinel for keeper identity
	keeper := keeperImpl{accountKeeper: &wak}
	wrapper := NewAccountWrapper(keeper)
	wrapped := wrapper.Wrap(acc)
	lienAcc, ok := wrapped.(*LienAccount)
	if !ok {
		t.Fatalf("wrapper did not create a lien account: %+v", wrapped)
	}
	if lienAcc.lienKeeper.(keeperImpl).accountKeeper != &wak {
		t.Errorf("wrong lien keeper %+v, want %+v", lienAcc.lienKeeper, keeper)
	}
	unwrapped := wrapper.Unwrap(lienAcc)
	baseAccount, ok := unwrapped.(*authtypes.BaseAccount)
	if !ok {
		t.Fatalf("unwrapper did not produce a base account: %+v", unwrapped)
	}
	if baseAccount.AccountNumber != 17 {
		t.Errorf("wrong account number %d, want 17", baseAccount.AccountNumber)
	}
	unwrap2 := wrapper.Unwrap(baseAccount)
	_, ok = unwrap2.(*authtypes.BaseAccount)
	if !ok {
		t.Errorf("unwrapping unwrapped account gives %+v, want base account", unwrap2)
	}
	if unwrap2.GetAccountNumber() != 17 {
		t.Errorf("doubly unwrapped account has wrong account number %d, want 17", unwrap2.GetAccountNumber())
	}
	wrapped2 := wrapper.Wrap(nil)
	if wrapped2 != nil {
		t.Errorf("wrapped nil is %v, want nil", wrapped2)
	}
}
