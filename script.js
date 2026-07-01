/* ==========================================
   RETRO OS DRAG-AND-DROP, APPLICATION LOGIC, 
   SOUNDS, AND CUSTOM CURSOR TRAILS (MULTI-WINDOW)
   ========================================== */

// Window Manager State
let activeWindows = ['welcome-window'];
let windowStates = {};
let topZIndex = 10;
let isDragging = false;
let dragWindowId = null;
let dragOffset = { x: 0, y: 0 };

// Wallpaper Settings State
const wallpapers = [
  'assets/win.jpg',
  'assets/bliss_bg.png',
  'assets/Img0_(Windows_7).jpg',
  'assets/Img8_(Windows_7).jpg',
  'assets/Img15_(Windows_7).jpg',
  'assets/Img17_(Windows_7).jpg',
  'assets/Img18_(Windows_7).jpg',
  'assets/Img19_(Windows_7).jpg',
  'assets/201194070d3e4ece2432df7fd7a0f54d.jpg',
  'assets/images.jfif'
];
let currentWallpaperIdx = 0;

function changeWallpaper(filename) {
  const desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.style.backgroundImage = `url('${filename}')`;
  }
  const idx = wallpapers.indexOf(filename);
  if (idx !== -1) {
    currentWallpaperIdx = idx;
  }
  
  document.querySelectorAll('.wallpaper-thumb-card').forEach(card => {
    const wallpaper = card.dataset.wallpaper || card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || '';
    if (wallpaper === filename) {
      card.classList.add('active-thumb');
    } else {
      card.classList.remove('active-thumb');
    }
  });
}

function nextWallpaper() {
  currentWallpaperIdx = (currentWallpaperIdx + 1) % wallpapers.length;
  changeWallpaper(wallpapers[currentWallpaperIdx]);
}

