# Cosmic SwingSet Telemetry

The Cosmic SwingSet chain node (`ag-chain-cosmos`) is instrumented to export
useful metrics via [Prometheus](https://prometheus.io/) endpoints on different
inbound TCP ports.

These metrics apply both to validators and regular full nodes.

The following sections explain how to enable each of these metric exporters.
You can enable telemetry just be setting the configuration, then by restarting
your node, which will quickly catch up to where it was.  Enabling or disabling
telemetry does not affect the correctness of your node.

## Caveats

**NOTE:** the exposed metric ports may need additional firewall rules to accept
TCP connections from your Prometheus host's IP address.

## Agoric VM (SwingSet) metrics

SwingSet is responsible for the chain's Javascript execution.  It is
instrumented with the [OpenTelemetry](https://opentelemetry.io/) (*OTEL*)
system.

To enable the Prometheus exporter, set the desired listening TCP port number in
the `$OTEL_EXPORTER_PROMETHEUS_PORT` environment variable before running the
node.  To listen on http://0.0.0.0:9464/metrics use:

```sh
OTEL_EXPORTER_PROMETHEUS_PORT=9464 ag-chain-cosmos start ...
```

## Cosmos SDK metrics

The [Cosmos SDK](https://docs.cosmos.network/) layer of the system is
responsible for transaction processing, as well as forwarding to the SwingSet layerdispatching and processing.

To enable the exporting of Cosmos metrics, you need to change the contents of
your `~/.ag-chain-cosmos/config/app.toml` (**not** `config.toml`) in the
`[telemetry]` section:

```toml
[telemetry]
enabled = true
prometheus-retention-time = 60

[api]
# Note: this key is "enable" (without a "d", not "enabled")
enable = true
address = "tcp://0.0.0.0:1317"
```

If the API server is enabled, then this will export Cosmos SDK metrics at
http://0.0.0.0:1317/metrics?format=prometheus (at your enabled API server port).
The metrics will also be exported at the Tendermint Prometheus port if enabled
in the next section.

The exported metrics are listed at:
https://docs.cosmos.network/v0.42/core/telemetry.html

## Tendermint metrics

The [Tendermint Core](https://tendermint.com/core/) layer of the system is
responsible for the basic blockchain functionality (BFT consensus and validator
sets).  It forwards transactions to the Cosmos SDK.

To enable the exporting of Tendermint metrics, you need to change the contents
of your `~/.ag-chain-cosmos/config/config.toml` (**not** `app.toml`) in the
`[instrumentation]` section:

```toml
[instrumentation]
prometheus = true
prometheus_listen_addr = ":26660"
```

This will export Tendermint metrics at http://0.0.0.0:26660/metrics The metrics
will also be exported at the Cosmos SDK API server port if enabled in the
previous section.
