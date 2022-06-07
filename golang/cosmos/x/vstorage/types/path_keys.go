package types

import (
	"bytes"
	"fmt"
	"regexp"
	"strings"
)

// - A "path" is a sequence of zero or more dot-separated nonempty strings of
// 7-bit non-nul, non-dot ASCII characters. So `""`, `"foo"`, and
// `"foo.bar.baz"` are paths but `"."`, "foo.", and "fo\0o" are not.
//
// - An encoded key for a path is the path prefixed with its length (in ASCII
// digits), separated by nul, followed by the path with dots replaced with nul.
// So the path key for the empty path is `0\0`.
//
// - Store entries contain `\0`-prefixed data, (just `\0` if data is
// empty).
//
// - Store entries exist if and only if self or some descendant has a
// non-empty data entry.
var (
	EncodedKeySeparator = []byte{0}
	PathSeparator       = "."
	EncodedDataPrefix   = []byte{0}
)

// EncodedKeyToPath converts a byte slice key to a string path
func EncodedKeyToPath(key []byte) string {
	// Split the key into its path depth and path components.
	split := bytes.SplitN(key, EncodedKeySeparator, 2)
	encodedPath := split[1]
	pathBytes := bytes.ReplaceAll(encodedPath, EncodedKeySeparator, []byte(PathSeparator))
	return string(pathBytes)
}

var pathPattern = regexp.MustCompile(`[-a-zA-Z0-9_` + PathSeparator + `]*`)

func ValidatePath(path string) error {
	if !pathPattern.MatchString(path) {
		return fmt.Errorf("path %q contains invalid characters", path)
	}
	if strings.Contains(path, PathSeparator+PathSeparator) {
		return fmt.Errorf("path %q contains doubled separators", path)
	}
	if strings.HasPrefix(path, PathSeparator) {
		return fmt.Errorf("path %q starts with separator", path)
	}
	if strings.HasSuffix(path, PathSeparator) {
		return fmt.Errorf("path %q ends with separator", path)
	}
	return nil
}

// PathToEncodedKey converts a path to a byte slice key
func PathToEncodedKey(path string) []byte {
	if err := ValidatePath(path); err != nil {
		panic(err)
	}
	depth := strings.Count(path, PathSeparator)
	encodedPath := PathSeparator + path
	if len(path) > 0 {
		// Increment so that only the empty path is at depth 0.
		depth += 1
	}
	encoded := []byte(fmt.Sprintf("%d%s", depth, encodedPath))
	return bytes.ReplaceAll(encoded, []byte(PathSeparator), EncodedKeySeparator)
}

// PathToChildrenPrefix converts a path to a prefix for its children
func PathToChildrenPrefix(path string) []byte {
	if err := ValidatePath(path); err != nil {
		panic(err)
	}
	encodedPrefix := PathSeparator + path
	if len(path) > 0 {
		// Append so that only the empty prefix has no trailing separator.
		encodedPrefix += PathSeparator
	}
	depth := strings.Count(encodedPrefix, PathSeparator)
	encoded := []byte(fmt.Sprintf("%d%s", depth, encodedPrefix))
	return bytes.ReplaceAll(encoded, []byte(PathSeparator), EncodedKeySeparator)
}
