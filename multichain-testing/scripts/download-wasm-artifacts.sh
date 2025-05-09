#!/bin/bash

# Usage: ./download_specific_files.sh <owner> <repo> <branch> <folder> <destination> <file1> <file2> ...

OWNER="$1"
REPO="$2"
BRANCH="$3"
FOLDER="$4"
DEST="$5"
shift 5
FILES_TO_DOWNLOAD=("$@")

API_URL="https://api.github.com/repos/$OWNER/$REPO/contents/$FOLDER?ref=$BRANCH"
mkdir -p "$DEST"

curl -s "$API_URL" | jq -r '.[] | select(.type=="file") | .name + " " + .download_url' \
  | while read -r filename url; do
    for wanted in "${FILES_TO_DOWNLOAD[@]}"; do
      if [[ "$filename" == "$wanted" ]]; then
        echo "Downloading $filename..."
        curl -sL "$url" -o "$DEST/$filename"
      fi
    done
  done

echo "✅ Selected files downloaded to $DEST"
