using UnityEngine;

namespace pxROG
{
    [System.Serializable]
    public class DifficultyLevel
    {
        public string name;
        [TextArea(1, 3)] public string description;

        [Header("Enemy Modifiers")]
        public float hpMod = 1f;
        public float dmgMod = 1f;
        public float spawnMod = 1f;

        [Header("Economy Modifier")]
        public float ptMod = 1f;

        [Header("Player Base Stats")]
        public int playerHp = 100;
        public int playerDamage = 12;

        [Header("Spawn Limits")]
        public int maxEnemies = 35;

        [Header("Balance")]
        [Tooltip("Seconds of invincibility at run start")]
        public float protectionTime = 30f;
    }

    // Mirrors DIFF_CONFIG from config.js
    // Index 0 = 新兵(Rookie), 1 = 老手(Veteran), 2 = 精英(Elite), 3 = 深渊(Abyss)
    [CreateAssetMenu(fileName = "DifficultyConfig", menuName = "pxROG/Difficulty Config")]
    public class DifficultyConfig : ScriptableObject
    {
        public DifficultyLevel[] levels = new DifficultyLevel[]
        {
            new DifficultyLevel { name="新兵", description="简单：新手教学。初盘保护 45 秒。", hpMod=0.8f, dmgMod=1.0f, spawnMod=0.8f, ptMod=1.2f, playerHp=100, playerDamage=12, maxEnemies=20, protectionTime=45f },
            new DifficultyLevel { name="老手", description="普通：标准战斗。初盘保护 30 秒。", hpMod=1.0f, dmgMod=1.0f, spawnMod=1.0f, ptMod=1.0f, playerHp=100, playerDamage=12, maxEnemies=35, protectionTime=30f },
            new DifficultyLevel { name="精英", description="困难：高压集群。初盘保护 20 秒。", hpMod=1.5f, dmgMod=1.0f, spawnMod=1.5f, ptMod=1.0f, playerHp=100, playerDamage=12, maxEnemies=50, protectionTime=20f },
            new DifficultyLevel { name="深渊", description="深渊：残血高物价。初盘保护 15 秒。", hpMod=1.5f, dmgMod=1.25f, spawnMod=1.5f, ptMod=0.8f, playerHp=80, playerDamage=8, maxEnemies=70, protectionTime=15f }
        };

        public DifficultyLevel Get(int index) =>
            levels != null && index >= 0 && index < levels.Length ? levels[index] : levels[1];
    }
}
