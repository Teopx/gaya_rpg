# ATMOSPHERE — O Primeiro Sopro

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

## Identidade, trilha e procedência

ATMOSPHERE — O Primeiro Sopro é o título do jogo. ATMOSPHERE nomeia o mundo despertado por GAYA; o subtítulo liga o nascimento do mundo aos viventes híbridos. Cada uma das 21 heranças animais tem uma frase narrativa na criação, sem prometer atributos ou habilidades ainda não implementados. GAYA permanece a dona da vida na narrativa. Os nomes técnicos Cloudflare e a chave de save local são mantidos para preservar recursos e progresso. A escolha do título não representa pesquisa ou liberação de marca.

Execute `npm run audio` antes de servir ou publicar: gera 13 temas instrumentais sintetizados em `dist/audio` e `godot/audio`. As partituras e a síntese são versionadas; os WAVs são reproduzíveis e gerados pelo CI. Há abertura, personagens, sete continentes, fronteira, raide, ascensão e tema de trailer em quatro atos (43,6 segundos). O trailer em vídeo ainda não foi produzido. Ative a trilha na criação ou no menu de áudio; o volume é salvo, há transição de 1,4 segundo e pausa em aba oculta.

Os temas são esboços de composição e síntese feitos com assistência de IA para o projeto, sem importar gravações, samples ou melodias de terceiros. Não houve revisão musicológica, prova de exclusividade ou liberação jurídica mundial. A procedência e os pontos de revisão estão em `asset-provenance.json`; o manifesto gerado inclui SHA-256 dos WAVs.

Novos assets de terceiros exigem licença documentada para o uso pretendido e os territórios de distribuição, incluindo jogo, publicidade e trailer quando aplicável. Não incorporar imitações deliberadas, clones de voz ou materiais sem origem conhecida. Preservar avisos e licenças de dependências. O Godot usa licença MIT: https://godotengine.org/license/ . O lockfile registra versões e expressões de licença das ferramentas npm; isso não substitui a revisão das obrigações ao redistribuí-las. A WIPO explica a territorialidade e o uso de obras protegidas em https://www.wipo.int/en/web/copyright/faq-copyright .

## Crônicas e nascimento de novas nações

O espaço To be continued apresenta Aurora como prólogo e sementes narrativas para Anciões, Dragonas, Sirenes e Vampiros. Nomes de nações, terras, calendário e funções jogáveis futuras permanecem por definir. As funções descritas são intenções narrativas.

`dist/chronicles.mjs` separa capítulos e relíquias por IDs estáveis. Uma relíquia aponta para um capítulo mesmo que sua nação ainda não exista. O catálogo atual mostra quatro prévias raras, sem drops, inventário ou poderes habilitados. Isso permite preparar a revelação de uma nação antes de ativar sua jogabilidade. O validador impede ativar coleta apenas mudando um campo visual.

Em cada lançamento: escrever a origem de uma nação e suas relações com GAYA e os viventes; definir território, seres e funções; implementar as regras autoritativas, migrations e seed necessários; depois atualizar o capítulo para released mantendo seus IDs. Uma relíquia poderá aparecer antes dessa revelação, mas sua obtenção precisa de tabela de drops, persistência e validação no servidor. Novas raças não devem alterar a origem dos personagens existentes. Não há datas de lançamento prometidas no catálogo.
