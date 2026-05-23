const state = {
  items: [],
  region: "all",
  genre: "all",
};

const genreLabels = {
  politics: "Politika",
  economy: "Ekonomika",
  society: "Společnost",
  world: "Svět",
  culture: "Kultura",
  tech: "Technologie",
  sport: "Sport",
  health: "Zdraví",
  climate: "Klima",
};

const statusEl = document.querySelector("#status");
const genreFilter = document.querySelector("#genreFilter");
const template = document.querySelector("#newsCardTemplate");
const czGrid = document.querySelector("#czGrid");
const worldGrid = document.querySelector("#worldGrid");
const totalCount = document.querySelector("#totalCount");
const sourceCount = document.querySelector("#sourceCount");
const czCount = document.querySelector("#czCount");
const worldCount = document.querySelector("#worldCount");

document.querySelectorAll("[data-region]").forEach((button) => {
  button.addEventListener("click", () => {
    state.region = button.dataset.region;
    document
      .querySelectorAll("[data-region]")
      .forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

genreFilter.addEventListener("change", () => {
  state.genre = genreFilter.value;
  render();
});

async function init() {
  try {
    const payload = await loadNewsData();
    state.items = payload.items ?? [];
    setupGenres();
    statusEl.textContent = formatStatus(payload);
    render();
  } catch (error) {
    statusEl.textContent = "Zprávy teď nejsou dostupné.";
    czGrid.innerHTML = emptyMarkup("Nepodařilo se načíst české zprávy.");
    worldGrid.innerHTML = emptyMarkup("Nepodařilo se načíst světové zprávy.");
  }
}

async function loadNewsData() {
  if (window.DAILY_NEWS_DATA) return window.DAILY_NEWS_DATA;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`data/news.json?ts=${Date.now()}`, {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Data se nepodařilo načíst.");
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function setupGenres() {
  const genres = [...new Set(state.items.map((item) => item.genre))].sort();
  genreFilter.innerHTML = `<option value="all">Všechny žánry</option>`;
  genres.forEach((genre) => {
    const option = document.createElement("option");
    option.value = genre;
    option.textContent = genreLabels[genre] ?? genre;
    genreFilter.append(option);
  });
}

function render() {
  const filtered = state.items.filter((item) => {
    const regionMatch = state.region === "all" || item.region === state.region;
    const genreMatch = state.genre === "all" || item.genre === state.genre;
    return regionMatch && genreMatch;
  });

  const czItems = filtered.filter((item) => item.region === "cz");
  const worldItems = filtered.filter((item) => item.region === "world");
  renderGrid(czGrid, czItems, "Pro zvolený filtr tu nejsou žádné zprávy z ČR.");
  renderGrid(worldGrid, worldItems, "Pro zvolený filtr tu nejsou žádné světové zprávy.");

  totalCount.textContent = filtered.length;
  sourceCount.textContent = new Set(filtered.map((item) => item.source)).size;
  czCount.textContent = czItems.length;
  worldCount.textContent = worldItems.length;
}

function renderGrid(container, items, emptyText) {
  container.replaceChildren();
  if (!items.length) {
    container.innerHTML = emptyMarkup(emptyText);
    return;
  }

  items.forEach((item) => {
    const card = template.content.cloneNode(true);
    const imageLink = card.querySelector(".image-link");
    const image = card.querySelector("img");
    const titleLink = card.querySelector("h3 a");
    const sourceLink = card.querySelector(".source-link");

    image.src = item.imageUrl;
    image.alt = item.imageAlt || item.title;
    imageLink.href = item.url;
    titleLink.href = item.url;
    titleLink.textContent = item.title;
    sourceLink.href = item.url;
    card.querySelector(".genre").textContent = genreLabels[item.genre] ?? item.genre;
    card.querySelector("time").dateTime = item.publishedAt;
    card.querySelector("time").textContent = relativeTime(item.publishedAt);
    card.querySelector("p").textContent = item.summary;
    card.querySelector(".source").textContent = item.source;
    container.append(card);
  });
}

function formatStatus(payload) {
  if (!payload.updatedAt) return "Čerstvý přehled za posledních 24 hodin";
  const updatedAt = new Date(payload.updatedAt);
  const formattedDate = new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(updatedAt);
  const ageHours = (Date.now() - updatedAt.getTime()) / 1000 / 60 / 60;

  if (ageHours > 30) {
    return `Data jsou stará. Poslední aktualizace: ${formattedDate}`;
  }

  return `Poslední aktualizace: ${formattedDate}`;
}

function relativeTime(value) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffHours = Math.round(diffMs / 1000 / 60 / 60);
  const formatter = new Intl.RelativeTimeFormat("cs-CZ", { numeric: "auto" });
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  return formatter.format(Math.round(diffHours / 24), "day");
}

function emptyMarkup(text) {
  return `<div class="empty">${text}</div>`;
}

init();
