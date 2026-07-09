/**
 * @file Chromium Trace Event format types
 * @see {@link https://chromium.googlesource.com/catapult/+/HEAD/tracing/README.md}
 * @see {@link https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview}
 */

/**
 * Common fields for all trace events.
 */
export interface TraceEventBase {
  /** The process ID for the event. */
  pid: number;
  /** The thread ID for the event. */
  tid: number;
  /**
   * The tracing clock timestamp of the event in microseconds.
   * For metadata events, this is typically 0.
   */
  ts: number;
  /**
   * The event phase. This is a single character that determines
   * how the event is interpreted.
   */
  ph: string;
  /** The name of the event, shown in the trace viewer. */
  name: string;
  /**
   * The event categories. This is a comma-separated list of categories
   * used for filtering.
   */
  cat?: string;
  /**
   * Any arguments provided for the event. Some phases have
   * specific argument requirements.
   */
  args?: Record<string, unknown>;
  /**
   * A fixed color name to use for the event.
   * @see {@link https://github.com/catapult-project/catapult/blob/master/tracing/tracing/base/color_scheme.html}
   */
  cname?: string;
  /**
   * A thread-local ID used for associating events with each other.
   * Typically used for async events.
   */
  id?: string | number;
  /**
   * A globally unique ID used for associating events across processes.
   */
  id2?: { global: string | number } | { local: string | number };
  /**
   * The scope of the event ID.
   */
  scope?: string;
  /**
   * The thread-local timestamp of the event in microseconds.
   */
  tts?: number;
}

/**
 * Complete Event ('X'): Combined duration events.
 */
export interface TraceCompleteEvent extends TraceEventBase {
  ph: 'X';
  /** The duration of the event in microseconds. */
  dur: number;
  /** The thread-local duration of the event in microseconds. */
  tdur?: number;
}

/**
 * Instant Event ('i'): Events with no duration.
 */
export interface TraceInstantEvent extends TraceEventBase {
  ph: 'i';
  /** The scope of the instant event. */
  s?: 'g' | 'p' | 't';
}

/**
 * Metadata Event ('M'): Events used to annotate the trace.
 */
export interface TraceMetadataEvent extends TraceEventBase {
  ph: 'M';
  name:
    | 'process_name'
    | 'thread_name'
    | 'process_labels'
    | 'process_sort_index'
    | 'thread_sort_index';
}

/**
 * Async Event: Events that can overlap and occur on different threads.
 * Uses 'b' (begin), 'n' (nestable begin), 'e' (end), 'f' (nestable end).
 */
export interface TraceAsyncEvent extends TraceEventBase {
  ph: 'b' | 'n' | 'e' | 'f' | 'S' | 'T' | 'p' | 'F';
}

/**
 * The root object of a Chromium Trace File.
 */
export interface TraceFile {
  /**
   * The list of trace events.
   */
  traceEvents: Array<
    | TraceEventBase
    | TraceCompleteEvent
    | TraceMetadataEvent
    | TraceInstantEvent
    | TraceAsyncEvent
  >;
  /**
   * A hint for the viewer about the time unit to use.
   */
  displayTimeUnit?: 'ms' | 'ns';
  /**
   * Other key-value pairs allowed at the root level.
   */
  [key: string]: unknown;
}
