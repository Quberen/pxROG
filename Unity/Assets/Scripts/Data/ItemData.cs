using UnityEngine;

namespace pxROG
{
    public enum ItemType { Equip, Stat, Utility, Upgrade }
    public enum ItemRarity { C, R, E, L }

    // One asset per upgrade/item, e.g. "high_explosive", "heal", "laser"
    // Merges baseUpgradePool (config.js) with WORKSHOP.data.items pricing
    [CreateAssetMenu(fileName = "ItemData_", menuName = "pxROG/Item Data")]
    public class ItemData : ScriptableObject
    {
        [Header("Identity")]
        public string id;
        public string displayName;
        [TextArea(1, 3)] public string description;
        public ItemType itemType;
        public ItemRarity rarity;

        [Header("Cost")]
        [Tooltip("First purchase cost. -1 = use 'cost'")]
        public float initialCost = -1f;
        public float cost = 1.0f;
        public float costStep = 0f;

        [Header("Stack Limit")]
        public int max = 1;

        [Header("Equipment Slot")]
        public int slotCost = 0;
        public bool canUnequip = true;

        [Header("Unlock Requirements")]
        public float unlockPT = 0f;
        public float unlockTime = 0f;

        [Header("Visuals")]
        public Sprite icon;

        public float GetCostAtLevel(int level)
        {
            float first = initialCost >= 0 ? initialCost : cost;
            if (level == 0) return first;
            return cost + costStep * (level - 1);
        }
    }
}
