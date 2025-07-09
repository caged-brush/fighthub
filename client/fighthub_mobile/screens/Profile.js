import React, { useCallback, useEffect, useState, useContext } from "react";
import { ip } from "../Constants";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Image,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";
import { useRoute } from "@react-navigation/native";
import { set } from "date-fns";

// Helper function to check if a URL is valid (for profile images)
const isValidUrl = (url) => {
  return (
    typeof url === "string" &&
    url.length > 0 &&
    (url.startsWith("http://") || url.startsWith("https://"))
  );
};

// Profile screen component
const Profile = () => {
  // Navigation and authentication context
  const route = useRoute();
  const { logout, userId } = useContext(AuthContext);
  // Determine which profile is being viewed
  const profileUserId = route.params?.profileUserId ?? userId;
  const viewingOwnProfile = profileUserId === userId;
  // State for fighter info and UI
  const [fighterInfo, setFighterInfo] = useState({
    fname: "",
    lname: "",
    wins: 0.0,
    losses: 0.0,
    draws: 0.0,
    style: "",
    weight: 0.0,
    height: 0.0,
    profileUrl: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showFollow, setShowFollow] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Handle user logout
  const handleLogout = () => {
    console.log("Logging out");
    logout();
  };

  // Fetch user profile info, follower/following counts, and follow status
  const getUserProfile = async () => {
    try {
      // Get fighter info
      const response = await axios.post(`${ip}/fighter-info`, {
        userId: profileUserId || userId,
      });
      if (response.data) {
        const baseUrl = ip;
        const picUrl = response.data.profile_picture_url
          ? baseUrl + response.data.profile_picture_url
          : "";

        setFighterInfo({
          fname: response.data.fname || "",
          lname: response.data.lname || "",
          wins: response.data.wins || 0.0,
          losses: response.data.losses || 0.0,
          draws: response.data.draws || 0.0,
          style: response.data.fight_style || "",
          weight: response.data.weight || 0.0,
          height: response.data.height || 0.0,
          profileUrl: picUrl,
        });
      }

      // Fetch follower count
      try {
        const followerRes = await axios.post(`${ip}/follower-count`, {
          userId: profileUserId,
        });
        setFollowerCount(followerRes.data.count || 0);
      } catch (err) {
        setFollowerCount(0);
      }
      // Fetch following count
      try {
        const followingRes = await axios.post(`${ip}/following-count`, {
          userId: profileUserId,
        });
        setFollowingCount(followingRes.data.count || 0);
      } catch (err) {
        setFollowingCount(0);
      }

      // Check if current user is following the profile user
      if (!viewingOwnProfile) {
        try {
          const followRes = await axios.post(`${ip}/is-following`, {
            followerId: userId,
            followingId: profileUserId,
          });
          setIsFollowing(!!followRes.data.isFollowing);
        } catch (err) {
          console.log("Error checking follow status:", err);
        }
      }
    } catch (error) {
      console.log("Error fetching user profile:", error);
    }
  };

  // Handle follow action
  const handleFollow = async () => {
    try {
      const response = await axios.post(`${ip}/follow`, {
        followingId: profileUserId,
        followerId: userId,
      });

      if (
        response.data.message === "Followed successfully" ||
        response.data.message === "Already following"
      ) {
        console.log("Successfully followed user");
        setIsFollowing(true);
      } else {
        console.log("Failed to follow user:", response.data.message);
        // Handle failure case, e.g., show an alert or a toast message
      }
    } catch (error) {
      console.log("Error following user:", error);
      // Handle error appropriately, e.g., show an alert or a toast message
    }
  };

  // Handle unfollow action
  const handleUnfollow = async () => {
    try {
      const response = await axios.post(`${ip}/unfollow`, {
        followingId: profileUserId,
        followerId: userId,
      });

      if (response.data.message === "Unfollowed successfully") {
        console.log("Successfully unfollowed user");
        setIsFollowing(false);
      } else {
        console.log("Failed to unfollow user:", response.data.message);
        // Handle failure case, e.g., show an alert or a toast message
      }
    } catch (error) {
      console.log("Error unfollowing user:", error);
      // Handle error appropriately, e.g., show an alert or a toast message
    }
  };

  // Fetch profile info when profileUserId changes
  useEffect(() => {
    getUserProfile();
  }, [profileUserId]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getUserProfile();
    setRefreshing(false);
  }, [profileUserId]);

  // Render profile UI
  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile image and info row */}
      <View className="flex flex-row p-10 mt-20">
        {/* Profile picture or default icon */}
        {isValidUrl(fighterInfo.profileUrl) ? (
          <Image
            source={{ uri: fighterInfo.profileUrl }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              marginTop: 20,
            }}
          />
        ) : (
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 50,
              borderColor: "black",
              borderWidth: 2,
              justifyContent: "center",
              alignItems: "center",
              marginTop: 20,
              marginBottom: 20,
            }}
          >
            <Ionicons name="person" size={50} color="black" />
          </View>
        )}

        {/* Profile details */}
        <View className="flex flex-col ml-16">
          {/* User name */}
          <View className="flex flex-row">
            <Text className="text-black mr-1 font-bold">
              {fighterInfo.fname}
            </Text>
            <Text className="text-black font-bold">{fighterInfo.lname}</Text>
          </View>

          {/* Follower/Following counts row */}
          <View className="flex flex-row mb-1 mt-1">
            <View className="flex flex-col mb-1 mt-1">
              <Text className="text-black mr-4 font-bold">Followers</Text>
              <Text>{followerCount}</Text>
            </View>
            <View className="flex flex-col mb-1 mt-1">
              <Text className="text-black font-bold">Following</Text>
              <Text>{followingCount}</Text>
            </View>
          </View>

          {/* Fight stats */}
          <View className="flex flex-row">
            <Text className="text-black">{fighterInfo.wins}-</Text>
            <Text className="text-black">{fighterInfo.losses}-</Text>
            <Text className="text-black">{fighterInfo.draws}</Text>
          </View>

          {/* Additional info */}
          <Text className="text-black">Style: {fighterInfo.style}</Text>
          <Text className="text-black">Weight: {fighterInfo.weight} lbs</Text>
          <Text className="text-black">Height: {fighterInfo.height} cm</Text>
        </View>
      </View>
      {/* Follow/Unfollow or Edit/Logout buttons */}
      <View className="flex items-center justify-center">
        {!viewingOwnProfile && (
          <CustomButton
            className="w-96"
            onPress={() => {
              if (isFollowing) {
                handleUnfollow();
              } else {
                handleFollow();
              }
            }}
          >
            <Text className="font-bold text-white">
              {isFollowing ? "Unfollow" : "Follow"}
            </Text>
          </CustomButton>
        )}
        {viewingOwnProfile && (
          <>
            <CustomButton className="w-96">
              <Text className="font-bold text-white">Edit profile</Text>
            </CustomButton>
            <CustomButton className="w-96" onPress={handleLogout}>
              <Text className="font-bold text-white">Logout</Text>
            </CustomButton>
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default Profile;
