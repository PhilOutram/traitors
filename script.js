// Game State
const gameState = {
    numPlayers: 5,
    numTraitors: 1,
    players: [],
    currentRevealIndex: 0,
    musicEnabled: true,
    soundEnabled: true
};

// Audio Elements
let bgMusic, clickSound, beepSound, sirenSound, explosionSound;

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    // Get audio elements
    bgMusic = document.getElementById('bgMusic');
    clickSound = document.getElementById('clickSound');
    beepSound = document.getElementById('beepSound');
    sirenSound = document.getElementById('sirenSound');
    explosionSound = document.getElementById('explosionSound');

    // Set volume levels
    bgMusic.volume = 0.3;
    clickSound.volume = 0.5;
    beepSound.volume = 0.6;
    sirenSound.volume = 0.4;
    explosionSound.volume = 0.5;

    // Add event listeners
    setupEventListeners();
    
    // Show intro screen
    showScreen('introScreen');
});

function setupEventListeners() {
    // Intro screen
    document.getElementById('btnPlay').addEventListener('click', function() {
        playSound(clickSound);
        playMusic();
        showScreen('menuScreen');
    });

    // Menu screen
    document.getElementById('btnCreate').addEventListener('click', function() {
        playSound(clickSound);
        showScreen('setupScreen');
    });

    document.getElementById('btnJoin').addEventListener('click', function() {
        playSound(beepSound);
        alert('Join Game feature - Enter game code to join!');
    });

    // Setup screen
    document.getElementById('btnStart').addEventListener('click', function() {
        playSound(clickSound);
        startGame();
    });

    // Game screen - Role reveal
    document.getElementById('btnReveal').addEventListener('click', function() {
        playSound(beepSound);
        revealRole();
    });

    document.getElementById('btnNextPlayer').addEventListener('click', function() {
        playSound(clickSound);
        nextPlayer();
    });

    // Active game screen
    document.getElementById('btnTeamMeeting').addEventListener('click', function() {
        playSound(sirenSound);
        teamMeeting();
    });

    document.getElementById('btnExposed').addEventListener('click', function() {
        playSound(clickSound);
        exposeTraitor();
    });

    document.getElementById('btnReset').addEventListener('click', function() {
        playSound(clickSound);
        if (confirm('Are you sure you want to reset the game?')) {
            resetGame();
        }
    });

    // Game over screen
    document.getElementById('btnPlayAgain').addEventListener('click', function() {
        playSound(clickSound);
        showScreen('setupScreen');
    });

    // Player slot clicks
    const playerSlots = document.querySelectorAll('.player-slot');
    playerSlots.forEach(slot => {
        slot.addEventListener('click', function() {
            if (!this.classList.contains('eliminated')) {
                playSound(clickSound);
                togglePlayerElimination(this);
            }
        });
    });
}

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function playSound(sound) {
    if (gameState.soundEnabled && sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Sound play failed:', e));
    }
}

function playMusic() {
    if (gameState.musicEnabled && bgMusic) {
        bgMusic.play().catch(e => console.log('Music play failed:', e));
    }
}

function startGame() {
    // Get settings
    gameState.numPlayers = parseInt(document.getElementById('numPlayers').value);
    gameState.numTraitors = parseInt(document.getElementById('numTraitors').value);
    gameState.currentRevealIndex = 0;

    // Create player array
    gameState.players = [];
    
    // Assign traitors randomly
    const traitorIndices = [];
    while (traitorIndices.length < gameState.numTraitors) {
        const randomIndex = Math.floor(Math.random() * gameState.numPlayers);
        if (!traitorIndices.includes(randomIndex)) {
            traitorIndices.push(randomIndex);
        }
    }

    // Create player objects
    for (let i = 0; i < gameState.numPlayers; i++) {
        gameState.players.push({
            number: i + 1,
            role: traitorIndices.includes(i) ? 'traitor' : 'agent',
            eliminated: false
        });
    }

    // Show game screen for role reveals
    document.getElementById('currentPlayerNum').textContent = 1;
    document.querySelector('.reveal-info').style.display = 'block';
    document.getElementById('roleReveal').classList.add('hidden');
    showScreen('gameScreen');
}

function revealRole() {
    const player = gameState.players[gameState.currentRevealIndex];
    const roleReveal = document.getElementById('roleReveal');
    const roleCard = document.querySelector('.role-card');
    const roleImage = document.getElementById('roleImage');
    const roleTitle = document.getElementById('roleTitle');
    const roleDescription = document.getElementById('roleDescription');

    // Update role card
    if (player.role === 'agent') {
        roleImage.src = 'assets/Agent.png';
        roleTitle.textContent = 'YOU ARE AN AGENT';
        roleTitle.style.color = '#00ff00';
        roleDescription.textContent = 'Your mission is to identify and eliminate the traitors among you. Work with other agents to find the traitors before it\'s too late!';
        roleCard.className = 'role-card role-agent';
    } else {
        roleImage.src = 'assets/Cyborg.png';
        roleTitle.textContent = 'YOU ARE A TRAITOR';
        roleTitle.style.color = '#ff0000';
        roleDescription.textContent = 'Your mission is to sabotage the agents and remain undetected. Deceive the agents and eliminate them one by one!';
        roleCard.className = 'role-card role-traitor';
    }

    // Show role reveal
    document.querySelector('.reveal-info').style.display = 'none';
    roleReveal.classList.remove('hidden');
}

