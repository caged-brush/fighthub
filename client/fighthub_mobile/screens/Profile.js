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
import Pill from "../component/Pill";
import Chip from "../component/Chip";
import Stat from "../component/Stat";

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
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {profileNotFound ? (
          <View style={styles.notFoundCard}>
            <Text style={styles.notFoundTitle}>Profile not found</Text>
            <Text style={styles.notFoundText}>
              This user hasn’t completed fighter onboarding yet.
            </Text>

            {viewingOwnProfile ? (
              <CustomButton
                variant="primary"
                style={{ marginTop: 14 }}
                onPress={() => navigation.navigate("FighterOnboarding")}
              >
                Complete onboarding
              </CustomButton>
            ) : null}
          </View>
        ) : (
          <>
            {/* Header */}
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <View style={styles.avatarWrap}>
                  {isValidUrl(fighterInfo.profileUrl) ? (
                    <Image
                      source={{ uri: fighterInfo.profileUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Ionicons name="person" size={34} color="#ffd700" />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {fighterInfo.fname} {fighterInfo.lname}
                  </Text>

                  <View style={styles.metaRow}>
                    <Pill
                      text={
                        fighterInfo.is_available ? "AVAILABLE" : "NOT AVAILABLE"
                      }
                      tone={fighterInfo.is_available ? "good" : "muted"}
                    />
                    {!!fighterInfo.region && (
                      <Pill text={fighterInfo.region} tone="muted" />
                    )}
                  </View>

                  <View style={styles.smallMetaRow}>
                    <Text style={styles.smallMeta}>
                      {fighterInfo.weight_class || "—"}
                    </Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.smallMeta}>
                      {fighterInfo.fight_style || "—"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Record + Stats */}
              <View style={styles.statsRow}>
                <Stat
                  label="Record"
                  value={`${fighterInfo.wins}W-${fighterInfo.losses}L-${fighterInfo.draws}D`}
                />
                <Stat label="Followers" value={String(followerCount)} />
                <Stat label="Following" value={String(followingCount)} />
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                {!viewingOwnProfile ? (
                  <CustomButton
                    variant={isFollowing ? "ghost" : "primary"}
                    style={{ flex: 1 }}
                    onPress={() =>
                      isFollowing ? handleUnfollow() : handleFollow()
                    }
                  >
                    {isFollowing ? "Disconnect" : "Connect"}
                  </CustomButton>
                ) : (
                  <>
                    <CustomButton
                      variant="primary"
                      style={{ flex: 1 }}
                      onPress={() => navigation.navigate("EditProfile")}
                    >
                      Edit profile
                    </CustomButton>
                    <CustomButton
                      variant="ghost"
                      style={{ flex: 1 }}
                      onPress={logout}
                    >
                      Logout
                    </CustomButton>
                  </>
                )}
              </View>
            </View>

            {/* Bio */}
            {!!fighterInfo.bio && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.bioText}>{fighterInfo.bio}</Text>
              </View>
            )}

            {/* Details chips */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Details</Text>

              <View style={styles.chipsRow}>
                <Chip label="Gym" value={fighterInfo.gym || "—"} />
                <Chip
                  label="Weight"
                  value={
                    fighterInfo.weight != null
                      ? `${fighterInfo.weight} lbs`
                      : "—"
                  }
                />
                <Chip
                  label="Height"
                  value={
                    fighterInfo.height != null
                      ? `${fighterInfo.height} cm`
                      : "—"
                  }
                />
              </View>
            </View>

            {/* Posts */}
            <View style={styles.postsHeader}>
              <Text style={styles.postsTitle}>Posts</Text>
              <Text style={styles.postsCount}>{userPosts.length}</Text>
            </View>

            {userPosts.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptyText}>
                  Post a clip so scouts can see your style.
                </Text>

                {viewingOwnProfile ? (
                  <CustomButton
                    variant="primary"
                    style={{ marginTop: 14 }}
                    onPress={() => navigation.navigate("CreatePost")}
                  >
                    Upload a clip
                  </CustomButton>
                ) : null}
              </View>
            ) : (
              <View style={styles.grid}>
                {userPosts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.gridItem}
                    onPress={() =>
                      navigation.navigate("ClipViewer", { clip: post })
                    }
                    activeOpacity={0.85}
                  >
                    {isImage(post.media_url) ? (
                      <Image
                        source={{ uri: getFullMediaUrl(post.media_url) }}
                        style={styles.gridMedia}
                      />
                    ) : (
                      <View style={styles.videoThumb}>
                        <Ionicons name="play" size={28} color="#fff" />
                        <Text style={styles.videoLabel}>Video</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0b0b0b" },
  container: { flex: 1, backgroundColor: "#0b0b0b" },

  /* Cards */
  headerCard: {
    margin: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sectionCard: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  /* Header */
  headerRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  avatarWrap: { width: 72, height: 72 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1f1f1f",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.6)",
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1f1f1f",
    borderWidth: 2,
    borderColor: "rgba(255,215,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    color: "#ffd700",
    fontSize: 22,
    fontWeight: "950",
    marginBottom: 6,
  },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  smallMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  smallMeta: {
    color: "rgba(255,255,255,0.78)",
    fontWeight: "800",
    fontSize: 13,
  },
  dot: { color: "rgba(255,255,255,0.35)", fontWeight: "900" },

  /* Stats */
  statsRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  stat: { flex: 1, alignItems: "center" },
  statLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "800",
  },
  statValue: { color: "#fff", fontSize: 14, fontWeight: "950", marginTop: 4 },

  /* Actions */
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },

  /* Sections */
  sectionTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "950",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  bioText: {
    color: "rgba(255,255,255,0.78)",
    lineHeight: 20,
    fontWeight: "600",
  },

  /* Chips */
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexGrow: 1,
    flexBasis: "48%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 12,
  },
  chipLabel: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "900",
    fontSize: 12,
  },
  chipValue: { color: "#fff", fontWeight: "900", fontSize: 14, marginTop: 6 },

  /* Posts */
  postsHeader: {
    marginTop: 18,
    marginHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  postsTitle: { color: "#ffd700", fontSize: 20, fontWeight: "950" },
  postsCount: {
    color: "rgba(255,255,255,0.75)",
    fontWeight: "900",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  grid: {
    marginTop: 12,
    marginHorizontal: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  gridMedia: { width: "100%", height: "100%" },
  videoThumb: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  videoLabel: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "900",
    marginTop: 8,
  },

  /* Empty + Not found */
  emptyCard: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  emptyTitle: {
    color: "#fff",
    fontWeight: "950",
    fontSize: 16,
    marginBottom: 6,
  },
  emptyText: {
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 18,
  },

  notFoundCard: {
    margin: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  notFoundTitle: {
    color: "#fff",
    fontWeight: "950",
    fontSize: 18,
    marginBottom: 8,
  },
  notFoundText: { color: "rgba(255,255,255,0.65)", lineHeight: 18 },
});
