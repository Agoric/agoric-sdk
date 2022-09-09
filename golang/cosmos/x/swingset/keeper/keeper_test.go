package keeper

import (
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func mkcoin(denom string) func(amt int64) sdk.Coin {
	return func(amt int64) sdk.Coin {
		return sdk.NewInt64Coin(denom, amt)
	}
}

var (
	a          = mkcoin("coina")
	b          = mkcoin("coinb")
	cns        = sdk.NewCoins
	submitAddr = sdk.AccAddress([]byte("submitter"))
	utilAddr   = sdk.AccAddress([]byte("addr"))
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
				submitter:  submitAddr,
				addr:       utilAddr,
				powerFlags: []string{"powerflag1", "powerflag2"},
			},
			want: cns(),
		},
		{
			name: "provision pass and more",
			args: args{
				balances:   privilegedProvisioningCoins.Add(privilegedProvisioningCoins...).Add(a(1000)),
				submitter:  submitAddr,
				addr:       utilAddr,
				powerFlags: []string{"powerflag1", "powerflag2"},
			},
			want: cns(),
		},
		{
			name: "cannot pay fee to provision third party",
			args: args{
				submitter:  submitAddr,
				addr:       utilAddr,
				powerFlags: []string{"powerflag1"},
			},
			errMsg: "submitter is not the same as target address for fee-based provisioning",
		},
		{
			name: "need powerflags for fee provisioning",
			args: args{
				submitter: utilAddr,
				addr:      utilAddr,
			},
			errMsg: "must specify powerFlags for fee-based provisioning",
		},
		{
			name: "unrecognized powerFlag",
			args: args{
				submitter:  utilAddr,
				addr:       utilAddr,
				powerFlags: []string{"power1"},
			},
			errMsg: "unrecognized powerFlag: power1",
		},
		{
			name: "get fee for power1",
			args: args{
				submitter:  utilAddr,
				addr:       utilAddr,
				powerFlags: []string{"power1"},
				powerFlagFees: []types.PowerFlagFee{
					{
						PowerFlag: "power2",
						Fee:       cns(a(1000)),
					},
					{
						PowerFlag: "power1",
						Fee:       cns(a(1300)),
					},
				},
			},
			want: cns(a(1300)),
		},
		{
			name: "later menu entries do not override",
			args: args{
				submitter:  utilAddr,
				addr:       utilAddr,
				powerFlags: []string{"power1"},
				powerFlagFees: []types.PowerFlagFee{
					{
						PowerFlag: "power2",
						Fee:       cns(a(1000)),
					},
					{
						PowerFlag: "power1",
						Fee:       cns(a(1300)),
					},
					{
						PowerFlag: "power1",
						Fee:       cns(a(800)),
					},
				},
			},
			want: cns(a(1300)),
		},
		{
			name: "fees add up",
			args: args{
				submitter:  utilAddr,
				addr:       utilAddr,
				powerFlags: []string{"power1", "power2", "freepower"},
				powerFlagFees: []types.PowerFlagFee{
					{
						PowerFlag: "power2",
						Fee:       cns(a(1000), b(15)),
					},
					{
						PowerFlag: "power1",
						Fee:       cns(a(1300)),
					},
					{
						PowerFlag: "freepower",
					},
				},
			},
			want: cns(a(2300), b(15)),
		},
		{
			name: "multiple occurrences of same powerflag",
			args: args{
				submitter:  utilAddr,
				addr:       utilAddr,
				powerFlags: []string{"power1", "power1"},
				powerFlagFees: []types.PowerFlagFee{
					{
						PowerFlag: "power2",
						Fee:       cns(a(1000)),
					},
					{
						PowerFlag: "power1",
						Fee:       cns(a(1300)),
					},
				},
			},
			want: cns(a(2600)),
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
