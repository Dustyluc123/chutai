# Próxima etapa do Chutaí

Você vai trabalhar no **Chutaí**, um dle multiplayer em tempo real (estilo Gartic Phone) que já está funcionando. Leia este arquivo inteiro antes de começar. **Primeiro me apresente um plano e espere eu aprovar antes de mudar código.**

## Contexto do que já existe

O projeto é um monorepo TypeScript (pnpm workspaces + Turborepo). Leia o `README.md` para a visão completa; o resumo:

- `apps/web`: site em Next.js 16 (App Router), React 19, Tailwind CSS 4. Páginas: início (`src/app/page.tsx`), sala (`src/app/sala/[codigo]/room-screen.tsx`), temas, treino solo, criar-tema (placeholder). A conversa com o servidor fica em `src/hooks/useRoom.ts`.
- `apps/realtime`: servidor Node + Socket.IO. A regra de uma sala está em `src/rooms/Room.ts` (não conhece Socket.IO; fala com o mundo por um `emitter`). Handlers em `src/socket/handlers/`.
- `packages/game`: regras puras (comparação de atributos, pontuação em `config.ts`/`scoring.ts`, dicas, sorteio, busca sem acento). Sem servidor e sem React.
- `packages/shared`: tipos (`types.ts`), contrato tipado dos eventos Socket.IO (`events.ts`), esquemas Zod (`schemas.ts`).
- `packages/db`: schema Drizzle (PostgreSQL), repositórios com a mesma interface para JSON (usado hoje) e PostgreSQL (pronto, testado com PGlite, ainda sem banco real). Temas oficiais em `seed/*.json`. **Ainda não existe banco de dados nem armazenamento de arquivos em produção.**

Princípios que devem continuar valendo:

1. **O servidor manda em tudo.** O navegador nunca pode receber a resposta da rodada nem nada que permita descobri-la (nome, id, URL de imagem que contenha o id, imagem nítida).
2. Regras novas do jogo vão em `packages/game`, com testes.
3. Tipos e eventos novos vão em `packages/shared`; o servidor valida tudo com Zod.
4. Interface em português do Brasil; identificadores de código em inglês; comentários em português.
5. Seguir a identidade visual existente (tokens em `apps/web/src/styles/globals.css`: anil, gema, chiclete, folha, pitanga, papel, tinta; fonte Archivo; classe `font-display` nos títulos). Acessível: teclado, `alt` em imagens, foco visível, `prefers-reduced-motion`.
6. Ao fim de cada tarefa, rodar e deixar passando: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Tarefa 1: imagem de cada personagem

Hoje cada personagem tem só um `emoji`. Quero que cada um possa ter uma imagem, mostrada:

- no autocompletar do palpite (`apps/web/src/components/game/guess-input.tsx`), para o jogador saber quem está escolhendo;
- na primeira coluna do tabuleiro (`guess-board.tsx`), na revelação do fim da rodada (`round-reveal.tsx`), no modo treino e na página do tema.

Requisitos:

- Adicionar um campo opcional `image` em `Character` (tipo em `packages/shared`, JSON dos temas, schema Drizzle com nova migração via `pnpm db:generate`, repositórios e seus testes).
- Se o personagem não tiver imagem, continuar mostrando o emoji (nada pode quebrar).
- Imagens dos temas oficiais em `apps/web/public/temas/<slug>/<id>.webp`, pequenas (até ~300×300, otimizadas). Usar `next/image` onde fizer sentido.
- **Direitos autorais:** só usar imagens com licença livre (por exemplo, Wikimedia Commons com CC0, CC BY ou CC BY-SA). Registrar autor, licença e link de cada imagem num arquivo `apps/web/public/temas/CREDITOS.md` e criar uma página ou seção de créditos no site. Não usar fotos de agências, de clubes ou ilustrações de terceiros sem licença. Se não encontrar imagem livre para algum personagem, deixe sem imagem (cai no emoji) e me liste quais ficaram faltando.

## Tarefa 2: novo modo de jogo "Imagem"

Quero dois modos, escolhidos pelo anfitrião no lobby:

- **Clássico**: o que já existe (atributos coloridos).
- **Imagem**: aparece a imagem do personagem secreto bem borrada (ou pixelada) e ela vai ficando mais nítida a cada chute errado e a cada dica usada. Os jogadores chutam pelo mesmo autocompletar; acertar dá pontos como hoje (manter a fórmula ou propor ajuste, deixando os números em `packages/game/src/config.ts`).

Requisitos:

- `RoomSettings` ganha `mode: "classic" | "image"` (tipos, Zod, painel de regras do lobby em `settings-panel.tsx`, valor padrão `classic`).
- O modo Imagem só pode ser escolhido em temas onde **todos** os personagens têm imagem; nos outros, a opção aparece desabilitada com o motivo.
- **Anti-trapaça (obrigatório):** o navegador nunca pode receber a imagem nítida nem uma URL que revele quem é (como `/temas/folclore/saci.webp`). Borrar só com CSS não serve, porque basta abrir o inspetor. Gere no servidor de tempo real as versões degradadas (por exemplo com `sharp`, em uns 6 níveis do mais borrado ao nítido) e entregue cada nível por uma URL opaca da rodada (ex.: `GET /round-image/:roomCode/:level` no servidor HTTP do `apps/realtime`, liberando só até o nível que aquele jogador já alcançou) ou mande os bytes pelo Socket.IO. A imagem nítida só aparece na revelação, depois que a rodada termina.
- Cada jogador tem seu próprio nível de nitidez (depende dos chutes e dicas dele). O placar ao vivo continua sem spoiler.
- Na revelação do fim da rodada, mostrar a imagem nítida.
- Testes: regra de quantos níveis liberar por chute/dica em `packages/game`; no `apps/realtime`, testar que um jogador não consegue pedir um nível acima do que alcançou e que a resposta não vaza no estado público.
- Opcional, se couber: o modo Imagem também no treino solo.

## Tarefa 3: criar temas pelo site com upload de imagens (NÃO implementar agora)

Isso depende de banco de dados e de armazenamento de imagens (Cloudflare R2 ou similar), que ainda não existem, além de login e moderação. **Não implemente esta tarefa.** Só atualize a página `apps/web/src/app/criar-tema/page.tsx` para mencionar que será possível subir as imagens dos personagens, e acrescente ao roteiro do README (Fase 4) "editor de temas com upload de imagens". Se, ao planejar, você enxergar algo pequeno que deixe o código preparado sem precisar de infraestrutura nova, sugira no plano, mas não faça sem eu aprovar.

## Tarefa 4: README profissional

- Remover **todos** os emojis do `README.md` (inclusive nas tabelas, na legenda de cores e na seção "Sobre mim"). Os badges do shields.io podem ficar.
- Na tabela de cores, descrever as cores em texto (ex.: "Verde", "Amarelo").
- Atualizar o README com as novidades: imagens dos personagens, os dois modos de jogo, créditos das imagens e o roteiro atualizado.

## Como quero que você trabalhe

1. Leia o código relevante e me mostre um plano curto, tarefa por tarefa, incluindo dependências novas (ex.: `sharp`) e mudanças no contrato de eventos. Espere minha aprovação.
2. Faça uma tarefa de cada vez, na ordem 4, 1, 2, 3 (a 4 é rápida). Ao terminar cada uma, rode os comandos de verificação e faça um commit com mensagem clara em português.
3. Explique em poucas linhas o que mudou e por quê; estou usando o projeto para aprender, então me diga quais arquivos vale eu ler para entender cada mudança.
4. Se algo deste pedido parecer má ideia ou impossível sem banco de dados, me avise em vez de improvisar.
