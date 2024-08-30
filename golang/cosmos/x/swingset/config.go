package swingset

import (
	"fmt"
	"github.com/spf13/viper"
	"path/filepath"
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
	viper, ok := resolvedConfig.(*viper.Viper)
	if !ok {
		return nil, fmt.Errorf("expected an instance of viper!")
	}
	if viper == nil {
		return nil, nil
	}
	viper.MustBindEnv(FlagSlogfile, "SLOGFILE")
	wrapper := struct{ Swingset SwingsetConfig }{}
	viper.Unmarshal(&wrapper)
	config := &wrapper.Swingset
	slogPath := config.SlogFile
	if slogPath != "" && !filepath.IsAbs(slogPath) {
		return nil, fmt.Errorf("slogfile must be an absolute path")
	}
	return config, nil
}
