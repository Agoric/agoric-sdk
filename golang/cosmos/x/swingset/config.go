package swingset

import (
	"fmt"
	"github.com/spf13/viper"
	"path/filepath"
)

const (
	ConfigPrefix = "swingset"
	FlagSlogfile = "swingset.slogfile"
)

// DefaultConfigTemplate defines a default TOML configuration section for the SwingSet VM.
// See https://github.com/cosmos/cosmos-sdk/issues/20097 for auto-synchronization ideas.
const DefaultConfigTemplate = `

[swingset]
# slogfile is the absolute path at which a SwingSet log "slog" file should be written.
slogfile = ""
`

// SwingsetConfig defines configuration for the SwingSet VM.
// TODO: Consider extensions from docs/env.md.
type SwingsetConfig struct {
	// SlogFile is the absolute path at which a SwingSet log "slog" file should be written.
	SlogFile string `mapstructure:"slogfile"`
}

var DefaultSwingsetConfig = SwingsetConfig{
	SlogFile: "",
}

func SwingsetConfigFromViper(viper *viper.Viper) (*SwingsetConfig, error) {
	if err := viper.BindEnv(FlagSlogfile, "SLOGFILE"); err != nil {
		return nil, err
	}
	slogfile := viper.GetString(FlagSlogfile)
	if slogfile != "" && !filepath.IsAbs(slogfile) {
		return nil, fmt.Errorf("slogfile must be an absolute path")
	}
	return &SwingsetConfig{
		SlogFile: slogfile,
	}, nil
}
