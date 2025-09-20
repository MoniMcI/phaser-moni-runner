import { createAnimations } from './animations.js'

// Variables globales
let player;
let cursors;
let obstacles;
let ground;
let isGameRunning = true;
let score = 0;
let scoreText;
let dogs;
let platforms;
let snakeEvent;
let snakeEventChanged = false;
let lastSnakeTime = 0;
let snakeDelay = 3000; 
let ouchSound;
let successSound;
let gameOverSound;
let hits = 0;       // cuántas veces la picaron
let maxHits = 10;   // límite de mordidas
let hitsText;       // texto en pantalla



// Configuración del juego
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 300,
  backgroundColor: '#87CEEB', // celeste
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 }, //porque la gravity es de 1000
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};


// Inicializar el juego
const game = new Phaser.Game(config);

function preload() {

  
  // Cargar assets
  this.load.image('ground', 'assets/grass.png'); //el pastito
  this.load.image('dog', 'assets/dog.png');
  this.load.image('snake', 'assets/snake.png');
  // Cargar moni-idle
  this.load.spritesheet('moni-idle', 'assets/moni-idle.png', {frameWidth: 32, frameHeight: 32});
  // cargar moni-walk
  this.load.spritesheet('moni-walk', 'assets/moni-walk.png', {frameWidth: 32, frameHeight: 32});  

  //Cargamos sonidos
  this.load.audio('ouch', 'assets/ouch.wav');
  this.load.audio('success', 'assets/upshort.wav');
  this.load.audio('gameover', 'assets/gameover.wav');    
      
}

function create() {

  createAnimations(this) //crea las animaciones moni-idle y moni-walk
    
  // Creo el suelo, lo repetirá hasta llegar a 800px
  ground = this.add.tileSprite(0, 284, 800, 32, 'ground')
      .setOrigin(0, 0);
  this.physics.add.existing(ground, true);



  // Moni-idle cae y queda sobre el pasto
  player = this.physics.add.sprite(100, 250, 'moni-idle');
  player.setScale(1.5);
  player.setCollideWorldBounds(true);
  this.physics.add.collider(player, ground); //para que se moni caiga y se detenga SOBRE el suelo y no bajo el suelo

  // Moni comienza a caminar
  player.play('walk'); //automaticamente comienza a caminar

  // habilito las teclas
  cursors = this.input.keyboard.createCursorKeys();

  // Score
  scoreText = this.add.text(16, 16, 'Score: 0', {
    fontSize: '20px',
    fill: '#000'
  });
  hitsText = this.add.text(16, 40, 'Picaduras: 0/' + maxHits, { fontSize: '24px', fill: '#fff' });



  // Grupo de perritos
  dogs = this.physics.add.group();

  // permito la colisión de Moni con perritos
  // al colisionar, se ejecutará collectDog
  this.physics.add.overlap(player, dogs, collectDog, null, this);

  // Generar perritos cada cierto tiempo
  this.time.addEvent({
    delay: 2000, // cada 2 segundos
    callback: spawnDog,
    callbackScope: this,
    loop: true
  });      



  // Grupo de plataformas
  platforms = this.physics.add.staticGroup();


  // Grupo de obstáculos en el suelo
  obstacles = this.physics.add.group(); //esto es para la vibora

  // Colisión con Moni, al colisionar con moni se ejecutara hitObstacle
  this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

  let snakeEvent = this.time.addEvent({
      delay: 3000,          // empieza cada 3s
      callback: spawnSnake,
      callbackScope: this,
      loop: true
  });

  //Sonidos
  ouchSound = this.sound.add('ouch');
  successSound = this.sound.add('success');
  gameOverSound = this.sound.add('gameover');

}



