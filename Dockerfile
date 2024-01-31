# Use a base image with Node.js since Agoric SDK is Node.js based
FROM node:18

RUN apt-get update && apt-get install -y curl make build-essential jq

# Install Go
ENV GO_VERSION 1.20.13
RUN curl -OL https://golang.org/dl/go${GO_VERSION}.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm go${GO_VERSION}.linux-amd64.tar.gz
ENV PATH $PATH:/usr/local/go/bin

# Clone the Agoric SDK repository
WORKDIR /agoric-sdk
COPY . .

# Install Agoric SDK dependencies
RUN yarn install && yarn build

# Expose necessary ports
EXPOSE 8000 8000

# Start the Agoric blockchain and ag-solo
# You might need to use a script to start these services as they likely need to run in parallel
COPY start-agoric.sh .
RUN chmod +x start-agoric.sh
CMD ["./start-agoric.sh"]
