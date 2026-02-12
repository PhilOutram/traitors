// Bot Names (Debug)
const BOT_NAMES = ['Bot Alice', 'Bot Bob', 'Bot Carol', 'Bot Dave', 'Bot Eve'];

// Game State
const gameState = {
    playerName: '',
    playerId: '',
    gameCode: '',
    isHost: false,
    role: null, // 'agent' or 'traitor'
    players: [], // Array of {id, name, role, eliminated, voted}
    numTraitors: 1,
    phase: 'lobby', // lobby, playing, deliberation, murder, gameOver
    votes: {}, // playerId: targetPlayerId
    murderVotes: {}, // playerId: targetPlayerId
    murderEnabled: false,
    deliberationStartTime: null
};

// Networking
let peer = null;
let connections = {};
let isConnecting = false;

// Debug mode
let debugMode = false;

// Host manual elimination selection (separate from voting)
let hostManualSelection = null;

// Screen tracking (for help button return)
let currentScreen = 'welcomeScreen';
let previousScreen = 'welcomeScreen';

// Murder timer
let murderTimerId = null;

// Audio
let bgMusic;
let musicTimeout = null;
let soundMuted = false;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    bgMusic = document.getElementById('bgMusic');
    bgMusic.volume = 0.2;
    
    setupEventListeners();
    loadGameState();
    
    // Show welcome screen or ask about reconnecting
    if (gameState.gameCode && gameState.players.length > 0 && gameState.phase !== 'gameOver') {
        showReconnectPrompt();
    } else {
        // Clear old state if game was over
        if (gameState.phase === 'gameOver') {
            resetGame();
        }
        showScreen('welcomeScreen');
    }
});

function setupEventListeners() {
    // Sound toggle button
    document.getElementById('soundToggle').addEventListener('click', () => {
        soundMuted = !soundMuted;
        document.getElementById('soundOnIcon').classList.toggle('hidden', soundMuted);
        document.getElementById('soundOffIcon').classList.toggle('hidden', !soundMuted);
        if (soundMuted && bgMusic) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
            if (musicTimeout) {
                clearTimeout(musicTimeout);
                musicTimeout = null;
            }
        }
    });

    // Help button
    document.getElementById('helpButton').addEventListener('click', () => {
        previousScreen = currentScreen || 'welcomeScreen';
        showScreen('helpScreen');
    });

    document.getElementById('btnCloseHelp').addEventListener('click', () => {
        showScreen(previousScreen || 'welcomeScreen');
    });

    document.getElementById('btnCloseHelpBottom').addEventListener('click', () => {
        showScreen(previousScreen || 'welcomeScreen');
    });
    
    // Reconnect dialog buttons
    document.getElementById('btnReconnectYes').addEventListener('click', () => {
        document.getElementById('reconnectDialog').classList.add('hidden');
        showNotification('Reconnecting to game...', 'success');
        reconnectToGame();
    });
    
    document.getElementById('btnReconnectNo').addEventListener('click', () => {
        document.getElementById('reconnectDialog').classList.add('hidden');
        resetGame();
        showScreen('welcomeScreen');
    });
    
    // Emergency reset button
    document.getElementById('emergencyReset').addEventListener('click', () => {
        if (confirm('Are you sure you want to quit the game? This cannot be undone.')) {
            if (gameState.isHost) {
                broadcastToAll({
                    type: 'gameCancelled'
                });
            }
            resetGame();
            showScreen('welcomeScreen');
            showNotification('Game reset', 'success');
        }
    });
    
    // Welcome screen
    document.getElementById('btnPlay').addEventListener('click', () => {
        showScreen('nameScreen');
    });

    // Name entry
    document.getElementById('btnHostGame').addEventListener('click', () => {
        const name = document.getElementById('playerName').value.trim();
        if (name) {
            gameState.playerName = name;
            gameState.playerId = generateId();
            hostGame();
        } else {
            showNotification('Please enter your name', 'error');
        }
    });

    document.getElementById('btnJoinGame').addEventListener('click', () => {
        const name = document.getElementById('playerName').value.trim();
        if (name) {
            gameState.playerName = name;
            gameState.playerId = generateId();
            showScreen('joinGameScreen');
        } else {
            showNotification('Please enter your name', 'error');
        }
    });

    // Join game
    document.getElementById('btnConfirmJoin').addEventListener('click', () => {
        const code = document.getElementById('gameCodeInput').value.trim().toUpperCase();
        if (code.length === 4 && /^[A-Z]+$/.test(code)) {
            joinGame(code);
        } else {
            showNotification('Please enter a 4-letter game code', 'error');
        }
    });

    document.getElementById('btnCancelJoin').addEventListener('click', () => {
        showScreen('nameScreen');
    });
    
    // Clear old game code when clicking on the input
    document.getElementById('gameCodeInput').addEventListener('focus', (e) => {
        e.target.value = '';
    });

    // Auto-uppercase game code input
    document.getElementById('gameCodeInput').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    // Host setup
    document.getElementById('btnStartGame').addEventListener('click', startGameAsHost);
    document.getElementById('btnCancelHost').addEventListener('click', cancelHosting);
    document.getElementById('btnDebugToggle').addEventListener('click', toggleDebugMode);

    // Waiting room
    document.getElementById('btnLeaveGame').addEventListener('click', leaveGame);

    // Role reveal
    document.getElementById('btnAcknowledgeRole').addEventListener('click', () => {
        showScreen('gameScreen');
        updateGameScreen();
    });

    // Elimination reveal continue
    document.getElementById('btnContinueAfterElimination').addEventListener('click', continueAfterElimination);

    // Game actions
    document.getElementById('btnCallDeliberation').addEventListener('click', callDeliberation);
    document.getElementById('btnRevealMurder').addEventListener('click', revealMurder);
    document.getElementById('btnMurderVote').addEventListener('click', () => {
        showScreen('murderVoteScreen');
        updateMurderVoteScreen();
    });

    // Deliberation
    document.getElementById('btnEliminatePlayer').addEventListener('click', eliminatePlayer);
    document.getElementById('btnManualEliminate').addEventListener('click', manualEliminatePlayer);
    document.getElementById('btnCancelDeliberation').addEventListener('click', cancelDeliberation);

    // Game over
    document.getElementById('btnNewGame').addEventListener('click', () => {
        resetGame();
        showScreen('welcomeScreen');
    });

    // Traitor count selector
    document.getElementById('numTraitors').addEventListener('change', (e) => {
        gameState.numTraitors = parseInt(e.target.value);
        updateTraitorOptions();
    });
}

