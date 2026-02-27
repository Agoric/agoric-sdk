#!/bin/bash

# Bootstrap script for fresh environments (CI, cloud agents, new clones)
# For updating/fixing an existing developer environment, use env-doctor.sh instead.

set -e

# Colors for output (disabled if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

log_info() { echo -e "${GREEN}[bootstrap]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[bootstrap]${NC} $1"; }
log_error() { echo -e "${RED}[bootstrap]${NC} $1"; }

# Ensure we're in the repo root
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
  log_error "Must be run from agoric-sdk root directory"
  exit 1
fi

# Check Node.js version
log_info "Checking Node.js version..."
if ! command -v node >/dev/null 2>&1; then
  log_error "Node.js is not installed. Required: ^20.9 or ^22.11"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/^v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

if [ "$NODE_MAJOR" -eq 20 ] && [ "$NODE_MINOR" -ge 9 ]; then
  log_info "Node.js $NODE_VERSION OK"
elif [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -ge 11 ]; then
  log_info "Node.js $NODE_VERSION OK"
elif [ "$NODE_MAJOR" -gt 22 ]; then
  log_warn "Node.js $NODE_VERSION is newer than tested versions (^20.9 or ^22.11)"
else
  log_error "Node.js $NODE_VERSION does not meet requirements (^20.9 or ^22.11)"
  exit 1
fi

# Enable corepack for pinned Yarn version
log_info "Enabling corepack..."
corepack enable

# Check if dependencies are installed
if [ -f "node_modules/.yarn-state.yml" ]; then
  log_info "Dependencies already installed (node_modules/.yarn-state.yml exists)"
else
  log_info "Installing dependencies..."
  yarn install
fi

# Check if build is complete by looking for a generated file
# ERTP's paymentLedger.d.ts is generated during build
BUILD_MARKER="packages/ERTP/src/paymentLedger.d.ts"
if [ -f "$BUILD_MARKER" ]; then
  log_info "Build artifacts present ($BUILD_MARKER exists)"
else
  log_info "Building all packages (this may take several minutes)..."
  yarn build
fi

log_info "Bootstrap complete. Environment is ready."
log_info ""
log_info "Useful commands:"
log_info "  yarn test          - Run all tests"
log_info "  yarn lint          - Check for lint errors"
log_info "  yarn build         - Rebuild all packages"
