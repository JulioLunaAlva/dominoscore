// DominoScore App - Main Application Logic

class DominoScoreApp {
    constructor() {
        this.players = [];
        this.currentGame = null;
        this.gameHistory = [];
        this.currentRound = 0;
        this.editingPlayerId = null;

        // Round names from double-12 to double-blank
        this.roundNames = [
            { name: 'Mula del 12', value: '12-12' },
            { name: 'Mula del 11', value: '11-11' },
            { name: 'Mula del 10', value: '10-10' },
            { name: 'Mula del 9', value: '9-9' },
            { name: 'Mula del 8', value: '8-8' },
            { name: 'Mula del 7', value: '7-7' },
            { name: 'Mula del 6', value: '6-6' },
            { name: 'Mula del 5', value: '5-5' },
            { name: 'Mula del 4', value: '4-4' },
            { name: 'Mula del 3', value: '3-3' },
            { name: 'Mula del 2', value: '2-2' },
            { name: 'Blanca', value: '0-0' }
        ];

        this.init();
    }

    init() {
        this.loadData();
        this.checkOnboarding();
        this.registerServiceWorker();
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

    saveData() {
        localStorage.setItem('dominoscore_players', JSON.stringify(this.players));
        localStorage.setItem('dominoscore_history', JSON.stringify(this.gameHistory));
        if (this.currentGame) {
            localStorage.setItem('dominoscore_current_game', JSON.stringify(this.currentGame));
        } else {
            localStorage.removeItem('dominoscore_current_game');
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
        if (screenId === 'players-screen') {
            this.renderPlayersList();
        } else if (screenId === 'new-game-screen') {
            this.renderPlayerSelection();
        } else if (screenId === 'history-screen') {
            this.renderHistory();
        } else if (screenId === 'game-screen') {
            this.renderGameScreen();
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
        this.editingPlayerId = null;
    }

    previewPhoto(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('photo-preview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                preview.classList.remove('empty');
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
        const container = document.getElementById('players-list');

        if (this.players.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No hay jugadores registrados</p>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem;">Presiona el botón + para agregar jugadores</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.players.map(player => `
            <div class="player-card">
                ${player.photo
                ? `<img src="${player.photo}" alt="${player.name}" class="player-avatar">`
                : `<div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>`
            }
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-stats">${player.gamesPlayed} juegos • ${player.gamesWon} victorias</div>
                </div>
                <div class="player-actions">
                    <button class="btn-small btn-delete" onclick="app.deletePlayer('${player.id}')">Eliminar</button>
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
        const selectedCards = document.querySelectorAll('.player-select-card.selected');
        const playerCount = selectedCards.length;
        const startBtn = document.getElementById('start-game-btn');
        const recommendation = document.getElementById('tile-recommendation');

        if (playerCount >= 2 && playerCount <= 10) {
            startBtn.disabled = false;
            recommendation.classList.remove('hidden');

            let tilesPerPlayer;
            if (playerCount <= 6) {
                tilesPerPlayer = 12;
            } else if (playerCount <= 8) {
                tilesPerPlayer = 10;
            } else {
                tilesPerPlayer = 8;
            }

            recommendation.querySelector('.recommendation-text').textContent =
                `Con ${playerCount} jugador${playerCount > 1 ? 'es' : ''}, cada uno debe tomar ${tilesPerPlayer} fichas.`;
        } else {
            startBtn.disabled = true;
            recommendation.classList.add('hidden');
        }
    }

    startGame() {
        const selectedCards = document.querySelectorAll('.player-select-card.selected');
        const selectedPlayers = Array.from(selectedCards).map(card => {
            const playerId = card.dataset.playerId;
            return this.players.find(p => p.id === playerId);
        });

        if (selectedPlayers.length < 2 || selectedPlayers.length > 10) {
            alert('Selecciona entre 2 y 10 jugadores');
            return;
        }

        this.currentGame = {
            id: Date.now().toString(),
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
            this.showToast('¡Juego Iniciado! Mula del 12 🎲', 'success');
        }
    }

    // Game Screen
    renderGameScreen() {
        if (!this.currentGame) {
            this.showScreen('menu-screen');
            return;
        }

        this.updateRoundDisplay();
        this.renderScoreEntry();
        this.renderScoreboard();
    }

    updateRoundDisplay() {
        const roundInfo = this.roundNames[this.currentRound];
        document.getElementById('current-round-name').textContent = roundInfo.name;
        document.getElementById('current-round-number').textContent =
            `Ronda ${this.currentRound + 1} de 12`;
    }

    renderScoreEntry() {
        const container = document.getElementById('score-entry');
        const round = this.currentGame.rounds[this.currentRound];

        container.innerHTML = this.currentGame.players.map(player => {
            const totalScore = this.calculateTotalScore(player.id);
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
                           value="${round.scores[player.id]}" 
                           onchange="app.updateScore('${player.id}', this.value)"
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

        container.innerHTML = standings.map((standing, index) => `
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
        `).join('');
    }

    previousRound() {
        if (this.currentRound > 0) {
            this.currentRound--;
            this.renderGameScreen();
        }
    }

    nextRound() {
        if (this.currentRound < 11) {
            // Analyze commentary before moving
            this.analyzeRoundCommentary();

            this.currentRound++;
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
        this.currentGame.finishedAt = new Date().toISOString();
        this.currentGame.winner = winner;
        this.currentGame.finalStandings = standings;
        this.gameHistory.unshift(this.currentGame);

        // Clear current game
        this.currentGame = null;
        this.currentRound = 0;

        this.saveData();
        this.showScreen('menu-screen');

        this.fireConfetti();
        setTimeout(() => {
            alert(`¡${winner.name} ganó el juego con ${standings[0].totalScore} puntos!`);
        }, 500);
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
            const date = new Date(game.finishedAt);
            const dateStr = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="history-card" onclick="app.showGameDetail('${game.id}')">
                    <div class="history-date">${dateStr}</div>
                    <div class="history-players">
                        ${game.players.map(p => `<span class="history-player-tag">${p.name}</span>`).join('')}
                    </div>
                    <div class="history-winner">🏆 Ganador: ${game.winner.name} (${game.finalStandings[0].totalScore} puntos)</div>
                </div>
            `;
        }).join('');
    }

    showGameDetail(gameId) {
        const game = this.gameHistory.find(g => g.id === gameId);
        if (!game) return;

        const container = document.getElementById('game-detail-content');
        const date = new Date(game.finishedAt);
        const dateStr = date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let html = `
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 0.5rem;">Juego del ${dateStr}</h3>
                <p style="color: var(--text-secondary);">Duración: ${this.calculateGameDuration(game)}</p>
            </div>
            
            <div class="scoreboard-section">
                <h3>Clasificación Final</h3>
                <div class="scoreboard">
                    ${game.finalStandings.map((standing, index) => `
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
                            ${game.rounds.map(round => `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 0.75rem;">${round.roundName}</td>
                                    ${game.players.map(p => `<td style="padding: 0.75rem; text-align: center;">${round.scores[p.id]}</td>`).join('')}
                                </tr>
                            `).join('')}
                            <tr style="font-weight: 700; background: var(--background-card);">
                                <td style="padding: 0.75rem;">Total</td>
                                ${game.finalStandings.map(s => `<td style="padding: 0.75rem; text-align: center;">${s.totalScore}</td>`).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.showScreen('game-detail-screen');
    }

    calculateGameDuration(game) {
        const start = new Date(game.startedAt);
        const end = new Date(game.finishedAt);
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
    speak(text) {
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
        // Crisp "Pop" sound
        this.playTone(600, 'sine', 0.1, 0.1);
    }

    playSuccessSound() {
        // "Ding ding!"
        this.playTone(800, 'sine', 0.1);
        setTimeout(() => this.playTone(1200, 'sine', 0.2), 100);
    }

    playWarningSound() {
        // Low "Boop"
        this.playTone(300, 'triangle', 0.3);
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
}

// Initialize app
const app = new DominoScoreApp();
window.app = app;

// Add global click listener for haptic feedback & sound
document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.player-select-card') || e.target.closest('.history-card')) {
        app.vibrate(10);
        app.playClickSound();
    }
});

// Setup connection monitoring
app.setupConnectionMonitoring();
