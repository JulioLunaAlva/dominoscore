// DominoScore App - Main Application Logic

class DominoScoreApp {
    constructor() {
        this.players = JSON.parse(localStorage.getItem('dominoscore_players')) || [];
        this.gameHistory = JSON.parse(localStorage.getItem('dominoscore_history')) || [];
        this.currentGame = JSON.parse(localStorage.getItem('dominoscore_current_game')) || null;
        this.currentRound = parseInt(localStorage.getItem('dominoscore_current_round')) || 0;
        this.editingPlayerId = null;

        // Settings with defaults
        this.settings = JSON.parse(localStorage.getItem('dominoscore_settings')) || {
            audioEnabled: true,
            voiceEnabled: true,
            theme: 'dark'
        };

        // Round definitions will be generated based on game mode
        this.roundNames = [];

        this.init();
    }

    init() {
        this.loadData();
        this.checkOnboarding();
        this.registerServiceWorker();

        // Apply Settings
        this.applyTheme(this.settings.theme);
        // Add safety check for elements before accessing properties
        const audioToggle = document.getElementById('setting-audio');
        if (audioToggle) audioToggle.checked = this.settings.audioEnabled;

        const voiceToggle = document.getElementById('setting-voice');
        if (voiceToggle) voiceToggle.checked = this.settings.voiceEnabled;

        // Manual Event Listeners (Fix for module scope issues)
        const onboardingBtn = document.getElementById('btn-complete-onboarding');
        if (onboardingBtn) {
            onboardingBtn.addEventListener('click', () => this.completeOnboarding());
        }

        // Resume Game Check
        // Resume Game Check
        if (this.currentGame && (!this.currentGame.finishedAt && !this.currentGame.endedAt)) {
            const resumeBtn = document.getElementById('btn-resume-game');
            if (resumeBtn) {
                resumeBtn.classList.remove('hidden');
            }
        }
    }

    resumeGame() {
        if (this.currentGame) {
            if (this.currentGame.type === 'rummy') {
                this.showScreen('rummy-game-screen');
                this.renderRummyGameScreen();
            } else {
                this.showScreen('game-screen');
                this.updateRoundInfo();
                this.renderScoreEntry();
                this.renderScoreboard();
            }
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed'));
        }
    }

    loadData() {
        const savedPlayers = localStorage.getItem('dominoscore_players');
        const savedHistory = localStorage.getItem('dominoscore_history');
        const savedGame = localStorage.getItem('dominoscore_current_game');

        if (savedPlayers) {
            this.players = JSON.parse(savedPlayers);
        }

        if (savedHistory) {
            this.gameHistory = JSON.parse(savedHistory);
        }

        if (savedGame) {
            this.currentGame = JSON.parse(savedGame);
        }
    }



    checkOnboarding() {
        const hasSeenOnboarding = localStorage.getItem('dominoscore_onboarding');
        if (hasSeenOnboarding) {
            this.showScreen('menu-screen');
        }
    }

    completeOnboarding() {
        localStorage.setItem('dominoscore_onboarding', 'true');
        this.showScreen('menu-screen');
    }

    showScreen(screenId) {
        // Find current active screen
        const currentScreen = document.querySelector('.screen.active');
        const nextScreen = document.getElementById(screenId);

        if (currentScreen && currentScreen !== nextScreen) {
            // Slide out
            // Force absolute position to prevent content jumping (stacking)
            currentScreen.style.position = 'absolute';
            currentScreen.style.top = '0';
            currentScreen.style.left = '0';
            currentScreen.style.width = '100%';
            currentScreen.style.zIndex = '10'; // Keep on top while fading

            currentScreen.style.opacity = '0';
            currentScreen.style.transform = 'translateX(-20px)';

            setTimeout(() => {
                currentScreen.classList.remove('active');
                currentScreen.style.opacity = '';
                currentScreen.style.transform = '';
                currentScreen.style.position = ''; // Reset
                currentScreen.style.top = '';
                currentScreen.style.left = '';
                currentScreen.style.width = '';
                currentScreen.style.zIndex = '';
            }, 300);
        }

        // Prepare next screen
        // Ensure it's visible before transition ends
        nextScreen.classList.add('active');
        // Reset legacy inline styles just in case
        nextScreen.style.position = '';
        nextScreen.style.opacity = '';

        // Refresh content when showing certain screens
        if (screenId === 'menu-screen') {
            // Re-check resume button visibility
            const resumeBtn = document.getElementById('btn-resume-game');
            if (this.currentGame && !this.currentGame.finishedAt) {
                if (resumeBtn) resumeBtn.classList.remove('hidden');
            } else {
                if (resumeBtn) resumeBtn.classList.add('hidden');
            }
        } else if (screenId === 'players-screen') {
            this.renderPlayersList();
        } else if (screenId === 'new-game-screen') {
            this.renderPlayerSelection();
        } else if (screenId === 'history-screen') {
            this.renderHistory();
        } else if (screenId === 'game-screen') {
            this.renderGameScreen();
        } else if (screenId === 'rummy-setup-screen') {
            this.renderRummySetup();
        } else if (screenId === 'rummy-game-screen') {
            this.renderRummyGameScreen();
        }
    }

    // Player Management
    showAddPlayerForm() {
        document.getElementById('add-player-form').classList.remove('hidden');
        document.getElementById('player-name').value = '';
        document.getElementById('player-photo').value = '';
        document.getElementById('photo-preview').innerHTML = '';
        document.getElementById('photo-preview').classList.add('empty');
        this.editingPlayerId = null;
    }

    cancelAddPlayer() {
        document.getElementById('add-player-form').classList.add('hidden');
        document.getElementById('player-name').value = '';
        document.getElementById('player-photo').value = '';
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = '';
        preview.classList.add('empty');
        this.editingPlayerId = null;

        // Reset button text
        const saveBtn = document.querySelector('#add-player-form .btn-primary');
        if (saveBtn) saveBtn.textContent = 'Guardar';
    }

    editPlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        this.editingPlayerId = playerId;
        document.getElementById('player-name').value = player.name;

        const preview = document.getElementById('photo-preview');
        if (player.photo) {
            preview.innerHTML = `<img src="${player.photo}">`;
            preview.classList.remove('empty');
        } else {
            preview.innerHTML = '';
            preview.classList.add('empty');
        }

        const saveBtn = document.querySelector('#add-player-form .btn-primary');
        if (saveBtn) saveBtn.textContent = 'Actualizar';

