package main

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/tendermint/tendermint/libs/log"
)

// NewVMCommand creates a new OS command to run the Agoric VM.  It sets up the
// file descriptors for the VM to communicate with agd, and passes the
// `--vm-spec <spec>` arguments to the VM.
func NewVMCommand(logger log.Logger, binary string, args []string, vmFromAgd, vmToAgd *os.File) *exec.Cmd {
	// We start our file descriptor allocations after the standard ones, including
	// Node.js IPC (fd=3).
	fdStart := 4
	agvmSpec := fmt.Sprintf(`{"agd":{"fd":[%d,%d]}}`, fdStart, fdStart+1)
	args = append(args[1:], "--vm-spec", agvmSpec)

	logger.Info("Start chain connecting to VM", "binary", binary, "args", args)
	cmd := exec.Command(binary, args...)

	// Manage the file descriptors.
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	numStdFiles := 3 // stdin, stdout, stderr
	// ExtraFiles begins at fd numStdFiles, so we need to compute the array.
	cmd.ExtraFiles = make([]*os.File, fdStart - numStdFiles + 2)
	cmd.ExtraFiles[fdStart - numStdFiles] = vmFromAgd
	cmd.ExtraFiles[fdStart+1 - numStdFiles] = vmToAgd

	return cmd
}
