docker run -p4318:4318 --rm -i -v$PWD/data:/data otel/opentelemetry-collector-contrib --config=/data/private-otel-collector.yaml 
#watch ls -l data
