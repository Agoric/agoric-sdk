package main

// Runs a subcommand until a given string is seen on a line in the stderr output,
// then sends SIGINT the subprocess and propagates its exit status.

import (
	"bufio"
	"log"
	"os"
	"os/exec"
	"strings"
	"syscall"
)

func main() {
	if len(os.Args) < 3 {
		log.Fatal("usage: runtillmsg msg cmd arg...")
	}
	msg, cmdName, args := os.Args[1], os.Args[2], os.Args[3:]

	// launch the command and listen to its stderr
	cmd := exec.Command(cmdName, args...)
	stderr, err := cmd.StderrPipe()
	if err != nil {
		log.Fatal(err)
	}
	err = cmd.Start()
	if err != nil {
		log.Fatal(err)
	}

	// copy lines of stderr, but interrupt the command if we see msg
	scanner := bufio.NewScanner(stderr)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.Contains(line, msg) {
			err = cmd.Process.Signal(syscall.SIGINT)
			if err != nil {
				log.Fatal(err)
			}
		}
		os.Stderr.WriteString(line + "\n")
	}
	err = scanner.Err()
	if err != nil {
		log.Fatal(err)
	}
	stderr.Close()

	// wait for the command to exit, and propagate its exit code
	err = cmd.Wait()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		log.Fatal(err)
		os.Exit(2)
	}
	// if cmd.Wait returns nil, exit code was 0, so just end
}
