import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomButton from "../component/CustomButton";
import wrestlingImg from "../images/wrestling.jpg";
import boxingImg from "../images/boxing.jpg";
import bjjImg from "../images/bjj.jpg";
import mmaImg from "../images/mma.jpg";
import muayThaiImg from "../images/muay_thai.jpg";
import kickboxingImg from "../images/kickboxing.jpg";
import judoImg from "../images/judo.jpg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { API_URL } from "../Constants";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#181818",
  },
  scroll: {
    padding: 24,
    backgroundColor: "#181818",
  },
  sectionTitle: {
    color: "#ffd700",
    fontWeight: "bold",
    fontSize: 22,
    marginBottom: 18,
    letterSpacing: 1,
    textAlign: "center",
  },
  label: {
    color: "#ffd700",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#232323",
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#fff",
    borderWidth: 2,
    borderColor: "#e0245e",
    marginBottom: 12,
  },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recordCol: {
    flex: 1,
    marginHorizontal: 8,
  },
  fightStylesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 18,
  },
  fightStyleCard: {
    margin: 8,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#232323",
    overflow: "hidden",
    alignItems: "center",
    backgroundColor: "#232323",
    width: 120,
    elevation: 2,
  },
  fightStyleSelected: {
    borderColor: "#e0245e",
    backgroundColor: "#292929",
  },
  fightStyleText: {
    color: "#e0245e",
    fontWeight: "bold",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  fightStyleImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 8,
  },
  profilePicContainer: {
    alignItems: "center",
    marginVertical: 18,
  },
  profilePic: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "#ffd700",
    backgroundColor: "#232323",
  },
  selectPhotoText: {
    color: "#ffd700",
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 10,
    marginBottom: 8,
    textAlign: "center",
  },
  button: {
    marginVertical: 8,
  },
});

const fightStyleImage = [
  { style: "Wrestling", source: wrestlingImg },
  { style: "Boxing", source: boxingImg },
  { style: "Bjj", source: bjjImg },
  { style: "MMA", source: mmaImg },
  { style: "Muay thai", source: muayThaiImg },
  { style: "Kickboxing", source: kickboxingImg },
  { style: "Judo", source: judoImg },
];

