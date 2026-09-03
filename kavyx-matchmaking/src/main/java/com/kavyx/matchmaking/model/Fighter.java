package com.kavyx.matchmaking.model;

import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "fighters")
public class Fighter {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "weight_class")
    private String weightClass;

    private Integer wins;

    private Integer losses;

    private Integer draws;

    @Column(name = "fight_style")
    private String fightStyle;

    private Double weight;

    private Double height;

    @Column(name = "is_available")
    private Boolean isAvailable;

    public Fighter(){}

    public UUID getUserId() {
        return userId;
    }

    public String getWeightClass() {
        return weightClass;
    }

    public Integer getWins() {
        return wins;
    }

    public Integer getLosses() {
        return losses;
    }

    public Integer getDraws() {
        return draws;
    }

    public String getFightStyle() {
        return fightStyle;
    }

    public Double getWeight() {
        return weight;
    }

    public Double getHeight() {
        return height;
    }

    public Boolean getIsAvailable() {
        return isAvailable;
    }


}

