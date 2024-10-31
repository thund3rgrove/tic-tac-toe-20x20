const board = document.getElementById('board');
const currentPlayerLabel = document.getElementById('currentPlayerLabel');
const currentPlayerTitle = document.getElementById('currentPlayerTitle');
const resetButton = document.getElementById('resetButton');
const playerList = document.getElementById('playerList');
const socket = io();

resetButton.addEventListener('click', resetBoard);

let lockBoard = false;
let possibleElements = ['X', 'Y', 'Z'];
const roomId = window.location.pathname.split('/').pop();
document.getElementById('roomIdLabel').innerText = roomId;

let playerNumber;

// Получаем данные о присоединении к комнате
socket.on('roomJoined', (data) => {
    playerNumber = data.playerNumber;
});

// Обновление списка игроков
socket.on('updatePlayers', (players) => {
    playerList.innerHTML = '';
    players
      .sort((a, b) => a.number - b.number)
      .forEach(player => {
          const playerItem = document.createElement('li');
          playerItem.textContent = `Игрок ${player.number + 1}: ${player.username}`;
          playerItem.dataset.playerId = player.playerId;
          playerList.appendChild(playerItem);
      });
});

// Получаем обновление доски от сервера
socket.on('updateBoard', (boardState) => {
    updateBoardUI(boardState);
});

socket.on('updateCurrentTurn', (currTurn) => {
    currentPlayerLabel.innerHTML = possibleElements[currTurn];
});

// Получаем сообщение об окончании игры
socket.on('gameOver', (winner) => {
    lockBoard = true;
    currentPlayerTitle.innerHTML = "Победа игрока";
    currentPlayerLabel.innerHTML = winner;
});

// Инициализация доски
function initBoard() {
    let grid = '';
    for (let i = 0; i < 20; i++) {
        grid += '<tr>';
        for (let j = 0; j < 20; j++) {
            grid += `<td _row="${i}" _col="${j}">_</td>`;
        }
        grid += '</tr>';
    }
    board.innerHTML = grid;
    document.querySelectorAll('td').forEach(el => {
        el.addEventListener('click', cellClickHandler);
    });
}

// Обновление доски в UI
function updateBoardUI(boardState) {
    boardState.forEach((row, i) => {
        row.forEach((cell, j) => {
            board.rows[i].cells[j].innerHTML = cell;
        });
    });
}

// Обработчик кликов
function cellClickHandler(event) {
    if (lockBoard) return;
    const currCell = event.target;
    const row = parseInt(currCell.getAttribute('_row'));
    const col = parseInt(currCell.getAttribute('_col'));

    if (currCell.innerHTML === '_') {
        socket.emit('makeMove', { roomId, row, col });
    }
}

// Сброс доски
function resetBoard() {
    socket.emit('resetGame', roomId);
}

// Начальная настройка
initBoard();
