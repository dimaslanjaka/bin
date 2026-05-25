FROM mcr.microsoft.com/devcontainers/universal:2

USER root

#
# Node.js 22
#
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs

#
# PHP 8.3
#
RUN add-apt-repository ppa:ondrej/php -y \
  && apt-get update \
  && apt-get install -y \
    php8.3 \
    php8.3-cli \
    php8.3-common \
    php8.3-curl \
    php8.3-mbstring \
    php8.3-sqlite3 \
    php8.3-xml \
    php8.3-zip \
    composer

#
# Python 3.11
#
RUN apt-get update \
  && apt-get install -y python3.11 python3.11-venv python3-pip

USER codespace