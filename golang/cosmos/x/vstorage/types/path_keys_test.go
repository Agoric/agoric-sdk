package types

import (
	"bytes"
	"fmt"
	"strings"
	"testing"
)

func Test_Key_Encoding(t *testing.T) {
	tests := []struct {
		name        string
		childStr    string
		key         []byte
		errContains string
	}{
		{
			name:     "empty path",
			childStr: "",
			key:      []byte("0\x00"),
		},
		{
			name:     "single-segment path",
			childStr: "some",
			key:      []byte("1\x00some"),
		},
		{
			name:     "multi-segment path",
			childStr: "some.child.grandchild",
			key:      []byte("3\x00some\x00child\x00grandchild"),
		},
		{
			name:     "non-letters",
			childStr: "-_0_-",
			key:      []byte("1\x00-_0_-"),
		},
		{
			name:        "lone dot",
			childStr:    ".",
			errContains: "starts with separator",
		},
		{
			name:        "starts with dot",
			childStr:    ".foo",
			errContains: "starts with separator",
		},
		{
			name:        "ends with dot",
			childStr:    "foo.",
			errContains: "ends with separator",
		},
		{
			name:        "empty path segment",
			childStr:    "foo..bar",
			errContains: "doubled separators",
		},
		{
			name:        "invalid path character U+0000 NUL",
			childStr:    "foo\x00bar",
			errContains: "invalid character",
		},
		{
			name:        "invalid path character U+002F SOLIDUS",
			childStr:    "foo/bar",
			errContains: "invalid character",
		},
		{
			name:        "invalid path character U+005C REVERSE SOLIDUS",
			childStr:    "foo\\bar",
			errContains: "invalid character",
		},
		{
			name:        "invalid path character U+007C VERTICAL LINE",
			childStr:    "foo|bar",
			errContains: "invalid character",
		},
	}

	for _, tt := range tests {
		if tt.key != nil {
			t.Run(tt.name, func(t *testing.T) {
				if key := PathToEncodedKey(tt.childStr); !bytes.Equal(key, tt.key) {
					t.Errorf("pathToKey(%q) = %v, want %v", tt.childStr, key, tt.key)
				}
				if childStr := EncodedKeyToPath(tt.key); childStr != tt.childStr {
					t.Errorf("keyToString(%v) = %q, want %q", tt.key, childStr, tt.childStr)
				}
			})
			continue
		}
		expect := tt.errContains
		t.Run(tt.name, func(t *testing.T) {
			var key []byte
			defer func() {
				if err := recover(); err != nil {
					errStr := fmt.Sprintf("%v", err)
					if !strings.Contains(errStr, expect) {
						t.Errorf("pathToKey(%q) = error %q, want error %v", tt.childStr, errStr, expect)
					}
				} else {
					t.Errorf("pathToKey(%q) = []byte(%q), want error %v", tt.childStr, key, expect)
				}
			}()
			key = PathToEncodedKey(tt.childStr)
		})
	}
}
