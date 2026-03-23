# Pokedex

Este projeto é uma aplicação full stack que lista e detalha os Pokémon utilizando a [PokeAPI](https://pokeapi.co/). O backend é construído com FastAPI e o frontend com Angular. A aplicação é conteinerizada com Docker e Docker Compose, e está configurada para ser implantada na AWS.

Objetivo deste README: organizar as instruções de forma clara, incluir recomendações de segurança (CORS, autenticação/autorização para endpoints que modificam dados, e rotação/gestão de segredos) e manter todas as instruções originais para build e deploy.

## Requisitos

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [AWS CLI](https://aws.amazon.com/cli/)
- [Elastic Beanstalk CLI (eb)](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html)
- [AWS Amplify CLI](https://docs.amplify.aws/cli/start/install/)

## Visão Geral do Backend (API)

O backend é feito com FastAPI. Abaixo estão instruções, o Dockerfile recomendado e observações de segurança.

### Dockerfile para a API

Crie um arquivo `Dockerfile-api` no diretório raiz do projeto com o seguinte conteúdo:

```
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.8

COPY ./app /app

RUN pip install --no-cache-dir -r /app/requirements.txt

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]
```

Observação: mantenha as instalações em `requirements.txt` atualizadas e minimize pacotes desnecessários.

## Frontend

O frontend é uma aplicação Angular. Crie um `Dockerfile-frontend` no diretório `pokemon-frontend` com o conteúdo abaixo:

```
FROM node:14

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .

EXPOSE 4200

CMD ["npm", "start"]
```

## Executar a Aplicação Localmente

No diretório raiz do projeto, execute o comando:

```
docker-compose up --build
```

Acesse o frontend em http://localhost:4200 e a API em http://localhost:8000.

## Segurança recomendada (CORS, Autenticação/Autorização, Gestão de Segredos)

Esta seção adiciona recomendações para fortalecer o projeto em produção. Elas não alteram o comportamento atual do projeto, mas descrevem boas práticas a serem adotadas:

- Restringir origens (CORS) somente para frontends conhecidos. Use variáveis de ambiente para definir a lista de origens permitidas (ex.: `ALLOWED_ORIGINS` com valores separados por vírgula). Isso facilita alteração sem rebuild.
- Adicionar autenticação e autorização para todos os endpoints "write" (POST/PUT/PATCH/DELETE). Em APIs públicas, prefira JWT/OAuth2 com scopes/roles; para serviços internos, considere API keys com rotação periódica.
- Gerir segredos em um cofre seguro (ex.: AWS Secrets Manager, HashiCorp Vault). Configure a aplicação para recuperar segredos em tempo de execução e rotacioná-los sem necessidade de rebuilds.
- Use IAM roles para instâncias/containers em ambientes AWS para evitar embutir credenciais.

Exemplo de como carregar origens permitidas e configurar CORS em FastAPI (exemplo de referência):

```
# app/core/cors.py (exemplo de referência)
from fastapi.middleware.cors import CORSMiddleware
import os

def get_allowed_origins():
    raw = os.getenv("ALLOWED_ORIGINS", "")
    return [o.strip() for o in raw.split(",") if o.strip()]

allowed_origins = get_allowed_origins()

# ao montar o app FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

Notas:
- Defina `ALLOWED_ORIGINS` via docker-compose, variáveis de ambiente no serviço ECS/EKS ou no Elastic Beanstalk.
- Para garantir que apenas frontends aprovados acessem a API, liste explicitamente os domínios/URLs do frontend.

Autenticação/Autorização (recomendações):
- Proteja endpoints de escrita com uma dependência que valide tokens e verifique permissões. Exemplo básico (pseudocódigo):

```
from fastapi import Depends, HTTPException, status

def get_current_user(token: str = Depends(oauth2_scheme)):
    user = verify_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    return user

def require_write_permission(user = Depends(get_current_user)):
    if not user.has_role("writer"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
```

Use essas dependências em endpoints que modificam dados (ex.: `@router.post(...)`), mantendo endpoints de leitura abertos conforme necessário.

Gestão de segredos e rotação:
- Armazene credenciais e chaves em um gerenciador de segredos (AWS Secrets Manager, Parameter Store em modo seguro, HashiCorp Vault).
- Use políticas de rotação automática quando suportado (ex.: Secrets Manager pode rotacionar credenciais de banco de dados).
- Conceda permissões temporárias via IAM roles e evite embutir segredos em código ou arquivos versionados.

Exemplo de consumo de segredo com AWS Secrets Manager (pseudocódigo):

```
# Exemplo de referência, não é código executável direto
import boto3
import os

def get_secret(secret_name: str) -> dict:
    region = os.getenv("AWS_REGION")
    client = boto3.client("secretsmanager", region_name=region)
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response["SecretString"])
```

Recomendação: implemente cache local com TTL para evitar chamadas excessivas ao cofre em cada request.

## Implantação na AWS

### Backend (Elastic Beanstalk)

Configure o Elastic Beanstalk:

```
eb init -p docker pokemon-api --region us-east-1
```

Crie um ambiente e faça o deploy:

```
eb create pokemon-api-env
eb deploy
```

Ao implantar na AWS, injete variáveis de ambiente seguras no ambiente do Elastic Beanstalk (por exemplo, `ALLOWED_ORIGINS`, nomes de segredos, ARNs de roles). Prefira usar o IAM Role para que a aplicação recupere segredos do Secrets Manager.

### Frontend (Amplify)

Inicialize o projeto Amplify:

```
amplify init
```

Adicione hospedagem e configure o Continuous Deployment (CD):

```
amplify add hosting
amplify publish
```

## CI/CD com GitHub Actions

Abaixo estão arquivos de workflow sugeridos para API e Frontend. Eles mantêm as instruções originais e adicionam a dica de usar segredos centralizados no GitHub (GitHub Secrets) para credenciais de build/deploy.

### API (Elastic Beanstalk)

Crie um arquivo `.github/workflows/deploy-api.yml` com as etapas sugeridas:

```
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
```

### Frontend (Amplify)

Crie um arquivo `.github/workflows/deploy-frontend.yml` com as etapas sugeridas:

```
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
```

### Configuração de Segredos no GitHub

Adicione os seguintes segredos no repositório do GitHub (Configurações -> Secrets -> New repository secret):

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- AWS_ACCOUNT_ID
- AWS_ECR_REPOSITORY
- ELASTIC_BEANSTALK_APP
- ELASTIC_BEANSTALK_ENV

Recomendação adicional: reduza o uso de chaves estáticas. Prefira utilizar as credenciais de curta duração obtidas via OIDC (GitHub Actions OIDC) ou roles vinculadas a contas de nuvem, e armazene segredos sensíveis no Secrets Manager.

## Conclusão

Com esta configuração, você terá uma aplicação full stack com backend em FastAPI e frontend em Angular, ambos conteinerizados e configurados para implantação na AWS. A integração contínua e entrega contínua (CI/CD) será gerenciada pelo GitHub Actions, garantindo que todas as mudanças no código sejam automaticamente testadas e implantadas.

Além das instruções originais, este README agora traz recomendações de segurança: controlar origens via variáveis de ambiente, proteger endpoints de escrita com autenticação/autorização, e armazenar/rotacionar segredos em um gerenciador seguro. Essas práticas aumentam a segurança e facilitam a operação em ambientes de produção.
