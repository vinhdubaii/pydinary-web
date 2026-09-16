/* =====================================================================
 * Pydinary – Music Player
 * Tach ra tu index.html. Cac ten bien 1 ky tu (e, t, n...) la di san
 * cua ban minify cu, dat lai dan khi dung toi tung phan.
 *
 * Bo cuc file:
 *   1. DOM refs & state
 *   2. Trich palette mau tu anh bia (aurora)
 *   3. Nen WebGL "Neat" + fallback CSS
 *   4. Dieu khien phat nhac
 *   5. Lyrics (.lrc)
 *   6. Router man hinh + tien ich
 *   7. Nap du lieu playlist
 *   8. Recent / goi y / tim kiem
 *   9. Dang ky service worker
 * ===================================================================== */

/* ---------------------------------------------------------------------
 * 1. DOM refs & state
 * ------------------------------------------------------------------ */
const audio = document.getElementById("bgMusic"),
    playPauseBtn = document.getElementById("playPauseBtn"),
    playIcon = document.getElementById("play-icon"),
    pauseIcon = document.getElementById("pause-icon"),
    volumeSlider = document.getElementById("volumeSlider"),
    container = document.getElementById("player-container"),
    trackTitle = document.getElementById("trackTitle"),
    trackArtist = document.getElementById("trackArtist"),
    discArt = document.getElementById("discArt"),
    currentTimeEl = document.getElementById("currentTime"),
    durationTimeEl = document.getElementById("durationTime"),
    progressSlider = document.getElementById("progressSlider"),
    prevBtn = document.getElementById("prevBtn"),
    nextBtn = document.getElementById("nextBtn"),
    loopBtn = document.getElementById("loopBtn"),
    colorCanvas = document.getElementById("colorExtractCanvas"),
    colorCtx = colorCanvas.getContext("2d", {
        willReadFrequently: !0
    }),
    navBtns = document.querySelectorAll(".nav-btn"),
    screenFullscreen = document.getElementById("screenFullscreen"),
    fpContentRow = document.getElementById("fpContentRow"),
    fpCollapse = document.getElementById("fpCollapse"),
    detailBackBtn = document.getElementById("detailBackBtn"),
    contentScreenEls = {
        home: document.getElementById("screenHome"),
        search: document.getElementById("screenSearch"),
        playlists: document.getElementById("screenPlaylists"),
        playlistDetail: document.getElementById("screenPlaylistDetail")
    },
    recentListEl = document.getElementById("recentList"),
    suggestListEl = document.getElementById("suggestList"),
    searchInput = document.getElementById("searchInput"),
    searchClear = document.getElementById("searchClear"),
    searchResults = document.getElementById("searchResults"),
    allPlaylistsGrid = document.getElementById("allPlaylistsGrid"),
    detailCover = document.getElementById("detailCover"),
    detailTitle = document.getElementById("detailTitle"),
    detailCount = document.getElementById("detailCount"),
    detailTrackList = document.getElementById("detailTrackList"),
    playAllBtn = document.getElementById("playAllBtn"),
    mpArt = document.getElementById("mpArt"),
    mpTitle = document.getElementById("mpTitle"),
    mpArtist = document.getElementById("mpArtist"),
    mpPrev = document.getElementById("mpPrev"),
    mpPlayPause = document.getElementById("mpPlayPause"),
    mpNext = document.getElementById("mpNext"),
    mpExpand = document.getElementById("mpExpand"),
    mpLeft = document.getElementById("mpLeft"),
    mpPlayIcon = document.getElementById("mp-play-icon"),
    mpPauseIcon = document.getElementById("mp-pause-icon"),
    DATA_INDEX_URL = "data/playlists_index.json";
let allPlaylists = [],
    dataState = "loading",
    currentPlaylistId = null,
    currentPlaylistTracks = [],
    currentTrackIndex = 0,
    currentDetailPl = null,
    prevContentScreen = "home",
    isLooping = !1,
    isDraggingProgress = !1;
const FALLBACK_PALETTE = ["#8b1e6e", "#5b2a9e", "#2e1f5e", "#c2348a", "#1c1530"],
    BLOB_VARS = ["--blob-1", "--blob-2", "--blob-3", "--blob-4", "--blob-5"];

/* ---------------------------------------------------------------------
 * 2. Trich palette mau tu anh bia
 * ------------------------------------------------------------------ */

