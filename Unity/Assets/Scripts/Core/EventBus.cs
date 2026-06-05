using System;
using System.Collections.Generic;

namespace pxROG
{
    // Events:
    //   ENTITY_DAMAGED   payload: EntityDamagedEvent
    //   ENTITY_DIED      payload: EntityDiedEvent
    //   WAVE_STARTED     payload: WaveStartedEvent
    //   UI_OPENED        payload: null
    //   UI_CLOSED        payload: null
    //   UI_UPDATE_REQUESTED  payload: null
    //   PLAYER_HEALED    payload: float (amount)
    //   PICKUP_COLLECTED payload: string (item id)
    public static class EventBus
    {
        static readonly Dictionary<string, List<Action<object>>> _listeners = new();

        public static void On(string ev, Action<object> cb)
        {
            if (!_listeners.ContainsKey(ev))
                _listeners[ev] = new List<Action<object>>();
            _listeners[ev].Add(cb);
        }

        public static void Off(string ev, Action<object> cb)
        {
            if (_listeners.TryGetValue(ev, out var list))
                list.Remove(cb);
        }

        public static void Emit(string ev, object data = null)
        {
            if (!_listeners.TryGetValue(ev, out var list)) return;
            // copy to avoid mutation during iteration
            foreach (var cb in new List<Action<object>>(list))
                cb?.Invoke(data);
        }

        public static void Clear() => _listeners.Clear();
    }

    // ---- Strongly-typed event payloads ----

    public struct EntityDamagedEvent
    {
        public string entityId;
        public float damage;
        public bool isCrit;
    }

    public struct EntityDiedEvent
    {
        public string entityId;
        public string entityType;
        public float ptValue;
    }

    public struct WaveStartedEvent
    {
        public string waveName;
        public string color;
    }
}
