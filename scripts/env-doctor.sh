#!/bin/bash

set -e

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "Error: This script only works on macOS."
  echo "Your current operating system is: $(uname)"
  exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run a diagnostic and its remedy
run_diagnostic() {
  local description="$1"
  local diagnostic="$2"
  local remedy_description="$3"
  local remedy="$4"

  echo -e "${YELLOW}Diagnostic:${NC} $description"
  if eval "$diagnostic"; then
    echo -e "${GREEN}✓ Passed${NC}"
  else
    echo -e "${RED}✗ Failed${NC}"
    echo -e "${YELLOW}Remedy:${NC} $remedy_description"
    if [[ $AUTO_YES != "true" ]]; then
      read -p "Do you want to apply this remedy? (Yes/No/All) " answer
      case ${answer:0:1} in
        y | Y) ;;
        a | A) AUTO_YES=true ;;
        *) return ;;
      esac
    fi
    if ! eval "$remedy"; then
      echo -e "${RED}Remedy failed. Please seek more help.${NC}"
      exit 1
    fi
    echo "Remedy applied."
  fi
  echo
}

# Diagnostics and remedies
run_diagnostic \
  "Check if fnm is installed" \
  "command -v fnm >/dev/null 2>&1" \
  "Install fnm" \
  "brew install fnm"

run_diagnostic \
  "Check if Node.js is installed" \
  "command -v node >/dev/null 2>&1" \
  "Install Node.js using fnm" \
  "fnm install --lts && fnm use lts-latest"

run_diagnostic \
  "Check if Node.js version matches .node-version" \
  "[ \"$(node --version)\" = \"v$(cat .node-version)\" ]" \
  "Install the correct Node.js version using fnm" \
  "fnm install $(cat .node-version) && fnm use $(cat .node-version)"

run_diagnostic \
  "Check if Yarn version matches package.json" \
  "[ \"$(yarn --version)\" = \"$(node -p "require('./package.json').packageManager.split('@')[1]")\" ]" \
  "Install correct Yarn version" \
  "corepack enable && yarn set version $(node -p "require('./package.json').packageManager.split('@')[1]")"

run_diagnostic \
  "Check if Git is installed" \
  "command -v git >/dev/null 2>&1" \
  "Install Git" \
  "brew install git"

run_diagnostic \
  "Check if VSCode is installed" \
  "command -v code >/dev/null 2>&1" \
  "Install Visual Studio Code" \
  "brew install --cask visual-studio-code"

run_diagnostic \
  "Check if Docker is installed" \
  "command -v docker >/dev/null 2>&1" \
  "Install Docker" \
  "brew install --cask docker"

run_diagnostic \
  "Build repo" \
  "yarn build" \
  "Clean, reinstall dependencies, and rebuild" \
  "git clean -fdx "**/node_modules" "**/bundles" && yarn install && yarn build"

# Function to run a recommendation
run_recommendation() {
  local description="$1"
  local recommendation="$2"

  echo -e "${BLUE}Recommendation:${NC} $description"
  if [[ $AUTO_YES != "true" ]]; then
    read -p "Do you want to apply this recommendation? (Yes/No/All) " answer
    case ${answer:0:1} in
      y | Y) ;;
      a | A) AUTO_YES=true ;;
      *) return ;;
    esac
  fi
  eval "$recommendation"
  echo "Recommendation applied."
  echo
}

echo -e "${GREEN}Environment check complete.${NC}"

# Recommendations
run_recommendation \
  "Configure VS Code with recommended settings" \
  "./scripts/configure-vscode.sh"

run_recommendation \
  "Run yarn doctor in a3p-integration" \
  "cd a3p-integration && yarn doctor && cd .."

echo -e "${GREEN}All checks and recommendations complete.${NC}"