// Game Flow Functions
function hostGame() {
    gameState.isHost = true;
    gameState.gameCode = generateGameCode();
    gameState.players = [{
        id: gameState.playerId,
        name: gameState.playerName,
        role: null,
        eliminated: false,
        voted: false,
        isHost: true,
        connectionId: null // Host doesn't have a connection to themselves
    }];
    
    initializePeer(gameState.gameCode);
    
    document.getElementById('gameCodeDisplay').textContent = gameState.gameCode;
    updateLobbyPlayers();
    updateTraitorOptions();

    showScreen('hostSetupScreen');
    saveGameState();
}

function toggleDebugMode() {
    if (gameState.phase !== 'lobby') return;

    debugMode = !debugMode;
    const btn = document.getElementById('btnDebugToggle');

    if (debugMode) {
        btn.classList.add('active');
        addBotPlayers();
        showNotification('Debug mode ON — 5 bots added', 'success');
    } else {
        btn.classList.remove('active');
        removeBotPlayers();
        showNotification('Debug mode OFF — bots removed', 'error');
    }
}

function addBotPlayers() {
    if (!gameState.isHost || gameState.phase !== 'lobby') return;

    // Prevent adding bots twice
    if (gameState.players.some(p => p.isBot)) {
        showNotification('Bots already added!', 'error');
        return;
    }

    BOT_NAMES.forEach(name => {
        gameState.players.push({
            id: 'bot-' + generateId(),
            name: name,
            role: null,
            eliminated: false,
            voted: false,
            isHost: false,
            isBot: true,
            connectionId: null
        });
    });

    updateLobbyPlayers();
    updateTraitorOptions();
    saveGameState();

    // Broadcast updated player list to connected real players
    broadcastToAll({
        type: 'playerJoined',
        player: { name: 'Bots' },
        players: gameState.players
    });

    showNotification('5 bot players added!', 'success');
}

function removeBotPlayers() {
    if (!gameState.isHost || gameState.phase !== 'lobby') return;

    const hadBots = gameState.players.some(p => p.isBot);
    gameState.players = gameState.players.filter(p => !p.isBot);

    if (hadBots) {
        updateLobbyPlayers();
        updateTraitorOptions();
        saveGameState();

        broadcastToAll({
            type: 'playerJoined',
            player: { name: 'Update' },
            players: gameState.players
        });
    }
}

function joinGame(code) {
    gameState.gameCode = code;
    gameState.isHost = false;
    
    showLoading(true);
    
    // Generate unique ID for this player
    const myPeerId = generateId();
    
    initializePeer(myPeerId, () => {
        // Connect to host using the game code as the host's peer ID
        console.log('Attempting to connect to host:', code);
        
        const conn = peer.connect(code);
        
        conn.on('open', () => {
            console.log('Connected to host!');
            connections[code] = conn;
            
            // Send join request
            conn.send({
                type: 'join',
                playerId: gameState.playerId,
                playerName: gameState.playerName
            });
            
            showLoading(false);
            document.getElementById('waitingGameCode').textContent = code;
            showScreen('waitingRoomScreen');
        });
        
        conn.on('data', (data) => handleMessage(data, conn));
        
        conn.on('error', (err) => {
            console.error('Connection error:', err);
            showLoading(false);
            showNotification('Failed to join game. Check the code and try again.', 'error');
            showScreen('joinGameScreen');
        });
        
        conn.on('close', () => {
            console.log('Connection to host closed');
            delete connections[code];
        });
        
        // Add timeout for connection
        setTimeout(() => {
            if (!connections[code]) {
                showLoading(false);
                showNotification('Connection timeout. Host may not be available.', 'error');
                showScreen('joinGameScreen');
            }
        }, 20000); // 20 second timeout
    });
}

function initializePeer(id, callback, _retryCount) {
    const retryCount = _retryCount || 0;

    function createPeer() {
        console.log('Initializing peer with ID:', id);

        peer = new Peer(id, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            },
            debug: 2 // Enable debug logging
        });

        peer.on('open', (peerId) => {
            console.log('Peer connection opened. My ID:', peerId);
            if (callback) callback();
        });

        peer.on('connection', (conn) => {
            console.log('Incoming connection from:', conn.peer);
            connections[conn.peer] = conn;

            conn.on('data', (data) => handleMessage(data, conn));

            conn.on('close', () => {
                console.log('Connection closed:', conn.peer);
                delete connections[conn.peer];
                handlePlayerDisconnect(conn.peer);
            });

            conn.on('error', (err) => {
                console.error('Connection error with peer:', conn.peer, err);
            });
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);

            // Auto-retry with a new ID if our peer ID is still held by the signaling server
            if (err.type === 'unavailable-id' && retryCount < 3) {
                console.log('Peer ID unavailable, retrying with new ID... (attempt ' + (retryCount + 1) + ')');
                peer.destroy();
                peer = null;
                const newId = generateId();
                initializePeer(newId, callback, retryCount + 1);
                return;
            }

            // More specific error messages
            if (err.type === 'peer-unavailable') {
                showNotification('Host not found. Check the game code.', 'error');
            } else if (err.type === 'unavailable-id') {
                showNotification('Connection conflict. Please try again.', 'error');
            } else if (err.type === 'network') {
                showNotification('Network error. Check your connection.', 'error');
            } else if (err.type === 'server-error') {
                showNotification('PeerJS server error. Please try again.', 'error');
            } else {
                showNotification('Connection error. Please try again.', 'error');
            }

            showLoading(false);
        });

        peer.on('disconnected', () => {
            console.log('Peer disconnected from signaling server');
            // Attempt to reconnect
            if (!peer.destroyed) {
                peer.reconnect();
            }
        });
    }

    if (peer) {
        peer.destroy();
        peer = null;
        // Wait for PeerJS signaling server to release the old ID
        setTimeout(createPeer, 500);
    } else {
        createPeer();
    }
}

