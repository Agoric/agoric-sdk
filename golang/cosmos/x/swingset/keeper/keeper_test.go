package keeper

import (
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func Test_calculateFees(t *testing.T) {
	type args struct {
		balances        sdk.Coins
		submitter, addr sdk.AccAddress
		powerFlags      []string
		powerFlagFees   []types.PowerFlagFee
	}
	tests := []struct {
		name   string
		args   args
		want   sdk.Coins
		errMsg string
	}{
		{
			name: "provision pass",
			args: args{
				balances:   privilegedProvisioningCoins,
				submitter:  sdk.AccAddress([]byte("submitter")),
				addr:       sdk.AccAddress([]byte("addr")),
				powerFlags: []string{"powerflag1", "powerflag2"},
			},
			want: sdk.NewCoins(),
		},
		{
			name: "provision pass and more",
			args: args{
				balances:   privilegedProvisioningCoins.Add(privilegedProvisioningCoins...).Add(sdk.NewCoin("coina", sdk.NewInt(1000))),
				submitter:  sdk.AccAddress([]byte("submitter")),
				addr:       sdk.AccAddress([]byte("addr")),
				powerFlags: []string{"powerflag1", "powerflag2"},
			},
			want: sdk.NewCoins(),
		},
		{
			name: "cannot pay fee to provision third party",
			args: args{
				submitter: sdk.AccAddress([]byte("submitter")),
				addr:      sdk.AccAddress([]byte("addr")),
			},
			errMsg: "submitter is not the same as target address for fee-based provisioning",
		},
		{
			name:   "need powerflags for fee provisioning",
			args:   args{},
			errMsg: "must specify powerFlags for fee-based provisioning",
		},
		{
			name: "unrecognized powerFlag",
			args: args{
				powerFlags: []string{"power1"},
			},
			errMsg: "unrecognized powerFlag: power1",
		},
		{
			name: "get fee for power1",
			args: args{
				powerFlags: []string{"power1"},
				powerFlagFees: []types.PowerFlagFee{
					{
						PowerFlag: "power2",
						Fee:       sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1000))),
					},
					{
						PowerFlag: "power1",
						Fee:       sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1300))),
					},
				},
			},
			want: sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1300))),
		},
		{
			name: "later menu entries do not override",
			args: args{
				powerFlags: []string{"power1"},
				powerFlagFees: []types.PowerFlagFee{
					{
						PowerFlag: "power2",
						Fee:       sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1000))),
					},
					{
						PowerFlag: "power1",
						Fee:       sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1300))),
					},
					{
						PowerFlag: "power1",
						Fee:       sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(800))),
					},
				},
			},
			want: sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1300))),
		},
		{
			name: "fees add up",
			args: args{
				powerFlags: []string{"power1", "power2", "freepower"},
				powerFlagFees: []types.PowerFlagFee{
					{
						PowerFlag: "power2",
						Fee: sdk.NewCoins(
							sdk.NewCoin("coina", sdk.NewInt(1000)),
							sdk.NewCoin("coinb", sdk.NewInt(15)),
						),
					},
					{
						PowerFlag: "power1",
						Fee:       sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1300))),
					},
					{
						PowerFlag: "freepower",
					},
				},
			},
			want: sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(2300)), sdk.NewCoin("coinb", sdk.NewInt(15))),
		},
		{
			name: "multiple occurrences of same powerflag",
			args: args{
				powerFlags: []string{"power1", "power1"},
				powerFlagFees: []types.PowerFlagFee{
					{
						PowerFlag: "power2",
						Fee:       sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1000))),
					},
					{
						PowerFlag: "power1",
						Fee:       sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(1300))),
					},
				},
			},
			want: sdk.NewCoins(sdk.NewCoin("coina", sdk.NewInt(2600))),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calculateFees(tt.args.balances, tt.args.submitter, tt.args.addr, tt.args.powerFlags, tt.args.powerFlagFees)
			var errMsg string
			if err != nil {
				errMsg = err.Error()
			}
			if errMsg != tt.errMsg {
				t.Errorf("calculateFees() error = %v, want %v", err, tt.errMsg)
				return
			}
			if !got.IsEqual(tt.want) {
				t.Errorf("calculateFees() = %v, want %v", got, tt.want)
			}
		})
	}
}
