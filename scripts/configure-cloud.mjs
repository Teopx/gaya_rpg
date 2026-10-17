import {readFileSync,writeFileSync} from 'node:fs';
const {DATABASE_ID,KV_NAMESPACE_ID,APP_ORIGIN}=process.env;
if(!/^[\da-f-]{36}$/i.test(DATABASE_ID||'')||!/^[\da-f]{32}$/i.test(KV_NAMESPACE_ID||''))throw Error('Configure DATABASE_ID e KV_NAMESPACE_ID com os IDs Cloudflare reais.');
const origin=new URL(APP_ORIGIN);if(origin.protocol!=='https:'||origin.origin!==APP_ORIGIN)throw Error('APP_ORIGIN deve ser uma origem HTTPS exata, sem barra final.');
let config=readFileSync('wrangler.toml','utf8').replace('REPLACE_DATABASE_ID',DATABASE_ID).replace('REPLACE_KV_NAMESPACE_ID',KV_NAMESPACE_ID).replace('https://REPLACE_GAME_DOMAIN',APP_ORIGIN);writeFileSync('wrangler.deploy.toml',config);
