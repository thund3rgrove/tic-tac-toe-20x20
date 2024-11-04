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

app.get('/lobby/:lobbyId', (req, res) => {
    res.sendFile(join(__dirname, 'views', 'lobby.html'));
});

// Страница комнаты
app.get('/room/:roomId', (req, res) => {
    res.sendFile(join(__dirname, 'views', 'room.html'));
});

// Лобби для хранения комнат и состояния игры
const lobbies = {};

// Слушаем события подключения
io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    // Создание комнаты и подключение пользователя
    socket.on('createRoom', () => {
        const roomId = crypto.randomUUID();
        lobbies[roomId] = {
            game: Array.from({ length: CONSTRAINTS.BOARD_SIZE }, () => Array(CONSTRAINTS.BOARD_SIZE).fill('_')),
            settings: {
                maxPlayers: CONSTRAINTS.MAX_PLAYERS,
                lineLengthToWin: CONSTRAINTS.LINE_LENGTH_TO_WIN,
                boardSize: CONSTRAINTS.BOARD_SIZE,
                playerPawns: CONSTRAINTS.PLAYER_PAWNS
            },
            players: [],
            currentTurn: 0 // Изначально первый игрок
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    // joinLobby
    // нужно добавлять проверку, если человек присоединяется в лобби, в котором уже началась игра, то мы делаем проверку
    // если он существовал в лобби до выхода, то мы подсоединяем его в room
    // если нет, то пишем, что игра уже началась
    
    

    // Подключение к существующей комнате с именем
    socket.on('joinRoom', ({ roomId, username }) => {
        if (!lobbies[roomId]) {
            socket.emit('error', 'Комната не существует');
            return;
        }

        const existingPlayer = lobbies[roomId].players.find(player => player.username === username);

        if (existingPlayer) {
            existingPlayer.id = socket.id;
            existingPlayer.isConnected = true; // Восстанавливаем статус подключения
            socket.join(roomId);
            socket.emit('roomJoined', { roomId, player: existingPlayer });
        } else {
            const playerNumber = lobbies[roomId].players.length;
            if (playerNumber >= 3) {
                socket.emit('error', 'Комната уже заполнена');
                return;
            }

            const newPlayer = { id: socket.id, username, number: playerNumber, isConnected: true };
            lobbies[roomId].players.push(newPlayer);
            socket.join(roomId);
            socket.emit('roomJoined', { roomId, player: newPlayer });
            io.to(roomId).emit('message', `${username} присоединился к комнате`);
        }

        // Отправляем обновленный список игроков всем в комнате
        io.to(roomId).emit('updatePlayers', lobbies[roomId].players);
        io.to(roomId).emit('updateCurrentTurn', lobbies[roomId].currentTurn);
        socket.emit('updateBoard', lobbies[roomId].game);
    });

    // Обработка лобби
    socket.on('updateLobbySettings', ({ roomId, settings }) => {
        console.log('new settings for room', roomId)
        console.log(settings)
    })

    // Обработка хода
    socket.on('makeMove', ({ roomId, row, col }) => {
        const room = lobbies[roomId];
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

            const symbol = room.settings.playerPawns[currentTurn];
            game[row][col] = symbol; // Обновляем состояние игры

            io.to(roomId).emit('updateBoard', game); // Отправляем обновлённое состояние доски всем игрокам

            // Проверка на победу
            if (checkWin(game, row, col, room.settings)) {
                io.to(roomId).emit('gameOver', currentTurn);
            } else {
                room.currentTurn = (currentTurn + 1) % room.settings.maxPlayers; // Переход к следующему игроку
                io.to(roomId).emit('updateCurrentTurn', room.currentTurn);
            }
        }
    });

    function checkWin(board, row, col, roomSettings) {
        return (
            checkDirection(board, row, col, 0, 1, roomSettings) ||   // горизонталь
            checkDirection(board, row, col, 1, 0, roomSettings) ||   // вертикаль
            checkDirection(board, row, col, 1, 1, roomSettings) ||   // диагональ слева направо
            checkDirection(board, row, col, 1, -1, roomSettings)     // диагональ справа налево
        );
    }

    function checkDirection(board, row, col, rowDir, colDir, roomSettings) {
        const symbol = board[row][col];
        if (symbol === '_') return false;

        let count = 1;

        // Проверяем в положительном направлении
        for (let i = 1; i < roomSettings.lineLengthToWin; i++) {
            const r = row + i * rowDir;
            const c = col + i * colDir;
            if (r < 0 || r >= roomSettings.boardSize || c < 0 || c >= roomSettings.boardSize || board[r][c] !== symbol) {
                break;
            }
            count++;
        }

        // Проверяем в отрицательном направлении
        for (let i = 1; i < roomSettings.lineLengthToWin; i++) {
            const r = row - i * rowDir;
            const c = col - i * colDir;
            if (r < 0 || r >= roomSettings.boardSize || c < 0 || c >= roomSettings.boardSize || board[r][c] !== symbol) {
                break;
            }
            count++;
        }

        return count >= roomSettings.lineLengthToWin;
    }

    // Обработка отключения
    socket.on('disconnect', () => {
        for (const roomId in lobbies) {
            const room = lobbies[roomId];
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
