package types

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func checkEntry(t *testing.T, label string, entry KVEntry, isValidKey bool, expectedKey string, hasValue bool, expectedValue string) {
	gotValidKey := entry.IsValidKey()
	if gotValidKey != isValidKey {
		t.Errorf("%s: valid key is %v, expected %v", label, gotValidKey, isValidKey)
	}

	gotKey := entry.Key()
	if gotKey != expectedKey {
		t.Errorf("%s: got %q, want %q", label, gotKey, expectedKey)
	}

	if entry.HasValue() {
		if !hasValue {
			t.Errorf("%s: expected has no value", label)
		}

		gotValue := *entry.Value()
		if gotValue != expectedValue {
			t.Errorf("%s: got %q, want %q", label, gotValue, expectedValue)
		}
	} else {
		if hasValue {
			t.Errorf("%s: expected has value", label)
		}

		gotValuePointer := entry.Value()
		if gotValuePointer != nil {
			t.Errorf("%s: got %#v, want nil", label, gotValuePointer)
		}
	}

	gotValue := entry.StringValue()
	if gotValue != expectedValue {
		t.Errorf("%s: got %q, want %q", label, gotValue, expectedValue)
	}
}

func TestKVEntry(t *testing.T) {
	type testCase struct {
		label         string
		entry         KVEntry
		isValidKey    bool
		expectedKey   string
		hasValue      bool
		expectedValue string
	}
	cases := []testCase{
		{label: "normal", entry: NewKVEntry("foo", "bar"), isValidKey: true, expectedKey: "foo", hasValue: true, expectedValue: "bar"},
		{label: "empty string value", entry: NewKVEntry("foo", ""), isValidKey: true, expectedKey: "foo", hasValue: true, expectedValue: ""},
		{label: "no value", entry: NewKVEntryWithNoValue("foo"), isValidKey: true, expectedKey: "foo", hasValue: false, expectedValue: ""},
		{label: "empty key", entry: NewKVEntryWithNoValue(""), isValidKey: false, expectedKey: "", hasValue: false, expectedValue: ""},
	}
	for _, desc := range cases {
		checkEntry(t, desc.label, desc.entry, desc.isValidKey, desc.expectedKey, desc.hasValue, desc.expectedValue)
	}
}

func TestKVEntryMarshall(t *testing.T) {
	type testCase struct {
		label            string
		entry            KVEntry
		expectedError    error
		expectedEncoding string
	}
	cases := []testCase{
		{label: "normal", entry: NewKVEntry("foo", "bar"), expectedEncoding: `["foo","bar"]`},
		{label: "empty string value", entry: NewKVEntry("foo", ""), expectedEncoding: `["foo",""]`},
		{label: "no value", entry: NewKVEntryWithNoValue("foo"), expectedEncoding: `["foo"]`},
		{label: "empty key", entry: NewKVEntryWithNoValue(""), expectedError: errors.New("cannot marshal invalid KVEntry")},
	}
	for _, desc := range cases {
		marshalled, err := json.Marshal(desc.entry)
		if desc.expectedError != nil && err == nil {
			t.Errorf("%s: got nil error, expected marshal error: %q", desc.label, desc.expectedError.Error())
		} else if err != nil {
			if desc.expectedError == nil {
				t.Errorf("%s: got error %v, expected no error", desc.label, err)
			} else if !strings.Contains(err.Error(), desc.expectedError.Error()) {
				t.Errorf("%s: got error %q, expected error %q", desc.label, err.Error(), desc.expectedError.Error())
			}
			continue
		}
		if string(marshalled) != desc.expectedEncoding {
			t.Errorf("%s: got %q, want %q", desc.label, string(marshalled), desc.expectedEncoding)
		}
	}
}

func TestKVEntryUnmarshall(t *testing.T) {
	type testCase struct {
		label         string
		encoded       string
		expectedError error
		expectedKey   string
		hasValue      bool
		expectedValue string
	}
	cases := []testCase{
		{label: "normal", encoded: `["foo","bar"]`, expectedKey: "foo", hasValue: true, expectedValue: "bar"},
		{label: "empty string value", encoded: `["foo",""]`, expectedKey: "foo", hasValue: true, expectedValue: ""},
		{label: "no value", encoded: `["foo"]`, expectedKey: "foo", hasValue: false, expectedValue: ""},
		{label: "null value", encoded: `["foo",null]`, expectedKey: "foo", hasValue: false, expectedValue: ""},
		{label: "null", encoded: `null`, expectedError: errors.New("KVEntry cannot be null")},
		{label: "string", encoded: `"foo"`, expectedError: errors.New("json")},
		{label: "empty array", encoded: `[]`, expectedError: errors.New("KVEntry must be an array of length 1 or 2 (not 0)")},
		{label: "[null, null] array", encoded: `[null,null]`, expectedError: errors.New("KVEntry key must be a non-empty string")},
		{label: "invalid key array", encoded: `[42]`, expectedError: errors.New("json")},
		{label: "empty key", encoded: `["",null]`, expectedError: errors.New("KVEntry key must be a non-empty string")},
		{label: "too many entries array", encoded: `["foo","bar",null]`, expectedError: errors.New("KVEntry must be an array of length 1 or 2 (not 3)")},
		{label: "invalid value array", encoded: `["foo",42]`, expectedError: errors.New("json")},
	}
	for _, desc := range cases {
		unmarshalled := NewKVEntry("untouched", "untouched")
		err := json.Unmarshal([]byte(desc.encoded), &unmarshalled)
		if desc.expectedError != nil && err == nil {
			t.Errorf("%s: got nil error, expected unmarshal error: %q", desc.label, desc.expectedError.Error())
		} else if err != nil {
			if unmarshalled.Key() != "untouched" {
				t.Errorf("%s: expected error to not modify target key, got %s", desc.label, unmarshalled.Key())
			}
			if unmarshalled.StringValue() != "untouched" {
				t.Errorf("%s: expected error to not modify target value, got %v", desc.label, unmarshalled.Value())
			}
			if desc.expectedError == nil {
				t.Errorf("%s: got error %v, expected no error", desc.label, err)
			} else if !strings.Contains(err.Error(), desc.expectedError.Error()) {
				t.Errorf("%s: got error %q, expected error %q", desc.label, err.Error(), desc.expectedError.Error())
			}
			continue
		}

		checkEntry(t, desc.label, unmarshalled, true, desc.expectedKey, desc.hasValue, desc.expectedValue)
	}
}
