package swingset

import (
	"fmt"
	"path/filepath"

	"github.com/spf13/viper"

	"github.com/Agoric/agoric-sdk/golang/cosmos/util"
)

const (
	ConfigPrefix = "swingset"
	FlagSlogfile = ConfigPrefix + ".slogfile"
)

// DefaultConfigTemplate defines a default TOML configuration section for the SwingSet VM.
// Values are pulled from a "Swingset" property, in accord with CustomAppConfig from
// ../../daemon/cmd/root.go.
// See https://github.com/cosmos/cosmos-sdk/issues/20097 for auto-synchronization ideas.
const DefaultConfigTemplate = `
###############################################################################
###                         SwingSet Configuration                          ###
###############################################################################

[swingset]
# slogfile is the absolute path at which a SwingSet log "slog" file should be written.
slogfile = "{{ .Swingset.SlogFile }}"
`

// SwingsetConfig defines configuration for the SwingSet VM.
// TODO: Consider extensions from docs/env.md.
type SwingsetConfig struct {
	// SlogFile is the absolute path at which a SwingSet log "slog" file should be written.
	SlogFile string `mapstructure:"slogfile" json:"slogfile,omitempty"`
}

var DefaultSwingsetConfig = SwingsetConfig{
	SlogFile: "",
}

func SwingsetConfigFromViper(resolvedConfig any) (*SwingsetConfig, error) {
	v, ok := resolvedConfig.(*viper.Viper)
	if !ok {
		return nil, fmt.Errorf("expected an instance of viper!")
	}
	if v == nil {
		return nil, nil
	}
	v.MustBindEnv(FlagSlogfile, "SLOGFILE")
	wrapper := struct{ Swingset SwingsetConfig }{}
	v.Unmarshal(&wrapper)
	config := &wrapper.Swingset

	var fileOnlyViper *viper.Viper
	stringFromFile := func(key string) string {
		if fileOnlyViper == nil {
			fileOnlyViper = util.NewFileOnlyViper(v)
		}
		return fileOnlyViper.GetString(key)
	}

	// Require absolute slogfile paths in configuration files
	// while still allowing them to be relative [to working dir] in e.g. env vars.
	slogPath := config.SlogFile
	if slogPath != "" && !filepath.IsAbs(slogPath) && v.InConfig(FlagSlogfile) {
		slogPathFromFile := stringFromFile(FlagSlogfile)
		if slogPathFromFile != "" && !filepath.IsAbs(slogPathFromFile) {
			return nil, fmt.Errorf("configured slogfile must use an absolute path")
		}
	}

	return config, nil
}
