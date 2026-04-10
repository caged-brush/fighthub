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

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const apiGet = async (url, { token } = {}) => {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });

  const data = await safeJson(res);
  if (!res.ok)
    throw new Error(data?.message || data?.error || "Request failed");
  return data;
};

const apiPost = async (url, body, { token } = {}) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const data = await safeJson(res);
  if (!res.ok)
    throw new Error(data?.message || data?.error || "Request failed");
  return data;
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
      const f = await apiGet(`${API_URL}/fighters/${profileUserId}`);

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

      try {
        const followerData = await apiPost(`${API_URL}/follower-count`, {
          userId: profileUserId,
        });
        setFollowerCount(followerData?.count || 0);
      } catch {
        setFollowerCount(0);
      }

      try {
        const followingData = await apiPost(`${API_URL}/following-count`, {
          userId: profileUserId,
        });
        setFollowingCount(followingData?.count || 0);
      } catch {
        setFollowingCount(0);
      }

      if (!viewingOwnProfile) {
        try {
          const followData = await apiPost(`${API_URL}/is-following`, {
            followerId: authedUserId,
            followingId: profileUserId,
          });
          setIsFollowing(!!followData?.isFollowing);
        } catch {
          setIsFollowing(false);
        }
      } else {
        setIsFollowing(false);
      }
    } catch (err) {
      const msg = err?.message || "Failed to load fighter profile.";

      if (String(msg).toLowerCase().includes("not found")) {
        setProfileNotFound(true);
        return;
      }

      console.log("GET /fighters/:userId failed:", msg);
      Alert.alert("Error", "Failed to load fighter profile.");
    }
  }, [profileUserId, viewingOwnProfile, authedUserId]);

  const getUserPost = useCallback(async () => {
    if (!profileUserId) return;

    try {
      const data = await apiGet(
        `${API_URL}/fight-clips/user/${profileUserId}`,
        {
          token: userToken,
        },
      );

      setUserPosts(Array.isArray(data?.clips) ? data.clips : []);
    } catch (error) {
      console.log("Error fetching user posts:", error?.message);
      setUserPosts([]);
    }
  }, [profileUserId, userToken]);

  useEffect(() => {
    const fetchLikes = async () => {
      if (!selectedPost) return;

      try {
        const likeData = await apiPost(`${API_URL}/like-count`, {
          postId: selectedPost.id,
        });
        setPostLikes(likeData?.likes || 0);

        const likedData = await apiPost(`${API_URL}/liked-posts`, {
          userId: authedUserId,
        });
        const likedPostIds = likedData?.likedPostIds || [];
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
        await apiPost(`${API_URL}/unlike`, {
          userId: authedUserId,
          postId: selectedPost.id,
        });
        setHasLiked(false);
        setPostLikes((p) => Math.max(p - 1, 0));
      } else {
        await apiPost(`${API_URL}/like`, {
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
      const data = await apiPost(`${API_URL}/follow`, {
        followingId: profileUserId,
        followerId: authedUserId,
      });
      if (data?.message) setIsFollowing(true);
    } catch (error) {
      console.log("Error following user:", error?.message);
    }
  };

  const handleUnfollow = async () => {
    try {
      const data = await apiPost(`${API_URL}/unfollow`, {
        followingId: profileUserId,
        followerId: authedUserId,
      });
      if (data?.message) setIsFollowing(false);
    } catch (error) {
      console.log("Error unfollowing user:", error?.message);
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

              <View style={styles.statsRow}>
                <Stat
                  label="Record"
                  value={`${fighterInfo.wins}W-${fighterInfo.losses}L-${fighterInfo.draws}D`}
                />
                <Stat label="Followers" value={String(followerCount)} />
                <Stat label="Following" value={String(followingCount)} />
              </View>

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

            {viewingOwnProfile && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Gym</Text>

                <View style={styles.gymActionsCol}>
                  <TouchableOpacity
                    style={styles.gymActionBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate("FighterGymMembershipsScreen")
                    }
                  >
                    <View>
                      <Text style={styles.gymActionTitle}>My Gyms</Text>
                      <Text style={styles.gymActionText}>
                        View active memberships, pending requests, and history.
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#ffd700"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.gymActionBtn}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate("FighterGymSearchScreen")
                    }
                  >
                    <View>
                      <Text style={styles.gymActionTitle}>Find Gyms</Text>
                      <Text style={styles.gymActionText}>
                        Search gyms and request to join.
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#ffd700"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!!fighterInfo.bio && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.bioText}>{fighterInfo.bio}</Text>
              </View>
            )}

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
    fontWeight: "900",
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

  statsRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },

  sectionTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  bioText: {
    color: "rgba(255,255,255,0.78)",
    lineHeight: 20,
    fontWeight: "600",
  },

  gymActionsCol: {
    gap: 10,
  },
  gymActionBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  gymActionTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
    marginBottom: 4,
  },
  gymActionText: {
    color: "rgba(255,255,255,0.62)",
    lineHeight: 18,
    maxWidth: 260,
  },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  postsHeader: {
    marginTop: 18,
    marginHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  postsTitle: { color: "#ffd700", fontSize: 20, fontWeight: "900" },
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
    fontWeight: "900",
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
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 8,
  },
  notFoundText: { color: "rgba(255,255,255,0.65)", lineHeight: 18 },
});
