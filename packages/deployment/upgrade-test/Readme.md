# Dockerized Chain Upgrade Tester

This will build all previous upgrades and upgrade each one

1. `docker build --progress=plain -t docker-upgrade-test:latest .`

This will run the upgradehandler for the latest upgrade

2. `docker run -it -v "$PWD:/workspace" --env "SLOGFILE=/workspace/slog.slog" --entrypoint bash agoric-upgrade-test:latest -c "agd start --home netstate"`