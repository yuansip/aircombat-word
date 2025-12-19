// 游戏配置
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 20;
const PLAYER_HEIGHT = 50;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;
const INITIAL_LIVES = 1; // 初始生命值
const MISSILE_WIDTH = 10;
const MISSILE_HEIGHT = 20;
const BOMB_WIDTH = 16;
const BOMB_HEIGHT = 28;
const CONSECUTIVE_HITS_FOR_MISSILE = 5; // 连续命中次数获得导弹
const CONSECUTIVE_MISSLE_FOR_BOMB = 2; // 导弹数获得炸弹
const TARGET_COUNT = 3; // 同时下落的单词数量
const SHOW_WORD = true;
let SPELL_MODE = true; // 可通过UI切换

// 可调整的速度设置
let WORD_SPEED = 1;
let PLAYER_SPEED = 20;

// 星空背景配置
const STAR_COUNT = 60; // 星星数量
const STAR_MIN_SIZE = 1; // 最小星星大小
const STAR_MAX_SIZE = 3; // 最大星星大小
const STAR_TWINKLE_SPEED = 0.05; // 闪烁速度

// 音效资源
const shootSound = new Audio('bullet.mp3');
const blastSound = new Audio('blast.mp3');
const loseSound = new Audio('lose.mp3');
const missileSound = new Audio('missile.mp3');
const bombSound = new Audio('bomb.mp3');
shootSound.volume = 0.2; // 设置音量为20%
blastSound.volume = 0.2; // 设置爆炸音效音量
loseSound.volume = 0.4; // 设置失败音效音量
missileSound.volume = 0.3; // 设置导弹音效音量
bombSound.volume = 0.5; // 设置炸弹音效音量

// 粒子系统
let particles = [];
const MAX_PARTICLES = 300; // 最大粒子数量限制
const PARTICLE_COUNT = 15; // 每次爆炸产生的粒子数量
const PARTICLE_LIFE = 25; // 粒子生命周期（帧数）

// 粒子对象池
const particlePool = [];

// 获取粒子对象
function getParticle() {
    return particlePool.pop() || {};
}

// 回收粒子对象
function recycleParticle(particle) {
    if (particlePool.length < MAX_PARTICLES) {
        particlePool.push(particle);
    }
}

// 记录已出现的单词
let usedWords = new Set();

// 游戏状态
let gameState = 'notStarted'; // 'notStarted', 'running', 'ended'

// 设置面板相关变量
let settingsPanel;
let settingsButton;
let isSettingsPanelOpen = false;

// 游戏控制按钮
let startButton;
let endButton;

// 单词数据库
const wordPairs = [
    { en: 'apple', cn: '苹果' },
    { en: 'book', cn: '书' },
    { en: 'cat', cn: '猫' },
    { en: 'dog', cn: '狗' },
    { en: 'bull', cn: '公牛' },
    { en: 'snake', cn: '蛇' },
    { en: 'bird', cn: '鸟' }, ,
];
let leftWordsNum = wordPairs.length;
// 游戏状态
let player = {
    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: CANVAS_HEIGHT - PLAYER_HEIGHT - 10
};
let lives = INITIAL_LIVES; // 当前生命值
let consecutiveHits = 0; // 连续命中次数
let missilesNum = 0; // 导弹数量
let bombNum = 0; // 炸弹数量

let bullets = [];
let currentWord = '';
let fallingWords = [];
let gameLoop;
let canvas, ctx;

// 星星数组
let stars = [];

// 初始化游戏
function initGame() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');

    // 初始化星星
    initStars();

    // 初始化设置面板
    initSettings();

    // 初始化游戏控制按钮
    initGameControls();

    // 初始化游戏结束弹窗按钮
    initGameOverModal();

    // 键盘事件监听
    document.addEventListener('keydown', handleKeyPress);

    // 绘制初始画面
    drawInitialScreen();
}

// 初始化游戏控制按钮
function initGameControls() {
    startButton = document.getElementById('startButton');
    endButton = document.getElementById('endButton');
    const gameModeSelect = document.getElementById('gameMode');

    startButton.addEventListener('click', startGame);
    endButton.addEventListener('click', endGame);

    // 模式选择
    gameModeSelect.addEventListener('change', (e) => {
        SPELL_MODE = e.target.value === 'spell';
    });

    // 初始状态下结束按钮禁用
    endButton.disabled = true;
}

