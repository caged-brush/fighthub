import { View, Text } from "react-native";
import React, { use, useState } from "react";
import { API_URL } from "../Constants";
import axios from "axios";

const ScoutProfile = () => {
  const [scoutData, setScoutData] = useState({
    scoutFName: "",
    scoutLName: "",
    scoutOrganization: "",
    scoutRegion: "",
  });

  const fetchScoutProfile = async () => {
    try {
    } catch (error) {}
  };
  return (
    <View>
      <Text>ScoutProfile</Text>
    </View>
  );
};

export default ScoutProfile;
