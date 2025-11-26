This file contains WIP design for ymax MVP product

## Design

```mermaid
C4Context
  title high level system diagram
  Boundary(u, "User") {
    Person(ymaxUI, "ymax.app")
  }

  Boundary(offchain, "Agoric Off Chain") {
    System(css, "ymax data service")
    System(ypr, "ymax planner and resolver", "planner and resolver")
  }

  Boundary(onchain, "Agoric On Chain") {
    System(vstorage, "vstorage")
  }

  Boundary(Simply Staking, "Simply Staking") {
    System(spectrum, "Spectrum API")
  }

  Rel(ymaxUI, vstorage, "Reads")
  Rel(ymaxUI, css, "Uses")
  Rel(ymaxUI, spectrum, "Uses")

  Rel(css, spectrum, "Uses")
  Rel(css, vstorage, "Reads")

  Rel(ypr, spectrum, "Uses")
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

  box rgb(163,180,243) Noble
    participant icaN as icaNoble
    participant NFA as NFA
  end

  portfolio ->> vstorage: write portfolio
  opt When creating new portfolio
    portfolio ->> NFA: create NFA
  end
```

2. deposit from Agoric chain into existing portfolio
```mermaid
sequenceDiagram
  UI ->> portfolio: deposit in type-guards.ts

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  box rgb(163,180,243) Noble
    participant icaN as icaNoble
    participant NFA as NFA
  end

  portfolio ->> vstorage: flowsRunning:<br/>{ flowN: { type: 'deposit', amount } }
```

3. new/edit portfolio and deposit from Agoric chain
```mermaid
sequenceDiagram
  UI ->> portfolio: openPortfolio in type-guards.ts

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  box rgb(163,180,243) Noble
    participant icaN as icaNoble
    participant NFA as NFA
  end

  portfolio ->> vstorage: write portfolio
  opt When creating new portfolio
    portfolio ->> NFA: create NFA
  end
  portfolio ->> vstorage: flowsRunning:<br/>{ flowN: { type: 'deposit', amount } }
```

4. ymax-planner in response to single-flow deposit
```mermaid
sequenceDiagram
  autonumber

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
    participant NFA as NFA
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
  Note over vstorage: signal for ymax-planner
  vstorage -->> YP: ymax-planner observes signal
  YP ->> portfolio: read portfolio allocations
  YP ->> icaN: read balance
  YP ->> aavePos: read balance
  YP ->> AX: compute GMP costs (agoric→arbitrum)
  Note over YP: planner thinks and generates steps
  YP ->> portfolio: send moves and X BLD for GMP(agoric→arbitrum)

  Note over portfolio, acctArb: Make Account if Needed
  portfolio ->> LCAorch: LCAgas pays X BLD
  LCAorch ->> AX: sendMakeAccountCall(... )<br/>GMP: request creation of remote Arbitrum wallet
  AX -->> factory: invoke makeAccount on Arbitrum
  factory -->> acctArb: deploy new Arbitrum wallet instance
  factory -->> factory: emit SmartWalletCreated(acctArb.accountID)

  Note over factory, YP: Ymax-Planner listens for<br/>SmartWalletCreated events
  YP ->> Res: watchSmartWalletTx(... )<br/>detected SmartWalletCreated
  Res ->> portfolio: resolvePendingTx(... )<br/>store acctArb.accountID

  Note over portfolio, acctArb: Remote Arbitrum wallet acctArb<br/>created successfully and ready to use

  Note over LCAorch, acctArb: CCTP Out
  LCAin ->> LCAorch: $5k
  LCAorch ->> icaN: $5k
  icaN ->> LCAorch: ack
  LCAorch ->> icaN: depositForBurn
  icaN ->> LCAorch: ack
  icaN -->> acctArb: $5ku
  acctArb -->> Res: observe $5k arriving
  Res ->> portfolio: ack $5k arriving
  acctArb -->> Res: observe makeAccount
  Res ->> portfolio: ack makeAccount

  Note over LCAorch, aavePos: Supply to Aave
  LCAorch ->> AX: supply $5k acctArb
  AX -->> acctArb: supply $5k
  acctArb ->> aavePos: $5k
  aavePos -->> Res: observe mint event
  Res ->> portfolio: ack
```

5. Withdraw

```
    1. non-pipelined
```

```mermaid
sequenceDiagram
  autonumber

  actor UI

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
  end

  box  rgb(255,165,0) Agoric off-chain
    participant YP as Ymax Planner
    participant Res as Resolver
  end

  box rgb(163,180,243) Noble
      participant icaN as icaNoble
      participant NFA as NFA
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
  UI ->> portfolio: withdraw(2K)
  portfolio -->> vstorage: flowsRunning: { flow4: withdraw }<br/>flow4: { want: 2k USDC }
  vstorage -->> YP: flow4!
  note over portfolio: WAIT 4

  YP -->> portfolio: steps: aave, cctp...

  Note over acctArb, aavePos: withdraw from Aave
  portfolio ->> AX: GMP (withdraw,<br/> $2k USDC, Noble ICA address, CCTP fee optional)
  AX -->> acctArb: withdraw $2k
  acctArb ->> aavePos: withdraw $2k
  acctArb -->> Res: observe withdraw is complete
  Res ->> portfolio: ack

  Note over icaN, acctArb: CCTPin
  portfolio->> AX: GMP (depositForBurn,<br/> $2k USDC, Noble ICA address, CCTP fee optional)
  acctArb ->> CCTP TokenMessenger v1: depositForBurn($2k)
  acctArb -->> Res: observe depositForBurn complete
  Res ->> portfolio: ack

  Note over icaN, acctArb: GMP ack'ed, waiting for CCTP to arrive
  CCTP TokenMessenger v1 -->> NFA: CCTP mint $2k USDC
  NFA -->> LCAorch: Noble forwards $2k USDC to LCAorch
  LCAorch -->> portfolio: receiveUpcall
  note over portfolio: RESUME 4
  LCAorch ->> UI: payout $2k USDC
  portfolio -->> vstorage: flowsRunning: {}
```

```
    2. pipelined (not our focus right now)
```

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
      participant NFA as NFA
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
  CCTP TokenMessenger v1 -->> NFA: CCTP mint $2k USDC
  NFA -->> LCAorch: Noble forwards $2k USDC to LCAorch
  LCAorch -->> portfolio: receiveUpcall
  Note over LCAorch: contract has a queue of withdrawals(seats) to resolve <br> matches on amount
  note over portfolio: RESUME 4
  LCAorch ->> UI: $2k USDC
  portfolio -->> vstorage: flowsRunning: {}
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
      participant NFA as NFA
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
  acctArb -->> NFA: $2k via CCTP
  NFA -->> LCAorch: Noble forwards $2k

  Note over portfolio, compPos: CCTP Out and Supply to Compound
  portfolio ->> portfolio: provideAccount on Base

  %% Note over portfolio, acctArb: Send USDC
  LCAorch ->> icaN: $2k
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
