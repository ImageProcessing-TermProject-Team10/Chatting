
// WebSocket 연결
//const socket = new WebSocket('ws://' + window.location.host);
//https 연결일 때 wss 사용
const socket = new WebSocket('wss://' + window.location.host);

const chatContainer = document.getElementById('chat-container');
const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');
const sendButton = document.getElementById('send-button');

// Entering
const enter_container = document.getElementById('enter-container');
const name_input = document.getElementById('name-input');
const name_button = document.getElementById('name-button');

name_button.addEventListener('click', () => {
    console.log('click btn. value :', name_input.value);
    name_button.disabled = true;

    if (name_input.value !== '') {
        const my_name = name_input.value;
        const message = {
            type: 'enter request',
            content: my_name
        };
        name_input.value = null;
        socket.send(JSON.stringify(message));
    }
    // 1초 후 버튼을 다시 활성화
    setTimeout(() => {
        name_button.disabled = false;
    }, 1000);
})

// 서버로부터 메시지 수신
socket.onmessage = async (event) => {
    const raw = await event.data;
    const data = JSON.parse(raw);

    if (data.type === 'chat') {
        console.log('chat received', data);
        createBubble(data.userName, data.content);
    } else if (data.type === 'accept') {
        chatContainer.style.display = 'flex';
        enter_container.style.display = 'none';
        sessionStorage.setItem('userName', data.content);
    } else if (data.type === 'deny') {
        alert('The name already exists.\n Please try a different name.');
    } else if (data.type === 'start count') {
        createNotice('Start!');
        startCount(data.content);
    } else if (data.type === 'lock') {
        createNotice('time\'s up');
    } else if (data.type === 'ans') {
        createNotice(`The answer was ${data.content}!`);
    } else if (data.type === 'update') {
        console.log(data.content);
        updateScore(data.content);
    } else if (data.type === 'enter') {
        createNotice(`${data.newUser} has entered`);
        updateScore(data.content);   
    }
};

// 채팅 보내기
sendButton.addEventListener('click', () => {
    sendButton.disabled = true;
    if (input.value.trim()) {
        const message = JSON.stringify({ type: 'chat', userName: sessionStorage.getItem('userName'), content: input.value });
        input.value = null;
        socket.send(message);
    }
    setTimeout(() => {
        sendButton.disabled = false;
    }, 1000);
});

// 채팅 방울 생성
const createBubble = (userName, content) => {
    const box = document.createElement('div');
    box.style.display = 'flex';
    box.style.flexDirection = 'row';
    box.style.marginBottom = '8px';

    if (userName === sessionStorage.getItem('userName')) {
        const msg = document.createElement('div');
        msg.id = 'my-msg';
        msg.textContent = content;
        box.appendChild(msg);
    } else {
        const name = document.createElement('div');
        name.id = 'chat-name';
        name.textContent = userName;
        const color = generateColorFromString(userName);
        const complementaryColor = getComplementaryColor(color);
        name.style.backgroundColor = color;
        name.style.color = complementaryColor
        box.appendChild(name);

        const msg = document.createElement('div');
        msg.id = 'chat-msg';
        msg.textContent = content;
        msg.style.backgroundColor = color;
        msg.style.color = complementaryColor;
        box.appendChild(msg);
    }
    messagesDiv.appendChild(box);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

const createNotice = (content) => {
    const box = document.createElement('div');
    box.style.display = 'flex';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'center';
    box.style.marginBottom = '8px';

    const msg = document.createElement('div');
    msg.id = 'notice';
    msg.textContent = content;
    box.appendChild(msg);

    messagesDiv.appendChild(box);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function startCount(time) {
    const bar = document.getElementById('time-bar');
    const text = document.getElementById('time-text');

    let remainingTime = time; // Total time in seconds

    // Initialize bar and text
    bar.style.width = '100%';
    text.textContent = `${remainingTime}s`;

    const interval = setInterval(() => {
        remainingTime -= 1;

        if (remainingTime < 0) {
            clearInterval(interval);
            bar.style.width = '0%';
            text.textContent = '0s';
        } else {
            const percentage = (remainingTime / time) * 100;
            bar.style.width = `${percentage}%`;
            text.textContent = `${remainingTime}s`;
        }
    }, 1000);
}

function updateScore(userData) {
    const scoreContent = document.getElementById('score-content');
    scoreContent.innerHTML = '';

    const filterd = userData.filter(item => item.userName !== 'admin');
    const sorted = filterd.sort((a, b) => b.score - a.score);
    sorted.forEach((element, index) => {
        const box = document.createElement('div');
        box.className = 'score-box';

        const rank = document.createElement('div');
        const name = document.createElement('div');
        const score = document.createElement('div');
        rank.style.width = '100px'
        name.style.width = '100px'
        const color = generateColorFromString(element.userName);
        name.style.backgroundColor = color;
        name.style.color = getComplementaryColor(color);
        score.style.width = '100px'
        rank.innerText = index + 1;
        name.innerText = element.userName;
        score.innerText = element.score;

        box.appendChild(rank);
        box.appendChild(name);
        box.appendChild(score);

        scoreContent.appendChild(box);
    });

    const count = document.getElementById('man-count');
    count.innerText = sorted.length;
}

//MODAL
const modal = document.getElementById('myModal');
const openModalBtn = document.getElementById('score-board');
const closeModalBtn = document.getElementById('closeModalBtn');

openModalBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
});

closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

function generateColorFromString(inputString) {
    // 입력 문자열을 기반으로 색상 코드를 생성합니다.
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
        hash = inputString.charCodeAt(i) + ((hash << 5) - hash);
    }
    // 해시 값을 0~16777215 (0xFFFFFF) 범위로 변환합니다.
    const color = Math.abs(hash % 0xFFFFFF);
    // 색상 코드를 6자리 16진수 문자열로 포맷팅합니다.
    return `#${color.toString(16).padStart(6, '0')}`;
}

function getComplementaryColor(color) {
    // 색상의 보색을 계산합니다.
    // 입력 색상이 #RRGGBB 형식인지 확인
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error("Invalid color format. Use #RRGGBB format.");
    }
    // 16진수 값을 반전시켜 보색을 계산합니다.
    const r = 255 - parseInt(color.slice(1, 3), 16);
    const g = 255 - parseInt(color.slice(3, 5), 16);
    const b = 255 - parseInt(color.slice(5, 7), 16);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}