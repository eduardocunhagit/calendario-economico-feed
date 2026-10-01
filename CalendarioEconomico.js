// Scriptable: agenda US + BR e pesquisas presidenciais brasileiras.
// Dados públicos. Sem credenciais, calendário privado ou notificações.
const FEED_URL = "https://raw.githubusercontent.com/eduardocunhagit/calendario-economico-feed/main/events.json";
const BRT = "America/Sao_Paulo";
const MAX_AGE = 8 * 86400000;

function dateKey(value) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: BRT, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = name => parts.find(p => p.type === name).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function clock(value) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: BRT, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
function shortDate(day) { return `${day.slice(8, 10)}/${day.slice(5, 7)}`; }
function validInstant(value) {
  return typeof value === "string" && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}
function validDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function countryCode(event) {
  const value = event.country.trim().toLowerCase();
  if (["us", "usa", "eua", "united states", "estados unidos"].includes(value)) return "US";
  if (["br", "brasil", "brazil"].includes(value)) return "BR";
  return null;
}
function isPoll(event) { return event.kind === "poll"; }
function validateFeed(feed) {
  if (!feed || ![1, 2].includes(feed.schema_version) || feed.timezone !== BRT || !Array.isArray(feed.events)) throw new Error("Formato inválido");
  if (!validDay(feed.coverage_start) || !validDay(feed.coverage_end) || feed.coverage_start > feed.coverage_end) throw new Error("Período inválido");
  if (!validInstant(feed.updated_at)) throw new Error("Atualização sem data");
  const ids = new Set();
  for (const event of feed.events) {
    if (!event || typeof event.id !== "string" || !event.id || ids.has(event.id)) throw new Error("Identificador inválido");
    ids.add(event.id);
    if (typeof event.title !== "string" || !event.title.trim() || typeof event.country !== "string" || !event.country.trim() || typeof event.currency !== "string") throw new Error("Evento incompleto");
    if (event.title_pt != null && (typeof event.title_pt !== "string" || !event.title_pt.trim())) throw new Error("Rótulo inválido");
    if (!["low", "medium", "high"].includes(event.importance) || !/^https:\/\/[^/@]+\//.test(event.source_url || "")) throw new Error("Fonte ou importância inválida");
    if (event.kind != null && !["economic", "poll"].includes(event.kind)) throw new Error("Tipo de evento inválido");
    if (isPoll(event)) {
      if (feed.schema_version !== 2 || event.starts_at !== null || !validDay(event.date) || event.permitted_release_date !== event.date) throw new Error("Data da pesquisa inválida");
      if (countryCode(event) !== "BR" || typeof event.institute !== "string" || !event.institute.trim() || !/^BR-\d{5}\/\d{4}$/.test(event.registration || "")) throw new Error("Pesquisa incompleta");
      if (event.time_status != null && event.time_status !== "unknown") throw new Error("Não inventar horário de pesquisa");
    } else {
      if (!validInstant(event.starts_at)) throw new Error("Horário inválido");
      if (event.date != null && event.date !== dateKey(event.starts_at)) throw new Error("Data e horário divergentes");
      if (event.time_status != null && event.time_status !== "exact") throw new Error("Horário econômico inválido");
    }
  }
  if (feed.polls != null) {
    const p = feed.polls;
    if (!p || !["checked", "pending"].includes(p.status)) throw new Error("Cobertura de pesquisas inválida");
    for (const key of ["coverage_start", "coverage_end", "active_until"]) if (p[key] != null && !validDay(p[key])) throw new Error("Período de pesquisas inválido");
    if (p.checked_at != null && !validInstant(p.checked_at)) throw new Error("Checagem de pesquisas inválida");
    if (p.source_generated_at != null && !validInstant(p.source_generated_at)) throw new Error("Data da fonte de pesquisas inválida");
    if (p.status === "checked" && (!validDay(p.coverage_start) || !validDay(p.coverage_end) || p.coverage_start > p.coverage_end || !validInstant(p.checked_at))) throw new Error("Cobertura não comprovada");
  }
  return feed;
}
function eventDay(event) { return isPoll(event) ? event.date : dateKey(event.starts_at); }
function todayEvents(feed, now) {
  validateFeed(feed);
  const day = dateKey(now);
  return feed.events.filter(event => eventDay(event) === day).sort((a, b) => {
    const aTime = isPoll(a) ? Infinity : Date.parse(a.starts_at);
    const bTime = isPoll(b) ? Infinity : Date.parse(b.starts_at);
    return (aTime === bTime ? 0 : aTime - bTime) || a.id.localeCompare(b.id);
  });
}

// Rótulos curtos: o título original e a fonte permanecem no feed.
const LABELS = {
  "Initial Jobless Claims": "Auxílio-desemprego: novos pedidos",
  "Continuing Jobless Claims": "Auxílio-desemprego: contínuos",
  "Manufacturing Purchasing Managers Index (PMI)": "PMI industrial (S&P)",
  "S&P Global Manufacturing Purchasing Managers Index (PMI)": "PMI industrial (S&P)",
  "S&P Global Services Purchasing Managers Index (PMI)": "PMI serviços (S&P)",
  "Services Purchasing Managers Index (PMI)": "PMI serviços (S&P)",
  "S&P Global Composite Purchasing Managers Index (PMI)": "PMI composto (S&P)",
  "ISM Manufacturing Employment": "ISM indústria: emprego",
  "ISM Manufacturing Purchasing Managers Index (PMI)": "ISM indústria: PMI",
  "ISM Manufacturing Prices": "ISM indústria: preços",
  "ISM Non-Manufacturing Employment": "ISM serviços: emprego",
  "ISM Non-Manufacturing Purchasing Managers Index (PMI)": "ISM serviços: PMI",
  "ISM Non-Manufacturing Prices": "ISM serviços: preços",
  "Construction Spending": "Gastos em construção",
  "Federal Reserve Balance Sheet": "Balanço do Fed",
  "Federal Reserve Bank of Atlanta GDPNow": "Fed Atlanta: projeção GDPNow",
  "Nonfarm Payrolls": "Emprego não agrícola (payroll)",
  "Private Nonfarm Payrolls": "Emprego privado não agrícola",
  "ADP Nonfarm Employment Change": "ADP: variação do emprego",
  "ADP Employment Change Weekly": "ADP: emprego semanal",
  "Average Hourly Earnings": "Salário médio por hora",
  "Unemployment Rate": "Taxa de desemprego",
  "U6 Unemployment Rate": "Desemprego ampliado (U6)",
  "Participation Rate": "Taxa de participação",
  "JOLTS Job Openings": "JOLTS: vagas de emprego",
  "Factory Orders": "Encomendas à indústria",
  "Consumer Credit": "Crédito ao consumidor",
  "CB Consumer Confidence": "Confiança do consumidor (CB)",
  "Chicago Purchasing Managers Index (PMI)": "PMI de Chicago",
  "Core PCE Price Index": "Núcleo do PCE",
  "Core PCE Prices": "Núcleo do PCE",
  "PCE Price index": "Inflação PCE",
  "PCE price index": "Inflação PCE",
  "Personal Spending": "Gastos pessoais",
  "Gross Domestic Product (GDP)": "PIB",
  "Gross Domestic Product (GDP) Price Index": "Deflator do PIB",
  "Trade Balance": "Balança comercial",
  "Goods Trade Balance": "Balança comercial de bens",
  "Exports": "Exportações",
  "Imports": "Importações",
  "Retail Inventories Excluding Auto": "Estoques varejistas, sem veículos",
  "Crude Oil Inventories": "Estoques de petróleo (EIA)",
  "Cushing Crude Oil Inventories": "Estoques de petróleo: Cushing",
  "API Weekly Crude Oil Stock": "Estoques de petróleo (API)",
  "Baker Hughes Oil Rig Count": "Baker Hughes: sondas de petróleo",
  "Baker Hughes Total Rig Count": "Baker Hughes: total de sondas",
  "Federal Open Market Committee (FOMC) Meeting Minutes": "Ata do FOMC",
  "Michigan Consumer Sentiment": "Michigan: sentimento consumidor",
  "Michigan Consumer Expectations": "Michigan: expectativas consumidor",
  "Michigan 1-Year Inflation Expectations": "Michigan: inflação esperada 1 ano",
  "Michigan 5-Year Inflation Expectations": "Michigan: inflação esperada 5 anos",
  "NY Fed 1-Year Consumer Inflation Expectations": "Fed NY: inflação esperada 1 ano",
  "BCB Focus Market Readout": "Boletim Focus",
  "Auto Production": "Produção de veículos",
  "Auto Sales": "Vendas de veículos",
  "Bank lending": "Crédito bancário",
  "Budget Balance": "Resultado orçamentário",
  "Budget Surplus": "Superávit orçamentário",
  "CAGED Net Payroll Jobs": "Caged: saldo de empregos",
  "Consumer Price Index (CPI)": "Índice de preços ao consumidor",
  "Current Account (USD)": "Conta corrente (US$)",
  "Foreign Exchange Flows": "Fluxo cambial",
  "Foreign direct investment (USD)": "Investimento direto (US$)",
  "Gross Debt-to-GDP ratio": "Dívida bruta / PIB",
  "Net Debt-to-GDP ratio": "Dívida líquida / PIB",
  "IGP-DI Inflation Index": "IGP-DI",
  "IGP-M Inflation Index": "IGP-M",
  "IPC-Fipe Inflation Index": "IPC-Fipe",
  "Industrial Production": "Produção industrial",
  "Long Term Interest Rate TJLP": "TJLP",
  "IPCA Inflation Index Seasonally Adjusted": "IPCA dessazonalizado",
  "Producer Price Index": "Preços ao produtor",
  "OPEC Meeting": "Reunião da Opep",
  "United States Department of Agriculture (USDA) World Agricultural Supply and Demand Estimates Report": "USDA: relatório WASDE"
};
function compactTitle(event) {
  if (event.title_pt) return event.title_pt.trim();
  let title = event.title.replace(/^(?:U\.S\. |Brazilian |Brazil )/, "");
  const suffix = title.match(/ (MoM|YoY|QoQ)$/);
  if (suffix) title = title.slice(0, -suffix[0].length);
  let label = LABELS[title];
  if (!label) {
    const speech = title.match(/^(?:Fed |Federal Open Market Committee \(FOMC\) Member |FOMC Member |Fed Vice Chair for Supervision of the Board of Governors )(.+) Speaks$/);
    const auction = title.match(/^(\d+)-Year (?:Note|Bond) Auction$/);
    const positions = title.match(/^CFTC (.+) speculative net positions$/);
    if (speech) label = `Fed: fala de ${speech[1]}`;
    else if (auction) label = `Leilão do Tesouro: ${auction[1]} anos`;
    else if (positions) label = `CFTC: posições líquidas ${positions[1]}`;
    else if (title === "President Trump Speaks") label = "Pronunciamento de Trump";
    else label = title;
  }
  return label + (suffix ? ` ${ {MoM:"m/m",YoY:"a/a",QoQ:"t/t"}[suffix[1]] }` : "");
}
function compactInstitute(value) {
  const names = [
    ["DATAFOLHA", "Datafolha"], ["REAL TIME BIG DATA", "Real Time Big Data"],
    ["DATATRENDS", "Datatrends"], ["INSTITUTO FRANCA", "Instituto Franca"],
    ["INSTITUTO VOX BRASIL", "Vox Brasil"], ["100 CIDADES", "100 Cidades"],
    ["ATLASINTEL", "AtlasIntel"], ["MDA-PESQUISA", "MDA"],
    ["PALVER", "Palver"], ["PODERDATA", "PoderData"],
    ["QUAEST", "Quaest"], ["VERITA", "Verita"]
  ];
  const name = names.find(([prefix]) => value.trim().toUpperCase().startsWith(prefix));
  return name ? name[1] : value.trim();
}
function pollCoverage(feed, day, now=new Date()) {
  const p = feed.polls;
  if (p && p.active_until && day > p.active_until) return {active:false, checked:false};
  const age=p && validInstant(p.source_generated_at) ? new Date(now).getTime()-Date.parse(p.source_generated_at) : Infinity;
  const sourceFresh=age>=-300000 && age<=48*3600000;
  const covered=!!(p && p.status === "checked" && p.coverage_start <= day && p.coverage_end >= day);
  const checked=covered && sourceFresh;
  const warning=checked?null:covered && !sourceFresh?"Pesquisas: fonte TSE desatualizada":"Pesquisas: cobertura não verificada";
  return {active:true, checked,sourceFresh,warning};
}
function estimatedLines(text, width, fontSize, maxLines=3) {
  // Conservative width estimate; reserve height before creating native text.
  let em = 0;
  for (const c of text) em += /[ilIjtfr.,:;!' ]/.test(c) ? 0.31 : /[MW@%]/.test(c) ? 0.92 : 0.59;
  return Math.max(1, Math.min(maxLines, Math.ceil(em * fontSize / width)));
}
function planWidget(feed, now, requestedFamily) {
  const family = ["small", "medium", "large", "extraLarge"].includes(requestedFamily) ? requestedFamily : "large";
  const day = dateKey(now);
  const coverage = pollCoverage(feed, day, now);
  const today = todayEvents(feed, now);
  const economicCovered = day >= feed.coverage_start && day <= feed.coverage_end;
  const economics = economicCovered ? today.filter(e => !isPoll(e) && (countryCode(e)==="BR" || (countryCode(e)==="US" && e.importance==="high"))) : [];
  const polls = coverage.active ? today.filter(isPoll) : [];
  const width = family === "small" ? 126 : 272;
  const height = family === "large" || family === "extraLarge" ? 291 : 126;
  const font = 11.5;
  const rowHeight = 15;
  const economicBlocks = economics.map(event => {
    const label = compactTitle(event);
    const lines = estimatedLines(label, width-57, font);
    return {event,label,lines,height:rowHeight*lines,type:"economic"};
  });
  const pollBlocks = polls.map(event => {
    const institute = compactInstitute(event.institute);
    const label = `${institute} · ${event.registration}`;
    const lines = estimatedLines(label, width, 10.5, 3);
    return {event,label,lines,height:15*lines,type:"poll"};
  });
  const pollStatus = !coverage.active ? null : !coverage.checked ? coverage.warning : polls.length ? null : "Nenhum registro para hoje";
  const pollOverhead = coverage.active ? 17 + (polls.length ? 24 : 0) + (pollStatus ? 12 : 0) : 0;
  const overhead = 30 + 13 + 26 + pollOverhead + (economics.length ? 0 : 15);
  const available = Math.max(0,height-overhead);
  const required = economicBlocks.reduce((n,b)=>n+b.height,0)+pollBlocks.reduce((n,b)=>n+b.height,0);
  const needsOverflow = family === "small" || required > available;
  let remaining = Math.max(0,available-(needsOverflow ? 13 : 0));
  const selectedEconomics=[], selectedPolls=[];
  if (family !== "small") {
    // When space is scarce, reserve a fair share for both requested groups.
    let i=0,j=0;
    while(i<economicBlocks.length || j<pollBlocks.length) {
      let progressed=false;
      for(let k=0;k<4 && i<economicBlocks.length;k++) {
        const block=economicBlocks[i];
        if(block.height<=remaining) {selectedEconomics.push(block);remaining-=block.height;progressed=true;i++;} else break;
      }
      if(j<pollBlocks.length && pollBlocks[j].height<=remaining) {const block=pollBlocks[j++];selectedPolls.push(block);remaining-=block.height;progressed=true;}
      if(!progressed) break;
    }
  }
  const total=economics.length+polls.length;
  const shown=selectedEconomics.length+selectedPolls.length;
  const overflow=shown<total;
  return {family,day,width,height,font,rowHeight,economicCovered,economics,polls,coverage,pollStatus,selectedEconomics,selectedPolls,total,shown,overflow,overhead,usedHeight:overhead+(overflow?13:0)+selectedEconomics.reduce((n,b)=>n+b.height,0)+selectedPolls.reduce((n,b)=>n+b.height,0)};
}

async function loadFeed() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.cacheDirectory(), "economic-calendar-events-v2.json");
  const legacy = fm.joinPath(fm.cacheDirectory(), "economic-calendar-events-v1.json");
  const request = new Request(FEED_URL);
  try {
    request.timeoutInterval = 20;
    const feed = validateFeed(await request.loadJSON());
    if (request.response && request.response.statusCode !== 200) throw new Error("Feed indisponível");
    try { fm.writeString(cache, JSON.stringify(feed)); } catch (_) {}
    return {feed,cached:false};
  } catch (_) {
    for (const path of [cache, legacy]) if (fm.fileExists(path)) {
      try {
        const feed = validateFeed(JSON.parse(fm.readString(path)));
        if (Date.now()-Date.parse(feed.updated_at)<=MAX_AGE) return {feed,cached:true};
      } catch (_) {}
    }
    return {feed:null,cached:false};
  }
}
function addText(parent, value, size, color="ffffff", bold=false, limit=1) {
  const text = parent.addText(value);
  text.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  text.textColor = new Color(color);
  text.lineLimit = limit;
  text.minimumScaleFactor = 0.9;
  return text;
}
function fixedRow(parent,height) {
  const row=parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.size=new Size(0,height);
  return row;
}
async function main() {
  const {feed,cached}=await loadFeed();
  const now=new Date();
  const family=config.runsInWidget ? config.widgetFamily : "large";
  const widget=new ListWidget();
  widget.backgroundColor=new Color("10283b");
  widget.setPadding(10,10,10,10);
  widget.refreshAfterDate=new Date(Date.now()+30*60000);
  // Tapping the background opens this script's large preview, not a repo/list.
  widget.url=URLScheme.forRunningScript();
  if (family && family.startsWith("accessory")) {
    addText(widget,"Agenda US/BR: use widget grande",10,"ffffff",false,2);
  } else {
    addText(widget,"AGENDA US + BR",12,"6fd3c1",true);
    addText(widget,`${shortDate(dateKey(now))} · horários de Brasília`,10,"b8c8d4");
    widget.addSpacer(4);
    if(!feed) {
      addText(widget,"Não foi possível atualizar a agenda.",12,"ffffff",false,3);
    } else {
      const plan=planWidget(feed,now,family);
      if(plan.family==="small") {
        addText(widget,`${plan.economics.length} eventos US/BR`,11);
        if(plan.coverage.active) addText(widget,`${plan.polls.length} registros de pesquisa`,10);
        widget.addSpacer(4);
        addText(widget,"Use o widget grande para a agenda do dia.",10,"ffcf83",false,3);
        if(plan.pollStatus && !plan.coverage.checked) addText(widget,"Pesquisas não verificadas",9,"ffcf83",false,2);
      } else {
        addText(fixedRow(widget,13),`US ALTA + BR TODAS · ${plan.economics.length} eventos`,9,"6fd3c1",true);
        if(!plan.economics.length) addText(fixedRow(widget,15),plan.economicCovered?"Sem eventos desse recorte hoje":"Economia fora do período publicado",10,"b8c8d4");
        for(const block of plan.selectedEconomics) {
          const row=fixedRow(widget,block.height);
          row.url=block.event.source_url;
          const meta=row.addStack();meta.size=new Size(57,block.height);meta.centerAlignContent();
          addText(meta,`${clock(block.event.starts_at)} ${countryCode(block.event)}`,10,"b8c8d4");
          const label=addText(row,block.label,plan.font,block.event.importance==="high"?"ffffff":"d9e3e9",block.event.importance==="high",block.lines);
          label.url=block.event.source_url;
        }
        if(plan.coverage.active) {
          widget.addSpacer(4);
          addText(fixedRow(widget,13),`PRESIDENCIAIS · ${plan.polls.length} registros no feed`,9,"6fd3c1",true);
          for(const block of plan.selectedPolls) {
            const row=widget.addStack();row.layoutVertically();row.size=new Size(0,block.height);row.url=block.event.source_url;
            addText(row,block.label,10.5,"ffffff",true,block.lines);
          }
          if(plan.polls.length) {
            addText(fixedRow(widget,12),"Divulgação permitida hoje · sem horário",9,"b8c8d4");
            addText(fixedRow(widget,12),"Publicação não confirmada",9,"b8c8d4");
          }
          if(plan.pollStatus) addText(fixedRow(widget,12),plan.pollStatus,9,"ffcf83");
        }
        if(plan.overflow) {
          addText(fixedRow(widget,13),`${plan.family==="medium"?"Use grande":"Limite do widget"}: ${plan.shown}/${plan.total} itens visíveis`,9,"ffcf83",true);
        }
      }
      widget.addSpacer();
      const stale=Date.now()-Date.parse(feed.updated_at)>MAX_AGE;
      addText(widget,`${cached?"Cache · ":""}Economia: ${shortDate(dateKey(feed.updated_at))} ${clock(feed.updated_at)}${stale?" · antiga":""}`,9,stale?"ffcf83":"b8c8d4");
      if(plan.coverage.active && feed.polls && feed.polls.checked_at) addText(widget,`Pesquisas: ${shortDate(dateKey(feed.polls.checked_at))} ${clock(feed.polls.checked_at)}`,9,"b8c8d4");
    }
  }
  Script.setWidget(widget);
  if(!config.runsInWidget) await widget.presentLarge();
  Script.complete();
}
if(typeof Script!=="undefined") {
  await main();
} else if(typeof module!=="undefined") {
  module.exports={dateKey,clock,validInstant,validDay,validateFeed,todayEvents,countryCode,compactTitle,compactInstitute,pollCoverage,planWidget,estimatedLines};
}
