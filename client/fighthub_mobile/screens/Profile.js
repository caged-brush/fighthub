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
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Video } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";
import { useRoute } from "@react-navigation/native";

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile image and info row */}
        <View style={styles.fighterCard}>
          {/* Profile picture or default icon */}
          {isValidUrl(fighterInfo.profileUrl) ? (
            <Image
              source={{ uri: fighterInfo.profileUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.defaultIcon}>
              <Ionicons name="body-outline" size={70} color="#ffd700" />
            </View>
          )}

          <View style={styles.profileDetails}>
            <Text style={styles.fighterName}>
              {fighterInfo.fname} {fighterInfo.lname}
            </Text>
            <View style={styles.fightStatsRow}>
              <View style={styles.fightStat}>
                <Text style={styles.fightStatText}>{fighterInfo.wins}W</Text>
              </View>
              <View style={styles.fightStat}>
                <Text style={styles.fightStatText}>{fighterInfo.losses}L</Text>
              </View>
              <View style={styles.fightStat}>
                <Text style={styles.fightStatText}>{fighterInfo.draws}D</Text>
              </View>
            </View>
            <Text style={styles.infoText}>Style: {fighterInfo.style}</Text>
            <Text style={styles.infoText}>
              Weight: {fighterInfo.weight} lbs
            </Text>
            <Text style={styles.infoText}>Height: {fighterInfo.height} cm</Text>
            <View style={styles.statsRow}>
              <View style={styles.statsCol}>
                <Text style={styles.statsLabel}>Followers</Text>
                <Text style={styles.statsValue}>{followerCount}</Text>
              </View>
              <View style={styles.statsCol}>
                <Text style={styles.statsLabel}>Following</Text>
                <Text style={styles.statsValue}>{followingCount}</Text>
              </View>
            </View>
          </View>
        </View>
        {/* Follow/Unfollow or Edit/Logout buttons */}
        <View style={styles.buttonContainer}>
          {!viewingOwnProfile && (
            <CustomButton
              style={{ width: "90%" }}
              onPress={() => {
                if (isFollowing) {
                  handleUnfollow();
                } else {
                  handleFollow();
                }
              }}
            >
              <Text style={{ fontWeight: "bold", color: "#fff" }}>
                {isFollowing ? "Unfollow" : "Follow"}
              </Text>
            </CustomButton>
          )}
          {viewingOwnProfile && (
            <>
              <CustomButton style={{ width: "90%" }}>
                <Text style={{ fontWeight: "bold", color: "#fff" }}>
                  Edit profile
                </Text>
              </CustomButton>
              <CustomButton style={{ width: "90%" }} onPress={handleLogout}>
                <Text style={{ fontWeight: "bold", color: "#fff" }}>
                  Logout
                </Text>
              </CustomButton>
            </>
          )}
        </View>

        {/* User posts section as a grid */}
        <View style={styles.postsSection}>
          <Text style={styles.postsTitle}>Posts</Text>
          {userPosts.length === 0 ? (
            <Text style={styles.noPostsText}>No posts yet.</Text>
          ) : (
            <View style={styles.postsGrid}>
              {userPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
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
                      <View style={styles.postVideoPreview}>
                        <Ionicons name="play" size={40} color="#fff" />
                        <Text style={{ color: "#fff", marginTop: 8 }}>
                          Video
                        </Text>
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
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                {selectedPost &&
                  selectedPost.media_url &&
                  (selectedPost.media_url.endsWith(".jpg") ||
                  selectedPost.media_url.endsWith(".jpeg") ||
                  selectedPost.media_url.endsWith(".png") ? (
                    <Image
                      source={{ uri: ip + selectedPost.media_url }}
                      style={styles.modalImage}
                    />
                  ) : (
                    <Video
                      source={{ uri: ip + selectedPost.media_url }}
                      style={styles.modalVideo}
                      useNativeControls
                      resizeMode="contain"
                      isLooping
                    />
                  ))}
                {/* Like button and count */}
                <View style={styles.likeRow}>
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
                  <Text style={styles.likeCount}>{postLikes}</Text>
                  {likeError ? (
                    <Text style={styles.likeError}>{likeError}</Text>
                  ) : null}
                </View>
                <Text style={styles.modalCaption}>{selectedPost?.caption}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#181818",
  },
  container: {
    flex: 1,
    backgroundColor: "#181818", // dark, energetic background
  },
  fighterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#232323",
    borderRadius: 18,
    margin: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: "#e0245e", // Fighthub red
    shadowColor: "#e0245e",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#444",
    borderWidth: 3,
    borderColor: "#ffd700", // gold accent
  },
  defaultIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#444",
    borderWidth: 3,
    borderColor: "#ffd700",
    justifyContent: "center",
    alignItems: "center",
  },
  profileDetails: {
    flex: 1,
    marginLeft: 22,
    justifyContent: "center",
  },
  fighterName: {
    color: "#ffd700",
    fontWeight: "bold",
    fontSize: 28,
    letterSpacing: 1,
    marginBottom: 6,
  },
  fightStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  fightStat: {
    backgroundColor: "#e0245e",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginRight: 10,
  },
  fightStatText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 1,
  },
  infoText: {
    color: "#fff",
    fontSize: 15,
    marginBottom: 2,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 8,
    marginTop: 8,
  },
  statsCol: {
    marginRight: 24,
    alignItems: "center",
  },
  statsLabel: {
    color: "#ffd700",
    fontWeight: "bold",
    fontSize: 15,
  },
  statsValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  postsSection: {
    padding: 16,
  },
  postsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#ffd700",
    letterSpacing: 1,
  },
  noPostsText: {
    color: "#888",
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  postItem: {
    width: "48%",
    margin: "1%",
    aspectRatio: 1,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#232323",
    borderWidth: 2,
    borderColor: "#e0245e",
  },
  postVideoPreview: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#222",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#232323",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0245e",
  },
  modalImage: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 12,
  },
  modalVideo: {
    width: 300,
    height: 300,
    borderRadius: 10,
    marginBottom: 12,
  },
  likeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  likeCount: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#ffd700",
  },
  likeError: {
    color: "red",
    marginLeft: 8,
  },
  modalCaption: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
    color: "#ffd700",
  },
  closeButton: {
    marginTop: 12,
    backgroundColor: "#e0245e",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default Profile;
