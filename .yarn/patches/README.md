# Dependency patch notes

## sigstore 4.1.0: recover equivalent Rekor entries

`sigstore-npm-4.1.0-c356de95f4.patch` enables the existing
`fetchOnConflict` recovery path for Rekor v1 when generating npm provenance.
If entry creation returns HTTP 409 with a `Location` header, the client fetches
that entry and continues building the provenance bundle. It does not suppress
other errors or disable provenance verification.

- Upstream disposition: issue filed, [npm/cli#10078](https://github.com/npm/cli/issues/10078).
  Related default-behavior discussion: [sigstore/sigstore-js#1708](https://github.com/sigstore/sigstore-js/issues/1708).
- Checked against sigstore 4.1.0 on 2026-11-12; applies cleanly.
- Scope: the root Yarn resolution covers lerna-lite's `libnpmpublish` and
  `pacote` consumers of `sigstore@^4.0.0`. It does not patch a globally installed
  npm CLI or add recovery to Rekor v2.
- Retirement: remove the patch when the resolved publishing dependency path
  enables equivalent-entry recovery upstream. Confirm behavior, not just issue
  closure, before removing it.