function handleMessage(data, conn) {
    console.log('Received message:', data);
    
    switch(data.type) {
        case 'join':
            if (gameState.isHost && gameState.phase === 'lobby') {
                // Add new player
                const newPlayer = {
                    id: data.playerId,
                    name: data.playerName,
                    role: null,
                    eliminated: false,
                    voted: false,
                    isHost: false,
                    connectionId: conn.peer // Store the connection ID
                };
                
                gameState.players.push(newPlayer);
                updateLobbyPlayers();
                updateTraitorOptions();
                saveGameState();
                
                // Send current game state to new player
                conn.send({
                    type: 'gameState',
                    state: gameState
                });
                
                // Broadcast to all players
                broadcastToAll({
                    type: 'playerJoined',
                    player: newPlayer,
                    players: gameState.players
                });
                
                showNotification(`${data.playerName} joined the game`, 'success');
            }
            break;
            
        case 'gameState':
            // Receive full game state from host
            gameState.players = data.state.players;
            gameState.numTraitors = data.state.numTraitors;
            gameState.phase = data.state.phase;
            
            // Sync to correct screen based on phase
            if (gameState.phase === 'lobby') {
                updateWaitingPlayers();
            } else if (gameState.phase === 'playing') {
                // Already in game, sync state
                const me = gameState.players.find(p => p.id === gameState.playerId);
                if (me && me.role) {
                    gameState.role = me.role;
                }
            }
            
            saveGameState();
            break;
            
        case 'playerJoined':
            gameState.players = data.players;
            updateWaitingPlayers();
            saveGameState();
            showNotification(`${data.player.name} joined the game`, 'success');
            break;
            
        case 'playerLeft':
            // Remove player from list
            gameState.players = gameState.players.filter(p => p.id !== data.playerId);
            
            if (gameState.isHost) {
                updateLobbyPlayers();
                // Broadcast updated player list to everyone
                broadcastToAll({
                    type: 'playerRemoved',
                    playerId: data.playerId,
                    players: gameState.players
                });
            } else {
                updateWaitingPlayers();
            }
            
            saveGameState();
            showNotification(`${data.playerName} left the game`, 'error');
            break;
            
        case 'playerRemoved':
            gameState.players = data.players;
            
            if (gameState.phase === 'lobby') {
                updateWaitingPlayers();
            }
            
            saveGameState();
            
            if (data.playerName) {
                showNotification(`${data.playerName} left the game`, 'error');
            }
            break;
            
        case 'gameStart':
            gameState.players = data.players;
            gameState.phase = 'playing';
            
            // Find my role
            const me = gameState.players.find(p => p.id === gameState.playerId);
            if (me) {
                gameState.role = me.role;
            }
            
            // Play dramatic music when game starts
            playMusicOnEvent();
            
            saveGameState();
            showRoleReveal();
            break;
            
        case 'deliberationStart':
            gameState.phase = 'deliberation';
            gameState.votes = {};
            gameState.deliberationStartTime = data.startTime;
            
            // Play dramatic music when deliberation starts
            playMusicOnEvent();
            
            saveGameState();
            showDeliberationScreen();
            break;
            
        case 'vote':
            gameState.votes[data.voterId] = data.targetId;
            
            // Update my player's voted status
            const voter = gameState.players.find(p => p.id === data.voterId);
            if (voter) voter.voted = true;
            
            saveGameState();
            if (gameState.phase === 'deliberation') {
                updateVoteStatus();
            }
            break;
            
        case 'murderVote':
            if (gameState.role === 'traitor') {
                gameState.murderVotes[data.voterId] = data.targetId;
                saveGameState();
                updateMurderVoteStatus();
            }
            break;
            
        case 'playerEliminated':
            const eliminated = gameState.players.find(p => p.id === data.playerId);
            if (eliminated) {
                eliminated.eliminated = true;
                eliminated.role = data.role; // Reveal role
            }

            gameState.phase = 'playing';
            gameState.votes = {};
            gameState.players.forEach(p => p.voted = false);

            saveGameState();

            // Show elimination reveal screen (continue button handles checkGameOver)
            showEliminationReveal(data.playerName, data.role);
            break;

        case 'voteTied':
            gameState.votes = {};
            gameState.players.forEach(p => p.voted = false);
            saveGameState();
            showNotification(`Vote tied between ${data.tiedPlayerNames.join(' and ')}! Voting again...`, 'error');
            showDeliberationScreen();
            break;

        case 'murderTimerStarted':
            startMurderTimer(data.murderEnabledAt);
            break;

        case 'deliberationCancelled':
            gameState.phase = 'playing';
            gameState.votes = {};
            gameState.players.forEach(p => p.voted = false);
            
            saveGameState();
            showNotification('Deliberation cancelled by host', 'error');
            showScreen('gameScreen');
            updateGameScreen();
            break;
            
        case 'playerMurdered':
            const murdered = gameState.players.find(p => p.id === data.playerId);
            if (murdered) {
                murdered.eliminated = true;
                murdered.murdered = true;
            }
            
            gameState.murderVotes = {};
            gameState.murderEnabled = false;
            if (murderTimerId) {
                clearTimeout(murderTimerId);
                murderTimerId = null;
            }
            document.getElementById('btnRevealMurder').classList.add('hidden');

            saveGameState();
            showNotification(`${data.playerName} was MURDERED by the traitors!`, 'error');
            updateGameScreen();
            checkGameOver();
            break;
            
        case 'gameOver':
            gameState.phase = 'gameOver';
            
            // Reveal all roles and final status
            data.players.forEach(serverPlayer => {
                const localPlayer = gameState.players.find(p => p.id === serverPlayer.id);
                if (localPlayer) {
                    localPlayer.role = serverPlayer.role;
                    localPlayer.eliminated = serverPlayer.eliminated;
                    localPlayer.murdered = serverPlayer.murdered;
                }
            });
            
            saveGameState();
            showGameOver(data.winner);
            break;
            
        case 'gameCancelled':
            showNotification('Host cancelled the game', 'error');
            resetGame();
            showScreen('welcomeScreen');
            break;
            
        case 'requestStateSync':
            // Host responds with current game state
            if (gameState.isHost) {
                conn.send({
                    type: 'stateSync',
                    state: {
                        players: gameState.players,
                        phase: gameState.phase,
                        numTraitors: gameState.numTraitors,
                        votes: gameState.votes,
                        murderVotes: gameState.murderVotes,
                        murderEnabled: gameState.murderEnabled
                    }
                });
            }
            break;
            
        case 'stateSync':
            // Receive state sync from host
            gameState.players = data.state.players;
            gameState.phase = data.state.phase;
            gameState.numTraitors = data.state.numTraitors;
            gameState.votes = data.state.votes || {};
            gameState.murderVotes = data.state.murderVotes || {};
            gameState.murderEnabled = data.state.murderEnabled || false;
            
            // Find my role
            const myPlayer = gameState.players.find(p => p.id === gameState.playerId);
            if (myPlayer && myPlayer.role) {
                gameState.role = myPlayer.role;
            }
            
            saveGameState();
            
            // Navigate to correct screen based on phase
            if (gameState.phase === 'lobby') {
                showScreen('waitingRoomScreen');
                updateWaitingPlayers();
            } else if (gameState.phase === 'deliberation') {
                showDeliberationScreen();
            } else if (gameState.phase === 'playing') {
                showScreen('gameScreen');
                updateGameScreen();
            } else if (gameState.phase === 'gameOver') {
                // Request full game over data
            }
            
            showNotification('Synced with game state', 'success');
            break;
    }
}

