# THE TRAITORS - Multiplayer Web Game

A real-time multiplayer web-based version of The Traitors game where players use their own devices to play together. Built with PeerJS for peer-to-peer connectivity and LocalStorage for game persistence.

## 🎮 About the Game

THE TRAITORS is a social deduction game inspired by the TV show where:
- Players are secretly assigned as either **Agents** (good) or **Traitors** (bad)
- Agents must identify and eliminate Traitors through deliberations
- Traitors can murder Agents and must remain hidden
- The game continues until all Traitors are eliminated (Agents win) or Traitors equal/outnumber Agents (Traitors win)

## ✨ Features

- **🌐 Real-time Multiplayer** - Each player uses their own device
- **📱 Mobile-First Design** - Optimized for phones and tablets
- **🔐 Peer-to-Peer Connection** - No backend server required (uses PeerJS)
- **💾 LocalStorage Persistence** - Game survives browser closes
- **👥 3-20 Players Supported**
- **🎭 Secret Role Assignment** - Traitors know each other, Agents don't
- **🗳️ Voting System** - Democratic deliberations to eliminate suspects
- **💀 Murder Mechanics** - Traitors vote to eliminate Agents
- **🏆 Automatic Win Detection** - Game ends when conditions are met
- **📊 Host Failover** - If host disconnects, another player can become host

## 🚀 How to Play

### 1. **Host a Game**
- Open the web app
- Enter your name
- Click "HOST GAME"
- Share the 4-digit game code with other players
- Choose number of traitors (must be less than half the players)
- Click "START GAME" when everyone has joined

### 2. **Join a Game**
- Open the web app
- Enter your name
- Click "JOIN GAME"
- Enter the 4-digit code from the host
- Wait for the host to start the game

### 3. **Role Reveal**
- Each player secretly views their role on their own device
- **Agents**: See they are an agent
- **Traitors**: See they are a traitor AND who the other traitors are

### 4. **Gameplay**

**Deliberations:**
- The host can call a deliberation at any time
- All players vote for someone to eliminate
- The player with the most votes is eliminated and their role is revealed
- If there's a tie, voting happens again

**Traitor Murders:**
- 10 minutes after each deliberation, traitors can vote to murder an agent
- All traitors vote secretly
- The host reveals the murdered player (no role reveal - everyone knows they were an agent)

### 5. **Win Conditions**
- **Agents Win**: All traitors are eliminated
- **Traitors Win**: Traitors equal or outnumber agents

## 🛠️ Technical Details

### Technologies Used
- **HTML5, CSS3, JavaScript** (vanilla - no frameworks)
- **PeerJS** - Peer-to-peer WebRTC connections
- **LocalStorage** - Game state persistence
- **CSS Grid & Flexbox** - Responsive layout

### Architecture
- **Peer-to-Peer Networking**: Players connect directly to each other (host acts as game server)
- **Host-Authoritative**: Host manages game state and broadcasts updates
- **LocalStorage Backup**: Each device stores game state for recovery

### Browser Compatibility
Works in all modern browsers with WebRTC support:
- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 11+)
- Opera

### Network Requirements
- Players must be on networks that allow WebRTC connections
- Uses public STUN servers (Google)
- No special firewall configuration needed (usually)

## 📦 Installation

### For GitHub Pages:
1. Fork or clone this repository
2. Enable GitHub Pages in repository settings
3. Set source to main branch
4. Access at: `https://yourusername.github.io/repository-name`

### For Local Testing:
1. Clone the repository
2. Open `index.html` in a web browser
3. **Note**: For multiplayer testing, you'll need multiple devices or browser profiles

### File Structure:
```
traitors-multiplayer/
├── index.html          # Main HTML structure
├── styles.css          # All styling (mobile-first)
├── script.js           # Game logic and networking
├── assets/            # Images and audio
│   ├── Agent.png
│   ├── Cyborg.png
│   ├── SplashcreenAgentHQ.jpg
│   ├── Darkambientmusic.mp3
│   └── (button images)
└── README.md
```

## 🎯 Game Tips

- **For Agents**: Pay attention to voting patterns and who suggests eliminations
- **For Traitors**: Stay coordinated, spread doubt, and blend in during deliberations
- **Optimal Player Count**: 5-10 players
- **Recommended Traitor Ratio**: 1 traitor per 3-4 players
- **Communication**: Use separate voice chat (Discord, in-person) for deliberations

## ⚠️ Known Limitations

1. **Host Must Stay Connected**: If host closes browser during game, another player must become host
2. **All Players Must Rejoin**: If everyone closes browsers, at least one player needs to rejoin for game to continue
3. **Network Dependent**: Requires stable internet connection
4. **No Chat Feature**: Use external voice/video chat
5. **Game Length**: Best for games lasting 1-2 hours (longer games risk connection issues)

## 🐛 Troubleshooting

### "Failed to join game"
- Check the game code is correct
- Make sure host's game is still running
- Try refreshing both devices

### "Connection lost"
- Check internet connection
- Refresh the page (game state is saved in LocalStorage)
- If host disconnected, another player can claim host role

### Multiple players can't connect
- Try refreshing the host's page and restarting
- Check if network/firewall is blocking WebRTC
- Try from different network

## 🔒 Privacy & Security

- **No Data Collection**: Everything runs locally in browsers
- **Peer-to-Peer Only**: No central server stores data
- **Temporary Game Codes**: Codes are random and temporary
- **No Account Required**: No signup or personal info needed

## 📄 License

This project is for educational and personal use. Based on The Traitors TV show concept.

## 🙏 Credits

- Game concept inspired by "The Traitors" TV show
- Built with PeerJS for WebRTC connectivity
- Assets and visual design custom for this implementation

---

## 🎮 Quick Start

1. Host opens the app and creates a game
2. Host shares the 4-digit code
3. Players join using the code
4. Host starts the game
5. Everyone sees their secret role
6. Play the game using deliberations and traitor murders
7. First team to meet win conditions wins!

**Have fun and trust no one!** 🕵️‍♂️

---

*For issues or questions, please open a GitHub issue.*
