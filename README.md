# Pokemon App

Este projeto é uma aplicação full stack que lista e detalha os Pokémon utilizando a [PokeAPI](https://pokeapi.co/). O backend é construído com FastAPI e o frontend com Angular. A aplicação é conteinerizada com Docker e Docker Compose, e está configurada para ser implantada na AWS.

## Requisitos

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [AWS CLI](https://aws.amazon.com/cli/)
- [Elastic Beanstalk CLI (eb)](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html)
- [AWS Amplify CLI](https://docs.amplify.aws/cli/start/install/)

## Backend (API)
### Crie um arquivo Dockerfile-api no diretório raiz do projeto com o seguinte conteúdo:

#### Dockerfile para a API
    FROM tiangolo/uvicorn-gunicorn-fastapi:python3.8

    COPY ./app /app

    RUN pip install --no-cache-dir -r /app/requirements.txt

    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]

## Frontend
### Crie um arquivo Dockerfile-frontend no diretório pokemon-frontend com o seguinte conteúdo:
### Dockerfile para o Frontend
    FROM node:14

    WORKDIR /app

    COPY package.json ./
    COPY package-lock.json ./

    RUN npm install

    COPY . .

    EXPOSE 4200

    CMD ["npm", "start"]