function startGameAsHost() {
    if (gameState.players.length < 3) {
        showNotification('Need at least 3 players to start', 'error');
        return;
    }
    
    // Validate traitor count
    if (gameState.numTraitors >= gameState.players.length / 2) {
        showNotification('Too many traitors! Must be less than half the players.', 'error');
        return;
    }
    
    // Assign roles
    assignRoles();
    
    gameState.phase = 'playing';
    saveGameState();
    
    // Play dramatic music when game starts
    playMusicOnEvent();
    
    // Broadcast game start to all players
    broadcastToAll({
        type: 'gameStart',
        players: gameState.players
    });
    
    // Show role to host
    showRoleReveal();
}

function assignRoles() {
    // Shuffle players
    const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);
    
    // Assign traitors
    for (let i = 0; i < gameState.numTraitors; i++) {
        shuffled[i].role = 'traitor';
    }
    
    // Assign agents to remaining
    for (let i = gameState.numTraitors; i < shuffled.length; i++) {
        shuffled[i].role = 'agent';
    }
    
    // Update gameState.players with roles
    gameState.players = shuffled;
    
    // Set my role
    const me = gameState.players.find(p => p.id === gameState.playerId);
    if (me) {
        gameState.role = me.role;
    }
}

function showRoleReveal() {
    const me = gameState.players.find(p => p.id === gameState.playerId);
    
    if (!me || !me.role) return;
    
    const roleCard = document.getElementById('roleCard');
    const roleImage = document.getElementById('roleImage');
    const roleTitle = document.getElementById('roleTitle');
    const roleDescription = document.getElementById('roleDescription');
    const traitorsList = document.getElementById('traitorsListContainer');
    
    if (me.role === 'agent') {
        roleCard.className = 'role-card agent';
        roleImage.src = 'assets/Agent.png';
        roleTitle.textContent = 'YOU ARE AN AGENT';
        roleDescription.textContent = 'Your mission is to identify and eliminate the traitors. Work with other agents to find them before it\'s too late!';
        traitorsList.classList.add('hidden');
    } else {
        roleCard.className = 'role-card traitor';
        roleImage.src = 'assets/Cyborg.png';
        roleTitle.textContent = 'YOU ARE A TRAITOR';
        roleDescription.textContent = 'Your mission is to sabotage the agents and remain undetected. Deceive the agents and eliminate them!';
        
        // Show fellow traitors
        const otherTraitors = gameState.players.filter(p => p.role === 'traitor' && p.id !== gameState.playerId);
        if (otherTraitors.length > 0) {
            const traitorsListDiv = document.getElementById('traitorsList');
            traitorsListDiv.innerHTML = otherTraitors.map(t => `<div class="player-chip">${t.name}</div>`).join('');
            traitorsList.classList.remove('hidden');
        } else {
            traitorsList.classList.add('hidden');
        }
    }
    
    showScreen('roleRevealScreen');
}

function callDeliberation() {
    gameState.phase = 'deliberation';
    gameState.votes = {};
    hostManualSelection = null;
    gameState.deliberationStartTime = Date.now();
    gameState.players.forEach(p => p.voted = false);
    
    saveGameState();
    
    // Play dramatic music during deliberation
    playMusicOnEvent();
    
    broadcastToAll({
        type: 'deliberationStart',
        startTime: gameState.deliberationStartTime
    });

    showDeliberationScreen();

    // Schedule bot votes
    scheduleBotDeliberationVotes();
}

function showEliminationReveal(playerName, role) {
    const card = document.getElementById('eliminationRevealCard');
    const nameEl = document.getElementById('eliminationRevealName');
    const roleEl = document.getElementById('eliminationRevealRole');

    nameEl.textContent = playerName;
    roleEl.textContent = role === 'agent' ? 'AGENT' : 'TRAITOR';
    card.className = `elimination-reveal-card ${role}`;

    // Play dramatic music
    playMusicOnEvent();

    showScreen('eliminationRevealScreen');
}

function continueAfterElimination() {
    showScreen('gameScreen');
    updateGameScreen();
    checkGameOver(true);

    // Start murder timer only if game is still going (host triggers for everyone)
    if (gameState.isHost && gameState.phase !== 'gameOver') {
        // 30 second delay before traitors can murder (10s if all traitors are bots)
        const aliveTraitors = gameState.players.filter(p => !p.eliminated && p.role === 'traitor');
        const allTraitorsAreBots = aliveTraitors.length > 0 && aliveTraitors.every(p => p.isBot);
        const delay = allTraitorsAreBots ? 5 * 1000 : 30 * 1000;

        const murderEnabledAt = Date.now() + delay;
        broadcastToAll({
            type: 'murderTimerStarted',
            murderEnabledAt: murderEnabledAt
        });
        startMurderTimer(murderEnabledAt);
    }
}

function showDeliberationScreen() {
    const votingPlayers = document.getElementById('votingPlayers');
    const alivePlayers = gameState.players.filter(p => !p.eliminated);
    const meEliminated = gameState.players.find(p => p.id === gameState.playerId)?.eliminated;
    const disableButtons = meEliminated && !gameState.isHost;

    votingPlayers.innerHTML = alivePlayers.map(p => `
        <button class="vote-button" data-player-id="${p.id}" ${disableButtons ? 'disabled' : ''}>
            ${p.name}${p.id === gameState.playerId ? ' (You)' : ''}
        </button>
    `).join('');

    if (meEliminated && !gameState.isHost) {
        votingPlayers.insertAdjacentHTML('beforeend',
            '<p style="color: #ff6b6b; margin-top: 10px;">You have been eliminated and cannot vote.</p>');
    } else if (meEliminated && gameState.isHost) {
        votingPlayers.insertAdjacentHTML('beforeend',
            '<p style="color: #f59e0b; margin-top: 10px;">You are eliminated but can still select a player for manual elimination.</p>');
    }

    // Add click listeners
    votingPlayers.querySelectorAll('.vote-button').forEach(btn => {
        btn.addEventListener('click', () => voteForPlayer(btn.dataset.playerId));
    });

    // Show host actions only for host
    if (gameState.isHost) {
        document.getElementById('hostDeliberationActions').classList.remove('hidden');
    } else {
        document.getElementById('hostDeliberationActions').classList.add('hidden');
    }

    updateVoteStatus();
    showScreen('deliberationScreen');
}

