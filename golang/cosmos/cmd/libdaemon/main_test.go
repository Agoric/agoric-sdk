package main_test

import (
	"fmt"
	"strings"
	"testing"

	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

func TestErrorStackTraces(t *testing.T) {
	err := sdkerrors.Wrapf(sdkerrors.ErrInsufficientFee, "my error %d", 123)
	expected := "fail: my error 123: insufficient fee"

	// Expected message only (what we want).
	stringified := fmt.Errorf("fail: %s", err)
	got := stringified.Error()
	if got != expected {
		t.Fatalf("stringified.Error() %q should be %q", got, expected)
	}

	// Expected stack frame (though undesirable).
	wrapped := fmt.Errorf("fail: %w", err)
	got = wrapped.Error()
	expectedAndStack := expected + " ["
	if !strings.HasPrefix(got, expectedAndStack) {
		t.Fatalf("wrapped.Error() %q should start with %q", got, expectedAndStack)
	}
}
