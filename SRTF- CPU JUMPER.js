<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CPU Jumper: The SRTF Platformer</title>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        let db, auth, userId;
        async function initializeFirebase() {
            try {
                const app = initializeApp(firebaseConfig);
                auth = getAuth(app);
                db = getFirestore(app);
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
                userId = auth.currentUser?.uid || 'anonymous';
                await loadHighScore();
            } catch (error) {
                document.getElementById('minAwtScore').textContent = 'N/A';
            }
        }
        async function loadHighScore() {
            if (!db || !userId) return;
            const docRef = doc(db, 'artifacts', appId, 'users', userId, 'game_data', 'srtf_high_score');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const minAWT = data.minAWT;
                const highScore = data.highScore || 0;
                document.getElementById('minAwtScore').textContent = minAWT.toFixed(2);
                document.getElementById('highScore').textContent = highScore;
                window.minAwtHighScore = minAWT;
                window.highScore = highScore;
            } else {
                window.minAwtHighScore = 9999.00;
                window.highScore = 0;
                document.getElementById('minAwtScore').textContent = '9999.00';
                document.getElementById('highScore').textContent = '0';
            }
        }
        async function saveHighScore(newAWT, newScore) {
            if (!db || !userId) return;
            const currentMinAwt = window.minAwtHighScore || 9999.00;
            if (newAWT < currentMinAwt) {
                const personalDocRef = doc(db, 'artifacts', appId, 'users', userId, 'game_data', 'srtf_high_score');
                await setDoc(personalDocRef, { minAWT: newAWT, highScore: newScore, timestamp: new Date() });
                const leaderboardDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', userId);
                await setDoc(leaderboardDocRef, { minAWT: newAWT, highScore: newScore, timestamp: new Date(), userId: userId });
                window.minAwtHighScore = newAWT;
                window.highScore = newScore;
                document.getElementById('minAwtScore').textContent = newAWT.toFixed(2);
                document.getElementById('highScore').textContent = newScore;
            }
        }
        async function loadLeaderboard() {
            if (!db) return;
            const loadingEl = document.getElementById('leaderboardLoading');
            const tableBodyEl = document.getElementById('leaderboardBody');
            const tableEl = document.getElementById('leaderboardTable');
            loadingEl.style.display = 'block';
            tableEl.style.display = 'none';
            tableBodyEl.innerHTML = '';
            try {
                const leaderboardCol = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
                const querySnapshot = await getDocs(leaderboardCol);
                let scores = [];
                querySnapshot.forEach((doc) => { scores.push(doc.data()); });
                scores.sort((a, b) => a.minAWT - b.minAWT);
                const topScores = scores.slice(0, 10);
                topScores.forEach((score, index) => {
                    const row = tableBodyEl.insertRow();
                    const rankCell = row.insertCell(0);
                    const playerCell = row.insertCell(1);
                    const scoreCell = row.insertCell(2);
                    const awtCell = row.insertCell(3);
                    rankCell.textContent = index + 1;
                    playerCell.textContent = score.userId;
                    scoreCell.textContent = score.highScore;
                    awtCell.textContent = score.minAWT.toFixed(2);
                });
                loadingEl.style.display = 'none';
                tableEl.style.display = 'table';
            } catch (error) {
                loadingEl.textContent = "ERROR LOADING SCORES.";
            }
        }
        window.initializeFirebase = initializeFirebase;
        window.saveHighScore = saveHighScore;
        window.loadLeaderboard = loadLeaderboard;
        window.minAwtHighScore = 9999.00;
        window.highScore = 0;
    </script>
    <style>
        :root { --color-primary: #00ff00; --color-secondary: #ff00ff; --color-danger: #ff0000; --color-background: #000000; --color-accent: #ffff00; --color-player: #00ffff; --color-platform: #808080; --color-processing: #00ffff; }
        body { font-family: 'Press+Start+2P', cursive; margin: 0; padding: 0; background-color: var(--color-background); color: var(--color-primary); display: flex; flex-direction: column; align-items: center; min-height: 100vh; overflow: hidden; }
        .container { width: 100%; max-width: 800px; background: #111; padding: 10px 20px; box-shadow: 0 0 20px var(--color-primary); border: 3px solid var(--color-secondary); position: relative; }
        .score-bar { display: flex; justify-content: space-around; background-color: #222; padding: 8px; border: 2px solid var(--color-accent); margin-bottom: 10px; font-size: 0.7em; }
        .score-item span { display: block; color: var(--color-accent); font-size: 1.1em; }
        #gameWorld { width: 100%; height: 300px; background: linear-gradient(to bottom, #001f3f 0%, #004080 100%); position: relative; overflow: hidden; border-bottom: 5px solid var(--color-platform); }
        #ground { position: absolute; bottom: 0; width: 200%; height: 20px; background-color: var(--color-platform); border-top: 5px solid #555; transition: transform 0.1s linear; }
        #player { position: absolute; bottom: 20px; left: 100px; width: 20px; height: 20px; background-color: var(--color-player); border: 2px solid white; z-index: 100; transition: bottom 0.05s ease-out; }
        #player::before { content: 'CPU'; position: absolute; top: -15px; left: -5px; font-size: 8px; color: var(--color-player); }
        .job-block { position: absolute; bottom: 20px; width: 40px; height: 40px; background-color: #555; border: 3px solid var(--color-secondary); display: flex; flex-direction: column; justify-content: center; align-items: center; font-size: 0.9em; color: white; z-index: 50; pointer-events: none; transition: transform 0.1s linear; }
        .job-block.long-job { background-color: var(--color-danger); border-color: var(--color-danger); }
        .job-block.short-job { background-color: var(--color-primary); border-color: var(--color-primary); }
        .job-block .remaining-time { font-size: 1.5em; font-weight: 700; color: var(--color-accent); }
        .patience-meter-container { position: absolute; top: -10px; width: 100%; height: 5px; background-color: rgba(255, 255, 255, 0.2); border: 1px solid var(--color-background); }
        .patience-meter-fill { height: 100%; background-color: var(--color-primary); transition: width 0.1s; }
        .patience-meter-fill.low { background-color: var(--color-accent); }
        .patience-meter-fill.critical { background-color: var(--color-danger); }
        #cpuStatus { position: absolute; top: 50px; right: 20px; width: 150px; padding: 5px; background: rgba(0, 0, 0, 0.8); border: 2px solid var(--color-processing); font-size: 0.7em; text-align: center; z-index: 200; }
        #cpuStatus.busy { color: var(--color-processing); box-shadow: 0 0 10px var(--color-processing); }
        .controls { padding: 15px; text-align: center; background-color: #222; display: flex; justify-content: center; gap: 15px; }
        .controls button { background-color: var(--color-primary); color: var(--color-background); border: 3px solid var(--color-accent); padding: 10px 20px; font-family: 'Press Start 2P', cursive; font-size: 0.9em; cursor: pointer; box-shadow: 3px 3px 0 var(--color-secondary); transition: box-shadow 0.1s, transform 0.1s; }
        .controls p { font-size: 0.7em; color: #ccc; margin-top: 10px; }
        #stopButton { background-color: #8b0000; }
        #pauseButton { background-color: var(--color-accent); color: var(--color-background); }
        #pauseOverlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); color: var(--color-accent); display: none; justify-content: center; align-items: center; font-size: 3em; z-index: 500; letter-spacing: 5px; }
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #111; padding: 25px; border: 3px solid var(--color-secondary); box-shadow: 0 0 25px var(--color-accent); width: 90%; max-width: 600px; text-align: center; position: relative; }
        .modal-content h2 { color: var(--color-accent); letter-spacing: 3px; margin-top: 0; }
        .close-button { position: absolute; top: 5px; right: 15px; font-size: 2em; color: var(--color-primary); background: none; border: none; cursor: pointer; font-family: Arial, sans-serif; }
        #leaderboardTable { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.8em; }
        #leaderboardTable th, #leaderboardTable td { border: 1px solid var(--color-primary); padding: 8px; text-align: left; }
        #leaderboardTable th { background-color: var(--color-secondary); color: var(--color-background); }
        #leaderboardTable td:nth-child(2) { word-break: break-all; }
        #leaderboardLoading { color: var(--color-accent); font-size: 1.5em; padding: 20px; }
        #ganttChartContainer { width: 100%; height: 200px; background-color: #222; position: relative; border: 1px solid var(--color-primary); overflow-x: auto; overflow-y: hidden; margin-top: 15px; }
        .gantt-bar { position: absolute; height: 50px; top: 50px; background-color: lightblue; border: 1px solid black; display: flex; justify-content: center; align-items: center; font-size: 0.8em; color: black; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        #ganttTimeline { position: relative; width: 100%; height: 20px; top: 100px; }
        .gantt-tick { position: absolute; bottom: 0; width: 1px; height: 10px; background-color: var(--color-primary); }
        .gantt-tick-label { position: absolute; bottom: -15px; transform: translateX(-50%); font-size: 0.6em; }
    </style>
</head>
<body>
<div class="container">
    <div class="score-bar">
        <div class="score-item">SCORE:<span id="currentScore">0</span></div>
        <div class="score-item">HIGH SCORE:<span id="highScore">0</span></div>
        <div class="score-item">TIME:<span id="gameTimer">00</span></div>
        <div class="score-item">AWT (Penalty):<span id="avgWaitTime">0.00</span></div>
        <div class="score-item">MIN AWT (Best Score):<span id="minAwtScore">...</span></div>
    </div>
    <div id="gameWorld">
        <div id="ground"></div>
        <div id="player"></div>
        <div id="cpuStatus">IDLE: 0 RT</div>
        <div id="pauseOverlay">PAUSED</div>
    </div>
    <div class="controls">
        <button id="startButton" onclick="startGame()">START RUNNER</button>
        <button id="pauseButton" onclick="togglePause()" disabled>PAUSE</button>
        <button id="stopButton" onclick="gameOver('Game Manually Stopped by Dispatcher.')" disabled>STOP RUNNER</button>
        <button id="leaderboardButton" onclick="showLeaderboard()">LEADERBOARD</button>
        <button id="ganttChartButton" onclick="showGanttChart()" disabled>GANTT CHART</button>
    </div>
    <p style="text-align: center; font-size: 0.7em; color: #ccc;">Press **SPACEBAR** or **UP ARROW** to **JUMP** and make your scheduling decision!</p>
</div>
<div id="leaderboardModal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <button class="close-button" onclick="hideLeaderboard()">&times;</button>
        <h2>LEADERBOARD</h2>
        <div id="leaderboardLoading">LOADING...</div>
        <table id="leaderboardTable">
            <thead>
                <tr>
                    <th>RANK</th>
                    <th>PLAYER ID</th>
                    <th>HIGH SCORE</th>
                    <th>MIN AWT</th>
                </tr>
            </thead>
            <tbody id="leaderboardBody"></tbody>
        </table>
    </div>
</div>
<div id="ganttChartModal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <button class="close-button" onclick="hideGanttChart()">&times;</button>
        <h2>GANTT CHART ANALYSIS</h2>
        <div id="ganttChartContainer"></div>
    </div>
</div>
<script>
    const TIME_UNIT = 100;
    const SCROLL_SPEED = 14;
    const JUMP_HEIGHT = 200;
    const JUMP_DURATION = 10;
    const MAX_JUMPS = 3;
    const MAX_BT = 30;
    const PATIENCE_MAX = 80;
    const PLAYER_HEIGHT = 20;
    const JOB_WIDTH = 40;
    const GROUND_LEVEL = 20;
    const AWT_FAILURE_THRESHOLD = 150.00;
    const MIN_JOBS_FOR_AWT_CHECK = 10;
    const MIN_SPAWN_DISTANCE = 150;
    const PROCESSING_DELAY_TICKS = 5;
    const PATIENCE_DECAY_FREQUENCY = 3;
    const WALL_SPAWN_CHANCE = 0.2;
    const STARTING_SCORE = 1000;
    let gameInterval = null;
    let gameTime = 0;
    let currentScore = STARTING_SCORE;
    let nextJobId = 1;
    let isGameRunning = false;
    let isPaused = false;
    let isJumping = false;
    let jumpTick = 0;
    let playerY = GROUND_LEVEL;
    let jumpsAvailable = MAX_JUMPS;
    let processingTickCount = 0;
    let currentJob = null;
    let waitingJobs = [];
    let jobsCompleted = 0;
    let totalWaitingTime = 0;
    let ganttChartHistory = [];
    let lastStateChangeTime = 0;
    let jobColors = {};
    const worldEl = document.getElementById('gameWorld');
    const playerEl = document.getElementById('player');
    const groundEl = document.getElementById('ground');
    const cpuStatusEl = document.getElementById('cpuStatus');
    const scoreEl = document.getElementById('currentScore');
    const highScoreEl = document.getElementById('highScore');
    const timerEl = document.getElementById('gameTimer');
    const avgWaitEl = document.getElementById('avgWaitTime');
    const startButton = document.getElementById('startButton');
    const stopButton = document.getElementById('stopButton');
    const pauseButton = document.getElementById('pauseButton');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const leaderboardModal = document.getElementById('leaderboardModal');
    const ganttChartModal = document.getElementById('ganttChartModal');
    const ganttChartButton = document.getElementById('ganttChartButton');
    class Job {
        constructor(id, arrivalTime, targetSize = 'random') {
            this.id = id;
            this.arrivalTime = arrivalTime;
            let min_bt, max_bt;
            if (targetSize === 'long') { min_bt = 16; max_bt = MAX_BT; } else if (targetSize === 'short') { min_bt = 3; max_bt = 7; } else if (targetSize === 'medium') { min_bt = 8; max_bt = 15; } else { min_bt = 3; max_bt = MAX_BT; }
            this.initialBurstTime = Math.floor(Math.random() * (max_bt - min_bt + 1)) + min_bt;
            this.remainingTime = this.initialBurstTime;
            this.patience = PATIENCE_MAX;
            this.positionX = worldEl.offsetWidth;
            this.startTime = undefined;
            this.isCollected = false;
            this.inQueueTime = 0;
        }
        getSizeClass() {
            if (this.initialBurstTime <= 7) return 'short-job';
            if (this.initialBurstTime <= 15) return 'medium-job';
            return 'long-job';
        }
    }
    function handleCollision(job) {
        if (job.isCollected) return;
        if (currentJob === null) {
            processPreemption(job, null);
        } else {
            if (job.remainingTime < currentJob.remainingTime) {
                processPreemption(job, currentJob);
            } else {
                applyPenalty("FAIL: Selected a longer job! Must use SRTF.");
            }
        }
        job.isCollected = true;
        const jobEl = document.getElementById('job-' + job.id);
        if (jobEl) jobEl.remove();
        playerEl.style.transform = 'scale(1.2)';
        setTimeout(() => playerEl.style.transform = 'scale(1)', 100);
    }
    function processPreemption(newJob, oldJob) {
        if (oldJob) {
            ganttChartHistory.push({ jobId: oldJob.id, start: lastStateChangeTime, end: gameTime });
            oldJob.positionX = worldEl.offsetWidth;
            oldJob.isCollected = false;
            renderJobs();
        } else {
            ganttChartHistory.push({ jobId: 'IDLE', start: lastStateChangeTime, end: gameTime });
        }
        currentJob = newJob;
        lastStateChangeTime = gameTime;
        if (currentJob.startTime === undefined) currentJob.startTime = gameTime;
        currentScore += (oldJob ? 300 : 100);
    }
    function applyPenalty(message) {
        currentScore = Math.max(0, currentScore - 50);
        playerEl.style.backgroundColor = 'var(--color-danger)';
        cpuStatusEl.textContent = "PENALTY! " + message;
        setTimeout(() => playerEl.style.backgroundColor = 'var(--color-player)', 500);
    }
    function jump() {
        if (!isGameRunning || isPaused) return;
        if (jumpsAvailable > 0) { isJumping = true; jumpTick = 0; jumpsAvailable--; }
    }
    function handleJumpMovement() {
        if (!isJumping) return;
        const maxTicks = JUMP_DURATION * 2;
        jumpTick++;
        if (jumpTick > maxTicks) { isJumping = false; playerY = GROUND_LEVEL; jumpsAvailable = MAX_JUMPS; }
        else if (jumpTick <= JUMP_DURATION) { playerY += (JUMP_HEIGHT / JUMP_DURATION); }
        else { playerY -= (JUMP_HEIGHT / JUMP_DURATION); }
        playerEl.style.bottom = `${playerY}px`;
        if (playerY <= GROUND_LEVEL) { playerY = GROUND_LEVEL; isJumping = false; jumpsAvailable = MAX_JUMPS; }
    }
    function gameLoop() {
        if (!isGameRunning) return;
        gameTime++;
        timerEl.textContent = Math.floor(gameTime / 10).toString().padStart(2, '0');
        handleJumpMovement();
        let transform = groundEl.style.transform || 'translateX(0px)';
        let groundPosition = parseInt(transform.replace('translateX(', '').replace('px)', '')) || 0;
        groundPosition = (groundPosition - SCROLL_SPEED) % worldEl.offsetWidth;
        groundEl.style.transform = `translateX(${groundPosition}px)`;
        for (let i = waitingJobs.length - 1; i >= 0; i--) {
            const job = waitingJobs[i];
            if (job.isCollected) continue;
            job.positionX -= SCROLL_SPEED;
            if (currentJob) { job.inQueueTime++; totalWaitingTime++; }
            if (gameTime % PATIENCE_DECAY_FREQUENCY === 0) job.patience -= 1;
            if (job.patience <= 0) { gameOver(`Job ${job.id} CORRUPTED! Too slow to process this queue.`); return; }
            if (job.positionX < -50) { if (!job.isCollected) applyPenalty("LOST JOB: Did not process before it left the queue!"); waitingJobs.splice(i, 1); }
        }
        if (currentJob) {
            processingTickCount++;
            if (processingTickCount >= PROCESSING_DELAY_TICKS) { currentJob.remainingTime -= 1; processingTickCount = 0; }
            if (currentJob.remainingTime <= 0) {
                ganttChartHistory.push({ jobId: currentJob.id, start: lastStateChangeTime, end: gameTime });
                lastStateChangeTime = gameTime;
                jobsCompleted++;
                currentJob = null;
            }
        }
        const lastJob = waitingJobs.length > 0 ? waitingJobs[waitingJobs.length - 1] : null;
        const screenWidth = worldEl.offsetWidth;
        if (gameTime % (Math.floor(Math.random() * 5) + 5) === 0) {
            if (!lastJob || lastJob.positionX < screenWidth - MIN_SPAWN_DISTANCE) {
                if (currentJob === null && Math.random() < WALL_SPAWN_CHANCE) {
                    const wallSize = Math.floor(Math.random() * 2) + 2;
                    let currentSpawnX = screenWidth;
                    for (let i = 0; i < wallSize; i++) {
                        const newJob = new Job(nextJobId++, gameTime, 'long');
                        newJob.positionX = currentSpawnX;
                        waitingJobs.push(newJob);
                        currentSpawnX += JOB_WIDTH + 10;
                    }
                } else { generateJob(); }
            }
        }
        const playerX = 100;
        const collisionZone = 25;
        waitingJobs.forEach(job => {
            if (job.isCollected) return;
            const jobLeft = job.positionX;
            const jobRight = job.positionX + JOB_WIDTH;
            if (jobLeft < playerX + collisionZone && jobRight > playerX) {
                if (!isJumping) { handleCollision(job); }
            }
        });
        if (jobsCompleted >= MIN_JOBS_FOR_AWT_CHECK) {
            const currentAWT = totalWaitingTime / (jobsCompleted * 10);
            if (currentAWT >= AWT_FAILURE_THRESHOLD) { gameOver(`SYSTEM FAILURE! AWT (${currentAWT.toFixed(2)}) exceeded ${AWT_FAILURE_THRESHOLD.toFixed(2)}.`); return; }
        }
        renderJobs();
        renderCPUStatus();
        updateMetrics();
    }
    function generateJob() {
        const randomNumber = Math.random();
        let targetSize = 'random';
        if (randomNumber < 0.5) targetSize = 'short';
        else if (randomNumber < 0.8) targetSize = 'medium';
        else targetSize = 'long';
        const newJob = new Job(nextJobId++, gameTime, targetSize);
        waitingJobs.push(newJob);
    }
    function renderJobs() {
        const blocks = worldEl.querySelectorAll('.job-block');
        blocks.forEach(b => b.remove());
        waitingJobs.forEach(job => {
            if (job.isCollected) return;
            const jobEl = document.createElement('div');
            jobEl.className = 'job-block ' + job.getSizeClass();
            jobEl.id = 'job-' + job.id;
            jobEl.style.left = `${job.positionX}px`;
            const healthRatio = job.patience / PATIENCE_MAX;
            const healthFill = document.createElement('div');
            healthFill.className = 'patience-meter-fill';
            healthFill.style.width = `${healthRatio * 100}%`;
            if (healthRatio < 0.5) healthFill.classList.add('low');
            if (healthRatio < 0.25) healthFill.classList.add('critical');
            const healthContainer = document.createElement('div');
            healthContainer.className = 'patience-meter-container';
            healthContainer.appendChild(healthFill);
            jobEl.appendChild(healthContainer);
            const rtLabel = document.createElement('div');
            rtLabel.className = 'remaining-time';
            rtLabel.textContent = job.remainingTime;
            jobEl.appendChild(rtLabel);
            const idLabel = document.createElement('div');
            idLabel.textContent = `BT: ${job.initialBurstTime}`;
            idLabel.style.fontSize = '0.7em';
            jobEl.appendChild(idLabel);
            worldEl.appendChild(jobEl);
        });
    }
    function renderCPUStatus() {
        if (currentJob) {
            cpuStatusEl.classList.add('busy');
            cpuStatusEl.innerHTML = `CRUNCHING <br> RT: ${currentJob.remainingTime} <br> ID: ${currentJob.id}`;
        } else {
            cpuStatusEl.classList.remove('busy');
            cpuStatusEl.innerHTML = 'IDLE: 0 RT';
        }
    }
    function updateMetrics() {
        scoreEl.textContent = currentScore;
        highScoreEl.textContent = window.highScore || 0;
        if (jobsCompleted > 0) {
            const currentAWT = totalWaitingTime / (jobsCompleted * 10);
            avgWaitEl.textContent = currentAWT.toFixed(2);
        } else { avgWaitEl.textContent = '0.00'; }
    }
    async function gameOver(message) {
        if (!isGameRunning) return;
        isGameRunning = false;
        clearInterval(gameInterval);
        if (currentJob) { ganttChartHistory.push({ jobId: currentJob.id, start: lastStateChangeTime, end: gameTime }); }
        else { ganttChartHistory.push({ jobId: 'IDLE', start: lastStateChangeTime, end: gameTime }); }
        let finalAWT = 9999.00;
        if (jobsCompleted > 0) finalAWT = totalWaitingTime / (jobsCompleted * 10);
        const failureMessage = message;
        if (jobsCompleted > 0 && window.saveHighScore) await window.saveHighScore(finalAWT, currentScore);
        cpuStatusEl.innerHTML = `<span style="color:var(--color-danger);">${failureMessage}</span>`;
        startButton.textContent = "GAME OVER! RETRY?";
        startButton.disabled = false;
        stopButton.disabled = true;
        pauseButton.disabled = true;
        ganttChartButton.disabled = false;
        alert(`GAME OVER! Final Score: ${currentScore}. Final AWT: ${finalAWT.toFixed(2)}.`);
        document.removeEventListener('keydown', handleKeyPress);
    }
    function resetGame() {
        clearInterval(gameInterval);
        isGameRunning = false;
        isPaused = false;
        gameTime = 0;
        currentScore = STARTING_SCORE;
        nextJobId = 1;
        currentJob = null;
        waitingJobs = [];
        jobsCompleted = 0;
        totalWaitingTime = 0;
        ganttChartHistory = [];
        lastStateChangeTime = 0;
        jobColors = {};
        playerY = GROUND_LEVEL;
        jumpsAvailable = MAX_JUMPS;
        processingTickCount = 0;
        playerEl.style.bottom = `${GROUND_LEVEL}px`;
        groundEl.style.transform = `translateX(0px)`;
        const blocks = worldEl.querySelectorAll('.job-block');
        blocks.forEach(b => b.remove());
        startButton.textContent = "START RUNNER";
        startButton.disabled = false;
        stopButton.disabled = true;
        pauseButton.disabled = true;
        ganttChartButton.disabled = true;
        pauseButton.textContent = "PAUSE";
        pauseOverlay.style.display = 'none';
        leaderboardModal.style.display = 'none';
        renderCPUStatus();
        updateMetrics();
    }
    function handleKeyPress(event) {
        if (!isGameRunning) return;
        if (event.code === 'Space' || event.code === 'ArrowUp') { event.preventDefault(); jump(); }
        if (event.code === 'KeyP') { event.preventDefault(); togglePause(); }
    }
    function startGame() {
        resetGame();
        isGameRunning = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        pauseButton.disabled = false;
        document.addEventListener('keydown', handleKeyPress);
        generateJob();
        generateJob();
        gameInterval = setInterval(gameLoop, TIME_UNIT);
    }
    function togglePause() {
        if (!isGameRunning) return;
        isPaused = !isPaused;
        if (isPaused) { clearInterval(gameInterval); gameInterval = null; pauseButton.textContent = "RESUME"; pauseOverlay.style.display = 'flex'; }
        else { gameInterval = setInterval(gameLoop, TIME_UNIT); pauseButton.textContent = "PAUSE"; pauseOverlay.style.display = 'none'; }
    }
    function showLeaderboard() {
        if (isGameRunning && !isPaused) togglePause();
        leaderboardModal.style.display = 'flex';
        if (window.loadLeaderboard) window.loadLeaderboard();
    }
    function hideLeaderboard() { leaderboardModal.style.display = 'none'; }
    function getJobColor(jobId) { if (jobId === 'IDLE') return '#444'; if (!jobColors[jobId]) { const hue = (jobId * 137.508) % 360; jobColors[jobId] = `hsl(${hue}, 90%, 60%)`; } return jobColors[jobId]; }
    function showGanttChart() {
        const container = document.getElementById('ganttChartContainer');
        container.innerHTML = '';
        const totalDuration = gameTime;
        if (totalDuration === 0) return;
        ganttChartHistory.forEach(segment => {
            if (segment.end > segment.start) {
                const bar = document.createElement('div');
                bar.className = 'gantt-bar';
                bar.style.left = `${(segment.start / totalDuration) * 100}%`;
                bar.style.width = `${((segment.end - segment.start) / totalDuration) * 100}%`;
                bar.style.backgroundColor = getJobColor(segment.jobId);
                bar.textContent = `Job ${segment.jobId}`;
                bar.title = `Job ${segment.jobId} [${(segment.start / 10).toFixed(1)}s - ${(segment.end / 10).toFixed(1)}s]`;
                container.appendChild(bar);
            }
        });
        ganttChartModal.style.display = 'flex';
    }
    function hideGanttChart() { ganttChartModal.style.display = 'none'; }
    document.addEventListener('DOMContentLoaded', () => { resetGame(); if (window.initializeFirebase) window.initializeFirebase(); });
</script>
</body>
</html>