function voteForPlayer(targetId) {
    const myPlayer = gameState.players.find(p => p.id === gameState.playerId);

    // If host is eliminated, they can still select a player for manual elimination
    if (myPlayer && myPlayer.eliminated) {
        if (gameState.isHost) {
            hostManualSelection = targetId;
            document.querySelectorAll('.vote-button').forEach(btn => btn.classList.remove('voted'));
            document.querySelector(`[data-player-id="${targetId}"]`)?.classList.add('voted');
            document.getElementById('btnManualEliminate').disabled = false;
            return;
        }
        showNotification('You have been eliminated and cannot vote!', 'error');
        return;
    }

    if (targetId === gameState.playerId && !gameState.isHost) {
        showNotification('You cannot vote for yourself!', 'error');
        return;
    }

    // Track host selection for manual eliminate
    if (gameState.isHost) {
        hostManualSelection = targetId;
    }
    
    gameState.votes[gameState.playerId] = targetId;
    
    const me = gameState.players.find(p => p.id === gameState.playerId);
    if (me) me.voted = true;
    
    saveGameState();
    
    // Broadcast vote
    broadcastToAll({
        type: 'vote',
        voterId: gameState.playerId,
        targetId: targetId
    });
    
    // Update UI
    document.querySelectorAll('.vote-button').forEach(btn => {
        btn.classList.remove('voted');
    });
    document.querySelector(`[data-player-id="${targetId}"]`).classList.add('voted');
    
    // Enable manual eliminate button for host
    if (gameState.isHost) {
        document.getElementById('btnManualEliminate').disabled = false;
    }
    
    updateVoteStatus();
}

function updateVoteStatus() {
    const voteStatus = document.getElementById('voteStatus');
    const alivePlayers = gameState.players.filter(p => !p.eliminated);
    const votedCount = Object.keys(gameState.votes).length;
    
    voteStatus.innerHTML = `
        <p>Votes: ${votedCount} / ${alivePlayers.length}</p>
    `;
    
    if (gameState.isHost && votedCount === alivePlayers.length) {
        showNotification('All players have voted! You can now eliminate a player.', 'success');
    }
}

function eliminatePlayer() {
    const alivePlayers = gameState.players.filter(p => !p.eliminated);
    const votedCount = Object.keys(gameState.votes).length;
    
    if (votedCount < alivePlayers.length) {
        showNotification('Not all players have voted yet!', 'error');
        return;
    }
    
    // Count votes
    const voteCounts = {};
    Object.values(gameState.votes).forEach(targetId => {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });
    
    // Find player with most votes
    let maxVotes = 0;
    let eliminatedId = null;
    const tied = [];
    
    Object.entries(voteCounts).forEach(([playerId, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            eliminatedId = playerId;
            tied.length = 0;
            tied.push(playerId);
        } else if (count === maxVotes) {
            tied.push(playerId);
        }
    });
    
    if (tied.length > 1) {
        const tiedNames = tied.map(id => {
            const p = gameState.players.find(pl => pl.id === id);
            return p ? p.name : 'Unknown';
        });

        // Broadcast tie to all players so they know to re-vote
        broadcastToAll({
            type: 'voteTied',
            tiedPlayerNames: tiedNames
        });

        showNotification(`Vote tied between ${tiedNames.join(' and ')}! Voting again...`, 'error');
        gameState.votes = {};
        gameState.players.forEach(p => p.voted = false);
        saveGameState();
        updateVoteStatus();
        showDeliberationScreen();

        // Schedule bot re-votes
        scheduleBotDeliberationVotes();
        return;
    }
    
    const eliminated = gameState.players.find(p => p.id === eliminatedId);
    if (!eliminated) return;
    
    eliminated.eliminated = true;

    // Broadcast elimination
    broadcastToAll({
        type: 'playerEliminated',
        playerId: eliminatedId,
        playerName: eliminated.name,
        role: eliminated.role
    });

    gameState.phase = 'playing';
    gameState.votes = {};
    gameState.players.forEach(p => p.voted = false);

    saveGameState();

    // Show elimination reveal screen (continue button handles checkGameOver + murder timer)
    showEliminationReveal(eliminated.name, eliminated.role);
}

function manualEliminatePlayer() {
    if (!gameState.isHost) return;

    // Check if host has selected a player
    if (!hostManualSelection) {
        showNotification('Please select a player first by clicking their button above', 'error');
        return;
    }

    const eliminated = gameState.players.find(p => p.id === hostManualSelection);
    if (!eliminated || eliminated.eliminated) {
        showNotification('Invalid player selection', 'error');
        return;
    }
    
    // Confirm elimination
    if (!confirm(`Manually eliminate ${eliminated.name}?`)) {
        return;
    }
    
    eliminated.eliminated = true;

    // Broadcast elimination
    broadcastToAll({
        type: 'playerEliminated',
        playerId: eliminated.id,
        playerName: eliminated.name,
        role: eliminated.role
    });

    gameState.phase = 'playing';
    gameState.votes = {};
    gameState.players.forEach(p => p.voted = false);

    saveGameState();

    // Show elimination reveal screen (continue button handles checkGameOver + murder timer)
    showEliminationReveal(eliminated.name, eliminated.role);
}

function cancelDeliberation() {
    gameState.phase = 'playing';
    gameState.votes = {};
    gameState.players.forEach(p => p.voted = false);
    
    saveGameState();
    
    // Notify all players that deliberation was cancelled
    if (gameState.isHost) {
        broadcastToAll({
            type: 'deliberationCancelled'
        });
    }
    
    showScreen('gameScreen');
    updateGameScreen();
}

function startMurderTimer(murderEnabledAt) {
    // Don't start timer if game is already over
    if (gameState.phase === 'gameOver') return;

    // Clear any existing murder timer
    if (murderTimerId) {
        clearTimeout(murderTimerId);
        murderTimerId = null;
    }

    const delay = murderEnabledAt - Date.now();
    const delaySeconds = Math.max(0, Math.round(delay / 1000));

    // Notify all players about the upcoming murder window
    showNotification(`⚠️ Traitors may commit a murder any time from ${delaySeconds} seconds!`, 'error');

    if (delay <= 0) {
        // Already past the time
        gameState.murderEnabled = true;
        saveGameState();
        if (gameState.role === 'traitor' && gameState.phase === 'playing') {
            document.getElementById('traitorActions').classList.remove('hidden');
            document.getElementById('btnMurderVote').classList.remove('hidden');
            showNotification('🗡️ You can now vote to murder an agent!', 'success');
        }
        scheduleBotMurderVotes();
        return;
    }

    murderTimerId = setTimeout(() => {
        murderTimerId = null;
        gameState.murderEnabled = true;
        saveGameState();
        if (gameState.role === 'traitor' && gameState.phase === 'playing') {
            document.getElementById('traitorActions').classList.remove('hidden');
            document.getElementById('btnMurderVote').classList.remove('hidden');
            showNotification('🗡️ You can now vote to murder an agent!', 'success');
        }
        scheduleBotMurderVotes();
    }, delay);
}

