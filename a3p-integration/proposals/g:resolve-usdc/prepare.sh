# #!/bin/bash
# set -euo pipefail
# # Import the fetchCoreEvalRelease function from supports.ts
# # This requires Node.js to execute TypeScript

# # Determine the path to the supports.ts file relative to this script
# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# SDK_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
# SUPPORTS_TS="$SDK_ROOT/packages/boot/tools/supports.ts"

# # Execute the TypeScript file with ts-node
# # Make sure to pass any necessary arguments from this script to the function
# node --loader ts-node/esm "$SUPPORTS_TS" --function fetchCoreEvalRelease "$@"


#!/bin/bash
set -euo pipefail

# Determine the script directory and SDK root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SDK_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "Building agd binary..."
# Run the agd build script
"$SDK_ROOT/bin/agd"

# Add the built binary to PATH
export PATH="$SDK_ROOT/golang/cosmos/build:$PATH"

# Verify the binary is working
echo "Testing agd binary..."
agd version
