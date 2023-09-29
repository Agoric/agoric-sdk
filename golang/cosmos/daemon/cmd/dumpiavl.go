package cmd

import (
	"encoding/base64"
	"fmt"
	"path/filepath"

	"github.com/cosmos/cosmos-sdk/client/flags"
	"github.com/cosmos/cosmos-sdk/server"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/spf13/cobra"
)

func DumpIavlCommand() *cobra.Command {
	// cribbed from cosmos-sdk/server.ExportCmd()
	cmd := &cobra.Command{
		Use:   "dump-iavl",
		Short: "IAVL tree dump",
		RunE: func(cmd *cobra.Command, args []string) error {
			serverCtx := server.GetServerContextFromCmd(cmd)
			config := serverCtx.Config
			homeDir, _ := cmd.Flags().GetString(flags.FlagHome)
			config.SetRoot(homeDir)

			dataDir := filepath.Join(config.RootDir, "data")
			db, err := sdk.NewLevelDB("application", dataDir)
			if err != nil {
				return err
			}
			defer db.Close()

			it, err := db.Iterator(nil, nil)
			if err != nil {
				return err
			}
			defer it.Close()

			for ; it.Valid(); it.Next() {
				key := base64.StdEncoding.EncodeToString(it.Key())
				val := base64.StdEncoding.EncodeToString(it.Value())
				fmt.Printf("%s %s\n", key, val)
			}

			return nil
		},
	}
	return cmd
}
