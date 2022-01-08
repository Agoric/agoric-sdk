package main

import (
	"os"
	"os/exec"
	"path/filepath"
)

// FindBinaryNextToMe looks for binName next to the current executable.
// It returns an absolute filename for binName, or an error.
func FindBinaryNextToMe(binName string) (string, error) {
	ex, err := os.Executable()
	if err != nil {
		return "", err
	}

	// Calculate the binary's filename.
	bin := filepath.Join(filepath.Dir(ex), binName)

	// Take the absolute path.
	bin, err = filepath.Abs(bin)
	if err != nil {
		return "", err
	}

	// Check that the binary exists.
	if _, err := os.Stat(bin); err != nil {
		return "", err
	}
	return bin, nil
}

// FindBinary looks for binName in the following locations:
// 1. The executable's directory
// 2. The system PATH
//
// It returns the absolute filename for binName if it is found, otherwise an
// error.
func FindBinary(binName string) (string, error) {
	if binary, err := FindBinaryNextToMe(binName); err == nil {
		return binary, nil
	}

	// Check the system PATH.
	return exec.LookPath(binName)
}
