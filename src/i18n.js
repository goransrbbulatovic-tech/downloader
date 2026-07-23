// ─── Translations ──────────────────────────────────────────────────────────────
export const LANGS = {
  en: 'English',
  bs: 'Bosanski',
  sr: 'Srpski',
  hr: 'Hrvatski',
}

export const T = {
  // Nav
  downloader:   { en:'Downloader',        bs:'Preuzimač',         sr:'Preuzimač',         hr:'Preuzimač' },
  queue:        { en:'Queue',             bs:'Red čekanja',       sr:'Red čekanja',       hr:'Red čekanja' },
  stats:        { en:'Statistics',        bs:'Statistike',        sr:'Statistike',        hr:'Statistike' },
  history:      { en:'History',           bs:'Historija',         sr:'Istorija',          hr:'Povijest' },
  reminders:    { en:'Reminders',         bs:'Podsjetnici',       sr:'Podsjetnici',       hr:'Podsjetnici' },
  convert:      { en:'Convert',           bs:'Konverzija',        sr:'Konverzija',        hr:'Konverzija' },
  settings:     { en:'Settings',          bs:'Postavke',          sr:'Podešavanja',       hr:'Postavke' },

  // Downloader page
  downloadTitle:{ en:'Download Video',    bs:'Preuzmi Video',     sr:'Preuzmi Video',     hr:'Preuzmi Video' },
  downloadSub:  { en:'YouTube, Vimeo, TikTok, Instagram and 1000+ sites',
                  bs:'YouTube, Vimeo, TikTok, Instagram i 1000+ sajtova',
                  sr:'YouTube, Vimeo, TikTok, Instagram i 1000+ sajtova',
                  hr:'YouTube, Vimeo, TikTok, Instagram i 1000+ stranica' },
  videoUrls:    { en:'Video URLs',        bs:'Video linkovi',     sr:'Video linkovi',     hr:'Video linkovi' },
  addUrl:       { en:'+ Add URL',         bs:'+ Dodaj link',      sr:'+ Dodaj link',      hr:'+ Dodaj link' },
  format:       { en:'FORMAT',            bs:'FORMAT',            sr:'FORMAT',            hr:'FORMAT' },
  quality:      { en:'QUALITY',           bs:'KVALITET',          sr:'KVALITET',          hr:'KVALITET' },
  options:      { en:'OPTIONS',           bs:'OPCIJE',            sr:'OPCIJE',            hr:'OPCIJE' },
  download:     { en:'Download',          bs:'Preuzmi',           sr:'Preuzmi',           hr:'Preuzmi' },
  downloadBtn:  { en:'Download Video',    bs:'Preuzmi Video',     sr:'Preuzmi Video',     hr:'Preuzmi Video' },
  downloadMany: { en:'Download {n} Videos', bs:'Preuzmi {n} videa', sr:'Preuzmi {n} videa', hr:'Preuzmi {n} videa' },
  preview:      { en:'Preview',           bs:'Pregled',           sr:'Pregled',           hr:'Pregled' },
  clear:        { en:'Clear',             bs:'Obriši',            sr:'Obriši',            hr:'Obriši' },
  dropHere:     { en:'Drop links here',   bs:'Pusti linkove ovdje', sr:'Pusti linkove ovde', hr:'Pusti linkove ovdje' },
  pasteMulti:   { en:'Tip: paste multiple URLs at once · Drag links from browser here',
                  bs:'Savjet: zalijepi više linkova odjednom · Prevuci linkove iz browsera ovdje',
                  sr:'Savet: zalepi više linkova odjednom · Prevuci linkove iz browsera ovde',
                  hr:'Savjet: zalijepi više linkova odjednom · Prevuci linkove iz preglednika ovdje' },
  clipMode:     { en:'Clip (time range)', bs:'Isječak (raspon)',  sr:'Isečak (raspon)',   hr:'Isječak (raspon)' },
  from:         { en:'From',              bs:'Od',                sr:'Od',                hr:'Od' },
  to:           { en:'To',               bs:'Do',                sr:'Do',                hr:'Do' },
  subtitles:    { en:'Download subtitles', bs:'Preuzmi titlove',  sr:'Preuzmi titlove',   hr:'Preuzmi titlove' },
  thumbOnly:    { en:'Thumbnail only',    bs:'Samo sličica',      sr:'Samo sličica',      hr:'Samo sličica' },
  platforms:    { en:'SUPPORTED PLATFORMS', bs:'PODRŽANE PLATFORME', sr:'PODRŽANE PLATFORME', hr:'PODRŽANE PLATFORME' },
  starting:     { en:'Starting…',        bs:'Pokrećem…',         sr:'Pokrećem…',         hr:'Pokrećem…' },

  // Queue
  downloadQueue:{ en:'Download Queue',   bs:'Red preuzimanja',   sr:'Red preuzimanja',   hr:'Red preuzimanja' },
  total:        { en:'total',             bs:'ukupno',            sr:'ukupno',            hr:'ukupno' },
  active:       { en:'active',            bs:'aktivno',           sr:'aktivno',           hr:'aktivno' },
  completed:    { en:'completed',         bs:'završeno',          sr:'završeno',          hr:'završeno' },
  all:          { en:'All',              bs:'Sve',               sr:'Sve',               hr:'Sve' },
  activeTab:    { en:'Active',            bs:'Aktivno',           sr:'Aktivno',           hr:'Aktivno' },
  doneTab:      { en:'Done',             bs:'Završeno',          sr:'Završeno',          hr:'Završeno' },
  failedTab:    { en:'Failed',           bs:'Neuspješno',        sr:'Neuspešno',         hr:'Neuspješno' },
  openFolder:   { en:'Open folder',      bs:'Otvori folder',     sr:'Otvori folder',     hr:'Otvori mapu' },
  clearDone:    { en:'Clear finished',   bs:'Obriši završene',   sr:'Obriši završene',   hr:'Obriši završene' },
  clearAll:     { en:'Clear all',        bs:'Obriši sve',        sr:'Obriši sve',        hr:'Obriši sve' },
  stopAll:      { en:'Stop all',         bs:'Stop sve',          sr:'Stop sve',          hr:'Zaustavi sve' },
  pauseQueue:   { en:'Pause queue',      bs:'Pauziraj red',      sr:'Pauziraj red',      hr:'Pauziraj red' },
  resume:       { en:'Resume',           bs:'Nastavi',           sr:'Nastavi',           hr:'Nastavi' },
  noDownloads:  { en:'No downloads. Add URLs and start!', bs:'Nema preuzimanja. Dodaj URL i kreni!', sr:'Nema preuzimanja. Dodaj URL i kreni!', hr:'Nema preuzimanja. Dodaj URL i kreni!' },

  // Settings
  engine:       { en:'yt-dlp Engine',    bs:'yt-dlp Motor',      sr:'yt-dlp Motor',      hr:'yt-dlp Motor' },
  installed:    { en:'Installed',        bs:'Instaliran',        sr:'Instaliran',        hr:'Instaliran' },
  notInstalled: { en:'Not installed',    bs:'Nije instaliran',   sr:'Nije instaliran',   hr:'Nije instaliran' },
  installAuto:  { en:'Install Automatically', bs:'Instaliraj automatski', sr:'Instaliraj automatski', hr:'Instaliraj automatski' },
  update:       { en:'Update',           bs:'Ažuriraj',          sr:'Ažuriraj',          hr:'Ažuriraj' },
  saved:        { en:'Saved',            bs:'Sačuvano',          sr:'Sačuvano',          hr:'Spremljeno' },
  language:     { en:'Language',         bs:'Jezik',             sr:'Jezik',             hr:'Jezik' },
  theme:        { en:'Theme',            bs:'Tema',              sr:'Tema',              hr:'Tema' },
  darkTheme:    { en:'Dark',             bs:'Tamna',             sr:'Tamna',             hr:'Tamna' },
  lightTheme:   { en:'Light',            bs:'Svijetla',          sr:'Svetla',            hr:'Svijetla' },
  downloadPath: { en:'Download location', bs:'Lokacija preuzimanja', sr:'Lokacija preuzimanja', hr:'Lokacija preuzimanja' },
  browse:       { en:'Browse',           bs:'Odaberi',           sr:'Odaberi',           hr:'Odaberi' },
  maxConcurrent:{ en:'Max concurrent downloads', bs:'Max paralelnih preuzimanja', sr:'Max paralelnih preuzimanja', hr:'Max paralelnih preuzimanja' },
  defaultFormat:{ en:'Default format',   bs:'Podrazumjevani format', sr:'Podrazumjevani format', hr:'Zadani format' },
  defaultQuality:{ en:'Default quality', bs:'Podrazumjevani kvalitet', sr:'Podrazumjevani kvalitet', hr:'Zadana kvaliteta' },
  notifications:{ en:'Desktop notifications', bs:'Desktop notifikacije', sr:'Desktop notifikacije', hr:'Obavijesti' },
  saveHistory:  { en:'Save download history', bs:'Čuvaj historiju preuzimanja', sr:'Čuvaj istoriju preuzimanja', hr:'Spremi povijest preuzimanja' },
  appSection:   { en:'APPLICATION',      bs:'APLIKACIJA',        sr:'APLIKACIJA',        hr:'APLIKACIJA' },
  downloadSection:{ en:'DOWNLOAD OPTIONS', bs:'OPCIJE PREUZIMANJA', sr:'OPCIJE PREUZIMANJA', hr:'OPCIJE PREUZIMANJA' },

  // Bandwidth / Stats
  bandwidth:    { en:'Bandwidth Today',  bs:'Brzina danas',      sr:'Brzina danas',      hr:'Brzina danas' },

  // Convert
  batchConvert: { en:'Batch Convert',    bs:'Grupna konverzija', sr:'Grupna konverzija', hr:'Grupna konverzija' },
  batchConvertSub:{ en:'Each file can have its own format — click the format badge to change',
                    bs:'Svaki fajl može imati svoj format — klikni na oznaku formata da promijeniš',
                    sr:'Svaki fajl može imati svoj format — klikni na oznaku formata da promeniš',
                    hr:'Svaka datoteka može imati vlastiti format — klikni na oznaku formata za promjenu' },
  selectFiles:  { en:'Click or drag files here', bs:'Klikni ili prevuci fajlove ovdje', sr:'Klikni ili prevuci fajlove ovde', hr:'Klikni ili prevuci datoteke ovdje' },
  convertTo:    { en:'Default format',   bs:'Podrazumjevani format', sr:'Podrazumjevani format', hr:'Zadani format' },
  startConvert: { en:'Start converting', bs:'Pokreni konverziju', sr:'Pokreni konverziju', hr:'Pokreni konverziju' },
  stopConvert:  { en:'Stop',             bs:'Stop',              sr:'Stop',              hr:'Zaustavi' },
  clearList:    { en:'Clear list',       bs:'Obriši listu',      sr:'Obriši listu',      hr:'Obriši listu' },
  outputFolder: { en:'Output folder',    bs:'Folder za snimanje', sr:'Folder za snimanje', hr:'Mapa za snimanje' },
  sameAsSource: { en:'Same folder as source file', bs:'Isti folder kao originalni fajl', sr:'Isti folder kao originalni fajl', hr:'Ista mapa kao izvorna datoteka' },

  // Mini player
  miniPlayer:   { en:'Mini Player',      bs:'Mini prikaz',       sr:'Mini prikaz',       hr:'Mini prikaz' },

  // Reminders
  newReminder:  { en:'New Reminder',     bs:'Novi podsjetnik',   sr:'Novi podsetnik',    hr:'Novi podsjetnik' },
  reminderMsg:  { en:'Message',          bs:'Poruka',            sr:'Poruka',            hr:'Poruka' },
  saveReminder: { en:'Save Reminder',    bs:'Sačuvaj podsjetnik', sr:'Sačuvaj podsetnik', hr:'Spremi podsjetnik' },
  upcoming:     { en:'UPCOMING',         bs:'NADOLAZEĆI',        sr:'NADOLAZEĆI',        hr:'NADOLAZEĆI' },
  past:         { en:'PAST',             bs:'PROŠLI',            sr:'PROŠLI',            hr:'PROŠLI' },
}

export function t(key, lang = 'en') {
  return (T[key] && T[key][lang]) || (T[key] && T[key]['en']) || key
}
