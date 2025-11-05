// Configuración del juego
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Tamaño del canvas
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// Jugador
const player = {
    x: CANVAS_WIDTH / 2 - 25,
    y: CANVAS_HEIGHT - 80,
    width: 50,
    height: 50,
    speed: 5,
    color: '#00f',
    isMovingLeft: false,
    isMovingRight: false,
    lastShot: 0,
    shotDelay: 300, // ms entre disparos
    lives: 3,
    score: 0,
    draw() {
        ctx.fillStyle = this.color;
        // Cuerpo de la nave
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // Cañón
        ctx.fillRect(this.x + this.width / 2 - 5, this.y - 10, 10, 10);
    },
    update() {
        if (this.isMovingLeft) this.x = Math.max(0, this.x - this.speed);
        if (this.isMovingRight) this.x = Math.min(CANVAS_WIDTH - this.width, this.x + this.speed);
    },
    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shotDelay) {
            this.lastShot = now;
            return {
                x: this.x + this.width / 2 - 2.5,
                y: this.y,
                width: 5,
                height: 15,
                speed: 7,
                color: '#0f0',
                update() {
                    this.y -= this.speed;
                },
                draw() {
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }
            };
        }
        return null;
    }
};

// Enemigos
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = 1;
        this.health = 1;
        this.type = type;
        this.direction = 1;
        this.moveDown = false;
        this.moveDownDistance = 20;
        this.originalY = y;
        this.points = type === 'normal' ? 10 : 30;
        
        // Configuración basada en el tipo de enemigo
        if (type === 'dive') {
            this.speed = 1.5;
            this.health = 2;
            this.color = '#ff0';
        } else {
            this.color = '#f00';
        }
    }
    
    update() {
        // Movimiento de lado a lado
        if (this.moveDown) {
            this.y += 2;
            if (this.y >= this.originalY + this.moveDownDistance) {
                this.moveDown = false;
                this.originalY = this.y;
                this.direction *= -1;
            }
        } else {
            this.x += this.speed * this.direction;
            
            // Cambiar dirección al llegar a los bordes
            if (this.x <= 0 || this.x + this.width >= CANVAS_WIDTH) {
                this.moveDown = true;
            }
        }
        
        // Comportamiento de inmersión para enemigos de tipo 'dive'
        if (this.type === 'dive' && Math.random() < 0.005) {
            this.dive();
        }
    }
    
    dive() {
        // Comportamiento de inmersión
        this.speed = 3;
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.moveDown = true;
        this.moveDownDistance = 100;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        // Cuerpo del enemigo
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Detalles del enemigo
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 10, this.y + 10, 5, 5); // Ojo izquierdo
        ctx.fillRect(this.x + 25, this.y + 10, 5, 5); // Ojo derecho
        ctx.fillRect(this.x + 10, this.y + 25, 20, 5); // Boca
    }
}

// Elementos del juego
let playerBullets = [];
let enemies = [];
let levelTransition = false;
let gameOver = false;
let lastEnemySpawn = 0;
let enemySpawnDelay = 2000; // ms
let level = 1;
let enemiesToSpawn = 5; // Número inicial de enemigos por nivel
let levelComplete = false;
let levelCompleteTime = 0;

// Inicialización del juego
function initGame() {
    player.x = CANVAS_WIDTH / 2 - 25;
    player.y = CANVAS_HEIGHT - 80;
    player.lives = 3;
    player.score = 0;
    playerBullets = [];
    enemies = [];
    gameOver = false;
    level = 1;
    enemiesToSpawn = 5;
    levelComplete = false;
    spawnEnemies();
    gameOverScreen.classList.add('hidden');
    document.getElementById('levelComplete').classList.add('hidden');
}

// Generación de enemigos
function spawnEnemies() {
    const cols = 8;
    const rows = Math.ceil(enemiesToSpawn / cols);
    const padding = 10;
    const startX = (CANVAS_WIDTH - (cols * (40 + padding))) / 2;
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (i * cols + j >= enemiesToSpawn) break;
            
            const type = Math.random() < 0.2 ? 'dive' : 'normal';
            const enemy = new Enemy(
                startX + j * (40 + padding),
                50 + i * (40 + padding),
                type
            );
            enemies.push(enemy);
        }
    }
}