// Bot Voting Functions
function scheduleBotDeliberationVotes() {
    if (!gameState.isHost) return;

    const aliveBots = gameState.players.filter(p => !p.eliminated && p.isBot);
    const alivePlayers = gameState.players.filter(p => !p.eliminated);

    aliveBots.forEach((bot, index) => {
        const delay = 500 + Math.random() * 1500; // 0.5-2 seconds
        setTimeout(() => {
            if (gameState.phase !== 'deliberation') return;
            if (bot.eliminated) return;
            if (gameState.votes[bot.id]) return;

            // Pick a random alive non-self player
            const targets = alivePlayers.filter(p => p.id !== bot.id && !p.eliminated);
            if (targets.length === 0) return;
            const target = targets[Math.floor(Math.random() * targets.length)];

            gameState.votes[bot.id] = target.id;
            bot.voted = true;
            saveGameState();

            // Broadcast so real players' UI updates
            broadcastToAll({
                type: 'vote',
                voterId: bot.id,
                targetId: target.id
            });

            updateVoteStatus();
        }, delay);
    });
}

function scheduleBotMurderVotes() {
    if (!gameState.isHost) return;

    const aliveBotTraitors = gameState.players.filter(
        p => !p.eliminated && p.isBot && p.role === 'traitor'
    );
    const aliveAgents = gameState.players.filter(
        p => !p.eliminated && p.role === 'agent'
    );

    if (aliveAgents.length === 0) return;

    aliveBotTraitors.forEach((bot, index) => {
        const delay = 500 + Math.random() * 1500; // 0.5-2 seconds
        setTimeout(() => {
            if (!gameState.murderEnabled || gameState.phase !== 'playing') return;
            if (bot.eliminated) return;
            if (gameState.murderVotes[bot.id]) return;

            const target = aliveAgents[Math.floor(Math.random() * aliveAgents.length)];

            gameState.murderVotes[bot.id] = target.id;
            saveGameState();

            broadcastToAll({
                type: 'murderVote',
                voterId: bot.id,
                targetId: target.id
            });

            updateMurderVoteStatus();
        }, delay);
    });
}

function updateMurderVoteScreen() {
    const murderTargets = document.getElementById('murderTargets');
    const aliveAgents = gameState.players.filter(p => !p.eliminated && p.role === 'agent');

    murderTargets.innerHTML = aliveAgents.map(p => `
        <button class="vote-button agent-target" data-player-id="${p.id}">
            <span class="murder-target-name">${p.name}</span>
            <span class="murder-daggers" data-target-id="${p.id}"></span>
        </button>
    `).join('');
    
    murderTargets.querySelectorAll('.vote-button').forEach(btn => {
        btn.addEventListener('click', () => voteToMurder(btn.dataset.playerId));
    });
    
    updateMurderVoteStatus();
}

function voteToMurder(targetId) {
    gameState.murderVotes[gameState.playerId] = targetId;
    saveGameState();
    
    broadcastToAll({
        type: 'murderVote',
        voterId: gameState.playerId,
        targetId: targetId
    });
    
    document.querySelectorAll('.vote-button').forEach(btn => {
        btn.classList.remove('voted');
    });
    document.querySelector(`[data-player-id="${targetId}"]`).classList.add('voted');
    
    updateMurderVoteStatus();
    
    showNotification('Vote recorded. Waiting for other traitors...', 'success');
}

function updateMurderVoteStatus() {
    const murderVoteStatus = document.getElementById('murderVoteStatus');
    const aliveTraitors = gameState.players.filter(p => !p.eliminated && p.role === 'traitor');
    const votedCount = Object.keys(gameState.murderVotes).length;
    const myVote = gameState.murderVotes[gameState.playerId];

    // Show each traitor's vote to fellow traitors
    let voteDetails = '';
    aliveTraitors.forEach(t => {
        const vote = gameState.murderVotes[t.id];
        if (vote) {
            const targetName = gameState.players.find(p => p.id === vote)?.name || 'Unknown';
            voteDetails += `<p style="font-size: 0.9em; opacity: 0.8;">${t.isBot ? '🤖 ' : ''}${t.name} → ${targetName}</p>`;
        } else {
            voteDetails += `<p style="font-size: 0.9em; opacity: 0.5;">${t.isBot ? '🤖 ' : ''}${t.name} — waiting...</p>`;
        }
    });

    murderVoteStatus.innerHTML = `
        <p>Traitor Votes: ${votedCount} / ${aliveTraitors.length}</p>
        ${voteDetails}
    `;

    // Update dagger indicators on each agent's vote button
    const targetVoteCounts = {};
    Object.values(gameState.murderVotes).forEach(targetId => {
        targetVoteCounts[targetId] = (targetVoteCounts[targetId] || 0) + 1;
    });
    document.querySelectorAll('.murder-daggers').forEach(el => {
        const targetId = el.dataset.targetId;
        const count = targetVoteCounts[targetId] || 0;
        el.textContent = '🗡️'.repeat(count);
    });

    if (votedCount === aliveTraitors.length) {
        // Host auto-reveals the murder after a short delay
        if (gameState.isHost) {
            setTimeout(() => {
                if (gameState.murderEnabled && Object.keys(gameState.murderVotes).length >= aliveTraitors.length) {
                    revealMurder();
                }
            }, 3000);
        }

        // Navigate traitor players back to game screen while they wait
        if (myVote) {
            showNotification('All traitors have voted! Murder will be revealed shortly...', 'success');
            setTimeout(() => {
                showScreen('gameScreen');
                updateGameScreen();
            }, 2000);
        }
    }
}

