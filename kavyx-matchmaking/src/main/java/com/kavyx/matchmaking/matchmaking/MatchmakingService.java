package com.kavyx.matchmaking.matchmaking;

import com.kavyx.matchmaking.dto.MatchResult;
import com.kavyx.matchmaking.model.Fighter;
import com.kavyx.matchmaking.repository.FighterRepository;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class MatchmakingService {
    private final FighterRepository fighterRepository;

    public MatchmakingService(FighterRepository fighterRepository){
        this.fighterRepository = fighterRepository;
    }

    public int valueOrZero(Integer value){
        return value ==null ? 0 : value;
    }

    public List<MatchResult> findMatches(UUID fighterId){
        Fighter fighter = fighterRepository.findById(fighterId).orElseThrow(()->new RuntimeException("Fighter not found"));

        List<Fighter> candidates = fighterRepository.findByIsAvailableTrue();

        return candidates.stream().filter(candidate -> !candidate.getUserId().equals(fighterId)).map(candidate->{
            int score = calculateScore(fighter,candidate);
            return new MatchResult(candidate.getUserId(),score);
        }).sorted(Comparator.comparing(MatchResult::getScore).reversed()).toList();

    }

    private int calculateScore(Fighter fighter, Fighter candidate){
        int score = 0;

        if(fighter.getWeight() !=null && candidate.getWeight() !=null) {

            double weightDifference = Math.abs(fighter.getWeight() - candidate.getWeight());

            if (weightDifference <= 2) {
                score += 40;
            } else if (weightDifference <= 5) {
                score += 30;
            } else if (weightDifference <= 10) {
                score += 10;
            }
        }

        int fighterFights = valueOrZero(fighter.getWins()) + valueOrZero(fighter.getLosses()) + valueOrZero(fighter.getDraws());

        int candidateFights = valueOrZero(candidate.getWins()) + valueOrZero(candidate.getLosses()) + valueOrZero(candidate.getDraws());

        if(fighter.getWeight() != null && candidate.getWeight() != null) {


            int experienceDifference = Math.abs(fighterFights - candidateFights);

            if (experienceDifference <= 1) {
                score += 30;
            } else if (experienceDifference <= 3) {
                score += 20;
            } else if (experienceDifference <= 5) {
                score += 10;
            }
        }

        if(fighter.getWeightClass() != null && fighter.getWeightClass().equalsIgnoreCase(candidate.getWeightClass())){
            score += 30;
        }
        return score;
    }
}