// Paint App State
let paintTool = 'pencil';
let paintColor = '#000000';
let isDrawing = false;
const canvas = document.getElementById('paint-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

// Music Player State (Web Audio API)
let audioCtx = null;
let isPlayingMusic = false;
let currentTrack = 0;
let noteInterval = null;
let currentNoteIndex = 0;

// Chiptune Tracks (Notes represented as [Frequency, Duration in ms])
const tracks = [
  // Track 1: Chiptune Symphony
  [
    [261.63, 200], [293.66, 200], [329.63, 200], [349.23, 200],
    [392.00, 400], [392.00, 400], [440.00, 200], [440.00, 200],
    [440.00, 200], [440.00, 200], [392.00, 800], [349.23, 200],
    [349.23, 200], [349.23, 200], [349.23, 200], [329.63, 400],
    [329.63, 400], [293.66, 200], [293.66, 200], [293.66, 200],
    [293.66, 200], [261.63, 800]
  ],
  // Track 2: Pixelated Dreams
  [
    [440.00, 300], [493.88, 150], [523.25, 300], [587.33, 300],
    [659.25, 600], [0, 150], [587.33, 150], [659.25, 150],
    [698.46, 300], [587.33, 300], [523.25, 600], [440.00, 300],
    [493.88, 300], [392.00, 300], [440.00, 900]
  ],
  // Track 3: Blissful Hillside
  [
    [329.63, 250], [392.00, 250], [440.00, 250], [523.25, 250],
    [440.00, 250], [392.00, 250], [329.63, 500], [293.66, 250],
    [329.63, 250], [392.00, 250], [293.66, 250], [261.63, 750]
  ]
];

const trackNames = [
  "1. Chiptune Symphony.synth",
  "2. Pixelated Dreams.synth",
  "3. Blissful Hillside.synth"
];

// Education Descriptions map
const educationInfo = {
  born: "<strong>2009: Born</strong><br>Born in Morocco. Developed a passion for art and design from early childhood, sketching everything in sight.",
  elem: "<strong>2015: Elementary School</strong><br>Began elementary studies. Explored creative drawings, reading comics, and early digital game aesthetics.",
  begin: "<strong>2019: Digital Beginnings</strong><br>Discovered coding, graphic tools, and video editing. Developed an interest in custom designs.",
  high: "<strong>2022: High School Major</strong><br>Excelled in mathematics, computer sciences, and art projects. Began taking on freelance video editing gigs.",
  brand: "<strong>2025: Hackathons & Brand ITRI</strong><br>Won 3rd place at Daydream Hackathon and 6th place at Orientino 2025. Founded 'ITRI', designing clothing styles.",
  now: "<strong>2026: Present Day</strong><br>Placed 1st at the Orientino 2026 Hackathon! Building LLM-powered applications and web platforms."
};

/* ==========================================
   SYSTEM INITIALIZATION & BOOT LOADING
   ========================================== */
window.addEventListener('DOMContentLoaded', () => {
  // Update system clock immediately and setup interval
  updateClock();
  setInterval(updateClock, 1000);

  // Run boot screen loader animation
  simulateBoot();

  // Setup taskbar tabs initially
  renderTaskbarTabs();
  changeWallpaper(wallpapers[currentWallpaperIdx]);

  // Setup Paint Canvas listeners
  setupPaintCanvas();

  // Setup custom mouse cursor star trail listeners
  setupMouseCursorTrail();

  // Setup click-outside start menu closer
  document.addEventListener('click', (e) => {
    const startMenu = document.getElementById('start-menu');
    const startBtn = document.getElementById('start-btn');
    if (startMenu && startBtn && !startMenu.contains(e.target) && !startBtn.contains(e.target)) {
      startMenu.style.display = 'none';
    }
  });

  // Track resizing to maximize windows properly on mobile
  window.addEventListener('resize', handleWindowResize);

  // Initialize absolute grid positions and drag/drop handlers for desktop icons
  initIconsGrid();
});

// Boot screen progress simulation
function simulateBoot() {
  const progress = document.querySelector('.boot-loader-progress');
  const status = document.querySelector('.boot-status');
  const bootScreen = document.getElementById('boot-screen');
  
  if (!progress || !status || !bootScreen) return;

  const steps = [
    { pct: 15, msg: "Initializing kernel variables..." },
    { pct: 35, msg: "Loading display graphic system..." },
    { pct: 60, msg: "Synthesizing audio soundcards..." },
    { pct: 85, msg: "Mounting portfolio assets..." },
    { pct: 100, msg: "OS loaded successfully!" }
  ];

  let currentStepIdx = 0;
  let width = 0;

  const interval = setInterval(() => {
    if (width >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        bootScreen.style.opacity = '0';
        setTimeout(() => {
          bootScreen.style.display = 'none';
        }, 500);
      }, 400);
      return;
    }

    width += Math.floor(Math.random() * 5) + 3;
    if (width > 100) width = 100;

    progress.style.width = width + '%';

    // Update message based on percentage boundaries
    const activeStep = steps.find(s => width <= s.pct) || steps[steps.length - 1];
    status.innerText = activeStep.msg;

  }, 60);
}

// System clock updater
function updateClock() {
  const clockEl = document.getElementById('system-clock');
  if (!clockEl) return;

  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // Hour '0' should be '12'
  clockEl.innerText = `${hours}:${minutes} ${ampm}`;
}

// Window resize handler (responsive maximize)
function handleWindowResize() {
  const isMobile = window.innerWidth <= 600;
  if (isMobile) {
    // If mobile, make active windows full size by default
    activeWindows.forEach(id => {
      const win = document.getElementById(id);
      if (win) {
        win.style.top = '5px';
        win.style.left = '5px';
        win.style.width = 'calc(100% - 10px)';
        win.style.height = 'calc(100% - 48px)';
      }
    });
  }
}


/* ==========================================
   WINDOW DRAG AND DROP & FOCUS LOGIC
   ========================================== */
