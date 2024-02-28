package keeper

import "testing"

func TestKeeper_ParseRequestTypeURL(t *testing.T) {
	testCases := []struct {
		name        string
		typeUrl     string
		fullMethod  string
		responseURL string
	}{
		{"valid Request", "abc.def.1beta1.QueryFooBarRequest", "abc.def.1beta1.Query/FooBar", "abc.def.1beta1.QueryFooBarResponse"},
		{"not Request", "abc.def.1beta1.QueryFooBar", "abc.def.1beta1.Query/FooBar", "abc.def.1beta1.QueryFooBarResponse"},
		{"valid Msg", "cosmos.bank.v1beta1.MsgSend", "cosmos.bank.v1beta1.Msg/Send", "cosmos.bank.v1beta1.MsgSendResponse"},
		{"GIGO", "helloWorld", "hello/World", "helloWorldResponse"},
		{"one message", "Hello", "/Hello", "HelloResponse"},
		{"one namespace", "world", "/world", "worldResponse"},
		{"empty", "", "/", "Response"},
	}
	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			fullMethod, responseURL := parseRequestTypeURL(tc.typeUrl)
			if fullMethod != tc.fullMethod {
				t.Errorf("%v fullMethod expected %v, got %v", tc.typeUrl, tc.fullMethod, fullMethod)
			}
			if responseURL != tc.responseURL {
				t.Errorf("%v response expected %v, got %v", tc.typeUrl, tc.responseURL, responseURL)
			}
		})
	}
}
