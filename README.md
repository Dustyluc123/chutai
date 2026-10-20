<h1 align="center">Chutaí</h1>

<p align="center">
  <strong>Adivinhe o personagem antes dos seus amigos.</strong><br />
  Dle multiplayer em tempo real, no estilo Gartic Phone: crie uma sala, mande o código no grupo e chute.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" />
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socketdotio&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Drizzle-4169e1?logo=postgresql&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" />
  <a href="https://github.com/Dustyluc123/chutai/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Dustyluc123/chutai/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Testes" src="https://img.shields.io/badge/testes-90_passando-12a85f" />
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
- [Banco de dados e Redis (preparados para o futuro)](#banco-de-dados-e-redis-preparados-para-o-futuro)
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

| Tema                | Personagens | O que cada palpite compara                                            |
| ------------------- | ----------: | --------------------------------------------------------------------- |
| Folclore brasileiro |          24 | Forma, região, onde aparece, quando aparece, comportamento            |
| Lendas do futebol   |          49 | Posição, região e estado natal, nascimento, Copas, décadas na Seleção |
| Fauna brasileira    |          40 | Grupo, biomas, alimentação, onde vive, peso                           |

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

**Imagem.** Aparece a imagem do personagem secreto bem borrada e pixelada. Cada chute errado e cada dica deixam a imagem um pouco mais nítida, em 5 níveis; a imagem nítida só aparece na revelação. Disponível nos temas em que todos os personagens têm imagem (hoje, a fauna).

Quem acerta mais rápido, com menos chutes e sem dicas, leva mais pontos.

## Funcionalidades

- [x] Salas privadas com código de 6 caracteres e link de convite (copiar ou compartilhar)
- [x] Entrar como convidado, só com apelido e avatar
- [x] Lobby com lista de jogadores, vagas, regras editáveis pelo anfitrião e botão de expulsar
- [x] Rodadas com cronômetro controlado pelo servidor
- [x] Autocompletar acessível (teclado e leitor de tela) que ignora acentos e aceita apelidos ("Fenômeno" → Ronaldo)
- [x] Tabuleiro com peças que viram uma de cada vez, setas para números e tolerância para valores aproximados
- [x] Dois modos de jogo: **Clássico** (atributos coloridos) e **Imagem** (imagem borrada que fica mais nítida a cada erro ou dica)
- [x] Placar ao vivo **sem spoiler**: mostra chutes e quantos atributos cada um já acertou (ou, no modo Imagem, a nitidez de cada um), nunca o personagem
- [x] Dicas (revelar atributo, primeira letra) liberadas depois de 3 chutes, custando pontos
- [x] Revelação do personagem ao fim de cada rodada, pódio final e "jogar de novo"
- [x] Reconexão: recarregou a página ou a internet caiu? Volta para a mesma sala, com os mesmos pontos
- [x] Anfitrião passa para outro jogador se sair; rodada termina antes se todos os conectados acertarem
- [x] Modo treino individual e páginas públicas de cada tema (boas para o Google)
- [x] Imagem de cada personagem no autocompletar, no tabuleiro, na revelação, no treino e na página do tema; sem imagem, aparece o emoji
- [x] Imagens só com licença livre (Wikimedia Commons), com autor e licença de cada uma na página [/creditos](apps/web/public/temas/CREDITOS.md)
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
- **Modo Imagem sem trapaça.** Borrar com CSS não protege nada: o navegador teria a imagem nítida e a URL dela, que contém o id do personagem. O servidor de tempo real baixa a imagem original, aplica um disfarce sorteado a cada rodada (espelho, recorte, tom) e gera com `sharp` as versões degradadas. Cada jogador recebe pelo Socket.IO só os bytes do nível que alcançou, sem nome de arquivo nem metadados; o navegador não tem como pedir outro nível.
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
| Estado das salas | Memória (hoje) / Redis (futuro)                  | Redis só quando houver reinícios ou vários servidores              |
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
│       │   │   └── store/           # memory.ts (hoje) e redis.ts (futuro)
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
│       ├── seed/                    # Temas oficiais em JSON, origem das imagens e script que carrega no banco
│       ├── scripts/                 # fetch-images.ts: baixa as imagens do Commons e gera os créditos
│       └── tests/                   # Testes com PostgreSQL de verdade em memória (PGlite)
│
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

| Variável                   | Padrão                  | Para quê                                                             |
| -------------------------- | ----------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_REALTIME_URL` | `http://localhost:3001` | Onde o navegador encontra o servidor de tempo real                   |
| `PORT`                     | `3001`                  | Porta do servidor de tempo real                                      |
| `CORS_ORIGIN`              | `http://localhost:3000` | Origens que podem se conectar (separadas por vírgula)                |
| `ASSETS_BASE_URL`          | `http://localhost:3000` | De onde o servidor de tempo real baixa as imagens para o modo Imagem |
| `DATABASE_URL`             | (vazio)                 | Liga o PostgreSQL. Sem ela, temas vêm dos JSON                       |
| `REDIS_URL`                | (vazio)                 | Liga o Redis. Sem ela, salas ficam só na memória                     |

## Banco de dados e Redis (preparados para o futuro)

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

Guarda um retrato de cada sala. Se o servidor reiniciar (um deploy, por exemplo), as salas voltam para o lobby e os jogadores reconectam pelo token salvo no navegador. Para ligar: `docker compose --profile redis up -d` e `REDIS_URL=redis://localhost:6379`. O próximo passo para rodar vários servidores ao mesmo tempo está descrito no próprio arquivo.

## Eventos do Socket.IO

Contrato completo e tipado em [`packages/shared/src/events.ts`](packages/shared/src/events.ts).

| Evento                                   | Direção               | Para quê                                                              |
| ---------------------------------------- | --------------------- | --------------------------------------------------------------------- |
| `room:create`                            | navegador → servidor  | Criar sala (quem cria vira anfitrião)                                 |
| `room:join`                              | navegador → servidor  | Entrar pelo código; com token, reconecta                              |
| `room:update-settings`                   | anfitrião → servidor  | Mudar tema, modo, rodadas, tempo, dicas                               |
| `room:kick`                              | anfitrião → servidor  | Expulsar jogador                                                      |
| `game:start`                             | anfitrião → servidor  | Começar a partida                                                     |
| `guess:submit`                           | navegador → servidor  | Chutar; a resposta volta com os atributos coloridos                   |
| `hint:request`                           | navegador → servidor  | Pedir dica                                                            |
| `game:restart`                           | anfitrião → servidor  | Voltar ao lobby depois do pódio                                       |
| `room:state`                             | servidor → todos      | Fonte da verdade: jogadores, fase, placar                             |
| `you:state`                              | servidor → um jogador | Seus palpites e dicas (ex.: depois de reconectar)                     |
| `player:progress`                        | servidor → todos      | Progresso sem spoiler                                                 |
| `player:solved`                          | servidor → todos      | "Fulano acertou!"                                                     |
| `round:start` / `round:end` / `game:end` | servidor → todos      | Início, revelação e fim                                               |
| `round:image`                            | servidor → um jogador | Modo Imagem: os bytes do nível de nitidez que aquele jogador alcançou |

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

| Pacote             | Testes | O que cobrem                                                                                                                                                                                                                                         |
| ------------------ | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@chutai/game`     |     37 | Comparação de cada tipo de atributo, fórmula de pontos, dicas, sorteio, busca sem acento, níveis do modo Imagem                                                                                                                                      |
| `@chutai/realtime` |     39 | Sala com relógio falso (rodadas, empates, reconexão, anfitrião), modo Imagem (ninguém recebe um nível acima do que alcançou, nada vaza no estado público), geração das imagens com `sharp` e **partidas inteiras com dois clientes Socket.IO reais** |
| `@chutai/db`       |     14 | Migração e repositórios num PostgreSQL real em memória (PGlite), consistência dos temas, imagens e créditos                                                                                                                                          |

## Deploy

| Peça                         | Sugestão                  | Observação                                                                                                                        |
| ---------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Site (`apps/web`)            | Vercel                    | Defina `NEXT_PUBLIC_REALTIME_URL` com o endereço do servidor                                                                      |
| Tempo real (`apps/realtime`) | Railway, Fly.io ou Render | Precisa de conexões abertas, por isso **não** vai na Vercel. `pnpm --filter @chutai/realtime build` gera um único `dist/index.js` |
| PostgreSQL                   | Neon ou Supabase          | Opcional                                                                                                                          |
| Redis                        | Upstash                   | Opcional                                                                                                                          |

No servidor de tempo real, ajuste `CORS_ORIGIN` e `ASSETS_BASE_URL` para o domínio do site. O `sharp` (usado no modo Imagem) fica fora do `dist/index.js` e é instalado junto com as dependências.

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
- [ ] **Fase 3** — Lançamento: deploy, domínio, monitoramento de erros (Sentry) e testes com grupos de amigos
- [ ] **Fase 4** — Comunidade: login com Google e Discord, editor de temas com upload de imagens, moderação e salas públicas
- [ ] **Fase 5** — Crescimento: modo streamer (chat da Twitch contra o streamer), modo emoji, plano premium

## Sobre mim

Sou **Lucas Barreto**, desenvolvedor. Criei o Chutaí para praticar desenvolvimento full stack de ponta a ponta: tempo real com WebSocket, arquitetura em monorepo, modelagem de banco, testes automatizados e uma interface com identidade própria.

- LinkedIn: [linkedin.com/in/lucas-barreto-santana-67aa932b6](https://www.linkedin.com/in/lucas-barreto-santana-67aa932b6/)
- E-mail: [lucasbrsantana@gmail.com](mailto:lucasbrsantana@gmail.com)

Gostou do projeto, achou um bug ou tem ideia de tema? Abra uma issue ou me chame no LinkedIn.

## Licença

[MIT](LICENSE) © 2026 Lucas Barreto
