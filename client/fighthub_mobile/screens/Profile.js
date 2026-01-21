import React, { useCallback, useEffect, useState, useContext } from "react";
import {
  Text,
  View,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Video } from "expo-av";
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";
import { useNavigation, useRoute } from "@react-navigation/native";
import { API_URL } from "../Constants";

const isValidUrl = (url) =>
  typeof url === "string" &&
  url.length > 0 &&
  (url.startsWith("http://") || url.startsWith("https://"));

const getFullMediaUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
};

const isImage = (url) =>
  typeof url === "string" &&
  (url.toLowerCase().endsWith(".jpg") ||
    url.toLowerCase().endsWith(".jpeg") ||
    url.toLowerCase().endsWith(".png"));

export default function Profile() {
  const route = useRoute();
  const { logout, userId: authedUserId, userToken } = useContext(AuthContext);
  const navigation = useNavigation();

  // Accept either param name from navigation
  const profileUserId =
    route.params?.profileUserId ?? route.params?.userId ?? authedUserId;

  const viewingOwnProfile = profileUserId === authedUserId;

  const [fighterInfo, setFighterInfo] = useState({
    fname: "",
    lname: "",
    region: "",
    weight_class: "",
    gym: "",
    bio: "",
    is_available: false,

    wins: 0,
    losses: 0,
    draws: 0,
    fight_style: "",
    weight: null,
    height: null,
    profileUrl: "",
  });

  const [profileNotFound, setProfileNotFound] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [userPosts, setUserPosts] = useState([]);

  const [selectedPost, setSelectedPost] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState("");
  const [postLikes, setPostLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  const getUserProfile = useCallback(async () => {
    if (!profileUserId) return;

    setProfileNotFound(false);

    try {
      const res = await axios.get(`${API_URL}/fighters/${profileUserId}`);
      const f = res.data;

      const pic = f?.users?.profile_picture_url || "";
      const base = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      const picUrl =
        pic && typeof pic === "string"
          ? `${base}${pic.startsWith("/") ? "" : "/"}${pic}`
          : "";

      setFighterInfo({
        fname: f?.users?.fname || "",
        lname: f?.users?.lname || "",

        region: f?.users?.region || f?.region || "",
        weight_class: f?.weight_class || "",
        gym: f?.gym || "",
        bio: f?.bio || "",
        is_available: !!f?.is_available,

        wins: f?.wins ?? 0,
        losses: f?.losses ?? 0,
        draws: f?.draws ?? 0,
        fight_style: f?.fight_style || "",

        weight: f?.weight ?? null,
        height: f?.height ?? null,

        profileUrl: picUrl,
      });

      // follower count (for THIS profile)
      try {
        const followerRes = await axios.post(`${API_URL}/follower-count`, {
          userId: profileUserId,
        });
        setFollowerCount(followerRes.data.count || 0);
      } catch {
        setFollowerCount(0);
      }

      // following count (for THIS profile)
      try {
        const followingRes = await axios.post(`${API_URL}/following-count`, {
          userId: profileUserId,
        });
        setFollowingCount(followingRes.data.count || 0);
      } catch {
        setFollowingCount(0);
      }

      // follow status (current user -> profile user)
      if (!viewingOwnProfile) {
        try {
          const followRes = await axios.post(`${API_URL}/is-following`, {
            followerId: authedUserId,
            followingId: profileUserId,
          });
          setIsFollowing(!!followRes.data.isFollowing);
        } catch {
          setIsFollowing(false);
        }
      } else {
        setIsFollowing(false);
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message;

      console.log("GET /fighters/:userId failed:", status, msg);

      if (status === 404) {
        setProfileNotFound(true);
        return;
      }

      Alert.alert("Error", "Failed to load fighter profile.");
    }
  }, [profileUserId, viewingOwnProfile, authedUserId]);

  const getUserPost = useCallback(async () => {
    if (!profileUserId) return;

    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      const response = await axios.get(
        `${API_URL}/fight-clips/user/${profileUserId}`,
        { headers },
      );

      // console.log("USER CLIPS:", response.data?.clips);

      setUserPosts(
        Array.isArray(response.data?.clips) ? response.data.clips : [],
      );
    } catch (error) {
      console.log(
        "Error fetching user posts:",
        error?.response?.data || error?.message,
      );
      setUserPosts([]);
    }
  }, [profileUserId, userToken]);

  // Fetch likes when opening modal
  useEffect(() => {
    const fetchLikes = async () => {
      if (!selectedPost) return;

      try {
        const res = await axios.post(`${API_URL}/like-count`, {
          postId: selectedPost.id,
        });
        setPostLikes(res.data.likes || 0);

        const likedRes = await axios.post(`${API_URL}/liked-posts`, {
          userId: authedUserId,
        });
        const likedPostIds = likedRes.data.likedPostIds || [];
        setHasLiked(likedPostIds.includes(selectedPost.id));
      } catch {
        setPostLikes(0);
        setHasLiked(false);
      }
    };

    if (modalVisible && selectedPost) fetchLikes();
  }, [modalVisible, selectedPost, authedUserId]);

  const handleLike = async () => {
    if (!selectedPost) return;

    setLikeLoading(true);
    setLikeError("");

    try {
      if (hasLiked) {
        await axios.post(`${API_URL}/unlike`, {
          userId: authedUserId,
          postId: selectedPost.id,
        });
        setHasLiked(false);
        setPostLikes((p) => Math.max(p - 1, 0));
      } else {
        await axios.post(`${API_URL}/like`, {
          userId: authedUserId,
          postId: selectedPost.id,
        });
        setHasLiked(true);
        setPostLikes((p) => p + 1);
      }
    } catch {
      setLikeError("Error updating like");
    } finally {
      setLikeLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const response = await axios.post(`${API_URL}/follow`, {
        followingId: profileUserId,
        followerId: authedUserId,
      });
      if (response.data?.message) setIsFollowing(true);
    } catch (error) {
      console.log(
        "Error following user:",
        error?.response?.data || error?.message,
      );
    }
  };

  const handleUnfollow = async () => {
    try {
      const response = await axios.post(`${API_URL}/unfollow`, {
        followingId: profileUserId,
        followerId: authedUserId,
      });
      if (response.data?.message) setIsFollowing(false);
    } catch (error) {
      console.log(
        "Error unfollowing user:",
        error?.response?.data || error?.message,
      );
    }
  };

  useEffect(() => {
    getUserProfile();
    getUserPost();
  }, [getUserProfile, getUserPost]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([getUserProfile(), getUserPost()]);
    setRefreshing(false);
  }, [getUserProfile, getUserPost]);

  const availabilityLabel = fighterInfo.is_available
    ? "AVAILABLE"
    : "NOT AVAILABLE";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {profileNotFound ? (
          <View style={styles.notFoundBox}>
            <Text style={styles.notFoundTitle}>Fighter profile not found</Text>
            <Text style={styles.notFoundText}>
              This user has not completed fighter onboarding yet (no row in
              fighters table).
            </Text>

            {viewingOwnProfile ? (
              <Text style={styles.notFoundText}>
                Go complete onboarding to create your fighter profile.
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <View style={styles.fighterCard}>
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

                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.badge,
                      fighterInfo.is_available
                        ? styles.badgeOn
                        : styles.badgeOff,
                    ]}
                  >
                    <Text style={styles.badgeText}>{availabilityLabel}</Text>
                  </View>

                  {!!fighterInfo.region && (
                    <View style={styles.badgeMuted}>
                      <Text style={styles.badgeTextMuted}>
                        {fighterInfo.region}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.fightStatsRow}>
                  <View style={styles.fightStat}>
                    <Text style={styles.fightStatText}>
                      {fighterInfo.wins}W
                    </Text>
                  </View>
                  <View style={styles.fightStat}>
                    <Text style={styles.fightStatText}>
                      {fighterInfo.losses}L
                    </Text>
                  </View>
                  <View style={styles.fightStat}>
                    <Text style={styles.fightStatText}>
                      {fighterInfo.draws}D
                    </Text>
                  </View>
                </View>

                <Text style={styles.infoText}>
                  Weight Class: {fighterInfo.weight_class || "—"}
                </Text>
                <Text style={styles.infoText}>
                  Style: {fighterInfo.fight_style || "—"}
                </Text>
                <Text style={styles.infoText}>
                  Gym: {fighterInfo.gym || "—"}
                </Text>

                <Text style={styles.infoText}>
                  Weight: {fighterInfo.weight ?? "—"} lbs
                </Text>
                <Text style={styles.infoText}>
                  Height: {fighterInfo.height ?? "—"} cm
                </Text>

                {!!fighterInfo.bio && (
                  <View style={styles.bioBox}>
                    <Text style={styles.bioTitle}>Bio</Text>
                    <Text style={styles.bioText}>{fighterInfo.bio}</Text>
                  </View>
                )}

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

            <View style={styles.buttonContainer}>
              {!viewingOwnProfile ? (
                <CustomButton
                  style={{ width: "90%" }}
                  onPress={() =>
                    isFollowing ? handleUnfollow() : handleFollow()
                  }
                >
                  <Text style={{ fontWeight: "bold", color: "#fff" }}>
                    {isFollowing ? "Disconnect" : "Connect"}
                  </Text>
                </CustomButton>
              ) : (
                <>
                  <CustomButton style={{ width: "90%" }}>
                    <Text style={{ fontWeight: "bold", color: "#fff" }}>
                      Edit profile
                    </Text>
                  </CustomButton>
                  <CustomButton style={{ width: "90%" }} onPress={logout}>
                    <Text style={{ fontWeight: "bold", color: "#fff" }}>
                      Logout
                    </Text>
                  </CustomButton>
                </>
              )}
            </View>

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
                      onPress={() =>
                        navigation.navigate("ClipViewer", { clip: post })
                      }
                      activeOpacity={0.85}
                    >
                      {isImage(post.media_url) ? (
                        <Image
                          source={{ uri: getFullMediaUrl(post.media_url) }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : (
                        <View style={styles.postVideoPreview}>
                          <Ionicons name="play" size={40} color="#fff" />
                          <Text style={{ color: "#fff", marginTop: 8 }}>
                            Video
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    {selectedPost?.signed_url &&
                      (isImage(selectedPost.media_url) ? (
                        <Image
                          source={{
                            uri: getFullMediaUrl(selectedPost.media_url),
                          }}
                          style={styles.modalImage}
                        />
                      ) : (
                        <Video
                          source={{
                            uri: getFullMediaUrl(selectedPost.signed_url),
                          }}
                          style={styles.modalVideo}
                          useNativeControls
                          resizeMode="contain"
                          isLooping
                        />
                      ))}

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
                      {!!likeError && (
                        <Text style={styles.likeError}>{likeError}</Text>
                      )}
                    </View>

                    <Text style={styles.modalCaption}>
                      {selectedPost?.caption}
                    </Text>

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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#181818" },
  container: { flex: 1, backgroundColor: "#181818" },

  notFoundBox: {
    margin: 18,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#232323",
    borderWidth: 2,
    borderColor: "#e0245e",
  },
  notFoundTitle: {
    color: "#ffd700",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 8,
  },
  notFoundText: { color: "#bbb", fontWeight: "700", lineHeight: 18 },

  fighterCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#232323",
    borderRadius: 18,
    margin: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: "#e0245e",
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
    borderColor: "#ffd700",
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
  profileDetails: { flex: 1, marginLeft: 18 },

  fighterName: {
    color: "#ffd700",
    fontWeight: "900",
    fontSize: 24,
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  badgeOn: { backgroundColor: "#ffd700" },
  badgeOff: { backgroundColor: "#333" },
  badgeText: { color: "#181818", fontWeight: "900", fontSize: 12 },

  badgeMuted: {
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeTextMuted: { color: "#bbb", fontWeight: "800", fontSize: 12 },

  fightStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  fightStat: {
    backgroundColor: "#e0245e",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginRight: 10,
  },
  fightStatText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  infoText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 4,
    fontWeight: "600",
  },

  bioBox: {
    marginTop: 10,
    backgroundColor: "#1c1c1c",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 10,
  },
  bioTitle: { color: "#ffd700", fontWeight: "900", marginBottom: 6 },
  bioText: { color: "#ddd", fontWeight: "600", lineHeight: 18 },

  statsRow: { flexDirection: "row", marginTop: 12, gap: 24 },
  statsCol: { alignItems: "center" },
  statsLabel: { color: "#ffd700", fontWeight: "900", fontSize: 13 },
  statsValue: { color: "#fff", fontSize: 14, fontWeight: "900" },

  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },

  postsSection: { padding: 16 },
  postsTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
    color: "#ffd700",
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
  modalImage: { width: 300, height: 300, borderRadius: 10, marginBottom: 12 },
  modalVideo: { width: 300, height: 300, borderRadius: 10, marginBottom: 12 },

  likeRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  likeCount: { fontWeight: "900", fontSize: 16, color: "#ffd700" },
  likeError: { color: "red", marginLeft: 8 },

  modalCaption: {
    fontWeight: "900",
    fontSize: 16,
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
  closeButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