function startDrag(e, windowId) {
  // Bring window to focus first
  focusWindow(windowId);

  // Do not drag if maximize is active on mobile
  if (window.innerWidth <= 600) return;

  // Do not drag if user clicked title bar control buttons
  if (e.target.classList.contains('control-btn') || e.target.classList.contains('control-dot')) return;

  isDragging = true;
  dragWindowId = windowId;
  const win = document.getElementById(windowId);
  
  // Handle touch events vs mouse events
  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

  const rect = win.getBoundingClientRect();
  dragOffset.x = clientX - rect.left;
  dragOffset.y = clientY - rect.top;

  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchmove', dragMove, { passive: false });
  document.addEventListener('touchend', dragEnd);
}

function dragMove(e) {
  if (!isDragging || !dragWindowId) return;
  e.preventDefault();

  const win = document.getElementById(dragWindowId);
  if (!win) return;

  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

  let x = clientX - dragOffset.x;
  let y = clientY - dragOffset.y;

  // Boundary checks
  const desktopWidth = window.innerWidth;
  const desktopHeight = window.innerHeight;

  if (y < 0) y = 0; 
  if (y > desktopHeight - 50) y = desktopHeight - 50; 
  if (x < -100) x = -100;
  if (x > desktopWidth - 100) x = desktopWidth - 100;

  win.style.left = `${x}px`;
  win.style.top = `${y}px`;
}

function dragEnd() {
  if (dragWindowId) {
    saveWindowState(dragWindowId);
  }
  isDragging = false;
  dragWindowId = null;
  document.removeEventListener('mousemove', dragMove);
  document.removeEventListener('mouseup', dragEnd);
  document.removeEventListener('touchmove', dragMove);
  document.removeEventListener('touchend', dragEnd);
}

// Bring clicked window to the top layout stack
function focusWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;

  topZIndex += 1;
  win.style.zIndex = topZIndex;

  // Mark window active visual state
  document.querySelectorAll('.window').forEach(w => w.classList.remove('active-window'));
  win.classList.add('active-window');

  // Push to active lists if not there
  if (!activeWindows.includes(windowId)) {
    activeWindows.push(windowId);
  }

  // Update taskbar tab styling
  renderTaskbarTabs();
}

function saveWindowState(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;
  const rect = win.getBoundingClientRect();
  windowStates[windowId] = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    maximized: false
  };
}


/* ==========================================
   WINDOW CONTROL INTERACTIVE ACTIONS (Min, Max, Close)
   ========================================== */
function openWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;

  win.style.display = 'flex';

  if (window.innerWidth > 600) {
    if (!windowStates[windowId]) {
      const positions = {
        'welcome-window': { top: 20, left: 18, width: 550, height: 420 },
        'languages-window': { top: 50, left: 21, width: 420, height: 420 },
        'education-window': { top: 80, left: 24, width: 480, height: 360 },
        'skills-window': { top: 110, left: 27, width: 500, height: 420 },
        'experience-window': { top: 140, left: 30, width: 480, height: 360 },
        'contact-window': { top: 170, left: 33, width: 440, height: 360 },
        'theme-window': { top: 200, left: 15, width: 440, height: 360 },
        'paint-window': { top: 230, left: 18, width: 500, height: 420 },
        'music-window': { top: 260, left: 21, width: 320, height: 260 },
        'readme-window': { top: 290, left: 24, width: 450, height: 350 }
      };

      const pos = positions[windowId] || { top: 100, left: 25, width: 420, height: 320 };
      win.style.top = `${pos.top}px`;
      win.style.left = `${pos.left}%`;
      win.style.width = `${pos.width}px`;
      win.style.height = `${pos.height}px`;
      saveWindowState(windowId);
    } else if (!windowStates[windowId].maximized) {
      const state = windowStates[windowId];
      win.style.top = `${state.top}px`;
      win.style.left = `${state.left}px`;
      win.style.width = `${state.width}px`;
      win.style.height = `${state.height}px`;
    } else {
      win.style.top = '0';
      win.style.left = '0';
      win.style.width = '100%';
      win.style.height = 'calc(100vh - 40px)';
    }
  }

  if (windowId === 'paint-window') {
    resizeCanvasToContainer();
  }

  // Force responsive maximize on mobile
  if (window.innerWidth <= 600) {
    win.style.top = '5px';
    win.style.left = '5px';
    win.style.width = 'calc(100% - 10px)';
    win.style.height = 'calc(100% - 48px)';
  }

  focusWindow(windowId);
}

function minimizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;

  win.style.display = 'none';

  // Remove from focus stack
  activeWindows = activeWindows.filter(id => id !== windowId);
  
  // Refocus top window if any
  if (activeWindows.length > 0) {
    focusWindow(activeWindows[activeWindows.length - 1]);
  } else {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('active-window'));
    renderTaskbarTabs();
  }
}

function maximizeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;

  if (!windowStates[windowId]) {
    saveWindowState(windowId);
  }

  const state = windowStates[windowId];
  const isMaximized = state && state.maximized;

  if (isMaximized) {
    if (state) {
      win.style.top = `${state.top}px`;
      win.style.left = `${state.left}px`;
      win.style.width = `${state.width}px`;
      win.style.height = `${state.height}px`;
      state.maximized = false;
    }
  } else {
    if (state) {
      state.maximized = true;
    }
    win.style.top = '0';
    win.style.left = '0';
    win.style.width = '100%';
    win.style.height = 'calc(100vh - 40px)';
  }

  if (windowId === 'paint-window') {
    resizeCanvasToContainer();
  }
}

function closeWindow(windowId) {
  const win = document.getElementById(windowId);
  if (!win) return;

  win.style.display = 'none';
  activeWindows = activeWindows.filter(id => id !== windowId);

  // Stop track player if Winamp player closed
  if (windowId === 'music-window') {
    stopMusic();
  }

  // Refocus top window
  if (activeWindows.length > 0) {
    focusWindow(activeWindows[activeWindows.length - 1]);
  } else {
    renderTaskbarTabs();
  }
}

