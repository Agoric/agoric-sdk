# Ymax State Machine Visualizer

An interactive visualization tool for the Ymax flow state machine that helps users track the status of their portfolio transactions.

## Files

- **`ymax-machine.yaml`** - Canonical state machine definition
- **`ymax-machine.mmd`** - Mermaid diagram (generated from YAML)
- **`ymax-visualizer.html`** - Interactive SVG-based visualizer
- **`lint-ymax-state-diagram.js`** - Linter to verify HTML matches YAML

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

To verify the HTML visualizer matches the canonical YAML definition:

```bash
yarn lint:ymax-diagram
```

Or directly:

```bash
node docs/lint-ymax-state-diagram.js
```

The linter checks:
- All states exist in both files
- State descriptions match
- Transitions match (events, targets, descriptions)
- Final state flags match
- Nested state structure matches

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
2. **Update `ymax-visualizer.html`** - Modify the `stateMachine` object to match
3. **Run the linter** - Verify consistency: `yarn lint:ymax-diagram`
4. **Test the visualization** - Open the HTML file and test with example data

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
