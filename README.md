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

## Executar a Aplicação Localmente
### No diretório raiz do projeto, execute o comando:
    docker-compose up --build
    Acesse o frontend em http://localhost:4200 e a API em http://localhost:8000.

## Implantação na AWS
### Backend (Elastic Beanstalk)
#### Configure o Elastic Beanstalk:
    eb init -p docker pokemon-api --region us-east-1

#### Crie um ambiente e faça o deploy:
    eb create pokemon-api-env
    eb deploy

### Frontend (Amplify)
#### Inicialize o projeto Amplify:
    amplify init

#### Adicione hospedagem e configure o Continuous Deployment (CD):
    amplify add hosting
    amplify publish

## CI/CD com GitHub Actions
### API (Elastic Beanstalk)
#### Crie um arquivo .github/workflows/deploy-api.yml:

    name: Deploy API to Elastic Beanstalk

    on:
    push:
        branches:
        - main

    jobs:
    deploy:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout code
            uses: actions/checkout@v2

        - name: Set up Docker Buildx
            uses: docker/setup-buildx-action@v1

        - name: Log in to Amazon ECR
            id: login-ecr
            uses: aws-actions/amazon-ecr-login@v1

        - name: Build, tag, and push Docker image
            run: |
            docker build -t ${{ secrets.AWS_ECR_REPOSITORY }} .
            docker tag ${{ secrets.AWS_ECR_REPOSITORY }}:latest ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com/${{ secrets.AWS_ECR_REPOSITORY }}:latest
            docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com/${{ secrets.AWS_ECR_REPOSITORY }}:latest

        - name: Deploy to Elastic Beanstalk
            env:
            AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
            AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            AWS_REGION: ${{ secrets.AWS_REGION }}
            run: |
            eb init -p docker ${{ secrets.ELASTIC_BEANSTALK_APP }} --region ${{ secrets.AWS_REGION }}
            eb use ${{ secrets.ELASTIC_BEANSTALK_ENV }}
            eb deploy --staged

### Frontend (Amplify)
#### Crie um arquivo .github/workflows/deploy-frontend.yml:
    name: Deploy Frontend to Amplify

    on:
    push:
        branches:
        - main

    jobs:
    deploy:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout code
            uses: actions/checkout@v2

        - name: Set up Node.js
            uses: actions/setup-node@v2
            with:
            node-version: '14'

        - name: Install dependencies
            run: npm install
            working-directory: pokemon-frontend

        - name: Build project
            run: npm run build
            working-directory: pokemon-frontend

        - name: Deploy to Amplify
            env:
            AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
            AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            AWS_REGION: ${{ secrets.AWS_REGION }}
            run: |
            amplify publish --yes
            working-directory: pokemon-frontend

### Configuração de Segredos no GitHub
#### Adicione os seguintes segredos no repositório do GitHub (Configurações -> Secrets -> New repository secret):

    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_REGION
    AWS_ACCOUNT_ID
    AWS_ECR_REPOSITORY
    ELASTIC_BEANSTALK_APP
    ELASTIC_BEANSTALK_ENV

## Conclusão:
Com esta configuração, você terá uma aplicação full stack com backend em FastAPI e frontend em Angular, ambos conteinerizados e configurados para implantação na AWS. A integração contínua e entrega contínua (CI/CD) será gerenciada pelo GitHub Actions, garantindo que todas as mudanças no código sejam automaticamente testadas e implantadas.