package types

import (
	"bytes"
	"fmt"
	"strings"
)

// - A "path" is a sequence of zero or more dot-separated nonempty strings of
// 7-bit non-nul, non-dot ASCII characters. So `""`, `"foo"`, and
// `"foo.bar.baz"` are paths but `"."`, "foo.", and "fo\0o" are not.
//
// - A storage key for a path is the path prefixed with `:`.
//
// - A path key for a path is the path prefixed with its length (in ASCII
// digits), separated by nul, followed by the path with dots replaced with nul.
// So the path key for the empty path is `0\0`.
//
// - Path store entries have just a placeholder value. Path store entries exist
// if and only if self or some descendant have a non-empty data entry.
var (
	KeySeparator  = []byte{0}
	PathSeparator = "."
	dataKeyPrefix = ":"
	DataPrefix    = []byte{0}
)

// KeyToPath converts a byte slice key to a string path
func KeyToPath(key []byte) string {
	// Split the key into its path depth and path components.
	split := bytes.SplitN(key, KeySeparator, 2)
	encodedPath := split[1]
	pathBytes := bytes.ReplaceAll(encodedPath, KeySeparator, []byte(PathSeparator))
	return string(pathBytes)
}

// PathToDataKey returns the key for a data element at a given path
func PathToDataKey(path string) []byte {
	return append([]byte(dataKeyPrefix), []byte(path)...)
}

// PathToEncodedKey converts a path to a byte slice key
func PathToEncodedKey(path string) []byte {
	depth := strings.Count(path, PathSeparator)
	encodedPath := PathSeparator + path
	if len(path) > 0 {
		// Increment so that only the empty path is at depth 0.
		depth += 1
	}
	encoded := []byte(fmt.Sprintf("%d%s", depth, encodedPath))
	if bytes.Contains(encoded, KeySeparator) {
		panic(fmt.Errorf("pathToKey: encoded %q contains key separator %q", encoded, KeySeparator))
	}
	return bytes.ReplaceAll(encoded, []byte(PathSeparator), KeySeparator)
}

// PathToChildrenPrefix converts a path to a prefix for its children
func PathToChildrenPrefix(path string) []byte {
	encodedPrefix := PathSeparator + path
	if len(path) > 0 {
		// Append so that only the empty prefix has no trailing separator.
		encodedPrefix += PathSeparator
	}
	depth := strings.Count(encodedPrefix, PathSeparator)
	encoded := []byte(fmt.Sprintf("%d%s", depth, encodedPrefix))
	if bytes.Contains(encoded, KeySeparator) {
		panic(fmt.Errorf("pathToChildrenPrefix: encoded %q contains key separator %q", encoded, KeySeparator))
	}
	return bytes.ReplaceAll(encoded, []byte(PathSeparator), KeySeparator)
}
