package swingset

import (
	"fmt"
	"path/filepath"

	"github.com/spf13/viper"

	"github.com/cosmos/cosmos-sdk/client/flags"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"

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
# slogfile is the path at which a SwingSet log "slog" file should be written.
# If relative, it is interpreted against the application home directory
# (e.g., ~/.agoric).
slogfile = "{{ .Swingset.SlogFile }}"

# maxVatsOnline is the maximum number of vats that SwingSet kernel will bring online
maxVatsOnline = 50
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

func SwingsetConfigFromViper(resolvedConfig servertypes.AppOptions) (*SwingsetConfig, error) {
	v, ok := resolvedConfig.(*viper.Viper)
	if !ok {
		// Tolerate an apparently empty configuration such as
		// cosmos/cosmos-sdk/simapp EmptyAppOptions, but otherwise require viper.
		if resolvedConfig.Get(flags.FlagHome) != nil {
			return nil, fmt.Errorf("expected an instance of viper!")
		}
	}
	if v == nil {
		return nil, nil
	}
	v.MustBindEnv(FlagSlogfile, "SLOGFILE")
	wrapper := struct{ Swingset SwingsetConfig }{}
	if err := v.Unmarshal(&wrapper); err != nil {
		return nil, err
	}
	config := &wrapper.Swingset

	// Interpret relative paths from config files against the application home
	// directory and from other sources (e.g. env vars) against the current
	// working directory.
	var fileOnlyViper *viper.Viper
	resolvePath := func(path, configKey string) (string, error) {
		if path == "" || filepath.IsAbs(path) {
			return path, nil
		}
		if v.InConfig(configKey) {
			if fileOnlyViper == nil {
				var err error
				fileOnlyViper, err = util.NewFileOnlyViper(v)
				if err != nil {
					return "", err
				}
			}
			pathFromFile := fileOnlyViper.GetString(configKey)
			if path == pathFromFile {
				homePath := viper.GetString(flags.FlagHome)
				if homePath == "" {
					return "", fmt.Errorf("cannot resolve path against empty application home")
				}
				absHomePath, err := filepath.Abs(homePath)
				return filepath.Join(absHomePath, path), err
			}
		}
		return filepath.Abs(path)
	}

	resolvedSlogFile, err := resolvePath(config.SlogFile, FlagSlogfile)
	if err != nil {
		return nil, err
	}
	config.SlogFile = resolvedSlogFile

	return config, nil
}
