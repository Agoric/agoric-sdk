package vlocalchain_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vlocalchain/types"
	"github.com/cosmos/cosmos-sdk/store"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	banktypes "github.com/cosmos/cosmos-sdk/x/bank/types"
	transfertypes "github.com/cosmos/ibc-go/v6/modules/apps/transfer/types"
	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
	dbm "github.com/tendermint/tm-db"
)

var (
	vlocalchainStoreKey = sdk.NewKVStoreKey(types.StoreKey)
)

const (
	firstAddr          = "cosmos17qax7m5fe25dnpdjjlq94klfd8m98e40txrwrzrpmz7kt5qqnqzsq0y5qf"
	msgAllocateAddress = `{"type":"VLOCALCHAIN_ALLOCATE_ADDRESS"}`
)

type mockBank struct {
	banktypes.UnimplementedQueryServer
	allBalances map[string]sdk.Coins
}

var _ types.BankKeeper = (*mockBank)(nil)
var _ banktypes.QueryServer = (*mockBank)(nil)

func (b *mockBank) AllBalances(ctx context.Context, req *banktypes.QueryAllBalancesRequest) (*banktypes.QueryAllBalancesResponse, error) {
	addr, err := sdk.AccAddressFromBech32(req.Address)
	if err != nil {
		return nil, err
	}

	var resp banktypes.QueryAllBalancesResponse
	resp.Balances = b.GetAllBalances(sdk.UnwrapSDKContext(ctx), addr)
	return &resp, nil
}

func (b *mockBank) GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	if coins, ok := b.allBalances[addr.String()]; ok {
		return coins
	}
	return sdk.Coins{}
}

func (b *mockBank) SendCoins(ctx sdk.Context, fromAddr sdk.AccAddress, toAddr sdk.AccAddress, amt sdk.Coins) error {
	return nil
}

type mockTransfer struct{}

var _ types.TransferKeeper = (*mockTransfer)(nil)

func (t *mockTransfer) Transfer(cctx context.Context, msg *transfertypes.MsgTransfer) (*transfertypes.MsgTransferResponse, error) {
	return &transfertypes.MsgTransferResponse{Sequence: 1}, nil
}

// makeTestKit creates a minimal Keeper and Context for use in testing.
func makeTestKit(bank types.BankKeeper, transfer types.TransferKeeper) (vm.PortHandler, context.Context) {
	encodingConfig := params.MakeEncodingConfig()
	cdc := encodingConfig.Marshaler

	banktypes.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	transfertypes.RegisterInterfaces(encodingConfig.InterfaceRegistry)

	// create a new Keeper
	keeper := vlocalchain.NewKeeper(cdc, vlocalchainStoreKey, bank)

	db := dbm.NewMemDB()
	ms := store.NewCommitMultiStore(db)
	ms.MountStoreWithDB(vlocalchainStoreKey, storetypes.StoreTypeIAVL, db)
	err := ms.LoadLatestVersion()
	if err != nil {
		panic(err)
	}

	// create a new SDK Context
	ctx := sdk.NewContext(ms, tmproto.Header{}, false, log.NewNopLogger())

	handler := vm.NewProtectedPortHandler(vlocalchain.NewReceiver(keeper, transfer))

	// create a new Go context
	cctx := sdk.WrapSDKContext(ctx)
	return handler, cctx
}

func Test_Receive_AllocateAddress(t *testing.T) {
	bank := &mockBank{}
	transfer := &mockTransfer{}
	handler, cctx := makeTestKit(bank, transfer)

	addrs := map[string]bool{
		firstAddr: false,
		"cosmos1rtlju4cx4c4aezuzte9x8tl8vn6paz9ysty6lxkpvmj0906kh23q72pt0k": false,
		"cosmos1cdplmjdyugwrkuahe9npxj8pslkk9s6902k23k0cx9v0zhqp6pnqfxdm7v": false,
		"cosmos1mnp29x834zcetn7sk3dzhtwnklve26fk6pneah758s9ecprd8kds7pf8y2": false,
		"cosmos1wm0ctjfc5dd23u5zxlenwur2h3j32ry4gq597v6r9vazted5f47s5uue5m": false,
	}
	numToTest := len(addrs)
	for i := 0; i < numToTest; i++ {
		// receive the message
		ret, err := handler.Receive(cctx, msgAllocateAddress)
		if err != nil {
			t.Fatalf("unexpected error[%d]: %v", i, err)
		}
		if ret == "" {
			t.Fatalf("expected non-empty address[%d]", i)
		}
		var addr string
		if err := json.Unmarshal([]byte(ret), &addr); err != nil {
			t.Fatalf("unexpected error unmarshalling address string[%d]: %v: %v", i, ret, err)
		}

		already, ok := addrs[addr]
		if !ok {
			t.Fatalf("unexpected address[%d]: %v", i, addr)
		}
		if already {
			t.Fatalf("unexpected duplicate address[%d]: %v", i, addr)
		}
		addrs[addr] = true
	}
}

