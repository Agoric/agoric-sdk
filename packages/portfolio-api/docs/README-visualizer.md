# Ymax State Machine Visualizer

An interactive visualization tool for the Ymax flow state machine that helps users track the status of their portfolio transactions.

## Files

- **`ymax-machine.yaml`** - Canonical state machine definitions (12 machines)
- **`ymax-machine.mmd`** - Main flow Mermaid diagram (generated from YAML)
- **`ymax-machine-{name}.mmd`** - Individual Mermaid diagrams per machine
- **`ymax-visualizer.html`** - Interactive SVG-based visualizer with collapsible step machines
- **`ymax-machine.schema.json`** - JSON Schema for validating YAML

## Machines

The spec contains 12 state machines:

### Flow Machine
- **YmaxFlow** - Main portfolio flow (deposit, withdraw, rebalance)

### Step Machines (Ways)
Each step in a flow executes as one of these "Way" types:

| Machine | Protocol | Description |
|---------|----------|-------------|
| `localTransfer` | Zoe | Seat → Agoric LCA |
| `withdrawToSeat` | Zoe | Agoric LCA → Seat |
| `send` | Agoric | LCA → LCA (internal) |
| `IBC_agoric_noble` | IBC | Agoric → Noble |
| `IBC_noble_agoric` | IBC | Noble → Agoric |
| `CCTP_noble_EVM` | Circle CCTP | Noble → EVM (burn/attest/mint) |
| `CCTP_EVM_agoric` | CCTP + GMP | EVM → Noble → Agoric |
| `GMP_protocol_supply` | Axelar GMP | Supply to Aave/Compound/Beefy |
| `GMP_protocol_withdraw` | Axelar GMP | Withdraw from Aave/Compound/Beefy |
| `USDN_supply` | Noble Dollar | Swap USDC → USDN |
| `USDN_withdraw` | Noble Dollar | Swap USDN → USDC |

## Usage

### Opening the Visualizer

Simply open `ymax-visualizer.html` in a web browser. The page includes:

1. **Control Panel** (left) - Input state vector to visualize
2. **State Diagram** (right) - Interactive SVG visualization

### State Vector Format

Enter one state per line with optional timestamps:

```
transaction_defined 2025-01-15T13:10:00Z
transaction_committed 13:11
flow_inited
planning
```

**Timestamp formats supported:**
- ISO 8601: `2025-01-15T13:10:00Z`
- Simple time: `13:10` (uses today's date)
- No timestamp: Just the state name

### Features

- **Visual State Tracking**: States are color-coded
  - Gray: Not yet visited
  - Light blue: Visited
  - Dark blue: Current state

- **Happy Path Highlighting**: Green animated arrows show expected next transition

- **Time Tracking**: Shows relative time since last state transition (updates live)

- **Hover Tooltips**: Detailed information on hover including:
  - State description
  - Observable data sources
  - Invariants
  - Transition events and descriptions
  - Production verification links

- **Expandable Nested States**: Click ▶/▼ to expand/collapse the "executing" state substates

- **Production Verification**: Links to check actual state in production systems

## Linting

To validate the YAML state machine definitions:

```bash
yarn lint:ymax-diagram
```

The linter checks:
- All required fields present (machines, initial, states, description)
- All transitions target existing states within the machine
- All wayMachines references point to existing machines
- All states have descriptions
- Valid category values (flow or step)

To verify generated files are up-to-date:

```bash
yarn lint:mermaid          # Check Mermaid diagrams match YAML
yarn lint:visualizer-data  # Check HTML embedded data matches YAML
```

## Embedding in MCP UI

The visualizer uses standard SVG rendering, making it easy to embed in MCP chat interfaces:

1. Extract the SVG element from the page
2. The rendering function can be called with state vector data
3. All interactivity (hover, expand/collapse) works in embedded context

Example integration:

```javascript
// Parse state vector from production data
const stateVector = parseStateVector(productionData);

// Render the state machine
renderStateMachine(stateVector);
```

## Production Data Sources

The visualizer includes links to verify state in production:

- **Agoric Explorer**: Transaction history
- **vstorage API**: Published portfolio/flow state
- **Planner Logs**: Planning service logs

Links use placeholder values (`{walletAddr}`, `{n}`, `{instance}`) that should be replaced with actual values when integrating with production data.

## Development

When modifying the state machine:

1. **Update `ymax-machine.yaml`** - This is the source of truth
2. **Run the generators**:
   - `npx tsx scripts/gen-mermaid.mts` - Updates Mermaid diagrams
   - `npx tsx scripts/gen-visualizer-data.mts` - Embeds YAML data into HTML
3. **Run the linter** - Verify consistency: `yarn lint:ymax-diagram`
4. **Test the visualization** - Open the HTML file and test with example data

### Adding a New Step Machine

1. Add the new machine to `ymax-machine.yaml` under `machines:`
2. Set `category: step` to mark it as a step machine
3. Reference it in `YmaxFlow.states.executing.states.moving.meta.wayMachines`
4. Run the generator and linter
5. The visualizer will automatically show it in the collapsible section

## State Machine Overview

The Ymax flow state machine tracks portfolio transactions through these main states:

1. **transaction_defined** - User creates offer
2. **transaction_committed** - Transaction in consensus
3. **flow_registered** - Contract receives request
4. **flow_inited** - Flow recorded in flowsRunning
5. **planning** - Planner computes steps
6. **planned** - Steps submitted to contract
7. **executing** - Contract executes movements
   - **provisioning** - Create/resolve accounts
   - **moving** - Execute movement steps
8. **completed** - Flow finished successfully
9. **failed** - Flow halted with error

See `ymax-machine.yaml` for complete details including observable data sources, invariants, and transition conditions.
