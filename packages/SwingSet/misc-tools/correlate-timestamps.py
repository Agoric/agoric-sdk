import sys

from parse_timestamps import parse_file

# Point this at a slogfile, and optionally a vatid to filter upon. It
# will produce a report per delivery that breaks out the various times
# spent processing within the worker, piping message to/from the
# kernel process, and waiting for the kernel to respond to syscalls.

fn = sys.argv[1]
vatID = sys.argv[2] if len(sys.argv) > 2 else None

deliveries = parse_file(fn, vatID)

fill = "                         "
prev_d = None
for d in deliveries:
    total_worker = 0
    total_kernel = 0
    total_pipe = 0
    if prev_d:
        kerneltime = d.tx_delivery - prev_d.rx_result
        print("                                          %.6f kern between-cranks" % kerneltime)
    prev_d = d
    print("c%d %s %s" % (d.cranknum, d.vatID, d.description))
    if d.rx_delivery:
        print("                                                          k -> %.6f -> w   (send delivery)" % (d.rx_delivery - d.tx_delivery))
        #d.tx_result - d.rx_delivery,
        total_pipe += (d.rx_delivery - d.tx_delivery)
    else:
        print("                                             k -> w   (send delivery)")
    prev_event = None
    for event in d.events:
        if not prev_event and d.rx_delivery and event.tx_request:
            print("%s%.6f worker" % (fill, event.tx_request - d.rx_delivery))
            total_worker += (event.tx_request - d.rx_delivery)
        if prev_event and prev_event.rx_result and event.tx_request:
            print("%s%.6f worker" % (fill, event.tx_request - prev_event.rx_result))
            total_worker += (event.tx_request - prev_event.rx_result)
        prev_event = event
        if event.tx_request and event.rx_result:
            print("   w -> %.6f -> k,                    %.6f kern,  k -> %.6f -> w : %s" % (
                event.rx_request - event.tx_request,
                event.tx_result - event.rx_request,
                event.rx_result - event.tx_result,
                event.description))
            total_pipe += (event.rx_request - event.tx_request)
            total_kernel += (event.tx_result - event.rx_request)
            total_pipe += (event.rx_result - event.tx_result)
        else:
            print("   w ->     ?    -> k,       ?    worker  %.6f kern,  k ->     ?    -> w : %s" % (
                event.tx_result - event.rx_request,
                event.description))
    if prev_event and d.tx_result:
        print("%s%.6f worker" % (fill, d.tx_result - prev_event.rx_result))
        total_worker += (d.tx_result - prev_event.rx_result)
    if not prev_event and d.tx_result:
        print("%s%.6f worker" % (fill, d.tx_result - d.rx_delivery))
        total_worker += (d.tx_result - d.rx_delivery)
    if d.tx_result:
        print("   w -> %.6f -> k                                                          (return result)" % (d.rx_result - d.tx_result))
        total_pipe += (d.rx_result - d.tx_result)
    else:
        print("   w ->     ?    -> k                                                          (return result)")
    k_to_k = d.rx_result - d.tx_delivery
    if d.tx_result:
        print("   pipe %.6f, worker %.6f, kernel %.6f    total  (k->k %.6f)" % (
            total_pipe, total_worker, total_kernel, k_to_k))
    else:
        print("         total  (k->k %.6f)" % k_to_k)
    print()
