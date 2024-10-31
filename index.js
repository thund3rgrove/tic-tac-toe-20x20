let board = document.getElementById('board');
let currentPlayerLabel = document.getElementById('currentPlayerLabel');
let currentPlayerTitle = document.getElementById('currentPlayerTitle');

let lockBoard = false;

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

let currentTurn = 0;
let possibleElements = {
    0: 'X',
    1: 'Y',
    2: 'Z'
};
currentPlayerLabel.innerHTML = possibleElements[currentTurn];

function checkWin(row, col) {
    const symbol = board.rows[row].cells[col].innerHTML;
    if (symbol === '_') return false;

    // Проверка по горизонтали (работаэ)
    for (let offset = -3; offset <= 0; offset++) {
        if (col + offset >= 0 && col + offset + 3 < 20 &&
            [...Array(4)].every((_, i) => board.rows[row].cells[col + offset + i].innerHTML === symbol)) {
            return true;
        }
    }

    // Проверка по вертикали (работаэ)
    for (let offset = -3; offset <= 0; offset++) {
        if (row + offset >= 0 && row + offset + 3 < 20 &&
            [...Array(4)].every((_, i) => board.rows[row + offset + i].cells[col].innerHTML === symbol)) {
            return true;
        }
    }

    // Проверка по диагонали (слева направо вниз)
    for (let offset = -3; offset <= 0; offset++) {
        if (row + offset >= 0 && row + offset + 3 < 20 &&
            col + offset >= 0 && col + offset + 3 < 20 &&
            [...Array(4)].every((_, i) => board.rows[row + offset + i].cells[col + offset + i].innerHTML === symbol)) {
            return true;
        }
    }

    // Проверка по диагонали (справа налево вниз)
    for (let offset = -3; offset <= 0; offset++) {
        if (row + offset >= 0 && row + offset + 3 < 20 &&
            col - offset < 20 && col - offset - 3 >= 0 &&
            [...Array(4)].every((_, i) => board.rows[row + offset + i].cells[col - offset - i].innerHTML === symbol)) {
            return true;
        }
    }

    return false;
}


function cellClickHandler(event) {
    let curr_cell = event.target;
    if (curr_cell.innerHTML !== '_' || lockBoard) return;

    let row = parseInt(curr_cell.getAttribute('_row'));
    let col = parseInt(curr_cell.getAttribute('_col'));

    curr_cell.innerHTML = possibleElements[currentTurn % 3];
    currentTurn += 1;
    currentPlayerLabel.innerHTML = possibleElements[currentTurn % 3];

    if (checkWin(row, col)) {
        currentPlayerTitle.innerHTML = "Победа игрока";
        currentPlayerLabel.innerHTML = curr_cell.innerHTML;
        // resetBoard();
        lockBoard = true;
    }
}

function resetBoard() {
    document.querySelectorAll('td').forEach(cell => (cell.innerHTML = '_'));
    currentTurn = 0;
    currentPlayerLabel.innerHTML = possibleElements[currentTurn];
}