function rgbToHsl(e, t, n) {
    e /= 255, t /= 255, n /= 255;
    const a = Math.max(e, t, n),
        l = Math.min(e, t, n);
    let r, s, c = (a + l) / 2;
    if (a === l) r = s = 0;
    else {
        const i = a - l;
        switch (s = c > .5 ? i / (2 - a - l) : i / (a + l), a) {
            case e:
                r = (t - n) / i + (t < n ? 6 : 0);
                break;
            case t:
                r = (n - e) / i + 2;
                break;
            case n:
                r = (e - t) / i + 4
        }
        r /= 6
    }
    return [360 * r, s, c]
}

function extractPalette(e) {
    return new Promise((t => {
        try {
            const n = 48;
            colorCanvas.width = n, colorCanvas.height = n, colorCtx.clearRect(0, 0, n, n), colorCtx.drawImage(e, 0, 0, n, n);
            const {
                data: a
            } = colorCtx.getImageData(0, 0, n, n), l = {};
            for (let e = 0; e < a.length; e += 4) {
                const t = a[e],
                    n = a[e + 1],
                    r = a[e + 2];
                if (a[e + 3] < 200) continue;
                const [s, c, i] = rgbToHsl(t, n, r);
                if (i < .08 || i > .92 || c < .15) continue;
                const o = Math.round(s / 15) % 24;
                l[o] || (l[o] = {
                    r: 0,
                    g: 0,
                    b: 0,
                    count: 0,
                    sSum: 0
                }), l[o].r += t, l[o].g += n, l[o].b += r, l[o].sSum += c, l[o].count++
            }
            const r = Object.values(l);
            if (!r.length) return void t(FALLBACK_PALETTE);
            r.sort(((e, t) => t.count * (t.sSum / t.count) - e.count * (e.sSum / e.count)));
            const s = r.slice(0, 5).map((e => `rgb(${Math.round(e.r/e.count)},${Math.round(e.g/e.count)},${Math.round(e.b/e.count)})`));
            for (; s.length < 5;) s.push(s[s.length % Math.max(s.length, 1)] || FALLBACK_PALETTE[s.length]);
            t(s)
        } catch {
            t(FALLBACK_PALETTE)
        }
    }))
}
let currentPalette = FALLBACK_PALETTE;

function applyAurora(palette) {
    currentPalette = palette;

    const root = document.documentElement;

    BLOB_VARS.forEach(function(varName, index) {
        root.style.setProperty(varName, palette[index] || FALLBACK_PALETTE[index]);
    });

    updateNeatColors(palette);
}
async function updateAurora(e) {
    e.complete && 0 !== e.naturalWidth ? applyAurora(await extractPalette(e)) : applyAurora(FALLBACK_PALETTE)
} // ---------------------------------------------------------------------
// Neat (WebGL) fullscreen background, with the existing CSS aurora blobs
// kept as an automatic fallback when WebGL / Neat isn't available.
//
// Lua chon 1: Neat is created ONCE per session (the first time the user
// opens fullscreen). After that, opening/closing fullscreen just shows or
// hides the canvas - it is never destroyed and recreated, which is what
// caused the black-screen bug before.
// ---------------------------------------------------------------------

const NEAT_SRC = "https://unpkg.com/@firecms/neat@1.0.2/dist/index.umd.js";

let neatInstance = null;
let neatScriptPromise = null;
let neatInitPromise = null;
let neatSupported = null;

const neatCanvas = document.getElementById("neatCanvas");
const auroraBg = document.getElementById("auroraBg");

function toHex(color) {
    if (!color) {
        return "#000000";
    }

    if (color[0] === "#") {
        return color;
    }

    const match = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);

    if (!match) {
        return "#000000";
    }

    return "#" + [1, 2, 3]
        .map(function(i) {
            return Number(match[i]).toString(16).padStart(2, "0");
        })
        .join("");
}

function buildNeatColors(palette) {
    return (palette || FALLBACK_PALETTE)
        .slice(0, 5)
        .map(function(color) {
            return {
                color: toHex(color),
                enabled: true
            };
        });
}

function loadNeatScript() {
    if (neatScriptPromise) {
        return neatScriptPromise;
    }

    neatScriptPromise = new Promise(function(resolve, reject) {
        if (window.neat && window.neat.NeatGradient) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = NEAT_SRC;
        script.async = true;

        script.onload = function() {
            if (window.neat && window.neat.NeatGradient) {
                resolve();
            } else {
                reject(new Error("Neat global missing after script load"));
            }
        };

        script.onerror = function() {
            reject(new Error("Neat script failed to load"));
        };

        document.head.appendChild(script);
    });

    return neatScriptPromise;
}