function downloadCV() {
  const link = document.createElement('a');
  link.href = 'assets/CV.pdf';
  link.download = 'Mouad_Ajouhi_CV.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


/* ==========================================
   TASKBAR & START MENU MANAGEMENT
   ========================================== */
function toggleStartMenu() {
  const startMenu = document.getElementById('start-menu');
  if (!startMenu) return;
  
  if (startMenu.style.display === 'none') {
    startMenu.style.display = 'flex';
  } else {
    startMenu.style.display = 'none';
  }
}

function renderTaskbarTabs() {
  const tabsContainer = document.getElementById('taskbar-tabs');
  if (!tabsContainer) return;

  // Clear current tabs
  tabsContainer.innerHTML = '';

  const windowsList = [
    'welcome-window',
    'languages-window',
    'education-window',
    'skills-window',
    'experience-window',
    'contact-window',
    'theme-window',
    'paint-window',
    'music-window',
    'readme-window'
  ];
  
  windowsList.forEach(winId => {
    const win = document.getElementById(winId);
    if (!win) return;

    const isOpen = win.style.display !== 'none';
    
    if (isOpen) {
      const tab = document.createElement('button');
      tab.className = 'taskbar-tab';
      if (win.classList.contains('active-window')) {
        tab.className += ' active-tab';
      }

      // Set label
      let label = 'App';
      if (winId === 'welcome-window') label = '📄 Welcome.doc';
      if (winId === 'languages-window') label = '📄 Languages.doc';
      if (winId === 'education-window') label = '📄 Education.doc';
      if (winId === 'skills-window') label = '📄 Skills.doc';
      if (winId === 'experience-window') label = '📄 Experience.doc';
      if (winId === 'contact-window') label = '📄 Contact.doc';
      if (winId === 'theme-window') label = '⚙️ Display';
      if (winId === 'paint-window') label = '🎨 Paint';
      if (winId === 'music-window') label = '📻 Winamp';
      if (winId === 'readme-window') label = '📝 README.txt';

      tab.innerText = label;
      tab.onclick = () => {
        if (win.classList.contains('active-window')) {
          minimizeWindow(winId);
        } else {
          openWindow(winId);
        }
      };

      tabsContainer.appendChild(tab);
    }
  });
}

// Start menu interactions
function restartSystem() {
  const startMenu = document.getElementById('start-menu');
  if (startMenu) startMenu.style.display = 'none';

  // Close all windows
  const windowsList = [
    'welcome-window', 'languages-window', 'education-window',
    'skills-window', 'experience-window', 'contact-window',
    'theme-window', 'paint-window', 'music-window', 'readme-window'
  ];
  windowsList.forEach(closeWindow);

  // Open boot screen again
  const bootScreen = document.getElementById('boot-screen');
  if (bootScreen) {
    bootScreen.style.display = 'flex';
    bootScreen.style.opacity = '1';
    simulateBoot();
  }

  // Open Welcome again after boot
  setTimeout(() => {
    openWindow('welcome-window');
  }, 1000);
}

function shutdownSystem() {
  const startMenu = document.getElementById('start-menu');
  if (startMenu) startMenu.style.display = 'none';

  // Create full black shutdown screen overlay
  const shutdownScreen = document.createElement('div');
  shutdownScreen.style.position = 'fixed';
  shutdownScreen.style.top = '0';
  shutdownScreen.style.left = '0';
  shutdownScreen.style.width = '100vw';
  shutdownScreen.style.height = '100vh';
  shutdownScreen.style.backgroundColor = '#000';
  shutdownScreen.style.zIndex = '10000';
  shutdownScreen.style.display = 'flex';
  shutdownScreen.style.flexDirection = 'column';
  shutdownScreen.style.justifyContent = 'center';
  shutdownScreen.style.alignItems = 'center';
  shutdownScreen.style.color = '#ff9900';
  shutdownScreen.style.fontFamily = 'monospace';
  shutdownScreen.style.fontSize = '1.2rem';
  shutdownScreen.id = 'shutdown-screen';

  const text = document.createElement('p');
  text.innerText = "It is now safe to turn off your computer.";
  text.style.marginBottom = '20px';
  shutdownScreen.appendChild(text);

  const turnOnBtn = document.createElement('button');
  turnOnBtn.innerText = "Power On";
  turnOnBtn.style.padding = '8px 16px';
  turnOnBtn.style.fontFamily = 'var(--font-pixel)';
  turnOnBtn.style.cursor = 'pointer';
  turnOnBtn.onclick = () => {
    document.body.removeChild(shutdownScreen);
    restartSystem();
  };
  shutdownScreen.appendChild(turnOnBtn);

  document.body.appendChild(shutdownScreen);
}


/* ==========================================
   EDUCATION TIMELINE ROADMAP CARD HIGHLIGHT
   ========================================== */
function highlightRoadmapCard(cardEl, nodeId) {
  // Play sound chiptune chime
  initAudioContext();
  playNote(587.33, 80); // D5 note beep
  
  // Clear other active card states
  document.querySelectorAll('.roadmap-card').forEach(card => {
    card.style.transform = 'none';
    card.style.boxShadow = '4px 4px 0px rgba(0,0,0,0.15)';
    card.style.borderColor = '#000';
    const header = card.querySelector('.roadmap-header');
    if (header) header.style.backgroundColor = '#f0f5ff';
  });

  // Apply active highlighted styles to current card
  cardEl.style.transform = 'translate(-2px, -2px)';
  cardEl.style.boxShadow = '6px 6px 0px rgba(0,0,0,0.25)';
  cardEl.style.borderColor = 'var(--os-blue)';
  const header = cardEl.querySelector('.roadmap-header');
  if (header) header.style.backgroundColor = '#dbe7ff';
}


/* ==========================================
   WEB AUDIO API SYNTHESIZER MUSIC PLAYER (Winamp)
   ========================================== */
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playNote(freq, duration) {
  if (!audioCtx) return;
  if (freq === 0) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'square'; 
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (duration / 1000) - 0.02);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + (duration / 1000));
}

