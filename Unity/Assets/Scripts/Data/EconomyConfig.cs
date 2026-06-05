using UnityEngine;

namespace pxROG
{
    [CreateAssetMenu(fileName = "EconomyConfig", menuName = "pxROG/Economy Config")]
    public class EconomyConfig : ScriptableObject
    {
        [Tooltip("PT inflation increase per purchase")]
        public float inflationGrowth = 5.0f;

        [Tooltip("Minimum PT cost to trigger inflation")]
        public float inflationMinBuy = 10.0f;

        [Tooltip("Inflation decay per second out of combat")]
        public float coolingRate = 0.4f;

        [Tooltip("Inflation added on shop refresh")]
        public float refreshInflation = 5.0f;

        [Tooltip("Fixed PT cost to refresh the shop")]
        public float refreshCost = 1.0f;

        [Tooltip("HP restored by a heal pickup")]
        public float healPickupAmount = 20f;
    }
}
