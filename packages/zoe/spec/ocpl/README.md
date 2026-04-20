# OCPL Reference

This subtree vendors a small, proof-relevant slice of the OCPL development
from:

- David Swasey, Deepak Garg, and Derek Dreyer,
  "Robust and Compositional Verification of Object Capability Patterns",
  Proc. ACM Program. Lang. 1, OOPSLA 2017.
- Paper: https://www.mpi-sws.org/~dreyer/papers/ocpl/paper.pdf
- Artifact: https://www.mpi-sws.org/~dreyer/papers/ocpl/ocpl.tgz

Why this is here:

- the Jessie counter proof is moving away from a purely syntactic
  backward-reachability argument
- OCPL gives a semantic pattern closer to the intended theorem:
  low-integrity values, adversarial contexts, and a robust-safety theorem
- this local copy is meant as a stable design reference while we adapt the
  proof shape to the reduced Jessie core

Vendored files:

- [upstream/README](./upstream/README)
- [upstream/theories/heap_lang/heap.v](./upstream/theories/heap_lang/heap.v)
- [upstream/theories/heap_lang/robust_safety.v](./upstream/theories/heap_lang/robust_safety.v)
- [upstream/theories/heap_lang/adequacy.v](./upstream/theories/heap_lang/adequacy.v)
- [upstream/theories/tests/readonly.v](./upstream/theories/tests/readonly.v)
- [modern_robust_safety.v](./modern_robust_safety.v)

Current porting policy:

- generic OCPL-to-current-Iris adaptation work lives under `ocpl/`
- Jessie case-study files should instantiate that port, not duplicate it
- `modern_robust_safety.v` is the current landing zone for that adaptation

The most relevant ideas for Jessie are:

- `low` / `lowval` in `heap.v`
- `safe` and `robust_safetyI` in `robust_safety.v`
- the top-level adequacy/robust-safety corollary in `adequacy.v`
- the use of `good_state` / `is_good` to express safety of linked execution
  without modeling adversarial code as containing assertions
- the `readonly` example as the smallest end-to-end pattern

Planned adaptation to Jessie:

- replace heap-language `lowval` with a Jessie predicate meaning:
  every old dynamic authority reachable from the attacker-visible value lies in
  the allowed initial authority set
- replace OCPL's meta-level `AdvCtx` with a Jessie attacker language that does
  not contain assertions
- add a Jessie analogue of `good_state` / `is_good`
- prove a Jessie analogue of robust safety:
  attacker execution from `cUp` cannot make old `decr` reachable and preserves
  global goodness
- derive the client-facing corollary about the original `c`:
  after attacker execution, `c.incr() > 0`

Licensing:

- OCPL source code is BSD-licensed; see [LICENSE](./LICENSE) and
  [LICENSE-CODE](./LICENSE-CODE)