function update() {

    if (!isGameRunning) {
        return; // si ya terminó, no ejecutar más lógica
    }    

    // Mover pasto
    ground.tilePositionX += 5;

    // Chequear si Moni está sobre alguna plataforma
    let canJump = player.body.touching.down || player.body.blocked.down;

    platforms.getChildren().forEach(plat => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), plat.getBounds())) {
            canJump = true;
        }
    });

    // Saltar si presionan arriba y puede saltar (se encuentra en el piso)
    if (cursors.up.isDown && canJump) {
        player.setVelocityY(-400);
    }

    // Mover plataformas hacia la izquierda
    platforms.getChildren().forEach(plat => {
        plat.x -= 5;

        // eliminar plataforma que sale de la pantalla
        if (plat.x + plat.displayWidth < 0) {
            dogs.getChildren().forEach(dog => {
                if (dog.platform === plat) dog.destroy();
            });
            plat.destroy();
        }
    });

    // Mover perritos sobre plataforma
    dogs.getChildren().forEach(dog => {
        if (dog.platform) {
            dog.x = dog.platform.x;
        } else {
            dog.x -= 5;
            if(dog.x + dog.displayWidth < 0) dog.destroy();
        }
    });

    // Ajustar frecuencia de serpientes según score
    if (snakeEvent) { // verificar que existe
        if (score >= 200 && snakeEvent.delay > 2000) {
            snakeEvent.remove();
            snakeEvent = this.time.addEvent({
                delay: 2000,
                callback: spawnSnake,
                callbackScope: this,
                loop: true
            });
        } else if (score >= 400 && snakeEvent.delay > 1500) {
            snakeEvent.remove();
            snakeEvent = this.time.addEvent({
                delay: 1500,
                callback: spawnSnake,
                callbackScope: this,
                loop: true
            });
        }
    }
}




function spawnDog() {
    let x = 800; // empieza a la derecha
    let yPlatform = Phaser.Math.Between(150, 250); // altura de la plataforma

    // Crear la plataforma
    let plat = platforms.create(x, yPlatform, 'ground').setScale(0.3,0.5).refreshBody();

    // Crear perrito encima de la plataforma
    let dog = dogs.create(x, yPlatform - 24, 'dog'); // 24 = altura del perrito
    dog.setScale(1.5);
    dog.body.allowGravity = false;  // NO usar gravedad
    dog.setCollideWorldBounds(false);
    dog.setImmovable(true);

    // Guardar referencia a la plataforma en el perrito
    dog.platform = plat;
}



function collectDog(player, dog) {
    dog.destroy();       // desaparece al recogerlo
    score += 50;         // sumar puntos
    scoreText.setText('Score: ' + score);
    if (successSound) {
        successSound.play();  // 
    }  
}    


function spawnSnake() {
    let x = 800;            // empieza a la derecha
    let y = 265;            // justo sobre el pasto

    let snake = obstacles.create(x, y, 'snake');
    snake.setScale(1.5);
    snake.body.allowGravity = false; // se mueve horizontalmente, no cae
    snake.setVelocityX(-200);        // velocidad hacia la izquierda
    snake.setImmovable(true);

    // Eliminar serpiente si sale de pantalla
    snake.update = function() {
        if (snake.x + snake.displayWidth < 0) {
            snake.destroy();
        }
    };
}


function hitObstacle(player, snake) {
    snake.destroy();
    score -= 20; // al colisionar con una vibora le resta puntos

    if (ouchSound) {
        ouchSound.play();  // 🔊 reproducir sonido
    }
    hits++;
    hitsText.setText('Picaduras: ' + hits + '/' + maxHits);

    if (hits >= maxHits) {
        gameOver.call(this);
    }   
    scoreText.setText('Score: ' + score);
}


function gameOver() {
    isGameRunning = false;


    // Moni roja en idle
    player.setTint(0xff0000);
    player.setVelocity(0, 0);
    player.anims.stop();       // detener animación actual
    player.play('idle');       // reproducir animación idle

    this.physics.pause();
    // Texto central
    this.add.text(400, 150, 'GAME OVER', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);

    if (gameOverSound) {
        gameOverSound.play();  // 
    }

    // Texto de restart
    let restartText = this.add.text(400, 220, 'Click to Restart', {
        fontSize: '32px',
        fill: '#000',
        backgroundColor: '#fff',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive();

    // Evento para reiniciar la escena
    restartText.on('pointerdown', () => {
        this.scene.restart();
        isGameRunning = true;
        score = 0;
        hits = 0;
    });    
}