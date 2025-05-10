# .gitpod.Dockerfile
FROM gitpod/workspace-full-vnc

USER gitpod

# Install Chrome
RUN sudo apt-get update && \
    sudo apt-get install -y \
    google-chrome-stable \
    && sudo rm -rf /var/lib/apt/lists/*

# Install extension testing tools
RUN npm install -g web-ext chrome-launcher