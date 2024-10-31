const express = require('express');
const { createServer } = require('node:http');
const { join } = require('path');
const { Server } = require('socket.io');
const crypto = require('crypto'); // Для генерации случайных идентификаторов
const CONSTRAINTS = require('./config.js'); // Импортируем настройки

const app = express();
const server = createServer(app);
const io = new Server(server);

// Используем папку public для статических файлов
app.use(express.static(join(__dirname, 'public')));

// Получение ограничений через API
app.get('/api/constraints', (req, res) => {
    res.json(CONSTRAINTS);
});

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

// Слушаем события подключения
io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    // Создание комнаты и подключение пользователя
    socket.on('createRoom', () => {
        const roomId = crypto.randomUUID();
        lobby[roomId] = {
            game: Array.from({ length: CONSTRAINTS.BOARD_SIZE }, () => Array(CONSTRAINTS.BOARD_SIZE).fill('_')),
            players: [],
            currentTurn: 0 // Изначально первый игрок
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    // Подключение к существующей комнате с именем
    socket.on('joinRoom', ({ roomId, username }) => {
        if (!lobby[roomId]) {
            socket.emit('error', 'Комната не существует');
            return;
        }

        const existingPlayer = lobby[roomId].players.find(player => player.username === username);

        if (existingPlayer) {
            existingPlayer.id = socket.id;
            existingPlayer.isConnected = true; // Восстанавливаем статус подключения
            socket.join(roomId);
            socket.emit('roomJoined', { roomId, player: existingPlayer });
        } else {
            const playerNumber = lobby[roomId].players.length;
            if (playerNumber >= 3) {
                socket.emit('error', 'Комната уже заполнена');
                return;
            }

            const newPlayer = { id: socket.id, username, number: playerNumber, isConnected: true };
            lobby[roomId].players.push(newPlayer);
            socket.join(roomId);
            socket.emit('roomJoined', { roomId, player: newPlayer });
            io.to(roomId).emit('message', `${username} присоединился к комнате`);
        }

        // Отправляем обновленный список игроков всем в комнате
        io.to(roomId).emit('updatePlayers', lobby[roomId].players);
        io.to(roomId).emit('updateCurrentTurn', lobby[roomId].currentTurn);
        socket.emit('updateBoard', lobby[roomId].game);
    });

    // Обработка хода
    socket.on('makeMove', ({ roomId, row, col }) => {
        const room = lobby[roomId];
        if (!room) {
            socket.emit('error', 'Комната не существует');
            return;
        }

        const game = room.game;
        if (game[row][col] === '_') {
            const currentTurn = room.currentTurn;
            const playerNumber = room.players.find(player => player.id === socket.id)?.number;

            if (currentTurn !== playerNumber) {
                socket.emit('error', 'Это не ваш ход');
                return;
            }

            const symbol = CONSTRAINTS.PLAYER_PAWNS[currentTurn];
            game[row][col] = symbol; // Обновляем состояние игры

            io.to(roomId).emit('updateBoard', game); // Отправляем обновлённое состояние доски всем игрокам

            // Проверка на победу
            if (checkWin(game, row, col)) {
                io.to(roomId).emit('gameOver', currentTurn);
            } else {
                room.currentTurn = (currentTurn + 1) % CONSTRAINTS.MAX_PLAYERS; // Переход к следующему игроку
                io.to(roomId).emit('updateCurrentTurn', room.currentTurn);
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

        let count = 1;

        // Проверяем в положительном направлении
        for (let i = 1; i < CONSTRAINTS.LINE_LENGTH_TO_WIN; i++) {
            const r = row + i * rowDir;
            const c = col + i * colDir;
            if (r < 0 || r >= CONSTRAINTS.BOARD_SIZE || c < 0 || c >= CONSTRAINTS.BOARD_SIZE || board[r][c] !== symbol) {
                break;
            }
            count++;
        }

        // Проверяем в отрицательном направлении
        for (let i = 1; i < CONSTRAINTS.LINE_LENGTH_TO_WIN; i++) {
            const r = row - i * rowDir;
            const c = col - i * colDir;
            if (r < 0 || r >= CONSTRAINTS.BOARD_SIZE || c < 0 || c >= CONSTRAINTS.BOARD_SIZE || board[r][c] !== symbol) {
                break;
            }
            count++;
        }

        return count >= CONSTRAINTS.LINE_LENGTH_TO_WIN;
    }

    // Обработка отключения
    socket.on('disconnect', () => {
        for (const roomId in lobby) {
            const room = lobby[roomId];
            const player = room.players.find(player => player.id === socket.id);

            if (player) {
                player.isConnected = false; // Помечаем игрока как отключенного
                io.to(roomId).emit('message', `${player.username} покинул комнату`);
                io.to(roomId).emit('updatePlayers', room.players);
                break;
            }
        }
    });
});

// Запуск сервера
server.listen(6273, () => {
    console.log('Сервер запущен на http://localhost:6273');
});
