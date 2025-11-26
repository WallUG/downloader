const API_URL = "/api/resolve";

const form = document.getElementById("download-form");
const urlInput = document.getElementById("video-url");
const submitBtn = document.getElementById("submit-btn");
const btnText = submitBtn.querySelector(".btn-text");
const btnLoading = submitBtn.querySelector(".btn-loading");
const resultsSection = document.getElementById("results-section");
const errorSection = document.getElementById("error-section");
const errorMessage = document.getElementById("error-message");
const retryBtn = document.getElementById("retry-btn");
const platformBadges = document.querySelectorAll(".platform-badge");

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnText.hidden = isLoading;
  btnLoading.hidden = !isLoading;
  urlInput.disabled = isLoading;
}

function hideAllResults() {
  resultsSection.hidden = true;
  errorSection.hidden = true;
}

function showError(message) {
  hideAllResults();
  errorMessage.textContent = message;
  errorSection.hidden = false;
}

function detectPlatform(url) {
  const platforms = {
    instagram: /instagram\.com/,
    tiktok: /tiktok\.com/,
    facebook: /(facebook|fb)\.com/,
    twitter: /(twitter\.com|x\.com)/,
    youtube: /(youtube\.com|youtu\.be)/,
    reddit: /(reddit\.com|redd\.it)/,
    imgur: /imgur\.com/,
    pinterest: /pinterest\.com/,
  };

  for (const [platform, regex] of Object.entries(platforms)) {
    if (regex.test(url)) {
      return platform;
    }
  }
  return null;
}

function updatePlatformBadges(detectedPlatform) {
  platformBadges.forEach((badge) => {
    const platform = badge.dataset.platform;
    badge.classList.toggle("active", platform === detectedPlatform);
  });
}

function getMediaTypeIcon(type) {
  const icons = {
    video: "🎬",
    image: "🖼️",
    audio: "🎵",
  };
  return icons[type] || "📁";
}

function formatNumber(num) {
  if (num === undefined || num === null) return null;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function showResults(data) {
  hideAllResults();

  const titleEl = document.getElementById("result-title");
  const platformEl = document.getElementById("result-platform");
  const authorEl = document.getElementById("result-author");
  const viewsEl = document.getElementById("result-views");
  const likesEl = document.getElementById("result-likes");
  const mediaList = document.getElementById("media-list");

  titleEl.textContent = data.meta.title || "Sin título";
  platformEl.textContent = data.meta.platform;
  authorEl.textContent = data.meta.author ? `Por: ${data.meta.author}` : "";

  if (data.meta.views !== undefined) {
    viewsEl.hidden = false;
    viewsEl.querySelector("span").textContent = formatNumber(data.meta.views);
  } else {
    viewsEl.hidden = true;
  }

  if (data.meta.likes !== undefined) {
    likesEl.hidden = false;
    likesEl.querySelector("span").textContent = formatNumber(data.meta.likes);
  } else {
    likesEl.hidden = true;
  }

  mediaList.innerHTML = "";

  data.urls.forEach((item) => {
    const mediaItem = document.createElement("div");
    mediaItem.className = "media-item";

    mediaItem.innerHTML = `
      <div class="media-info">
        <div class="media-type">${getMediaTypeIcon(item.type)}</div>
        <div>
          <div class="media-filename">${item.filename}</div>
          <small style="color: var(--text-secondary); text-transform: capitalize;">${item.type}</small>
        </div>
      </div>
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="download-btn" download="${item.filename}">
        ⬇️ Descargar
      </a>
    `;

    mediaList.appendChild(mediaItem);
  });

  resultsSection.hidden = false;
}

async function handleSubmit(e) {
  e.preventDefault();

  const url = urlInput.value.trim();
  if (!url) return;

  const platform = detectPlatform(url);
  updatePlatformBadges(platform);

  if (!platform) {
    showError(
      "No se pudo detectar la plataforma. Asegúrate de usar un enlace válido de las plataformas soportadas.",
    );
    return;
  }

  setLoading(true);
  hideAllResults();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al procesar la solicitud");
    }

    showResults(data);
  } catch (error) {
    console.error("Error:", error);
    showError(
      error.message ||
        "Ocurrió un error inesperado. Por favor, intenta de nuevo.",
    );
  } finally {
    setLoading(false);
  }
}

urlInput.addEventListener("input", (e) => {
  const platform = detectPlatform(e.target.value);
  updatePlatformBadges(platform);
});

form.addEventListener("submit", handleSubmit);

retryBtn.addEventListener("click", () => {
  hideAllResults();
  urlInput.focus();
});
