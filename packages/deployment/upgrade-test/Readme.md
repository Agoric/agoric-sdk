# Dockerized Chain Upgrade Tester

This will build all previous upgrades and upgrade each one
1. `docker build .`

This will run the upgradehandler for the latest upgrade
2. `docker run --expose 26656 --expose 26657 --rm -it <image_id_from_step_1>`