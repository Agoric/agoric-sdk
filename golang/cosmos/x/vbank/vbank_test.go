package vbank

import (
	"encoding/json"
	"fmt"
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
	"github.com/tendermint/tendermint/crypto/secp256k1"
	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
)

var (
	priv1 = secp256k1.GenPrivKey()
	priv2 = secp256k1.GenPrivKey()
	priv3 = secp256k1.GenPrivKey()
	priv4 = secp256k1.GenPrivKey()
	addr1 = sdk.AccAddress(priv1.PubKey().Address()).String()
	addr2 = sdk.AccAddress(priv2.PubKey().Address()).String()
	addr3 = sdk.AccAddress(priv3.PubKey().Address()).String()
	addr4 = sdk.AccAddress(priv4.PubKey().Address()).String()
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

// decodeBalances unmarshals a JSON-encoded vbankBalanceUpdate into normalized balances.
// A nil input returns a nil balances.
func decodeBalances(encoded []byte) (balances, error) {
	if encoded == nil {
		return nil, nil
	}
	balanceUpdate := vbankBalanceUpdate{}
	err := json.Unmarshal(encoded, &balanceUpdate)
	if err != nil {
		return nil, err
	}
	if balanceUpdate.Type != "VBANK_BALANCE_UPDATE" {
		return nil, fmt.Errorf("bad balance update type: %s", balanceUpdate.Type)
	}
	b := newBalances()
	for _, u := range balanceUpdate.Updated {
		account(u.Address, coin(u.Denom, u.Amount))(b)
	}
	return b, nil
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
				addr1: {sdk.NewInt64Coin("foocoin", 123)},
			},
			want: newBalances(account(addr1, coin("foocoin", "123"))),
		},
		{
			name: "multi-denom",
			addressToBalance: map[string]sdk.Coins{
				addr1: {
					sdk.NewInt64Coin("foocoin", 123),
					sdk.NewInt64Coin("barcoin", 456),
				},
			},
			want: newBalances(
				account(addr1,
					coin("foocoin", "123"),
					coin("barcoin", "456"))),
		},
		{
			name: "multi-acct",
			addressToBalance: map[string]sdk.Coins{
				addr1: {sdk.NewInt64Coin("foocoin", 123)},
				addr2: {sdk.NewInt64Coin("barcoin", 456)},
			},
			want: newBalances(
				account(addr1, coin("foocoin", "123")),
				account(addr2, coin("barcoin", "456")),
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
			got, err := decodeBalances(encoded)
			if err != nil {
				t.Fatalf("decode balance error = %v", err)
			}
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
	allBalances map[string]sdk.Coins
	// Value to return from GetBalance().
	balance map[string]sdk.Coin
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
	return b.allBalances[addr.String()]
}

func (b *mockBank) GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	b.record(fmt.Sprintf("GetBalance %s %s", addr, denom))
	return b.balance[addr.String()]
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
func makeTestKeeper(bank types.BankKeeper) Keeper {
	encodingConfig := params.MakeEncodingConfig()
	cdc := encodingConfig.Marshaller
	vbankStoreKey := storetypes.NewKVStoreKey(StoreKey)
	callToController := func(ctx sdk.Context, str string) (string, error) {
		return "", nil
	}
	return NewKeeper(cdc, vbankStoreKey, bank, "feeCollectorName", callToController)
}

func Test_Receive_GetBalance(t *testing.T) {
	bank := &mockBank{balance: map[string]sdk.Coin{
		addr1: sdk.NewInt64Coin("quatloos", 123),
	}}
	keeper := makeTestKeeper(bank)
	ch := NewPortHandler(AppModule{}, keeper)
	sdkCtx := sdk.NewContext(nil, tmproto.Header{}, false, log.NewNopLogger())
	ctx := &vm.ControllerContext{Context: sdkCtx}

	ret, err := ch.Receive(ctx, `{
		"type": "VBANK_GET_BALANCE",
		"address": "`+addr1+`",
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
		"GetBalance " + addr1 + " quatloos",
	}
	if !reflect.DeepEqual(bank.calls, wantCalls) {
		t.Errorf("got calls %v, want {%s}", bank.calls, wantCalls)
	}
}

func Test_Receive_Give(t *testing.T) {
	bank := &mockBank{balance: map[string]sdk.Coin{
		addr1: sdk.NewInt64Coin("urun", 1000),
	}}
	keeper := makeTestKeeper(bank)
	ch := NewPortHandler(AppModule{}, keeper)
	sdkCtx := sdk.NewContext(nil, tmproto.Header{}, false, log.NewNopLogger())
	ctx := &vm.ControllerContext{Context: sdkCtx}

	ret, err := ch.Receive(ctx, `{
		"type": "VBANK_GIVE",
		"recipient": "`+addr1+`",
		"amount": "1000",
		"denom": "urun"
		}`)
	if err != nil {
		t.Fatalf("got error = %v", err)
	}
	want := newBalances(account(addr1, coin("urun", "1000")))
	got, err := decodeBalances([]byte(ret))
	if err != nil {
		t.Errorf("decode balances error = %v", err)
	} else if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}
	wantCalls := []string{
		"MintCoins vbank 1000urun",
		"SendCoinsFromModuleToAccount vbank " + addr1 + " 1000urun",
		"GetBalance " + addr1 + " urun",
	}
	if !reflect.DeepEqual(bank.calls, wantCalls) {
		t.Errorf("got calls %v, want {%s}", bank.calls, wantCalls)
	}
}

func Test_Receive_GiveToFeeCollector(t *testing.T) {
	bank := &mockBank{}
	keeper := makeTestKeeper(bank)
	ch := NewPortHandler(AppModule{}, keeper)
	sdkCtx := sdk.NewContext(nil, tmproto.Header{}, false, log.NewNopLogger())
	ctx := &vm.ControllerContext{Context: sdkCtx}

	ret, err := ch.Receive(ctx, `{
		"type": "VBANK_GIVE_TO_FEE_COLLECTOR",
		"amount": "1000",
		"denom": "urun"
		}`)
	if err != nil {
		t.Fatalf("got error = %v", err)
	}
	if ret != `true` {
		t.Errorf("got %v, want \"true\"", ret)
	}
	wantCalls := []string{
		"MintCoins vbank 1000urun",
	}
	if !reflect.DeepEqual(bank.calls, wantCalls) {
		t.Errorf("got calls %v, want %v", bank.calls, wantCalls)
	}
}

func Test_Receive_Grab(t *testing.T) {
	bank := &mockBank{balance: map[string]sdk.Coin{
		addr1: sdk.NewInt64Coin("ubld", 1000),
	}}
	keeper := makeTestKeeper(bank)
	ch := NewPortHandler(AppModule{}, keeper)
	sdkCtx := sdk.NewContext(nil, tmproto.Header{}, false, log.NewNopLogger())
	ctx := &vm.ControllerContext{Context: sdkCtx}

	ret, err := ch.Receive(ctx, `{
		"type": "VBANK_GRAB",
		"sender": "`+addr1+`",
		"amount": "500",
		"denom": "ubld"
		}`)
	if err != nil {
		t.Fatalf("got error = %v", err)
	}
	want := newBalances(account(addr1, coin("ubld", "1000")))
	got, err := decodeBalances([]byte(ret))
	if err != nil {
		t.Errorf("decode balances error = %v", err)
	} else if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}
	wantCalls := []string{
		"SendCoinsFromAccountToModule " + addr1 + " vbank 500ubld",
		"BurnCoins vbank 500ubld",
		"GetBalance " + addr1 + " ubld",
	}
	if !reflect.DeepEqual(bank.calls, wantCalls) {
		t.Errorf("got calls %v, want {%s}", bank.calls, wantCalls)
	}
}

func Test_EndBlock(t *testing.T) {
	bank := &mockBank{allBalances: map[string]sdk.Coins{
		addr1: {sdk.NewInt64Coin("ubld", 1000)},
		addr2: {
			sdk.NewInt64Coin("urun", 4000),
			sdk.NewInt64Coin("arcadeTokens", 7),
		},
	}}
	keeper := makeTestKeeper(bank)
	msgsSent := []string{}
	keeper.CallToController = func(ctx sdk.Context, str string) (string, error) {
		msgsSent = append(msgsSent, str)
		return "", nil
	}
	am := NewAppModule(keeper)

	events := []abci.Event{
		{
			Type: "transfer",
			Attributes: []abci.EventAttribute{
				{Key: []byte("recipient"), Value: []byte(addr1)},
				{Key: []byte("sender"), Value: []byte(addr2)},
				{Key: []byte("amount"), Value: []byte("quite a lot")},
				{Key: []byte("other"), Value: []byte(addr3)},
			},
		},
		{
			Type: "not a transfer",
			Attributes: []abci.EventAttribute{
				{Key: []byte("sender"), Value: []byte(addr4)},
			},
		},
	}
	em := sdk.NewEventManagerWithHistory(events)
	ctx := sdk.NewContext(nil, tmproto.Header{}, false, log.NewNopLogger()).WithEventManager(em)

	updates := am.EndBlock(ctx, abci.RequestEndBlock{})
	if len(updates) != 0 {
		t.Errorf("EndBlock() got %+v, want empty", updates)
	}

	wantCalls := []string{
		"GetAllBalances " + addr1,
		"GetAllBalances " + addr2,
	}
	// TODO: make comparison order-insensitive
	if !reflect.DeepEqual(bank.calls, wantCalls) {
		t.Errorf("got calls %v, want {%s}", bank.calls, wantCalls)
	}

	wantMsg := newBalances(
		account(addr1, coin("ubld", "1000")),
		account(addr2, coin("urun", "4000"), coin("arcadeTokens", "7")),
	)
	if len(msgsSent) != 1 {
		t.Errorf("got msgs = %v, want one message", msgsSent)
	}
	gotMsg, err := decodeBalances([]byte(msgsSent[0]))
	if err != nil {
		t.Errorf("decode balances error = %v", err)
	} else if !reflect.DeepEqual(gotMsg, wantMsg) {
		t.Errorf("got sent message %v, want %v", gotMsg, wantMsg)
	}
}
