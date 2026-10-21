package types

import (
	"strings"
	"reflect"
	"testing"

	sdkmath "cosmossdk.io/math"
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
			in:   []beans{NewStringBeans(BeansPerStorageByte, sdkmath.NewUint(123))},
			want: []beans{NewStringBeans(BeansPerStorageByte, sdkmath.NewUint(123))},
		},
		{
			name: "already_same",
			in: []beans{
				NewStringBeans("foo", sdkmath.NewUint(123)),
				defaultStorageCost,
				NewStringBeans("bar", sdkmath.NewUint(456)),
			},
			want: []beans{
				NewStringBeans("foo", sdkmath.NewUint(123)),
				defaultStorageCost,
				NewStringBeans("bar", sdkmath.NewUint(456)),
			},
		},
		{
			name: "already_different",
			in: []beans{
				NewStringBeans("foo", sdkmath.NewUint(123)),
				NewStringBeans(BeansPerStorageByte, sdkmath.NewUint(789)),
				NewStringBeans("bar", sdkmath.NewUint(456)),
			},
			want: []beans{
				NewStringBeans("foo", sdkmath.NewUint(123)),
				NewStringBeans(BeansPerStorageByte, sdkmath.NewUint(789)),
				NewStringBeans("bar", sdkmath.NewUint(456)),
			},
		},
		{
			name: "missing",
			in: []beans{
				NewStringBeans("foo", sdkmath.NewUint(123)),
				NewStringBeans("bar", sdkmath.NewUint(456)),
			},
			want: []beans{
				NewStringBeans("foo", sdkmath.NewUint(123)),
				NewStringBeans("bar", sdkmath.NewUint(456)),
				defaultStorageCost,
			},
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			got, err := appendMissingDefaults(tt.in, []StringBeans{defaultStorageCost})
			if err != nil {
				t.Errorf("got error %v", err)
			} else if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("want %v, got %v", tt.want, got)
			}
		})
	}
}

