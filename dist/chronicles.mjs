// Release catalogue. IDs are permanent; names and mechanics await their chapter.
export const CHAPTERS = [
  {
    id: 'first-breath', order: 1, status: 'released', title: 'Aurora: o primeiro pertencimento',
    people: 'Viventes híbridos', nation: 'Aurora', role: 'Os primeiros a construir uma história em comum.',
    story: 'GAYA deu aos viventes o instinto de sobreviver. Mas foi entre eles que nasceu a vontade de pertencer. Sob a Primeira Raiz, seres de heranças diferentes partilharam abrigo e chamaram aquele começo de Aurora. Pela primeira vez, uma nação foi mais do que terra: foi uma escolha feita em conjunto.',
  },
  {
    id: 'elders', order: 2, status: 'unrevealed', title: 'Quando a memória ganhar um povo',
    people: 'Anciões', nation: null, role: 'Intenção narrativa: guardar a memória dos primeiros viventes.',
    story: 'Há raízes que lembram passos que ninguém mais reconhece. Quando seus guardiões despertarem, o mundo descobrirá o que sobreviveu ao esquecimento. O nome de sua nação ainda não foi revelado.',
  },
  {
    id: 'dragonas', order: 3, status: 'unrevealed', title: 'O que dorme sob a brasa',
    people: 'Dragonas', nation: null, role: 'Intenção narrativa: transformar e proteger as forças da terra profunda.',
    story: 'Entre as pedras mais antigas, uma brasa pulsa sem consumir o que toca. Alguns viventes acreditam que ela espera uma voz capaz de chamá-la pelo nome. Essa história ainda não tem uma nação.',
  },
  {
    id: 'sirenes', order: 4, status: 'unrevealed', title: 'Uma voz além das margens',
    people: 'Sirenes', nation: null, role: 'Intenção narrativa: criar vínculos entre águas, caminhos e viventes.',
    story: 'As águas carregam um intervalo de silêncio que os rios nunca explicam. Um dia, desse silêncio poderá nascer um canto — e, com ele, um povo que conhece caminhos que a terra ainda não conhece.',
  },
  {
    id: 'vampires', order: 5, status: 'unrevealed', title: 'A centelha que atravessa a noite',
    people: 'Vampiros', nation: null, role: 'Intenção narrativa: explorar o limite entre permanência, vida e transformação.',
    story: 'Nem toda centelha responde ao primeiro sol. Algumas persistem onde o dia não chega, guardando perguntas sobre o preço de continuar existindo. Suas escolhas poderão dar origem a uma nova nação.',
  },
];

// Narrative previews, deliberately separate from the live inventory and loot table.
// Future items may precede their nation's chapter, with independent availability.
export const RELICS = [
  { id:'root-memory', chapter:'elders', title:'Fragmento de uma Raiz sem Nome', rarity:'rare', availability:'preview', description:'Seus anéis parecem registrar uma estação que o mundo ainda não viveu.' },
  { id:'quiet-ember', chapter:'dragonas', title:'Brasa que Não se Apaga', rarity:'rare', availability:'preview', description:'Uma pedra fria guarda uma luz que pulsa como um coração adormecido.' },
  { id:'unheard-tide', chapter:'sirenes', title:'Concha da Maré Não Ouvida', rarity:'rare', availability:'preview', description:'Quando tudo silencia, seu interior parece esperar a primeira nota.' },
  { id:'night-seed', chapter:'vampires', title:'Semente do Último Crepúsculo', rarity:'rare', availability:'preview', description:'Não busca a luz. Ainda assim, alguma forma de vida permanece nela.' },
];

export function validateChronicles(chapters = CHAPTERS, relics = RELICS) {
  const ids = new Set(chapters.map(chapter => chapter.id));
  if (ids.size !== chapters.length) throw Error('Duplicate chapter ID');
  if (new Set(chapters.map(chapter => chapter.order)).size !== chapters.length) throw Error('Duplicate chapter order');
  if (new Set(relics.map(relic => relic.id)).size !== relics.length) throw Error('Duplicate relic ID');
  for (const chapter of chapters) {
    if (!['released','unrevealed'].includes(chapter.status)) throw Error('Invalid chapter status');
    if (chapter.status === 'released' && !chapter.nation) throw Error('Released chapter needs a nation');
  }
  for (const relic of relics) {
    if (!ids.has(relic.chapter)) throw Error('Relic references an unknown chapter');
    // Enabling collection requires a server-side drop table and a migration first.
    if (relic.availability !== 'preview') throw Error('Playable relics require server integration');
  }
  return true;
}

if (typeof document !== 'undefined') {
  validateChronicles();
  const chapterList = document.getElementById('chapterList');
  const relicList = document.getElementById('relicList');
  const element = (tag, text, className) => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
  for (const chapter of [...CHAPTERS].sort((a,b) => a.order - b.order)) {
    const article = element('article', '', 'chapter-entry');
    article.append(element('span', chapter.status === 'released' ? 'PRÓLOGO / DISPONÍVEL' : 'CAPÍTULO POR REVELAR', 'eyebrow'), element('h3', chapter.title), element('p', chapter.people + ' · ' + (chapter.nation || 'Nação por revelar'), 'chapter-people'), element('p', chapter.story), element('small', chapter.role));
    chapterList.append(article);
  }
  for (const relic of RELICS) {
    const chapter = CHAPTERS.find(item => item.id === relic.chapter);
    const article = element('article', '', 'relic-entry');
    article.append(element('span', '◇ RARA / PRÉVIA', 'eyebrow'), element('h3', relic.title), element('p', relic.description), element('small', chapter.people + ' · ainda não disponível para coleta'));
    relicList.append(article);
  }
  const dialog = document.getElementById('chronicles');
  document.getElementById('openChronicles').onclick = () => dialog.showModal();
  document.getElementById('closeChronicles').onclick = () => dialog.close();
}
