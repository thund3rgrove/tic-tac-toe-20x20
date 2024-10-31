const express = require('express');
const { createServer } = require('node:http');
const { join } = require('path');
const { Server } = require('socket.io');
const crypto = require('crypto'); // Для генерации случайных идентификаторов

const app = express();
const server = createServer(app);
const io = new Server(server);

// Используем папку public для статических файлов
app.use(express.static(join(__dirname, 'public')));

// Главная страница с созданием комнаты
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'views', 'index.html'));
});

// Страница комнаты
app.get('/room/:roomId', (req, res) => {
    res.sendFile(join(__dirname, 'views', 'room.html'));
});

// Лобби для хранения комнат и состояния игры
const lobby = {};
const possibleElements = ['X', 'Y', 'Z'];

// Слушаем события подключения
io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    // Создание комнаты и подключение пользователя
    socket.on('createRoom', () => {
        const roomId = crypto.randomUUID(); // Генерируем ID комнаты
        lobby[roomId] = {
            game: Array.from({ length: 20 }, () => Array(20).fill('_')), // Инициализация состояния игры
            players: [] // Здесь можно хранить информацию о игроках
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId); // Отправляем клиенту ID комнаты
    });

    // Подключение к существующей комнате
    socket.on('joinRoom', (roomId) => {
        if (lobby[roomId]) { // Проверяем, существует ли комната
            socket.join(roomId);
            socket.emit('roomJoined', roomId);

            // Отправляем состояние доски новому игроку
            socket.emit('updateBoard', lobby[roomId].game);

            io.to(roomId).emit('message', `Новый игрок присоединился к комнате ${roomId}`);
        } else {
            socket.emit('error', 'Комната не существует');
        }
    });

    // Обработка хода
    socket.on('makeMove', ({ roomId, row, col }) => {
        console.log('handling some move')
        const game = lobby[roomId]?.game; // Проверяем наличие игры в комнате
        // console.log(game)
        if (game && game[row][col] === '_') {
            console.log('clicked in empty spot')
            const currentTurn = (game.flat().filter(cell => cell !== '_').length) % 3; // Определяем текущего игрока
            const symbol = possibleElements[currentTurn];

            console.log('currently playing', currentTurn, symbol)

            game[row][col] = symbol; // Обновляем состояние игры
            console.log(game);
            io.to(roomId).emit('updateBoard', game); // Отправляем обновлённое состояние доски всем игрокам

            // Проверка на победу
            if (checkWin(game, row, col)) {
                io.to(roomId).emit('gameOver', symbol);
            }
        }
    });

    function checkWin(board, row, col) {
        return (
            checkDirection(board, row, col, 0, 1) ||   // горизонталь
            checkDirection(board, row, col, 1, 0) ||   // вертикаль
            checkDirection(board, row, col, 1, 1) ||   // диагональ слева направо
            checkDirection(board, row, col, 1, -1)     // диагональ справа налево
        );
    }

    function checkDirection(board, row, col, rowDir, colDir) {
        const symbol = board[row][col];
        if (symbol === '_') return false;

        for (let offset = -3; offset <= 0; offset++) {
            let match = true;
            for (let i = 0; i < 4; i++) {
                let r = row + (offset + i) * rowDir;
                let c = col + (offset + i) * colDir;
                if (r < 0 || r >= 20 || c < 0 || c >= 20 || board[r][c] !== symbol) {
                    match = false;
                    break;
                }
            }
            if (match) return true;
        }
        return false;
    }


    // Обработка отключения
    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});



// Запуск сервера
server.listen(6273, () => {
    console.log('Сервер запущен на http://localhost:6273');
});
