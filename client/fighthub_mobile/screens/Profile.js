import React, { useCallback, useEffect, useState, useContext } from "react";
import { ip } from "../Constants";
import {
  Pressable,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Video } from "expo-av";
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
  const [userPosts, setUserPosts] = useState([]);
  // Modal state for post preview
  const [selectedPost, setSelectedPost] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [postLikes, setPostLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  // Fetch likes for selected post
  useEffect(() => {
    const fetchLikes = async () => {
      if (!selectedPost) return;
      try {
        const res = await axios.post(`${ip}/like-count`, {
          postId: selectedPost.id,
        });
        setPostLikes(res.data.likes || 0);
        // Check if user has liked using /liked-posts
        const likedRes = await axios.post(`${ip}/liked-posts`, {
          userId,
        });
        const likedPostIds = likedRes.data.likedPostIds || [];
        setHasLiked(likedPostIds.includes(selectedPost.id));
      } catch (err) {
        setPostLikes(0);
        setHasLiked(false);
      }
    };
    if (modalVisible && selectedPost) {
      fetchLikes();
    }
  }, [modalVisible, selectedPost, userId]);

  // Like/unlike handler
  const handleLike = async () => {
    if (!selectedPost) return;
    setLikeLoading(true);
    setLikeError("");
    try {
      if (hasLiked) {
        // Unlike
        await axios.post(`${ip}/unlike`, {
          userId,
          postId: selectedPost.id,
        });
        setHasLiked(false);
        setPostLikes((prev) => Math.max(prev - 1, 0));
      } else {
        // Like
        await axios.post(`${ip}/like`, {
          userId,
          postId: selectedPost.id,
        });
        setHasLiked(true);
        setPostLikes((prev) => prev + 1);
      }
    } catch (err) {
      setLikeError("Error updating like");
    }
    setLikeLoading(false);
  };
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

  const getUserPost = async () => {
    try {
      const response = await axios.get(`${ip}/posts/${profileUserId}`);
      // Handle successful response
      console.log("User posts fetched successfully:", response.data);
      if (response.data && response.data.length > 0) {
        console.log("Setting user posts:", response.data);

        setUserPosts(response.data);
      }
    } catch (error) {
      console.log("Error fetching user posts:", error);
      // Handle error appropriately, e.g., show an alert or a toast message
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

  useEffect(() => {
    getUserPost();
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

      {/* User posts section as a grid */}
      <View className="p-6">
        <Text className="text-xl font-bold mb-4 text-black">Posts</Text>
        {userPosts.length === 0 ? (
          <Text className="text-gray-500">No posts yet.</Text>
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "flex-start",
            }}
          >
            {userPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={{
                  width: "48%",
                  margin: "1%",
                  aspectRatio: 1,
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: "#f3f3f3",
                }}
                onPress={() => {
                  setSelectedPost(post);
                  setModalVisible(true);
                }}
              >
                {post.media_url &&
                  (post.media_url.endsWith(".jpg") ||
                  post.media_url.endsWith(".jpeg") ||
                  post.media_url.endsWith(".png") ? (
                    <Image
                      source={{ uri: ip + post.media_url }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <View
                      style={{
                        width: "100%",
                        height: "100%",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "#222",
                      }}
                    >
                      <Ionicons name="play" size={40} color="#fff" />
                      <Text style={{ color: "#fff", marginTop: 8 }}>Video</Text>
                    </View>
                  ))}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Modal for post preview */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.8)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "90%",
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
            >
              {selectedPost &&
                selectedPost.media_url &&
                (selectedPost.media_url.endsWith(".jpg") ||
                selectedPost.media_url.endsWith(".jpeg") ||
                selectedPost.media_url.endsWith(".png") ? (
                  <Image
                    source={{ uri: ip + selectedPost.media_url }}
                    style={{
                      width: 300,
                      height: 300,
                      borderRadius: 10,
                      marginBottom: 12,
                    }}
                  />
                ) : (
                  <Video
                    source={{ uri: ip + selectedPost.media_url }}
                    style={{
                      width: 300,
                      height: 300,
                      borderRadius: 10,
                      marginBottom: 12,
                    }}
                    useNativeControls
                    resizeMode="contain"
                    isLooping
                  />
                ))}
              {/* Like button and count */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  onPress={handleLike}
                  disabled={likeLoading}
                  style={{ marginRight: 10 }}
                >
                  <Ionicons
                    name={hasLiked ? "heart" : "heart-outline"}
                    size={28}
                    color={hasLiked ? "#e0245e" : "#222"}
                  />
                </TouchableOpacity>
                <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                  {postLikes}
                </Text>
                {likeError ? (
                  <Text style={{ color: "red", marginLeft: 8 }}>
                    {likeError}
                  </Text>
                ) : null}
              </View>
              <Text
                style={{ fontWeight: "bold", fontSize: 18, marginBottom: 8 }}
              >
                {selectedPost?.caption}
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  backgroundColor: "#222",
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

export default Profile;
