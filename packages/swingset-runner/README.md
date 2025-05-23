<pre>
Command line:
  runner [FLAGS...] CMD [{BASEDIR|--} [ARGS...]]

FLAGS may be:
  --resume                  - resume execution using existing saved state
  --initonly                - initialize the swingset but exit without running it
  --sqlite                  - runs using Sqlite3 as the data store (default)
  --memdb                   - runs using the non-persistent in-memory data store
  --usexs                   - run vats using the XS engine
  --usebundlecache          - cache bundles created by swingset loader
  --dbdir DIR               - specify where the data store should go (default BASEDIR)
  --blockmode               - run in block mode (checkpoint every BLOCKSIZE blocks)
  --blocksize N             - set BLOCKSIZE to N cranks (default 200)
  --logtimes                - log block execution time stats while running
  --logmem                  - log memory usage stats after each block
  --logdisk                 - log disk space usage stats after each block
  --logstats                - log kernel stats after each block
  --logall                  - log kernel stats, block times, memory use, and disk space
  --logtag STR              - tag for stats log file (default "runner")
  --slog FILE               - write swingset slog to FILE
  --teleslog                - transmit a slog feed to the local otel collector
  --forcegc                 - run garbage collector after each block
  --batchsize N             - set BATCHSIZE to N cranks (default 200)
  --verbose                 - output verbose debugging messages as it runs
  --activityhash            - print out the current activity hash after each crank
  --audit                   - audit kernel promise reference counts after each crank
  --dump                    - dump a kernel state store snapshot after each crank
  --dumpdir DIR             - place kernel state dumps in directory DIR (default ".")
  --dumptag STR             - prefix kernel state dump filenames with STR (default "t")
  --raw                     - perform kernel state dumps in raw mode
  --stats                   - print a performance stats report at the end of a run
  --statsfile FILE          - output performance stats to FILE as a JSON object
  --benchmark N             - perform an N round benchmark after the initial run
  --sbench FILE             - run a whole-swingset benchmark with the driver vat in FILE
  --chain                   - emulate the behavior of the Cosmos-based chain
  --indirect                - launch swingset from a vat instead of launching directly
  --config FILE             - read swingset config from FILE instead of inferring it
  --cpu-profile-output      - specify where the cpu profile will be dumped (generated using engine's native inspector)
  --heap-profile-output     - specify where the heap profile will be dumped (generated using engine's native inspector sampler)
  --heap-sampling-interval  - override the sampling heap inteval (default value is 1024)

CMD is one of:
  help                      - print this helpful usage information
  run                       - launches or resumes the configured vats, which run to completion.
  batch                     - launch or resume, then run BATCHSIZE cranks or until completion
  step                      - steps the configured swingset one crank.
  shell                     - starts a simple CLI allowing the swingset to be run or stepped or
                              interrogated interactively.

BASEDIR is the base directory for locating the swingset's vat definitions and
  for storing the swingset's state.  If BASEDIR is omitted or '--' it defaults
  to, in order of preference:
    - the directory of the benchmark driver, if there is one
    - the directory of the config file, if there is one
    - the current working directory

Any remaining command line args are passed to the swingset's bootstrap vat in
the 'argv' vat parameter.
</pre>
