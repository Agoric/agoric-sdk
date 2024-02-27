package vm_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

var (
	_ vm.Action = Defaults{}
	_ vm.Action = &Defaults{}
	_ vm.Action = dataAction{}
	_ vm.Action = &dataAction{}
	_ vm.Action = &Trivial{}
)

type Trivial struct {
	vm.ActionHeader
	Abc int
	def string
}

type Defaults struct {
	String string  `default:"abc"`
	Int    int     `default:"123"`
	Float  float64 `default:"4.56"`
	Bool   bool    `default:"true"`
	Any    interface{}
}

func (d Defaults) GetActionHeader() *vm.ActionHeader {
	return &vm.ActionHeader{}
}

type dataAction struct {
	*vm.ActionHeader `actionType:"DATA_ACTION"`
	Data             []byte
}

func TestActionContext(t *testing.T) {
	emptyCtx := sdk.Context{}

	testCases := []struct {
		name        string
		ctx         sdk.Context
		in          vm.Action
		expectedOut interface{}
	}{
		{"nil", emptyCtx, nil, nil},
		{"no context", emptyCtx,
			&Trivial{Abc: 123, def: "zot"},
			&Trivial{Abc: 123, def: "zot"},
		},
		{"not a pointer", emptyCtx,
			&Trivial{Abc: 123, def: "zot"},
			Trivial{Abc: 123, def: "zot"},
		},
		{"block height",
			emptyCtx.WithBlockHeight(998),
			&Trivial{Abc: 123, def: "zot"},
			&Trivial{ActionHeader: vm.ActionHeader{BlockHeight: 998}, Abc: 123, def: "zot"},
		},
		{"block time",
			emptyCtx.WithBlockTime(time.UnixMicro(1_000_000)),
			&Trivial{Abc: 123, def: "zot"},
			&Trivial{Abc: 123, def: "zot", ActionHeader: vm.ActionHeader{BlockTime: 1}},
		},
		{"default tags",
			emptyCtx,
			&Defaults{},
			&Defaults{"abc", 123, 4.56, true, nil},
		},
		{"data action no pointer",
			emptyCtx,
			dataAction{},
			dataAction{
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION"},
			},
		},
		{"data action pointer",
			emptyCtx,
			&dataAction{},
			&dataAction{
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION"},
			},
		},
		{"data action defaults",
			emptyCtx.WithBlockHeight(998).WithBlockTime(time.UnixMicro(1_000_000)),
			&dataAction{Data: []byte("hello")},
			&dataAction{Data: []byte("hello"),
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION", BlockHeight: 998, BlockTime: 1}},
		},
		{"data action override Type",
			emptyCtx.WithBlockHeight(998).WithBlockTime(time.UnixMicro(1_000_000)),
			dataAction{Data: []byte("hello2"),
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION2"}},
			dataAction{Data: []byte("hello2"),
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION2", BlockHeight: 998, BlockTime: 1}},
		},
		{"data action override BlockHeight",
			emptyCtx.WithBlockHeight(998).WithBlockTime(time.UnixMicro(1_000_000)),
			dataAction{Data: []byte("hello2"),
				ActionHeader: &vm.ActionHeader{BlockHeight: 999}},
			dataAction{Data: []byte("hello2"),
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION", BlockHeight: 999, BlockTime: 1}},
		},
		{"data action override BlockTime",
			emptyCtx.WithBlockHeight(998).WithBlockTime(time.UnixMicro(1_000_000)),
			dataAction{Data: []byte("hello2"),
				ActionHeader: &vm.ActionHeader{BlockTime: 2}},
			dataAction{Data: []byte("hello2"),
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION", BlockHeight: 998, BlockTime: 2}},
		},
		{"data action override all defaults",
			emptyCtx.WithBlockHeight(998).WithBlockTime(time.UnixMicro(1_000_000)),
			dataAction{Data: []byte("hello2"),
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION2", BlockHeight: 999, BlockTime: 2}},
			dataAction{Data: []byte("hello2"),
				ActionHeader: &vm.ActionHeader{Type: "DATA_ACTION2", BlockHeight: 999, BlockTime: 2}},
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			toJson := func(in interface{}) string {
				bz, err := json.Marshal(in)
				if err != nil {
					t.Fatal(err)
				}
				return string(bz)
			}
			jsonIn := toJson(tc.in)
			out := vm.PopulateAction(tc.ctx, tc.in)
			jsonIn2 := toJson(tc.in)
			if jsonIn != jsonIn2 {
				t.Errorf("unexpected mutated input: %s to %s", jsonIn, jsonIn2)
			}
			jsonOut := toJson(out)
			jsonExpectedOut := toJson(tc.expectedOut)
			if jsonOut != jsonExpectedOut {
				t.Errorf("expected %s, got %s", jsonExpectedOut, jsonOut)
			}
		})
	}
}