// 开始游戏
function startGame() {
    if (gameState !== 'running') {
        gameState = 'running';
        startButton.disabled = true;
        endButton.disabled = false;
        document.getElementById('gameMode').disabled = true;

        // 重置游戏数据
        bullets = [];
        fallingWords = [];
        player.x = CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2;
        lives = INITIAL_LIVES; // 重置生命值
        missilesNum = 0; // 重置导弹数量
        bombNum = 0; // 重置炸弹数量
        consecutiveHits = 0; // 重置连续命中次数
        usedWords.clear(); // 清空已使用单词记录

        // 开始新回合
        startNewRound();
        gameLoop = setInterval(update, 16); // 约60fps
    }
}

// 结束游戏
function endGame() {
    if (gameState === 'running') {
        gameState = 'ended';
        startButton.disabled = false;
        endButton.disabled = true;
        document.getElementById('gameMode').disabled = false;

        // 清除游戏循环
        clearInterval(gameLoop);

        // 重置游戏数据
        bullets = [];
        fallingWords = [];
        currentWord = '';

        // 清空画布
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

// 绘制初始画面
function drawInitialScreen() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('单词射击游戏', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
    ctx.font = '20px Arial';
    ctx.fillText('点击"开始游戏"开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
}

// 绘制结束画面
function drawEndScreen() {
    ctx.fillStyle = '#fff';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
    ctx.font = '20px Arial';
    ctx.fillText('点击"开始游戏"重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
}

// 初始化设置面板
function initSettings() {
    settingsPanel = document.getElementById('settingsPanel');
    settingsButton = document.getElementById('settingsButton');

    // 设置按钮点击事件
    settingsButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        isSettingsPanelOpen = !isSettingsPanelOpen;
        settingsPanel.style.display = isSettingsPanelOpen ? 'block' : 'none';
    });

    // 文件上传处理
    const wordFileInput = document.getElementById('wordFile');
    wordFileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            alert('请上传CSV格式的文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const lines = text.split('\n');
            const newWordPairs = [];

            for (let line of lines) {
                if (!line.trim()) continue;
                const [en, cn] = line.split(',').map(item => item.trim());
                if (en && cn) {
                    newWordPairs.push({ en, cn });
                }
            }

            if (newWordPairs.length > 0) {
                wordPairs.length = 0; // 清空原有单词
                wordPairs.push(...newWordPairs);
                usedWords.clear(); // 清空已使用单词记录
                // 显示上传成功弹窗
                const uploadSuccessModal = document.getElementById('uploadSuccessModal');
                uploadSuccessModal.style.display = 'block';

                // 确定按钮点击事件
                const uploadOkButton = document.getElementById('uploadOkButton');
                uploadOkButton.onclick = function () {
                    uploadSuccessModal.style.display = 'none';
                };
            } else {
                alert('文件格式不正确，请确保CSV文件包含英文和中文两列');
            }
        };
        reader.readAsText(file);
    });

    // 点击面板外关闭设置
    document.addEventListener('click', () => {
        if (isSettingsPanelOpen) {
            isSettingsPanelOpen = false;
            settingsPanel.style.display = 'none';
        }
    });

    // 防止点击面板内部时关闭
    settingsPanel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 速度滑块事件
    const wordSpeedSlider = document.getElementById('wordSpeed');
    const wordSpeedValue = document.getElementById('wordSpeedValue');
    const playerSpeedSlider = document.getElementById('playerSpeed');
    const playerSpeedValue = document.getElementById('playerSpeedValue');

    wordSpeedSlider.addEventListener('input', (e) => {
        WORD_SPEED = parseFloat(e.target.value);
        wordSpeedValue.textContent = WORD_SPEED;
    });

    playerSpeedSlider.addEventListener('input', (e) => {
        PLAYER_SPEED = parseFloat(e.target.value);
        playerSpeedValue.textContent = PLAYER_SPEED;
    });
}

