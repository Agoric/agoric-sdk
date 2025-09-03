This file contains WIP design for ymax MVP product

## Design

```mermaid
architecture-beta
  group User(cloud)[User]
    service ymaxui(internet)[ymax UI] in User

    ymaxui:R -- L:ymaxcontract
    ymaxui:R -- L:PE

  group offchain(cloud)[Agoric Off Chain]
    service PE(server)[Ymax Planner] in offchain

    PE:R -- L:spectrum

  group onchain(cloud)[Agoric On Chain]
    service ymaxcontract(server)[ymax contract] in onchain

    PE:B -- T:ymaxcontract

  group SS(cloud)[Simply Staking]
    service spectrum(database)[Spectrum] in SS
    service APY(disk)[APY] in SS
    service fees(disk)[gas and other fees] in SS
    service slippage(disk)[slippage] in SS

    APY:L -- R:spectrum
    fees:L -- R:spectrum
    slippage:L -- R:spectrum
```

### Operations
1. new/edit portfolio
```mermaid
sequenceDiagram
  UI ->> portfolio: openPortfolio in type-guards.ts

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  portfolio ->> vstorage: write portfolio
```
2. deposit from Agoric chain into existing portfolio
```mermaid
sequenceDiagram
  UI ->> portfolio: rebalance in type-guards.ts

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  portfolio ->> LCAin: localTransfer
```
3. new/edit portfolio and deposit from Agoric chain
```mermaid
sequenceDiagram
  UI ->> portfolio: openPortfolio AND rebalance in type-guards.ts

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  portfolio ->> vstorage: write portfolio
  portfolio ->> LCAin: localTransfer
```
4. deposit-triggered distribution
```mermaid
sequenceDiagram
  autonumber

  box rgb(255,153,153) Agoric
    participant portfolio
    participant LCAorch
    participant LCAin
  end

  box  rgb(255,165,0) Agoric off-chain
    participant YP as Ymax Planner
    participant Res as Resolver
  end

  box rgb(163,180,243) Noble
    participant icaN as icaNoble
  end

  box rgb(163,180,243) Axelar
    participant AX as GMP
  end

  box rgb(163,180,243) Arbitrum
    participant factory as Factory Contract
    participant acctArb
    participant aavePos
  end

  %% Notation: ->> for initial message, -->> for consequences

  Note over YP: long-running process starts and monitors all portfolios
  Note over LCAin: USDC arriving in LCAin
  LCAin -->> YP: YP observes USDC arrives
  YP ->> LCAin: query bank balance
  YP ->> portfolio: read portfolio allocations
  YP ->> icaN: read balance
  YP ->> aavePos: read balance
  YP ->> AX: figure out how much to pay for GMP(agoric, arbitrum) and GMP(arbitrum, agoric) ticket TBD
  Note over YP: think and generate steps
  YP ->> portfolio: send moves and X BLD for GMP(agoric, arbitrum) and Y ARB for GMP(arbitrum, agoric)
  Note over portfolio, acctArb: Make Account if Needed
  portfolio ->> LCAorch: LCAgas pays X BLD (#11781)
  LCAorch ->> AX: makeAccount("Y ARB" for postage)
  AX ->> factory: invoke makeAccount
  factory ->> acctArb: makeAccount
  factory ->> AX: return acctArb.accountID, Y ARB for postage
  AX ->> LCAorch: return acctArb.accountID

  Note over LCAorch, acctArb: CCTP Out
  LCAin ->> LCAorch: $5k
  LCAorch ->> icaN: $5k
  icaN ->> LCAorch: ack
  LCAorch ->> icaN: depositForBurn
  icaN ->> LCAorch: ack
  icaN -->> acctArb: $5ku
  acctArb -->> Res: event?
  Res ->> portfolio: ack

  Note over LCAorch, aavePos: Supply to Aave
  LCAorch ->> AX: supply $5k acctArb
  AX -->> acctArb: supply $5k
  acctArb ->> aavePos: $5k
  aavePos -->> Res: Mint event
  Res ->> portfolio: ack
```

5. Withdraw
```mermaid
sequenceDiagram
  autonumber

  actor UI

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  box  rgb(255,165,0) Agoric off-chain
    participant YP as Ymax Planner
    participant Res as Resolver
  end

  box rgb(163,180,243) Noble
      participant icaN as icaNoble
  end
  box rgb(163,180,243) Axelar
      participant AX as GMP
  end
  box rgb(163,180,243) Arbitrum
    participant CCTP TokenMessenger v1
    participant acctArb as acctArb*
    participant aavePos as aavePos*
  end

  %% get plan
  UI ->> portfolio: withdraw with steps, <br>steps also include CCTP fee

  Note over portfolio, aavePos: Contract collapse steps into one GMP
  portfolio ->> AX: GMP (withdraw, $2k USDC, Noble ICA address, CCTP fee optional)
  AX -->> acctArb: withdraw $2k
  acctArb ->> aavePos: withdraw $2k
  aavePos ->> acctArb: $2k
  acctArb ->> CCTP TokenMessenger v1: depositForBurn($2k)
  acctArb -->> Res: observe depositForBurn complete
  Res ->> portfolio: ack
  Note over portfolio, aavePos: GMP ack'ed, waiting for CCTP to arrive
  CCTP TokenMessenger v1 -->> icaN: CCTP mint $2k USDC
  icaN -->> Res: observe mint
  Res ->> portfolio: ack
  portfolio -->> icaN: IBC transxfer
  icaN ->> LCAorch: IBC $2k USDC
  Note over LCAorch: contract has a queue of withdrawals(seats) to resolve <br> matches on amount
  LCAorch ->> UI: $2k USDC
```