        document.getElementById('add-player-form').classList.remove('hidden');
    }

    previewPhoto(event) {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.match('image.*')) {
                this.showToast('Solo se permiten imágenes', 'warning');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const MAX_WIDTH = 150;
                    const MAX_HEIGHT = 150;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

                    const preview = document.getElementById('photo-preview');
                    preview.innerHTML = `<img src="${compressedDataUrl}" alt="Preview">`;
                    preview.classList.remove('empty');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    savePlayer() {
        const nameInput = document.getElementById('player-name');
        const name = nameInput.value.trim();

        if (!name) {
            this.showToast('Por favor ingresa un nombre', 'warning');
            return;
        }

        // Check duplicates
        if (!this.editingPlayerId && this.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('¡Ya existe un jugador con ese nombre!', 'warning');
            return;
        }

        const photoPreview = document.getElementById('photo-preview').querySelector('img');

        const player = {
            id: this.editingPlayerId || Date.now().toString(),
            name: name,
            photo: photoPreview ? photoPreview.src : null,
            gamesPlayed: 0,
            gamesWon: 0,
            createdAt: new Date().toISOString()
        };

        if (this.editingPlayerId) {
            const index = this.players.findIndex(p => p.id === this.editingPlayerId);
            if (index !== -1) {
                // Preserve stats
                player.gamesPlayed = this.players[index].gamesPlayed;
                player.gamesWon = this.players[index].gamesWon;
                player.createdAt = this.players[index].createdAt;
                this.players[index] = player;
            }
        } else {
            this.players.push(player);
        }

        if (this.saveData()) {
            this.showToast(this.editingPlayerId ? 'Jugador actualizado' : 'Jugador creado correctamente', 'success');
            this.renderPlayersList();
            this.cancelAddPlayer(); // This clears inputs
        }
    }

    saveData() {
        try {
            localStorage.setItem('dominoscore_players', JSON.stringify(this.players));
            localStorage.setItem('dominoscore_history', JSON.stringify(this.gameHistory));
            if (this.currentGame) {
                localStorage.setItem('dominoscore_current_game', JSON.stringify(this.currentGame));
                localStorage.setItem('dominoscore_current_round', this.currentRound.toString());
            } else {
                localStorage.removeItem('dominoscore_current_game');
                localStorage.removeItem('dominoscore_current_round');
            }
            return true;
        } catch (e) {
            console.error('Save failed', e);
            if (e.name === 'QuotaExceededError') {
                this.showToast('❌ Memoria llena. Intenta usar fotos más pequeñas o borrar historial.', 'warning');
            } else {
                this.showToast('Error al guardar datos', 'warning');
            }
            return false;
        }
    }

    deletePlayer(playerId) {
        if (confirm('¿Estás seguro de eliminar este jugador?')) {
            this.players = this.players.filter(p => p.id !== playerId);
            this.saveData();
            this.renderPlayersList();
        }
    }

    renderPlayersList() {
        const list = document.getElementById('players-list');

        if (this.players.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No hay jugadores registrados</p>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem;">Presiona el botón + para agregar jugadores</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.players.map(player => `
            <div class="player-card" onclick="app.openPlayerStats('${player.id}')">
                <div class="player-avatar">
                    ${player.photo
                ? `<img src="${player.photo}" alt="${player.name}">`
                : player.name.charAt(0).toUpperCase()
            }
                </div>
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-stats">
                        ${this.getPlayerStatsSummary(player.id)}
                    </div>
                </div>
                <div class="player-actions">
                    <button class="btn-icon-small" onclick="event.stopPropagation(); app.editPlayer('${player.id}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-icon-small" onclick="event.stopPropagation(); app.deletePlayer('${player.id}')" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Game Setup
    renderPlayerSelection() {
        const container = document.getElementById('player-selection');

        if (this.players.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No hay jugadores registrados</p>
                    <button class="btn-primary" onclick="app.showScreen('players-screen')" style="margin-top: 1rem;">
                        Agregar Jugadores
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.players.map(player => `
            <div class="player-select-card" data-player-id="${player.id}" onclick="app.togglePlayerSelection('${player.id}')">
                ${player.photo
                ? `<img src="${player.photo}" alt="${player.name}" class="player-avatar">`
                : `<div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>`
            }
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                </div>
            </div>
        `).join('');

        this.updateGameSetup();
    }

    togglePlayerSelection(playerId) {
        const card = document.querySelector(`[data-player-id="${playerId}"]`);
        card.classList.toggle('selected');
        this.updateGameSetup();
    }

    updateGameSetup() {
        const selectedCards = document.querySelectorAll('#player-selection .player-select-card.selected');
        const playerCount = selectedCards.length;
        const startBtn = document.getElementById('start-game-btn');
        const recommendation = document.getElementById('tile-recommendation');
        const modeInput = document.querySelector('input[name="game-mode"]:checked');
        const mode = modeInput ? parseInt(modeInput.value) : 12;

        if (playerCount >= 2 && playerCount <= 10) {
            startBtn.disabled = false;
            recommendation.classList.remove('hidden');

            let tilesPerPlayer;
            const recommendationText = recommendation.querySelector('.recommendation-text');

            if (mode === 9) { // Double-9 (55 tiles)
                if (playerCount === 2) tilesPerPlayer = 14;
                else if (playerCount === 3) tilesPerPlayer = 13;
                else if (playerCount === 4) tilesPerPlayer = 13;
                else if (playerCount === 5) tilesPerPlayer = 11;
                else if (playerCount === 6) tilesPerPlayer = 9;
                else tilesPerPlayer = Math.floor(55 / playerCount);
            } else { // Double-12 (91 tiles)
                if (playerCount <= 6) tilesPerPlayer = 12; // Standard
                else if (playerCount <= 8) tilesPerPlayer = 10;
                else tilesPerPlayer = Math.floor(91 / playerCount); // 9-10 players -> 9 tiles
            }

            recommendationText.textContent =
                `Con ${playerCount} jugador${playerCount > 1 ? 'es' : ''} y Doble-${mode}, cada uno debe tomar ${tilesPerPlayer} fichas.`;
        } else {
            startBtn.disabled = true;
            recommendation.classList.add('hidden');
        }
    }

    generateRounds(maxDouble) {
        this.roundNames = [];
        for (let i = maxDouble; i >= 0; i--) {
            this.roundNames.push({ name: `Mula del ${i}`, value: i });
        }
    }

    startGame() {
        const selectedCards = document.querySelectorAll('#player-selection .player-select-card.selected');
        const selectedPlayers = Array.from(selectedCards).map(card => {
            const playerId = card.dataset.playerId;
            return this.players.find(p => p.id === playerId);
        });

        if (selectedPlayers.length < 2 || selectedPlayers.length > 10) {
            this.showToast('Selecciona entre 2 y 10 jugadores', 'warning');
            return;
        }

        // Get Game Mode
        const modeInput = document.querySelector('input[name="game-mode"]:checked');
        const mode = modeInput ? parseInt(modeInput.value) : 12;

        this.generateRounds(mode);

        this.currentGame = {
            id: Date.now().toString(),
            mode: mode,
            players: selectedPlayers,
            rounds: this.roundNames.map((round, index) => ({
                roundNumber: index + 1,
                roundName: round.name,
                scores: selectedPlayers.reduce((acc, player) => {
                    acc[player.id] = 0;
                    return acc;
                }, {})
            })),
            startedAt: new Date().toISOString()
        };

        this.currentRound = 0;

        if (this.saveData()) {
            this.showScreen('game-screen');
            this.showToast(`¡Juego Iniciado! Mula del ${mode} 🎲`, 'success');
        }
    }

    // Game Screen
    renderGameScreen() {
        if (!this.currentGame) {
            this.showScreen('menu-screen');
            return;
        }

        // Restore rounds based on saved mode if needed
        if (this.currentGame.mode && (!this.roundNames.length || this.roundNames[0].value !== this.currentGame.mode)) {
            this.generateRounds(this.currentGame.mode || 12);
        }

        this.updateRoundDisplay();
        this.renderScoreEntry();
        this.renderScoreboard();
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-round-btn');
        const nextBtn = document.getElementById('next-round-btn');
        const finishBtn = document.getElementById('finish-game-btn');

        if (!prevBtn || !nextBtn || !finishBtn) return;

        const isLastRound = this.currentRound === this.roundNames.length - 1;

        prevBtn.disabled = this.currentRound === 0;

        if (isLastRound) {
            nextBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            finishBtn.classList.add('hidden');
        }
    }

    updateRoundDisplay() {
        const roundInfo = this.roundNames[this.currentRound];
        document.getElementById('current-round-name').textContent = roundInfo.name;
        document.getElementById('current-round-number').textContent =
            `Ronda ${this.currentRound + 1} de ${this.roundNames.length}`;
    }

    renderScoreEntry() {
        const container = document.getElementById('score-entry');
        const round = this.currentGame.rounds[this.currentRound];

        container.innerHTML = this.currentGame.players.map(player => {
            const totalScore = this.calculateTotalScore(player.id);
            const currentScore = round.scores[player.id];

            return `
                <div class="score-input-card">
                    ${player.photo
                    ? `<img src="${player.photo}" alt="${player.name}" class="player-avatar">`
                    : `<div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>`
                }
                    <div class="score-input-info">
                        <div class="player-name">${player.name}</div>
                        <div class="total-score">Total: ${totalScore}</div>
                    </div>
                    <input type="number" 
                           inputmode="numeric" 
                           pattern="[0-9]*"
                           value="${currentScore === 0 ? '' : currentScore}" 
                           onchange="app.updateScore('${player.id}', this.value)"
                           oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                           min="0"
                           placeholder="0">
                </div>
            `;
        }).join('');
    }

    updateScore(playerId, score) {
        const round = this.currentGame.rounds[this.currentRound];
        round.scores[playerId] = parseInt(score) || 0;
        this.saveData();
        this.renderScoreboard();
    }

    calculateTotalScore(playerId) {
        return this.currentGame.rounds.reduce((total, round) => {
            return total + (round.scores[playerId] || 0);
        }, 0);
    }

    renderScoreboard() {
        const container = document.getElementById('scoreboard');

        const standings = this.currentGame.players.map(player => ({
            player: player,
            totalScore: this.calculateTotalScore(player.id)
        })).sort((a, b) => a.totalScore - b.totalScore);

        container.innerHTML = standings.map((standing, index) => {
            let rankClass = '';
            let rankIcon = '';

            if (index === 0) { rankClass = 'rank-1'; rankIcon = '🥇'; }
            else if (index === 1) { rankClass = 'rank-2'; rankIcon = '🥈'; }
            else if (index === 2) { rankClass = 'rank-3'; rankIcon = '🥉'; }

            return `
            <div class="scoreboard-item ${rankClass}">
                <div class="scoreboard-rank">${index + 1}</div>
                <div style="position: relative; margin-right: 1rem;">
                    ${standing.player.photo
                    ? `<img src="${standing.player.photo}" alt="${standing.player.name}" class="player-avatar ${rankClass}">`
                    : `<div class="player-avatar ${rankClass}">${standing.player.name.charAt(0).toUpperCase()}</div>`
                }
                    ${rankIcon ? `<div style="position: absolute; bottom: -5px; right: -5px; font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${rankIcon}</div>` : ''}
                </div>
                <div class="scoreboard-info">
                    <div class="player-name">${standing.player.name}</div>
                </div>
                <div class="scoreboard-score">${standing.totalScore}</div>
            </div>
            `;
        }).join('');
    }

    previousRound() {
        if (this.currentRound > 0) {
            this.currentRound--;
            this.renderGameScreen();
        }
    }

    nextRound() {
        if (this.currentRound < this.roundNames.length - 1) {
            // Analyze commentary before moving
            this.analyzeRoundCommentary();

            this.currentRound++;
            this.saveData(); // Save new round index
            this.renderGameScreen();
        }
    }

    analyzeRoundCommentary() {
        // Calculate totals up to current round
        const standings = this.currentGame.players.map(player => ({
            player: player,
            totalScore: this.calculateTotalScore(player.id),
            roundScore: this.currentGame.rounds[this.currentRound].scores[player.id] || 0
        })).sort((a, b) => a.totalScore - b.totalScore);

        // 1. Round Winner Analysis (Player with 0 or lowest points)
        const roundWinner = standings.reduce((prev, curr) => curr.roundScore < prev.roundScore ? curr : prev);

        // 2. Rivalry Analysis (1st vs 2nd)
        const leader = standings[0];
        const chaser = standings[1];
        const diff = chaser.totalScore - leader.totalScore;

        // Sequence of messages
        let delay = 0;

        // Message 1: Round Winner (if meaningful)
        if (roundWinner.roundScore === 0) {
            setTimeout(() => {
                this.showToast(`¡${roundWinner.player.name} dominó la ronda! 💥`, 'success');
                this.fireConfetti(); // Mini celebration for round win
            }, delay);
            delay += 2500;
        }

        // Message 2: Rivalry (The "Cesar" logic)
        // Show if difference is small (e.g., less than 15 points) and it's not the first round
        if (this.currentRound > 0 && diff < 15 && diff > 0) {
            setTimeout(() => {
                this.showToast(`¡Cuidado ${leader.player.name}! ${chaser.player.name} está a solo ${diff} puntos de alcanzarte 👀`, 'warning');
            }, delay);
        } else if (this.currentRound > 0 && diff === 0) {
            setTimeout(() => {
                this.showToast(`¡Empate técnico entre ${leader.player.name} y ${chaser.player.name}! 🔥`, 'warning');
            }, delay);
        }
    }

    confirmExitGame() {
        if (confirm('¿Salir del juego actual? El progreso se guardará.')) {
            this.showScreen('menu-screen');
        }
    }

    async shareGame(game) {
        const winner = game.winner;
        const standings = game.finalStandings || game.finalScores || [];

        if (!winner || standings.length === 0) {
            console.error('Incomplete game data for sharing');
            return;
        }

        // Populate Hidden Share Card
        document.getElementById('share-winner-name').textContent = winner.name;
        document.getElementById('share-winner-name').className = 'share-winner-name'; // Reset class
        document.getElementById('share-winner-score').textContent = `${standings[0].totalScore} pts`;

        const date = new Date(game.endedAt || new Date());
        document.getElementById('share-date').textContent = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        // Winner Avatar
        const winnerImg = document.getElementById('share-winner-photo');
        const winnerInitial = document.getElementById('share-winner-initial');
        if (winner.photo) {
            winnerImg.src = winner.photo;
            winnerImg.style.display = 'block';
            winnerInitial.style.display = 'none';
        } else {
            winnerImg.style.display = 'none';
            winnerInitial.textContent = winner.name.charAt(0).toUpperCase();
            winnerInitial.style.display = 'block';
        }

        // Podium List (Top 3)
        const podiumContainer = document.getElementById('share-podium-list');
        podiumContainer.innerHTML = standings.slice(1, 4).map((s, i) => `
            <div class="share-podium-item">
                <span class="share-rank">#${i + 2}</span>
                <span class="share-player-name">${s.player.name}</span>
                <span class="share-player-score">${s.totalScore}</span>
            </div>
        `).join('');

        // Wait a moment for DOM to update and assets to load
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            // Generate Image
            const element = document.getElementById('share-card');

            // We use 'window.html2canvas' to access global CDN script
            if (!window.html2canvas) {
                alert('Error: Componente de compartir no cargado. Revisa tu conexión.');
                return;
            }

            const canvas = await window.html2canvas(element, {
                scale: 2, // High resolution
                backgroundColor: '#000000',
                useCORS: true,
                logging: false,
                width: 600,
                height: 1000,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById('share-card');
                    if (clonedElement) {
                        clonedElement.style.position = 'relative';
                        clonedElement.style.left = '0';
                        clonedElement.style.top = '0';
                        clonedElement.style.opacity = '1';
                        clonedElement.style.visibility = 'visible';
                        clonedElement.style.zIndex = '9999';
                    }
                }
            });

            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], 'domino-ganador.png', { type: 'image/png' });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        const gameTitle = game.type === 'rummy' ? 'Rummy' : 'Dominó';
                        await navigator.share({
                            files: [file],
                            title: `🏆 Ganador del ${gameTitle}`,
                            text: `¡${winner.name} ganó con ${standings[0].totalScore} puntos! 🎲`
                        });
                    } catch (err) {
                        console.log('Share canceled or failed', err);
                    }
                } else {
                    // Fallback to specific download
                    const link = document.createElement('a');
                    link.download = `ganador-${Date.now()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    this.showToast('Imagen guardada 📥', 'success');
                }
            }, 'image/png');

        } catch (error) {
            console.error('Error generating share image:', error);
            alert('No se pudo generar la imagen para compartir.');
        }
    }

    finishGame() {
        if (!confirm('¿Finalizar el juego y guardar los resultados?')) {
            return;
        }

        const standings = this.currentGame.players.map(player => ({
            player: player,
            totalScore: this.calculateTotalScore(player.id)
        })).sort((a, b) => a.totalScore - b.totalScore);

        const winner = standings[0].player;

        // Update player stats
        this.currentGame.players.forEach(player => {
            const playerIndex = this.players.findIndex(p => p.id === player.id);
            if (playerIndex !== -1) {
                this.players[playerIndex].gamesPlayed++;
                if (player.id === winner.id) {
                    this.players[playerIndex].gamesWon++;
                }
            }
        });

        // Save to history
        this.gameHistory.unshift({
            ...this.currentGame,
            endedAt: new Date().toISOString(),
            winner: winner,
            finalScores: standings
        });

        this.currentGame = null;
        this.saveData();

        // Show Celebration and Option to Share
        this.fireConfetti();

        // Show custom modal or alert then share
        // Using confirm for now to prompt share
        setTimeout(() => {
            const gameToShare = this.gameHistory[0]; // The one we just unshifted
            if (confirm(`¡${winner.name} ha ganado! 🏆\n¿Quieres compartir los resultados?`)) {
                this.shareGame(gameToShare);
            }
            this.showScreen('menu-screen');
        }, 1000);
    }

    // History
    renderHistory() {
        const container = document.getElementById('history-list');

        if (this.gameHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📜</div>
                    <p>No hay juegos guardados</p>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem;">Los juegos finalizados aparecerán aquí</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.gameHistory.map(game => {
            const dateStrRaw = game.endedAt || game.finishedAt || new Date().toISOString();
            const date = new Date(dateStrRaw);

            const dateStr = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const isRummy = game.type === 'rummy';
            const typeLabel = isRummy ? '🃏 Rummy' : '🎲 Dominó';
            const typeClass = isRummy ? 'badge-rummy' : 'badge-domino';

            const standings = game.finalScores || game.finalStandings || [];
            const winnerScore = standings.length > 0 ? standings[0].totalScore : 0;

            return `
                <div class="history-card" onclick="app.showGameDetail('${game.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div class="history-date">${dateStr}</div>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span class="game-type-badge ${typeClass}">${typeLabel}</span>
                            <button class="btn-delete-history" onclick="event.stopPropagation(); app.deleteGame('${game.id}')" aria-label="Eliminar partida">🗑️</button>
                        </div>
                    </div>
                    <div class="history-players" style="margin-bottom: 0.5rem;">
                        ${game.players.map(p => `<span class="history-player-tag">${p.name}</span>`).join('')}
                    </div>
                    <div class="history-winner">🏆 Ganador: ${game.winner.name} (${winnerScore} puntos)</div>
                </div>
            `;
        }).join('');
    }

    deleteGame(gameId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta partida del historial?')) {
            this.gameHistory = this.gameHistory.filter(g => g.id !== gameId);
            this.saveData();
            this.renderHistory();
            this.showToast('Partida eliminada 🗑️', 'info');
        }
    }

    showGameDetail(gameId) {
        const game = this.gameHistory.find(g => g.id === gameId);
        if (!game) return;

        const container = document.getElementById('game-detail-content');
        // Fix: Use endedAt
        const dateStrRaw = game.endedAt || game.finishedAt || new Date().toISOString();
        const date = new Date(dateStrRaw);

        const dateStr = date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Fix: Use finalScores if available, fallback to finalStandings
        const standings = game.finalScores || game.finalStandings || [];

        let html = `
            <div style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h3 style="margin-bottom: 0.5rem;">Juego del ${dateStr}</h3>
                    <p style="color: var(--text-secondary);">Duración: ${this.calculateGameDuration(game)}</p>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-small" onclick="app.shareGameFromHistory('${game.id}')" style="background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid #fbbf24;">
                        📸 Compartir
                    </button>
                    <button class="btn-small" onclick="app.resumeGameFromHistory('${game.id}')" style="background: rgba(99, 102, 241, 0.2); color: var(--primary-color); border: 1px solid var(--primary-color);">
                        ♻️ Reanudar
                    </button>
                </div>
            </div>
            
            <div class="scoreboard-section">
                <h3>Clasificación Final</h3>
                <div class="scoreboard">
                    ${standings.map((standing, index) => `
                        <div class="scoreboard-item ${index === 0 ? 'leader' : ''}">
                            <div class="scoreboard-rank">${index + 1}</div>
                            ${standing.player.photo
                ? `<img src="${standing.player.photo}" alt="${standing.player.name}" class="player-avatar">`
                : `<div class="player-avatar">${standing.player.name.charAt(0).toUpperCase()}</div>`
            }
                            <div class="scoreboard-info">
                                <div class="player-name">${standing.player.name}</div>
                            </div>
                            <div class="scoreboard-score">${standing.totalScore}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Detalle por Ronda</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <th style="padding: 0.75rem; text-align: left; color: var(--text-secondary);">Ronda</th>
                                ${game.players.map(p => `<th style="padding: 0.75rem; text-align: center; color: var(--text-secondary);">${p.name}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${game.rounds.map((round, i) => `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 0.75rem;">${round.roundName || `Ronda ${i + 1}`}</td>
                                    ${game.players.map(p => `<td style="padding: 0.75rem; text-align: center;">${round.scores[p.id]}</td>`).join('')}
                                </tr>
                            `).join('')}
                            <tr style="font-weight: 700; background: var(--background-card);">
                                <td style="padding: 0.75rem;">Total</td>
                                ${game.players.map(p => {
                const playerStanding = standings.find(s => s.player.id === p.id);
                return `<td style="padding: 0.75rem; text-align: center;">${playerStanding ? playerStanding.totalScore : 0}</td>`;
            }).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
`;

        container.innerHTML = html;
        this.showScreen('game-detail-screen');
    }

    resumeGameFromHistory(gameId) {
        if (this.currentGame && !confirm('⚠️ Tienes un juego activo. Si reanudas este juego antiguo, perderás el progreso actual. ¿Continuar?')) {
            return;
        }

        const gameIndex = this.gameHistory.findIndex(g => g.id === gameId);
        if (gameIndex === -1) return;

        const gameToResume = this.gameHistory[gameIndex];

        // Restore game state
        this.currentGame = {
            ...gameToResume,
            finishedAt: null, // Clear finished status
            endedAt: null,
            winner: null,
            finalScores: null,
            finalStandings: null
        };

        // Remove from history since it's active again
        this.gameHistory.splice(gameIndex, 1);

        this.currentRound = this.currentGame.rounds.length; // Actually round index is 0-based, maybe we need to find the last played round?
        // Wait, rounds array usually has all rounds initialized? 
        // In this app, rounds are pre-generated.
        // We need to find the first round that isn't fully scored? Or just let user navigate?
        // Let's set to the last round or 0 safely.
        this.currentRound = 0; // User can navigate manually

        this.saveData();

        if (this.currentGame.type === 'rummy') {
            this.showScreen('rummy-game-screen');
            this.renderRummyGameScreen();
        } else {
            this.showScreen('game-screen');
            this.renderGameScreen(); // Force re-render with restored data
        }

        this.showToast('Juego reanudado desde el historial ♻️', 'success');
    }

    shareGameFromHistory(gameId) {
        const game = this.gameHistory.find(g => g.id === gameId);
        if (game) {
            this.shareGame(game);
        }
    }

    calculateGameDuration(game) {
        const start = new Date(game.startedAt);
        // Fix: Use endedAt
        const endStr = game.endedAt || game.finishedAt || new Date().toISOString();
        const end = new Date(endStr);

        const diffMs = end - start;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) {
            return `${diffMins} minutos`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    }

    // --- Premium Features ---

    // 🔊 Voice Announcer
    // Settings Logic
    toggleSetting(key) {
        if (this.settings.hasOwnProperty(key)) {
            this.settings[key] = !this.settings[key];
            this.saveSettings();

            // UX Feedback
            if (this.settings[key]) {
                this.playSuccessSound();
            }
        }
    }

    setTheme(themeName) {
        this.settings.theme = themeName;
        this.saveSettings();
        this.applyTheme(themeName);
    }

    applyTheme(themeName) {
        // UI Feedback for selection
        document.querySelectorAll('.theme-preview').forEach(el => el.classList.remove('active'));
        const activePreview = document.getElementById(`theme-${themeName}`);
        if (activePreview) activePreview.classList.add('active');

        // Apply Logic (Future: Update CSS variables based on theme)
        // For now, we will just use body class
        document.body.className = `theme-${themeName}`;

        // Simple CSS Variable Injection for "Classic Green" or "Light"
        const root = document.documentElement;
        if (themeName === 'green') {
            root.style.setProperty('--background-dark', '#052e16'); // Dark Green
            root.style.setProperty('--background-card', '#14532d'); // Green Card
            root.style.setProperty('--primary-color', '#4ade80');   // Light Green
            root.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)');
        } else if (themeName === 'light') {
            root.style.setProperty('--background-dark', '#f8fafc');
            root.style.setProperty('--background-card', '#ffffff');
            root.style.setProperty('--text-primary', '#0f172a');
            root.style.setProperty('--text-secondary', '#64748b');
            // Adjust header gradients for light mode visibility if needed
        } else {
            // Revert to Dark (Default)
            root.style.removeProperty('--background-dark');
            root.style.removeProperty('--background-card');
            root.style.removeProperty('--primary-color');
            root.style.removeProperty('--primary-gradient');
            root.style.removeProperty('--text-primary');
            root.style.removeProperty('--text-secondary');
        }
    }

    saveSettings() {
        localStorage.setItem('dominoscore_settings', JSON.stringify(this.settings));
    }

    factoryReset() {
        if (confirm('⚠️ ¡PELIGRO! ⚠️\n\nEstás a punto de borrar TODOS los datos:\n- Jugadores y sus fotos\n- Historial de partidas\n- Juegos activos\n\n¿Estás seguro de continuar?')) {
            if (confirm('¿Seguro Seguro? Esta acción no se puede deshacer.')) {
                localStorage.clear();
                window.location.reload();
            }
        }
    }

    // 💾 Backup System
    exportData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('dominoscore_')) {
                data[key] = localStorage.getItem(key);
            }
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `DominoScore_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Copia de seguridad descargada 📥', 'success');
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                let count = 0;

                // Validate some keys
                if (!data['dominoscore_players'] && !data['dominoscore_history']) {
                    throw new Error('Formato de archivo inválido');
                }

                if (confirm('⚠️ Esto reemplazará tus datos actuales con los del archivo. ¿Continuar?')) {
                    // Clear existing app data first to avoid conflicts
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('dominoscore_')) localStorage.removeItem(key);
                    });

                    Object.keys(data).forEach(key => {
                        if (key.startsWith('dominoscore_')) {
                            localStorage.setItem(key, data[key]);
                            count++;
                        }
                    });

                    alert(`¡Éxito! Se restauraron ${count} elementos. La app se reiniciará.`);
                    window.location.reload();
                }
            } catch (err) {
                console.error(err);
                alert('Error al importar: El archivo está dañado o no es válido.');
            }
        };
        reader.readAsText(file);

        // Reset input
        event.target.value = '';
    }

    speak(text) {
        if (!this.settings.voiceEnabled) return;

        // Existing logic...
        if ('speechSynthesis' in window) {
            // Cancel previous speech to avoid queue buildup
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES'; // Spanish
            utterance.rate = 1.1; // Slightly faster for excitement
            utterance.pitch = 1.0;

            // Try to select a good voice (Android/iOS usually have a good default)
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.includes('es') && !v.name.includes('Google'));
            if (preferredVoice) utterance.voice = preferredVoice;

            window.speechSynthesis.speak(utterance);
        }
    }

    // 🎵 Sound Effects (Web Audio API - No assets needed!)
    playTone(frequency, type, duration, vol = 0.1) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            if (!this.audioCtx) this.audioCtx = new AudioContext();

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

            gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start();
            osc.stop(this.audioCtx.currentTime + duration);
        } catch (e) {
            console.error('Audio error', e);
        }
    }

    playClickSound() {
        if (!this.settings.audioEnabled) return;
        // Crisp "Pop" sound
        this.playTone(600, 'sine', 0.1, 0.1);
    }

    playSuccessSound() {
        if (!this.settings.audioEnabled) return;
        // "Ding ding!"
        this.playTone(800, 'sine', 0.1);
        setTimeout(() => this.playTone(1200, 'sine', 0.2), 100);
    }

    playWarningSound() {
        if (!this.settings.audioEnabled) return;
        // Low "Boop"
        this.playTone(300, 'triangle', 0.3);
    }

    unlockAudio() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().then(() => {
                // AudioContext resumed
            });
        }
        if (!this.audioCtx) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioCtx = new AudioContext();
            } catch (e) { console.error(e); }
        }
    }

    playAlarmSequence() {
        if (!this.settings.audioEnabled) return;

        let ticCount = 0;
        let loopCount = 0;
        const totalLoops = 3;

        const playLoop = () => {
            const interval = setInterval(() => {
                // High pitched "Tic"
                this.playTone(800, 'sine', 0.1, 0.2);

                ticCount++;
                if (ticCount >= 5) {
                    clearInterval(interval);
                    ticCount = 0;

                    // Final "Dong"
                    setTimeout(() => {
                        this.playTone(400, 'triangle', 0.4, 0.3);
                        loopCount++;
                        if (loopCount < totalLoops) {
                            setTimeout(playLoop, 800);
                        }
                    }, 200);
                }
            }, 200);
        };

        playLoop();
    }

    // Haptic Feedback
    vibrate(pattern = 10) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    // Connection Monitoring
    setupConnectionMonitoring() {
        window.addEventListener('online', () => this.showToast('Conexión restaurada 🌐', 'success'));
        window.addEventListener('offline', () => this.showToast('Modo sin conexión activado 📡', 'warning'));
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Enhance toast with Sound & Voice
        if (type === 'warning') {
            this.vibrate([30, 50, 30]);
            this.playWarningSound();
            // Read important warnings out loud
            if (message.includes('Cuidado') || message.includes('Empate')) {
                this.speak(message);
            }
        }
        else if (type === 'success') {
            this.vibrate(20);
            this.playSuccessSound();
            // Read celebrations
            if (message.includes('dominó') || message.includes('ganó')) {
                this.speak(message);
            }
        } else {
            this.playClickSound();
        }

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Victory Confetti
    fireConfetti() {
        // Simple canvas-based confetti
        const canvas = document.createElement('canvas');
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15 - 5,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 100
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let activeParticles = 0;

            particles.forEach(p => {
                if (p.life > 0) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.3; // gravity
                    p.life--;
                    p.size *= 0.96;

                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    activeParticles++;
                }
            });

            if (activeParticles > 0) {
                requestAnimationFrame(animate);
            } else {
                canvas.remove();
            }
        };

        requestAnimationFrame(animate);
        this.vibrate([50, 50, 50, 50, 100]);
    }

    // --- Stats Logic ---
    getPlayerStatsSummary(playerId) {
        const games = this.gameHistory.filter(g => g.players.some(p => p.id === playerId));
        const wins = games.filter(g => g.winner && g.winner.id === playerId).length;
        return `${games.length} juegos • ${wins} victorias`;
    }

    openPlayerStats(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        // Calculate Stats
        const games = this.gameHistory.filter(g => g.players.some(p => p.id === playerId));
        const totalGames = games.length;
        const wins = games.filter(g => g.winner && g.winner.id === playerId).length;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        let bestScore = '-';
        // Logic: For Rummy, best score is lowest. For Domino, winning score is lowest (if counting penalties) or just "Won".
        // Let's iterate wins to find "best" margin or just lowest score in Rummy.

        // Populate UI
        document.getElementById('stats-name').textContent = player.name;

        const photo = document.getElementById('stats-photo');
        const initial = document.getElementById('stats-initial');
        if (player.photo) {
            photo.src = player.photo;
            photo.classList.remove('hidden');
            initial.style.display = 'none';
        } else {
            photo.classList.add('hidden');
            initial.style.display = 'flex';
            initial.textContent = player.name.charAt(0).toUpperCase();
        }

        document.getElementById('stats-games').textContent = totalGames;
        document.getElementById('stats-wins').textContent = wins;
        document.getElementById('stats-winrate').textContent = `${winRate}%`;
        document.getElementById('stats-best').textContent = bestScore; // Simplified for now

        // History List
        const list = document.getElementById('stats-history-list');
        if (totalGames === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary);">Sin partidas registradas</p>';
        } else {
            list.innerHTML = games.slice(0, 5).map(g => {
                const isWinner = g.winner && g.winner.id === playerId;
                const resultClass = isWinner ? 'success-color' : 'text-secondary';
                const resultText = isWinner ? 'VICTORIA 🏆' : 'DERROTA';
                const date = new Date(g.endedAt || g.finishedAt || Date.now()).toLocaleDateString();

                return `
                    <div class="history-card" style="padding: 0.75rem;">
                        <div style="display:flex; justify-content:space-between;">
                            <span style="font-weight:bold; color: var(--${resultClass === 'success-color' ? 'success' : 'danger'}-color)">${resultText}</span>
                            <span class="history-date">${date}</span>
                        </div>
                        <div style="font-size:0.8rem; margin-top:0.25rem;">${g.type === 'rummy' ? 'Rummy' : 'Dominó'}</div>
                    </div>
                `;
            }).join('');
        }

        this.showScreen('player-stats-screen');
    }

    confirmPauseGame() {
        if (confirm('¿Quieres salir al menú? El juego se guardará para que puedas continuar después.')) {
            this.showScreen('menu-screen');
        }
    }

    confirmExitGame() { // Renamed from Rummy specific or used as generic finish
        if (confirm('¿Seguro que quieres abandonar la partida en curso?')) {
            this.currentGame = null;
            this.saveData();
            this.showScreen('menu-screen');
        }
    }

    // --- Rummy Logic ---

    renderRummySetup() {
        this.selectedRummyPlayers = []; // Reset order on enter
        const container = document.getElementById('rummy-player-selection');

        if (this.players.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <p>No hay jugadores registrados</p>
                    <button class="btn-primary" onclick="app.showScreen('players-screen')">Agregar Jugadores</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.players.map(player => `
            <div class="player-select-card" data-rummy-player-id="${player.id}" onclick="app.toggleRummyPlayer('${player.id}')">
                ${player.photo
                ? `<img src="${player.photo}" class="player-avatar">`
                : `<div class="player-avatar">${player.name.charAt(0)}</div>`
            }
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                </div>
            </div>
        `).join('');

        this.updateRummySetup();
    }

    toggleRummyPlayer(playerId) {
        const card = document.querySelector(`[data-rummy-player-id="${playerId}"]`);
        if (!card) return;

        card.classList.toggle('selected');

        // Ensure selectedRummyPlayers exists
        if (!this.selectedRummyPlayers) this.selectedRummyPlayers = [];

        const isSelected = card.classList.contains('selected');

        if (isSelected) {
            const player = this.players.find(p => p.id === playerId);
            // Defensive: Only add if not already present
            if (player && !this.selectedRummyPlayers.some(p => p.id === playerId)) {
                this.selectedRummyPlayers.push(player);
                this.vibrate(15);
            }
        } else {
            this.selectedRummyPlayers = this.selectedRummyPlayers.filter(p => p.id !== playerId);
            this.vibrate(10);
        }

        this.renderRummyOrderList();
        this.updateRummySetup();
    }

    renderRummyOrderList() {
        const container = document.getElementById('rummy-order-list');
        if (!this.selectedRummyPlayers || this.selectedRummyPlayers.length === 0) {
            container.innerHTML = '<p class="empty-state">Selecciona jugadores arriba para ordenar</p>';
            return;
        }

        container.innerHTML = this.selectedRummyPlayers.map((player, index) => `
            <div class="order-item" data-id="${player.id}">
                <div class="order-rank">${index + 1}</div>
                <div class="order-name">${player.name}</div>
                <div class="order-actions">
                    <button class="btn-order" onclick="app.moveRummyPlayer(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="btn-order" onclick="app.moveRummyPlayer(${index}, 1)" ${index === this.selectedRummyPlayers.length - 1 ? 'disabled' : ''}>↓</button>
                </div>
            </div>
        `).join('');
    }

    moveRummyPlayer(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.selectedRummyPlayers.length) return;

        const temp = this.selectedRummyPlayers[index];
        this.selectedRummyPlayers[index] = this.selectedRummyPlayers[newIndex];
        this.selectedRummyPlayers[newIndex] = temp;

        this.renderRummyOrderList();
        this.vibrate(10);
    }

    updateRummySetup() {
        const selectedCards = document.querySelectorAll('#rummy-player-selection .selected');
        const count = selectedCards.length;
        const startBtn = document.getElementById('start-rummy-btn');
        const recommendation = document.getElementById('rummy-tile-recommendation');

        if (count >= 2) {
            startBtn.disabled = false;
            recommendation.classList.remove('hidden');

            // Standard Rummy (106 tiles) logic
            // 2-4 players: 14 tiles
            // 5+ players: Not standard with 1 set, but usually 10-12
            let tiles = 14;
            if (count > 4) tiles = 10;

            recommendation.querySelector('.recommendation-text').textContent =
                `Con ${count} jugadores, cada uno debe tomar ${tiles} fichas.`;
        } else {
            startBtn.disabled = true;
            recommendation.classList.add('hidden');
        }
    }

    adjustTurnTime(delta) {
        const input = document.getElementById('rummy-turn-time');
        let val = parseInt(input.dataset.value) + delta;
        if (val < 1) val = 1;
        if (val > 10) val = 10;
        input.value = `${val} min`;
        input.dataset.value = val;
    }

    setRummyMode(mode, element) {
        this.rummyScoringMode = mode;
        const options = document.querySelectorAll('.mode-option');
        options.forEach(opt => opt.classList.remove('active'));
        element.classList.add('active');
        this.vibrate(5);
    }

    adjustJokerValue(delta) {
        const input = document.getElementById('rummy-joker-value');
        let val = parseInt(input.value) + delta;
        if (val < 0) val = 0;
        input.value = val;
    }

    startRummyGame() {
        if (!this.selectedRummyPlayers || this.selectedRummyPlayers.length < 2) {
            this.showToast('Selecciona al menos 2 jugadores', 'warning');
            return;
        }

        const selectedPlayers = [...this.selectedRummyPlayers];

        const jokerValue = parseInt(document.getElementById('rummy-joker-value').value);
        const turnTimeMinutes = parseInt(document.getElementById('rummy-turn-time').dataset.value);
        const turnTimeSeconds = turnTimeMinutes * 60;
        const scoringMode = this.rummyScoringMode || 'penalty';

        this.currentGame = {
            id: Date.now().toString(),
            type: 'rummy',
            scoringMode: scoringMode,
            jokerValue: jokerValue,
            players: selectedPlayers,
            rounds: [], // Dynamic rounds
            startedAt: new Date().toISOString(),
            activePlayerIndex: 0,
            timer: {
                totalTime: turnTimeSeconds,
                remaining: turnTimeSeconds,
                running: false,
                interval: null
            }
        };

        this.saveData();
        this.showScreen('rummy-game-screen');
        this.renderRummyGameScreen();
        this.startTimer(); // Auto-start timer
        this.showToast('¡Partida de Rummy iniciada! 🃏', 'success');
    }

    renderRummyGameScreen() {
        const table = document.getElementById('rummy-score-table');
        const entryContainer = document.getElementById('rummy-score-entry');
        const players = this.currentGame.players;
        const rounds = this.currentGame.rounds;

        // 1. Render Score Entry (Top)
        entryContainer.innerHTML = players.map(p => `
            <div class="score-input-card rummy-input-row" data-rummy-player-id="${p.id}">
                <div class="player-avatar">
                    ${p.photo
                ? `<img src="${p.photo}" alt="${p.name}">`
                : p.name.charAt(0).toUpperCase()
            }
                </div>
                <div class="score-input-info">
                    <div style="font-weight: bold;">${p.name}</div>
                    <div style="display: flex; gap: 4px; margin-top: 4px;">
                        <span class="joker-toggle" onclick="app.toggleRummyJoker(this)" title="Primer Comodín">🃏</span>
                        <span class="joker-toggle" onclick="app.toggleRummyJoker(this)" title="Segundo Comodín">🃏</span>
                    </div>
                </div>
                <input type="number"
                       class="rummy-score-input"
                       data-player-id="${p.id}"
                       inputmode="numeric"
                       pattern="[0-9]*"
                       value=""
                       oninput="this.value = this.value.replace(/[^0-9]/g, ''); app.updateRummyLeaders()"
                       placeholder="0">
            </div>
        `).join('');

        // Highlight Active Player
        const inputRows = document.querySelectorAll('.rummy-input-row');
        if (inputRows[this.currentGame.activePlayerIndex]) {
            inputRows[this.currentGame.activePlayerIndex].classList.add('active-turn');
        }

        // Update Active Player Banner
        const activePlayer = this.currentGame.players[this.currentGame.activePlayerIndex];
        const bannerName = document.getElementById('active-player-name');
        if (bannerName) bannerName.textContent = activePlayer.name;

        // Update Timer Display
        this.updateTimerDisplay();
        this.updateTimerControls();

        // 2. Calculate Totals (Just historical for the table body)
        const totals = players.map(p => {
            return rounds.reduce((sum, round) => sum + (round.scores[p.id] || 0), 0);
        });

        // Calculate Ranks for the header (Initial render)
        const rankedPlayers = [...players]
            .map(p => ({
                id: p.id,
                score: rounds.reduce((sum, r) => sum + (r.scores[p.id] || 0), 0)
            }));

        // Sort based on mode
        if (this.currentGame.scoringMode === 'accumulative') {
            rankedPlayers.sort((a, b) => b.score - a.score); // Descending
        } else {
            rankedPlayers.sort((a, b) => a.score - b.score); // Ascending
        }

        let html = `
            <thead>
                <tr>
                    <th class="rummy-round-cell">#</th>
                    ${players.map(p => {
            const rankIndex = rankedPlayers.findIndex(rp => rp.id === p.id);
            let headerRankClass = '';
            let headerIcon = '';

            if (rankIndex === 0) { headerRankClass = 'header-rank-1'; headerIcon = '🥇'; }
            else if (rankIndex === 1) { headerRankClass = 'header-rank-2'; headerIcon = '🥈'; }
            else if (rankIndex === 2) { headerRankClass = 'header-rank-3'; headerIcon = '🥉'; }

            return `
                        <th>
                            <div class="rummy-player-header" id="header-player-${p.id}">
                                <div style="position:relative;">
                                    <div class="player-avatar-mini ${headerRankClass}" id="avatar-player-${p.id}">
                                        ${p.photo
                    ? `<img src="${p.photo}">`
                    : `<div class="player-avatar-mini-initial">${p.name.charAt(0)}</div>`
                }
                                    </div>
                                    <div id="badge-player-${p.id}" style="position:absolute; top:-5px; right:-5px; font-size:1rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${headerIcon}</div>
                                </div>
                                <span>${p.name.split(' ')[0]}</span>
                            </div>
                        </th>
                        `;
        }).join('')}
                </tr>
            </thead>
            <tbody>
        `;

        // Rounds
        rounds.forEach((round, i) => {
            html += `
                <tr>
                    <td class="rummy-round-cell">${i + 1}</td>
                    ${players.map(p => {
                const score = round.scores[p.id] || 0;

                // Determine if this player won the round
                let isWinner = false;
                if (this.currentGame.scoringMode === 'accumulative') {
                    // In accumulative, the winner is the one with the most points in that round
                    const maxScore = Math.max(...Object.values(round.scores));
                    isWinner = score === maxScore && score > 0;
                } else {
                    // In penalty, the winner is usually 0
                    isWinner = score === 0;
                }

                const cellClass = isWinner ? 'round-winner-cell' : '';
                return `<td class="${cellClass}">${score}</td>`;
            }).join('')}
                </tr>
            `;
        });

        // Totals Row
        html += `
            <tr style="border-top: 2px solid var(--border-color); background: rgba(99, 102, 241, 0.05);">
                <td class="rummy-round-cell">Σ</td>
                ${totals.map(t => `<td style="font-weight: 800; font-size: 1.1rem;">${t}</td>`).join('')}
            </tr>
            </tbody>
        `;

        table.innerHTML = html;
        document.getElementById('rummy-round-badge').textContent = `Ronda ${rounds.length + 1}`;

        // Auto-scroll to bottom of table
        const container = document.querySelector('.rummy-table-container');
        if (container) container.scrollTop = container.scrollHeight;
    }

    updateRummyLeaders() {
        if (!this.currentGame || this.currentGame.type !== 'rummy') return;

        const players = this.currentGame.players;
        const rounds = this.currentGame.rounds;

        // Calculate Historical Scores
        const historicalScores = {};
        players.forEach(p => {
            historicalScores[p.id] = rounds.reduce((sum, round) => sum + (round.scores[p.id] || 0), 0);
        });

        // Add Current Input Scores
        const inputs = document.querySelectorAll('.rummy-score-input');
        inputs.forEach(input => {
            const pid = input.dataset.playerId;
            const val = parseInt(input.value) || 0;
            if (historicalScores[pid] !== undefined) {
                historicalScores[pid] += val;
            }
        });

        // Determine Ranks
        const rankedIds = Object.keys(historicalScores)
            .sort((a, b) => historicalScores[a] - historicalScores[b]); // Ascending

        // Update UI
        players.forEach(p => {
            const rankIndex = rankedIds.indexOf(p.id);
            const avatarParams = document.getElementById(`avatar-player-${p.id}`);
            const badgeParams = document.getElementById(`badge-player-${p.id}`);

            if (avatarParams && badgeParams) {
                // Remove old classes
                avatarParams.classList.remove('header-rank-1', 'header-rank-2', 'header-rank-3');
                badgeParams.innerHTML = '';

                if (rankIndex === 0) {
                    avatarParams.classList.add('header-rank-1');
                    badgeParams.innerHTML = '🥇';
                } else if (rankIndex === 1) {
                    avatarParams.classList.add('header-rank-2');
                    badgeParams.innerHTML = '🥈';
                } else if (rankIndex === 2) {
                    avatarParams.classList.add('header-rank-3');
                    badgeParams.innerHTML = '🥉';
                }
            }
        });
    }

    toggleRummyJoker(el) {
        el.classList.toggle('active');
        this.playClickSound();
    }

    saveRummyRound() {
        const rows = document.querySelectorAll('.rummy-input-row');
        const scores = {};
        const jokerPenalty = this.currentGame.jokerValue || 30;
        let hasData = false;

        rows.forEach(row => {
            const playerId = row.dataset.rummyPlayerId;
            const input = row.querySelector('.rummy-score-input');
            const activeJokers = row.querySelectorAll('.joker-toggle.active').length;

            let score = parseInt(input.value) || 0;
            if (input.value !== '') hasData = true;

            score += (activeJokers * jokerPenalty);
            scores[playerId] = score;
        });

        if (!hasData && !confirm('¿Guardar ronda con todos en 0?')) return;

        // Custom Scoring Logic: Accumulative
        if (this.currentGame.scoringMode === 'accumulative') {
            // Find person with 0 (or lowest score if multiple 0s, though usually one closes)
            let roundWinnerId = null;
            let lowestScore = Infinity;
            let totalOtherPoints = 0;

            for (const pid in scores) {
                if (scores[pid] < lowestScore) {
                    lowestScore = scores[pid];
                    roundWinnerId = pid;
                }
                totalOtherPoints += scores[pid];
            }

            // In accumulative, the winner gets the SUM of everyone else's points
            // Everyone else gets 0 (their penalty is already accounted for in the winner's gain)
            // Wait, common rule: Winner gets sum of points others stay with. 
            // Others stay with their hand points? No, usually they just don't sum anything and the winner sums all.
            const accumulativeScores = {};
            for (const pid in scores) {
                if (pid === roundWinnerId) {
                    accumulativeScores[pid] = totalOtherPoints;
                } else {
                    accumulativeScores[pid] = 0;
                }
            }

            this.currentGame.rounds.push({
                id: Date.now(),
                scores: accumulativeScores,
                originalScores: scores // Optional reference
            });
        } else {
            // Standard Penalty Scoring
            this.currentGame.rounds.push({
                id: Date.now(),
                scores: scores
            });
        }

        // Reset inputs and jokers
        rows.forEach(row => {
            row.querySelector('.rummy-score-input').value = '';
            row.querySelectorAll('.joker-toggle').forEach(t => t.classList.remove('active'));
        });

        this.saveData();
        this.renderRummyGameScreen();
        this.broadcastGameUpdate(); // Share with spectators
        this.showToast('Ronda guardada ✅', 'success');
        this.playSuccessSound();
    }

    // --- Rummy Timer Logic ---

    startTimer() {
        if (!this.currentGame || this.currentGame.type !== 'rummy') return;

        if (this.currentGame.timer.running) return;

        this.currentGame.timer.running = true;
        this.updateTimerControls();

        this.currentGame.timer.interval = setInterval(() => {
            if (this.currentGame.timer.remaining > 0) {
                this.currentGame.timer.remaining--;
                this.updateTimerDisplay();

                // Warnings (Silent updates only)
                if (this.currentGame.timer.remaining <= 10) {
                    document.querySelector('#rummy-game-screen').classList.add('flash-warning');
                }

            } else {
                this.stopTimer();
                this.timeUp();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.currentGame && this.currentGame.timer.interval) {
            clearInterval(this.currentGame.timer.interval);
            this.currentGame.timer.interval = null;
            this.currentGame.timer.running = false;
            this.updateTimerControls();
            document.querySelector('#rummy-game-screen').classList.remove('flash-warning');
        }
    }

    toggleTimer() {
        if (this.currentGame.timer.running) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
        this.updateTimerControls(); // Immediate visual feedback
    }

    nextTurn() {
        if (!this.currentGame) return;

        // Stop current timer
        this.stopTimer();

        // Move to next player
        this.currentGame.activePlayerIndex = (this.currentGame.activePlayerIndex + 1) % this.currentGame.players.length;

        // Reset Timer to dynamic total
        this.currentGame.timer.remaining = this.currentGame.timer.totalTime || 120;

        this.saveData();

        // Refresh UI to show new active player
        this.renderRummyGameScreen();

        // Start new timer
        this.startTimer();
        this.playSuccessSound(); // Ding for next turn
    }

    timeUp() {
        this.vibrate([200, 100, 200, 100, 500]); // Pulsing vibration
        this.playAlarmSequence(); // Now plays 5 tics + 1 dong

        // Show Custom Modal (Non-blocking so sound continues)
        const modal = document.getElementById('time-up-modal');
        const msg = document.getElementById('time-up-message');
        const player = this.currentGame.players[this.currentGame.activePlayerIndex];

        msg.innerHTML = `Penalización para <strong>${player ? player.name : 'Jugador'}</strong>:<br><br><span style="color: var(--danger-color); font-weight: 800; font-size: 1.4rem;">🎲 TOMA 3 FICHAS 🎲</span>`;

        if (modal) modal.classList.remove('hidden');
    }

    closeTimeUpModal() {
        const modal = document.getElementById('time-up-modal');
        if (modal) modal.classList.add('hidden');
    }

    updateTimerDisplay() {
        const display = document.getElementById('rummy-timer-display');
        const timerPath = document.getElementById('timer-path');

        if (!display || !this.currentGame) return;

        const totalSeconds = this.currentGame.timer.remaining;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Circular Progress (SVG)
        if (timerPath) {
            const total = this.currentGame.timer.totalTime || 120;
            const percentage = (totalSeconds / total);
            // 440 is the circumference for r=70 (2 * pi * 70 approx 439.8)
            const offset = 440 * (1 - percentage);
            timerPath.style.strokeDashoffset = offset;

            // Colors
            timerPath.classList.remove('warning', 'danger');
            if (totalSeconds <= 10) timerPath.classList.add('danger');
            else if (totalSeconds <= 30) timerPath.classList.add('warning');
        }
    }

    updateTimerControls() {
        const btn = document.getElementById('btn-pause-timer');
        if (!btn) return;

        if (this.currentGame.timer.running) {
            btn.classList.remove('paused');
            btn.innerHTML = '⏸️'; // Pause icon
        } else {
            btn.classList.add('paused');
            btn.innerHTML = ''; // Icon handled by CSS ::after or we just set text
            // Let's stick to text to be safe if CSS ::after fails
            btn.textContent = '▶️';
        }
    }
    finishRummyGame() {
        if (!confirm('¿Finalizar partida de Rummy?')) return;

        // Determine winner (Lowest Score)
        const players = this.currentGame.players;
        const rounds = this.currentGame.rounds;
        if (rounds.length === 0) {
            this.showToast('No hay rondas registradas', 'warning');
            return;
        }

        const totals = players.map(p => ({
            player: p,
            totalScore: rounds.reduce((sum, round) => sum + (round.scores[p.id] || 0), 0)
        }));

        if (this.currentGame.scoringMode === 'accumulative') {
            totals.sort((a, b) => b.totalScore - a.totalScore); // Highest wins
        } else {
            totals.sort((a, b) => a.totalScore - b.totalScore); // Lowest wins
        }

        const winner = totals[0].player;

        const gameToSave = {
            ...this.currentGame,
            type: 'rummy',
            endedAt: new Date().toISOString(),
            winner: winner,
            finalStandings: totals
        };

        if (!Array.isArray(this.gameHistory)) this.gameHistory = [];
        this.gameHistory.unshift(gameToSave);

        this.currentGame = null;
        this.saveData();

        this.fireConfetti();

        // Ask to share
        if (confirm(`¡${winner.name} ha ganado con ${totals[0].totalScore} puntos! 🏆\n\n¿Quieres compartir el resultado?`)) {
            this.shareGame(gameToSave);
        }

        this.showScreen('menu-screen');
    }
    // --- Spectator Mode Logic ---

    // --- Client Side ---
    checkSpectatorMode() {
        const params = new URLSearchParams(window.location.search);
        const hostId = params.get('spectate');

        if (hostId) {
            console.log('Connecting as spectator to:', hostId);
            this.showScreen('spectator-loading'); // Placeholder

            // Allow clicking to unlock audio just in case they want sounds
            document.body.addEventListener('click', () => this.unlockAudio(), { once: true });

            const peer = new Peer();
            peer.on('open', () => {
                const conn = peer.connect(`domino-score-${hostId}`);

                conn.on('open', () => {
                    this.showToast('Conectado al Host 🟢', 'success');
                });

                conn.on('data', (data) => {
                    if (data.type === 'UPDATE') {
                        this.currentGame = data.game;
                        this.renderSpectatorView();
                    }
                });

                conn.on('error', (err) => console.error(err));
            });
        }
    }

    renderSpectatorView() {
        // Reuse render logic but read-only
        if (!this.currentGame) return;

        // Hide interactive elements
        document.querySelectorAll('.header .btn-back, .header .btn-icon').forEach(el => el.style.display = 'none');

        if (this.currentGame.type === 'rummy') {
            this.showScreen('rummy-game-screen');
            this.renderRummyGameScreen();

            // Disable inputs
            document.querySelectorAll('input').forEach(i => i.disabled = true);
            document.querySelectorAll('.joker-toggle').forEach(t => t.style.pointerEvents = 'none');
            document.getElementById('btn-pause-timer').style.display = 'none';
            document.getElementById('btn-next-turn').style.display = 'none';
            document.getElementById('rummy-save-btn').style.display = 'none';
        } else {
            // Domino
            this.showScreen('game-screen');
            this.renderGameScreen();
        }

        // Add "Live" indicator
        let badge = document.getElementById('live-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'live-badge';
            badge.className = 'live-badge';
            badge.innerHTML = '🔴 EN VIVO';
            document.querySelector('.header').appendChild(badge);
        }
    }

    async initSpectatorHost() {
        if (this.peer) return; // Already hosting

        this.showToast('Iniciando modo espectador... 📡');

        try {
            // Generate short ID
            const shortId = Math.random().toString(36).substr(2, 4).toUpperCase();
            this.peer = new Peer(`domino-score-${shortId}`);

            this.peer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                this.hostId = id;
                this.spectators = [];
                this.showSpectatorQR(shortId);
            });

            this.peer.on('connection', (conn) => {
                console.log('Spectator connected');
                this.spectators.push(conn);

                // Send current state immediately
                conn.on('open', () => {
                    this.broadcastGameUpdate();
                });
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS error', err);
                this.showToast('Error de conexión ❌', 'warning');
            });

        } catch (e) {
            console.error(e);
            this.showToast('No se pudo iniciar PeerJS', 'warning');
        }
    }

    broadcastGameUpdate() {
        if (!this.peer || !this.currentGame || !this.spectators) return;

        const data = {
            type: 'UPDATE',
            game: this.currentGame
        };

        this.spectators.forEach(conn => {
            if (conn.open) {
                conn.send(data);
            }
        });
    }

    showSpectatorQR(code) {
        // Create modal for QR
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'qr-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>📡 Modo Espectador</h2>
                <div id="qrcode" style="margin: 20px auto; width: 256px;"></div>
                <p style="font-size: 1.5rem; font-weight: bold; margin: 10px 0; color: var(--primary-color);">${code}</p>
                <p>Escanear para ver en vivo</p>
                <div class="modal-actions">
                    <button class="btn-primary" onclick="document.getElementById('qr-modal').remove()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Generate QR
        const url = `${window.location.href.split('?')[0]}?spectate=${code}`;
        new QRCode(modal.querySelector('#qrcode'), {
            text: url,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
}


// Robust Initialization
window.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM Loaded, initializing App...');
        window.app = new DominoScoreApp();

        // Global click listener for haptic feedback & sound
        document.addEventListener('click', (e) => {
            // Unlock Audio Context on any interaction
            if (window.app && window.app.unlockAudio) {
                window.app.unlockAudio();
            }

            if (e.target.closest('button') || e.target.closest('.player-select-card') || e.target.closest('.history-card')) {
                if (window.app && window.app.vibrate) {
                    window.app.vibrate(10);
                    window.app.playClickSound();
                }
            }
        });

        if (window.app) {
            window.app.setupConnectionMonitoring();
            window.app.checkSpectatorMode();
        }
    } catch (e) {
        console.error('App init failed:', e);
        // Fallback for user awareness
        alert('Error al iniciar la aplicación: ' + e.message);
    }
});
