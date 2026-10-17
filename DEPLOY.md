# Implantação web

## Estado da execução em 17/10/2026

Repositório `Teopx/gaya_rpg`, branch `main`, commit inicial da revisão `39eab89`. O pipeline [39067510586](https://github.com/Teopx/gaya_rpg/actions/runs/39067510586) passou nos jobs test e godot; deploy ignorado. A falha anterior na exportação Godot foi corrigida pelo suporte a texturas mobile no commit atual. Wrangler `--dry-run` passou localmente, sem publicar. O login local foi concluído. A configuração real gerada fica em `wrangler.deploy.toml`, ignorada pelo Git. R2 não está habilitado na conta e foi retirado dos bindings obrigatórios porque não é usado pelo código atual.

## Cloudflare

1. Use Node 24. Execute `npm ci --ignore-scripts`, `npm run check`, `npm test` e `npm run typecheck`.
2. Autentique Wrangler na conta de destino. Crie recursos: `npx wrangler d1 create nacoes-hibridas`, `npx wrangler kv namespace create NATIONS`. R2 não é necessário para o jogo atual; só habilite e crie um bucket quando implementar uploads. Recursos e uso podem gerar cobrança; nenhuma gratuidade ilimitada é prometida.
3. Defina variáveis de ambiente DATABASE_ID, KV_NAMESPACE_ID e APP_ORIGIN (ex.: a origem HTTPS exata do Worker, sem barra final). Execute `node scripts/configure-cloud.mjs`. O arquivo de saída é ignorado pelo Git e não contém token.
4. Execute `npx wrangler d1 migrations apply nacoes-hibridas --remote --config wrangler.deploy.toml`, `node scripts/seed.mjs` e `npx wrangler d1 execute nacoes-hibridas --remote --file build/seed.sql --config wrangler.deploy.toml`.
5. Execute `npx wrangler deploy --config wrangler.deploy.toml`. Só considere publicado após o comando retornar a URL e o serviço responder.
6. Abra a URL no celular, clique em Entrar online, crie conta, crie personagem e selecione-o. Abra duas sessões diferentes para testar PVP na fronteira. Cookies HttpOnly e WebSocket dependem da mesma origem HTTPS configurada.

## GitHub Actions

O workflow `.github/workflows/deploy.yml` valida pushes/PRs e gera artefatos. Instala dependências do lockfile com `npm ci --ignore-scripts`, inclusive no deploy, usando a mesma versão do Wrangler validada nos testes.

No GitHub, crie o environment `production`, restrinja-o à branch `main` e configure revisores obrigatórios para aprovação antes de migrar o banco ou publicar. Isso precisa ser configurado no GitHub; o YAML sozinho não impõe revisores. Nesse environment configure secrets `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`, e variables `DATABASE_ID`, `KV_NAMESPACE_ID` e `APP_ORIGIN`. Use token limitado aos recursos desta aplicação; nunca forneça tokens no chat.

Para publicar, após revisar e enviar as alterações, selecione Actions > Validate web and Cloudflare backend > Run workflow, branch `main`, e marque `publish`. O padrão é falso: pushes e PRs não publicam. Testes e exportação Godot precisam passar antes do job production. Depois da aprovação, o job compila, aplica migrations, insere o seed idempotente, publica e verifica `/api/health`. A antiga flag `CLOUDFLARE_DEPLOY_ENABLED` não é mais utilizada.

Há um único workflow deploy.yml para teste, exportação web Godot e deploy. APK, AAB e IPA foram substituídos por distribuição web; não há instalação em loja.

## Carga remota

`scripts/load.mjs` aceita por stdin um JSON com url, clients (exatamente 100 objetos contendo cookie de sessão válido e character_id), duration_seconds e max_p95_ms. Use ambiente de staging e contas de teste preparadas por administrador. Não há endpoint público para gerar bots ou injetar recursos. O script abre 100 WebSockets reais, envia intenções de movimento/coleta/ataque e mede percentil 95 dos intervalos de snapshots recebidos. Cada personagem deve pertencer à conta da sessão fornecida. O inventário não deve ser editado pelo navegador.

O teste local de 100 atores executa handlers autoritativos sobre SQLite, sem rede. Ele não mede a Cloudflare nem substitui a carga remota. A meta de tick é 50 ms; qualquer resultado remoto depende de CPU, D1, conectividade e distribuição geográfica. Teste também Safari/iOS e Chrome/Android reais antes de lançamento.

## Limites para lançamento

Faltam validação visual em navegadores reais, testes Cloudflare D1/DO reais, medição de carga remota, observabilidade, recuperação de raides após reinício, expansão de territórios físicos, mercado global, ferramentas de gestão de nação, economia completa, sistema de armaduras/ossos modular, Claude e revisão de segurança de produção. O cliente de referência usa WebGL leve e fallback Canvas; o projeto Godot com exportação web também está incluído, validado no pipeline remoto do commit `39eab89`. O servidor é uma base funcional de MVP; não está certificado para produção.

## Recursos preparados nesta revisao

- Conta Cloudflare: 14590876c106e4ce18407942e318019f.
- D1: 524ad1d1-28df-4d96-b9c4-df7b12a18cbc.
- KV NATIONS: a538baf9148e4f9fb5af2f5b39db35cb.
- APP_ORIGIN: https://nacoes-hibridas.cleberfpaix.workers.dev .

Esses IDs nao sao credenciais. Recursos criados; migração 0001_initial.sql e seed aplicados no D1 remoto em 17/10/2026. Worker publicado e verificado com cadastro, login e WebSocket. A publicacao local envia o cliente JavaScript principal; o Godot opcional e incluido pelo pipeline ao baixar o artifact de exportacao no job deploy.

## Publicação GAYA — 17/10/2026

URL: https://nacoes-hibridas.cleberfpaix.workers.dev

Versão Worker: `379dbe74-ab8c-4ba4-9ef0-295422da543e`. Migração inicial aplicada; seed remoto idempotente com 28 nações e 448 recursos. Publicação feita pela CLI Wrangler autenticada na conta já configurada. O cliente JavaScript inclui o universo GAYA; o Godot opcional não foi exportado nesta publicação.

Verificação funcional remota, com criação explícita de uma conta técnica de teste:

```sh
node scripts/smoke-online.mjs https://nacoes-hibridas.cleberfpaix.workers.dev --create-test-account
```

O script deixa uma conta técnica e um personagem Centelha QA no D1, usa credenciais aleatórias apenas em memória e encerra as sessões. Valida health, seis assets, rejeição de Origin externo, cadastro, cookie seguro, login, personagem e snapshot WebSocket com 64 recursos. Não substitui testes visuais, PvP com duas sessões ou carga.

## Atualização ATMOSPHERE e áudio

O título público é ATMOSPHERE — O Primeiro Sopro. A URL e os identificadores de banco/Worker mantêm os nomes técnicos anteriores. Antes de qualquer deploy local execute `npm run audio`; esse comando gera 13 WAVs estéreo PCM/22.050 Hz em `dist/audio/` e `godot/audio/`, além do manifesto com SHA-256. Esses diretórios são ignorados no Git e recriados pelo CI; não distribuir sem executar a geração. O total dos assets de áudio é de aproximadamente 29,6 MB; apenas a faixa em uso é carregada pelo cliente web. A exportação Godot inclui suas cópias e requer reexportação pelo CI.

A política e o inventário de procedência estão em `asset-provenance.json`. Uma gravação externa ou asset de terceiros só deve entrar com licença e comprovantes adequados ao jogo/trailer e territórios pretendidos. O código de síntese não equivale a uma revisão jurídica ou musicológica mundial.

Versao final publicada com audio e Cronicas: e972514a-bcf8-4ad4-9156-acbf856277ec. Verificacao HTTP concluida; arquivos WAV conferidos por SHA-256. URL: https://nacoes-hibridas.cleberfpaix.workers.dev .

## Migração Madregona / progressão

Aplicar `0002_madregona_progression.sql` antes de publicar o novo Worker. A migração é incremental: adiciona campos de evolução, tabela de encontros pessoais e atualiza o trigger de renascimento; não altera a migração inicial nem remove personagens. Os testes cobrem migração de personagem legado, recompensas e falhas transacionais. Fluxo: `npm run audio`, verificações do projeto, `npx wrangler deploy --dry-run --config wrangler.deploy.toml`, `npx wrangler d1 migrations apply nacoes-hibridas --remote --config wrangler.deploy.toml`, deploy e smoke. A migração deve ser aplicada antes do cliente/backend que consultam as novas colunas. A trilha possui agora 14 faixas.

`scripts/smoke-progression.mjs <origem> --create-test-account` deixa uma conta técnica e um personagem Madregona QA evoluído, com credenciais aleatórias somente em memória. Usa o mesmo protocolo de qualquer jogador, encerra o WebSocket e revoga a sessão ao concluir. Não usa edição de banco nem endpoint de concessão de recursos.

Versão Madregona publicada: `ea290c0a-97c9-4876-b62f-5ef52e12956b`. Migração 0002 e smoke de jogo remoto concluídos. A versão web está disponível na URL existente; o fonte Godot exige nova exportação para disponibilizar seus controles atualizados.
