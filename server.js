const express = require('express');
const { createServer } = require('node:http');
const { join } = require('path');
const { Server } = require('socket.io');
const crypto = require('crypto'); // Для генерации случайных идентификаторов

const app = express();
const server = createServer(app);
const io = new Server(server);

var fs = require('fs');

const CONFIGURATION = JSON.parse(fs.readFileSync('constraints.json', 'utf8'));

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
        const roomId = crypto.randomUUID();
        lobby[roomId] = {
            // game: Array.from({ length: 20 }, () => Array(20).fill('_')),
            game: Array.from({ length: CONFIGURATION.BOARD_SIZE }, () => Array(CONFIGURATION.BOARD_SIZE).fill('_')),
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
    
            // Создаем нового игрока с уникальным ID сокета
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
        console.log('handling some move')
        const room = lobby[roomId]

        if (!room) {
            socket.emit('error', 'Комната не существует');
            return;
        }

        const game = room.game; // Проверяем наличие игры в комнате

        // console.log(game)
        if (game && game[row][col] === '_') {
            console.log('clicked in empty spot')
            // const currentTurn = (game.flat().filter(cell => cell !== '_').length) % 2; // Определяем текущего игрока
            const currentTurn = room.currentTurn;
            
            const playerNumber = room.players.find(player => player.id === socket.id)?.number; // Получение индекса игрока
            if (currentTurn !== playerNumber) {
                socket.emit('error', 'Это не ваш ход');
                return;
            }

            const symbol = possibleElements[currentTurn];
            
            console.log('currently playing', currentTurn, symbol)

            game[row][col] = symbol; // Обновляем состояние игры

            io.to(roomId).emit('updateBoard', game); // Отправляем обновлённое состояние доски всем игрокам

            // Проверка на победу
            if (checkWin(game, row, col)) {
                io.to(roomId).emit('gameOver', currentTurn);
            } else {
                // room.currentTurn = (currentTurn + 1) % room.players.length; // Переходим к следующему игроку
                room.currentTurn = (currentTurn + 1) % CONFIGURATION.MAX_PLAYERS; // Переходим к следующему игроку
                io.to(roomId).emit('updateCurrentTurn', room.currentTurn);
            }
        }
    });

    function checkWin(board, row, col) {
        return (
            checkDirection(board, row, col, 0, 1, CONFIGURATION.LINE_LENGTH_TO_WIN) ||   // горизонталь
            checkDirection(board, row, col, 1, 0, CONFIGURATION.LINE_LENGTH_TO_WIN) ||   // вертикаль
            checkDirection(board, row, col, 1, 1, CONFIGURATION.LINE_LENGTH_TO_WIN) ||   // диагональ слева направо
            checkDirection(board, row, col, 1, -1, CONFIGURATION.LINE_LENGTH_TO_WIN)     // диагональ справа налево
        );
    }

    function checkDirection(board, row, col, rowDir, colDir, length) {
        const symbol = board[row][col];
        if (symbol === '_') return false;
    
        for (let offset = -length + 1; offset <= 0; offset++) {
            let match = true;
            for (let i = 0; i < length; i++) {
                let r = row + (offset + i) * rowDir;
                let c = col + (offset + i) * colDir;
                if (r < 0 || r >= CONFIGURATION.BOARD_SIZE || c < 0 || c >= CONFIGURATION.BOARD_SIZE || board[r][c] !== symbol) {
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
