


# input is decompressed slog on stdin

def iter_runs(iter_lines):
    continued_runs = []
    for run in iter_single_runs(lines_iter):
        if run.num == 0:
            continued_runs.append(run)
            yield continued_runs
            continued_runs = []
        else:
            if continued_runs:
                yield continued_runs
            continued_runs = [run]

for continued_runs in iter_runs(sys.stdin):
    # continued_runs is an array of len=1 or 2
    pass
