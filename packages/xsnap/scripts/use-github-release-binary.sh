#!/usr/bin/env bash

set -euo pipefail

version="${1:-}"
out_dir="${2:-}"
repo="${XSNAP_BINARY_REPO:-Agoric/xsnap-worker-binaries}"

if [[ -z "$version" || -z "$out_dir" ]]; then
  echo "Usage: $0 <version> <output-dir>" >&2
  echo "Environment:" >&2
  echo "  XSNAP_BINARY_REPO (default: Agoric/xsnap-worker-binaries)" >&2
  echo "  XSNAP_ENV_FILE (default: <output-dir>/xsnap-binary.env)" >&2
  exit 1
fi

mkdir -p "$out_dir"
tag="v$version"
tarball="xsnap-worker-binaries-$version.tar.gz"
manifest_name="xsnap-worker-manifest-$version.json"
env_file="${XSNAP_ENV_FILE:-$out_dir/xsnap-binary.env}"

case "$(uname -s)" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  *)
    echo "Unsupported host OS: $(uname -s)" >&2
    exit 1
    ;;
esac

case "$(uname -m)" in
  x86_64|amd64) arch="x64" ;;
  arm64|aarch64) arch="arm64" ;;
  *)
    echo "Unsupported host architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

target="$os-$arch"

gh release download "$tag" \
  --repo "$repo" \
  --pattern "$tarball" \
  --pattern "$manifest_name" \
  --dir "$out_dir"

release_entry="dist/$target/release/xsnap-worker"
debug_entry="dist/$target/debug/xsnap-worker"
found_release=false
found_debug=false

mapfile -t tar_entries < <(tar -tvzf "$out_dir/$tarball")
for line in "${tar_entries[@]}"; do
  [[ -n "$line" ]] || continue
  type="${line:0:1}"
  entry="${line##* }"
  entry="${entry%/}"
  if [[ -z "$entry" || "$entry" = /* || "$entry" == *'\'* ]]; then
    echo "Refusing to extract unsafe archive path: $entry" >&2
    exit 1
  fi
  IFS='/' read -r -a parts <<<"$entry"
  for part in "${parts[@]}"; do
    if [[ "$part" == ".." ]]; then
      echo "Refusing to extract archive path traversal: $entry" >&2
      exit 1
    fi
  done
  allowed=false
  for expected in "${expected_entries[@]}"; do
    if [[ "$entry" == "$expected" ]]; then
      allowed=true
      break
    fi
  done
  if [[ "$allowed" != true ]]; then
    echo "Refusing to extract unexpected archive path: $entry" >&2
    exit 1
  fi
  if [[ "$type" != "-" && "$type" != "d" ]]; then
    echo "Refusing to extract non-regular archive entry: $entry" >&2
    exit 1
  fi

  if [[ "$entry" == "$release_entry" ]]; then
    found_release=true
  fi
  if [[ "$entry" == "$debug_entry" ]]; then
    found_debug=true
  fi
done

if [[ "$found_release" != true || "$found_debug" != true ]]; then
  echo "Missing binaries for target $target in release bundle" >&2
  exit 1
fi

tar -xzf "$out_dir/$tarball" -C "$out_dir" "$release_entry" "$debug_entry"

release_bin="$out_dir/dist/$target/release/xsnap-worker"
debug_bin="$out_dir/dist/$target/debug/xsnap-worker"

if [[ ! -f "$release_bin" || ! -f "$debug_bin" ]]; then
  echo "Missing binaries for target $target in release bundle" >&2
  exit 1
fi

chmod +x "$release_bin" "$debug_bin"

manifest_path="$out_dir/$manifest_name"

release_expected="$(
  node -e '
    const fs = require("fs");
    const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const target = process.argv[2];
    process.stdout.write(manifest.targets[target].release.sha256);
  ' "$manifest_path" "$target"
)"

debug_expected="$(
  node -e '
    const fs = require("fs");
    const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const target = process.argv[2];
    process.stdout.write(manifest.targets[target].debug.sha256);
  ' "$manifest_path" "$target"
)"

sha256_file() {
  local path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
  else
    shasum -a 256 "$path" | awk '{print $1}'
  fi
}

release_actual="$(sha256_file "$release_bin")"
debug_actual="$(sha256_file "$debug_bin")"

if [[ "$release_expected" != "$release_actual" ]]; then
  echo "Release binary hash mismatch for $target" >&2
  exit 1
fi

if [[ "$debug_expected" != "$debug_actual" ]]; then
  echo "Debug binary hash mismatch for $target" >&2
  exit 1
fi

cat >"$env_file" <<EOF
XSNAP_WORKER=$release_bin
XSNAP_WORKER_DEBUG=$debug_bin
EOF

echo "Prepared xsnap binaries for $target"
echo "Env file: $env_file"
