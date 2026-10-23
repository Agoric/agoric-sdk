package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"cosmossdk.io/log"
	"github.com/stretchr/testify/require"
)

// Run the real agd entrypoint in a subprocess: embedded mode replaces the
// process with the selected VM, so it cannot be exercised in the test runner.
func TestAgdCommandProcess(t *testing.T) {
	if os.Getenv("AGD_TEST_COMMAND_PROCESS") != "1" {
		return
	}
	separator := slices.Index(os.Args, "--")
	if separator < 0 {
		t.Fatal("missing agd arguments")
	}
	os.Args = append([]string{"agd"}, os.Args[separator+1:]...)
	main()
}

func TestBootstrapStateUsesVMPath(t *testing.T) {
	dir := t.TempDir()
	vmPath := filepath.Join(dir, "embedded")
	argsPath := filepath.Join(dir, "vm-args")
	require.NoError(t, os.WriteFile(vmPath, []byte("#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$AGD_TEST_VM_ARGS\"\n"), 0o700))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, os.Args[0], "-test.run=^TestAgdCommandProcess$", "--",
		"comet", "bootstrap-state", "--home="+filepath.Join(dir, "home"), "--vm-path="+vmPath)
	command.Env = append(os.Environ(),
		"AGD_TEST_COMMAND_PROCESS=1", "AGD_EMBEDDED_VM=", "AGD_TEST_VM_ARGS="+argsPath)
	output, err := command.CombinedOutput()
	require.NoError(t, err, "%s", output)
	args, err := os.ReadFile(argsPath)
	require.NoError(t, err, "the selected VM must have run: %s", output)
	require.Contains(t, string(args), "comet\nbootstrap-state\n")
}

func TestNewVMCommandPreservesArguments(t *testing.T) {
	command := NewVMCommand(log.NewNopLogger(), "/bin/echo", []string{"first argument", "second"}, nil, nil)
	command.Stdout = nil
	output, err := command.Output()
	require.NoError(t, err)
	require.Equal(t, "first argument second\n", string(output))
}

func runAgdProcess(t *testing.T, dir string, env []string, args ...string) ([]byte, error) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	command := exec.CommandContext(ctx, os.Args[0], append([]string{"-test.run=^TestAgdCommandProcess$", "--"}, args...)...)
	command.Dir = dir
	command.Env = append(os.Environ(), "AGD_TEST_COMMAND_PROCESS=1", "AGD_EMBEDDED_VM=")
	command.Env = append(command.Env, env...)
	output, err := command.CombinedOutput()
	require.NoError(t, ctx.Err(), "agd must not hang: %s", output)
	return output, err
}

func TestVMExecutableSelection(t *testing.T) {
	for _, tc := range []struct {
		name  string
		flags []string
		split bool
	}{
		{name: "discovery"},
		{name: "empty path", flags: []string{"--vm-path="}},
		{name: "explicit embedded mode", flags: []string{"--split-vm=false", "--vm-path=embedded"}},
		{name: "relative path", flags: []string{"--vm-path=./default"}},
		{name: "split discovery", flags: []string{"--split-vm"}, split: true},
		{name: "split empty path", flags: []string{"--split-vm=true", "--vm-path="}, split: true},
		{name: "split named program", flags: []string{"--split-vm", "--vm-path=default"}, split: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			argsPath := filepath.Join(dir, "vm-args")
			// The probe records argv then exits. It exercises selection and
			// delegation/spawning, not a complete VM's RPC or shutdown protocol.
			for _, name := range []string{"ag-chain-cosmos", "embedded", "default"} {
				require.NoError(t, os.WriteFile(filepath.Join(dir, name), []byte("#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$AGD_TEST_VM_ARGS\"\n"), 0o700))
			}
			args := append([]string{"comet", "bootstrap-state", "--home=" + filepath.Join(dir, "home")}, tc.flags...)
			output, err := runAgdProcess(t, dir, []string{"PATH=" + dir, "AGD_TEST_VM_ARGS=" + argsPath}, args...)
			if tc.split {
				require.Contains(t, string(output), "agd connecting to VM")
			} else {
				require.NoError(t, err, "%s", output)
				require.Contains(t, string(output), "agd delegating to JS executable")
			}
			recorded, readErr := os.ReadFile(argsPath)
			require.NoError(t, readErr, "selected VM must run: %s", output)
			require.Contains(t, string(recorded), "comet\nbootstrap-state\n")
			for _, flag := range tc.flags {
				require.Contains(t, string(recorded), flag+"\n")
			}
		})
	}
}

func TestVMExecutableValidation(t *testing.T) {
	for _, mode := range []string{"embedded", "split"} {
		for _, kind := range []string{"missing", "directory", "not-executable"} {
			t.Run(kind+"/"+mode, func(t *testing.T) {
				dir := t.TempDir()
				vmPath := filepath.Join(dir, kind)
				switch kind {
				case "directory":
					require.NoError(t, os.Mkdir(vmPath, 0o700))
				case "not-executable":
					require.NoError(t, os.WriteFile(vmPath, []byte("#!/bin/sh\nexit 0\n"), 0o600))
				}
				args := []string{"comet", "bootstrap-state", "--home=" + filepath.Join(dir, "home"), "--vm-path=" + vmPath}
				if mode == "split" {
					args = append(args, "--split-vm")
				}
				output, err := runAgdProcess(t, dir, nil, args...)
				require.Error(t, err)
				require.Contains(t, string(output), "cannot execute Agoric VM")
				require.Contains(t, string(output), vmPath)
			})
		}
	}
}
