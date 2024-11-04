const socket = io();
const maxPlayersInput = document.getElementById('maxPlayers');
const lineLengthToWinInput = document.getElementById('lineLengthToWin');
const boardSizeInput = document.getElementById('boardSize');
const playerPawnsInput = document.getElementById('playerPawns');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const startGameButton = document.getElementById('startGameButton');
const playerList = document.getElementById('playerList');

const roomId = window.location.pathname.split('/').pop();

saveSettingsButton.addEventListener('click', () => {
    const settings = {
        maxPlayers: parseInt(maxPlayersInput.value),
        lineLengthToWin: parseInt(lineLengthToWinInput.value),
        boardSize: parseInt(boardSizeInput.value),
        playerPawns: playerPawnsInput.value.split(',')
    };
    socket.emit('updateLobbySettings', { roomId, settings });
});

startGameButton.addEventListener('click', () => {
    socket.emit('startGame', { roomId });
});

socket.on('playerJoined', (players) => {
    playerList.innerHTML = '';
    players.forEach(player => {
        const playerItem = document.createElement('li');
        playerItem.textContent = `Player ${player.number + 1}: ${player.username}`;
        playerList.appendChild(playerItem);
    });
});