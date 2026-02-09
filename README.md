# SPY BOT - Traitors Game Web App

A web-based version of the Traitors game (inspired by the TV show "The Traitors") where players are secretly assigned as either Agents or Traitors.

## About the Game

SPY BOT is a social deduction game where:
- Players are randomly assigned roles as either **Agents** (good guys) or **Traitors** (bad guys)
- Agents must work together to identify and eliminate the Traitors
- Traitors must remain hidden while sabotaging the Agents
- The game ends when all Traitors are eliminated (Agents win) or when Traitors equal or outnumber Agents (Traitors win)

## How to Play

1. **Open the Game**: Open `index.html` in a web browser
2. **Start a New Game**: The game host clicks "Play" then "Create Game"
   - The host enters their name
   - The host is notified when new players join the game
   - The host screen shows a list of all players in the game
3. **Configure Settings**:
   - Choose number of players (3-20)
   - Choose number of traitors (1-9) - must be < half of the players
   - This creates a 4 digit code that other players can use to 'join' the game.
4. **Join an Existing Game**:
   - Other players click "Play" then "Join Game"
   - Type in name
   - Type in the 4 digit code provided by the host.
   - Click "Join"
   - The 'others' see a list of all the players in the game
   - The list of players is updated as new players join the game
5. **Role Assignment**:
   - Pass the device around to each player
   - Each player clicks "Tap to Reveal" to see their secret role
   - Click "Next Player" after viewing your role
6. **Play the Game**:
   - Discuss among players who might be the traitors
   - Use "Team Meeting" to call discussions
   - Use "Exposed" to officially accuse and eliminate a player
   - Click on player icons to mark them as eliminated
7. **Win Conditions**:
   - **Agents win** if all Traitors are eliminated
   - **Traitors win** if they equal or outnumber the Agents

## Game Features

- **Secret Role Assignment**: Each player privately sees their role
- **Player Tracking**: Visual indicators for each player
- **Sound Effects**: Immersive audio including background music and action sounds
- **Team Meetings**: Call discussions to debate who the traitors might be
- **Expose Mechanic**: Officially accuse and eliminate suspected traitors
- **Game Over Screen**: Shows final results and reveals all roles

## Files Included

- `index.html` - Main HTML structure
- `styles.css` - All styling and visual design
- `script.js` - Game logic and interactivity
- `assets/` - All game images and sound files
  - Player icons (numbered 1-5 in green/red)
  - Logos and backgrounds
  - Button images
  - Sound effects and music

## Technical Details

- Pure HTML5, CSS3, and JavaScript (no frameworks required)
- Responsive design works on desktop and mobile devices
- Local storage not required (everything runs in browser)
- Audio elements for sound effects and background music

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Installation

No installation required! Simply:
1. Extract all files to a folder
2. Make sure the `assets` folder is in the same directory as `index.html`
3. Open `index.html` in your web browser
4. Start playing!

## Tips for Best Experience

- Use headphones for the best audio experience
- Play on a tablet for easier passing between players during role reveals
- Make sure all players can't see the screen when others are revealing their roles
- The game is most fun with 4-5 players

## Credits

Converted from the original Android APK to a web application.
All original assets and concept belong to the original creator.

## License

This is a conversion project for personal/educational use.

---

Enjoy playing SPY BOT - Traitors Game!
