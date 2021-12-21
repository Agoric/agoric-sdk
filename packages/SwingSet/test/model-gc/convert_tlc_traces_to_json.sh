# Use tla2json to convert each state in the stdout output of TLC into json format
# Post processing is required to group these states into traces

# Uses https://github.com/japgolly/tla2json

for f in tlc_out/multi_*.txt; do
    echo "$f";
    base=$(basename "$f" .txt)
    java -jar tla2json-1.0.1.jar tlc_out/$base.txt > tlc_out/$base.json
done
