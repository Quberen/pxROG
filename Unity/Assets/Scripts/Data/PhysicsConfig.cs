using UnityEngine;

namespace pxROG
{
    [CreateAssetMenu(fileName = "PhysicsConfig", menuName = "pxROG/Physics Config")]
    public class PhysicsConfig : ScriptableObject
    {
        [Header("HP Bar Spring")]
        public float hpBounceForce = 0.6f;
        public float hpDamping = 0.65f;

        [Header("Skill Vibration")]
        public float skillVibrateForce = 20f;

        [Header("Damage Text (Player)")]
        public float dmgTextSpeedX = 3f;
        public float dmgTextSpeedY = -4f;
        public float dmgTextGravity = 0.25f;
    }
}
