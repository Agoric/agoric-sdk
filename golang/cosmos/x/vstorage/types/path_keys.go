package types

import (
	"bytes"
	"fmt"
	"strings"
)

// For space efficiency, path keys are structured as:
// `${numberOfPathElements}\0${zeroSeparatedPath}`, such as `0\0` for the root
// element, and `1\0foo` for `foo`, and `3\0foo\0bar\0baz` for `foo.bar.baz`.
//
// Thus, we can scan for all of `foo.bar`'s children by iterating over the
// prefix
//    `3\0foo\0bar\0`
//
// We still need to iterate up the tree until we are sure the correct ancestor
// nodes are present or absent, but we don't need to fetch all an ancestor's
// keys to do so.
var (
	MetaKeySeparator = []byte{0}
	PathSeparator    = "."
	dataKeyPrefix    = ":"
	MetaDataPrefix   = []byte{1}
)

// KeyToPath converts a string key to a byte slice path
func KeyToPath(key []byte) string {
	// Split the key into its path depth and path components.
	split := bytes.SplitN(key, MetaKeySeparator, 2)
	encodedPath := split[1]
	pathBytes := bytes.ReplaceAll(encodedPath, MetaKeySeparator, []byte(PathSeparator))
	return string(pathBytes)
}

// PathToDataKey returns the key for a data element at a given path
func PathToDataKey(path string) []byte {
	return append([]byte(dataKeyPrefix), []byte(path)...)
}

// PathToMetaKey converts a path to a byte slice key
func PathToMetaKey(path string) []byte {
	depth := strings.Count(path, PathSeparator)
	encodedPath := PathSeparator + path
	if len(path) > 0 {
		// Increment so that only the empty path is at depth 0.
		depth += 1
	}
	encoded := []byte(fmt.Sprintf("%d%s", depth, encodedPath))
	if bytes.Contains(encoded, MetaKeySeparator) {
		panic(fmt.Errorf("pathToKey: encoded %q contains key separator %q", encoded, MetaKeySeparator))
	}
	return bytes.ReplaceAll(encoded, []byte(PathSeparator), MetaKeySeparator)
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
	if bytes.Contains(encoded, MetaKeySeparator) {
		panic(fmt.Errorf("pathToChildrenPrefix: encoded %q contains key separator %q", encoded, MetaKeySeparator))
	}
	return bytes.ReplaceAll(encoded, []byte(PathSeparator), MetaKeySeparator)
}
