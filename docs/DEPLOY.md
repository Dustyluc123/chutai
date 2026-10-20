# Como colocar o Chutaí no ar

Guia passo a passo para quem nunca fez deploy. São duas peças, em dois sites:

| Peça                                     | Onde                           | Por quê                                                             |
| ---------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Servidor de tempo real (`apps/realtime`) | [Railway](https://railway.com) | Precisa ficar ligado o tempo todo com conexões abertas (WebSocket). |
| Site (`apps/web`)                        | [Vercel](https://vercel.com)   | Feita para Next.js: build automático e páginas rápidas.             |

O banco de dados não entra agora: os temas continuam vindo dos arquivos JSON do repositório.

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

O repositório já tem o arquivo `railway.json` na raiz. Ele diz ao Railway como montar e ligar o servidor:

- build: `pnpm --filter @chutai/realtime build` (gera `apps/realtime/dist/index.js`);
- start: `node apps/realtime/dist/index.js`;
- verificação de saúde: a rota `/health`.

O Railway instala as dependências sozinho (inclusive o `sharp`, na versão para Linux) e usa o Node 22 indicado no `.nvmrc`. As imagens dos temas são lidas direto da pasta `apps/web/public`, que vai junto no deploy.

### 1.1. Criar o projeto

1. Entre em [railway.com](https://railway.com) e clique em **Login** → **Login with GitHub**.
2. Clique em **New Project** → **Deploy from GitHub repo**.
3. Se for a primeira vez, autorize o Railway a ver seus repositórios (pode liberar só o `chutai`).
4. Escolha o repositório **chutai**. O Railway cria um serviço e começa um primeiro deploy.

### 1.2. Conferir as configurações do serviço

Clique no serviço (o quadrado com o nome `chutai`) e abra a aba **Settings**:

- **Root Directory**: deixe **vazio** (a raiz do repositório). O servidor usa os pacotes de `packages/` e as imagens de `apps/web/public`, então precisa do repositório inteiro.
- **Build** e **Deploy**: os campos de comando devem aparecer preenchidos a partir do `railway.json` (build `pnpm --filter @chutai/realtime build`, start `node apps/realtime/dist/index.js`). Se estiverem vazios, preencha com esses valores.
- **Healthcheck Path**: `/health`.

### 1.3. Variáveis de ambiente

Abra a aba **Variables** e adicione (botão **New Variable**):

| Nome          | Valor                   | Para quê                                                 |
| ------------- | ----------------------- | -------------------------------------------------------- |
| `PORT`        | `3001`                  | Porta em que o servidor escuta.                          |
| `CORS_ORIGIN` | `http://localhost:3000` | Provisório. Na Parte 3 você troca pelo endereço do site. |
| `NODE_ENV`    | `production`            | Modo de produção.                                        |

Cada mudança de variável dispara um novo deploy automaticamente.

### 1.4. Gerar o endereço público

1. Ainda em **Settings**, procure a seção **Networking** → **Public Networking** → **Generate Domain**.
2. Se ele perguntar a porta, digite **3001** (a mesma da variável `PORT`).
3. Anote o endereço gerado, algo como `https://chutai-production-1234.up.railway.app`.

### 1.5. Testar

Abra no navegador o endereço + `/health`, por exemplo `https://chutai-production-1234.up.railway.app/health`. Deve aparecer algo assim:

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

| Nome                       | Valor                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_REALTIME_URL` | o endereço do Railway da Parte 1.4, **sem barra no final** (ex.: `https://chutai-production-1234.up.railway.app`) |

Clique em **Deploy** e espere uns minutos. No fim aparece o endereço do site, algo como `https://chutai.vercel.app`. Anote-o.

**Atenção:** o `NEXT_PUBLIC_REALTIME_URL` é gravado no site durante o build. Se um dia mudar esse valor, faça um novo deploy (aba **Deployments** → os três pontinhos do último deploy → **Redeploy**).

## Parte 3: voltar ao Railway e liberar o site

Por segurança, o servidor só aceita conexões dos endereços listados em `CORS_ORIGIN`. Agora que o site tem endereço:

1. No Railway, abra o serviço → **Variables**.
2. Troque `CORS_ORIGIN` pelo endereço da Vercel, **com `https://` e sem barra no final**, por exemplo `https://chutai.vercel.app`.
3. (Opcional) Adicione `ASSETS_BASE_URL` com esse mesmo endereço. É só uma reserva: se alguma imagem não estiver no disco do servidor, ele busca no site.
4. Espere o novo deploy terminar (aba **Deployments**).

Se quiser mais de um endereço (por exemplo, um domínio próprio e o da Vercel), separe por vírgula: `https://chutai.vercel.app,https://www.meudominio.com.br`.

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

| Sintoma                                                                 | O que verificar                                                                                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| O site diz que não conseguiu conectar ao servidor                       | `/health` do Railway abre? `NEXT_PUBLIC_REALTIME_URL` está certo e sem barra no final? Mudou o valor? Então faça **Redeploy** na Vercel.   |
| Funciona no `localhost`, mas não no site publicado                      | `CORS_ORIGIN` no Railway tem exatamente o endereço do site, com `https://` e sem barra no final.                                           |
| Funciona no endereço principal da Vercel, mas não num link de "preview" | Cada preview tem outro endereço e não está no `CORS_ORIGIN`. Teste no endereço principal (ou adicione o do preview, separado por vírgula). |
| No modo Imagem aparece "Não deu para carregar a imagem"                 | Abra o `/health`: `"images"` deve ser `"disco"`. Veja os **Deploy Logs** do Railway.                                                       |
| Build do Railway falhou                                                 | Abra os **Build Logs**. Confira se o Root Directory está vazio (raiz do repositório).                                                      |
| Build da Vercel falhou                                                  | Confira se o Root Directory é `apps/web`.                                                                                                  |

## Atualizações depois do primeiro deploy

- Cada `git push` no `main` faz os dois sites atualizarem sozinhos. O Railway só refaz o servidor quando mudam arquivos dele (lista `watchPatterns` no `railway.json`).
- As salas ficam na memória do servidor: um deploy no Railway derruba as partidas em andamento. Evite publicar mudanças no meio de uma partida com amigos.
- Para ver o que está acontecendo no servidor, use os **Deploy Logs** do Railway.