// 开始新回合
function startNewRound() {
    // 重置单词下落速度
    WORD_SPEED = parseFloat(document.getElementById('wordSpeed').value);
    document.getElementById('wordSpeedValue').textContent = WORD_SPEED;

    // 检查是否所有单词都已使用
    if (usedWords.size >= wordPairs.length) {
        // 显示通关弹窗
        const modal = document.getElementById('gameOverModal');
        const modalTitle = modal.querySelector('h2');
        modalTitle.textContent = '恭喜通关！';
        modal.style.display = 'block';
        endGame();
        return;
    }

    // 随机选择一个未使用的单词对
    let availableWords = wordPairs.filter(pair => !usedWords.has(pair.en));
    const randomPair = availableWords[Math.floor(Math.random() * availableWords.length)];
    if (SPELL_MODE) {
        currentWord = randomPair.cn;
    } else {
        currentWord = randomPair.en;
    }
    usedWords.add(randomPair.en); // 记录已使用的单词
    leftWordsNum = wordPairs.length - usedWords.size

    // 生成中文选项，包括正确答案
    const correctCn = randomPair.cn;
    if (SPELL_MODE) {
        fallingWords = [{
            text: randomPair.en,
            en: randomPair.en,
            x: CANVAS_WIDTH / 2 - 20,
            y: 0,
            isCorrect: true
        }];
    } else {
        let otherWords = wordPairs.filter(pair => pair.cn !== correctCn)
            .map(pair => pair.cn)
            .sort(() => Math.random() - 0.5)
            .slice(0, TARGET_COUNT - 1);

        const cnWords = [correctCn, ...otherWords].sort(() => Math.random() - 0.5);

        // 创建下落的单词
        fallingWords = cnWords.map((word, index) => ({
            text: word,
            x: index * (CANVAS_WIDTH / TARGET_COUNT) + 50,
            y: 0,
            isCorrect: word === correctCn
        }));
    }

    // 朗读当前英文单词, 延迟1秒是为了避免和爆炸音效重叠，听不清单词发言
    setTimeout(() => {
        playTTS(currentWord);
    }, 1000); // 延迟1秒后播放
}

function handleKeyPressForSpellMode(event) {
    if (/^[A-Za-z]$/.test(event.key)) {
        bullets.push({
            x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: player.y,
            letter: event.key
        });
        playTTS(event.key);
    } else if (event.key === ' ') {
        if (missilesNum > 0) {
            missilesNum--;
            bullets.push({
                x: player.x + PLAYER_WIDTH / 2 - MISSILE_WIDTH / 2,
                y: player.y,
                isMissile: true
            });
            missileSound.currentTime = 0;
            missileSound.play(); // 播放导弹音效
        }
    } else if (event.key === 'Enter') {
        if (bombNum > 0) {
            bombNum--;
            bullets.push({
                x: player.x + PLAYER_WIDTH / 2 - BOMB_WIDTH / 2,
                y: player.y,
                isBomb: true
            });
            bombSound.currentTime = 0;
            bombSound.play(); // 播放炸弹音效
        }
    } else if (event.key === 'ArrowLeft') {
        if (player.x > 0) {
            player.x -= PLAYER_SPEED;
        }
    } else if (event.key === 'ArrowRight') {
        if (player.x < CANVAS_WIDTH - PLAYER_WIDTH) {
            player.x += PLAYER_SPEED;
        }
    }
}

function handleKeyPressForSelectMode(event) {
    switch (event.key) {
        case 'ArrowLeft':
            if (player.x > 0) {
                player.x -= PLAYER_SPEED;
            }
            break;
        case 'ArrowRight':
            if (player.x < CANVAS_WIDTH - PLAYER_WIDTH) {
                player.x += PLAYER_SPEED;
            }
            break;
        case 'A':
        case 'a':
            bullets.push({
                x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
                y: player.y
            });
            shootSound.currentTime = 0; // 重置音频播放位置
            shootSound.play(); // 播放射击音效
            break;
        case ' ': // 空格键发射导弹
            if (missilesNum > 0) {
                missilesNum--;
                bullets.push({
                    x: player.x + PLAYER_WIDTH / 2 - MISSILE_WIDTH / 2,
                    y: player.y,
                    isMissile: true
                });
                missileSound.currentTime = 0;
                missileSound.play(); // 播放导弹音效
            }
            break;
        case 's': // s键发射炸弹
        case 'S':
            if (bombNum > 0) {
                bombNum--;
                bullets.push({
                    x: player.x + PLAYER_WIDTH / 2 - BOMB_WIDTH / 2,
                    y: player.y,
                    isBomb: true
                });
                bombSound.currentTime = 0;
                bombSound.play(); // 播放炸弹音效
            }
            break;
    }
}
// 处理键盘输入
function handleKeyPress(event) {
    if (SPELL_MODE) {
        handleKeyPressForSpellMode(event);
    } else {
        handleKeyPressForSelectMode(event);
    }
}

