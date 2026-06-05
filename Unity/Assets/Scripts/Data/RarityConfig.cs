using UnityEngine;

namespace pxROG
{
    [System.Serializable]
    public class RarityEntry
    {
        public string key;          // "C" "R" "E" "L"
        public string displayName;  // "普通" "稀有" "史诗" "传说"
        public Color color;
        public int weight;
    }

    [CreateAssetMenu(fileName = "RarityConfig", menuName = "pxROG/Rarity Config")]
    public class RarityConfig : ScriptableObject
    {
        // Default: C=50, R=30, E=15, L=5
        public RarityEntry[] rarities;

        public RarityEntry Get(string key)
        {
            foreach (var r in rarities)
                if (r.key == key) return r;
            return rarities[0];
        }

        public string WeightedRandom()
        {
            int total = 0;
            foreach (var r in rarities) total += r.weight;

            int roll = Random.Range(0, total);
            int acc = 0;
            foreach (var r in rarities)
            {
                acc += r.weight;
                if (roll < acc) return r.key;
            }
            return rarities[rarities.Length - 1].key;
        }
    }
}
