let board = document.getElementById('board');
let currentPlayerLabel = document.getElementById('currentPlayerLabel');

grid = ''

for (let i = 0; i < 20; i++) {
    grid += '<tr>'

    for (let j = 0; j < 20; j++) {
        grid += `<td _row="${i}" _col="${j}">_</td>`
    }

    grid += '</tr>'
}

board.innerHTML = grid

document.querySelectorAll('td').forEach(el => {
    el.addEventListener('click', cellClickHandler)
})

let currentTurn = 0;

possibleElements = {
    0: 'X',
    1: 'Y',
    2: 'Z'
}

currentPlayerLabel.innerHTML = possibleElements[currentTurn]

function cellClickHandler(event) {
    let curr_cell = event.target;

    if (curr_cell.innerHTML != '_') return;

    curr_cell.innerHTML = possibleElements[currentTurn % 3]

    currentTurn += 1

    currentPlayerLabel.innerHTML = possibleElements[currentTurn % 3]
}