function createBombExplosion(x, y) {
    if (particles.length >= MAX_PARTICLES) return;

    const totalParticles = Math.min(PARTICLE_COUNT * 3.5, MAX_PARTICLES - particles.length);
    const centerCount = Math.floor(totalParticles * 0.4);
    const waveCount = Math.floor(totalParticles * 0.4);
    const flashCount = Math.floor(totalParticles * 0.2);

    // 中心爆炸圈
    for (let i = 0; i < centerCount; i++) {
        const angle = (Math.PI * 2 / centerCount) * i;
        const speed = Math.random() * 3 + 4;
        const particle = getParticle();
        Object.assign(particle, {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: PARTICLE_LIFE * 1.2,
            maxLife: PARTICLE_LIFE * 1.2,
            color: `hsl(${Math.random() * 360}, 100%, 70%)`
        });
        particles.push(particle);
    }

    // 外围扩散波
    for (let i = 0; i < waveCount; i++) {
        const angle = (Math.PI * 2 / waveCount) * i;
        const speed = Math.random() * 2 + 6;
        const particle = getParticle();
        Object.assign(particle, {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: PARTICLE_LIFE,
            maxLife: PARTICLE_LIFE,
            color: `hsl(${Math.random() * 60 + 180}, 100%, 60%)`
        });
        particles.push(particle);
    }

    // 闪光效果
    for (let i = 0; i < flashCount; i++) {
        const angle = (Math.PI * 2 / flashCount) * i;
        const speed = Math.random() * 1 + 2;
        const particle = getParticle();
        Object.assign(particle, {
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: PARTICLE_LIFE * 0.7,
            maxLife: PARTICLE_LIFE * 0.7,
            color: '#ffffff'
        });
        particles.push(particle);
    }

    blastSound.currentTime = 0;
    blastSound.play();
}
// 创建爆炸效果
function createExplosion(x, y, silent = false) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 / PARTICLE_COUNT) * i;
        const speed = Math.random() * 2 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: PARTICLE_LIFE,
            color: `hsl(${Math.random() * 60 + 30}, 100%, 50%)` // 黄色到橙色的随机色
        });
    }
    if (!silent) {
        blastSound.currentTime = 0;
        blastSound.play();
    }
}

// 更新和绘制粒子
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;

        // 绘制粒子，使用缓动效果
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = (particle.life / particle.maxLife) * 0.8;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // 回收死亡粒子
        if (particle.life <= 0) {
            recycleParticle(particle);
            particles.splice(i, 1);
        }
    }
    ctx.globalAlpha = 1;
}

