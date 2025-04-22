import type { CaipChainId } from '@agoric/orchestration';
/**
 * Tracks the health of relayer routes based on consecutive failures.
 *
 * Heap-based so all data will be lost upon vat restart, which is equivalent to
 * resetting the failures counts so that all routes are considered healthy
 * again until they reach the failure threshold.
 *
 * A route starts in the `Working` state. Each call to `noteFailure` increments
 * a counter for that route. If the counter reaches `maxFailures`, the route
 * transitions to the `Derelict` state. A call to `noteSuccess` resets the counter
 * and transitions the route back to `Working`, regardless of its current state.
 *
 * ```mermaid
 * stateDiagram-v2
 *   [*] --> Working: Initial state
 *   Working --> Working: noteFailure() [count < maxFailures]
 *   Working --> Derelict: noteFailure() [count == maxFailures]
 *   Working --> Working: noteSuccess() [reset count]
 *   Derelict --> Working: noteSuccess() [reset count]
 * ```
 * @param maxFailures The number of consecutive failures before a route is considered derelict.
 * @param cb
 * @param cb.onWorking Optional callback function called when a route transitions to the Working state.
 * @param cb.onDerelict Optional callback function called when a route transitions to the Derelict state.
 */
export const makeRouteHealth = (
  maxFailures: number,
  {
    onWorking = (_route: string) => {},
    onDerelict = (_route: string) => {},
  }: {
    onWorking?: (route: string) => void;
    onDerelict?: (route: string) => void;
  } = {},
) => {
  /** count consecutive failures */
  const failures = new Map<CaipChainId, number>();

  const getFailureCount = (route: CaipChainId) => failures.get(route) ?? 0;

  return {
    noteFailure: (route: CaipChainId) => {
      const oldCount = getFailureCount(route);
      const newCount = oldCount + 1;
      failures.set(route, newCount);
      // Transition from Working to Derelict
      if (newCount === maxFailures && oldCount < maxFailures) {
        onDerelict(route);
      }
    },
    /** Reset the failure count and potentially transition state */
    noteSuccess: (route: CaipChainId) => {
      const oldCount = getFailureCount(route);
      failures.delete(route);
      // Transition from Derelict to Working
      if (oldCount >= maxFailures) {
        onWorking(route);
      }
    },
    /**
     * A route is considered working until it reaches the threshold of failures.
     */
    isWorking: (route: CaipChainId) => {
      return getFailureCount(route) < maxFailures;
    },
  };
};
export type RouteHealth = ReturnType<typeof makeRouteHealth>;
