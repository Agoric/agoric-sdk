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
		path        string
		key         []byte
		errContains string
	}{
		{
			name: "empty path",
			path: "",
			key:  []byte("0\x00"),
		},
		{
			name: "single-segment path",
			path: "some",
			key:  []byte("1\x00some"),
		},
		{
			name: "multi-segment path",
			path: "some.child.grandchild",
			key:  []byte("3\x00some\x00child\x00grandchild"),
		},
		{
			name: "non-letters",
			path: "-_0_-",
			key:  []byte("1\x00-_0_-"),
		},
		{
			name:        "lone dot",
			path:        ".",
			errContains: "starts with separator",
		},
		{
			name:        "starts with dot",
			path:        ".foo",
			errContains: "starts with separator",
		},
		{
			name:        "ends with dot",
			path:        "foo.",
			errContains: "ends with separator",
		},
		{
			name:        "empty path segment",
			path:        "foo..bar",
			errContains: "doubled separators",
		},
		{
			name:        "invalid path character U+0000 NUL",
			path:        "foo\x00bar",
			errContains: "invalid character",
		},
		{
			name:        "invalid path character U+002F SOLIDUS",
			path:        "foo/bar",
			errContains: "invalid character",
		},
		{
			name:        "invalid path character U+005C REVERSE SOLIDUS",
			path:        "foo\\bar",
			errContains: "invalid character",
		},
		{
			name:        "invalid path character U+007C VERTICAL LINE",
			path:        "foo|bar",
			errContains: "invalid character",
		},
	}

	for _, tt := range tests {
		if tt.key != nil {
			t.Run(tt.name, func(t *testing.T) {
				if key := PathToEncodedKey(tt.path); !bytes.Equal(key, tt.key) {
					t.Errorf("pathToKey(%q) = []byte(%q), want []byte(%q)", tt.path, key, tt.key)
				}
				if path := EncodedKeyToPath(tt.key); path != tt.path {
					t.Errorf("keyToPath([]byte(%q)) = %q, want %q", tt.key, path, tt.path)
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
						t.Errorf("pathToKey(%q) = error %q, want error %v", tt.path, errStr, expect)
					}
				} else {
					t.Errorf("pathToKey(%q) = []byte(%q), want error %v", tt.path, key, expect)
				}
			}()
			key = PathToEncodedKey(tt.path)
		})
	}
}
