package v32

import (
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

type beans = types.StringBeans

func TestAddStorageBeanCost(t *testing.T) {
	var defaultStorageCost beans
	for _, b := range types.DefaultParams().BeansPerUnit {
		if b.Key == types.BeansPerStorageByte {
			defaultStorageCost = b
		}
	}
	if defaultStorageCost.Key == "" {
		t.Fatalf("no beans per storage byte in default params")
	}

	for _, tt := range []struct {
		name string
		in   []beans
		want []beans
	}{
		{
			name: "empty",
			in:   []beans{},
			want: []beans{defaultStorageCost},
		},
		{
			name: "alread_only_same",
			in:   []beans{defaultStorageCost},
			want: []beans{defaultStorageCost},
		},
		{
			name: "already_only_different",
			in:   []beans{types.NewStringBeans(types.BeansPerStorageByte, sdk.NewUint(123))},
			want: []beans{types.NewStringBeans(types.BeansPerStorageByte, sdk.NewUint(123))},
		},
		{
			name: "already_same",
			in: []beans{
				types.NewStringBeans("foo", sdk.NewUint(123)),
				defaultStorageCost,
				types.NewStringBeans("bar", sdk.NewUint(456)),
			},
			want: []beans{
				types.NewStringBeans("foo", sdk.NewUint(123)),
				defaultStorageCost,
				types.NewStringBeans("bar", sdk.NewUint(456)),
			},
		},
		{
			name: "already_different",
			in: []beans{
				types.NewStringBeans("foo", sdk.NewUint(123)),
				types.NewStringBeans(types.BeansPerStorageByte, sdk.NewUint(789)),
				types.NewStringBeans("bar", sdk.NewUint(456)),
			},
			want: []beans{
				types.NewStringBeans("foo", sdk.NewUint(123)),
				types.NewStringBeans(types.BeansPerStorageByte, sdk.NewUint(789)),
				types.NewStringBeans("bar", sdk.NewUint(456)),
			},
		},
		{
			name: "missing",
			in: []beans{
				types.NewStringBeans("foo", sdk.NewUint(123)),
				types.NewStringBeans("bar", sdk.NewUint(456)),
			},
			want: []beans{
				types.NewStringBeans("foo", sdk.NewUint(123)),
				types.NewStringBeans("bar", sdk.NewUint(456)),
				defaultStorageCost,
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := addStorageBeanCost(tt.in)
			if err != nil {
				t.Errorf("got error %v", err)
			} else if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("want %v, got %v", tt.want, got)
			}
		})
	}
}

func TestUpdateParams(t *testing.T) {
	var defaultStorageCost beans
	for _, b := range types.DefaultParams().BeansPerUnit {
		if b.Key == types.BeansPerStorageByte {
			defaultStorageCost = b
		}
	}
	if defaultStorageCost.Key == "" {
		t.Fatalf("no beans per storage byte in default params")
	}

	in := types.Params{
		BeansPerUnit: []beans{
			types.NewStringBeans("foo", sdk.NewUint(123)),
			types.NewStringBeans("bar", sdk.NewUint(456)),
		},
		BootstrapVatConfig: "baz",
		FeeUnitPrice:       sdk.NewCoins(sdk.NewInt64Coin("denom", 789)),
		PowerFlagFees:      types.DefaultPowerFlagFees,
		QueueMax:           types.DefaultQueueMax,
	}
	want := types.Params{
		BeansPerUnit: []beans{
			types.NewStringBeans("foo", sdk.NewUint(123)),
			types.NewStringBeans("bar", sdk.NewUint(456)),
			defaultStorageCost,
		},
		BootstrapVatConfig: "baz",
		FeeUnitPrice:       sdk.NewCoins(sdk.NewInt64Coin("denom", 789)),
		PowerFlagFees:      types.DefaultPowerFlagFees,
		QueueMax:           types.DefaultQueueMax,
	}
	got, err := UpdateParams(in)
	if err != nil {
		t.Fatalf("UpdateParam error %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}
