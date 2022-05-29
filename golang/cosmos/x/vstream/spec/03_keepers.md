<!--
order: 3
-->

# Keeper

The vstream module provides this exported keeper interface that can be passed to
other modules that publish streams.

## PathPublisher

The vstream Keeper implements PathPublisher:

```go
// PathPublisher defines an interface that allows publishing of a value to a
// particular vstorage path.
type PathPublisher interface {
  	PublishUpdate(sdk sdk.Context, path string, value string)
	  PublishFinish(sdk sdk.Context, path string, value string)
	  PublishFail(sdk sdk.Context, path string, err error)
}
```
