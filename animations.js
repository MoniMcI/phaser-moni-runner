export const createAnimations = (game) => {

  // Crear animación moni-idle
  game.anims.create({
    key: 'idle',
    frames: game.anims.generateFrameNumbers('moni-idle', { start: 0, end: 3 }),
    frameRate: 4,   // velocidad de animación
    repeat: -1      // repetir infinitamente
  });

  // Animación walk
  game.anims.create({
    key: 'walk',
    frames: game.anims.generateFrameNumbers('moni-walk', { start: 0, end: 3 }),
    frameRate: 8,
    repeat: -1
  });

}