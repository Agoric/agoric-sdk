package util

import (
	"github.com/spf13/viper"
)

func NewFileOnlyViper(v1 *viper.Viper) (*viper.Viper, error) {
	v2 := viper.New()
	v2.SetConfigFile(v1.ConfigFileUsed())
	err := v2.ReadInConfig()
	return v2, err
}
