# Dockerized Chain Upgrade Tester

This will build all previous upgrades and upgrade each one

1. `docker build --progress=plain -t agoric/upgrade-test:latest -f Dockerfile upgrade-test-scripts`

This will run the upgradehandler for the latest upgrade

2. `docker run -it -v "$PWD:/workspace" --env "SLOGFILE=/workspace/slog.slog" --entrypoint bash agoric/upgrade-test:latest -c "agd start --home netstate"`

## To test with local sdk changes
1. `(cd ../ && make docker-build-sdk)`
2. then follow steps 1 and 2 above
