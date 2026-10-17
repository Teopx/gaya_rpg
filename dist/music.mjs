// Original score sketches for GAYA. MIDI notes; no recordings or external samples.
export const TRACKS = [
  { id:'opening', title:'O Primeiro Sopro', scene:'Abertura e Livro da Criação', root:50, bpm:64, voice:'pad', color:0, drums:0, melody:[0,7,12,14,10,7,3,2] },
  { id:'characters', title:'Centelhas por Nascer', scene:'Criação e escolha de personagens', root:62, bpm:76, voice:'bell', color:1, drums:0, melody:[0,3,7,12,10,7,5,3] },
  { id:'south-america', title:'O Coração da Primeira Raiz', scene:'América do Sul', root:50, bpm:80, voice:'flute', color:2, drums:.22, melody:[0,3,7,10,12,7,5,3] },
  { id:'north-america', title:'Horizontes do Primeiro Céu', scene:'América do Norte', root:55, bpm:84, voice:'string', color:3, drums:.2, melody:[0,7,12,14,12,7,5,2] },
  { id:'africa', title:'Quando a Terra Aprendeu a Pulsar', scene:'África', root:48, bpm:96, voice:'pluck', color:4, drums:.38, melody:[0,7,10,12,7,3,5,0] },
  { id:'europe', title:'Memórias sob a Névoa', scene:'Europa', root:53, bpm:72, voice:'string', color:5, drums:.08, melody:[0,2,3,7,10,7,5,2] },
  { id:'asia', title:'O Nome das Montanhas', scene:'Ásia', root:57, bpm:72, voice:'pluck', color:6, drums:.12, melody:[0,3,5,7,10,12,7,5] },
  { id:'oceania', title:'As Águas Sonham', scene:'Oceania', root:55, bpm:68, voice:'flute', color:7, drums:.1, melody:[0,7,10,14,12,10,7,3] },
  { id:'antarctica', title:'A Vida no Silêncio', scene:'Antártida', root:62, bpm:60, voice:'bell', color:8, drums:0, melody:[0,12,7,14,10,7,3,0] },
  { id:'frontier', title:'Além das Raízes', scene:'Fronteira hostil', root:38, bpm:100, voice:'string', color:9, drums:.4, melody:[0,2,3,7,5,3,2,-2] },
  { id:'raid', title:'O Juramento do Guardião', scene:'Raide', root:38, bpm:112, voice:'string', color:10, drums:.55, melody:[0,7,3,10,7,12,10,7] },
  { id:'ascension', title:'Asas do Primeiro Vivente', scene:'Transformação / ascensão', root:57, bpm:96, voice:'bell', color:11, drums:.28, melody:[0,7,12,15,14,12,10,7] },
  { id:'trailer', title:'ATMOSPHERE: Toda Vida Tem uma Origem', scene:'Tema do trailer · 4 atos', root:50, bpm:88, voice:'string', color:12, drums:.5, bars:16, melody:[0,7,12,14,10,7,3,0] },
];
export const CONTINENT_TRACK = {'América do Sul':'south-america','América do Norte':'north-america','África':'africa','Europa':'europe','Ásia':'asia','Oceania':'oceania','Antártida':'antarctica'};
export function sceneTrack(state) {
  if (state.creator) return 'characters';
  if (state.codex || state.login || !state.player) return 'opening';
  if (state.morph) return 'ascension';
  if (state.raid) return 'raid';
  if (state.player.z > 4) return 'frontier';
  return CONTINENT_TRACK[state.player.origin] || 'opening';
}
