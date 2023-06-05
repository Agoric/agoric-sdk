package main

import (
	"os"
	"os/exec"
	"path/filepath"
)

// FindBinaryNextToMe looks for binName next to the current executable.
// It returns an absolute filename for binName, or an error.
func FindBinaryNextToMe(walkUp int, path... string) (string, error) {
	ex, err := os.Executable()
	if err != nil {
		return "", err
	}

	// Calculate the binary's filename.
	dir := ex
	for i := 0; i <= walkUp; i++ {
		dir = filepath.Dir(dir)
	}

	bin := filepath.Join(append([]string{dir}, path...)...)

	// Take the absolute path.
	bin, err = filepath.Abs(bin)
	if err != nil {
		return "", err
	}

	// Check that the binary exists.
	if _, err = os.Stat(bin); err != nil {
		return "", err
	}
	
	return bin, nil
}

// FindCosmicSwingsetBinary looks for binName in the following locations:
// 1. The executable's directory
// 2. Walking up to ../../cosmic-swingset/src/entrypoint.js
// 3. Walking up to ../../../packages/cosmic-swingset/src/entrypoint.js
// 4. The system PATH
//
// It returns the absolute filename for binName if it is found, otherwise an
// error.
func FindCosmicSwingsetBinary() (string, error) {
	binName := "ag-chain-cosmos"
	if binary, err := FindBinaryNextToMe(0, binName); err == nil {
		return binary, nil
	}
	if binary, err := FindBinaryNextToMe(2, "cosmic-swingset", "src", "entrypoint.js"); err == nil {
		return binary, nil
	}
	if binary, err := FindBinaryNextToMe(3, "packages", "cosmic-swingset", "src", "entrypoint.js"); err == nil {
		return binary, nil
	}

	// Check the system PATH.
	return exec.LookPath(binName)
}
