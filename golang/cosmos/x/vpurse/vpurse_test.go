package vpurse

import (
	"encoding/json"
	"fmt"
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vpurse/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vpurse/types"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tendermint/tendermint/crypto/secp256k1"
	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
)

// Normalized balance updates for order-insensitive comparisons.
// Balance updates are represented as a map-of-maps (all strings):
// Address -> Denomination -> Amount.
type balances map[string]map[string]string

type accountOption func(map[string]string)

func coin(denom, amount string) accountOption {
	return func(acct map[string]string) {
		acct[denom] = amount
	}
}

type balancesOption func(map[string]map[string]string)

func account(addr string, opts ...accountOption) balancesOption {
	return func(bal map[string]map[string]string) {
		acct := bal[addr]
		if acct == nil {
			acct = make(map[string]string)
			bal[addr] = acct
		}
		for _, opt := range opts {
			opt(acct)
		}
	}
}

func newBalances(opts ...balancesOption) balances {
	bal := make(map[string]map[string]string)
	for _, opt := range opts {
		opt(bal)
	}
	return bal
}

// normalizeBalanceUpdate validates vpurseBalanceUpdate message and returns normalized version.
// A nil message becomes a nil balances.
func normalizeBalanceUpdate(msg *vpurseBalanceUpdate, t *testing.T) balances {
	t.Helper()
	if msg == nil {
		return nil
	}
	if msg.Type != "VPURSE_BALANCE_UPDATE" {
		t.Errorf("bad balance update type: %s", msg.Type)
	}
	bal := newBalances()
	for _, u := range msg.Updated {
		account(u.Address, coin(u.Denom, u.Amount))(bal)
	}
	return bal
}

func Test_marshalBalanceUpdate(t *testing.T) {
	tests := []struct {
		name             string
		addressToBalance map[string]sdk.Coins
		want             balances
		wantErr          bool
	}{
		{
			name:             "empty",
			addressToBalance: map[string]sdk.Coins{},
			want:             nil,
		},
		{
			name: "simple",
			addressToBalance: map[string]sdk.Coins{
				"acct1": {sdk.NewInt64Coin("foocoin", 123)},
			},
			want: newBalances(account("acct1", coin("foocoin", "123"))),
		},
		{
			name: "multi-denom",
			addressToBalance: map[string]sdk.Coins{
				"acct1": {
					sdk.NewInt64Coin("foocoin", 123),
					sdk.NewInt64Coin("barcoin", 456),
				},
			},
			want: newBalances(
				account("acct1",
					coin("foocoin", "123"),
					coin("barcoin", "456"))),
		},
		{
			name: "multi-acct",
			addressToBalance: map[string]sdk.Coins{
				"acct1": {sdk.NewInt64Coin("foocoin", 123)},
				"acct2": {sdk.NewInt64Coin("barcoin", 456)},
			},
			want: newBalances(
				account("acct1", coin("foocoin", "123")),
				account("acct2", coin("barcoin", "456")),
			),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			encoded, err := marshalBalanceUpdate(tt.addressToBalance)
			if (err != nil) != tt.wantErr {
				t.Errorf("marshalBalanceUpdate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			msg := &vpurseBalanceUpdate{}
			if encoded == nil {
				msg = nil
			} else {
				err = json.Unmarshal(encoded, &msg)
				if err != nil {
					t.Fatalf("json.Unmarshal() error %v", err)
				}
			}
			got := normalizeBalanceUpdate(msg, t)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("marshalBalanceUpdate() = %+v, want %+v", got, tt.want)
			}
		})
	}
}

type mockBank struct {
	// Record of all calls to the bank.
	calls []string
	// Value to return from GetAllBalances().
	allBalances sdk.Coins
	// Value to return from GetBalance().
	balance sdk.Coin
}

var _ types.BankKeeper = (*mockBank)(nil)

func (b *mockBank) record(s string) {
	b.calls = append(b.calls, s)
}

func (b *mockBank) BurnCoins(ctx sdk.Context, moduleName string, amt sdk.Coins) error {
	b.record(fmt.Sprintf("BurnCoins %s %v", moduleName, amt))
	return nil
}

func (b *mockBank) GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	b.record(fmt.Sprintf("GetAllBalances %s", addr))
	return b.allBalances
}

func (b *mockBank) GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	b.record(fmt.Sprintf("GetBalance %s %s", addr, denom))
	return b.balance
}

func (b *mockBank) MintCoins(ctx sdk.Context, moduleName string, amt sdk.Coins) error {
	b.record(fmt.Sprintf("MintCoins %s %s", moduleName, amt))
	return nil
}

func (b *mockBank) SendCoinsFromAccountToModule(ctx sdk.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins) error {
	b.record(fmt.Sprintf("SendCoinsFromAccountToModule %s %s %s", senderAddr, recipientModule, amt))
	return nil
}

func (b *mockBank) SendCoinsFromModuleToAccount(ctx sdk.Context, senderModule string, recipientAddr sdk.AccAddress, amt sdk.Coins) error {
	b.record(fmt.Sprintf("SendCoinsFromModuleToAccount %s %s %s", senderModule, recipientAddr, amt))
	return nil
}

