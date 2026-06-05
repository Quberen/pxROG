using UnityEngine;

namespace pxROG
{
    // ---- Wave Timeline (sector1 style) ----

    public enum ExitRuleType { TimeLimit, ClearAll, PlayerHpBelow }
    public enum ExitLogic { OR, AND }

    [System.Serializable]
    public class ExitRule
    {
        public ExitRuleType type;
        public float value;
    }

    [System.Serializable]
    public class ExitCondition
    {
        public ExitLogic logic = ExitLogic.OR;
        public ExitRule[] rules;
    }

    [System.Serializable]
    public class WaveTimelineEntry
    {
        public string waveType;     // "p1_intro", "p0_rest", etc.
        [Tooltip("-1 means use exitCondition instead")]
        public float duration = -1f;
        public ExitCondition exitCondition;
    }

    // ---- Choreography (neon_crash style) ----

    public enum ChoreographyAction { SPAWN, MESSAGE, WAVE_TOAST }

    [System.Serializable]
    public class ChoreographyEvent
    {
        public float time;
        public ChoreographyAction action;

        [Tooltip("Enemy type id for SPAWN action")]
        public string spawnType;

        [Tooltip("X position for SPAWN. -1 = random")]
        public float spawnX = -1f;

        [Tooltip("Message text for MESSAGE / WAVE_TOAST")]
        public string text;

        [Tooltip("Hex color string, e.g. '#00e676'")]
        public string color;
    }

    // ---- Level Overrides (neon_crash mechanics) ----

    [System.Serializable]
    public class LevelOverrides
    {
        public bool disableCollisionDamage;
        public bool rammingTriggersAOE;
        public float damageMultiplier = 1f;  // e.g. 0.1 = 90% reduction
    }

    // ---- Master Level Asset ----

    // Mirrors a cassette entry from WORKSHOP.cassettes
    [CreateAssetMenu(fileName = "LevelData_", menuName = "pxROG/Level Data")]
    public class LevelData : ScriptableObject
    {
        [Header("Identity")]
        public string levelId;          // "sector1", "neon_crash", "debug"
        public string displayName;

        [Header("Shop")]
        public string[] shopItemIds;    // item ids available in shop

        [Header("Spawn Pool")]
        [Tooltip("Leave empty to allow ALL enemy types")]
        public EnemyData[] allowedEnemies;

        [Header("Director Mode")]
        [Tooltip("True = use timeline waves; False = use choreography")]
        public bool useTimeline = true;
        public WaveTimelineEntry[] timeline;
        public ChoreographyEvent[] choreography;

        [Header("Neon Crash: Rhythm Level Settings")]
        public int bpm = 120;
        public LevelOverrides overrides;
    }
}
