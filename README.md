# GAYA — Nações Híbridas

RPG sandbox de fantasia primordial para navegadores desktop, Android e iOS. GAYA, a dona da vida, dá origem aos viventes, deuses e semideuses na Era do Primeiro Sopro.

Versão de teste publicada: https://nacoes-hibridas.cleberfpaix.workers.dev

## Universo e experiência

A Primeira Raiz marca o santuário de origem. O Livro da Criação apresenta GAYA, os primeiros deuses, os semideuses e o surgimento dos híbridos. Cada continente recebe um texto de origem. Deuses e semideuses são elementos narrativos, ainda sem classes ou sistemas jogáveis.

A Trilha do Despertar acompanha recursos, poções e a carta do guardião, com três marcos e títulos visuais, sem alterar dano, inventário ou recompensas. No solo, os marcos usam o progresso salvo do personagem; online, são indicadores da sessão derivados de snapshots, separados por personagem. O cliente mostra o próximo passo, permite ampliar o mapa e inclui orientação por teclado, foco visível e diálogos com rolagem. A interface usa fontes locais, sem depender do Google Fonts.

## O que está implementado

- Cliente web responsivo com renderização WebGL 3D, fallback Canvas, controles por toque/teclado e modo solo persistido localmente.
- Entrada online, criação de contas e personagens, seleção de até dez slots e conexão WebSocket com reconexão.
- Workers TypeScript, Durable Object por continente, SQL D1, binding KV; armazenamento R2 reservado para uma etapa futura.
- Fauna vinculada ao continente, recursos com reposição, craft de poções, cura, PVP na fronteira, raides e transformação temporária.
- Validações autoritativas: receitas, alcance, dano, cooldown, movimento, origem de requisições e limite de mensagens; inventário do navegador não é aceito como autoridade.
- Trigger SQL de morte: troca de nação para outra do mesmo continente, remoção de acesso anterior registrado e respawn.
- Cliente Godot 4.4.1 com cenas 3D e CharacterManager.gd, NetworkClient.gd, RaidManager.gd e NationSystem.gd. Exportação Web em Compatibility/WebGL, single-threaded, pelo CI; GUT 9.4.0.

## Executar

Node 24 ou superior. Execute `npm run check` e `npm test` sem instalar dependências. Para o modo solo, sirva a pasta dist em um host estático HTTPS. O modo online requer a implantação do backend e os recursos Cloudflare descritos em [DEPLOY.md](DEPLOY.md). Use `npm ci` e `npm run typecheck` para validar os tipos e `npx wrangler deploy --dry-run` antes de publicar.

O projeto Godot pode ser aberto no editor em godot/project.godot. A versão web Godot é gerada em dist/godot pelo CI, depende de uma sessão iniciada na interface principal e recebe o ID do personagem na URL. O botão Cliente Godot 3D aparece após selecionar um personagem online quando os arquivos exportados existem no host.

## Validação realizada

A revisão local em 17/10/2026 executou sintaxe, testes Node/SQLite, TypeScript e empacotamento Wrangler com `--dry-run`. Consulte [QA_RESULTS.md](QA_RESULTS.md) para os resultados e limites. O pipeline remoto do commit `39eab89` passou, incluindo GUT e exportação Web Godot. A versão GAYA foi publicada diretamente via Wrangler, com migração e seed no D1 remoto. O smoke remoto validou cadastro, login, personagem e snapshot WebSocket. Navegadores reais e carga remota continuam pendentes; nenhuma estabilidade remota de 50 ms foi comprovada.

## Limites atuais

Esta é uma base de MVP, não um MMORPG completo ou homologado. Faltam mercado global, tributos e recrutamento, construção territorial, bloqueio físico de território, vestimentas comerciais, rigs/assets finais humano-animal e integração Claude. Pets e tecidos estão mais completos no modo solo; o backend armazena o modo do pet e aplica seu bônus de luta, mas ainda não automatiza coleta/cura nem alfaiataria online. A raide do Durable Object mantém estado em memória e precisa de recuperação durável antes de produção. Cartas são contadores/transformações; imagens e patches ainda não são publicados no R2. KV está configurado, mas ainda não tem uso funcional. O binding R2 é opcional e foi retirado da configuração obrigatória; habilite-o quando implementar uploads. Não há publicação em Releases automatizada nesta etapa.

O renderer WebGL é uma interface de referência funcional; o cliente Godot é um esqueleto 3D conectado ao mesmo protocolo, ainda sem equivalência visual/funcional completa. No modo solo, os dados do localStorage podem ser editados pelo usuário e não têm valor na economia online. Não há pagamento ou dinheiro real.

## Segurança e operação

Configure a origem HTTPS exata. Senhas são derivadas com PBKDF2/SHA-256, sal aleatório e 100 mil iterações; sessões usam cookies HttpOnly/Secure/SameSite=Strict. Tickets WebSocket expiram em 30 segundos e são consumidos uma vez. O limite de login atual é mantido em memória no DO e precisa ser persistido e complementado por proteção de borda antes de produção. Separe staging de production. Use tokens Cloudflare limitados aos recursos do jogo. Nunca coloque credenciais no código, em arquivos públicos ou no chat.

## Estado remoto

O repositório é `Teopx/gaya_rpg`; a branch local `main` estava limpa e alinhada a `origin/main` (`39eab89`) no início da revisão. A execução GitHub Actions [39067510586](https://github.com/Teopx/gaya_rpg/actions/runs/39067510586) concluiu os jobs de teste e Godot com sucesso; o deploy foi ignorado. A versão GAYA está publicada no Worker. O deploy via GitHub Actions continua dependendo dos secrets, variables e environment production descritos na documentação. Consulte [DEPLOY.md](DEPLOY.md).
