# we have an eval.sh so we can run prepare.sh before the rest

echo "[$PROPOSAL] Running prepare.sh"
./prepare.sh

echo "[$PROPOSAL] Running proposal declared in package.json"
# copy to run in the proposal package so the dependencies can be resolved
cp /usr/src/upgrade-test-scripts/eval_submission.js .
./eval_submission.js
