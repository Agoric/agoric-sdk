package main_test

import (
	"fmt"
	"strings"
	"testing"

	sdkioerrors "cosmossdk.io/errors"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

func TestErrorStackTraces(t *testing.T) {
	err := sdkioerrors.Wrapf(sdkerrors.ErrInsufficientFee, "my error %d", 123)
	expected := "my error 123: insufficient fee"

	// Check that sdkerrors.Wrapf(...).Error() does not leak stack.
	got := err.Error()
	if got != expected {
		t.Fatalf("err.Error() %q should be %q", got, expected)
	}

	// Check that fmt.Errorf("... %s").Error() does not leak stack.
	expected = "fail: " + expected
	stringified := fmt.Errorf("fail: %s", err)
	got = stringified.Error()
	if got != expected {
		t.Fatalf("stringified.Error() %q should be %q", got, expected)
	}

	// Check that fmt.Errorf("... %w").Error() leaks stack.
	wrapped := fmt.Errorf("fail: %w", err)
	got = wrapped.Error()
	expectedAndStack := expected + " ["
	if !strings.HasPrefix(got, expectedAndStack) {
		t.Fatalf("wrapped.Error() %q should start with %q", got, expectedAndStack)
	}
}