function nextPlayer() {
    gameState.currentRevealIndex++;

    if (gameState.currentRevealIndex < gameState.numPlayers) {
        // Show next player reveal
        document.getElementById('currentPlayerNum').textContent = gameState.currentRevealIndex + 1;
        document.querySelector('.reveal-info').style.display = 'block';
        document.getElementById('roleReveal').classList.add('hidden');
    } else {
        // All players revealed, start active game
        startActiveGame();
    }
}

function startActiveGame() {
    // Setup player grid based on number of players
    const playerSlots = document.querySelectorAll('.player-slot');
    playerSlots.forEach((slot, index) => {
        if (index < gameState.numPlayers) {
            slot.style.display = 'block';
            slot.classList.remove('eliminated');
            const offIcon = slot.querySelector('.off');
            const onIcon = slot.querySelector('.on');
            offIcon.classList.remove('hidden');
            onIcon.classList.add('hidden');
        } else {
            slot.style.display = 'none';
        }
    });

    updateGameInfo();
    showScreen('activeGameScreen');
}

function togglePlayerElimination(slot) {
    const playerNum = parseInt(slot.dataset.player);
    const player = gameState.players.find(p => p.number === playerNum);
    
    if (player && !player.eliminated) {
        player.eliminated = true;
        slot.classList.add('eliminated');
        
        // Show explosion effect
        playSound(explosionSound);
        
        checkGameOver();
    }
}

function teamMeeting() {
    alert('Team Meeting called! Discuss who you think the traitors might be.');
}

function exposeTraitor() {
    const playerNum = prompt('Enter the player number you want to expose (1-' + gameState.numPlayers + '):');
    
    if (playerNum) {
        const num = parseInt(playerNum);
        const player = gameState.players.find(p => p.number === num);
        
        if (player && !player.eliminated) {
            if (player.role === 'traitor') {
                alert('Player ' + num + ' is a TRAITOR! They have been exposed!');
                player.eliminated = true;
                const slot = document.querySelector(`.player-slot[data-player="${num}"]`);
                if (slot) {
                    slot.classList.add('eliminated');
                    const offIcon = slot.querySelector('.off');
                    const onIcon = slot.querySelector('.on');
                    offIcon.classList.add('hidden');
                    onIcon.classList.remove('hidden');
                    
                    // Change to red icon
                    onIcon.src = `assets/${num}_RED_ON.png`;
                }
                playSound(explosionSound);
            } else {
                alert('Player ' + num + ' is an AGENT! Wrong accusation!');
                player.eliminated = true;
                const slot = document.querySelector(`.player-slot[data-player="${num}"]`);
                if (slot) {
                    slot.classList.add('eliminated');
                }
            }
            
            checkGameOver();
        } else if (player && player.eliminated) {
            alert('This player has already been eliminated!');
        } else {
            alert('Invalid player number!');
        }
    }
}

function updateGameInfo() {
    const activeAgents = gameState.players.filter(p => p.role === 'agent' && !p.eliminated).length;
    const activeTraitors = gameState.players.filter(p => p.role === 'traitor' && !p.eliminated).length;
    
    document.getElementById('agentCount').textContent = activeAgents;
    document.getElementById('traitorCount').textContent = activeTraitors;
}

function checkGameOver() {
    updateGameInfo();
    
    const activeAgents = gameState.players.filter(p => p.role === 'agent' && !p.eliminated).length;
    const activeTraitors = gameState.players.filter(p => p.role === 'traitor' && !p.eliminated).length;
    
    if (activeTraitors === 0) {
        endGame('AGENTS WIN!', 'All traitors have been eliminated!');
    } else if (activeAgents <= activeTraitors) {
        endGame('TRAITORS WIN!', 'The traitors have taken control!');
    }
}

function endGame(title, message) {
    playSound(sirenSound);
    
    document.getElementById('winnerTitle').textContent = title;
    document.getElementById('winnerMessage').textContent = message;
    
    // Show final roles
    const finalRoles = document.getElementById('finalRoles');
    finalRoles.innerHTML = '<h3>Final Roles:</h3>';
    
    gameState.players.forEach(player => {
        const roleItem = document.createElement('div');
        roleItem.className = 'role-list-item ' + player.role;
        roleItem.textContent = `Player ${player.number}: ${player.role.toUpperCase()}${player.eliminated ? ' (Eliminated)' : ''}`;
        finalRoles.appendChild(roleItem);
    });
    
    showScreen('gameOverScreen');
}

function resetGame() {
    gameState.players = [];
    gameState.currentRevealIndex = 0;
    showScreen('menuScreen');
}

// Prevent accidental page refresh
window.addEventListener('beforeunload', function (e) {
    if (gameState.players.length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});
