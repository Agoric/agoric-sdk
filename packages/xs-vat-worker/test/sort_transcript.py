import sys
lines = sys.stdin.readlines()
lines.sort(key=lambda line: int(line.split(" ", 1)[0].split(".")[2]))
for line in lines:
    sys.stdout.write(line)
