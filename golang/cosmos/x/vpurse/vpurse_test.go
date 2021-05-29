package vpurse

import (
	"reflect"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

func Test_marshalBalanceUpdate(t *testing.T) {
	tests := []struct {
		name             string
		addressToBalance map[string]sdk.Coins
		want             []byte
		wantErr          bool
	}{
		{
			name:             "nil",
			addressToBalance: map[string]sdk.Coins{},
			want:             nil,
		},
		{
			name: "simple",
			addressToBalance: map[string]sdk.Coins{
				"acct1": sdk.Coins{sdk.NewInt64Coin("foocoin", 123)},
			},
			want: []byte(
				`{"nonce":1,"type":"VPURSE_BALANCE_UPDATE","updated":[` +
					`{"address":"acct1","denom":"foocoin","amount":"123"}` +
					`]}`,
			),
		},
		{
			name: "multi-denom",
			addressToBalance: map[string]sdk.Coins{
				"acct1": sdk.Coins{
					sdk.NewInt64Coin("foocoin", 123),
					sdk.NewInt64Coin("barcoin", 456),
				},
			},
			want: []byte(
				`{"nonce":2,"type":"VPURSE_BALANCE_UPDATE","updated":[` +
					`{"address":"acct1","denom":"foocoin","amount":"123"},` +
					`{"address":"acct1","denom":"barcoin","amount":"456"}` +
					`]}`,
			),
		},
		{
			name: "multi-acct",
			addressToBalance: map[string]sdk.Coins{
				"acct1": sdk.Coins{sdk.NewInt64Coin("foocoin", 123)},
				"acct2": sdk.Coins{sdk.NewInt64Coin("barcoin", 456)},
			},
			want: []byte(
				`{"nonce":3,"type":"VPURSE_BALANCE_UPDATE","updated":[` +
					`{"address":"acct1","denom":"foocoin","amount":"123"},` +
					`{"address":"acct2","denom":"barcoin","amount":"456"}` +
					`]}`,
			),
		},
	}
	resetForTests()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := marshalBalanceUpdate(tt.addressToBalance)
			if (err != nil) != tt.wantErr {
				t.Errorf("marshalBalanceUpdate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("marshalBalanceUpdate() = %v, want %v", string(got), string(tt.want))
			}
		})
	}
}
