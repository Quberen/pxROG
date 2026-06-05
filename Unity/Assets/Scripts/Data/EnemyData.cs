using UnityEngine;

namespace pxROG
{
    public enum EnemyRole { Fodder, Swarm, Elite, Special, Tank, Formation, Boss }

    // One asset per enemy type, e.g. "Locator", "Kamikaze", "Tank", etc.
    // Mirrors WORKSHOP.data.enemies entries from mod_workshop.js
    [CreateAssetMenu(fileName = "EnemyData_", menuName = "pxROG/Enemy Data")]
    public class EnemyData : ScriptableObject
    {
        [Header("Identity")]
        public string id;           // matches key in WORKSHOP.data.enemies
        public string displayName;
        public EnemyRole role;

        [Header("Base Stats")]
        public float hp = 12f;
        public int weight = 1;      // spawn pool weight
        public float unlockTime = 0f;

        [Header("Variant Flags")]
        public bool isSwarm;        // purple abyss variant
        public bool isHealer;       // drops hp packs
        public bool isBattery;      // drops energy crystals

        [Header("Visuals")]
        public Sprite sprite;
        [Tooltip("Override sprite when isSwarm=true")]
        public Sprite swarmSprite;
        [Tooltip("Override sprite when isHealer=true")]
        public Sprite healerSprite;
        [Tooltip("Override sprite when isBattery=true")]
        public Sprite batterySprite;
    }
}
