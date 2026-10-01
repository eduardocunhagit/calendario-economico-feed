// Scriptable: Calendário Econômico. Uses only the public economic JSON feed.
// No credentials, private calendar access, contacts, notifications or paid APIs.
const FEED_URL = "https://raw.githubusercontent.com/eduardocunhagit/calendario-economico-feed/main/calendar.json";
const BRT = "America/Sao_Paulo";

function dateKey(value) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: BRT, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = name => parts.find(p => p.type === name).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function clock(value) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: BRT, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}

function validInstant(value) {
  return typeof value === "string" && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}

function validateFeed(feed) {
  if (!feed || feed.schema_version !== 1 || feed.timezone !== BRT || !Array.isArray(feed.events)) throw new Error("Formato inválido");
  if (!["pending", "ready"].includes(feed.status)) throw new Error("Estado desconhecido");
  if (feed.status === "pending") {
    if (feed.events.length || feed.updated_at !== null) throw new Error("Estado pendente inconsistente");
    return feed;
  }
  if (!validInstant(feed.updated_at)) throw new Error("Atualização sem data");
  const ids = new Set();
  for (const event of feed.events) {
    if (!event || typeof event.id !== "string" || !event.id || ids.has(event.id)) throw new Error("Identificador inválido");
    ids.add(event.id);
    if (typeof event.title !== "string" || !event.title.trim() || typeof event.country !== "string" || !event.country.trim()) throw new Error("Evento incompleto");
    if (!validInstant(event.datetime) || !validInstant(event.updated_at) || event.timezone !== BRT) throw new Error("Horário inválido");
    if (!["low", "medium", "high"].includes(event.importance) || !/^https:\/\/[^/@]+\//.test(event.source_url || "")) throw new Error("Fonte ou importância inválida");
  }
  return feed;
}

function todayEvents(feed, now) {
  validateFeed(feed);
  if (feed.status !== "ready") return [];
  return feed.events.filter(event => dateKey(event.datetime) === dateKey(now)).sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime) || a.id.localeCompare(b.id));
}

async function loadFeed() {
  const fm = FileManager.local();
  const cache = fm.joinPath(fm.cacheDirectory(), "economic-calendar-public-v1.json");
  try {
    const request = new Request(FEED_URL);
    request.timeoutInterval = 20;
    const feed = validateFeed(await request.loadJSON());
    if (request.response && request.response.statusCode !== 200) throw new Error("Feed indisponível");
    // A pending response is authoritative and must not resurrect an old cache.
    try { fm.writeString(cache, JSON.stringify(feed)); } catch (_) { /* Network data still usable. */ }
    return { feed, cached: false };
  } catch (_) {
    if (fm.fileExists(cache)) {
      try {
        const feed = validateFeed(JSON.parse(fm.readString(cache)));
        if (feed.status === "ready" && Date.now() - Date.parse(feed.updated_at) <= 8 * 86400000) return { feed, cached: true };
      } catch (_) { /* Invalid cache is not an empty successful calendar. */ }
    }
    return { feed: null, cached: false };
  }
}

async function main() {
  const { feed, cached } = await loadFeed();
  const now = new Date();
  const widget = new ListWidget();
  widget.backgroundColor = new Color("10283b");
  widget.setPadding(14, 14, 12, 14);
  widget.refreshAfterDate = new Date(Date.now() + 30 * 60000);
  widget.url = "https://github.com/eduardocunhagit/calendario-economico-feed";
  const title = widget.addText("AGENDA ECONÔMICA");
  title.font = Font.boldSystemFont(12);
  title.textColor = new Color("6fd3c1");
  const subtitle = widget.addText(new Intl.DateTimeFormat("pt-BR", { timeZone: BRT, day: "2-digit", month: "2-digit" }).format(now) + " · Brasília");
  subtitle.font = Font.systemFont(11);
  subtitle.textColor = new Color("b8c8d4");
  widget.addSpacer(8);
  const textLine = value => {
    const line = widget.addText(value);
    line.font = Font.systemFont(12);
    line.textColor = Color.white();
    line.lineLimit = 2;
    return line;
  };
  if (!feed) {
    textLine("Não foi possível atualizar a agenda.");
  } else if (feed.status === "pending") {
    textLine("Aguardando a primeira publicação.");
  } else {
    const events = todayEvents(feed, now);
    const stale = Date.now() - Date.parse(feed.updated_at) > 36 * 3600000;
    const maxRows = config.widgetFamily === "large" ? 8 : config.widgetFamily === "small" ? 2 : 3;
    if (!events.length) textLine(stale ? "Sem dados recentes para hoje." : "Nenhum evento na agenda publicada de hoje.");
    for (const event of events.slice(0, maxRows)) {
      const dot = event.importance === "high" ? "●" : event.importance === "medium" ? "◐" : "○";
      const line = textLine(`${clock(event.datetime)}  ${event.country} ${dot}  ${event.title}`);
      line.url = event.source_url;
      widget.addSpacer(4);
    }
    if (events.length > maxRows) textLine(`+ ${events.length - maxRows} eventos no feed`);
    widget.addSpacer();
    const updated = widget.addText(`${cached ? "Cache · " : stale ? "Atualização antiga · " : "Atualizado · "}${dateKey(feed.updated_at).slice(5)} ${clock(feed.updated_at)}`);
    updated.font = Font.systemFont(9);
    updated.textColor = new Color("b8c8d4");
  }
  Script.setWidget(widget);
  if (!config.runsInWidget) await widget.presentMedium();
  Script.complete();
}

// Node uses only the pure helpers for offline checks. Scriptable provides Script.
if (typeof Script !== "undefined") {
  await main();
} else if (typeof module !== "undefined") {
  module.exports = { dateKey, clock, validInstant, validateFeed, todayEvents };
}