function runMelody() {
  const track = tracks[currentTrack];
  if (currentNoteIndex >= track.length) {
    currentNoteIndex = 0; 
  }

  const [frequency, duration] = track[currentNoteIndex];
  playNote(frequency, duration);

  animateVisualizer(frequency);
  updateTimeDisplay();

  noteInterval = setTimeout(() => {
    currentNoteIndex++;
    runMelody();
  }, duration);
}

function togglePlayMusic() {
  initAudioContext();
  const playBtn = document.getElementById('winamp-play');
  const songTitle = document.getElementById('song-title');

  if (isPlayingMusic) {
    clearTimeout(noteInterval);
    isPlayingMusic = false;
    if (playBtn) playBtn.innerText = 'PLAY';
    if (songTitle) songTitle.innerText = 'PAUSED';
    resetVisualizer();
  } else {
    isPlayingMusic = true;
    if (playBtn) playBtn.innerText = 'PAUSE';
    if (songTitle) songTitle.innerText = trackNames[currentTrack];
    runMelody();
  }
}

// Track actions
function stopMusic() {
  clearTimeout(noteInterval);
  isPlayingMusic = false;
  currentNoteIndex = 0;
  
  const playBtn = document.getElementById('winamp-play');
  const songTitle = document.getElementById('song-title');
  const timeDisplay = document.getElementById('song-time');

  if (playBtn) playBtn.innerText = 'PLAY';
  if (songTitle) songTitle.innerText = 'NO SONG PLAYING';
  if (timeDisplay) timeDisplay.innerText = '00:00';

  resetVisualizer();
}

function playNextTrack() {
  stopMusic();
  currentTrack = (currentTrack + 1) % tracks.length;
  updatePlaylistSelection();
  togglePlayMusic();
}

function playPrevTrack() {
  stopMusic();
  currentTrack = (currentTrack - 1 + tracks.length) % tracks.length;
  updatePlaylistSelection();
  togglePlayMusic();
}

function selectTrack(trackIdx) {
  stopMusic();
  currentTrack = trackIdx;
  updatePlaylistSelection();
  togglePlayMusic();
}

function updatePlaylistSelection() {
  const playlistItems = document.querySelectorAll('.playlist-item');
  playlistItems.forEach((item, index) => {
    if (index === currentTrack) {
      item.classList.add('active-track');
    } else {
      item.classList.remove('active-track');
    }
  });
}

function updateTimeDisplay() {
  const timeDisplay = document.getElementById('song-time');
  if (!timeDisplay) return;

  const totalMs = currentNoteIndex * 250; 
  const totalSecs = Math.floor(totalMs / 1000);
  const minutes = String(Math.floor(totalSecs / 60)).padStart(2, '0');
  const seconds = String(totalSecs % 60).padStart(2, '0');
  timeDisplay.innerText = `${minutes}:${seconds}`;
}

function animateVisualizer(freq) {
  const bars = document.querySelectorAll('.winamp-visualizer .bar');
  bars.forEach(bar => {
    if (freq === 0) {
      bar.style.height = '2px';
    } else {
      const scale = freq / 800;
      const randomHeight = Math.floor(Math.random() * 15) + (scale * 15);
      bar.style.height = `${Math.min(18, Math.max(2, randomHeight))}px`;
    }
  });
}

