<h1 align="center">Chutaí</h1>

<p align="center">
  <strong>Adivinhe o personagem antes dos seus amigos.</strong><br />
  Dle multiplayer em tempo real, no estilo Gartic Phone: crie uma sala, mande o código no grupo e chute.
</p>

<p align="center">
  <strong>Jogue agora: <a href="https://chutai-bay.vercel.app">chutai-bay.vercel.app</a></strong>
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socketdotio&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Drizzle-4169e1?logo=postgresql&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" />
  <a href="https://github.com/Dustyluc123/chutai/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Dustyluc123/chutai/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Testes" src="https://img.shields.io/badge/testes-197_passando-12a85f" />
</p>

<p align="center">
  <img src="docs/screenshots/inicio.png" alt="Página inicial do Chutaí com o tabuleiro de exemplo e o cartão para criar sala" width="900" />
</p>

---

## Índice

- [O que é](#o-que-é)
- [Como se joga](#como-se-joga)
- [Funcionalidades](#funcionalidades)
- [Telas](#telas)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar](#como-rodar)
- [Banco de dados e Redis](#banco-de-dados-e-redis)
- [Eventos do Socket.IO](#eventos-do-socketio)
- [Pontuação](#pontuação)
- [Testes](#testes)
- [Deploy](#deploy)
- [Criar um tema](#criar-um-tema)
- [Roadmap](#roadmap)
- [Sobre mim](#sobre-mim)

## O que é

Jogos "dle" (Wordle, Loldle e companhia) são divertidos, mas quase sempre solitários: um personagem por dia, cada um no seu canto. O **Chutaí** transforma o formato em festa: um anfitrião cria uma sala, os amigos entram pelo código e **todos tentam descobrir o mesmo personagem ao mesmo tempo**, competindo por pontos em várias rodadas, com placar ao vivo e pódio no final.

O projeto foi pensado para o público brasileiro, com temas nacionais desde o lançamento:

| Tema                              | Personagens | O que cada palpite compara                                                                   | Modo Imagem                  |
| --------------------------------- | ----------: | -------------------------------------------------------------------------------------------- | ---------------------------- |
| YouTubers e streamers             |          57 | Conteúdo, plataforma, quando começou, estado natal, região, nascimento                       | Parcial (50 com imagem)      |
| Música brasileira                 |          60 | Gênero, formato (solo, dupla ou grupo), estado de origem, região, início da carreira         | Parcial (57 com imagem)      |
| Futebol brasileiro atual          |          54 | Posição, clube, liga, estado ou país natal, nascimento, seleção principal                    | Parcial (52 com imagem)      |
| Famosos da TV                     |          50 | Mais conhecido como, estado natal, região, nascimento, início da carreira                    | Normal (todos com imagem)    |
| Personagens da história do Brasil |          58 | Área, período de nascimento (Colônia, Império, República), estado, região, nascimento, morte | Parcial (55 com imagem)      |
| Estados do Brasil                 |          27 | Região, população e área (IBGE), biomas, litoral, fronteira com outro país                   | Normal (todas as bandeiras)  |
| Folclore brasileiro               |          27 | Forma, região, onde aparece, quando aparece, comportamento                                   | Indisponível (16 com imagem) |
| Lendas do futebol                 |          60 | Posição, região e estado natal, nascimento, Copas, décadas na Seleção                        | Parcial (58 com imagem)      |
| Fauna brasileira                  |          40 | Grupo, biomas, alimentação, onde vive, peso                                                  | Normal (todos com imagem)    |

Os temas com pessoas reais (YouTubers, música, futebol atual, TV, história e lendas do futebol) seguem regras próprias: só adultos, só fatos públicos e neutros, dados conferidos na Wikipédia em português e no Wikidata, com o link de cada pessoa em [`packages/db/seed/FONTES.md`](packages/db/seed/FONTES.md) e a data dos dados na página do tema. Quem aparece no site pode pedir para ser removido pelo e-mail da página de créditos.

Na história do Brasil, alguns fatos não são conhecidos com certeza. Um ano aproximado aparece como "c. 1655" e vale com a margem de 10 anos; um local desconhecido aparece como "Incerto" em cinza e nunca conta como erro de quem chutou.

## Como se joga

1. **Crie a sala.** Escolha apelido, avatar e tema. Modo de jogo, rodadas, tempo e dicas são ajustados no lobby.
2. **Chame a galera.** Mande o código de 6 caracteres ou o link. Ninguém precisa de cadastro.
3. **Chute.** Há dois modos, escolhidos pelo anfitrião.

**Clássico.** Cada palpite mostra, atributo por atributo, o que bate com o personagem secreto:

| Cor                          | Significado                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| Verde                        | Igual ao do personagem secreto                              |
| Amarelo                      | Tem algo em comum (numa lista) ou chegou perto (num número) |
| Vermelho                     | Diferente                                                   |
| Seta para cima ou para baixo | Em números, mostra se a resposta é maior ou menor           |

**Imagem.** Aparece a imagem do personagem secreto bem borrada e pixelada. Cada chute errado e cada dica deixam a imagem um pouco mais nítida, em 5 níveis; a imagem nítida só aparece na revelação. No modo Imagem, o autocompletar e a lista de chutes mostram só o nome, sem imagem nem emoji, e a imagem começa ampliada num pedaço perto do centro, afastando o zoom a cada nível. Fica disponível quando pelo menos 75% dos personagens do tema (e no mínimo 10) têm imagem; abaixo de 100%, é o modo Imagem parcial, em que os personagens sem imagem ficam de fora do sorteio e do autocompletar da partida.

Quem acerta mais rápido, com menos chutes e sem dicas, leva mais pontos.

## Funcionalidades

- [x] Salas privadas com código de 6 caracteres e link de convite (copiar ou compartilhar)
- [x] Prévia bonita do link da sala no WhatsApp e nas redes: quem chamou, tema, jogadores e código (imagem gerada com `ImageResponse`)
- [x] Entrar como convidado, só com apelido e avatar
- [x] Lobby com lista de jogadores, vagas, regras editáveis pelo anfitrião e botão de expulsar
- [x] Salas de até **30 jogadores** para lives (o padrão é 8): lobby, placar, revelação e pódio compactos, com "Ver todos"
- [x] Partidas que sobrevivem a deploys e quedas do servidor (Redis), feito para o celular (tabuleiro, teclado, toques de 44 px)
- [x] Rodadas com cronômetro controlado pelo servidor
- [x] Contagem **5, 4, 3, 2, 1, Vai!** antes da primeira rodada (controlada pelo servidor: palpites recusados e nada da rodada enviado antes) e **3, 2, 1** no fim de cada intervalo
- [x] Sala abandonada no meio da partida (ninguém conectado por 60 s) é encerrada; sem ninguém, não começa rodada nova
- [x] Autocompletar acessível (teclado e leitor de tela) que ignora acentos e aceita apelidos ("Fenômeno" → Ronaldo)
- [x] Tabuleiro com peças que viram uma de cada vez, setas para números e tolerância para valores aproximados
- [x] Três modos de jogo: **Clássico** (atributos coloridos), **Imagem** (imagem borrada que fica mais nítida a cada erro ou dica) e **Misto** (alterna uma rodada Clássica e uma de Imagem; o intervalo avisa "Próxima: Imagem")
- [x] Modo Imagem parcial para temas com 75% ou mais de imagens; o lobby avisa quantos personagens ficam de fora
- [x] No modo Imagem, as opções mostram só o nome: sem miniatura nem emoji para comparar com a imagem borrada
- [x] Nove temas oficiais: seis com pessoas reais (YouTubers, música, futebol atual, TV, lendas do futebol e história do Brasil), Estados do Brasil com dados do IBGE e bandeiras, folclore e fauna, com fontes e data dos dados
- [x] Placar ao vivo **sem spoiler**: mostra chutes e quantos atributos cada um já acertou (ou, no modo Imagem, a nitidez de cada um), nunca o personagem
- [x] Dicas (revelar atributo, primeira letra) liberadas depois de 3 chutes, custando pontos
- [x] **Como jogar** na sala e no treino (abas Clássico e Imagem, com exemplo animado); na primeira vez numa sala, a explicação aparece sozinha no lobby
- [x] Cada peça do tabuleiro explica o que quer dizer ao tocar, passar o mouse ou focar ("Nascimento: 1993. O do personagem secreto é antes de 1993.")
- [x] Revelação do personagem ao fim de cada rodada, pódio final e "jogar de novo"
- [x] **Compartilhar resultado**: imagem do pódio (1080×1350, boa para WhatsApp e feed do Instagram) com o compartilhamento nativo do celular; no computador, baixa o PNG e oferece "Copiar texto"
- [x] Reconexão: recarregou a página ou a internet caiu? Volta para a mesma sala, com os mesmos pontos
- [x] Anfitrião passa para outro jogador se sair; rodada termina antes se todos os conectados acertarem
- [x] Modo treino individual e páginas públicas de cada tema (boas para o Google)
- [x] Página **Para professores** (`/professores`): como usar o jogo numa aula, configurações sugeridas e temas que combinam com a escola
- [x] **Desafio do dia** (`/diario`): um personagem por tema, o mesmo para todo mundo, que muda à meia-noite de Brasília. Sem tempo, com sequência de dias seguidos e resultado para compartilhar em quadradinhos, sem revelar o personagem
- [x] Imagem de cada personagem no autocompletar, no tabuleiro, na revelação, no treino e na página do tema; sem imagem, aparece o emoji
- [x] Imagens só com licença livre (Wikimedia Commons), com autor e licença de cada uma na página [/creditos](apps/web/public/temas/CREDITOS.md)
- [x] Sons gerados no navegador (Web Audio API, sem arquivos): chute errado e certo, alguém acertou, contagem, últimos 5 segundos, fim da rodada e pódio; música calma opcional. Botão **Som** com efeitos e música separados
- [x] Contagem de visitas com Vercel Web Analytics (só visualizações de página, sem cookies e sem dados pessoais)
- [x] Segurança: servidor autoritativo, validação com Zod, limite de ações por segundo e filtro de apelidos
- [x] Banco de dados (PostgreSQL + Drizzle) e Redis **já programados e testados**, prontos para ligar

## Telas

| Lobby                                        | Partida                                               |
| -------------------------------------------- | ----------------------------------------------------- |
| ![Lobby da sala](docs/screenshots/lobby.png) | ![Partida em andamento](docs/screenshots/partida.png) |

| Fim da rodada                                          | Pódio                                      |
| ------------------------------------------------------ | ------------------------------------------ |
| ![Personagem revelado](docs/screenshots/revelacao.png) | ![Pódio final](docs/screenshots/podio.png) |

<p align="center">
  <img src="docs/screenshots/celular.png" alt="Entrar pelo link, partida e revelação no celular" width="700" />
</p>

## Arquitetura

O navegador conversa com duas peças: o **site** (Next.js), por HTTP, para páginas e temas, e o **servidor de tempo real** (Node + Socket.IO), por WebSocket, durante a partida.

```mermaid
flowchart TB
    nav["Navegador do jogador<br/>React"]
    web["Site — Next.js<br/>páginas, temas, API HTTP"]
    rt["Servidor de tempo real — Node + Socket.IO<br/>salas, rodadas, palpites, pontos"]
    pg[("PostgreSQL<br/>temas, histórico<br/>(opcional)")]
    redis[("Redis<br/>retrato das salas<br/>(opcional)")]
    json["JSON dos temas oficiais<br/>packages/db/seed"]

    nav -- HTTP --> web
    nav <-- WebSocket --> rt
    web --> json
    rt --> json
    web -. com DATABASE_URL .-> pg
    rt -. com DATABASE_URL .-> pg
    rt -. com REDIS_URL .-> redis
```

Princípios que guiaram o código:

- **O servidor manda em tudo.** O navegador nunca recebe a resposta da rodada: envia o palpite e recebe a comparação já calculada. Não dá para descobrir o personagem pelo inspetor do navegador.
- **Regras do jogo isoladas.** `packages/game` é TypeScript puro, sem servidor nem React. Site e servidor usam as mesmas funções, e trocar o servidor por Bun ou Go no futuro não exige reescrever as regras.
- **Contrato tipado.** Os eventos do Socket.IO estão descritos em `packages/shared/src/events.ts`; um evento com nome ou formato errado vira erro de compilação nos dois lados.
- **Repositórios trocáveis.** Site e servidor pedem temas a uma interface (`ThemeRepository`). Hoje a implementação lê JSON; com `DATABASE_URL`, passa a ler o PostgreSQL sozinha.
- **Modo Imagem sem trapaça.** Borrar com CSS não protege nada: o navegador teria a imagem nítida e a URL dela, que contém o id do personagem. O servidor de tempo real lê a imagem original, aplica um disfarce sorteado a cada rodada (espelho, recorte, tom, zoom num ponto perto do centro que vai afastando) e gera com `sharp` as versões degradadas. A lista do autocompletar também vem do servidor (evento `room:characters`): no modo Imagem, sem imagens nem emojis, e só com os personagens da partida. Cada jogador recebe pelo Socket.IO só os bytes do nível que alcançou, sem nome de arquivo nem metadados; o navegador não tem como pedir outro nível.
- **A sala não conhece o Socket.IO.** `Room.ts` recebe intenções e fala com o mundo por um `emitter`, o que permite testar uma partida inteira com relógio falso.

## Tecnologias

| Camada           | Ferramenta                                       | Por quê                                                            |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| Linguagem        | TypeScript (tudo)                                | Tipos, regras e pontuação escritos uma vez e usados nos dois lados |
| Site             | Next.js 16 (App Router) + React 19               | Páginas de temas renderizadas no servidor, rotas e API simples     |
| Estilo           | Tailwind CSS 4, fonte Archivo variável           | Identidade própria com poucos tokens de cor e uma família só       |
| Tempo real       | Node.js + Socket.IO 4                            | Salas, reconexão e broadcast prontos                               |
| Validação        | Zod 4                                            | O mesmo esquema valida formulários e eventos no servidor           |
| Banco            | PostgreSQL + Drizzle ORM                         | Relacional, tipado, migrações em SQL legível                       |
| Estado das salas | Memória (local) / Redis (produção)               | Com Redis, as partidas sobrevivem a deploys e quedas               |
| Monorepo         | pnpm workspaces + Turborepo                      | Site, servidor e pacotes no mesmo repositório                      |
| Qualidade        | Vitest, PGlite, ESLint, Prettier, GitHub Actions | Testes de regras, de banco real em memória e de ponta a ponta      |

**Por que não uma linguagem "mais eficiente"?** Uma sala de dle troca poucas mensagens por segundo (palpites e placar). Um servidor Node bem feito aguenta milhares de jogadores numa máquina barata; o gargalo de um projeto novo é conseguir jogadores, não CPU. A separação das regras em `packages/game` deixa a porta aberta para trocar o servidor de tempo real por Bun ou Go se um dia for preciso.

## Estrutura de pastas

```
chutai/
├── apps/
│   ├── web/                         # Site em Next.js
│   │   ├── public/temas/            # Imagens dos personagens (<slug>/<id>.webp) e créditos
│   │   └── src/
│   │       ├── app/                 # Rotas: início, sala/[codigo], temas, treino, criar-tema, api/
│   │       ├── components/
│   │       │   ├── ui/              # Botão, campo, avatar, logo, avisos
│   │       │   ├── home/            # Cartão de criar sala, tabuleiro de exemplo, cartazes de tema
│   │       │   ├── lobby/           # Código da sala, jogadores, regras, entrar pelo link
│   │       │   ├── game/            # Campo de palpite, tabuleiro, peças, cronômetro, dicas, treino
│   │       │   ├── scoreboard/      # Placar ao vivo, revelação da rodada, pódio
│   │       │   └── layout/          # Cabeçalhos e rodapé
│   │       ├── hooks/               # useRoom (conversa com o servidor), useCountdown, useCharacterOptions
│   │       ├── lib/                 # Cliente do Socket.IO, identidade no navegador, temas no servidor
│   │       └── styles/              # Tokens de cor, fonte e animações
│   │
│   └── realtime/                    # Servidor de tempo real (Node + Socket.IO)
│       ├── src/
│       │   ├── index.ts             # Sobe o servidor
│       │   ├── app.ts               # Monta HTTP + Socket.IO + salas (usado também pelos testes)
│       │   ├── socket/
│       │   │   ├── handlers/        # room.ts, game.ts, guess.ts
│       │   │   └── middleware/      # Limite de ações por segundo, identificação do jogador
│       │   ├── rooms/
│       │   │   ├── Room.ts          # Estado e regras de uma sala
│       │   │   ├── RoomManager.ts   # Cria, encontra, limpa e restaura salas
│       │   │   └── store/           # memory.ts (local e testes) e redis.ts (produção)
│       │   ├── services/            # Temas com cache, salvar partida terminada
│       │   └── lib/                 # Erros, log, filtro de palavrões
│       └── tests/                   # Sala com relógio falso + partida real com dois clientes
│
├── packages/
│   ├── game/                        # Regras puras: compare, scoring, hints, draw, search
│   ├── shared/                      # Tipos, eventos do Socket.IO, esquemas Zod, constantes
│   └── db/                          # Banco
│       ├── src/schema.ts            # Tabelas (Drizzle)
│       ├── src/repositories/        # JSON (hoje) e PostgreSQL (futuro), mesma interface
│       ├── migrations/              # SQL gerado pelo drizzle-kit
│       ├── seed/                    # Temas oficiais em JSON, origem das imagens, FONTES.md e script que carrega no banco
│       ├── scripts/                 # fetch-images.ts: baixa as imagens do Commons e gera os créditos
│       └── tests/                   # Testes com PostgreSQL de verdade em memória (PGlite)
│
├── docs/DEPLOY.md                   # Passo a passo do deploy (Railway e Vercel)
├── docs/screenshots/                # Imagens deste README
├── docker-compose.yml               # PostgreSQL e Redis para rodar localmente
├── .github/workflows/ci.yml         # Lint, formatação, tipos, testes e build a cada push
└── .env.example
```

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 22.12 ou mais novo
- [pnpm](https://pnpm.io/) 10 (o jeito mais fácil: `corepack enable`)

Docker só é necessário se quiser testar o banco de dados.

### Passo a passo

```bash
# 1. Instale as dependências
pnpm install

# 2. (Opcional) copie as variáveis de ambiente; os valores padrão já funcionam
cp .env.example .env

# 3. Suba o site e o servidor de tempo real juntos
pnpm dev
```

Abra **http://localhost:3000**. O servidor de tempo real fica em http://localhost:3001 (veja http://localhost:3001/health).

Para testar o multiplayer sozinho, abra a sala em duas janelas (uma delas anônima) e entre com apelidos diferentes.

### Scripts

| Comando             | O que faz                                                                             |
| ------------------- | ------------------------------------------------------------------------------------- |
| `pnpm dev`          | Site (porta 3000) e servidor de tempo real (porta 3001) com recarga automática        |
| `pnpm build`        | Gera as versões de produção                                                           |
| `pnpm start`        | Roda as versões de produção                                                           |
| `pnpm test`         | Todos os testes                                                                       |
| `pnpm typecheck`    | Confere os tipos de todos os pacotes                                                  |
| `pnpm lint`         | ESLint                                                                                |
| `pnpm format`       | Formata o código com Prettier                                                         |
| `pnpm db:generate`  | Gera migração SQL a partir do schema (não precisa de banco)                           |
| `pnpm db:migrate`   | Aplica as migrações no banco de `DATABASE_URL`                                        |
| `pnpm db:seed`      | Carrega os temas oficiais no banco                                                    |
| `pnpm images:fetch` | Baixa as imagens dos temas do Wikimedia Commons, confere a licença e gera os créditos |

### Variáveis de ambiente

| Variável                       | Padrão                  | Para quê                                                                                                                        |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_REALTIME_URL`     | `http://localhost:3001` | Onde o navegador encontra o servidor de tempo real                                                                              |
| `NEXT_PUBLIC_SITE_URL`         | `http://localhost:3000` | Endereço público do site, para as prévias do link e o compartilhar                                                              |
| `DAILY_SECRET`                 | (vazio)                 | Chave do sorteio do desafio diário (só no servidor). Sem ela, o diário fica indisponível. **Nunca troque depois do lançamento** |
| `PORT`                         | `3001`                  | Porta do servidor de tempo real                                                                                                 |
| `CORS_ORIGIN`                  | `http://localhost:3000` | Origens que podem se conectar (separadas por vírgula)                                                                           |
| `ASSETS_DIR`                   | `apps/web/public`       | Pasta de onde o servidor de tempo real lê as imagens do modo Imagem                                                             |
| `ASSETS_BASE_URL`              | `http://localhost:3000` | Reserva: o servidor busca no site as imagens que não achar no disco                                                             |
| `DATABASE_URL`                 | (vazio)                 | Liga o PostgreSQL. Sem ela, temas vêm dos JSON                                                                                  |
| `REDIS_URL`                    | (vazio)                 | Liga o Redis: as salas sobrevivem a deploys e quedas. Sem ela, ficam só na memória                                              |
| `NEXT_PUBLIC_SENTRY_DSN`       | (vazio)                 | Liga o Sentry no site (erros do navegador e do servidor da Vercel). Sem ela, nada é enviado                                     |
| `SENTRY_DSN`                   | (vazio)                 | Liga o Sentry no servidor de tempo real                                                                                         |
| `SENTRY_AUTH_TOKEN`            | (vazio)                 | Opcional e **secreta**: envia os mapas do código no build, para os erros do site mostrarem o código original                    |
| `SENTRY_ORG`, `SENTRY_PROJECT` | (vazio)                 | Usadas junto com o `SENTRY_AUTH_TOKEN` (organização e projeto do site no Sentry)                                                |

## Banco de dados e Redis

O MVP roda **sem nenhum serviço externo**. Mesmo assim, a parte de dados já está escrita e testada, esperando só uma URL:

**PostgreSQL** (`packages/db`)

- Tabelas de usuários, temas, atributos, personagens, valores, partidas, jogadores, rodadas e palpites em `src/schema.ts`.
- Migração SQL pronta em `migrations/`.
- `DrizzleThemeRepository` lê temas do banco; `DrizzleMatchRepository` grava o histórico de cada partida terminada.
- Os testes sobem um **PostgreSQL de verdade em memória (PGlite)**, aplicam a migração, gravam os três temas e conferem que o que volta do banco é idêntico aos JSON.

Para ligar:

```bash
docker compose up -d                                   # sobe o PostgreSQL local
echo "DATABASE_URL=postgres://chutai:chutai@localhost:5432/chutai" >> .env
pnpm db:migrate                                        # cria as tabelas
pnpm db:seed                                           # carrega os temas oficiais
pnpm dev                                               # agora tudo vem do banco
```

**Redis** (`apps/realtime/src/rooms/store/redis.ts`)

Guarda a sala inteira: fase, rodada (a resposta fica só no servidor e no Redis), chutes, dicas, pontos e os horários de término. Se o servidor reiniciar (um deploy ou uma pane), a partida continua de onde parou: os cronômetros seguem pelo horário salvo e os jogadores reconectam pelo token salvo no navegador, sem perder pontos nem chutes. No modo Imagem, as imagens são geradas de novo com a mesma semente do disfarce.

Para um deploy não ter duas rodadas da mesma sala andando ao mesmo tempo, cada sala tem um **dono** no Redis (uma "posse" que vence em 15 s se não for renovada):

1. Só o servidor dono roda os cronômetros e grava o retrato (um script Lua confere a posse antes de gravar).
2. O servidor novo não pega salas ao ligar: carrega uma sala só quando alguém entra nela, e só depois de conseguir a posse.
3. No `SIGTERM`, o servidor antigo para os cronômetros, grava tudo, solta as posses e fecha as conexões. Os navegadores reconectam no novo.
4. Se o antigo cair sem avisar, a posse vence sozinha e o novo assume.

Sala encerrada (todo mundo saiu, abandono) apaga o retrato; sala esquecida expira sozinha depois de `EMPTY_ROOM_MINUTES`. Para ligar localmente: `docker compose --profile redis up -d` e `REDIS_URL=redis://localhost:6379`. Os testes usam um store em memória que imita o Redis e o `ioredis-mock` (que roda os scripts Lua); com `REDIS_TEST_URL`, rodam também num Redis de verdade.

## Eventos do Socket.IO

Contrato completo e tipado em [`packages/shared/src/events.ts`](packages/shared/src/events.ts).

| Evento                                   | Direção                       | Para quê                                                                                                                                                               |
| ---------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `room:create`                            | navegador → servidor          | Criar sala (quem cria vira anfitrião)                                                                                                                                  |
| `room:join`                              | navegador → servidor          | Entrar pelo código; com token, reconecta                                                                                                                               |
| `room:update-settings`                   | anfitrião → servidor          | Mudar tema, modo, rodadas, tempo, dicas                                                                                                                                |
| `room:kick`                              | anfitrião → servidor          | Expulsar jogador                                                                                                                                                       |
| `game:start`                             | anfitrião → servidor          | Começar a partida                                                                                                                                                      |
| `guess:submit`                           | navegador → servidor          | Chutar; a resposta volta com os atributos coloridos                                                                                                                    |
| `hint:request`                           | navegador → servidor          | Pedir dica                                                                                                                                                             |
| `game:restart`                           | anfitrião → servidor          | Voltar ao lobby depois do pódio                                                                                                                                        |
| `room:state`                             | servidor → todos              | Fonte da verdade: jogadores, fase (`lobby`, `countdown`, `round`, `intermission`, `finished`), placar. Chutes e dicas juntam os envios a cada 250 ms (salas de até 30) |
| `you:state`                              | servidor → um jogador         | Seus palpites e dicas (ex.: depois de reconectar)                                                                                                                      |
| `player:progress`                        | servidor → todos              | Progresso sem spoiler                                                                                                                                                  |
| `player:solved`                          | servidor → todos              | "Fulano acertou!"                                                                                                                                                      |
| `round:start` / `round:end` / `game:end` | servidor → todos              | Início (com o tipo da rodada: Clássica ou Imagem), revelação e fim                                                                                                     |
| `round:image`                            | servidor → um jogador         | Modo Imagem: os bytes do nível de nitidez que aquele jogador alcançou                                                                                                  |
| `room:characters`                        | servidor → sala ou um jogador | Personagens da partida para o autocompletar (no modo Imagem, só nome)                                                                                                  |

### Rotas HTTP do servidor de tempo real

| Rota                         | Para quê                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                | Saúde do servidor                                                                                                                 |
| `GET /themes`                | Lista de temas                                                                                                                    |
| `GET /rooms/:codigo/preview` | Prévia do link: só dados públicos (apelido e avatar do anfitrião, tema, jogadores, limite e fase). Nada da rodada. Limite por IP. |
| `GET /rooms/:codigo/result`  | Pódio da partida terminada (posição, apelido, avatar e pontos), para a imagem de compartilhar. Só enquanto a sala está no pódio.  |

## Desafio do dia

- Os chutes vão para a rota do próprio site `POST /api/diario/[slug]` (na Vercel), que confere o chute e só devolve a resposta depois do acerto. Funciona mesmo com o servidor de tempo real fora do ar.
- O personagem do dia sai de ciclos que passam por todo o tema sem repetir. A ordem de cada ciclo vem de um HMAC com a chave `DAILY_SECRET`: sem ela, não dá para prever.
- [`packages/db/seed/daily-roster.json`](packages/db/seed/daily-roster.json) guarda só quais personagens entram no diário e desde quando (nada sobre os dias). Personagem novo entra no próximo ciclo, então adicionar personagens não muda a resposta de hoje nem a de ontem. Depois de adicionar personagens a um tema, rode `pnpm daily:roster` (um teste avisa se esquecer).
- O dia do Chutaí #1 fica em `DAILY.launchDate`, em [`packages/game/src/config.ts`](packages/game/src/config.ts).
- Progresso, sequência e estatísticas ficam no `localStorage` do navegador.

## Pontuação

Só quem acerta pontua:

```
pontos = max(100, 500 + 500 × (tempo restante ÷ tempo total) − 40 × (chutes − 1) − 150 × dicas) + bônus
```

Bônus de +100 para o primeiro a acertar e +50 para o segundo. Exemplo: acertou com 60 de 90 segundos restantes, no 4º chute, sem dica, primeiro da sala: 500 + 333 − 120 + 100 = **813 pontos**. No modo Imagem, cada chute extra custa 80 em vez de 40, porque chutar errado também deixa a imagem mais nítida. Todos os números ficam em [`packages/game/src/config.ts`](packages/game/src/config.ts) para ajustar depois de testar com os amigos.

## Testes

```bash
pnpm test
```

| Pacote             | Testes | O que cobrem                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@chutai/game`     |     60 | Comparação de cada tipo de atributo, fórmula de pontos, dicas, sorteio, busca sem acento, níveis e zoom do modo Imagem, regra dos 75%                                                                                                                                                                                                                                                  |
| `@chutai/realtime` |     74 | Sala com relógio falso (rodadas, empates, reconexão, anfitrião, contagem antes da largada, sala abandonada encerrada depois de 60 s), modo Imagem e Imagem parcial (ninguém recebe um nível acima do que alcançou, nada vaza, sorteio só com quem tem imagem), geração das imagens com `sharp`, leitura das imagens do disco e **partidas inteiras com dois clientes Socket.IO reais** |
| `@chutai/web`      |     39 | Componentes de palpite (no modo Imagem, nada de imagem nem emoji), contagem regressiva, emojis das imagens geradas (sem CDN, a imagem sai sem emoji) e texto do pódio com empates                                                                                                                                                                                                      |
| `@chutai/db`       |     19 | Migrações e repositórios num PostgreSQL real em memória (PGlite), consistência dos temas, imagens, créditos e data dos dados                                                                                                                                                                                                                                                           |

## Deploy

O passo a passo completo, para quem nunca fez deploy, está em [`docs/DEPLOY.md`](docs/DEPLOY.md). Resumo:

| Peça                         | Onde             | Observação                                                                                                                                                                                |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tempo real (`apps/realtime`) | Railway          | Build, start, `/health` e watch paths preenchidos à mão no painel (valores no guia). Lê as imagens dos temas direto de `apps/web/public`. Não vai na Vercel: precisa de conexões abertas. |
| Site (`apps/web`)            | Vercel           | Root Directory `apps/web` e a variável `NEXT_PUBLIC_REALTIME_URL` com o endereço do Railway                                                                                               |
| PostgreSQL                   | Neon ou Supabase | Opcional, ainda não usado em produção                                                                                                                                                     |
| Redis                        | Railway          | No mesmo projeto do servidor, ligado por `REDIS_URL`. Faz as salas sobreviverem a deploys                                                                                                 |

Ordem: primeiro o Railway, depois a Vercel, depois voltar ao Railway e colocar o endereço do site (o de **Domains**, `https://chutai-bay.vercel.app`) em `CORS_ORIGIN`. Os deploys de preview da Vercel não conectam ao servidor, porque o endereço deles não está no `CORS_ORIGIN`; é esperado.

## Criar um tema

Temas são arquivos JSON em [`packages/db/seed`](packages/db/seed). Cada um define os atributos (as colunas do tabuleiro) e os personagens:

```json
{
  "slug": "minha-turma",
  "name": "Minha turma",
  "description": "O dle da galera do trabalho.",
  "color": "anil",
  "visibility": "public",
  "attributes": [
    { "key": "cidade", "label": "Cidade", "type": "text" },
    { "key": "hobbies", "label": "Hobbies", "type": "list" },
    { "key": "idade", "label": "Idade", "type": "number" },
    { "key": "altura", "label": "Altura", "type": "range", "unit": "cm", "tolerance": 5 }
  ],
  "characters": [
    {
      "id": "ana",
      "name": "Ana",
      "aliases": ["Aninha"],
      "values": { "cidade": "Recife", "hobbies": ["vôlei", "games"], "idade": 24, "altura": 168 }
    }
  ]
}
```

Cada personagem pode ter um campo `image` com o caminho da imagem (ex.: `/temas/minha-turma/ana.webp`, dentro de `apps/web/public`). Junto vai o campo `imageCredit` (autor, licença e link do original), que alimenta a página de créditos e é gravado no banco. Para os temas oficiais, as imagens vêm do Wikimedia Commons: escolha o arquivo em `packages/db/seed/image-sources.json` e rode `pnpm images:fetch`, que confere a licença, reduz a imagem e preenche `image` e `imageCredit`. O `validateTheme` recusa imagens fora do formato (caminho do site ou URL https, em .webp, .png, .jpg ou .avif).

O tema também precisa de um campo `emoji` com o ícone que aparece no site, e cada personagem pode ter o seu (sem imagem, é ele que aparece no tabuleiro). Os temas oficiais servem de modelo.

Depois, adicione o arquivo à lista em `packages/db/src/themes.ts`. O teste `temas oficiais estão todos consistentes` avisa se faltar algum valor.

> Os dados dos temas oficiais foram montados com cuidado, mas folclore tem versões diferentes em cada região e números de fauna são aproximados. Correções são bem-vindas.

## Roadmap

- [x] **Fase 0** — Monorepo, TypeScript, ESLint, Prettier, Docker e primeiros temas
- [x] **Fase 1** — Regras do jogo testadas e modo treino individual
- [x] **Fase 2** — Multiplayer: salas, lobby, rodadas com cronômetro, placar ao vivo, pódio e reconexão
- [x] **Fase 2.5** — Imagem de cada personagem (licença livre, com créditos) e modo de jogo Imagem
- [x] **Fase 2.6** — Modo Imagem parcial, opções sem imagem no modo Imagem, quatro temas brasileiros com pessoas reais e projeto pronto para o deploy ([`docs/DEPLOY.md`](docs/DEPLOY.md))
- [x] **Fase 2.7** — Como jogar, sons, modo Misto e desafio do dia
- [ ] **Fase 3** — Lançamento: no ar em [chutai-bay.vercel.app](https://chutai-bay.vercel.app); faltam domínio próprio, monitoramento de erros (Sentry) e testes com grupos de amigos
- [ ] **Fase 4** — Comunidade: login com Google e Discord, editor de temas com upload de imagens, moderação e salas públicas
- [ ] **Fase 5** — Crescimento: modo streamer (chat da Twitch contra o streamer), modo emoji, plano premium

## Sobre mim

Sou **Lucas Barreto**, desenvolvedor. Criei o Chutaí para praticar desenvolvimento full stack de ponta a ponta: tempo real com WebSocket, arquitetura em monorepo, modelagem de banco, testes automatizados e uma interface com identidade própria.

- LinkedIn: [linkedin.com/in/lucas-barreto-santana-67aa932b6](https://www.linkedin.com/in/lucas-barreto-santana-67aa932b6/)
- E-mail: [lucasbrsantana@gmail.com](mailto:lucasbrsantana@gmail.com)

Gostou do projeto, achou um bug ou tem ideia de tema? Abra uma issue ou me chame no LinkedIn.

## Licença

[MIT](LICENSE) © 2026 Lucas Barreto