function supportsWebgl() {
    if (neatSupported !== null) {
        return neatSupported;
    }

    try {
        const testCanvas = document.createElement("canvas");
        neatSupported = !!(testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"));
    } catch (error) {
        neatSupported = false;
    }

    return neatSupported;
}

// Called every time the user opens fullscreen mode.
function initNeat() {
    // Already created earlier this session - just show it again.
    if (neatInstance) {
        auroraBg.classList.add("neat-mode");
        return;
    }

    // We already tried and it didn't work out - stick with the CSS fallback.
    if (neatSupported === false) {
        return;
    }

    // Already in the middle of loading/creating it - nothing else to do.
    if (neatInitPromise) {
        return;
    }

    if (!supportsWebgl()) {
        neatSupported = false;
        return;
    }

    neatInitPromise = loadNeatScript()
        .then(createNeatInstance)
        .catch(function(error) {
            console.warn("Khong tai duoc Neat, dung CSS aurora fallback:", error);
            neatSupported = false;
        });
}

function createNeatInstance() {
    try {
        neatInstance = new window.neat.NeatGradient({
            ref: neatCanvas,
            colors: buildNeatColors(currentPalette),
            speed: 1.1,
            horizontalPressure: 3,
            verticalPressure: 4,
            waveFrequencyX: 2,
            waveFrequencyY: 2.4,
            waveAmplitude: 4,
            secondaryWaveEnabled: false,
            shadows: 1,
            highlights: 4,
            colorBrightness: 1,
            colorSaturation: 6,
            colorBlending: 7,
            backgroundColor: "#0b0613",
            backgroundAlpha: 1,
            grainScale: 2,
            grainSparsity: 0,
            grainIntensity: 0,
            grainSpeed: 0.3,
            resolution: 1,
            flowEnabled: false,
            flowDistortionA: 1.1,
            flowDistortionB: 1.6,
            flowScale: 1.4,
            flowEase: 0.4,
            vignetteIntensity: 0.15,
            vignetteRadius: 0.85,
            shapeType: "plane",
            cameraLock: true
        });

        neatCanvas.addEventListener("webglcontextlost", onNeatContextLost, {
            once: true
        });

        // Only reveal it if the user is still on the fullscreen screen by
        // the time the script finished loading and Neat finished setting up.
        if (screenFullscreen.classList.contains("active")) {
            auroraBg.classList.add("neat-mode");
        }
    } catch (error) {
        console.warn("Neat init that bai, dung CSS aurora fallback:", error);
        neatSupported = false;
        neatInstance = null;
    }
}

// Called every time the user closes fullscreen mode. Neat itself keeps
// running in the background - only the canvas is hidden again.
function hideNeat() {
    auroraBg.classList.remove("neat-mode");
}

// If the WebGL context is lost for some reason (GPU driver reset, browser
// reclaiming memory, etc.) we give up on Neat for the rest of the session
// and fall back to the CSS aurora blobs permanently.
function onNeatContextLost(event) {
    event.preventDefault();
    console.warn("Mat WebGL context, chuyen vinh vien ve CSS aurora fallback");
    neatSupported = false;
    destroyNeat();
}

function destroyNeat() {
    if (neatInstance) {
        try {
            neatInstance.destroy();
        } catch (error) {
            // Ignore errors during cleanup.
        }

        neatInstance = null;
    }

    auroraBg.classList.remove("neat-mode");
}

function updateNeatColors(palette) {
    if (!neatInstance) {
        return;
    }

    try {
        neatInstance.colors = buildNeatColors(palette);
    } catch (error) {
        // Ignore - the CSS fallback still shows the correct colors either way.
    }
}

/* ---------------------------------------------------------------------
 * 4. Dieu khien phat nhac
 * ------------------------------------------------------------------ */

function loadTrack(e) {
    const t = currentPlaylistTracks[e];
    if (!t) return;
    const n = allPlaylists.find((e => e.id === currentPlaylistId)),
        a = t.artist || (n ? n.title : "Cosmie");
    trackTitle.textContent = t.title, trackArtist.textContent = a, discArt.style.opacity = "1", discArt.src = t.art, mpArt.src = t.art, mpArt.alt = t.title, mpTitle.textContent = t.title, mpArtist.textContent = a, audio.src = t.src, progressSlider.value = 0, progressSlider.style.setProperty("--progress", "0%"), currentTimeEl.textContent = "0:00", durationTimeEl.textContent = "0:00", loadLyricsForTrack(t)
}

function updatePlayState() {
    const e = !audio.paused;
    playIcon.style.display = e ? "none" : "block", pauseIcon.style.display = e ? "block" : "none", container.classList.toggle("playing", e), playPauseBtn.classList.toggle("is-playing", e), mpPlayIcon.style.display = e ? "none" : "block", mpPauseIcon.style.display = e ? "block" : "none"
}

function togglePlayPause() {
    audio.paused ? audio.play().catch((() => {})) : audio.pause(), updatePlayState()
}

function playNext() {
    currentPlaylistTracks.length && (currentTrackIndex = (currentTrackIndex + 1) % currentPlaylistTracks.length, loadTrack(currentTrackIndex), audio.play().catch((() => {})), updatePlayState())
}

function playPrev() {
    currentPlaylistTracks.length && (currentTrackIndex = (currentTrackIndex - 1 + currentPlaylistTracks.length) % currentPlaylistTracks.length, loadTrack(currentTrackIndex), audio.play().catch((() => {})), updatePlayState())
}
/* ---------------------------------------------------------------------
 * 5. Lyrics (.lrc)
 * Duong dan .lrc suy ra tu duong dan anh bia:
 *   img/madihu/co-em.webp  ->  data/lyrics/madihu/co-em.lrc
 * Vi vay ten file anh va ten file lyrics phai trung nhau.
 * ------------------------------------------------------------------ */
const lyricsToggleBtn = document.getElementById("lyricsToggleBtn"),
    lyricsPanel = document.getElementById("lyricsPanel"),
    lyricsList = document.getElementById("lyricsList");
let currentLyrics = [],
    activeLyricIndex = -1,
    lyricsAvailable = !1,
    lyricsOpen = !1;

function lrcPathFor(e) {
    return e && e.art ? e.art.replace(/^img\//, "data/lyrics/").replace(/\.[a-zA-Z0-9]+$/, ".lrc") : null
}

function parseLRC(e) {
    const t = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g,
        n = e.split(/\r?\n/),
        a = [];
    for (const e of n) {
        const n = [...e.matchAll(t)];
        if (!n.length) continue;
        const l = e.replace(t, "").trim();
        if (l)
            for (const e of n) {
                const t = parseInt(e[1], 10),
                    n = parseInt(e[2], 10),
                    r = e[3] ? parseInt(e[3].padEnd(3, "0").slice(0, 3), 10) : 0;
                a.push({
                    time: 60 * t + n + r / 1e3,
                    text: l
                })
            }
    }
    return a.sort(((e, t) => e.time - t.time))
}

function wrapLyricLine(e, t) {
    if (t = t || 38, e.length <= t) return [e];
    const n = e.split(" "),
        a = [];
    let l = "";
    for (const e of n) {
        const n = l ? l + " " + e : e;
        n.length > t && l ? (a.push(l), l = e) : l = n
    }
    return l && a.push(l), a
}

function expandLyricsForDisplay(e, t) {
    t = t || 38;
    const n = [];
    for (let a = 0; a < e.length; a++) {
        const l = e[a],
            r = wrapLyricLine(l.text, t);
        if (r.length <= 1) {
            n.push({
                time: l.time,
                text: l.text,
                group: a
            });
            continue
        }
        const s = a + 1 < e.length ? e[a + 1].time : isFinite(audio.duration) && audio.duration > l.time ? audio.duration : l.time + 4,
            c = r.reduce(((e, t) => e + t.length), 0);
        let i = s - l.time;
        i > 0 || (i = 0);
        let o = 0;
        for (const e of r) n.push({
            time: l.time + i * (o / c),
            text: e,
            group: a
        }), o += e.length
    }
    return n
}

function renderAllLyrics() {
    lyricsList.innerHTML = currentLyrics.map(((e, t) => `<p class="lyric-line" data-i="${t}">${esc(e.text)}</p>`)).join(""), lyricsList.querySelectorAll(".lyric-line").forEach((e => {
        e.addEventListener("click", (() => {
            const t = Number(e.dataset.i);
            currentLyrics[t] && (audio.currentTime = currentLyrics[t].time)
        }))
    }))
}

function updateLyricsClasses(e) {
    const g0 = currentLyrics[e] ? currentLyrics[e].group : e;
    lyricsList.querySelectorAll(".lyric-line").forEach(((t, n) => {
        t.classList.remove("active", "upcoming-1", "upcoming-2", "upcoming-3");
        const g = currentLyrics[n] ? currentLyrics[n].group : n,
            a = g - g0;
        0 === a ? t.classList.add("active") : 1 === a ? t.classList.add("upcoming-1") : 2 === a ? t.classList.add("upcoming-2") : 3 === a && t.classList.add("upcoming-3")
    }))
}

function applyLyricsWindow(e) {
    const t = lyricsList.querySelectorAll(".lyric-line");
    if (!t.length) return;
    const n = Math.max(e, 0),
        a = t[n] || t[0],
        panelH = lyricsPanel.clientHeight,
        total = lyricsList.scrollHeight,
        target = a.offsetTop + a.offsetHeight / 2 - panelH / 2,
        maxOffset = Math.max(total - panelH, 0),
        offset = Math.min(Math.max(target, 0), maxOffset);
    lyricsList.style.transform = `translateY(-${offset}px)`
}

function alignLyricsPanel() {
    if (!lyricsOpen) return;
    const wrap = document.querySelector(".album-art-wrapper");
    if (!wrap) return;
    const artRect = wrap.getBoundingClientRect(),
        rowRect = fpContentRow.getBoundingClientRect(),
        artCenter = artRect.top + artRect.height / 2 - rowRect.top,
        panelH = lyricsPanel.clientHeight,
        marginTop = Math.max(artCenter - panelH / 2, 0);
    lyricsPanel.style.marginTop = marginTop + "px"
}

function setLyricsToggleVisible(e) {
    lyricsToggleBtn.style.display = e ? "flex" : "none"
}

function closeLyricsView() {
    lyricsOpen = !1, screenFullscreen.classList.remove("lyrics-open"), lyricsToggleBtn.classList.remove("active"), lyricsToggleBtn.setAttribute("aria-pressed", "false")
}

function openLyricsView() {
    lyricsAvailable && (lyricsOpen = !0, screenFullscreen.classList.add("lyrics-open"), lyricsToggleBtn.classList.add("active"), lyricsToggleBtn.setAttribute("aria-pressed", "true"), requestAnimationFrame((() => {
        applyLyricsWindow(activeLyricIndex), alignLyricsPanel()
    })))
}
window.addEventListener("resize", (() => {
    lyricsOpen && requestAnimationFrame((() => {
        applyLyricsWindow(activeLyricIndex), alignLyricsPanel()
    }))
}));
async function loadLyricsForTrack(e) {
    currentLyrics = [], lyricsAvailable = !1, closeLyricsView(), setLyricsToggleVisible(!1);
    const t = lrcPathFor(e);
    if (t) try {
        const e = await fetch(t);
        if (!e.ok) throw new Error("no lrc");
        const n = await e.text();
        let a = parseLRC(n);
        if (!a.length) throw new Error("empty lrc");
        a = expandLyricsForDisplay(a, 38), currentLyrics = a, lyricsAvailable = !0, activeLyricIndex = -1, renderAllLyrics(), requestAnimationFrame((() => {
            updateLyricsClasses(-1), applyLyricsWindow(-1)
        })), setLyricsToggleVisible(!0)
    } catch (e) {}
}

function updateActiveLyric() {
    if (!lyricsAvailable || !currentLyrics.length) return;
    const e = audio.currentTime;
    let t = -1;
    for (let n = 0; n < currentLyrics.length; n++) {
        if (!(currentLyrics[n].time <= e)) break;
        t = n
    }
    if (t === activeLyricIndex) return;
    activeLyricIndex = t, updateLyricsClasses(t), lyricsOpen && requestAnimationFrame((() => {
        applyLyricsWindow(t)
    }))
}
lyricsToggleBtn.addEventListener("click", (() => {
    lyricsOpen ? closeLyricsView() : openLyricsView()
})), audio.addEventListener("timeupdate", updateActiveLyric), discArt.addEventListener("error", (() => {
    discArt.style.opacity = "0", applyAurora(FALLBACK_PALETTE)
})), discArt.addEventListener("load", (() => updateAurora(discArt))), playPauseBtn.addEventListener("click", togglePlayPause), mpPlayPause.addEventListener("click", togglePlayPause), prevBtn.addEventListener("click", playPrev), nextBtn.addEventListener("click", playNext), mpPrev.addEventListener("click", playPrev), mpNext.addEventListener("click", playNext), loopBtn.addEventListener("click", (() => {
    isLooping = !isLooping, audio.loop = isLooping, loopBtn.classList.toggle("active", isLooping), loopBtn.setAttribute("aria-pressed", isLooping ? "true" : "false")
})), audio.addEventListener("ended", (() => {
    isLooping || playNext()
}));
let errCount = 0;
audio.addEventListener("error", (() => {
    if (errCount++, errCount >= currentPlaylistTracks.length) return trackTitle.textContent = "Không thể tải nhạc", trackArtist.textContent = "Kiểm tra kết nối", void updatePlayState();
    trackTitle.textContent = "Lỗi tải bài, đang chuyển…", setTimeout(playNext, 800)
})), audio.addEventListener("canplay", (() => {
    errCount = 0
}));
const savedVol = localStorage.getItem("zenSpaceVolume");

function fmtTime(e) {
    if (isNaN(e)) return "0:00";
    const t = Math.floor(e / 60),
        n = Math.floor(e % 60);
    return `${t}:${n<10?"0":""}${n}`
}

function showScreen(e) {
    Object.entries(contentScreenEls).forEach((([t, n]) => n.classList.toggle("active", t === e))), document.body.dataset.screen = e;
    const t = "playlistDetail" === e ? "playlists" : e;
    navBtns.forEach((e => e.classList.toggle("active", e.dataset.nav === t))), prevContentScreen = e, "search" === e && setTimeout((() => searchInput.focus()), 80)
}

function openFullscreen() {
    prevContentScreen = document.body.dataset.screen;
    screenFullscreen.classList.add("active");
    document.body.dataset.screen = "fullscreen";
    initNeat();
}

function closeFullscreen() {
    hideNeat();
    screenFullscreen.classList.remove("active");
    showScreen("fullscreen" !== prevContentScreen && prevContentScreen ? prevContentScreen : "home");
}

function esc(e) {
    const t = document.createElement("div");
    return t.textContent = e ?? "", t.innerHTML
}

function shuffle(e) {
    const t = e.slice();
    for (let e = t.length - 1; e > 0; e--) {
        const n = Math.floor(Math.random() * (e + 1));
        [t[e], t[n]] = [t[n], t[e]]
    }
    return t
}
/* ---------------------------------------------------------------------
 * 7. Nap du lieu playlist
 * ------------------------------------------------------------------ */
async function loadAllPlaylists() {
    try {
        const e = await fetch(DATA_INDEX_URL);
        if (!e.ok) throw new Error("index missing");
        const t = await e.json();
        allPlaylists = await Promise.all(t.map((async e => {
            const t = await fetch(`data/${e.file}`);
            if (!t.ok) throw new Error(`missing ${e.file}`);
            return t.json()
        }))), dataState = "ready"
    } catch (e) {
        console.error("Lỗi nạp playlist:", e), dataState = "error"
    }
    renderSuggestions(), renderPlaylistsGrid(), renderSearch(searchInput.value.trim().toLowerCase())
}
null != savedVol && (volumeSlider.value = savedVol), audio.volume = volumeSlider.value, volumeSlider.style.setProperty("--vol", 100 * volumeSlider.value + "%"), volumeSlider.addEventListener("input", (e => {
    audio.volume = e.target.value, e.target.style.setProperty("--vol", 100 * e.target.value + "%"), localStorage.setItem("zenSpaceVolume", e.target.value)
})), audio.addEventListener("loadedmetadata", (() => {
    durationTimeEl.textContent = fmtTime(audio.duration), progressSlider.max = Math.floor(audio.duration)
})), audio.addEventListener("timeupdate", (() => {
    if (!isDraggingProgress) {
        progressSlider.value = Math.floor(audio.currentTime);
        const e = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
        progressSlider.style.setProperty("--progress", e + "%"), currentTimeEl.textContent = fmtTime(audio.currentTime)
    }
})), progressSlider.addEventListener("input", (() => {
    isDraggingProgress = !0, currentTimeEl.textContent = fmtTime(progressSlider.value);
    const e = progressSlider.max ? progressSlider.value / progressSlider.max * 100 : 0;
    progressSlider.style.setProperty("--progress", e + "%")
})), progressSlider.addEventListener("change", (() => {
    audio.currentTime = progressSlider.value, isDraggingProgress = !1
})), navBtns.forEach((e => e.addEventListener("click", (() => showScreen(e.dataset.nav))))), mpExpand.addEventListener("click", openFullscreen), mpLeft.addEventListener("click", openFullscreen), mpLeft.addEventListener("keydown", (e => {
    "Enter" !== e.key && " " !== e.key || openFullscreen()
})), fpCollapse.addEventListener("click", closeFullscreen), detailBackBtn.addEventListener("click", (() => showScreen("playlists")));
/* ---------------------------------------------------------------------
 * 8. Recent / goi y / tim kiem
 * Luu y: RECENT_KEY va "zenSpaceVolume" la ten cu tu doi truoc, giu
 * nguyen de khong mat du lieu cua nguoi dang dung.
 * ------------------------------------------------------------------ */
const RECENT_KEY = "cosmie_recent",
    RECENT_LIMIT = 8;

// Id playlist cu -> id moi (sau dot doi ten sang dang slug).
// Nho map nay, lich su nghe da luu truoc do van bam dung playlist.
const LEGACY_ID_MAP = {
    "chill_study": "chill-study",
    "mahidu": "madihu",
    "warner case": "warner-case",
    "terror_jr": "terror-jr"
};

function getRecent() {
    try {
        const raw = localStorage.getItem(RECENT_KEY),
            list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        return list.map((item) => {
            const mapped = LEGACY_ID_MAP[item.playlistId];
            return mapped ? { ...item, playlistId: mapped } : item;
        });
    } catch {
        return []
    }
}

function recordRecent() {
    const e = allPlaylists.find((e => e.id === currentPlaylistId)),
        t = currentPlaylistTracks[currentTrackIndex];
    if (!e || !t) return;
    const n = {
        playlistId: e.id,
        playlistTitle: e.title,
        trackIndex: currentTrackIndex,
        trackTitle: t.title,
        art: t.art,
        timestamp: Date.now()
    };
    let a = getRecent().filter((e => !(e.playlistId === n.playlistId && e.trackIndex === n.trackIndex)));
    a.unshift(n), a = a.slice(0, RECENT_LIMIT);
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(a))
    } catch {}
    renderRecent()
}

