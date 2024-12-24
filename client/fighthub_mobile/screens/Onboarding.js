import {
  View,
  Text,
  Button,
  TextInput,
  TouchableOpacity,
  Platform,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import DatePicker from "react-native-date-picker";
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

  const handleLogout = () => {
    logout();
    console.log("Login out");
  };

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
        dob: selectedDate.toISOString().split("T")[0],
      });
    }
  };

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const handleNext = () => setStep((prevStep) => prevStep + 1);
  const handleBack = () => setStep((prevStep) => prevStep - 1);
  const handleChange = (field, value) => {
    setFighterInfo((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleFinish = async () => {
    const {
      weight_class,
      dob,
      wins,
      losses,
      draws,
      fight_style,
      profile_url,
      weight,
      height,
      userId,
    } = fighterInfo;

    try {
      const response = await axios.put(
        "http://10.50.228.148:5000/update-fighter",
        {
          weight_class,
          dob,
          wins,
          losses,
          draws,
          fight_style,
          profile_url,
          weight,
          height,
          userId,
        }
      );
      console.log("Submitting fighter data:", fighterInfo);
      if (response.data) {
        console.log("fighter created successfully");
        await completeOnboarding();
      } else {
        console.log(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fightStyleImage = [
    { style: "Wrestling", source: wrestlingImg },
    { style: "Boxing", source: boxingImg },
    { style: "Bjj", source: bjjImg },
    { style: "MMA", source: mmaImg },
    { style: "Muay thai", source: muayThaiImg },
    { style: "Kickboxing", source: kickboxingImg },
    { style: "Judo", source: judoImg },
  ];

  return (
    <ScrollView className="p-6 mt-10">
      <Text className="text-white">userId: {userId}</Text>
      <Button title="logout" onPress={handleLogout} />
      {step === 1 && (
        <>
          <Text className="text-white font-extrabold text-xl">
            Your birthday
          </Text>
          <TouchableOpacity
            onPress={() => {
              setShowDatePicker(true);
              console.log("TouchableOpacity pressed");
            }}
            className="bg-slate-500 rounded-lg h-10 p-2"
          >
            <TextInput
              editable={false}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="white"
              value={fighterInfo.dob}
            />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={fighterInfo.dob ? new Date(fighterInfo.dob) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()} // Restrict to past dates
              onChange={handleDateChange}
              style={{
                backgroundColor: "#f2f2f2", // Change the background color
                color: "#333", // Change the text color
              }}
            />
          )}

          <Text className="text-white font-extrabold text-xl mt-10">
            Record
          </Text>
          <View className="flex flex-row flex-wrap mt-5">
            <View>
              <Text className="text-white font-extrabold text-xl">Wins</Text>
              <TextInput
                className="bg-slate-500 rounded-lg h-10 w-28"
                value={fighterInfo.wins}
                onChangeText={(value) => {
                  handleChange("wins", parseInt(value || "0", 10));
                  //console.log(value);
                }}
                keyboardType="number-pad"
              />
            </View>
            <View className="ml-20">
              <Text className="text-white font-extrabold text-xl">Losses</Text>
              <TextInput
                className="bg-slate-500 rounded-lg h-10 w-28"
                value={fighterInfo.losses}
                onChangeText={(value) =>
                  handleChange("losses", parseInt(value || "0", 10))
                }
                keyboardType="number-pad"
              />
            </View>

            <Text className="text-white font-extrabold text-xl mt-5">Draw</Text>
            <TextInput
              className="bg-slate-500 rounded-lg h-10 w-full "
              value={fighterInfo.draws}
              onChangeText={(value) => {
                handleChange("draws", parseInt(value || "0", 10)),
                  console.log(value);
              }}
              keyboardType="number-pad"
            />
          </View>
          <CustomButton onPress={handleNext}>
            <Text className="text-white font-bold text-lg">Next</Text>
          </CustomButton>
        </>
      )}
      {step === 2 && (
        <>
          <Text className="text-white text-center font-bold text-xl">
            Physical Attribute
          </Text>

          <View className="flex flex-row flex-wrap mt-5">
            <View>
              <Text className="text-white font-extrabold text-xl">Height</Text>
              <TextInput
                className="bg-slate-500 rounded-lg h-10 w-28"
                onChangeText={(value) =>
                  handleChange("height", parseFloat(value || "0.0"))
                }
                keyboardType="decimal-pad"
              />
            </View>
            <View className="ml-20">
              <Text className="text-white font-extrabold text-xl">Weight</Text>
              <TextInput
                className="bg-slate-500 rounded-lg h-10 w-28"
                onChangeText={(value) =>
                  handleChange("weight", parseFloat(value || "0.0"))
                }
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <View className="mt-10">
            <CustomButton onPress={handleNext}>
              <Text className="text-white font-bold text-lg">Next</Text>
            </CustomButton>
            <CustomButton onPress={handleBack} style={{ marginTop: 10 }}>
              <Text className="text-white font-bold text-lg">Back</Text>
            </CustomButton>
          </View>
        </>
      )}
      {step === 3 && (
        <>
          <View className="flex flex-row flex-wrap justify-center">
            {fightStyleImage.map((item, index) => (
              <TouchableOpacity
                key={index}
                className={`m-3 ${
                  fighterInfo.fight_style === item.style
                    ? "border-4 border-blue-500"
                    : ""
                } rounded-lg`}
                onPress={() => {
                  handleChange("fight_style", item.style);
                  //console.log(`Selected fight style: ${item.style}`);
                }}
              >
                <Text
                  style={{ marginBottom: -20 }}
                  className="text-blue-500 text-lg font-bold text-center"
                >
                  {item.style}
                </Text>
                <Image
                  source={item.source}
                  className="h-32 w-32 rounded-lg -z-50 "
                />
              </TouchableOpacity>
            ))}
          </View>
          <View className="mt-10">
            <CustomButton onPress={handleFinish}>
              <Text className="text-white font-bold text-lg">Finish</Text>
            </CustomButton>
            <CustomButton onPress={handleBack} style={{ marginTop: 10 }}>
              <Text className="text-white font-bold text-lg">Back</Text>
            </CustomButton>
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default Onboarding;