// 更新游戏状态
function update() {
    if (gameState !== 'running') {
        return;
    }

    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制星空背景
    drawStars();

    // 绘制生命值和导弹数量
    ctx.fillStyle = '#ff0000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('❤️'.repeat(lives), 10, 80);
    // 绘制连续命中进度
    if (consecutiveHits > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText('✨'.repeat(consecutiveHits), 10, 110);
    }
    ctx.fillText('🚀'.repeat(missilesNum), 10, 140);
    ctx.fillText('💣'.repeat(bombNum), 10, 170);

    // 绘制英文单词，调整位置和样式
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.textAlign = 'left';
    if (SHOW_WORD) {
        ctx.fillText(currentWord, 30, 50);
    }
    ctx.fillStyle = '#ffa';
    ctx.font = '22px Arial';
    ctx.fillText(`剩余目标个数 ${leftWordsNum}`, CANVAS_WIDTH - 260, 50);

    // 添加阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // 绘制小飞机
    function drawAirplane() {

        // 机身（长方形）
        ctx.beginPath();
        ctx.rect(player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT); // x=90, y=150, 宽度 20, 高度 50（底部 y=200）
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();

        // 机头（三角形）
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);   // 机身顶部左侧 (y=150)
        ctx.lineTo(player.x + PLAYER_WIDTH, player.y);  // 机身顶部右侧
        ctx.lineTo(player.x + PLAYER_WIDTH / 2, player.y - 20);  // 机头顶点 (y=130)
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 左机翼（三角形）
        ctx.beginPath();
        ctx.moveTo(player.x, player.y + 20);   // 机身连接点 (y=170)
        ctx.lineTo(player.x - 30, player.y + 30);   // 机翼外端
        ctx.lineTo(player.x, player.y + 10);   // 机翼上端
        ctx.closePath();
        ctx.fillStyle = '#60A5FA'; // 浅蓝色
        ctx.fill();
        ctx.stroke();

        // 右机翼（三角形）
        ctx.beginPath();
        ctx.moveTo(player.x + PLAYER_WIDTH, player.y + 20);  // 机身连接点 (y=170)
        ctx.lineTo(player.x + PLAYER_WIDTH + 30, player.y + 30);  // 机翼外端
        ctx.lineTo(player.x + PLAYER_WIDTH, player.y + 10);  // 机翼上端
        ctx.closePath();
        ctx.fillStyle = '#60A5FA';
        ctx.fill();
        ctx.stroke();

        // 左尾翼（小三角形）
        ctx.beginPath();
        ctx.moveTo(player.x, player.y + PLAYER_HEIGHT - 10);   // 机身连接点 (y=190)
        ctx.lineTo(player.x - 15, player.y + PLAYER_HEIGHT);   // 尾翼外端 (y=200)
        ctx.lineTo(player.x, player.y + PLAYER_HEIGHT);   // 尾翼下端
        ctx.closePath();
        ctx.fillStyle = '#F97316'; // 橙色
        ctx.fill();
        ctx.stroke();

        // 右尾翼（小三角形）
        ctx.beginPath();
        ctx.moveTo(player.x + PLAYER_WIDTH, player.y + PLAYER_HEIGHT - 10);  // 机身连接点 (y=190)
        ctx.lineTo(player.x + PLAYER_WIDTH + 15, player.y + PLAYER_HEIGHT);  // 尾翼外端 (y=200)
        ctx.lineTo(player.x + PLAYER_WIDTH, player.y + PLAYER_HEIGHT);  // 尾翼下端
        ctx.closePath();
        ctx.fillStyle = '#F97316';
        ctx.fill();
        ctx.stroke();
    }
    drawAirplane();

    // 更新和绘制子弹，导弹和炸弹
    ctx.fillStyle = '#ff0';
    bullets.forEach((bullet, index) => {
        bullet.y -= 5;
        if (bullet.isBomb) {
            ctx.fillStyle = '#00f'; // 炸弹颜色为蓝色
            ctx.fillRect(bullet.x, bullet.y, BOMB_WIDTH, BOMB_HEIGHT);
        } else if (bullet.isMissile) {
            ctx.fillStyle = '#f00'; // 导弹颜色为红色
            ctx.fillRect(bullet.x, bullet.y, MISSILE_WIDTH, MISSILE_HEIGHT);
        } else {
            ctx.fillStyle = '#ff0';
            ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
        }

        // 移除超出屏幕的子弹
        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });

    // 更新和绘制粒子
    updateParticles();

    // 更新和绘制下落的单词
    ctx.fillStyle = '#fff';
    ctx.font = '28px Arial';
    let breakWordsLoop = false
    fallingWords.forEach((word, wordIndex) => {
        word.y += WORD_SPEED;
        ctx.fillText(word.text, word.x, word.y);
        if (breakWordsLoop) {
            return;
        }
        let breakBulletsLoop = false
        // 检查碰撞
        bullets.forEach((bullet, bulletIndex) => {
            if (breakBulletsLoop) {
                return;
            }
            if (bullet.isBomb) {
                if (bullet.y < word.y) {
                    // 炸弹只要高度和单词一致，就清除所有单词
                    bullets.splice(bulletIndex, 1);
                    fallingWords.forEach(w => createBombExplosion(w.x, w.y));
                    fallingWords = [];
                    startNewRound();
                    breakWordsLoop = true;
                    breakBulletsLoop = true;
                }
                return;
            } else if (checkCollision(bullet, word)) {
                bullets.splice(bulletIndex, 1);
                if (bullet.isMissile) {
                    // 导弹命中，无论是否命中正确单词，都清除所有单词
                    fallingWords.splice(wordIndex, 1);
                    createExplosion(word.x, word.y);
                    fallingWords.forEach(w => createExplosion(w.x, w.y));
                    fallingWords = [];
                    startNewRound();
                    breakWordsLoop = true;
                    breakBulletsLoop = true;
                } else if (word.isCorrect) {
                    if (SPELL_MODE && bullet.letter.toLowerCase() === word.text[0].toLowerCase()) {
                        // 拼写正确，继续拼写
                        word.text = word.text.slice(1);
                    }
                    // 选择模式直接消除，拼写模式需要拼完整个单词
                    if (!SPELL_MODE || word.text === '') {
                        // 击中正确单词
                        fallingWords.splice(wordIndex, 1);
                        if (SPELL_MODE) {
                            playTTS(word.en);
                            createExplosion(word.x, word.y, true);
                        } else {
                            createExplosion(word.x, word.y);
                        }
                        // 普通子弹命中
                        consecutiveHits++;
                        if (consecutiveHits >= CONSECUTIVE_HITS_FOR_MISSILE) {
                            missilesNum++;
                            consecutiveHits = 0;
                            if (missilesNum >= CONSECUTIVE_MISSLE_FOR_BOMB) {
                                bombNum++;
                                missilesNum = 0;
                            }
                        }
                        startNewRound();
                        breakWordsLoop = true;
                        breakBulletsLoop = true;
                    }
                } else {
                    // 击中错误单词，剩余单词速度翻倍，并重置连续命中次数
                    consecutiveHits = 0;
                    WORD_SPEED *= 2;
                    document.getElementById('wordSpeedValue').textContent = WORD_SPEED;
                }
            }
        });

        // 检查是否有单词落地
        if (word.y > CANVAS_HEIGHT) {
            lives--; // 减少一条生命
            loseSound.currentTime = 0;
            loseSound.play(); // 播放失败音效
            if (lives <= 0) {
                // 游戏结束前清空画布和游戏元素
                bullets = [];
                fallingWords = [];
                ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                // 显示游戏结束弹窗
                const modal = document.getElementById('gameOverModal');
                modal.style.display = 'block';
                endGame();
            } else {
                // 开始新回合
                startNewRound();
            }
            breakWordsLoop = true;
            breakBulletsLoop = true;
        }
    });
}