func (b *mockBank) SendCoinsFromModuleToModule(ctx sdk.Context, senderModule, recipientModule string, amt sdk.Coins) error {
	b.record(fmt.Sprintf("SendCoinsFromModuleToModule %s %s %s", senderModule, recipientModule, amt))
	return nil
}

// makeTestKeeper creates a minimal Keeper for use in testing.
func makeTestKeeper(bank types.BankKeeper) keeper.Keeper {
	encodingConfig := params.MakeEncodingConfig()
	cdc := encodingConfig.Marshaler
	vpurseStoreKey := storetypes.NewKVStoreKey(types.StoreKey)
	callToController := func(ctx sdk.Context, str string) (string, error) {
		return "", nil
	}
	vk := keeper.NewKeeper(cdc, vpurseStoreKey, bank, "feeCollectorName", callToController)
	return vk
}

var (
	priv1 = secp256k1.GenPrivKey()
	addr1 = sdk.AccAddress(priv1.PubKey().Address())
)

func Test_Receive_GetBalance(t *testing.T) {
	bank := &mockBank{balance: sdk.NewInt64Coin("quatloos", 123)}
	keeper := makeTestKeeper(bank)
	ch := NewPortHandler(AppModule{}, keeper)
	sdkCtx := sdk.NewContext(nil, tmproto.Header{}, false, log.NewNopLogger())
	ctx := &swingset.ControllerContext{Context: sdkCtx}

	ret, err := ch.Receive(ctx, `{
		"type": "VPURSE_GET_BALANCE",
		"address": "`+addr1.String()+`",
		"denom": "quatloos"
		}`)
	if err != nil {
		t.Fatalf("got error = %v", err)
	}
	want := `"123"`
	if ret != want {
		t.Errorf("got %v, want %s", ret, want)
	}
	wantCalls := []string{
		"GetBalance " + addr1.String() + " quatloos",
	}
	if !reflect.DeepEqual(bank.calls, wantCalls) {
		t.Errorf("got calls %v, want {%s}", bank.calls, wantCalls)
	}
}

func Test_Receive_Give(t *testing.T) {
	bank := &mockBank{balance: sdk.NewInt64Coin("urun", 1000)}
	keeper := makeTestKeeper(bank)
	ch := NewPortHandler(AppModule{}, keeper)
	sdkCtx := sdk.NewContext(nil, tmproto.Header{}, false, log.NewNopLogger())
	ctx := &swingset.ControllerContext{Context: sdkCtx}

	ret, err := ch.Receive(ctx, `{
		"type": "VPURSE_GIVE",
		"recipient": "`+addr1.String()+`",
		"amount": "1000",
		"denom": "urun"
		}`)
	if err != nil {
		t.Fatalf("got error = %v", err)
	}
	balanceUpdate := vpurseBalanceUpdate{}
	err = json.Unmarshal([]byte(ret), &balanceUpdate)
	if err != nil {
		t.Errorf("unmarshal response error = %v", err)
	}
	got := normalizeBalanceUpdate(&balanceUpdate, t)
	want := newBalances(account(addr1.String(), coin("urun", "1000")))
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}
	wantCalls := []string{
		"MintCoins vpurse 1000urun",
		"SendCoinsFromModuleToAccount vpurse " + addr1.String() + " 1000urun",
		"GetBalance " + addr1.String() + " urun",
	}
	if !reflect.DeepEqual(bank.calls, wantCalls) {
		t.Errorf("got calls %v, want {%s}", bank.calls, wantCalls)
	}
}

func Test_Receive_Grab(t *testing.T) {
	bank := &mockBank{balance: sdk.NewInt64Coin("ubld", 1000)}
	keeper := makeTestKeeper(bank)
	ch := NewPortHandler(AppModule{}, keeper)
	sdkCtx := sdk.NewContext(nil, tmproto.Header{}, false, log.NewNopLogger())
	ctx := &swingset.ControllerContext{Context: sdkCtx}

	ret, err := ch.Receive(ctx, `{
		"type": "VPURSE_GRAB",
		"sender": "`+addr1.String()+`",
		"amount": "500",
		"denom": "ubld"
		}`)
	if err != nil {
		t.Fatalf("got error = %v", err)
	}
	balanceUpdate := vpurseBalanceUpdate{}
	err = json.Unmarshal([]byte(ret), &balanceUpdate)
	if err != nil {
		t.Errorf("unmarshal response error = %v", err)
	}
	got := normalizeBalanceUpdate(&balanceUpdate, t)
	want := newBalances(account(addr1.String(), coin("ubld", "1000")))
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}
	wantCalls := []string{
		"SendCoinsFromAccountToModule " + addr1.String() + " vpurse 500ubld",
		"BurnCoins vpurse 500ubld",
		"GetBalance " + addr1.String() + " ubld",
	}
	if !reflect.DeepEqual(bank.calls, wantCalls) {
		t.Errorf("got calls %v, want {%s}", bank.calls, wantCalls)
	}
}

// TODO(JimLarson): create tests for event handling.