function revealMurder() {
    const aliveTraitors = gameState.players.filter(p => !p.eliminated && p.role === 'traitor');
    const votedCount = Object.keys(gameState.murderVotes).length;
    
    if (votedCount < aliveTraitors.length) {
        showNotification('Not all traitors have voted yet!', 'error');
        return;
    }
    
    // Count votes
    const voteCounts = {};
    Object.values(gameState.murderVotes).forEach(targetId => {
        voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });
    
    // Find agent with most votes (random if tied)
    let maxVotes = 0;
    const topTargets = [];
    
    Object.entries(voteCounts).forEach(([playerId, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            topTargets.length = 0;
            topTargets.push(playerId);
        } else if (count === maxVotes) {
            topTargets.push(playerId);
        }
    });
    
    const murderedId = topTargets[Math.floor(Math.random() * topTargets.length)];
    const murdered = gameState.players.find(p => p.id === murderedId);
    
    if (!murdered) return;

    murdered.eliminated = true;
    murdered.murdered = true;

    // Play dramatic music on murder reveal
    playMusicOnEvent();
    
    broadcastToAll({
        type: 'playerMurdered',
        playerId: murderedId,
        playerName: murdered.name
    });
    
    gameState.murderVotes = {};
    gameState.murderEnabled = false;
    if (murderTimerId) {
        clearTimeout(murderTimerId);
        murderTimerId = null;
    }
    document.getElementById('btnRevealMurder').classList.add('hidden');

    saveGameState();

    showNotification(`${murdered.name} was MURDERED by the traitors!`, 'error');
    updateGameScreen();
    checkGameOver();
}

function checkGameOver(afterDeliberation = false) {
    const aliveAgents = gameState.players.filter(p => !p.eliminated && p.role === 'agent').length;
    const aliveTraitors = gameState.players.filter(p => !p.eliminated && p.role === 'traitor').length;

    let winner = null;

    if (aliveTraitors === 0) {
        winner = 'agents';
    } else if (aliveAgents <= aliveTraitors) {
        winner = 'traitors';
    } else if (afterDeliberation && aliveAgents === aliveTraitors + 1) {
        // After deliberation, traitors get a murder which would equalise numbers
        winner = 'traitors';
    }
    
    if (winner) {
        gameState.phase = 'gameOver';
        saveGameState();
        
        // Play dramatic music for game over
        playMusicOnEvent();
        
        if (gameState.isHost) {
            broadcastToAll({
                type: 'gameOver',
                winner: winner,
                players: gameState.players
            });
        }
        
        showGameOver(winner);
    }
}

function showGameOver(winner) {
    const winnerTitle = document.getElementById('winnerTitle');
    const winnerMessage = document.getElementById('winnerMessage');
    const finalRolesList = document.getElementById('finalRolesList');
    
    if (winner === 'agents') {
        winnerTitle.textContent = 'AGENTS WIN!';
        winnerTitle.className = 'winner-title agents-win';
        winnerMessage.textContent = 'All traitors have been eliminated!';
    } else {
        winnerTitle.textContent = 'TRAITORS WIN!';
        winnerTitle.className = 'winner-title traitors-win';
        winnerMessage.textContent = 'The traitors have taken control!';
    }
    
    finalRolesList.innerHTML = gameState.players.map(p => {
        let statusIcon = '';
        if (p.murdered) {
            statusIcon = ' 🗡️';
        } else if (p.eliminated) {
            statusIcon = ' ❌';
        }
        return `
            <div class="role-item ${p.role}">
                <span>${p.isBot ? '🤖 ' : ''}${p.name}${statusIcon}</span>
                <span class="role-badge ${p.role}">${p.role.toUpperCase()}</span>
            </div>
        `;
    }).join('');
    
    showScreen('gameOverScreen');
}

// UI Update Functions
function updateLobbyPlayers() {
    const lobbyPlayers = document.getElementById('lobbyPlayers');
    lobbyPlayers.innerHTML = gameState.players.map(p => `
        <div class="player-chip ${p.isHost ? 'host' : ''} ${p.isBot ? 'bot' : ''}">
            ${p.isBot ? '🤖 ' : ''}${p.name}${p.isHost ? ' 👑' : ''}
        </div>
    `).join('');
    
    // Enable start button if enough players
    const startBtn = document.getElementById('btnStartGame');
    const helpText = document.getElementById('startButtonHelp');
    
    if (gameState.players.length < 3) {
        startBtn.disabled = true;
        helpText.textContent = `Need at least 3 players to start (currently ${gameState.players.length})`;
    } else {
        startBtn.disabled = false;
        helpText.textContent = '';
    }
}

function updateWaitingPlayers() {
    const waitingPlayers = document.getElementById('waitingPlayers');
    waitingPlayers.innerHTML = gameState.players.map(p => `
        <div class="player-chip ${p.isHost ? 'host' : ''} ${p.isBot ? 'bot' : ''}">
            ${p.isBot ? '🤖 ' : ''}${p.name}${p.isHost ? ' 👑' : ''}
        </div>
    `).join('');
}

function updateGameScreen() {
    const playersGrid = document.getElementById('playersGrid');
    const aliveAgents = gameState.players.filter(p => !p.eliminated && p.role === 'agent').length;
    const aliveTraitors = gameState.players.filter(p => !p.eliminated && p.role === 'traitor').length;
    
    document.getElementById('agentCount').textContent = aliveAgents;
    document.getElementById('traitorCount').textContent = aliveTraitors;
    
    playersGrid.innerHTML = gameState.players.map(p => {
        const isMe = p.id === gameState.playerId;
        const showRole = p.eliminated || isMe;
        
        return `
            <div class="player-card ${p.eliminated ? 'eliminated' : 'alive'} ${isMe ? 'you' : ''}">
                <div class="player-name">${p.isBot ? '🤖 ' : ''}${p.name}${isMe ? ' (You)' : ''}</div>
                ${showRole ? `<div class="player-status ${p.eliminated ? 'dead' : ''}">${p.role ? p.role.toUpperCase() : ''}</div>` : ''}
                ${p.eliminated ? '<div class="player-status dead">ELIMINATED</div>' : ''}
            </div>
        `;
    }).join('');
    
    // Show/hide action buttons — always hide first, then selectively show
    document.getElementById('hostActions').classList.add('hidden');
    document.getElementById('traitorActions').classList.add('hidden');
    document.getElementById('btnMurderVote').classList.add('hidden');

    if (gameState.isHost) {
        document.getElementById('hostActions').classList.remove('hidden');
    }

    if (gameState.role === 'traitor' && gameState.murderEnabled) {
        document.getElementById('traitorActions').classList.remove('hidden');
        document.getElementById('btnMurderVote').classList.remove('hidden');
    }
}

