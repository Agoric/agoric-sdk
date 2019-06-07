FROM debian:stretch

RUN apt-get update -y && apt-get install gcc python3 python3-venv python3-dev -y && apt-get clean -y

WORKDIR /usr/src/app
RUN python3 -mvenv ve3
RUN ve3/bin/pip install wheel
COPY . provisioning-server/
RUN ve3/bin/pip install provisioning-server/
ENTRYPOINT ["ve3/bin/ag-pserver"]
