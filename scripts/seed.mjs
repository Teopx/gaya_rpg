import {writeFileSync,mkdirSync} from 'node:fs';
import {FAUNA} from '../server/rules.mjs';
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
const sql=[];Object.keys(FAUNA).forEach((continent,index)=>{for(let n=0;n<4;n++)sql.push(`INSERT OR IGNORE INTO nations(id,name,continent) VALUES(${quote(index+'-'+n)},${quote(['Aurora','Obsidiana','Maré','Verdante'][n])},${quote(continent)});`);for(let i=0;i<64;i++){const x=((i*17)%25)-12,z=((i*7)%25)-12;sql.push(`INSERT OR IGNORE INTO resource_nodes(id,continent,kind,x,z) VALUES(${quote(index+'-node-'+i)},${quote(continent)},${quote(['fruit','plant','liquid','coin'][i%4])},${x},${z});`);}});mkdirSync('build',{recursive:true});writeFileSync('build/seed.sql',sql.join('\n'));console.log('Seed gerado: 28 nações e 448 recursos.');
