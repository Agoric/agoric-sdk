# Snapshot report for `test/cli/cli.test.ts`

The actual snapshot is saved in `cli.test.ts.snap`.

Generated by [AVA](https://avajs.dev).

## shows help when run without arguments

> Snapshot 1

    `Usage: fast-usdc [options] [command]␊
    ␊
    CLI to interact with Fast USDC liquidity pool␊
    ␊
    Options:␊
      -V, --version             output the version number␊
      --home <path>             Home directory to use for config (default:␊
                                "~/.fast-usdc")␊
      -h, --help                display help for command␊
    ␊
    Commands:␊
      config                    Manage config␊
      operator                  Oracle operator commands␊
      deposit [options]         Deposit USDC into pool␊
      withdraw [options]        Withdraw USDC from the LP's pool share␊
      transfer <amount> <dest>  Transfer USDC from Ethereum/L2 to Cosmos via Fast␊
                                USDC␊
      help [command]            display help for command␊
    ␊
      Agoric test networks provide configuration info at, for example,␊
    ␊
      https://devnet.agoric.net/network-config␊
    ␊
      To use RPC endpoints from such a configuration, use:␊
      export AGORIC_NET=devnet␊
    ␊
      Use AGORIC_NET=local or leave it unset to use localhost and chain id agoriclocal.␊
      `

## shows help for transfer command

> Snapshot 1

    `Usage: fast-usdc transfer [options] <amount> <dest>␊
    ␊
    Transfer USDC from Ethereum/L2 to Cosmos via Fast USDC␊
    ␊
    Arguments:␊
      amount      Amount to transfer denominated in uusdc␊
      dest        Destination address in Cosmos␊
    ␊
    Options:␊
      -h, --help  display help for command␊
    ␊
      Agoric test networks provide configuration info at, for example,␊
    ␊
      https://devnet.agoric.net/network-config␊
    ␊
      To use RPC endpoints from such a configuration, use:␊
      export AGORIC_NET=devnet␊
    ␊
      Use AGORIC_NET=local or leave it unset to use localhost and chain id agoriclocal.␊
      `

## shows help for config command

> Snapshot 1

    `Usage: fast-usdc config [options] [command]␊
    ␊
    Manage config␊
    ␊
    Options:␊
      -h, --help        display help for command␊
    ␊
    Commands:␊
      show              Show current config␊
      init [options]    Set initial config values␊
      update [options]  Update config values␊
      help [command]    display help for command␊
    ␊
      Agoric test networks provide configuration info at, for example,␊
    ␊
      https://devnet.agoric.net/network-config␊
    ␊
      To use RPC endpoints from such a configuration, use:␊
      export AGORIC_NET=devnet␊
    ␊
      Use AGORIC_NET=local or leave it unset to use localhost and chain id agoriclocal.␊
      `

## shows help for config init command

> Snapshot 1

    `Usage: fast-usdc config init [options]␊
    ␊
    Set initial config values␊
    ␊
    Options:␊
      --noble-seed <seed>                  Seed phrase for Noble account. CAUTION:␊
                                           Stored unencrypted in file system␊
      --eth-seed <seed>                    Seed phrase for Ethereum account.␊
                                           CAUTION: Stored unencrypted in file␊
                                           system␊
      --agoric-seed <seed>                 Seed phrase for Agoric LP account.␊
                                           CAUTION: Stored unencrypted in file␊
                                           system␊
      --agoric-rpc [url]                   Agoric RPC endpoint (default:␊
                                           "http://127.0.0.1:26656")␊
      --agoric-api [url]                   Agoric RPC endpoint (default:␊
                                           "http://127.0.0.1:1317")␊
      --noble-rpc [url]                    Noble RPC endpoint (default:␊
                                           "http://127.0.0.1:26657")␊
      --noble-api [url]                    Noble API endpoint (default:␊
                                           "http://127.0.0.1:1318")␊
      --eth-rpc [url]                      Ethereum RPC Endpoint (default:␊
                                           "http://127.0.0.1:8545")␊
      --noble-to-agoric-channel [channel]  Channel ID on Noble for Agoric (default:␊
                                           "channel-21")␊
      --token-messenger-address [address]  Address of TokenMessenger contract␊
                                           (default:␊
                                           "0xbd3fa81b58ba92a82136038b25adec7066af3155")␊
      --token-contract-address [address]   Address of USDC token contract (default:␊
                                           "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")␊
      -h, --help                           display help for command␊
    ␊
      Agoric test networks provide configuration info at, for example,␊
    ␊
      https://devnet.agoric.net/network-config␊
    ␊
      To use RPC endpoints from such a configuration, use:␊
      export AGORIC_NET=devnet␊
    ␊
      Use AGORIC_NET=local or leave it unset to use localhost and chain id agoriclocal.␊
      `

## shows help for config update command

> Snapshot 1

    `Usage: fast-usdc config update [options]␊
    ␊
    Update config values␊
    ␊
    Options:␊
      --noble-seed [string]                Seed phrase for Noble account. CAUTION:␊
                                           Stored unencrypted in file system␊
      --eth-seed [string]                  Seed phrase for Ethereum account.␊
                                           CAUTION: Stored unencrypted in file␊
                                           system␊
      --agoric-seed <seed>                 Seed phrase for Agoric LP account.␊
                                           CAUTION: Stored unencrypted in file␊
                                           system␊
      --agoric-rpc [url]                   Agoric RPC endpoint␊
      --agoric-api [url]                   Agoric API endpoint␊
      --noble-rpc [url]                    Noble RPC endpoint␊
      --noble-api [url]                    Noble API endpoint␊
      --eth-rpc [url]                      Ethereum RPC Endpoint␊
      --noble-to-agoric-channel [channel]  Channel ID on Noble for Agoric␊
      --token-messenger-address [address]  Address of TokenMessenger contract␊
      --token-contract-address [address]   Address of USDC token contract␊
      -h, --help                           display help for command␊
    ␊
      Agoric test networks provide configuration info at, for example,␊
    ␊
      https://devnet.agoric.net/network-config␊
    ␊
      To use RPC endpoints from such a configuration, use:␊
      export AGORIC_NET=devnet␊
    ␊
      Use AGORIC_NET=local or leave it unset to use localhost and chain id agoriclocal.␊
      `

## shows help for config show command

> Snapshot 1

    `Usage: fast-usdc config show [options]␊
    ␊
    Show current config␊
    ␊
    Options:␊
      -h, --help  display help for command␊
    ␊
      Agoric test networks provide configuration info at, for example,␊
    ␊
      https://devnet.agoric.net/network-config␊
    ␊
      To use RPC endpoints from such a configuration, use:␊
      export AGORIC_NET=devnet␊
    ␊
      Use AGORIC_NET=local or leave it unset to use localhost and chain id agoriclocal.␊
      `

## shows error when deposit command is run without options

> Snapshot 1

    'error: required option \'--amount <number>\' not specified'

## shows error when deposit command is run with invalid amount

> Snapshot 1

    'error: option \'--amount <number>\' argument \'not-a-number\' is invalid. Not a number'

## shows error when withdraw command is run without options

> Snapshot 1

    'error: required option \'--amount <number>\' not specified'

## shows error when withdraw command is run with invalid amount

> Snapshot 1

    'error: option \'--amount <number>\' argument \'not-a-number\' is invalid. Not a number'

## shows error when config init command is run without options

> Snapshot 1

    'error: required option \'--noble-seed <seed>\' not specified'

## shows error when transfer command is run without options

> Snapshot 1

    'error: missing required argument \'amount\''

## shows error when config init command is run without eth seed

> Snapshot 1

    'error: required option \'--eth-seed <seed>\' not specified'

## shows error when config init command is run without agoric seed

> Snapshot 1

    'error: required option \'--agoric-seed <seed>\' not specified'

## shows error when config init command is run without noble seed

> Snapshot 1

    'error: required option \'--noble-seed <seed>\' not specified'
