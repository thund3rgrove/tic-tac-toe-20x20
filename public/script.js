let board = document.getElementById('board');
let currentPlayerLabel = document.getElementById('currentPlayerLabel');
let currentPlayerTitle = document.getElementById('currentPlayerTitle');
let resetButton = document.getElementById('resetButton');

resetButton.addEventListener('click', resetBoard);

let lockBoard = false;
let currentTurn = 0;
let possibleElements = {
    0: 'X',
    1: 'Y',
    2: 'Z'
};

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

// Обновление отображения текущего игрока
function updateCurrentPlayer() {
    currentPlayerLabel.innerHTML = possibleElements[currentTurn % 3];
}

// Проверка победы
function checkDirection(row, col, rowDir, colDir) {
    const symbol = board.rows[row].cells[col].innerHTML;
    if (symbol === '_') return false;

    for (let offset = -3; offset <= 0; offset++) {
        let match = true;
        for (let i = 0; i < 4; i++) {
            let r = row + (offset + i) * rowDir;
            let c = col + (offset + i) * colDir;
            if (r < 0 || r >= 20 || c < 0 || c >= 20 || board.rows[r].cells[c].innerHTML !== symbol) {
                match = false;
                break;
            }
        }
        if (match) return true;
    }
    return false;
}

function checkWin(row, col) {
    return (
        checkDirection(row, col, 0, 1) ||   // горизонталь
        checkDirection(row, col, 1, 0) ||   // вертикаль
        checkDirection(row, col, 1, 1) ||   // диагональ слева направо
        checkDirection(row, col, 1, -1)     // диагональ справа налево
    );
}

// Обработчик кликов
function cellClickHandler(event) {
    if (lockBoard) return; // Игра окончена
    let curr_cell = event.target;
    if (curr_cell.innerHTML !== '_') return;

    let row = parseInt(curr_cell.getAttribute('_row'));
    let col = parseInt(curr_cell.getAttribute('_col'));

    curr_cell.innerHTML = possibleElements[currentTurn % 3];
    
    if (checkWin(row, col)) {
        currentPlayerTitle.innerHTML = "Победа игрока";
        currentPlayerLabel.innerHTML = curr_cell.innerHTML;
        lockBoard = true;
    } else {
        currentTurn += 1;
        updateCurrentPlayer();
    }
}

// Сброс доски
function resetBoard() {
    document.querySelectorAll('td').forEach(cell => (cell.innerHTML = '_'));
    currentTurn = 0;
    lockBoard = false;
    currentPlayerTitle.innerHTML = "Ход игрока";
    updateCurrentPlayer();
}

// Начальная настройка
initBoard();
updateCurrentPlayer();
