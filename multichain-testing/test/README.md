## Start Chains

Runs agoric, cosmoshub, and osmosis with hermes relayers.

```sh
# start starship with default configuration
make start
# or for Fast USDC
make start FILE=config.fusdc.yaml
```

## Run Tests

The testing framework is organized into multiple test suites:
- `test:main` - Main orchestration API tests
- `test:fast-usdc` - Fast USDC tests (requires `make start FILE=config.fusdc.yaml`)
- `test:queries` - Query functionality tests
- `test:staking` - Staking functionality tests

To run the main test suite:

```sh
yarn test:main
```

Each test suite has its own configuration and must be run independently.
Calling `yarn test` will warn to pick a specific suite. See the subdirectories
for specific test suite documentation.

## Running with Different Relayer Configurations

The tests can be run with either Hermes relayers (default) or Go relayers. Each
configuration requires the appropriate starship configuration file and
environment variables.

### Hermes Relayer (Default)

```sh
# Start with default Hermes relayer configuration
make start

# Run tests
yarn test:main
```

### Go Relayer

```sh
# Start with Go relayer configuration
make start FILE=config.go-relayer.yaml

# Run tests with Go relayer environment variable
RELAYER_TYPE=go-relayer yarn test:main
```

### Fast USDC with Go Relayer

```sh
# Start with Fast USDC Go relayer configuration
make start FILE=config.fusdc.go-relayer.yaml

# Run Fast USDC tests with Go relayer environment variable
RELAYER_TYPE=go-relayer yarn test:fast-usdc
```

## Stop Chains

```sh
make stop
```
