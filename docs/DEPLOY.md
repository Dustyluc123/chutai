# Como colocar o Chutaí no ar

Guia passo a passo para quem nunca fez deploy. São duas peças, em dois sites:

| Peça                                     | Onde                           | Por quê                                                             |
| ---------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Servidor de tempo real (`apps/realtime`) | [Railway](https://railway.com) | Precisa ficar ligado o tempo todo com conexões abertas (WebSocket). |
| Site (`apps/web`)                        | [Vercel](https://vercel.com)   | Feita para Next.js: build automático e páginas rápidas.             |

Hoje o Chutaí está no ar assim:

- Site: https://chutai-bay.vercel.app
- Servidor de tempo real: https://chutairealtime-production.up.railway.app (saúde em `/health`)

O banco de dados não entra agora: os temas continuam vindo dos arquivos JSON do repositório. O **Redis** entra (Parte 5): é ele que faz as partidas sobreviverem a um deploy.

**A ordem importa:**

1. Primeiro o servidor de tempo real (Railway), para ter o endereço dele.
2. Depois o site (Vercel), usando esse endereço.
3. Por fim, volte ao Railway e diga qual é o endereço do site (`CORS_ORIGIN`).

Os nomes dos botões podem mudar um pouco com o tempo; se não achar algum, procure por um nome parecido na mesma tela.

## Antes de começar

- O código precisa estar no GitHub, no branch `main` (é dele que os dois sites fazem o deploy).
- Tenha à mão uma conta no GitHub. As duas plataformas deixam entrar com ela.
- Custos: a Vercel tem um plano gratuito (Hobby) para projetos pessoais. O Railway dá um crédito inicial para testar e depois cobra pelo uso, num plano pago de baixo custo. Confira os preços atuais nos sites antes de começar.

## Parte 1: servidor de tempo real no Railway

O Railway instala as dependências sozinho (inclusive o `sharp`, na versão para Linux) e usa o Node 22 indicado no `.nvmrc`. As imagens dos temas são lidas direto da pasta `apps/web/public`, que vai junto no deploy.

Toda a configuração do serviço é feita **à mão, no painel** (aba **Settings**). O Railway não usa mais arquivo de configuração no repositório (`railway.json`, o antigo "Config as Code") em serviços novos, por isso o repositório não tem esse arquivo: os valores estão só neste guia.

### 1.1. Criar o projeto

1. Entre em [railway.com](https://railway.com) e clique em **Login** → **Login with GitHub**.
2. Clique em **New Project** → **Deploy from GitHub repo**.
3. Se for a primeira vez, autorize o Railway a ver seus repositórios (pode liberar só o `chutai`).
4. Escolha o repositório **chutai**.

O Railway percebe que é um monorepo e cria **dois serviços**: `@chutai/web` e `@chutai/realtime`. **Apague o `@chutai/web`**: o site fica na Vercel, e esse serviço só gastaria crédito. Clique nele → **Settings** → no fim da página, **Delete Service**.

### 1.2. Configurar o serviço `@chutai/realtime`

Clique no serviço `@chutai/realtime` e abra a aba **Settings**. Preencha:

| Campo                              | Valor                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Root Directory**                 | **vazio** (a raiz do repositório)                                                                            |
| **Build Command**                  | `pnpm --filter @chutai/realtime build`                                                                       |
| **Start Command**                  | `node apps/realtime/dist/index.js`                                                                           |
| **Healthcheck Path**               | `/health`                                                                                                    |
| **Healthcheck Timeout**            | `60`                                                                                                         |
| **Watch Paths** (um por linha)     | `/apps/realtime/**`<br>`/packages/**`<br>`/apps/web/public/temas/**`<br>`/package.json`<br>`/pnpm-lock.yaml` |
| **Serverless** (ou "App Sleeping") | **desligado**                                                                                                |

Por que cada um:

- **Root Directory vazio**: o servidor usa os pacotes de `packages/` e as imagens de `apps/web/public`, então precisa do repositório inteiro.
- **Watch Paths**: o Railway só refaz o servidor quando muda algum desses arquivos. Mudar só o site (por exemplo, um texto da página inicial) não derruba as salas.
- **Serverless desligado**: com ele ligado, o servidor "dorme" sem tráfego e as salas na memória somem.

### 1.3. Variáveis de ambiente

Abra a aba **Variables** e adicione (botão **New Variable**):

| Nome                                  | Valor                   | Para quê                                                                                                                      |
| ------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                | `3001`                  | Porta em que o servidor escuta.                                                                                               |
| `CORS_ORIGIN`                         | `http://localhost:3000` | Provisório. Na Parte 3 você troca pelo endereço do site.                                                                      |
| `NODE_ENV`                            | `production`            | Modo de produção.                                                                                                             |
| `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` | `15`                    | Tempo entre o aviso de desligar (`SIGTERM`) e o desligamento forçado. Dá tempo de o servidor antigo salvar as salas no Redis. |

Cada mudança de variável dispara um novo deploy automaticamente.

### 1.4. Gerar o endereço público

1. Ainda em **Settings**, procure a seção **Networking** → **Public Networking** → **Generate Domain**.
2. Se ele perguntar a porta, digite **3001** (a mesma da variável `PORT`).
3. Anote o endereço gerado. O do Chutaí é `https://chutairealtime-production.up.railway.app`.

### 1.5. Testar

Abra no navegador o endereço + `/health`, por exemplo `https://chutairealtime-production.up.railway.app/health`. Deve aparecer algo assim:

```json
{
  "ok": true,
  "rooms": 0,
  "uptimeSeconds": 42,
  "data": "json",
  "roomStore": "memory",
  "images": "disco"
}
```

- `"ok": true`: o servidor está no ar.
- `"images": "disco"`: as imagens do modo Imagem foram encontradas.

Se não abrir, veja a aba **Deployments** → o deploy mais recente → **Deploy Logs** (ou **Build Logs** se falhou no build).

## Parte 2: site na Vercel

### 2.1. Importar o projeto

1. Entre em [vercel.com](https://vercel.com) e clique em **Sign Up** (ou **Log In**) → **Continue with GitHub**.
2. No painel, clique em **Add New...** → **Project**.
3. Encontre o repositório **chutai** e clique em **Import**.

### 2.2. Configurar antes do primeiro deploy

Na tela **Configure Project**:

- **Root Directory**: clique em **Edit** e escolha **`apps/web`**. Este é o passo mais importante: sem ele a Vercel não acha o site.
- **Framework Preset**: deve aparecer **Next.js** sozinho.
- **Build and Output Settings**: não mexa. A Vercel percebe que é um monorepo pnpm, instala tudo pela raiz e roda `next build` dentro de `apps/web`. A versão do Node (22) vem do `package.json` do site.
- **Environment Variables**: adicione uma:

| Nome                       | Valor                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_REALTIME_URL` | o endereço do Railway da Parte 1.4, **sem barra no final** (ex.: `https://chutairealtime-production.up.railway.app`) |

Clique em **Deploy** e espere uns minutos.

**Atenção:** o `NEXT_PUBLIC_REALTIME_URL` é gravado no site durante o build. Se um dia mudar esse valor, faça um novo deploy (aba **Deployments** → os três pontinhos do último deploy → **Redeploy**).

### 2.3. Qual é o endereço do site

A Vercel mostra vários endereços, e só um é o certo:

- **O certo** é o que aparece em **Settings** → **Domains** (ou no topo da página do projeto). O do Chutaí é **`https://chutai-bay.vercel.app`**. Ele sempre aponta para o deploy mais recente da `main`.
- **Não use** os endereços de cada deploy (os compridos, como `chutai-abc123-seu-usuario.vercel.app`). Cada deploy ganha um novo, e eles não estão no `CORS_ORIGIN`.

### 2.4. Deploys de "preview" não conectam ao servidor (é esperado)

Cada branch que não é a `main` (por exemplo, o de um Pull Request) ganha um deploy de **preview** com endereço próprio. Esses endereços não estão no `CORS_ORIGIN` do Railway, então **o site do preview abre, mas não consegue criar nem entrar em salas**: aparece "Servidor do jogo fora do ar". Isso é esperado e não é um defeito. As páginas que não usam o servidor (início, temas, treino) funcionam normalmente.

Para testar o jogo de verdade, faça o merge na `main` e use o endereço de **Domains**.

## Parte 3: voltar ao Railway e liberar o site

Por segurança, o servidor só aceita conexões dos endereços listados em `CORS_ORIGIN`. Agora que o site tem endereço:

1. No Railway, abra o serviço `@chutai/realtime` → **Variables**.
2. Troque `CORS_ORIGIN` pelo endereço de **Domains** da Vercel, **com `https://` e sem barra no final**: `https://chutai-bay.vercel.app`.
3. (Opcional) Adicione `ASSETS_BASE_URL` com esse mesmo endereço. É só uma reserva: se alguma imagem não estiver no disco do servidor, ele busca no site.
4. Espere o novo deploy terminar (aba **Deployments**).

Se quiser mais de um endereço (por exemplo, um domínio próprio e o da Vercel), separe por vírgula: `https://chutai-bay.vercel.app,https://www.meudominio.com.br`.

## Parte 4: testar de verdade (computador e celular)

1. No computador, abra o site da Vercel e crie uma sala.
2. No celular, de preferência **no 4G/5G** (fora do Wi-Fi de casa, para testar como os amigos vão usar), abra o link da sala (botão **Copiar link** ou **Compartilhar**) e entre com outro apelido.
3. Jogue uma partida no modo **Clássico** e outra no modo **Imagem** (tema Fauna brasileira).
4. Confira:
   - os dois aparelhos aparecem na lista de jogadores;
   - o cronômetro anda igual nos dois;
   - no modo Imagem, a imagem aparece borrada e fica mais nítida a cada erro;
   - recarregar a página no meio da partida volta para a mesma sala.

## Quando algo dá errado

| Sintoma                                                       | O que verificar                                                                                                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| O site diz que não conseguiu conectar ao servidor             | `/health` do Railway abre? `NEXT_PUBLIC_REALTIME_URL` está certo e sem barra no final? Mudou o valor? Então faça **Redeploy** na Vercel.  |
| Funciona no `localhost`, mas não no site publicado            | `CORS_ORIGIN` no Railway tem exatamente o endereço de **Domains** (`https://chutai-bay.vercel.app`), com `https://` e sem barra no final. |
| Funciona no endereço principal, mas não num link de "preview" | Esperado (veja a Parte 2.4). Teste no endereço de **Domains** depois do merge.                                                            |
| No modo Imagem aparece "Não deu para carregar a imagem"       | Abra o `/health`: `"images"` deve ser `"disco"`. Veja os **Deploy Logs** do Railway.                                                      |
| Build do Railway falhou                                       | Abra os **Build Logs**. Confira o Root Directory (vazio) e o Build Command da Parte 1.2.                                                  |
| O Railway não refez o servidor depois de um push              | A mudança não tocou nenhum dos **Watch Paths**. Se precisar, clique em **Deploy** (ou **Redeploy**) na aba **Deployments**.               |
| Build da Vercel falhou                                        | Confira se o Root Directory é `apps/web`.                                                                                                 |
| Aparece um serviço `@chutai/web` no Railway                   | Apague (Parte 1.1). O site é só na Vercel.                                                                                                |

## Parte 5: Redis (partidas que sobrevivem a deploys e panes)

Sem Redis, as salas ficam só na memória do servidor e **um deploy derruba todas as partidas**. Com Redis, o servidor guarda a sala inteira (rodada, chutes, pontos e o horário de término de cada cronômetro). Num deploy, o servidor antigo salva tudo e o novo continua de onde parou; os jogadores veem "Reconectando…" por alguns segundos e voltam com os mesmos pontos e chutes.

### 5.1. Criar o Redis no Railway

1. Abra o projeto do Chutaí no Railway (o mesmo do serviço `@chutai/realtime`).
2. Clique em **+ Create** (ou **+ New**, no canto de cima) → **Database** → **Redis**.
3. Espere o serviço **Redis** aparecer no painel com o status ativo (leva menos de um minuto). Não precisa mudar nada nele.

### 5.2. Ligar o Redis no servidor

1. Clique no serviço **`@chutai/realtime`** → aba **Variables** → **New Variable**.
2. Nome: `REDIS_URL`. Valor: `${{Redis.REDIS_URL}}` (digite exatamente assim; o Railway completa com o endereço interno do Redis, que não paga tráfego de saída). Se o seu serviço de Redis tiver outro nome, troque `Redis` pelo nome dele.
3. Confira que `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` = `15` também está lá (Parte 1.3).
4. Clique em **Deploy** (ou espere o deploy automático da mudança de variável).

### 5.3. Conferir

Abra o `/health`: deve aparecer `"roomStore": "redis"`. Para testar de verdade: crie uma sala, comece uma partida, e no Railway clique em **Deployments** → três pontinhos do deploy ativo → **Redeploy**. Depois de alguns segundos a partida continua, com o mesmo cronômetro.

Nos **Deploy Logs** do servidor antigo aparece `Recebido SIGTERM, salvando as salas...` e `N sala(s) salva(s)`; no novo, `Sala ABC234 carregada do redis` quando cada sala volta.

### 5.4. Quanto custa

O Railway cobra a memória usada (US$ 10 por GB por mês) e um pouco de CPU. Um Redis com as salas do Chutaí usa uns 20 a 50 MB: **algo entre US$ 0,30 e US$ 1 por mês**. No plano Hobby (US$ 5 por mês, com US$ 5 de uso incluídos), isso costuma caber no que já está incluído junto com o servidor. Acompanhe em **Usage** no Railway na primeira semana.

### Como o Chutaí evita duas rodadas da mesma sala

Durante um deploy, o Railway deixa o servidor antigo e o novo ligados juntos por alguns segundos. Cada sala tem um **dono** gravado no Redis, com validade de 15 s renovada a cada 5 s. Só o dono roda os cronômetros e grava. O servidor novo só pega uma sala quando alguém entra nela, e só depois de o antigo soltar (no `SIGTERM`) ou de a posse vencer (se o antigo caiu sem avisar).

## Parte 6: Sentry (saber quando algo quebra)

O Sentry recebe os erros do site e do servidor, para você saber que algo quebrou sem depender de print dos amigos. O Chutaí manda **só o erro**: sem usuário, sem IP, sem apelidos, sem chutes, sem cabeçalhos e sem gravação de tela (Session Replay desligado). Sem as variáveis, nada muda.

### 6.1. Criar a conta e os projetos

1. Entre em [sentry.io](https://sentry.io) → **Get started** (dá para entrar com o GitHub). Escolha o plano gratuito (**Developer**).
2. Crie o primeiro projeto: **Projects** → **Create Project** → plataforma **Next.js** → nome `chutai-web` → **Create Project**. Na tela de instruções que aparece, **não rode o assistente** (o código já está pronto): só copie o **DSN** (um endereço que começa com `https://` e termina com `.ingest.sentry.io/...`). Se não aparecer, ele fica em **Settings** → **Projects** → `chutai-web` → **Client Keys (DSN)**.
3. Crie o segundo projeto: plataforma **Node.js** → nome `chutai-realtime`. Copie o DSN dele também.
4. Nos **dois** projetos: **Settings** → **Projects** → (projeto) → **Security & Privacy** → ligue **Prevent Storing of IP Addresses** e confira que **Data Scrubber** está ligado.
5. (Opcional) Em **Settings** → **Organization** → **Slug**, anote o nome curto da organização (para o `SENTRY_ORG`).

### 6.2. Variáveis

| Onde                                      | Nome                     | Valor                                                        | Secreta?                         |
| ----------------------------------------- | ------------------------ | ------------------------------------------------------------ | -------------------------------- |
| Vercel (Settings → Environment Variables) | `NEXT_PUBLIC_SENTRY_DSN` | DSN do projeto `chutai-web`                                  | Não (vai no código do navegador) |
| Railway (`@chutai/realtime` → Variables)  | `SENTRY_DSN`             | DSN do projeto `chutai-realtime`                             | Não                              |
| Vercel (opcional)                         | `SENTRY_AUTH_TOKEN`      | Token criado em **Settings** → **Auth Tokens** (organização) | **Sim** (marque como Sensitive)  |
| Vercel (opcional, junto com o token)      | `SENTRY_ORG`             | slug da organização                                          | Não                              |
| Vercel (opcional, junto com o token)      | `SENTRY_PROJECT`         | `chutai-web`                                                 | Não                              |

O token é opcional: sem ele, os erros do site chegam do mesmo jeito, só que com o código minificado (nomes curtos e linhas longas) em vez do código original. Na Vercel, as variáveis `NEXT_PUBLIC_*` entram no build: depois de criar, faça um **Redeploy**.

### 6.3. Conferir

- Site: abra o console do navegador no site publicado e rode `setTimeout(() => { throw new Error("teste do Sentry") })`. Em um ou dois minutos o erro aparece em **Issues** do `chutai-web`.
- Servidor: nos **Deploy Logs** do Railway aparece `Sentry: ligado`.

O plano gratuito inclui 5 mil erros por mês; o Chutaí mede desempenho só em 1% das visitas no site e nunca no servidor.

## Limites do plano gratuito da Vercel (Hobby)

Se o projeto passar de um limite do Hobby, a Vercel pode **pausar o recurso (ou o projeto) até completar 30 dias**. Conferido em outubro de 2026 em [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby):

| Recurso                   | Limite por mês | O Chutaí                                                                                                                                                                                                                                                                                                                     |
| ------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transformações de imagem  | 5 mil          | **Zero**: as imagens dos temas (405 `.webp` de ~11 KB) vão direto, sem otimização. Antes, cada imagem gerava até 6 tamanhos (~2.400 no total), refeitos sempre que o cache vencia.                                                                                                                                           |
| Requisições à CDN         | 1 milhão       | **O limite mais apertado.** Uma primeira visita faz ~27 requisições (scripts, fonte, pré-carregamento dos links do cabeçalho); navegar depois faz bem menos. Dá umas 30 a 40 mil visitas novas por mês. As imagens dos temas ficam 1 dia no cache do navegador e os links do rodapé não são pré-carregados, para economizar. |
| Transferência (Fast Data) | 100 GB         | Folgado: uma visita baixa uns 300 a 500 KB.                                                                                                                                                                                                                                                                                  |
| Execuções de função       | 1 milhão       | Folgado: cada chute do diário é uma execução; as páginas do diário ficam 60 s em cache.                                                                                                                                                                                                                                      |
| CPU ativa                 | 4 horas        | Atenção: as imagens de prévia do link da sala e do pódio são geradas na hora (uma por link colado). A imagem padrão do site é gerada no build.                                                                                                                                                                               |
| Eventos do Web Analytics  | 50 mil         | Cada visualização de página é um evento. Se passar, só a coleta do Analytics pausa por 7 dias; o site continua no ar.                                                                                                                                                                                                        |

Acompanhe em **Usage** no painel da Vercel. Se uma live trouxer muito tráfego e algum item passar de ~70%, o próximo passo é o plano Pro (US$ 20 por mês).

## Atualizações depois do primeiro deploy

- Cada `git push` no `main` faz os dois sites atualizarem sozinhos. O Railway só refaz o servidor quando mudam arquivos dos **Watch Paths**.
- **Com o Redis ligado (Parte 5), um deploy não derruba as partidas**: elas param por alguns segundos e continuam. Sem Redis, as salas ficam só na memória e um deploy derruba tudo.
- Para ver o que está acontecendo no servidor, use os **Deploy Logs** do Railway.
