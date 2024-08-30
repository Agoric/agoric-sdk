package util

import (
	"github.com/spf13/viper"
)

func NewFileOnlyViper(v1 *viper.Viper) *viper.Viper {
	v2 := viper.New()
	v2.SetConfigFile(v1.ConfigFileUsed())
	v2.ReadInConfig()
	return v2
}
