# @agoric/cosmos

Connect JS to the Cosmos blockchain SDK and provides the `agd` binary.

## Installation

```bash
npm install @agoric/cosmos
```

## Usage

After installation, the `agd` binary is available:

```bash
# Using npx
npx agd version

# Using the binary directly
./node_modules/.bin/agd version
```

## Supported Platforms

This package includes prebuilt binaries for the following platforms:

- Linux x64 (amd64)
- Linux ARM64 (arm64)
- macOS x64 (amd64)
- macOS ARM64 (arm64, Apple Silicon)
- Windows x64 (amd64)

The appropriate binary for your platform will be automatically selected during installation.

## Development

To build the binaries from source:

```bash
make compile-agd-all
```

This requires Go 1.21+ and the dependencies listed in `go.mod`.