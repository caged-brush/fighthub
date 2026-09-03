package com.kavyx.matchmaking.dto;

import java.util.UUID;

public class MatchResult {
    private UUID fighterId;
    private int score;

    public MatchResult(UUID fighterId, int score){
        this.fighterId = fighterId;
        this.score = score;
    }

    public UUID getFighterId() {
        return fighterId;
    }

    public int getScore() {
        return score;
    }
}