// 初始化星星
function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: Math.random() * (STAR_MAX_SIZE - STAR_MIN_SIZE) + STAR_MIN_SIZE,
            brightness: Math.random(),
            twinkleSpeed: STAR_TWINKLE_SPEED * (0.5 + Math.random())
        });
    }
}

// 绘制星空背景
function drawStars() {
    ctx.save();
    stars.forEach(star => {
        // 更新星星亮度
        star.brightness += star.twinkleSpeed;
        if (star.brightness > 1 || star.brightness < 0) {
            star.twinkleSpeed = -star.twinkleSpeed;
        }

        // 绘制星星
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

// 碰撞检测
function checkCollision(bullet, word) {
    const wordWidth = ctx.measureText(word.text).width;
    const wordHeight = 24; // 假设字体高度为24px
    const bias = PLAYER_SPEED
    return bullet.x < word.x + bias + wordWidth &&
        bullet.x + BULLET_WIDTH > word.x - bias &&
        bullet.y < word.y &&
        bullet.y + BULLET_HEIGHT > word.y - wordHeight;
}

// 初始化游戏结束弹窗按钮
function initGameOverModal() {
    const modal = document.getElementById('gameOverModal');
    const restartButton = document.getElementById('restartButton');
    const quitButton = document.getElementById('quitButton');

    restartButton.addEventListener('click', function () {
        modal.style.display = 'none';
        startGame();
    });

    quitButton.addEventListener('click', function () {
        modal.style.display = 'none';
        gameState = 'notStarted';
        startButton.disabled = false;
        endButton.disabled = true;
        drawInitialScreen();
    });
}

function playTTS(text) {
    // 创建语音对象
    const utterance = new SpeechSynthesisUtterance();
    utterance.text = text; // 设置朗读文本
    utterance.lang = 'zh-CN'; // 中文语音
    utterance.rate = 1.0; // 语速（0.1-10）
    utterance.pitch = 1.0; // 音调（0-2）
    utterance.volume = 0.8; // 音量（0-1）
    window.speechSynthesis.speak(utterance);
}
// 启动游戏
window.onload = initGame;