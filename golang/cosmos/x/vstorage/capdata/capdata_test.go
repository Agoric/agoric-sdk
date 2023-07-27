package capdata

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"testing"
)

func ptr[T any](v T) *T {
	return &v
}

func mustJsonMarshal(val any) string {
	jsonText, err := JsonMarshal(val)
	if err != nil {
		panic(err)
	}
	return string(jsonText)
}

func mustJsonUnmarshal(jsonText string, ptr any) {
	if err := json.Unmarshal([]byte(jsonText), ptr); err != nil {
		panic(err)
	}
}

func prefixBigint(bigint *CapdataBigint) interface{} {
	return fmt.Sprintf("bigint:%s", bigint.Normalized)
}

func remotableToString(r *CapdataRemotable) interface{} {
	iface := ""
	if r.Iface != nil {
		iface = *r.Iface
	}
	return fmt.Sprintf("remotable:%s{%s}", iface, r.Id)
}

func Test_JsonMarshal(t *testing.T) {
	type testCase struct {
		input       string
		expected    string
		errContains *string
	}
	testCases := []testCase{
		{
			input:    "<>&\u2028\u2029",
			expected: `"<>&\u2028\u2029"`,
		},
	}
	for _, desc := range testCases {
		label := fmt.Sprintf("%q", desc.input)
		result, err := JsonMarshal(desc.input)
		if desc.errContains == nil {
			if err != nil {
				t.Errorf("%s: got unexpected error %v", label, err)
			} else if string(result) != desc.expected {
				t.Errorf("%s: wrong result: %#q", label, result)
			}
		} else if err == nil {
			t.Errorf("%s: got no error, want error %q", label, *desc.errContains)
		} else if !strings.Contains(err.Error(), *desc.errContains) {
			t.Errorf("%s: got error %v, want error %q", label, err, *desc.errContains)
		}
	}
}

