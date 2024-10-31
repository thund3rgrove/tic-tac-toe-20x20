const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views');

const lobbies = {}; // хранилище для лобби с играми

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/lobby/:lobbyId', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'lobby.html'));
});

app.get('/game/:lobbyId', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'game.html'));
});

io.on('connection', (socket) => {
    
});


function checkWin(board, row, col, symbol) {
    const directions = [
        { rowDir: 0, colDir: 1 },
        { rowDir: 1, colDir: 0 },
        { rowDir: 1, colDir: 1 },
        { rowDir: 1, colDir: -1 },
    ];

    for (const { rowDir, colDir } of directions) {
        let count = 1;
        for (let offset = -3; offset <= 3; offset++) {
            if (offset === 0) continue;
            const r = row + offset * rowDir;
            const c = col + offset * colDir;
            if (r >= 0 && r < 20 && c >= 0 && c < 20 && board[r][c] === symbol) {
                count++;
                if (count === 4) return true;
            } else {
                count = 1;
            }
        }
    }
    return false;
}

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
