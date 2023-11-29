package types

import (
	"reflect"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type beans = StringBeans

func TestAddStorageBeanCost(t *testing.T) {
	var defaultStorageCost beans
	for _, b := range DefaultParams().BeansPerUnit {
		if b.Key == BeansPerStorageByte {
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
			name: "already_only_same",
			in:   []beans{defaultStorageCost},
			want: []beans{defaultStorageCost},
		},
		{
			name: "already_only_different",
			in:   []beans{NewStringBeans(BeansPerStorageByte, sdk.NewUint(123))},
			want: []beans{NewStringBeans(BeansPerStorageByte, sdk.NewUint(123))},
		},
		{
			name: "already_same",
			in: []beans{
				NewStringBeans("foo", sdk.NewUint(123)),
				defaultStorageCost,
				NewStringBeans("bar", sdk.NewUint(456)),
			},
			want: []beans{
				NewStringBeans("foo", sdk.NewUint(123)),
				defaultStorageCost,
				NewStringBeans("bar", sdk.NewUint(456)),
			},
		},
		{
			name: "already_different",
			in: []beans{
				NewStringBeans("foo", sdk.NewUint(123)),
				NewStringBeans(BeansPerStorageByte, sdk.NewUint(789)),
				NewStringBeans("bar", sdk.NewUint(456)),
			},
			want: []beans{
				NewStringBeans("foo", sdk.NewUint(123)),
				NewStringBeans(BeansPerStorageByte, sdk.NewUint(789)),
				NewStringBeans("bar", sdk.NewUint(456)),
			},
		},
		{
			name: "missing",
			in: []beans{
				NewStringBeans("foo", sdk.NewUint(123)),
				NewStringBeans("bar", sdk.NewUint(456)),
			},
			want: []beans{
				NewStringBeans("foo", sdk.NewUint(123)),
				NewStringBeans("bar", sdk.NewUint(456)),
				defaultStorageCost,
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := appendMissingDefaultBeansPerUnit(tt.in, []StringBeans{defaultStorageCost})
			if err != nil {
				t.Errorf("got error %v", err)
			} else if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("want %v, got %v", tt.want, got)
			}
		})
	}
}

func TestUpdateParams(t *testing.T) {

	in := Params{
		BeansPerUnit:       []beans{},
		BootstrapVatConfig: "baz",
		FeeUnitPrice:       sdk.NewCoins(sdk.NewInt64Coin("denom", 789)),
		PowerFlagFees:      []PowerFlagFee{},
		QueueMax:           []QueueSize{},
	}
	want := Params{
		BeansPerUnit:       DefaultBeansPerUnit(),
		BootstrapVatConfig: "baz",
		FeeUnitPrice:       sdk.NewCoins(sdk.NewInt64Coin("denom", 789)),
		PowerFlagFees:      DefaultPowerFlagFees,
		QueueMax:           DefaultQueueMax,
	}
	got, err := UpdateParams(in)
	if err != nil {
		t.Fatalf("UpdateParam error %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %v, want %v", got, want)
	}
}
