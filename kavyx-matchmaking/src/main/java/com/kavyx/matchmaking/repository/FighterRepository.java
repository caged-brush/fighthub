package com.kavyx.matchmaking.repository;

import com.kavyx.matchmaking.model.Fighter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FighterRepository extends JpaRepository<Fighter, UUID> {
    List<Fighter> findByIsAvailableTrue();
}

