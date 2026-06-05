namespace pxROG
{
    public enum GameState
    {
        Start,
        Playing,
        Paused,
        Terminal,
        Settings,
        GameOver
    }

    public enum EndingState
    {
        None,
        PlayerDead,
        BossDead
    }
}
