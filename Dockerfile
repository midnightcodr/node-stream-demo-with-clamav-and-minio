FROM node:14
ENV BUCKET=uploader
ENV CRYPTO_SECRET_KEY=fO6ZWqtFxcDMOmZ3yw7aEESVLQvEPmuE
ENV CRYPTO_IV=0Pw9l0MCoTpcG70kWKLjOw==
WORKDIR /home/node/app
COPY app /home/node/app/
RUN npm install
ENTRYPOINT [ "node" ]