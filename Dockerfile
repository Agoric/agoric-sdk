# If using a Debian/Ubuntu base image
FROM adarsh00/elys-network

# Switch to root user if needed
USER root

# Install curl
RUN apt-get update && apt-get install -y curl