function renderRecent() {
    const e = getRecent();
    e.length ? (recentListEl.innerHTML = "", e.forEach((e => {
        const t = document.createElement("button");
        t.type = "button", t.className = "tr-card", t.innerHTML = `<img class="tr-card-art" src="${e.art}" alt="${esc(e.trackTitle)}"><span class="tr-card-name">${esc(e.trackTitle)}</span><span class="tr-card-sub">${esc(e.playlistTitle)}</span>`, t.addEventListener("click", (() => openPlaylistAndPlay(e.playlistId, e.trackIndex))), recentListEl.appendChild(t)
    }))) : recentListEl.innerHTML = '<p class="state-msg">Bạn chưa nghe bài nào. Khám phá playlist bên dưới nhé.</p>'
}

function renderSuggestions() {
    if ("loading" === dataState) return void(suggestListEl.innerHTML = '<p class="state-msg">Đang tải…</p>');
    if ("error" === dataState) return void(suggestListEl.innerHTML = '<p class="state-msg">Không tải được playlist. Hãy chạy qua local server (VSCode Live Server) rồi thử lại.</p>');
    if (!allPlaylists.length) return void(suggestListEl.innerHTML = '<p class="state-msg">Chưa có playlist nào trong data/.</p>');
    const e = new Set(getRecent().map((e => e.playlistId)));
    let t = allPlaylists.filter((t => !e.has(t.id)));
    t.length || (t = allPlaylists.slice()), suggestListEl.innerHTML = "", shuffle(t).slice(0, 4).forEach((e => suggestListEl.appendChild(mkPlCard(e))))
}

