# Nações Híbridas

Base de RPG sandbox para navegadores desktop, Android e iOS, sem instalação de aplicativo.

## O que está implementado

- Cliente web responsivo com renderização WebGL 3D, fallback Canvas, controles por toque/teclado e modo solo persistido localmente.
- Entrada online, criação de contas e personagens, seleção de até dez slots e conexão WebSocket com reconexão.
- Workers TypeScript, Durable Object por continente, SQL D1, definição de bindings KV e R2.
- Fauna vinculada ao continente, recursos com reposição, craft de poções, cura, PVP na fronteira, raides e transformação temporária.
- Validações autoritativas: receitas, alcance, dano, cooldown, movimento, origem de requisições e limite de mensagens; inventário do navegador não é aceito como autoridade.
- Trigger SQL de morte: troca de nação para outra do mesmo continente, remoção de acesso anterior registrado e respawn.
- Cliente Godot 4.4.1 com cenas 3D e CharacterManager.gd, NetworkClient.gd, RaidManager.gd e NationSystem.gd. Exportação Web em Compatibility/WebGL, single-threaded, pelo CI; GUT 9.4.0.

## Executar

Node 24 ou superior. Execute `npm run check` e `npm test` sem instalar dependências. Para o modo solo, sirva a pasta dist em um host estático HTTPS. O modo online requer a implantação do backend e os recursos Cloudflare descritos em [DEPLOY.md](DEPLOY.md). Use `npm install` e `npm run typecheck` para validar os tipos e `npx wrangler deploy --dry-run` antes de publicar.

O projeto Godot pode ser aberto no editor em godot/project.godot. A versão web Godot é gerada em dist/godot pelo CI, depende de uma sessão iniciada na interface principal e recebe o ID do personagem na URL. O botão Cliente Godot 3D aparece após selecionar um personagem online quando os arquivos exportados existem no host.

## Validação realizada

15 testes Node/SQLite passaram neste ambiente, incluindo 100 atores simulados nos handlers de coleta/combate e 100 transições de morte. Sintaxe de JavaScript e TypeScript verificada pelo Node 24. O teste remoto scripts/load.mjs abre 100 WebSockets reais quando recebe sessões de staging via stdin; ele não foi executado. GUT, export Godot, compilação Wrangler, typecheck e QA visual em navegadores ainda não foram executados. Nenhuma estabilidade remota de 50 ms foi comprovada.

## Limites atuais

Esta é uma base de MVP, não um MMORPG completo ou homologado. Faltam mercado global, tributos e recrutamento, construção territorial, bloqueio físico de território, vestimentas comerciais, rigs/assets finais humano-animal e integração Claude. Pets e tecidos estão mais completos no modo solo; o backend armazena o modo do pet e aplica seu bônus de luta, mas ainda não automatiza coleta/cura nem alfaiataria online. A raide do Durable Object mantém estado em memória e precisa de recuperação durável antes de produção. Cartas são contadores/transformações; imagens e patches ainda não são publicados no R2. KV e R2 estão configurados, mas não há uso funcional desses bindings nesta etapa. Não há publicação em Releases automatizada nesta etapa.

O renderer WebGL é uma interface de referência funcional; o cliente Godot é um esqueleto 3D conectado ao mesmo protocolo, ainda sem equivalência visual/funcional completa. No modo solo, os dados do localStorage podem ser editados pelo usuário e não têm valor na economia online. Não há pagamento ou dinheiro real.

## Segurança e operação

Configure a origem HTTPS exata. Senhas são derivadas com PBKDF2/SHA-256, sal aleatório e 100 mil iterações; sessões usam cookies HttpOnly/Secure/SameSite=Strict. Tickets WebSocket expiram em 30 segundos e são consumidos uma vez. O limite de login atual é mantido em memória no DO e precisa ser persistido e complementado por proteção de borda antes de produção. Separe staging de production. Use tokens Cloudflare limitados aos recursos do jogo. Nunca coloque credenciais no código, em arquivos públicos ou no chat.

## Estado remoto

O repositório alvo é Teopx/gaya_rpg, confirmado vazio. A gravação do primeiro arquivo foi bloqueada pela política de aprovação da sessão. Git HTTPS e publicação Sites também ficaram bloqueados por rede. Este pacote não representa commit remoto nem implantação concluída. Consulte DEPLOY.md para publicar após disponibilizar os acessos necessários.