function updateTraitorOptions() {
    const numTraitors = document.getElementById('numTraitors');
    const playerCount = gameState.players.length;
    const maxTraitors = Math.floor(playerCount / 2);
    
    numTraitors.innerHTML = '';
    for (let i = 1; i <= Math.max(1, maxTraitors); i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i} Traitor${i > 1 ? 's' : ''}`;
        if (i === gameState.numTraitors) option.selected = true;
        numTraitors.appendChild(option);
    }
}

// Utility Functions
function broadcastToAll(message) {
    Object.values(connections).forEach(conn => {
        try {
            conn.send(message);
        } catch (e) {
            console.error('Failed to send to peer:', e);
        }
    });
}

function handlePlayerDisconnect(peerId) {
    // Find player by connection ID
    const player = gameState.players.find(p => p.connectionId === peerId);
    
    if (player) {
        console.log('Player disconnected:', player.name);
        
        if (gameState.isHost) {
            // Remove player from list
            gameState.players = gameState.players.filter(p => p.connectionId !== peerId);
            
            // Update UI based on current phase
            if (gameState.phase === 'lobby') {
                updateLobbyPlayers();
            }
            
            // Broadcast to all other players
            broadcastToAll({
                type: 'playerRemoved',
                playerId: player.id,
                playerName: player.name,
                players: gameState.players
            });
            
            saveGameState();
            showNotification(`${player.name} disconnected`, 'error');
        }
    }
    
    // If host disconnected and we're next, become host
    if (player && player.isHost && !gameState.isHost && gameState.players.length > 1) {
        gameState.isHost = true;
        
        const me = gameState.players.find(p => p.id === gameState.playerId);
        if (me) me.isHost = true;
        
        showNotification('You are now the host!', 'success');
        saveGameState();
        
        if (gameState.phase === 'playing') {
            updateGameScreen();
        }
    }
}

function reconnectToGame() {
    if (gameState.isHost) {
        initializePeer(gameState.gameCode);
        
        if (gameState.phase === 'lobby') {
            showScreen('hostSetupScreen');
            document.getElementById('gameCodeDisplay').textContent = gameState.gameCode;
            updateLobbyPlayers();
        } else if (gameState.phase === 'playing') {
            showScreen('gameScreen');
            updateGameScreen();
        }
    } else {
        // Try to reconnect as non-host
        joinGame(gameState.gameCode);
    }
}

function showReconnectPrompt() {
    const roleText = gameState.role ? ` as ${gameState.role === 'agent' ? 'an Agent' : 'a Traitor'}` : '';
    const phaseText = gameState.phase === 'lobby' ? 'in the lobby' : 'in progress';
    const message = `You were in a game ${phaseText}${roleText}. Do you want to reconnect?`;
    
    document.getElementById('reconnectMessage').textContent = message;
    document.getElementById('reconnectDialog').classList.remove('hidden');
}

function cancelHosting() {
    // Notify all players that game is cancelled
    if (gameState.isHost && gameState.players.length > 1) {
        broadcastToAll({
            type: 'gameCancelled'
        });
    }
    
    resetGame();
    showScreen('nameScreen');
}

function leaveGame() {
    // Notify host that we're leaving
    if (!gameState.isHost && connections[gameState.gameCode]) {
        connections[gameState.gameCode].send({
            type: 'playerLeft',
            playerId: gameState.playerId,
            playerName: gameState.playerName
        });
    }
    
    // If we're the host, notify everyone the game is cancelled
    if (gameState.isHost) {
        broadcastToAll({
            type: 'gameCancelled'
        });
    }
    
    resetGame();
    showScreen('welcomeScreen');
}

function resetGame() {
    if (peer) peer.destroy();
    connections = {};
    if (murderTimerId) {
        clearTimeout(murderTimerId);
        murderTimerId = null;
    }

    gameState.gameCode = '';
    gameState.isHost = false;
    gameState.role = null;
    gameState.players = [];
    gameState.phase = 'lobby';
    gameState.votes = {};
    gameState.murderVotes = {};
    gameState.murderEnabled = false;
    
    localStorage.removeItem('traitorsGameState');
}

function generateGameCode() {
    // Generate 4-letter code (easier on mobile keyboards)
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return code;
}

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

function showScreen(screenId) {
    // Track current screen (but not the help screen itself)
    if (screenId !== 'helpScreen') {
        currentScreen = screenId;
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    // Show/hide emergency reset button
    const resetBtn = document.getElementById('emergencyReset');
    if (screenId === 'welcomeScreen' || screenId === 'helpScreen') {
        resetBtn.classList.add('hidden');
    } else {
        resetBtn.classList.remove('hidden');
    }

    // Show help button on all screens except the help screen itself
    const helpBtn = document.getElementById('helpButton');
    if (screenId === 'helpScreen') {
        helpBtn.classList.add('hidden');
    } else {
        helpBtn.classList.remove('hidden');
    }

    // Show debug toggle only on host setup screen
    const debugBtn = document.getElementById('btnDebugToggle');
    if (screenId === 'hostSetupScreen') {
        debugBtn.classList.remove('hidden');
    } else {
        debugBtn.classList.add('hidden');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

function playMusicOnEvent() {
    if (bgMusic && !soundMuted) {
        // Stop any existing timeout
        if (musicTimeout) {
            clearTimeout(musicTimeout);
        }

        // Play the music
        bgMusic.currentTime = 0;
        bgMusic.play().catch(e => console.log('Music play failed:', e));
        
        // Stop after 2 minutes (120000 ms)
        musicTimeout = setTimeout(() => {
            bgMusic.pause();
            bgMusic.currentTime = 0;
        }, 120000);
    }
}

// LocalStorage
function saveGameState() {
    const stateToSave = {
        playerName: gameState.playerName,
        playerId: gameState.playerId,
        gameCode: gameState.gameCode,
        isHost: gameState.isHost,
        role: gameState.role,
        players: gameState.players,
        numTraitors: gameState.numTraitors,
        phase: gameState.phase,
        murderEnabled: gameState.murderEnabled
    };
    
    localStorage.setItem('traitorsGameState', JSON.stringify(stateToSave));
}

function loadGameState() {
    const saved = localStorage.getItem('traitorsGameState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            Object.assign(gameState, state);
        } catch (e) {
            console.error('Failed to load game state:', e);
            localStorage.removeItem('traitorsGameState');
        }
    }
}

// Prevent accidental page refresh
window.addEventListener('beforeunload', (e) => {
    if (gameState.players.length > 0 && gameState.phase !== 'gameOver') {
        e.preventDefault();
        e.returnValue = '';
    }
});
