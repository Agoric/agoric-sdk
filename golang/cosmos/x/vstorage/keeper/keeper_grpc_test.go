package keeper

import (
	"fmt"
	"reflect"
	"strings"
	"testing"

	grpcCodes "google.golang.org/grpc/codes"
	grpcStatus "google.golang.org/grpc/status"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/capdata"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

func ptr[T any](v T) *T {
	return &v
}

func mustJsonMarshal(val any) string {
	jsonText, err := capdata.JsonMarshal(val)
	if err != nil {
		panic(err)
	}
	return string(jsonText)
}

func mustMarshalStreamCell(blockHeight string, values []string) string {
	cell := map[string]any{
		"blockHeight": blockHeight,
		"values":      values,
	}
	return mustJsonMarshal(cell)
}

func TestCapData(t *testing.T) {
	testKit := makeTestKit()
	ctx, keeper := testKit.ctx, testKit.vstorageKeeper
	querier := Querier{keeper}

	type testCase struct {
		label       string
		data        *string
		request     types.QueryCapDataRequest
		expected    types.QueryCapDataResponse
		errCode     grpcCodes.Code
		errContains *string
	}
	testCases := []testCase{}

	// Test simple cases (various kinds of bad data up to simple flat JSON-compatible CapData).
	decodableSmallcaps := `{"body":"#true","slots":[]}`
	decodableLegacy := `{"body":"true","slots":[]}`
	testCases = append(testCases, []testCase{
		{label: "no data",
			data:        nil,
			request:     types.QueryCapDataRequest{RemotableValueFormat: "string"},
			errCode:     grpcCodes.FailedPrecondition,
			errContains: ptr("no data"),
		},
		{label: "zero-length data",
			data:        ptr(""),
			request:     types.QueryCapDataRequest{RemotableValueFormat: "string"},
			errCode:     grpcCodes.FailedPrecondition,
			errContains: ptr("JSON"),
		},
		{label: "cell with empty string",
			data:        ptr(mustMarshalStreamCell("1", []string{decodableSmallcaps, "", decodableLegacy})),
			request:     types.QueryCapDataRequest{RemotableValueFormat: "string"},
			errCode:     grpcCodes.FailedPrecondition,
			errContains: ptr("JSON"),
		},
		{label: "non-JSON data",
			data:        ptr("foo"),
			request:     types.QueryCapDataRequest{RemotableValueFormat: "string"},
			errCode:     grpcCodes.FailedPrecondition,
			errContains: ptr("invalid"),
		},
		{label: "cell with non-JSON",
			data:        ptr(mustMarshalStreamCell("1", []string{decodableSmallcaps, "foo", decodableLegacy})),
			request:     types.QueryCapDataRequest{RemotableValueFormat: "string"},
			errCode:     grpcCodes.FailedPrecondition,
			errContains: ptr("invalid"),
		},
		{label: "lone non-CapData",
			data:        ptr("{}"),
			request:     types.QueryCapDataRequest{RemotableValueFormat: "string"},
			errCode:     grpcCodes.FailedPrecondition,
			errContains: ptr("invalid CapData"),
		},
		{label: "cell with non-CapData",
			data:        ptr(mustMarshalStreamCell("1", []string{decodableSmallcaps, "{}", decodableLegacy})),
			request:     types.QueryCapDataRequest{RemotableValueFormat: "string"},
			errCode:     grpcCodes.FailedPrecondition,
			errContains: ptr("invalid CapData"),
		},
		{label: "lone smallcaps CapData",
			data:     ptr(decodableSmallcaps),
			request:  types.QueryCapDataRequest{RemotableValueFormat: "string"},
			expected: types.QueryCapDataResponse{Value: `true`},
		},
		{label: "cell with smallcaps CapData",
			data:     ptr(mustMarshalStreamCell("1", []string{decodableSmallcaps})),
			request:  types.QueryCapDataRequest{RemotableValueFormat: "string"},
			expected: types.QueryCapDataResponse{BlockHeight: "1", Value: `true`},
		},
		{label: "lone legacy CapData",
			data:     ptr(decodableLegacy),
			request:  types.QueryCapDataRequest{RemotableValueFormat: "string"},
			expected: types.QueryCapDataResponse{Value: `true`},
		},
		{label: "cell with legacy CapData",
			data:     ptr(mustMarshalStreamCell("1", []string{decodableLegacy})),
			request:  types.QueryCapDataRequest{RemotableValueFormat: "string"},
			expected: types.QueryCapDataResponse{BlockHeight: "1", Value: `true`},
		},
	}...)

	// Test option validation.
	testCases = append(testCases, []testCase{
		{label: "explicit JSON Lines",
			data:     ptr(decodableSmallcaps),
			request:  types.QueryCapDataRequest{MediaType: "JSON Lines", RemotableValueFormat: "string"},
			expected: types.QueryCapDataResponse{Value: `true`},
		},
		{label: "invalid media type",
			data:        ptr(decodableSmallcaps),
			request:     types.QueryCapDataRequest{MediaType: "JSONLines", RemotableValueFormat: "string"},
			errCode:     grpcCodes.InvalidArgument,
			errContains: ptr("media_type"),
		},
		{label: "invalid item format",
			data:        ptr(decodableSmallcaps),
			request:     types.QueryCapDataRequest{ItemFormat: "deep", RemotableValueFormat: "string"},
			errCode:     grpcCodes.InvalidArgument,
			errContains: ptr("item_format"),
		},
		{label: "missing remotable value format",
			data:        ptr(decodableSmallcaps),
			request:     types.QueryCapDataRequest{},
			errCode:     grpcCodes.InvalidArgument,
			errContains: ptr("remotable_value_format"),
		},
		{label: "invalid remotable value format",
			data:        ptr(decodableSmallcaps),
			request:     types.QueryCapDataRequest{RemotableValueFormat: "foo"},
			errCode:     grpcCodes.InvalidArgument,
			errContains: ptr("remotable_value_format"),
		},
	}...)

	// Test formatting options against sufficiently complex CapData,
	// deriving legacy encoding from smallcaps encoding to ensure equivalence
	// and deriving expectations from marshalling to avoid spurious mismatches
	// from Go's unpredictable field ordering (e.g., `{"a":0,"b":1}` vs. `{"b":1,"a":0}`).
	slots := []any{"a"}
	deepSmallcapsBody := `{"arr":[{"bigint":"+42","remotable":"$0.Alleged: Foo brand","ref2":"$0"}]}`
	deepLegacyBody := deepSmallcapsBody
	legacyFromSmallcaps := [][2]string{
		[2]string{`"+42"`, `{"@qclass":"bigint","digits":"42"}`},
		[2]string{`"$0.Alleged: Foo brand"`, `{"@qclass":"slot","index":0,"iface":"Alleged: Foo brand"}`},
		[2]string{`"$0"`, `{"@qclass":"slot","index":0}`},
	}
	for _, pair := range legacyFromSmallcaps {
		deepLegacyBody = strings.Replace(deepLegacyBody, pair[0], pair[1], -1)
	}
	cell := mustMarshalStreamCell("1", []string{
		mustJsonMarshal(map[string]any{"body": "#" + deepSmallcapsBody, "slots": slots}),
		mustJsonMarshal(map[string]any{"body": deepLegacyBody, "slots": slots}),
	})
	mustMarshalTwoLines := func(val any) string {
		line := mustJsonMarshal(val)
		return fmt.Sprintf("%s\n%s", line, line)
	}
	testCases = append(testCases, testCase{label: "remotables as strings",
		data:    ptr(cell),
		request: types.QueryCapDataRequest{RemotableValueFormat: "string"},
		expected: types.QueryCapDataResponse{
			BlockHeight: "1",
			Value: mustMarshalTwoLines(map[string]any{
				"arr": []any{
					map[string]any{
						"bigint":    "42",
						"remotable": "[Alleged: Foo brand <a>]",
						"ref2":      "[Alleged: Foo brand <a>]",
					},
				},
			}),
		},
	})
	testCases = append(testCases, testCase{label: "remotables as strings, flat",
		data:    ptr(cell),
		request: types.QueryCapDataRequest{ItemFormat: "flat", RemotableValueFormat: "string"},
		expected: types.QueryCapDataResponse{
			BlockHeight: "1",
			Value: mustMarshalTwoLines(map[string]any{
				"arr-0-bigint":    "42",
				"arr-0-remotable": "[Alleged: Foo brand <a>]",
				"arr-0-ref2":      "[Alleged: Foo brand <a>]",
			}),
		},
	})
	testCases = append(testCases, testCase{label: "remotables as objects",
		data:    ptr(cell),
		request: types.QueryCapDataRequest{RemotableValueFormat: "object"},
		expected: types.QueryCapDataResponse{
			BlockHeight: "1",
			Value: mustMarshalTwoLines(map[string]any{
				"arr": []any{
					map[string]any{
						"bigint":    "42",
						"remotable": map[string]any{"id": "a", "allegedName": "Foo brand"},
						"ref2":      map[string]any{"id": "a", "allegedName": "Foo brand"},
					},
				},
			}),
		},
	})
	testCases = append(testCases, testCase{label: "remotables as objects, flat",
		data:    ptr(cell),
		request: types.QueryCapDataRequest{ItemFormat: "flat", RemotableValueFormat: "object"},
		expected: types.QueryCapDataResponse{
			BlockHeight: "1",
			Value: mustMarshalTwoLines(map[string]any{
				"arr-0-bigint":                "42",
				"arr-0-remotable-id":          "a",
				"arr-0-remotable-allegedName": "Foo brand",
				"arr-0-ref2-id":               "a",
				"arr-0-ref2-allegedName":      "Foo brand",
			}),
		},
	})

	// Test errors from CapData that includes unsupported values.
	expectNotImplemented := func(label, capdataBody string, slots []any) testCase {
		if slots == nil {
			slots = []any{}
		}
		serialized := mustJsonMarshal(map[string]any{
			"body":  capdataBody,
			"slots": slots,
		})
		return testCase{
			label:       label,
			data:        ptr(serialized),
			request:     types.QueryCapDataRequest{RemotableValueFormat: "string"},
			errCode:     grpcCodes.FailedPrecondition,
			errContains: ptr("not implemented"),
		}
	}
	testCases = append(testCases, []testCase{
		expectNotImplemented("smallcaps undefined", `#"#undefined"`, nil),
		expectNotImplemented("smallcaps NaN", `#"#NaN"`, nil),
		expectNotImplemented("smallcaps infinity", `#"#Infinity"`, nil),
		expectNotImplemented("smallcaps negative infinity", `#"#-Infinity"`, nil),
		expectNotImplemented("smallcaps symbol", `#"%foo"`, nil),
		expectNotImplemented("smallcaps promise", `#"&0"`, []any{"a"}),
		expectNotImplemented("smallcaps tagged", `#{"#tag":"copySet","payload":[]}`, nil),
		expectNotImplemented("smallcaps error", `#{"#error":"foo","name":"Error"}`, nil),
		expectNotImplemented("legacy undefined", `{"@qclass":"undefined"}`, nil),
		expectNotImplemented("legacy NaN", `{"@qclass":"NaN"}`, nil),
		expectNotImplemented("legacy infinity", `{"@qclass":"Infinity"}`, nil),
		expectNotImplemented("legacy negative infinity", `{"@qclass":"-Infinity"}`, nil),
		expectNotImplemented("legacy symbol", `{"@qclass":"symbol","name":"foo"}`, nil),
		expectNotImplemented("smallcaps tagged", `{"@qclass":"tagged","tag":"copySet","payload":[]}`, nil),
		expectNotImplemented("smallcaps error", `{"@qclass":"error","message":"foo","name":"Error"}`, nil),
		expectNotImplemented("smallcaps Hilbert Hotel", `{"@qclass":"hilbert","original":"foo"}`, nil),
	}...)
	for _, desc := range testCases {
		desc.request.Path = "key"
		if desc.data == nil {
			keeper.SetStorage(ctx, agoric.NewKVEntryWithNoValue(desc.request.Path))
		} else {
			keeper.SetStorage(ctx, agoric.NewKVEntry(desc.request.Path, *desc.data))
		}
		resp, err := querier.CapData(sdk.WrapSDKContext(ctx), &desc.request)
		if desc.errCode == grpcCodes.OK {
			if err != nil {
				t.Errorf("%s: got unexpected error %v", desc.label, err)
			} else if reflect.DeepEqual(resp, &desc.expected) {
				continue
			}
			if resp.Value != desc.expected.Value {
				lines := strings.Split(resp.Value, "\n")
				t.Errorf("%s: wrong result value lines: %#q", desc.label, lines)
			} else {
				t.Errorf("%s: wrong result: %#v", desc.label, resp)
			}
		} else if err == nil {
			t.Errorf("%s: got no error, want error %q", desc.label, *desc.errContains)
		} else if code := grpcStatus.Code(err); code != desc.errCode {
			t.Errorf("%s: got error code %q, want %q", desc.label, code, desc.errCode)
		} else if desc.errContains != nil && !strings.Contains(err.Error(), *desc.errContains) {
			t.Errorf("%s: got error %v, want error %q", desc.label, err, *desc.errContains)
		}
	}
}
