package cmd

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"cosmossdk.io/log"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/cosmos/cosmos-sdk/server"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/require"
)

func TestAgoricVMFlags(t *testing.T) {
	for _, tc := range []struct {
		name  string
		args  []string
		split bool
		path  string
	}{
		{name: "embedded by default"},
		{name: "bare split flag", args: []string{"--split-vm"}, split: true},
		{name: "explicit split", args: []string{"--split-vm=true"}, split: true},
		{name: "explicit embedded", args: []string{"--split-vm=false"}},
		{name: "empty path", args: []string{"--vm-path="}},
		{name: "embedded path", args: []string{"--vm-path=embedded"}, path: "embedded"},
		{name: "split path", args: []string{"--split-vm", "--vm-path=default"}, split: true, path: "default"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			command := &cobra.Command{Use: "test"}
			addAgoricVMFlags(command)
			require.NoError(t, command.ParseFlags(tc.args))
			split, err := command.Flags().GetBool("split-vm")
			require.NoError(t, err)
			require.Equal(t, tc.split, split)
			path, err := command.Flags().GetString("vm-path")
			require.NoError(t, err)
			require.Equal(t, tc.path, path)
		})
	}
	t.Run("old path flag rejected", func(t *testing.T) {
		command := &cobra.Command{Use: "test"}
		addAgoricVMFlags(command)
		require.Error(t, command.ParseFlags([]string{"--split-vm=/some/program"}))
	})
}

func TestVMFlagsOnAppCommands(t *testing.T) {
	root, _ := NewRootCmd(nil)
	for _, path := range [][]string{
		{"start"}, {"export"}, {"snapshots", "export"}, {"snapshots", "restore"},
		{"comet", "bootstrap-state"}, {"tendermint", "bootstrap-state"}, {"rollback"},
	} {
		t.Run(filepath.Join(path...), func(t *testing.T) {
			command, rest, err := root.Find(path)
			require.NoError(t, err)
			require.Empty(t, rest)
			require.NoError(t, command.ParseFlags([]string{"--split-vm", "--vm-path=default"}))
			split, err := command.Flags().GetBool("split-vm")
			require.NoError(t, err)
			require.True(t, split)
			path, err := command.Flags().GetString("vm-path")
			require.NoError(t, err)
			require.Equal(t, "default", path)
		})
	}
}

func TestStartHookRunsOnlyForStart(t *testing.T) {
	oldStart, oldApp := OnStartHook, OnAppHook
	t.Cleanup(func() { OnStartHook, OnAppHook = oldStart, oldApp })
	for _, commandPath := range [][]string{{"start"}, {"comet", "bootstrap-state"}, {"tendermint", "bootstrap-state"}, {"rollback"}} {
		t.Run(filepath.Join(commandPath...), func(t *testing.T) {
			startCalls := 0
			OnStartHook = func(_ *vm.AgdServer, _ log.Logger, _ servertypes.AppOptions) error {
				startCalls++
				return nil
			}
			OnAppHook = func(_ *vm.AgdServer, _ log.Logger, _ servertypes.AppOptions) error {
				panic("application hook reached")
			}
			root, _ := NewRootCmd(nil)
			command, _, err := root.Find(commandPath)
			require.NoError(t, err)
			// A path token named start must not classify bootstrap-state as start.
			home := filepath.Join(t.TempDir(), "start")
			// server/cmd.Execute normally installs this persistent flag.
			root.PersistentFlags().String("home", home, "application home")
			require.NoError(t, command.ParseFlags([]string{"--home=" + home}))
			serverCtx := server.NewDefaultContext()
			require.NoError(t, serverCtx.Viper.BindPFlags(command.Flags()))
			command.SetContext(context.WithValue(context.Background(), server.ServerContextKey, serverCtx))
			require.NoError(t, server.SetCmdServerContext(command, serverCtx))
			require.NoError(t, root.PersistentPreRunE(command, nil))
			serverCtx.Viper.Set("minimum-gas-prices", "0ubld")
			if command.PreRunE != nil {
				require.NoError(t, command.PreRunE(command, nil))
			}
			wantStartCalls := 0
			if command.Name() == "start" {
				wantStartCalls = 1
			}
			require.Equal(t, wantStartCalls, startCalls)
			// Opening an application invokes its own hook, never the start hook.
			ac := appCreator{}
			require.PanicsWithValue(t, "application hook reached", func() {
				ac.newApp(log.NewNopLogger(), nil, nil, serverCtx.Viper)
			})
			require.Equal(t, wantStartCalls, startCalls)
		})
	}
}