function renderPlaylistsGrid() {
    "loading" !== dataState ? "error" !== dataState ? allPlaylists.length ? (allPlaylistsGrid.innerHTML = "", allPlaylists.forEach((e => allPlaylistsGrid.appendChild(mkPlCard(e))))) : allPlaylistsGrid.innerHTML = '<p class="state-msg">Chưa có playlist nào.</p>' : allPlaylistsGrid.innerHTML = '<p class="state-msg">Không tải được playlist. Hãy chạy qua local server (VSCode Live Server) rồi thử lại.</p>' : allPlaylistsGrid.innerHTML = '<p class="state-msg">Đang tải…</p>'
}

function mkPlCard(e) {
    const t = document.createElement("button");
    return t.type = "button", t.className = "pl-card", t.innerHTML = `<img class="pl-card-cover" src="${e.cover}" alt="${esc(e.title)}"><span class="pl-card-name">${esc(e.title)}</span><span class="pl-card-count">${e.tracks.length} bài hát</span>`, t.addEventListener("click", (() => openPlaylistDetail(e.id))), t
}

function openPlaylistDetail(e) {
    const t = allPlaylists.find((t => t.id === e));
    t ? (currentDetailPl = e, detailCover.src = t.cover, detailCover.alt = t.title, detailTitle.textContent = t.title, detailCount.textContent = `${t.tracks.length} bài hát`, detailTrackList.innerHTML = "", t.tracks.forEach(((n, a) => {
        const l = document.createElement("button");
        l.type = "button", l.className = "tr-row", l.innerHTML = `\n        <span class="tr-row-num">${a+1}</span>\n        <img class="tr-row-art" src="${n.art}" alt="">\n        <span class="tr-row-info">\n          <span class="tr-row-title">${esc(n.title)}</span>\n          <span class="tr-row-artist">${esc(n.artist||t.title)}</span>\n        </span>\n        <span class="tr-row-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>`, l.addEventListener("click", (() => openPlaylistAndPlay(e, a))), detailTrackList.appendChild(l)
    })), showScreen("playlistDetail"), contentScreenEls.playlistDetail.scrollTop = 0) : showScreen("playlists")
}

