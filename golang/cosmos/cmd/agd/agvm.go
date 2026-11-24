package main

import (
	"os"
	"os/exec"

	"cosmossdk.io/log"
)

// NewVMCommand creates a new OS command to run the Agoric VM.  It sets up the
// file descriptors for the VM to communicate with agd, and passes their numbers
// via AGVM_INPUT_FD and AGVM_OUTPUT_FD environment variables.
// args contains only the program's arguments, without the executable name.
func NewVMCommand(logger log.Logger, binary string, args []string, vmFromAgd, vmToAgd *os.File) *exec.Cmd {
	logger.Info("agd connecting to VM", "binary", binary, "args", args)
	cmd := exec.Command(binary, args...)

	// Manage the file descriptors.
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	// ExtraFiles starts at FD 3. Reserve that slot for Node parent/child
	// IPC; the VM reads Go actions on FD 4 and writes Go requests/replies on 5.
	cmd.ExtraFiles = []*os.File{nil, vmFromAgd, vmToAgd}
	cmd.Env = append(os.Environ(), "AGVM_INPUT_FD=4", "AGVM_OUTPUT_FD=5")

	return cmd
}
