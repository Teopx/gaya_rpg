# Implantação web

## Estado da execução em 17/10/2026

Cliente web, backend TypeScript, SQL e testes criados localmente. Leitura de Teopx/gaya_rpg confirmada: repositório vazio, usuário com permissão push. Tentativa de criar README pelo conector foi bloqueada pela aprovação automática. Git HTTPS e sincronização Sites falharam por bloqueio de rede. Portanto, não há commit remoto ou URL publicada confirmados. Não confundir expected_url de um cadastro Sites com uma implantação concluída.

## Cloudflare

1. Use Node 24. Execute `npm install`, `npm run check`, `npm test` e `npm run typecheck`.
2. Autentique Wrangler na conta de destino. Crie recursos: `npx wrangler d1 create nacoes-hibridas`, `npx wrangler kv namespace create NATIONS`, `npx wrangler r2 bucket create nacoes-hibridas-assets`. Recursos e uso podem gerar cobrança; nenhuma gratuidade ilimitada é prometida.
3. Defina variáveis de ambiente DATABASE_ID, KV_NAMESPACE_ID e APP_ORIGIN (ex.: a origem HTTPS exata do Worker, sem barra final). Execute `node scripts/configure-cloud.mjs`. O arquivo de saída é ignorado pelo Git e não contém token.
4. Execute `npx wrangler d1 migrations apply nacoes-hibridas --remote --config wrangler.deploy.toml`, `node scripts/seed.mjs` e `npx wrangler d1 execute nacoes-hibridas --remote --file build/seed.sql --config wrangler.deploy.toml`.
5. Execute `npx wrangler deploy --config wrangler.deploy.toml`. Só considere publicado após o comando retornar a URL e o serviço responder.
6. Abra a URL no celular, clique em Entrar online, crie conta, crie personagem e selecione-o. Abra duas sessões diferentes para testar PVP na fronteira. Cookies HttpOnly e WebSocket dependem da mesma origem HTTPS configurada.

## GitHub Actions

O workflow `.github/workflows/deploy.yml` valida código e gera artefatos. Em production configure secrets CLOUDFLARE_API_TOKEN e CLOUDFLARE_ACCOUNT_ID e variables DATABASE_ID, KV_NAMESPACE_ID, APP_ORIGIN e CLOUDFLARE_DEPLOY_ENABLED=true. Use token limitado aos recursos desta aplicação. Não forneça tokens no chat.

Há um único workflow deploy.yml para teste, exportação web Godot e deploy. APK, AAB e IPA foram substituídos por distribuição web; não há instalação em loja.

## Carga remota

`scripts/load.mjs` aceita por stdin um JSON com url, clients (exatamente 100 objetos contendo cookie de sessão válido e character_id), duration_seconds e max_p95_ms. Use ambiente de staging e contas de teste preparadas por administrador. Não há endpoint público para gerar bots ou injetar recursos. O script abre 100 WebSockets reais, envia intenções de movimento/coleta/ataque e mede percentil 95 dos intervalos de snapshots recebidos. Cada personagem deve pertencer à conta da sessão fornecida. O inventário não deve ser editado pelo navegador.

O teste local de 100 atores executa handlers autoritativos sobre SQLite, sem rede. Ele não mede a Cloudflare nem substitui a carga remota. A meta de tick é 50 ms; qualquer resultado remoto depende de CPU, D1, conectividade e distribuição geográfica. Teste também Safari/iOS e Chrome/Android reais antes de lançamento.

## Limites para lançamento

Faltam validação visual em navegadores reais, build/typecheck com dependências, testes Cloudflare D1/DO reais, medição de carga remota, observabilidade, recuperação de raides após reinício, expansão de territórios físicos, mercado global, ferramentas de gestão de nação, economia completa, sistema de armaduras/ossos modular, Claude e revisão de segurança de produção. O cliente de referência usa WebGL leve e fallback Canvas; o projeto Godot com exportação web também está incluído, mas não foi compilado neste ambiente. O servidor é uma base funcional de MVP; não está certificado para produção.
