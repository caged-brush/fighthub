package com.kavyx.matchmaking.service;

import com.kavyx.matchmaking.model.Fighter;
import com.kavyx.matchmaking.repository.FighterRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class FighterService {
    private final FighterRepository fighterRepository;

    public FighterService(FighterRepository fighterRepository) {
        this.fighterRepository = fighterRepository;
    }

    public Optional<Fighter> getFighterById(UUID userId){
        return fighterRepository.findById(userId);
    }
}
