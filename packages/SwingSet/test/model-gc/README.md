_An instance of model-based testing applied to test userspace functionalities._

- `convert_tlc_traces_to_json.sh` | convert model checker output to json
- `generate_test_from_tlc_json_output.py` | convert json model checker output to scripts that are used to drive ava test
- `requirements.txt` | requirements for python script
- `test-model.js` | ava test file
- `tlcFolds.tla` | helper module for TLA+
- `traces.json` | JSON representation of test executions
- `typedefs.tla` | TLA+ type definition file
- `userspace.cfg` | TLA+ config file
- `userspace.tla` | contains TLA+ used to generate model-based tests
- `vat_bootstrap.js` | wires together test vats
- `vat_model.js` | implements a vat process

The TLC model checker is used to generate traces violating an invariant in `userspace.tla`. The traces are then converted to json using `convert_tlc_traces_to_json.sh`. `generate_test_from_tlc_json_output.py` is then used to convert the json traces to json scripts that can be used to drive the javascript testing.

## Instructions

```bash
# Typecheck model
apalache typecheck userspace.tla
# Create a directory for tlc output
mkdir -p tlc_out;
# Generate traces using model
java -XX:+UseParallelGC -Xmx12g -cp tla2tools.jar tlc2.TLC -workers auto -continue userspace.tla | tlc_out/tlc.txt;
# Convert traces to JSON
bash convert_tlc_traces_to_json.sh
# Generate python 
python3 generate_test_from_tlc_json_output.py

```
