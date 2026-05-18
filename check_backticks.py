import os

files = [
    'js/game/InputHandler.js',
    'js/game/audio/AudioManager.js',
    'js/game/entities/Particle.js',
    'js/game/entities/FloatingText.js',
    'js/game/entities/Projectile.js',
    'js/game/entities/PiercingProjectile.js',
    'js/game/entities/Missile.js',
    'js/game/entities/Drone.js',
    'js/game/entities/EnemyProjectile.js',
    'js/game/entities/EnemyMissile.js',
    'js/game/entities/Drop.js',
    'js/game/entities/Obstacle.js',
    'js/game/entities/Enemy.js',
    'js/game/entities/Chest.js',
    'js/game/entities/BossAltar.js',
    'js/game/entities/Boss.js',
    'js/game/entities/NextStageAltar.js',
    'js/game/entities/Player.js',
    'js/game/ui/Minimap.js',
    'js/game/systems/UpgradeSystem.js',
    'js/game/systems/WaveManager.js',
    'js/game/systems/SkillTree.js',
    'js/ui/UIManager.js',
    'js/ui/SkillTreeUI.js',
    'js/game/Game.js',
    'js/game/main.js'
]

BACKTICK = chr(96)

print('Checking backtick parity in each file:')
total = 0
for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
        count = content.count(BACKTICK)
        total += count
        parity = 'ODD *** PROBLEM ***' if count % 2 != 0 else 'ok'
        print(f'  {f}: {count} backticks -> {parity}')
    else:
        print(f'  MISSING: {f}')

print(f'\nTotal backticks: {total} ({"ODD - PROBLEM" if total % 2 != 0 else "even - ok"})')
