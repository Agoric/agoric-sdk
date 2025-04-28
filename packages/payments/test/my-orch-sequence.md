```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f0f8ff',
    'primaryTextColor': '#2c3e50',
    'primaryBorderColor': '#7fb2e6',
    'lineColor': '#7fb2e6',
    'secondaryColor': '#f6f8fa',
    'tertiaryColor': '#fff5e6'
  }
}}%%
sequenceDiagram
    title Payments Orchestration Flow - Transactional Model
    autonumber
    actor webUA as Producer's WebApp<br/>[Browser]
    %% [Where it runs]
    box Aqua Consumer's Chain
    participant acctOrig as Consumer's Acct
    end
    box Red Agoric Chain
    participant myOrch as Orch. Contract
    participant orchLCA1 as agoric10rchFEED
    end
    box Yellow as Osmosis Chain
    participant chainOS as Osmosis Chain
    end
    box Grey Producer's Chain
    participant chainMy as Producer's Chain
    participant acctDest as Producer's Account<br />producer1xyz
    end

    %% Notation: ->> for initial message, -->> for consequences

    note left of myOrch: contract starts
    myOrch ->> myOrch: makeLocalAccount()
    myOrch ->> orchLCA1: monitorTransfers(...)
    
    note right of webUA: User Initiates Action
    webUA ->> webUA: tipProducer(10 ATOM)
    webUA ->> acctOrig: broadcast(send(10 ATOM, agoric10rchFEED))
    acctOrig -->> orchLCA1: send(10 ATOM, agoric10rchFEED)
    orchLCA1 -->> myOrch: receiveUpcall(10 ATOM)
    myOrch -->> chainOS: send(swap(in: 10 ATOM, out: USDC, receiver: producer1xyz), osmo1swapper)
    chainOS -->> chainOS: swap(in: 10 ATOM, out: USDC)
    chainOS -->> chainMy: send(8 USDC, producer1xyz)
    chainMy -->> acctDest: deposit(8 USDC)

    chainMy -->> myOrch: resolve(8 USDC)
    myOrch -->> webUA: updateStorage(success)
    note right of webUA: User notified that execution<br/> is complete and tip is deposited
```
