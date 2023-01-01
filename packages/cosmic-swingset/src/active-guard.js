import { makePromiseKit } from '@endo/promise-kit';

export const makeActiveGuard = () => {
  /** @type {Promise<void> | undefined} */
  let jobsCompleted;
  let active = false;
  /** @type {Array<{job: () => any, resolve: (result: any) => void}>} */
  const pendingJobs = [];

  const maybeProcessJobs = () => {
    if (active) {
      const jobs = pendingJobs.splice(0);
      jobsCompleted = Promise.all([
        jobsCompleted,
        ...jobs.map(({ job, resolve }) => {
          const result = Promise.resolve().then(job);
          resolve(result);
          return result.then(
            () => {},
            () => {},
          );
        }),
      ]).then(() => {});
    }
  };

  /** @param {() => any} job */
  const whenActive = async job => {
    const { resolve, promise } = makePromiseKit();
    pendingJobs.push({ job, resolve });
    maybeProcessJobs();
    return promise;
  };

  /**
   * @template {(...args: any[]) => any} T
   * @template {boolean} [D=true]
   * @param {T} fn
   * @param {D} [dropResult=true]
   * @returns {(...args: Parameters<T>) => (false extends D ? Promise<Awaited<ReturnType<T>>> : never) | (true extends D ? undefined : never)}
   */
  const whenActiveWrap =
    (fn, dropResult = true) =>
    (...args) => {
      const result = whenActive(() => fn(...args));
      if (dropResult) {
        result.catch(err => {
          console.warn('Unhandled rejection for active wrapped task', err);
        });
        return undefined;
      } else {
        return result;
      }
    };

  /** @param {boolean} newValue */
  const updateActive = async newValue => {
    active = newValue;
    maybeProcessJobs();
    return jobsCompleted;
  };

  return { whenActive, whenActiveWrap, updateActive };
};
