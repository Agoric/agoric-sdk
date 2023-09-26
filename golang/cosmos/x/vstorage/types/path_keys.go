package types

import (
	"bytes"
	"fmt"
	"regexp"
	"strings"
)

// - A "path" is a sequence of zero or more dot-separated nonempty segments
// using a restricted alphabet of ASCII alphanumerics plus underscore and dash,
// consistent with packages/internal/src/lib-chainStorage.js but not currently
// enforcing a length restriction on path segments.
// So `""`, `"foo"`, and `"foo.bar__baz.qux--quux"` are paths but `"."`,
// `"foo/bar"`, `"fo\to"`, and `"foö"` are not.
// This alphabet might be expanded in the future, but such expansion SHOULD NOT
// include control characters (including those that are not ASCII, such as
// U+202E RIGHT-TO-LEFT OVERRIDE), slash `/` (which separates ABCI request path
// segments in e.g. `custom/vstorage/data/foo`), or backslash `\` (which should
// be reserved for adding escape sequences).
//
// - An encoded key for a path is the path prefixed with its length (in ASCII
// digits), separated by nul, followed by the path with dots replaced with nul.
// So the path key for the empty path is `0\0`.
//
// - Store entries exist if and only if self or some descendant has an entry
// with data.
//
// - Store entries with data contain `\0`-prefixed data, (just `\0` if data is
// empty).
//
// - Placeholder store entries contain a single `\255` byte. These are used to
// indicate that the entry does not have any data (which is different from
// empty data). Placeholder entries are used when a descendant with data exists,
// similar to empty non-terminals in the DNS
// (cf. https://www.rfc-editor.org/rfc/rfc8499.html#section-7 ).
var (
	EncodedKeySeparator = []byte{0}
	PathSeparator       = "."
	EncodedDataPrefix   = []byte{0}
	EncodedNoDataValue  = []byte{255}
)

// EncodedKeyToPath converts a byte slice key to a string path
func EncodedKeyToPath(key []byte) string {
	// Split the key into its path depth and path components.
	split := bytes.SplitN(key, EncodedKeySeparator, 2)
	encodedPath := split[1]
	pathBytes := bytes.ReplaceAll(encodedPath, EncodedKeySeparator, []byte(PathSeparator))
	return string(pathBytes)
}

var pathSegmentPattern = `[a-zA-Z0-9_-]+`
var pathSeparatorPattern = `\` + PathSeparator
var pathPattern = fmt.Sprintf(`^$|^%[1]s(%[2]s%[1]s)*$`, pathSegmentPattern, pathSeparatorPattern)
var pathMatcher = regexp.MustCompile(pathPattern)

func ValidatePath(path string) error {
	if pathMatcher.MatchString(path) {
		return nil
	}
	// Rescan the string to give a useful error message.
	if strings.HasPrefix(path, PathSeparator) {
		return fmt.Errorf("path %q starts with separator", path)
	}
	if strings.HasSuffix(path, PathSeparator) {
		return fmt.Errorf("path %q ends with separator", path)
	}
	if strings.Contains(path, PathSeparator+PathSeparator) {
		return fmt.Errorf("path %q contains doubled separators", path)
	}
	return fmt.Errorf("path %q contains invalid characters", path)
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