func Test_Receive_Query(t *testing.T) {
	alreadyAddr := sdk.MustBech32ifyAddressBytes("cosmos", []byte("already"))
	nonexistentAddr := sdk.MustBech32ifyAddressBytes("cosmos", []byte("nonexistent"))
	bank := &mockBank{allBalances: map[string]sdk.Coins{
		firstAddr:   []sdk.Coin{sdk.NewCoin("fresh", sdk.NewInt(123))},
		alreadyAddr: []sdk.Coin{sdk.NewCoin("stale", sdk.NewInt(321))},
	}}
	transfer := &mockTransfer{}
	handler, cctx := makeTestKit(bank, transfer)

	// get balances
	testCases := []struct {
		name     string
		addr     string
		failure  string
		expected sdk.Coins
	}{
		{"nonexistent", nonexistentAddr, "", sdk.Coins{}},
		{"already", alreadyAddr, "", bank.allBalances[alreadyAddr]},
		{"first", firstAddr, "", bank.allBalances[firstAddr]},
		{"badaddr", "cosmos11111111111", "panic: decoding bech32 failed: invalid separator index 16", sdk.Coins{}},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			msgGetBalances := `{"type":"VLOCALCHAIN_QUERY","messages":[{"@type":"/cosmos.bank.v1beta1.QueryAllBalancesRequest","address":"` + tc.addr + `"}]}`
			t.Logf("msgGetBalances: %v", msgGetBalances)
			ret, err := handler.Receive(cctx, msgGetBalances)
			if tc.failure != "" {
				if err == nil {
					t.Fatalf("expected error %v, not nil with return %v", tc.failure, ret)
				} else if err.Error() != tc.failure {
					t.Fatalf("expected error %v, not %v", tc.failure, err)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if err == nil && ret == "" {
				t.Fatalf("expected non-empty json")
			}
			var resps []banktypes.QueryAllBalancesResponse
			if err := json.Unmarshal([]byte(ret), &resps); err != nil {
				t.Fatalf("unexpected error unmarshalling responses: %v: %v", ret, err)
			}
			if len(resps) != 1 {
				t.Fatalf("expected responses length 1, got %v", len(resps))
			}

			if !resps[0].Balances.IsEqual(tc.expected) {
				t.Fatalf("unexpected balance: got %v, expected %v", resps[0].Balances, tc.expected)
			}
		})
	}
}

func Test_Receive_ExecuteTx(t *testing.T) {
	alreadyAddr := sdk.MustBech32ifyAddressBytes("cosmos", []byte("already"))
	bank := &mockBank{allBalances: map[string]sdk.Coins{
		firstAddr:   []sdk.Coin{sdk.NewCoin("fresh", sdk.NewInt(123))},
		alreadyAddr: []sdk.Coin{sdk.NewCoin("stale", sdk.NewInt(321))},
	}}
	transfer := &mockTransfer{}
	handler, cctx := makeTestKit(bank, transfer)

	// create a new message
	msg := `{"type":"VLOCALCHAIN_ALLOCATE_ADDRESS"}`
	ret, err := handler.Receive(cctx, msg)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if ret == "" {
		t.Fatalf("expected non-empty json")
	}
	var addr string
	if err := json.Unmarshal([]byte(ret), &addr); err != nil {
		t.Fatalf("unexpected error unmarshalling address string: %v: %s", ret, err)
	}
	if addr != firstAddr {
		t.Fatalf("expected address %v, got %v", firstAddr, addr)
	}

	// create a new message
	msg = `{"type":"VLOCALCHAIN_EXECUTE_TX","address":"` + addr +
		`","messages":[{"@type":"/cosmos.bank.v1beta1.MsgSend","from_address":"` +
		firstAddr + `","to_address":"` + alreadyAddr +
		`","amount":[{"denom":"fresh","amount":"100"}]}]}`
	ret, err = handler.Receive(cctx, msg)
	if err != nil {
		t.Fatalf("unexpected error: %s", err)
	}
	if ret == "" {
		t.Fatalf("expected non-empty json")
	}
	if ret != "[null]" {
		t.Fatalf("expected null response: %v", ret)
	}
}
