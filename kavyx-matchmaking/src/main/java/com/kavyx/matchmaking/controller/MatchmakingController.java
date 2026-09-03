package com.kavyx.matchmaking.controller;

import com.kavyx.matchmaking.dto.MatchResult;
import com.kavyx.matchmaking.matchmaking.MatchmakingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/matches")
public class MatchmakingController {
    private final MatchmakingService matchmakingService;

    public MatchmakingController(MatchmakingService matchmakingService){
        this.matchmakingService = matchmakingService;
    }

    @GetMapping("/{fighterId}")
    public List<MatchResult> getMatches(@PathVariable UUID fighterId){
        return matchmakingService.findMatches(fighterId);
    }
}
