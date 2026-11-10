# Watchtower

MVP local para cadastrar URLs HTTP/HTTPS, executar verificações periódicas e consultar disponibilidade e histórico.

## Ambiente

- Node.js 26 LTS e pnpm 10.0.0, conforme o ambiente recuperado do projeto.
- PostgreSQL 17, via Docker Desktop com integração ao Debian WSL.
- API NestJS na porta 3001 e frontend Next.js na porta 3000.

## Preparação

Execute os comandos na raiz do monorepo, dentro do Debian.

```bash
pnpm install --frozen-lockfile
cp -n infra/.env.example infra/.env
cp -n apps/api/.env.example apps/api/.env
cp -n apps/web/.env.example apps/web/.env.local
```

Defina a senha em `infra/.env` e a mesma senha na `DATABASE_URL` em `apps/api/.env`. Codifique caracteres reservados na senha da URL. Esses arquivos locais são ignorados pelo Git.

```bash
docker compose --env-file infra/.env -f infra/compose.yaml up -d
pnpm --filter api db:deploy
pnpm --filter api prisma:generate
pnpm --filter api build
```

O client é gerado em `apps/api/src/generated/prisma` e precisa ser regenerado após alterações no schema. `db:deploy` aplica as migrações versionadas, inclusive a tabela de histórico e os campos de agendamento adicionados nesta etapa.

## Execução

Abra três terminais na raiz do projeto.

```bash
pnpm --filter api start:dev
```

```bash
pnpm --filter worker start
```

```bash
pnpm --filter web dev
```

Abra http://localhost:3000. Cadastre uma URL pública, aguarde a primeira verificação e abra o cartão para ver as últimas 50 verificações, a taxa de sucesso nas últimas 24 horas e o tempo médio das respostas bem-sucedidas. A tela atualiza a cada 15 segundos enquanto a aba está visível. Pausar um monitor impede novas reservas pelo worker. Uma verificação já iniciada pode concluir após a pausa.

Após compilar a API, `pnpm --filter worker start` executa o worker compilado. Reinicie esse processo após alterações no código do worker. O pacote `apps/worker` é o ponto de entrada operacional do processo. O código do worker fica em `apps/api/src/monitoring` para reutilizar o Prisma Client e a configuração do NestJS. O worker cria um contexto Nest sem servidor HTTP e executa em processo independente da API.

## Verificações e concorrência

O worker consulta monitores vencidos a cada segundo e executa até cinco requisições em paralelo. Cada monitor é reservado por uma atualização condicional no PostgreSQL, com token e prazo de 60 segundos. O resultado e o próximo agendamento são gravados na mesma transação, somente pelo proprietário da reserva válida. Uma queda do processo libera a execução quando o prazo vence. O intervalo começa após a conclusão da verificação. Uma requisição interrompida após uma queda pode ser repetida, mas a gravação exige uma reserva válida.

HTTP 200–399 conta como sucesso. HTTP 400–599 conta como indisponível. Falhas de DNS, conexão, TLS e timeout são registradas com estados distintos. O tempo de resposta inclui DNS e redirecionamentos e termina ao receber os cabeçalhos. O worker segue até cinco redirecionamentos e aplica um prazo total por verificação.

Destinos privados, loopback, link-local e outros endereços reservados são bloqueados por padrão. A validação ocorre novamente em cada redirecionamento e a conexão usa o resultado DNS validado. Para monitorar serviços locais durante desenvolvimento, defina `ALLOW_PRIVATE_TARGETS=true` em `apps/api/.env`, em uma máquina de confiança.

## Endpoints

- `GET /health` verifica se a API responde.
- `GET /monitors` lista monitores e a última verificação.
- `POST /monitors` cria com `name`, `url`, `interval` e `timeout`.
- `GET /monitors/:id` consulta um monitor.
- `PATCH /monitors/:id` altera `enabled`.
- `GET /monitors/:id/checks?limit=50` retorna até 100 verificações recentes.
- `GET /monitors/:id/summary` calcula indicadores das últimas 24 horas.

Intervalos aceitos vão de 60 a 86400 segundos e timeout de 1 a 30 segundos. Valores fracionários são preservados. As datas da API usam ISO 8601 e a interface apresenta horários de Brasília. A disponibilidade exibida é uma estimativa baseada na proporção de amostras com sucesso.

## Validação

```bash
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api lint
pnpm --filter api build
pnpm --filter web lint
pnpm --filter web build
```

O teste de integração cria um banco temporário exclusivo no servidor configurado em `DATABASE_URL`, aplica as migrações e remove somente esse banco ao terminar. O usuário precisa ter permissão de criação de banco, como o usuário configurado pela imagem oficial do PostgreSQL neste ambiente local.

```bash
pnpm --filter api test:integration
```

O teste cria um monitor com alvo HTTP local, verifica persistência com outro client, concorrência entre dois workers, histórico, indicadores, pausa e recuperação de reserva expirada. O worker do teste consulta apenas o banco temporário criado para essa execução.

`bash scripts/verify-mvp.sh` reúne instalação, inicialização do PostgreSQL, migrações, geração do client, testes, lint e builds. O log fica em `apps/api/.temp/mvp-validation.log`.

Para validar reinicialização manualmente, cadastre um monitor, reinicie a API e confira a listagem. Execute o worker para verificar o histórico e pause-o pela página de detalhes. Interrompa a API e atualize o frontend para conferir o tratamento de erro.

## Escopo

Este MVP atende uso local com um operador. A API escuta em `127.0.0.1` por padrão. Autenticação, isolamento por usuário, notificações e configuração de produção são etapas futuras. O histórico é mantido integralmente no banco e as consultas da interface são limitadas. Uma política de retenção deve ser definida antes de operação prolongada.


## Integração contínua

O workflow `.github/workflows/ci.yml` roda em PRs destinados à `main` e em pushes à `main`. Também pode ser iniciado manualmente na aba Actions depois de estar na branch principal.

O job usa Node.js 26.13.0, pnpm 10.0.0 e um PostgreSQL 17 temporário. Instala as dependências pelo lockfile, gera o Prisma Client, aplica migrações e executa testes unitários, HTTP e de integração, lint e builds do backend/worker e frontend. As credenciais do banco do job são descartáveis. Os arquivos `.env` locais e o banco do desenvolvedor não são usados.

O resultado aparece no PR e na aba Actions. A primeira execução no GitHub precisa ser conferida após publicar a branch e abrir o PR. Para exigir o check antes de cada merge, configure uma regra de proteção da `main` com o check `Tests, lint and builds` obrigatório.

Referências oficiais: [PostgreSQL no GitHub Actions](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers), [cache do pnpm com setup-node](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md).