// Detección de colisiones
function checkCollisions() {
    // Colisiones de balas del jugador con enemigos
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                // Colisión detectada
                playerBullets.splice(i, 1);
                enemy.health--;
                
                if (enemy.health <= 0) {
                    player.score += enemy.points;
                    enemies.splice(j, 1);
                    
                                        // Verificar si se eliminaron todos los enemigos
                    if (enemies.length === 0) {
                        levelComplete = true;
                        levelCompleteTime = Date.now();
                        
                        // Aumentar nivel después de un breve retraso
                        setTimeout(() => {
                            level++;
                            enemiesToSpawn = 5 + level * 2; // Aumentar dificultad
                            player.x = CANVAS_WIDTH / 2 - 25; // Resetear posición del jugador
                            player.y = CANVAS_HEIGHT - 80;
                            spawnEnemies();
                            levelComplete = false;
                            document.getElementById('levelComplete').classList.add('hidden');
                        }, 1500);
                    }
                }
                
                break;
            }
        }
    }
    
    // Colisiones de enemigos con el jugador
    for (const enemy of enemies) {
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            // Colisión con el jugador
            player.lives--;
            
            // Reposicionar al jugador
            player.x = CANVAS_WIDTH / 2 - 25;
            player.y = CANVAS_HEIGHT - 80;
            
            // Eliminar al enemigo
            const index = enemies.indexOf(enemy);
            if (index > -1) {
                enemies.splice(index, 1);
            }
            
            // Verificar si el jugador perdió todas las vidas
            if (player.lives <= 0) {
                gameOver = true;
                finalScoreElement.textContent = player.score;
                gameOverScreen.classList.remove('hidden');
            }
            
            break;
        }
    }
}

// Mostrar pantalla de nivel completado
function showLevelComplete() {
    const levelCompleteDiv = document.getElementById('levelComplete');
    document.getElementById('levelNumber').textContent = level + 1;
    levelCompleteDiv.classList.remove('hidden');
}

// Bucle principal del juego
function gameLoop() {
    if (gameOver) return;
    
    // Mostrar pantalla de nivel completado
    if (levelComplete && Date.now() - levelCompleteTime > 1000) {
        showLevelComplete();
    }
    
    // Limpiar el canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Actualizar y dibujar al jugador
    player.update();
    player.draw();
    
    // Actualizar y dibujar balas del jugador
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        bullet.update();
        bullet.draw();
        
        // Eliminar balas que salen de la pantalla
        if (bullet.y + bullet.height < 0) {
            playerBullets.splice(i, 1);
        }
    }
    
    // Actualizar y dibujar enemigos
    for (const enemy of enemies) {
        enemy.update();
        enemy.draw();
    }
    
    // Verificar colisiones
    checkCollisions();
    
    // Mostrar información del juego
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`Puntuación: ${player.score}`, 10, 30);
    ctx.fillText(`Vidas: ${player.lives}`, 10, 60);
    ctx.fillText(`Nivel: ${level}`, 10, 90);
    
    // Mostrar mensaje de nivel completado en el juego
    if (levelComplete) {
        ctx.fillStyle = '#0f0';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('¡Nivel Completado!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.textAlign = 'left';
    }
    
    // Continuar el bucle de juego
    requestAnimationFrame(gameLoop);
}

// Eventos de teclado
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') player.isMovingLeft = true;
    if (e.key === 'ArrowRight') player.isMovingRight = true;
    if (e.key === ' ' || e.key === 'Spacebar') {
        const bullet = player.shoot();
        if (bullet) playerBullets.push(bullet);
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') player.isMovingLeft = false;
    if (e.key === 'ArrowRight') player.isMovingRight = false;
});

// Evento para el botón de reinicio
restartButton.addEventListener('click', () => {
    initGame();
    gameLoop();
});

// Iniciar el juego
initGame();
gameLoop();
