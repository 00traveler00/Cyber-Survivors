import os
import re

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

bundle_content = '// Cyber Survivors Bundle\n\n'

for file_path in files:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remove imports
        content = re.sub(r'import .* from .*', '', content)

        # Remove exports
        content = content.replace('export default ', '')
        content = content.replace('export class ', 'class ')
        content = content.replace('export function ', 'function ')
        content = content.replace('export const ', 'const ')
        content = content.replace('export let ', 'let ')
        content = content.replace('export var ', 'var ')

        bundle_content += f"// --- {file_path} ---\n"
        bundle_content += content + '\n\n'
    else:
        print(f"File not found: {file_path}")

output_path = 'js/bundle.js'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(bundle_content)

print(f"Bundle created at {output_path}")
