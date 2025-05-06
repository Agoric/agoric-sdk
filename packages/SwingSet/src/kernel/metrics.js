// All the kernel metrics we are prepared for.
export const KERNEL_STATS_SUM_METRICS = /** @type {const} */ ([
  {
    key: 'syscalls',
    name: 'swingset_all_syscall_total',
    description: 'Total number of SwingSet kernel calls',
  },
  {
    key: 'syscallSend',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'send' },
    description: 'Total number of SwingSet message send kernel calls',
  },
  {
    key: 'syscallCallNow',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'callNow' },
    description: 'Total number of SwingSet synchronous device kernel calls',
  },
  {
    key: 'syscallSubscribe',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'subscribe' },
    description: 'Total number of SwingSet promise subscription kernel calls',
  },
  {
    key: 'syscallResolve',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'resolve' },
    description: 'Total number of SwingSet promise resolution kernel calls',
  },
  {
    key: 'syscallExit',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'exit' },
    description: 'Total number of SwingSet vat exit kernel calls',
  },
  {
    key: 'syscallVatstoreGet',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'vatstoreGet' },
    description: 'Total number of SwingSet vatstore get kernel calls',
  },
  {
    key: 'syscallVatstoreSet',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'vatstoreSet' },
    description: 'Total number of SwingSet vatstore set kernel calls',
  },
  {
    key: 'syscallVatstoreGetNextKey',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'vatstoreGetNext' },
    description: 'Total number of SwingSet vatstore getNextKey kernel calls',
  },
  {
    key: 'syscallVatstoreDelete',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'vatstoreDelete' },
    description: 'Total number of SwingSet vatstore delete kernel calls',
  },
  {
    key: 'syscallDropImports',
    name: 'swingset_syscall_total',
    sub: { dimension: 'syscall', value: 'dropImports' },
    description: 'Total number of SwingSet drop imports kernel calls',
  },
  {
    key: 'dispatches',
    name: 'swingset_dispatch_total',
    description: 'Total number of SwingSet vat calls',
  },
  {
    key: 'dispatchDeliver',
    name: 'swingset_dispatch_deliver_total',
    description: 'Total number of SwingSet vat message deliveries',
  },
  {
    key: 'dispatchNotify',
    name: 'swingset_dispatch_notify_total',
    description: 'Total number of SwingSet vat promise notifications',
  },
]);

export const KERNEL_STATS_UPDOWN_METRICS = /** @type {const} */ ([
  {
    key: 'kernelObjects',
    name: 'swingset_kernel_objects',
    description: 'Active kernel objects',
  },
  {
    key: 'kernelDevices',
    name: 'swingset_kernel_devices',
    description: 'Active kernel devices',
  },
  {
    key: 'kernelPromises',
    name: 'swingset_kernel_promises',
    description: 'Active kernel promises',
  },
  {
    key: 'kpUnresolved',
    name: 'swingset_unresolved_kernel_promises',
    description: 'Unresolved kernel promises',
  },
  {
    key: 'kpFulfilled',
    name: 'swingset_fulfilled_kernel_promises',
    description: 'Fulfilled kernel promises',
  },
  {
    key: 'kpRejected',
    name: 'swingset_rejected_kernel_promises',
    description: 'Rejected kernel promises',
  },
  {
    key: 'runQueueLength',
    name: 'swingset_run_queue_length',
    consensus: true,
    description: 'Length of the kernel run queue',
  },
  {
    key: 'acceptanceQueueLength',
    name: 'swingset_acceptance_queue_length',
    consensus: true,
    description: 'Length of the kernel acceptance queue',
  },
  {
    key: 'promiseQueuesLength',
    name: 'swingset_promise_queues_length',
    consensus: true,
    description: 'Combined length of all kernel promise queues',
  },
  {
    key: 'clistEntries',
    name: 'swingset_clist_entries',
    description: 'Number of entries in the kernel c-list',
  },
  {
    key: 'vats',
    name: 'swingset_vats',
    description: 'Number of active vats',
  },
]);

const COUNTER = /** @type {const} */ ('counter');
const GAUGE = /** @type {const} */ ('gauge');

export const KERNEL_STATS_METRICS = harden([
  ...KERNEL_STATS_SUM_METRICS.map(m => ({ ...m, metricType: COUNTER })),
  ...KERNEL_STATS_UPDOWN_METRICS.map(m => ({ ...m, metricType: GAUGE })),
]);