func TestUpdateParamsFromEmpty(t *testing.T) {
	in := Params{
		BeansPerUnit:       nil,
		BootstrapVatConfig: "",
		FeeUnitPrice:       sdk.NewCoins(sdk.NewInt64Coin("denom", 789)),
		PowerFlagFees:      nil,
		QueueMax:           nil,
		VatCleanupBudget:   nil,
	}
	want := Params{
		BeansPerUnit:                     DefaultBeansPerUnit(),
		BootstrapVatConfig:               "",
		FeeUnitPrice:                     sdk.NewCoins(sdk.NewInt64Coin("denom", 789)),
		PowerFlagFees:                    DefaultPowerFlagFees,
		QueueMax:                         DefaultQueueMax,
		VatCleanupBudget:                 DefaultVatCleanupBudget,
		InstallationDeadlineBlocks:       DefaultInstallationDeadlineBlocks,
		InstallationDeadlineSeconds:      DefaultInstallationDeadlineSeconds,
		BundleUncompressedSizeLimitBytes: DefaultBundleUncompressedSizeLimitBytes,
		ChunkSizeLimitBytes:              DefaultChunkSizeLimitBytes,
	}
	got, err := UpdateParams(in)
	if err != nil {
		t.Fatalf("UpdateParam error %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("GOT\n%v\nWANTED\n%v", got, want)
	}
}

func TestUpdateParamsFromExisting(t *testing.T) {
	defaultBeansPerUnit := DefaultBeansPerUnit()
	customBeansPerUnit := NewStringBeans("foo", sdkmath.NewUint(1))
	customPowerFlagFee := NewPowerFlagFee("bar", sdk.NewCoins(sdk.NewInt64Coin("baz", 2)))
	customQueueSize := NewQueueSize("qux", int32(3))
	customVatCleanup := UintMapEntry{"corge", sdkmath.NewUint(4)}
	in := Params{
		BeansPerUnit:                append([]StringBeans{customBeansPerUnit}, defaultBeansPerUnit[2:4]...),
		BootstrapVatConfig:          "",
		FeeUnitPrice:                sdk.NewCoins(sdk.NewInt64Coin("denom", 789)),
		PowerFlagFees:               []PowerFlagFee{customPowerFlagFee},
		QueueMax:                    []QueueSize{NewQueueSize(QueueInbound, int32(10)), customQueueSize},
		VatCleanupBudget:            []UintMapEntry{customVatCleanup, UintMapEntry{VatCleanupDefault, sdkmath.NewUint(10)}},
		InstallationDeadlineBlocks:  300,
		InstallationDeadlineSeconds: -1,
	}
	want := Params{
		BeansPerUnit:                     append(append(in.BeansPerUnit, defaultBeansPerUnit[0:2]...), defaultBeansPerUnit[4:]...),
		BootstrapVatConfig:               in.BootstrapVatConfig,
		FeeUnitPrice:                     in.FeeUnitPrice,
		PowerFlagFees:                    append(in.PowerFlagFees, DefaultPowerFlagFees...),
		QueueMax:                         in.QueueMax,
		VatCleanupBudget:                 append(in.VatCleanupBudget, DefaultVatCleanupBudget[1:]...),
		InstallationDeadlineBlocks:       in.InstallationDeadlineBlocks,
		InstallationDeadlineSeconds:      in.InstallationDeadlineSeconds,
		BundleUncompressedSizeLimitBytes: DefaultBundleUncompressedSizeLimitBytes,
		ChunkSizeLimitBytes:              DefaultChunkSizeLimitBytes,
	}
	got, err := UpdateParams(in)
	if err != nil {
		t.Fatalf("UpdateParam error %v", err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("GOT\n%v\nWANTED\n%v", got, want)
	}
}

func TestUpdateParamsTreatsZeroDeadlinesAsUnset(t *testing.T) {
	in := DefaultParams()
	in.InstallationDeadlineBlocks = 0
	in.InstallationDeadlineSeconds = 0

	got, err := UpdateParams(in)
	if err != nil {
		t.Fatalf("UpdateParam error %v", err)
	}
	if got.InstallationDeadlineBlocks != DefaultInstallationDeadlineBlocks {
		t.Fatalf(
			"expected InstallationDeadlineBlocks to default when set to 0: got %d, want %d",
			got.InstallationDeadlineBlocks,
			DefaultInstallationDeadlineBlocks,
		)
	}
	if got.InstallationDeadlineSeconds != DefaultInstallationDeadlineSeconds {
		t.Fatalf(
			"expected InstallationDeadlineSeconds to default when set to 0: got %d, want %d",
			got.InstallationDeadlineSeconds,
			DefaultInstallationDeadlineSeconds,
		)
	}
}

func TestValidateParams(t *testing.T) {
	params := DefaultParams()
	params.BootstrapVatConfig = "foo"
	params.FeeUnitPrice = sdk.NewCoins(sdk.NewInt64Coin("denom", 789))
	err := params.ValidateBasic()
	if err != nil {
		t.Errorf("unexpected ValidateBasic() error with default params: %v", err)
	}

	customVatCleanup := UintMapEntry{"corge", sdkmath.NewUint(4)}
	params.VatCleanupBudget = append(params.VatCleanupBudget, customVatCleanup)
	err = params.ValidateBasic()
	if err != nil {
		t.Errorf("unexpected ValidateBasic() error with extended params: %v", err)
	}

	params.VatCleanupBudget = params.VatCleanupBudget[1:]
	err = params.ValidateBasic()
	if err == nil {
		t.Errorf("ValidateBasic() failed to reject VatCleanupBudget with missing `default` %v", params.VatCleanupBudget)
	}

	params.VatCleanupBudget = []UintMapEntry{}
	err = params.ValidateBasic()
	if err != nil {
		t.Errorf("unexpected ValidateBasic() error with empty VatCleanupBudget: %v", params.VatCleanupBudget)
	}
}

func TestValidateInstallationDeadlineBounds(t *testing.T) {
	const minInt64 int64 = -1 << 63

	for _, tc := range []struct {
		name          string
		seconds       int64
		blocks        int64
		wantErrSubstr string
	}{
		{name: "both unlimited", seconds: -1, blocks: -1},
		{name: "both immediate", seconds: 0, blocks: 0},
		{name: "both positive", seconds: 1, blocks: 1},
		{
			name:          "seconds below minimum",
			seconds:       -2,
			blocks:        -1,
			wantErrSubstr: "installation_deadline_seconds must be -1 (unlimited), 0 (expire immediately), or positive, got -2",
		},
		{
			name:          "blocks below minimum",
			seconds:       -1,
			blocks:        -2,
			wantErrSubstr: "installation_deadline_blocks must be -1 (unlimited), 0 (expire immediately), or positive, got -2",
		},
		{
			name:          "seconds at int64 minimum",
			seconds:       minInt64,
			blocks:        -1,
			wantErrSubstr: "installation_deadline_seconds must be -1 (unlimited), 0 (expire immediately), or positive, got -9223372036854775808",
		},
		{
			name:          "blocks at int64 minimum",
			seconds:       -1,
			blocks:        minInt64,
			wantErrSubstr: "installation_deadline_blocks must be -1 (unlimited), 0 (expire immediately), or positive, got -9223372036854775808",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			params := DefaultParams()
			params.BootstrapVatConfig = "foo"
			params.FeeUnitPrice = sdk.NewCoins(sdk.NewInt64Coin("denom", 789))
			params.InstallationDeadlineSeconds = tc.seconds
			params.InstallationDeadlineBlocks = tc.blocks

			err := params.ValidateBasic()
			if tc.wantErrSubstr == "" {
				if err != nil {
					t.Fatalf("unexpected ValidateBasic() error: %v", err)
				}
				return
			}
			if err == nil {
				t.Fatal("expected ValidateBasic() error, got nil")
			}
			if !strings.Contains(err.Error(), tc.wantErrSubstr) {
				t.Fatalf("expected error containing %q, got %q", tc.wantErrSubstr, err)
			}
		})
	}
}