function openPlaylistAndPlay(e, t) {
    const n = allPlaylists.find((t => t.id === e));
    n && n.tracks[t] && (currentPlaylistId = e, currentPlaylistTracks = n.tracks, currentTrackIndex = t, loadTrack(currentTrackIndex), audio.play().catch((() => {})), updatePlayState(), document.body.classList.add("has-track"))
}
playAllBtn.addEventListener("click", (() => {
    currentDetailPl && openPlaylistAndPlay(currentDetailPl, 0)
}));
let lastKey = null;

function renderSearch(e) {
    if (!e) {
        if ("loading" === dataState) return void(searchResults.innerHTML = '<p class="state-msg" style="padding:.5rem 0">Đang tải playlist…</p>');
        if (!allPlaylists.length) return void(searchResults.innerHTML = '<p class="state-msg" style="padding:.5rem 0">Nhập tên bài hát hoặc playlist để tìm kiếm.</p>');
        searchResults.innerHTML = '<p class="section-label" style="margin-top:.5rem">Tất cả Playlist</p>';
        const e = document.createElement("div");
        return e.className = "pl-grid", allPlaylists.forEach((t => e.appendChild(mkPlCard(t)))), void searchResults.appendChild(e)
    }
    const t = allPlaylists.filter((t => t.title.toLowerCase().includes(e))),
        n = [];
    if (allPlaylists.forEach((t => t.tracks.forEach(((a, l) => {
            (a.title.toLowerCase().includes(e) || (a.artist || "").toLowerCase().includes(e)) && n.push({
                t: a,
                i: l,
                pl: t
            })
        })))), t.length || n.length) {
        if (searchResults.innerHTML = "", t.length) {
            const e = document.createElement("p");
            e.className = "section-label", e.style.marginTop = ".5rem", e.textContent = "Playlist";
            const n = document.createElement("div");
            n.className = "pl-grid", t.forEach((e => n.appendChild(mkPlCard(e)))), searchResults.appendChild(e), searchResults.appendChild(n)
        }
        if (n.length) {
            const e = document.createElement("p");
            e.className = "section-label", e.style.marginTop = "1.5rem", e.textContent = "Bài hát";
            const t = document.createElement("div");
            t.className = "track-list", n.forEach((({
                t: e,
                i: n,
                pl: a
            }) => {
                const l = document.createElement("button");
                l.type = "button", l.className = "tr-row", l.innerHTML = `\n          <img class="tr-row-art" src="${e.art}" alt="">\n          <span class="tr-row-info">\n            <span class="tr-row-title">${esc(e.title)}</span>\n            <span class="tr-row-artist">${esc(e.artist||a.title)} · ${esc(a.title)}</span>\n          </span>\n          <span class="tr-row-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>`, l.addEventListener("click", (() => openPlaylistAndPlay(a.id, n))), t.appendChild(l)
            })), searchResults.appendChild(e), searchResults.appendChild(t)
        }
    } else searchResults.innerHTML = `<div class="search-empty">Không tìm thấy kết quả cho "<strong>${esc(searchInput.value.trim())}</strong>"</div>`
}
audio.addEventListener("play", (() => {
    const e = `${currentPlaylistId}::${currentTrackIndex}`;
    currentPlaylistId && e !== lastKey && (lastKey = e, recordRecent())
})), searchInput.addEventListener("input", (() => {
    const e = searchInput.value.trim();
    searchClear.style.display = e ? "block" : "none", renderSearch(e.toLowerCase())
})), searchClear.addEventListener("click", (() => {
    searchInput.value = "", searchClear.style.display = "none", renderSearch(""), searchInput.focus()
})), renderRecent(), renderSuggestions(), renderPlaylistsGrid(), renderSearch(""), showScreen("home"), loadAllPlaylists();
if ("serviceWorker" in navigator) {
    window.addEventListener("load", (() => {
        navigator.serviceWorker.register("/service-worker.js").catch((() => {}))
    }))
}