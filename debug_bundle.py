import os
import re

BACKTICK = chr(96)

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

# Simulate what build.py does
bundle_content = '// Cyber Survivors Bundle\n\n'
total_before = 0
total_after = 0

for file_path in files:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        before = content.count(BACKTICK)
        total_before += before

        # Remove imports
        content = re.sub(r'import .* from .*', '', content)

        # Remove exports
        content = content.replace('export default ', '')
        content = content.replace('export class ', 'class ')
        content = content.replace('export function ', 'function ')
        content = content.replace('export const ', 'const ')
        content = content.replace('export let ', 'let ')
        content = content.replace('export var ', 'var ')

        after = content.count(BACKTICK)
        total_after += after

        # f-string adds backticks for the file path marker? No. Let's check the actual f-string
        file_comment = f"// --- {file_path} ---\n"
        comment_backticks = file_comment.count(BACKTICK)

        bundle_content += file_comment
        bundle_content += content + '\n\n'

        if before != after or comment_backticks > 0:
            print(f"  {file_path}: before={before}, after={after}, comment_backticks={comment_backticks}")
    else:
        print(f"  MISSING: {file_path}")

total_bundle = bundle_content.count(BACKTICK)
print(f"\nTotal backticks before processing: {total_before}")
print(f"Total backticks after processing: {total_after}")
print(f"Total backticks in final bundle: {total_bundle} ({'ODD - PROBLEM' if total_bundle % 2 != 0 else 'even - ok'})")

# Now read the actual bundle.js and compare
with open('js/bundle.js', 'r', encoding='utf-8') as f:
    actual_bundle = f.read()
actual_count = actual_bundle.count(BACKTICK)
print(f"Actual bundle.js backtick count: {actual_count} ({'ODD - PROBLEM' if actual_count % 2 != 0 else 'even - ok'})")
print(f"Simulated bundle backtick count: {total_bundle}")

if actual_count != total_bundle:
    print("WARNING: Actual bundle differs from simulated bundle!")
    print(f"  Difference: {actual_count - total_bundle}")