// An embedded export execs the JS entrypoint, which reenters export with an
// installed controller. Only that second invocation may create genesis.json.
func TestExportDefersGenesisUntilVMController(t *testing.T) {
	t.Setenv(EmbeddedVmEnvVar, "")
	exportDir := filepath.Join(t.TempDir(), "export")
	genesisPath := filepath.Join(exportDir, ExportedGenesisFileName)
	for _, embedded := range []bool{false, true} {
		if embedded {
			t.Setenv(EmbeddedVmEnvVar, "libdaemon")
		}
		command := &cobra.Command{
			Use: "export",
			RunE: func(command *cobra.Command, _ []string) error {
				if !embedded {
					_, err := os.Stat(genesisPath)
					require.True(t, os.IsNotExist(err), "genesis must not exist before delegation")
					return nil
				}
				_, err := command.OutOrStdout().Write([]byte("{}"))
				return err
			},
		}
		addAgoricVMFlags(command)
		extendCosmosExportCommand(command)
		require.NoError(t, command.ParseFlags([]string{"--export-dir=" + exportDir}))
		serverCtx := server.NewDefaultContext()
		require.NoError(t, serverCtx.Viper.BindPFlags(command.Flags()))
		command.SetContext(context.WithValue(context.Background(), server.ServerContextKey, serverCtx))
		require.NoError(t, server.SetCmdServerContext(command, serverCtx))
		require.NoError(t, command.RunE(command, nil))
	}
	genesis, err := os.ReadFile(genesisPath)
	require.NoError(t, err)
	require.JSONEq(t, "{}", string(genesis))
}

func TestHasVMController(t *testing.T) {
	for _, tc := range []struct {
		name     string
		split    bool
		embedded string
		want     bool
	}{
		{name: "not launched"},
		{name: "split", split: true, want: true},
		{name: "native controller", embedded: "libdaemon", want: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv(EmbeddedVmEnvVar, tc.embedded)
			serverCtx := server.NewDefaultContext()
			serverCtx.Viper.Set("split-vm", tc.split)
			require.Equal(t, tc.want, hasVMController(serverCtx))
		})
	}
}

func TestExportWithVMController(t *testing.T) {
	for _, mode := range []string{"split", "embedded", "skip"} {
		t.Run(mode, func(t *testing.T) {
			t.Setenv(EmbeddedVmEnvVar, "")
			if mode == "embedded" {
				t.Setenv(EmbeddedVmEnvVar, "libdaemon")
			}
			exportDir := filepath.Join(t.TempDir(), "export")
			called := false
			command := &cobra.Command{
				Use: "export",
				RunE: func(command *cobra.Command, _ []string) error {
					called = true
					_, err := command.OutOrStdout().Write([]byte("{}"))
					return err
				},
			}
			addAgoricVMFlags(command)
			extendCosmosExportCommand(command)
			args := []string{"--export-dir=" + exportDir}
			switch mode {
			case "split":
				args = append(args, "--split-vm")
			case "skip":
				args = append(args, "--swing-store-export-mode=skip")
			}
			require.NoError(t, command.ParseFlags(args))
			serverCtx := server.NewDefaultContext()
			require.NoError(t, serverCtx.Viper.BindPFlags(command.Flags()))
			command.SetContext(context.WithValue(context.Background(), server.ServerContextKey, serverCtx))
			require.NoError(t, command.RunE(command, nil))
			require.True(t, called)
			genesisPath := filepath.Join(exportDir, ExportedGenesisFileName)
			genesis, err := os.ReadFile(genesisPath)
			require.NoError(t, err)
			require.JSONEq(t, "{}", string(genesis))

			called = false
			err = command.RunE(command, nil)
			require.ErrorIs(t, err, os.ErrExist, "an existing genesis must not be overwritten")
			require.False(t, called, "refuse the export before calling the exporter")
		})
	}
}
