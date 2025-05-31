#!/bin/bash
# Usage: ./download_specific_files.sh <owner> <repo> <branch> <folder> <destination> <file1> <file2> ...

set -euo pipefail

owner="$1"
repo="$2"
branch="$3"
folder="$4"
dest="$5"
shift 5
files_to_download=("$@")

api_url="https://api.github.com/repos/$owner/$repo/contents/$folder?ref=$branch"
mkdir -p "$dest"

curl -s "$api_url" | jq -r '.[] | select(.type=="file") | .name + " " + .download_url' \
  | while read -r filename url; do
    for wanted in "${files_to_download[@]}"; do
      if [[ "$filename" == "$wanted" ]]; then
        echo "Downloading $filename..."
        curl -sL "$url" -o "$dest/$filename"
      fi
    done
  done

echo "✅ Selected files downloaded to $dest"