const Onboarding = () => {
  const { logout, completeOnboarding, userId } = useContext(AuthContext);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [step, setStep] = useState(1);
  const [fighterInfo, setFighterInfo] = useState({
    weight_class: "",
    dob: "",
    wins: 0,
    losses: 0,
    draws: 0,
    profile_url: "",
    height: 0.0,
    weight: 0.0,
    fight_style: "",
    userId: userId,
  });

  useEffect(() => {
    const saveStep = async () => {
      try {
        await AsyncStorage.setItem("onboardingStep", step.toString());
      } catch (error) {
        console.log("failed to save step", error);
      }
    };
    saveStep();
  }, [step]);

  useEffect(() => {
    const loadStep = async () => {
      try {
        const savedStep = await AsyncStorage.getItem("onboardingStep");
        if (savedStep) {
          setStep(parseInt(savedStep, 10));
        }
      } catch (error) {
        console.log("Failed to load step: ", error);
      }
    };
    loadStep();
  }, []);

  const handleDateChange = (e, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFighterInfo({
        ...fighterInfo,
        dob: selectedDate.toLocaleDateString("en-CA"),
      });
    }
  };

  const handleNext = () => setStep((prevStep) => prevStep + 1);
  const handleBack = () => setStep((prevStep) => prevStep - 1);
  const handleChange = (field, value) => {
    setFighterInfo((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleFinish = async () => {
    try {
      const response = await axios.put(
        `${API_URL}/fighters/me`,
        {
          weight_class: fighterInfo.weight_class,
          date_of_birth: fighterInfo.dob,
          wins: fighterInfo.wins,
          losses: fighterInfo.losses,
          draws: fighterInfo.draws,
          fight_style: fighterInfo.fight_style,
          height: fighterInfo.height,
          weight: fighterInfo.weight,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data) {
        await completeOnboarding();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleImagePick = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission to access the media library is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFighterInfo((prevState) => ({
        ...prevState,
        profile_url: result.assets[0].uri,
      }));
    }
  };
  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>
              Your Birthday & Fight Record
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={{
                backgroundColor: "#232323",
                borderRadius: 10,
                height: 44,
                justifyContent: "center",
                paddingHorizontal: 14,
                marginBottom: 18,
                borderWidth: 2,
                borderColor: "#e0245e",
              }}
            >
              <Text style={{ color: "#ffd700", fontSize: 16 }}>
                {fighterInfo.dob || "YYYY-MM-DD"}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={fighterInfo.dob ? new Date(fighterInfo.dob) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                maximumDate={new Date()}
                onChange={handleDateChange}
                style={{
                  backgroundColor: "#232323",
                  color: "#ffd700",
                }}
              />
            )}
            <View style={styles.recordRow}>
              <View style={styles.recordCol}>
                <Text style={styles.label}>Wins</Text>
                <TextInput
                  style={styles.input}
                  value={fighterInfo.wins.toString()}
                  onChangeText={(value) =>
                    handleChange("wins", parseInt(value || "0", 10))
                  }
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.recordCol}>
                <Text style={styles.label}>Losses</Text>
                <TextInput
                  style={styles.input}
                  value={fighterInfo.losses.toString()}
                  onChangeText={(value) =>
                    handleChange("losses", parseInt(value || "0", 10))
                  }
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.recordCol}>
                <Text style={styles.label}>Draws</Text>
                <TextInput
                  style={styles.input}
                  value={fighterInfo.draws.toString()}
                  onChangeText={(value) =>
                    handleChange("draws", parseInt(value || "0", 10))
                  }
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <CustomButton style={styles.button} onPress={handleNext}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                Next
              </Text>
            </CustomButton>
            <CustomButton style={styles.button} onPress={handleLogout}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                Logout
              </Text>
            </CustomButton>
          </>
        )}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Physical Attributes</Text>
            <View style={styles.recordRow}>
              <View style={styles.recordCol}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={fighterInfo.height.toString()}
                  onChangeText={(value) =>
                    handleChange("height", parseFloat(value || "0.0"))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.recordCol}>
                <Text style={styles.label}>Weight (lbs)</Text>
                <TextInput
                  style={styles.input}
                  value={fighterInfo.weight.toString()}
                  onChangeText={(value) =>
                    handleChange("weight", parseFloat(value || "0.0"))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <CustomButton style={styles.button} onPress={handleNext}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                Next
              </Text>
            </CustomButton>
            <CustomButton style={styles.button} onPress={handleBack}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                Back
              </Text>
            </CustomButton>
          </>
        )}
        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Choose Your Fight Style</Text>
            <View style={styles.fightStylesGrid}>
              {fightStyleImage.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.fightStyleCard,
                    fighterInfo.fight_style === item.style &&
                      styles.fightStyleSelected,
                  ]}
                  onPress={() => handleChange("fight_style", item.style)}
                >
                  <Text style={styles.fightStyleText}>{item.style}</Text>
                  <Image source={item.source} style={styles.fightStyleImage} />
                </TouchableOpacity>
              ))}
            </View>
            <CustomButton style={styles.button} onPress={handleNext}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                Next
              </Text>
            </CustomButton>
            <CustomButton style={styles.button} onPress={handleBack}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                Back
              </Text>
            </CustomButton>
          </>
        )}
        {step === 4 && (
          <>
            <Text style={styles.sectionTitle}>Upload Profile Picture</Text>
            <TouchableOpacity
              onPress={handleImagePick}
              style={styles.profilePicContainer}
            >
              <Text style={styles.selectPhotoText}>Select a Photo</Text>
              {fighterInfo.profile_url ? (
                <Image
                  source={{ uri: fighterInfo.profile_url }}
                  style={styles.profilePic}
                />
              ) : (
                <Ionicons name="body-outline" size={70} color="#ffd700" />
              )}
            </TouchableOpacity>
            <CustomButton style={styles.button} onPress={handleFinish}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                Finish
              </Text>
            </CustomButton>
            <CustomButton style={styles.button} onPress={handleBack}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
                Back
              </Text>
            </CustomButton>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Onboarding;
