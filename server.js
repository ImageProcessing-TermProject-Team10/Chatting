const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer((req, res) => {
    const filePath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(__dirname, 'public', filePath);

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
        } else {
            const ext = path.extname(fullPath);
            const contentType =
                ext === '.html'
                    ? 'text/html'
                    : ext === '.css'
                    ? 'text/css'
                    : ext === '.js'
                    ? 'application/javascript'
                    : 'text/plain';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

var chatState = 'free';
const userData = [];

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('클라이언트가 연결되었습니다.');
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.userName === 'admin') {
            if (data.content === 'start') {
                startGame();
            } else {
                showAnswer(data.content);
            }
        } else if (data.type === 'enter request') {
            const result = enrollNewUser(data.content);
            console.log('user data:', userData);
            if (result) {
                ws.send(JSON.stringify({type: 'accept', content: data.content}));
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({type: 'enter', newUser: data.content, content: userData}));
                    }
                });
            } else {
                ws.send(JSON.stringify({type: 'deny', content: data.content}));
            }    
        } else if (data.type === 'chat') {
            if (chatState === 'free') {
                //send message to all users
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            } else if (chatState === 'game') {
                for(var i=0; i<userData.length; i++) {
                    if ( userData[i].userName === data.userName ){ break; }
                }
                if(userData[i].ansChance > 0){
                    userData[i].ansChance -= 1;
                    userData[i].ansTime = new Date().getTime();
                    userData[i].ans = data.content;
                    //send message to all users
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(data));
                        }
                    });
                }
            }
        }
    });

    ws.on('close', () => {
        console.log('클라이언트 연결 종료');
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`서버가 실행 중입니다. http://localhost:${PORT}`);
});

const enrollNewUser = (userName) => {
    for (var i=0; i<userData.length; i++) {
        if(userData[i].userName === userName ) {
            return false;
        }
    }
    userData.push({
        userName : userName,
        score : 0,
        ansChance : 2,
        ansTime : null,
        ans : null,
    })
    return true;
}

var startTime;
const gameTime = 30;
const startGame = () => {
    chatState = 'game';
    //send message to all users
    const data={type:'start count', content: gameTime};
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });

    //init Game
    userData.forEach((user) => {
        user.ansChance = 2;
        user.ansTime = null;
        user.ans = null;
    })
    startTime = new Date().getTime();
    setTimeout(() => {
        chatState = 'lock';
        const data={type:'lock'};
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
        console.log(userData);
    }, gameTime * 1000);    
}

function showAnswer(ans) {
    const data={type:'ans', content:ans};
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });

    //calc score
    userData.forEach((user) => {
        if (user.ans !== null) {
            if( user.ans.toLowerCase() === ans.toLowerCase()) {
                user.score += (gameTime * 1000 + (startTime - user.ansTime)) / 1000;
                user.score 
            }
        }
    });

    //send user data
    const update={type:'update', content: userData}
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(update));
        }
    });
    console.log(userData);
}