6. manually-triggered rebalance
```mermaid
sequenceDiagram
  autonumber

  actor UI

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  box rgb(255,165,0) Agoric off-chain
    participant YP as Ymax Planner
    participant Res as Resolver
  end

  box rgb(163,180,243) Noble
      participant icaN as icaN*
  end
  box rgb(163,180,243) Axelar
      participant AX as GMP
  end
  box rgb(163,180,243) Arbitrum
      participant acctArb as acctArb*
      participant aavePos as aavePos*
  end
  box rgb(163,180,243) Base
      participant acctBase as acctBase*
      participant compPos as compPos*
  end

  %% get plan
  UI ->> portfolio: rebalance
  portfolio ->> YP: YP observes policyVersion signal for rebalance
  Note over YP: think and generate steps

  Note over portfolio, aavePos: CCTP back
  portfolio ->> AX: withdraw $2k acctArb
  AX -->> acctArb: withdraw $2k
  acctArb ->> aavePos: withdraw $2k
  aavePos ->> acctArb: $2k
  acctArb -->> icaN: $2k via CCTP

  Note over portfolio, compPos: CCTP Out and Supply to Compound
  portfolio ->> portfolio: provideAccount on Base

  %% Note over portfolio, acctArb: Send USDC
  icaN -->> acctBase: $2k via CCTP
  acctBase -->> portfolio: ack

  portfolio ->> AX: supply $2k acctBase
  AX -->> acctBase: supply $2k
  acctBase ->> compPos: $2k
  compPos -->> portfolio: ack
```

### User stories

1. tiger would like to open a portfolio with allocations in percentages
    1. operation 1: new/edit portfolio
2. tiger would like to edit their existing portfolio to different allocations
    1. operation 1: new/edit portfolio
3. tiger already has an existing portfolio, and tiger sign a txn to deposit USDC into their portfolio
    1. operation 4: deposit triggered distribution
3. tiger would like to open a portfolio and deposit USDC to it
    1. operation 3: new/edit portfolio and deposit from Agoric chain
    2. operation 4: deposit triggered distribution
4. tiger would like to edit their existing portfolio and deposit USDC to it
    1. operation 3: new/edit portfolio and deposit from Agoric chain
    2. operation 4: deposit triggered distribution
5. tiger would like to manually trigger a rebalance
    1. operation 5: manually-triggered rebalance

## Planner and Resolver resolving a subscription

```mermaid
sequenceDiagram
  box rgb(255,153,153) Agoric
    participant ymax as ymax Contract
  end

  box  rgb(255,165,0) Agoric off-chain
    participant Planner as ymax Planner
    participant SM as Subscription Manager
    participant VS as Vstorage
    participant GMP as GMP Handler
    participant CCTP as CCTP Handler
  end

  box rgb(163,180,243) External Networks
    participant Axelar as Axelar Network
    participant EVM as EVM Chain
  end

        Note over Planner: ymax Planner starts up
        Planner->>VS: Read existing portfolios
        Planner->>VS: Read existing subscriptions

        Note over ymax,SM: Subscription Creation
        ymax->>VS: Create subscription (GMP/CCTP)
        Planner-->>VS: get subscription data
        Planner->>SM: handleSubscription()

        alt GMP Subscription
            Note over SM,EVM: GMP Flow
            SM->>GMP: getTxStatus()
            loop Poll for execution
                GMP->>Axelar: POST "/gmp/searchGMP"
                GMP->>Axelar: Query with "sourceChain", "destinationChain", "contractAddress"
                Axelar-->>GMP: Return transaction status
                alt Transaction executed
                    GMP->>GMP: Decode logs
                    GMP->>GMP: Validate subscriptionId matches
                    break success
                        GMP-->>SM: Return {success: true, logs}
                    end
                else Still pending/confirming
                    GMP->>GMP: Wait waitingPeriod (20s)
                end
            end
            SM->>ymax: resolveSubscription() - update status

        else CCTP Subscription
            Note over SM,CCTP: CCTP Flow
            SM->>CCTP: watchCCTPTransfer()
            CCTP->>EVM: provider.on(filter, transferListener) - Listen ERC20 transfers to remote wallet

            loop Listen for transfers
                EVM-->>CCTP: Transfer event log
                CCTP->>CCTP: Parse "from", "to", "amount" from log
                alt Amount matches "expectedAmount"
                    CCTP->>CCTP: transferFound = true
                    CCTP->>CCTP: cleanup() - remove listeners
                    break success
                        CCTP-->>SM: Return true
                    end
                else Amount mismatch
                    CCTP->>CCTP: Continue watching
                end
            end

            alt Timeout reached
                CCTP->>CCTP: cleanup() - remove listeners
                CCTP-->>SM: Return false
            end

            SM->>ymax: resolveSubscription() - update status
        end
```

#### NOT in scope for now
1. deposit from Fast USDC source chains and create a new portfolio via address hook
2. connect with existing positions on Aave, Compound, etc
3. automatic/scheduled rebalance or claim rewards