func Test_DecodeSerializedCapdata(t *testing.T) {
	type testCase struct {
		format          string
		label           string
		body            string
		slots           []interface{}
		expected        string
		errContains     *string
		transformations CapdataValueTransformations
	}
	testCases := []testCase{
		// JSON
		// cf. https://github.com/endojs/endo/blob/209b612e0a267239f33cd607e94ccd179d3ba248/packages/marshal/test/test-marshal-capdata.js#L11
		{body: `[1, 2]`},
		{body: `{ "foo": 1 }`},
		{body: `{}`},
		{body: `{ "a": 1, "b": 2 }`},
		{body: `{ "a": 1, "b": { "c": 3 } }`},
		{body: `true`},
		{body: `1`},
		{body: `"abc"`},
		{body: `null`},

		// transformation of non-JSON values
		{format: "smallcaps", label: "bigint",
			body:            `"+98765432101234567890"`,
			expected:        `"bigint:98765432101234567890"`,
			transformations: CapdataValueTransformations{Bigint: prefixBigint},
		},
		{format: "legacy", label: "bigint",
			body:            `{ "@qclass": "bigint", "digits": "98765432101234567890" }`,
			expected:        `"bigint:98765432101234567890"`,
			transformations: CapdataValueTransformations{Bigint: prefixBigint},
		},
		{format: "smallcaps", label: "remotables",
			body:            `["$0.Foo", "$0"]`,
			slots:           []interface{}{"a"},
			expected:        `["remotable:Foo{a}","remotable:Foo{a}"]`,
			transformations: CapdataValueTransformations{Remotable: remotableToString},
		},
		{format: "legacy", label: "remotables",
			body:            `[{"@qclass":"slot","index":0,"iface":"Foo"}, {"@qclass":"slot","index":0}]`,
			slots:           []interface{}{"a"},
			expected:        `["remotable:Foo{a}","remotable:Foo{a}"]`,
			transformations: CapdataValueTransformations{Remotable: remotableToString},
		},
		{format: "smallcaps", label: "escaped string",
			body:     `"!#escaped"`,
			expected: `"#escaped"`,
		},

		// unimplemented
		{format: "smallcaps",
			body:        `"#undefined"`,
			errContains: ptr("not implemented"),
		},
		{format: "legacy", label: "undefined",
			body:        `{"@qclass":"undefined"}`,
			errContains: ptr("not implemented"),
		},
		{format: "smallcaps",
			body:        `"#NaN"`,
			errContains: ptr("not implemented"),
		},
		{format: "legacy", label: "NaN",
			body:        `{"@qclass":"NaN"}`,
			errContains: ptr("not implemented"),
		},
		{format: "smallcaps",
			body:        `"#Infinity"`,
			errContains: ptr("not implemented"),
		},
		{format: "legacy", label: "Infinity",
			body:        `{"@qclass":"Infinity"}`,
			errContains: ptr("not implemented"),
		},
		{format: "smallcaps",
			body:        `"#-Infinity"`,
			errContains: ptr("not implemented"),
		},
		{format: "legacy", label: "-Infinity",
			body:        `{"@qclass":"-Infinity"}`,
			errContains: ptr("not implemented"),
		},
		{format: "smallcaps", label: "symbol",
			body:        `"%foo"`,
			errContains: ptr("not implemented"),
		},
		{format: "legacy", label: "symbol",
			body:        `{"@qclass":"symbol"}`,
			errContains: ptr("not implemented"),
		},
		{format: "smallcaps", label: "tagged",
			body:        `{"#tag":"foo","payload":"bar"}`,
			errContains: ptr("not implemented: #tag"),
		},
		{format: "legacy", label: "tagged",
			body:        `{"@qclass":"tagged","tag":"foo","payload":"bar"}`,
			errContains: ptr("not implemented"),
		},
		{format: "smallcaps", label: "error",
			body:        `{"#error":"","name":"Error"}`,
			errContains: ptr("not implemented: #error"),
		},
		{format: "legacy", label: "error",
			body:        `{"@qclass":"error","message":"foo","name":"bar"}`,
			errContains: ptr("not implemented"),
		},
		{format: "smallcaps", label: "promise",
			body:        `"&0"`,
			slots:       []interface{}{"a"},
			errContains: ptr("not implemented"),
		},
		{format: "legacy", label: "error",
			body:        `{"@qclass":"hilbert","original":"foo"}`,
			errContains: ptr("not implemented"),
		},

		// missing transformations
		{format: "smallcaps", label: "untransformed bigint",
			body:        `"+98765432101234567890"`,
			errContains: ptr("untransformed bigint"),
		},
		{format: "legacy", label: "untransformed bigint",
			body:        `{ "@qclass": "bigint", "digits": "98765432101234567890" }`,
			errContains: ptr("untransformed bigint"),
		},
		{format: "smallcaps", label: "untransformed remotable",
			body:        `["$0.Foo", "$0"]`,
			slots:       []interface{}{"a"},
			errContains: ptr("untransformed remotable"),
		},
		{format: "legacy", label: "untransformed remotable",
			body:        `[{"@qclass":"slot","index":0,"iface":"Foo"}, {"@qclass":"slot","index":0}]`,
			slots:       []interface{}{"a"},
			errContains: ptr("untransformed remotable"),
		},

		// invalid data
		{format: "smallcaps", label: "iface mismatch",
			body:        `["$0.Foo", "$0."]`,
			slots:       []interface{}{"a"},
			errContains: ptr("iface mismatch"),
		},
		{format: "legacy", label: "iface mismatch",
			body:        `[{"@qclass":"slot","index":0,"iface":"Foo"}, {"@qclass":"slot","index":0,"iface":""}]`,
			slots:       []interface{}{"a"},
			errContains: ptr("iface mismatch"),
		},
		{format: "smallcaps", label: "invalid slot index (out of bounds)",
			body:        `"$0.Foo"`,
			errContains: ptr("invalid slot index"),
		},
		{format: "legacy", label: "invalid slot index (out of bounds)",
			body:        `{"@qclass":"slot","index":0}`,
			errContains: ptr("invalid slot index"),
		},
		{format: "smallcaps", label: "invalid slot index (bad format)",
			body:        `"$x.Foo"`,
			slots:       []interface{}{"a"},
			errContains: ptr("invalid slot index"),
		},
		{format: "legacy", label: "invalid slot index (missing)",
			body:        `{"@qclass":"slot"}`,
			slots:       []interface{}{"a"},
			errContains: ptr("invalid slot index"),
		},
		{format: "legacy", label: "invalid slot index (null)",
			body:        `{"@qclass":"slot","index":null}`,
			slots:       []interface{}{"a"},
			errContains: ptr("invalid slot index"),
		},
		{format: "legacy", label: "invalid slot index (string)",
			body:        `{"@qclass":"slot","index":"0"}`,
			slots:       []interface{}{"a"},
			errContains: ptr("invalid slot index"),
		},
		{format: "legacy", label: "invalid slot index (non-integer)",
			body:        `{"@qclass":"slot","index":0.1}`,
			slots:       []interface{}{"a"},
			errContains: ptr("invalid slot index"),
		},
		{format: "legacy", label: "invalid slot index (negative)",
			body:        `{"@qclass":"slot","index":-1}`,
			slots:       []interface{}{"a"},
			errContains: ptr("invalid slot index"),
		},
		{format: "legacy", label: "invalid slot iface (number)",
			body:        `{"@qclass":"slot","index":0,"iface":0}`,
			slots:       []interface{}{"a"},
			errContains: ptr("invalid slot iface"),
		},
		{format: "smallcaps", label: "unrecognized record type",
			body:        `{"#foo":0}`,
			errContains: ptr("unrecognized record type"),
		},
		{format: "legacy", label: "invalid @qclass (null)",
			body:        `{"@qclass":null}`,
			errContains: ptr("invalid @qclass"),
		},
		{format: "legacy", label: "invalid @qclass (number)",
			body:        `{"@qclass":1}`,
			errContains: ptr("invalid @qclass"),
		},
		{format: "legacy", label: "invalid @qclass (number)",
			body:        `{"@qclass":1}`,
			errContains: ptr("invalid @qclass"),
		},
		{format: "legacy", label: "unrecognized @qclass",
			body:        `{"@qclass":"foo"}`,
			errContains: ptr("unrecognized @qclass"),
		},
		{format: "smallcaps", label: "invalid copyRecord key",
			body:        `{"+0":0}`,
			errContains: ptr("invalid copyRecord key"),
		},
		{format: "smallcaps", label: "invalid bigint (`--`)",
			body:        `"--"`,
			errContains: ptr("invalid bigint"),
		},
		{format: "smallcaps", label: "invalid bigint (`+0x`)",
			body:        `"+0x"`,
			errContains: ptr("invalid bigint"),
		},
		{format: "legacy", label: "invalid bigint (no digits)",
			body:        `{"@qclass":"bigint"}`,
			errContains: ptr("invalid bigint"),
		},
		{format: "legacy", label: "invalid bigint (null digits)",
			body:        `{"@qclass":"bigint","digits":null}`,
			errContains: ptr("invalid bigint"),
		},
		{format: "legacy", label: "invalid bigint (`7up`)",
			body:        `{"@qclass":"bigint","digits":"7up"}`,
			errContains: ptr("invalid bigint"),
		},
	}

	for _, desc := range testCases {
		slots := desc.slots
		if slots == nil {
			slots = []interface{}{}
		}
		var expected interface{}
		if desc.expected != "" {
			mustJsonUnmarshal(desc.expected, &expected)
		} else {
			mustJsonUnmarshal(desc.body, &expected)
		}
		for _, format := range []string{"smallcaps", "legacy"} {
			if desc.format != "" && desc.format != format {
				continue
			}
			label := fmt.Sprintf("%s %s", format, desc.label)
			if desc.label == "" {
				label = fmt.Sprintf("%s %s", format, desc.body)
			}
			capdata := Capdata{desc.body, slots}
			if format == "smallcaps" {
				capdata.Body = "#" + capdata.Body
			}
			intermediate, err := DecodeSerializedCapdata(mustJsonMarshal(capdata), desc.transformations)
			// Replace each Remotable with its representation before comparing.
			var got interface{}
			mustJsonUnmarshal(mustJsonMarshal(intermediate), &got)
			if desc.errContains == nil {
				if err != nil {
					t.Errorf("%s: got unexpected error %v", label, err)
				} else if !reflect.DeepEqual(got, expected) {
					result, err := JsonMarshal(got)
					if err != nil {
						panic(fmt.Errorf("%s: %v", label, err))
					}
					t.Errorf("%s: wrong result: %s", label, result)
				}
			} else if err == nil {
				t.Errorf("%s: got no error, want error %q", label, *desc.errContains)
			} else if !strings.Contains(err.Error(), *desc.errContains) {
				t.Errorf("%s: got error %v, want error %q", label, err, *desc.errContains)
			}
		}
	}
}
