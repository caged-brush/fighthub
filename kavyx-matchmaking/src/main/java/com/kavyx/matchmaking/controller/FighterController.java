package com.kavyx.matchmaking.controller;

import com.kavyx.matchmaking.service.FighterService;
import org.springframework.web.bind.annotation.RestController;
import com.kavyx.matchmaking.model.Fighter;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.UUID;

@RestController
@RequestMapping("/api/fighters")
public class FighterController {
    private final FighterService fighterService;

    public FighterController(FighterService fighterService) {
        this.fighterService = fighterService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Fighter> getFighterById(@PathVariable UUID userId){
        return fighterService.getFighterById(userId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}
