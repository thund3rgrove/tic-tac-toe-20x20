let board = document.getElementById('board');
let currentPlayerLabel = document.getElementById('currentPlayerLabel');
let currentPlayerTitle = document.getElementById('currentPlayerTitle');
let resetButton = document.getElementById('resetButton');

resetButton.addEventListener('click', resetBoard);

let lockBoard = false;
let possibleElements = ['X', 'Y', 'Z']; // Изменено на массив
// let currentTurn = 0; // Добавлено для отслеживания текущего хода

// Создание нового соединения с сервером
const socket = io();

// Получаем roomId из URL
const roomId = window.location.pathname.split('/').pop();

document.getElementById('roomIdLabel').innerText = roomId;
// currentPlayerLabel.innerHTML = possibleElements[0];

const playerList = document.getElementById('playerList');
const usernameInput = document.getElementById('usernameInput');
let playerNumber;

socket.on('roomJoined', (data) => {
    playerNumber = data.playerNumber;
    updateCurrentPlayer();
});

// Обновление списка игроков
socket.on('updatePlayers', (players) => {
    console.log(players);
    playerList.innerHTML = ''; // Очищаем список
    players
      .sort((a, b) => a.number - b.number) // Сортируем игроков по номеру
      .forEach(player => {
          const playerItem = document.createElement('li');
          playerItem.textContent = `Игрок ${player.number + 1}: ${player.username}`;
          playerItem.dataset.playerId = player.playerId;
          playerList.appendChild(playerItem);
      });
});

// Получаем обновление доски от сервера
socket.on('updateBoard', (boardState) => {
    console.log('need to update the board')
    updateBoardUI(boardState);
    // updateCurrentPlayer(boardState); // Обновляем текущего игрока после обновления доски
    // currentPlayerLabel.innerHTML = boardState.currentTurn;
});

socket.on('updateCurrentTurn', (currTurn) => {
    currentPlayerLabel.innerHTML = possibleElements[currTurn];
})

// Получаем сообщение об окончании игры
socket.on('gameOver', (winner) => {
    // currentPlayerTitle.innerHTML = "Победа игрока " + winner;
    console.log('winner', winner)
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
            // console.log('row', row)
            // console.log('cell', cell)
            board.rows[i].cells[j].innerHTML = cell;
        });
    });
}

// Обновление отображения текущего игрока
/* function updateCurrentPlayer(game) {
    let currentTurn = (game.flat().filter(cell => cell !== '_').length) % 2;
    if (!lockBoard) {
        currentPlayerLabel.innerHTML = possibleElements[currentTurn]; // Обновляем текущего игрока
    }
} */

// Обработчик кликов
function cellClickHandler(event) {
    if (lockBoard) return; // Игра окончена
    let curr_cell = event.target;
    let row = parseInt(curr_cell.getAttribute('_row'));
    let col = parseInt(curr_cell.getAttribute('_col'));

    if (curr_cell.innerHTML === '_') {
        socket.emit('makeMove', { roomId, row, col }); // Отправляем ход на сервер
    }
}

// Сброс доски
function resetBoard() {
    // Отправляем сообщение на сервер для сброса состояния, если требуется
    socket.emit('resetGame', roomId); // Для сброса игры
}

// Начальная настройка
initBoard();
// updateCurrentPlayer(Array.from({ length: 20 }, () => Array(20).fill('_')));