function resetVisualizer() {
  const bars = document.querySelectorAll('.winamp-visualizer .bar');
  bars.forEach(bar => {
    bar.style.height = '2px';
  });
}


/* ==========================================
   RETRO MS PAINT DRAWING LOGIC
   ========================================== */
function setupPaintCanvas() {
  if (!canvas || !ctx) return;

  resizeCanvasToContainer();

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', startDrawingTouch, { passive: false });
  canvas.addEventListener('touchmove', drawTouch, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
}

function resizeCanvasToContainer() {
  if (!canvas) return;
  
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width || 480;
  canvas.height = rect.height || 320;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function setPaintTool(tool) {
  paintTool = tool;
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active-tool'));
  document.getElementById(`tool-${tool}`).classList.add('active-tool');
}

// Swatch selector
function setPaintColor(color, swatchEl) {
  paintColor = color;
  document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('active-color'));
  swatchEl.classList.add('active-color');
}

function clearCanvas() {
  if (!ctx || !canvas) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startDrawing(e) {
  isDrawing = true;
  draw(e);
}

function startDrawingTouch(e) {
  isDrawing = true;
  e.preventDefault();
  drawTouch(e);
}

function draw(e) {
  if (!isDrawing || !ctx || !canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ctx.lineWidth = paintTool === 'brush' ? 12 : paintTool === 'eraser' ? 20 : 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = paintTool === 'eraser' ? '#ffffff' : paintColor;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function drawTouch(e) {
  if (!isDrawing || !ctx || !canvas) return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  ctx.lineWidth = paintTool === 'brush' ? 12 : paintTool === 'eraser' ? 20 : 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = paintTool === 'eraser' ? '#ffffff' : paintColor;

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function stopDrawing() {
  if (!isDrawing || !ctx) return;
  isDrawing = false;
  ctx.beginPath();
}


/* ==========================================
   CUSTOM MOUSE CURSOR TRAIL EFFECT (Pixel Stars)
   ========================================== */
function setupMouseCursorTrail() {
  const container = document.getElementById('cursor-trail-container');
  if (!container) return;

  let lastTrailTime = 0;

  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastTrailTime < 60) return;
    lastTrailTime = now;

    createStar(e.clientX, e.clientY, container);
  });
}

function createStar(x, y, container) {
  const star = document.createElement('div');
  star.className = 'star-trail';
  
  const size = Math.floor(Math.random() * 6) + 4;
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;

  const offsetX = (Math.random() - 0.5) * 15;
  const offsetY = (Math.random() - 0.5) * 15;
  star.style.left = `${x + offsetX}px`;
  star.style.top = `${y + offsetY}px`;

  const colors = ['#ffeb3b', '#00e5ff', '#d500f9', '#ff1744', '#00e676'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  star.style.backgroundColor = randomColor;
  star.style.boxShadow = `0 0 3px ${randomColor}`;

  container.appendChild(star);

  setTimeout(() => {
    star.remove();
  }, 800);
}

/* ==========================================
   DRAGGABLE DESKTOP ICONS LOGIC
   ========================================== */
let isDraggingIcon = false;
let dragIconId = null;
let iconDragOffset = { x: 0, y: 0 };

function initIconsGrid() {
  const icons = document.querySelectorAll('.desktop-icon');
  const startTop = 20;
  const startLeft = 20;
  const gapY = 80;
  const gapX = 100;
  
  // Calculate max rows based on screen height
  const maxRows = Math.max(1, Math.floor((window.innerHeight - 80) / gapY));
  
  icons.forEach((icon, idx) => {
    const row = idx % maxRows;
    const col = Math.floor(idx / maxRows);
    const x = startLeft + col * gapX;
    const y = startTop + row * gapY;
    
    icon.style.position = 'absolute';
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    icon.style.margin = '0';
    
    // Bind mouse and touch triggers
    icon.addEventListener('mousedown', (e) => startIconDrag(e, icon.id));
    icon.addEventListener('touchstart', (e) => startIconDrag(e, icon.id));
  });
}

function startIconDrag(e, iconId) {
  if (window.innerWidth <= 600) return; // Disable on mobile/touch layout
  
  isDraggingIcon = true;
  dragIconId = iconId;
  const icon = document.getElementById(iconId);
  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
  
  const rect = icon.getBoundingClientRect();
  iconDragOffset.x = clientX - rect.left;
  iconDragOffset.y = clientY - rect.top;
  
  document.addEventListener('mousemove', iconDragMove);
  document.addEventListener('mouseup', iconDragEnd);
  document.addEventListener('touchmove', iconDragMove, { passive: false });
  document.addEventListener('touchend', iconDragEnd);
  
  e.stopPropagation();
}

function iconDragMove(e) {
  if (!isDraggingIcon || !dragIconId) return;
  e.preventDefault();
  
  const icon = document.getElementById(dragIconId);
  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
  
  let x = clientX - iconDragOffset.x;
  let y = clientY - iconDragOffset.y;
  
  // Keep icon within viewport bounds
  const desktopWidth = window.innerWidth;
  const desktopHeight = window.innerHeight;
  if (x < 10) x = 10;
  if (x > desktopWidth - 100) x = desktopWidth - 100;
  if (y < 10) y = 10;
  if (y > desktopHeight - 120) y = desktopHeight - 120;
  
  icon.style.left = `${x}px`;
  icon.style.top = `${y}px`;
}

function iconDragEnd() {
  isDraggingIcon = false;
  dragIconId = null;
  document.removeEventListener('mousemove', iconDragMove);
  document.removeEventListener('mouseup', iconDragEnd);
  document.removeEventListener('touchmove', iconDragMove);
  document.removeEventListener('touchend', iconDragEnd);
}

/* ==========================================
   WINDOW RESIZING LOGIC
   ========================================== */
let isResizing = false;
let resizeWindowId = null;
let initialSize = { w: 0, h: 0 };
let initialMouse = { x: 0, y: 0 };

function startResize(e, windowId) {
  focusWindow(windowId);
  if (window.innerWidth <= 600) return; // Disable resizing on mobile viewports
  
  isResizing = true;
  resizeWindowId = windowId;
  const win = document.getElementById(windowId);
  
  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
  
  initialMouse.x = clientX;
  initialMouse.y = clientY;
  
  const rect = win.getBoundingClientRect();
  initialSize.w = rect.width;
  initialSize.h = rect.height;
  
  document.addEventListener('mousemove', resizeMove);
  document.addEventListener('mouseup', resizeEnd);
  document.addEventListener('touchmove', resizeMove, { passive: false });
  document.addEventListener('touchend', resizeEnd);
  
  e.stopPropagation();
  e.preventDefault();
}

function resizeMove(e) {
  if (!isResizing || !resizeWindowId) return;
  e.preventDefault();
  
  const win = document.getElementById(resizeWindowId);
  const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
  const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
  
  const dx = clientX - initialMouse.x;
  const dy = clientY - initialMouse.y;
  
  let newW = initialSize.w + dx;
  let newH = initialSize.h + dy;
  
  // Set minimum size constraints
  if (newW < 300) newW = 300;
  if (newH < 180) newH = 180;
  
  win.style.width = `${newW}px`;
  win.style.height = `${newH}px`;
  
  // If paint application is being resized, adjust the canvas viewport
  if (resizeWindowId === 'paint-window') {
    resizeCanvasToContainer();
  }
}

function resizeEnd() {
  if (resizeWindowId) {
    saveWindowState(resizeWindowId);
  }
  isResizing = false;
  resizeWindowId = null;
  document.removeEventListener('mousemove', resizeMove);
  document.removeEventListener('mouseup', resizeEnd);
  document.removeEventListener('touchmove', resizeMove);
  document.removeEventListener('touchend', resizeEnd);
}
