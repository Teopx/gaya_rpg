# Validação executada — 17/10/2026

Resultado final: 15 testes locais passaram, 0 falharam.

- Seis testes da interface/regras solo em sandbox Node VM.
- Nove testes do backend sobre SQLite em memória, incluindo limites SQL, origem imutável, craft autoritativo, origem HTTP e fronteira PVP.
- A simulação local de 100 atores executou coleta e ataques nos handlers do Durable Object. Só um ator recebeu o recurso disputado.
- Cem mortes consecutivas foram verificadas em SQL: sempre houve troca estrita de nação e respawn, com registro do território perdido.
- Verificação sintática Node 24 passou para game.js, network.js, renderer3d.js, server/index.ts e scripts/load.mjs.

Não executados: testes GUT, exportação Godot, typecheck TypeScript, bundle Wrangler, Cloudflare real e carga de 100 WebSockets. A instalação de dependências npm foi bloqueada com EACCES ao consultar registry.npmjs.org. A prévia visual foi bloqueada pela política de segurança do navegador. A publicação e o commit remoto não ocorreram. Esses limites estão documentados em DEPLOY.md.

Estes testes não comprovam estabilidade de ticks remotos em 50 ms, segurança de produção ou compatibilidade visual com aparelhos físicos.
