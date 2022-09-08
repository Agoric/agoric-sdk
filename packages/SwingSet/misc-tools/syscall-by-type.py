import sys, json, gzip, re, time
from parse_timestamps import parse_file, Syscall, Console

from collections import defaultdict
from pprint import pprint

# given a slogfile, display a report of how many syscalls were made
# (indexed by type), and how long each one took

# % python3 ../../syscall-by-type.py block30.slog
# | count | syscall type    | total measured | avg each | #uncor | extrapolated total |
# | ----- | --------------- | -------------- | -------- | ------ | ------------------ |
# |   83x |            send |       71500 us |   861 us |     5x |           75808 us |
# |   88x |         resolve |       60691 us |   689 us |     2x |           62070 us |
# |   21x |         callNow |       53533 us |  2549 us |     0x |           53533 us |
# |  433x |     vatstoreGet |       38169 us |    88 us |   221x |           57650 us |
# |   87x |       subscribe |       32308 us |   371 us |     5x |           34165 us |
# |  255x |     vatstoreSet |       30068 us |   117 us |    56x |           36671 us |
# |   45x |  vatstoreDelete |        4232 us |    94 us |    11x |            5267 us |
# |   27x |       (console) |        4078 us |   151 us |     0x |            4078 us |
# | totals|
# | 1039x |  (all syscalls) |      294582 us |   316 us |   300x |          329245 us |
# |       |     (call pipe) |      189840 us |   256 us |
# |       | (delivery pipe) |      457970 us |  2693 us |
# |       |    (total pipe) |      647810 us |

# This block included a delivery which did about 350 syscalls, which
# exceeds the xsnap timestamp buffer (#defined MAX_TIMESTAMPS 100), so
# 300 of them could not be correlated. Those are enumerated in the
# '#uncor' column, and the average of the successfully correlated ones
# are used to extrapolate a total amount of time for each type.

# The block as a whole performed 1039 worker-to-kernel calls (1012
# syscalls and 27 console.log), taking an extrapolated 329.245 ms. The
# slowest syscalls were callNow(), i.e. device invocations.

# syscall/console.log calls spent a measured total of 294.582ms
# sending messages across the kernel/worker netstring pipe. This
# includes time for the following steps:
# * The worker writes the request as a netstring to the OS pipe
# * Node.js reads the netstring request from the OS pipe (overlapping above)
# * the kernel parses the incoming netstring
# * the kernel does insistVatSyscallObject() to check the vso
# * the kernel uses vatSyscallToKernelSyscall() to translate the vso
# * (it does not include the time to invoke kernelSyscallHandler())
# * (it does not include translation of the results)
# * the kernel adds the syscall+results to the transcript
# * the kernel JSON.stringifies and netstring-wraps the syscall result
# * the kernel writes the response netstring into the OS pipe
# * the worker reads the response netstring from the OS pipe (overlapping above)

# the worker-side time includes:
# * xsnap copies netstring command or syscall-result into JS ArrayBuffer or string
# * vat JavaScript execution including supervisor and liveslots

# the kernel syscall time includes:
# * invocation of kernelSyscallHandler()
# * processing of the syscall including device execution if applicable
# * translation of the results

# the "delivery pipe" time includes:
# * (not translation of kernelDeliveryToVatDelivery)
# * transcript management
# * manager JSON-stringifies VDO, netstring-wraps
# * worker and Node.js read and write of netstring over OS pipe
# * xsnap renders the timestamp buffer and delivery metadata into a string
# * (not worker copy of netstring payload into JS ArrayBuffer or string)
# * (not worker-side JSON parsing, execution, syscalls)
# * kernel decodes netstring, JSON parses
# * insistVatDeliveryResult() (manager-helper.js/deliver())
# * insistVatDeliveryResult() (vat-warehouse.js/deliverToVat())

# the kernel turnaround time (between deliveries) includes:
# * insistVatDeliveryResult() (kernel.js/deliverAndLogToVat())
# * deliveryResult processing (deliveryCrankResults, others)
# * runPolicy updates
# * kernelKeeper.processRefcounts()
# * kernelKeeper.commitCrank()
# * then crank-finish event
# * processAcceptanceMessage
# and probably more

fn = sys.argv[1]
vatID = sys.argv[2] if len(sys.argv) > 2 else None

deliveries = parse_file(fn, vatID)

syscall_types = defaultdict(lambda: (0, 0.0)) # (count, elapsed)
total_syscalls = 0
total_time_correlated = 0.0
uncorrelated_syscalls = defaultdict(lambda: 0)
total_correlated_syscalls = 0
total_uncorrelated_syscalls = 0
total_pipe = 0.0
total_syscall_pipe = 0.0
total_correlated_deliveries = 0
total_uncorrelated_deliveries = 0
total_delivery_pipe = 0.0
total_kernel = 0.0

for d in deliveries:
    for event in d.events:
        if isinstance(event, Syscall):
            stype = event.vsc[0]
        elif isinstance(event, Console):
            stype = "(console)"
        else:
            raise Error("unknown event type")
        (count, elapsed) = syscall_types[stype]
        count += 1
        total_syscalls += 1
        event_elapsed = event.elapsed()
        if event_elapsed is not None:
            elapsed += event_elapsed
            total_time_correlated += event_elapsed
            total_syscall_pipe += event.pipetime() or 0.0
            total_pipe += event.pipetime() or 0.0
            total_kernel += event.kerneltime() or 0.0
            total_correlated_syscalls += 1
        else:
            uncorrelated_syscalls[stype] += 1
            total_uncorrelated_syscalls += 1
        syscall_types[stype] = (count, elapsed)
    delivery_pipe = d.pipetime()
    if delivery_pipe is not None:
        total_delivery_pipe += d.pipetime()
        total_pipe += d.pipetime()
        total_correlated_deliveries += 1
    else:
        total_uncorrelated_deliveries += 1

def us(elapsed):
    return int(elapsed * 1e6)

total_measured = 0.0
total_estimated = 0.0

print("| count |  syscall type    | total measured | avg each | #uncor | extrapolated total |")
print("| ----- | ---------------- | -------------- | -------- | ------ | ------------------ |")
for stype in sorted(syscall_types, key=lambda stype: syscall_types[stype][1], reverse=True):
    (count, elapsed) = syscall_types[stype]
    avg = elapsed / count
    estimated = elapsed
    uncorrelated = uncorrelated_syscalls[stype]
    estimated += uncorrelated * avg
    total_measured += elapsed
    total_estimated += estimated
    print("| %4dx | %16s |  %10s us |  %4s us | %5dx |      %10s us |" %
          (count, stype, us(elapsed), us(avg), uncorrelated, us(estimated)))
print("| totals|")
print("| %4dx | %16s |  %10s us |  %4s us | %5dx |      %10s us |" %
      (total_syscalls, "(all syscalls)", us(total_measured), us(total_estimated / total_syscalls), total_uncorrelated_syscalls, us(total_estimated)))
print("|       | %16s |  %10s us |  %4s us |" %
      ("(call pipe)", us(total_syscall_pipe), us(total_syscall_pipe / total_correlated_syscalls)))
print("|       | %16s |  %10s us |  %4s us |" %
      ("(delivery pipe)", us(total_delivery_pipe), us(total_delivery_pipe / total_correlated_deliveries)))
print("|       | %16s |  %10s us |" % ("(total pipe)", us(total_pipe)))
