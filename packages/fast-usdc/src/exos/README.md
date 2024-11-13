##   **StatusManager** state diagram, showing different transitions


### Contract state diagram

*Transactions are qualified by the OCW and EventFeed before arriving to the Advancer.*

```mermaid
stateDiagram-v2
  [*] --> Advanced: Advancer .advance()
  Advanced --> Settled: Settler .settle() after fees
  [*] --> Observed: Advancer .observed()
  Observed --> Settled: Settler .settle() sans fees
  Settled --> [*]
```

### Complete state diagram (starting from OCW)

```mermaid
stateDiagram-v2
  Observed --> Qualified
  Observed --> Unqualified
  Qualified --> Advanced
  Advanced --> Settled
  Qualified --> Settled
```
