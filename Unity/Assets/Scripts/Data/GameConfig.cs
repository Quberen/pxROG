using UnityEngine;

namespace pxROG
{
    // Single master ScriptableObject to wire up all sub-configs.
    // Assign this to GameManager in the Inspector.
    [CreateAssetMenu(fileName = "GameConfig", menuName = "pxROG/Game Config (Master)")]
    public class GameConfig : ScriptableObject
    {
        [Header("Core Configs")]
        public DifficultyConfig difficulty;
        public PhysicsConfig physics;
        public EconomyConfig economy;
        public RarityConfig rarity;

        [Header("Content")]
        public EnemyData[] enemies;
        public ItemData[] items;
        public LevelData[] levels;

        public EnemyData GetEnemy(string id)
        {
            foreach (var e in enemies)
                if (e.id == id) return e;
            return null;
        }

        public ItemData GetItem(string id)
        {
            foreach (var i in items)
                if (i.id == id) return i;
            return null;
        }

        public LevelData GetLevel(string id)
        {
            foreach (var l in levels)
                if (l.levelId == id) return l;
            return null;
        }
    }
}
