import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import axios from "axios";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

const isValidUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const getMediaUrl = (post) => {
  if (!post) return null;
  return post.media_signed_url || post.media_url || null;
};

const VideoPost = ({ mediaUri }) => {
  const player = useVideoPlayer(mediaUri, (player) => {
    player.loop = true;
  });

  // Add error boundary for video playback
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <View
        style={[
          styles.postImage,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: "#fff" }}>Failed to load video</Text>
      </View>
    );
  }

  return (
    <View style={{ width: "100%", height: 350, backgroundColor: "black" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: 350 }}
        useNativeControls
        resizeMode="cover"
        onError={(error) => {
          console.log("Video Error:", error);
          setHasError(true);
        }}
        onLoadStart={() => console.log("Loading video...")}
        onLoad={() => console.log("Video loaded successfully")}
      />
    </View>
  );
};

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const { userId } = useContext(AuthContext);
  const [likedPosts, setLikedPosts] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [error, setError] = useState(null);

  const navigation = useNavigation();

  const fetchPosts = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `http://10.50.107.251:5001/posts?page=${page}&limit=10`
      );

      // Destructure the correct response structure from Supabase
      const { posts, total, currentPage, pages } = response.data;

      if (page === 1) {
        setPosts(posts);
      } else {
        setPosts((prevPosts) => {
          const existingIds = new Set(prevPosts.map((p) => p.id));
          const newUniquePosts = posts.filter(
            (post) => !existingIds.has(post.id)
          );
          return [...prevPosts, ...newUniquePosts];
        });
      }

      setHasMore(currentPage < pages);

      // Fetch profiles and likes for new posts
      posts.forEach((post) => {
        if (post.user_id) getUserProfile(post.user_id);
      });

      const postIds = posts.map((post) => post.id);
      if (postIds.length > 0) {
        fetchBatchLikes(postIds);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      handleError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (posts.length > 0) {
      const postIds = posts.map((post) => post.id);
      fetchBatchLikes(postIds);
    }
  }, [posts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    try {
      const response = await axios.get(
        `http://10.50.107.251:5001/posts?page=1&limit=10`
      );

      // ✅ Destructure properly
      const { posts, total, currentPage, pages } = response.data;

      setPosts(posts);
      setHasMore(currentPage < pages);

      posts.forEach((post) => {
        getUserProfile(post.user_id);
      });

      const postIds = posts.map((post) => post.id);
      fetchBatchLikes(postIds);
    } catch (error) {
      console.error("Error refreshing posts:", error);
      handleError(error);
    } finally {
      setRefreshing(false);
    }
  };

  const getUserProfile = async (userId) => {
    if (userProfiles[userId]) return;
    try {
      const response = await axios.post(
        "http://10.50.107.251:5001/fighter-info",
        { userId }
      );
      if (response.data) {
        setUserProfiles((prevProfiles) => ({
          ...prevProfiles,
          [userId]: {
            fname: response.data.fname || "",
            lname: response.data.lname || "",
            // Update to use signed URL from response
            profileUrl: response.data.profile_signed_url || null,
            wins: response.data.wins,
            losses: response.data.losses,
            draws: response.data.draws,
          },
        }));
      }
    } catch (error) {
      console.log(`Error fetching profile for userId ${userId}:`, error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page]);

  const handleLike = async (postId) => {
    const isLiked = likedPosts[postId];

    try {
      if (isLiked) {
        await axios.post(`http://10.50.107.251:5001/unlike`, {
          userId,
          postId,
        });

        setLikeCounts((prev) => ({
          ...prev,
          [postId]: Math.max((prev[postId] || 1) - 1, 0),
        }));
      } else {
        await axios.post(`http://10.50.107.251:5001/like`, {
          userId,
          postId,
        });

        setLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] || 0) + 1,
        }));
      }

      setLikedPosts((prev) => ({
        ...prev,
        [postId]: !isLiked,
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBatchLikes = async (postIds) => {
    if (!postIds.length) return;

    try {
      // Batch fetch like counts
      const likeCountResp = await axios.post(
        "http://10.50.107.251:5001/like-counts",
        { postIds }
      );

      // Batch fetch liked posts by this user
      const likedPostsResp = await axios.post(
        "http://10.50.107.251:5001/liked-posts",
        { userId, postIds }
      );

      // Use response data directly
      const newLikeCounts = likeCountResp.data || {};

      const likedPostIds = likedPostsResp.data.likedPostIds || [];

      // Map liked posts to boolean object
      const newLikedPosts = {};
      likedPostIds.forEach((id) => {
        newLikedPosts[id] = true;
      });

      setLikeCounts((prev) => ({ ...prev, ...newLikeCounts }));
      setLikedPosts((prev) => ({ ...prev, ...newLikedPosts }));
    } catch (error) {
      console.error("Error batch fetching likes:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPosts();
    }
  }, [page, userId]);

  const renderPost = ({ item }) => {
    const mediaUri = getMediaUrl(item);
    const profile = userProfiles[item.user_id] || {};

    return (
      <View style={styles.postCard}>
        {/* Header: Profile Pic + Username + Fight Stats */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("UserProfile", {
                profileUserId: item.user_id,
              })
            }
          >
            {profile?.profileUrl && isValidUrl(profile.profileUrl) ? (
              <Image
                source={{
                  uri: profile.profileUrl,
                  // Add cache busting only if needed
                  headers: { "Cache-Control": "no-cache" },
                }}
                style={styles.profilePic}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name="body-outline"
                size={48}
                color="#ffd700"
                style={{ marginRight: 12 }}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("UserProfile", {
                profileUserId: item.user_id,
              })
            }
          >
            <Text style={styles.username}>
              {profile?.fname} {profile?.lname}
            </Text>
          </TouchableOpacity>
          {/* Fight stats */}
          {profile && (
            <View style={styles.fightStats}>
              <Text style={styles.statText}>
                {profile.wins ?? 0}W-{profile.losses ?? 0}L-{profile.draws ?? 0}
                D
              </Text>
              <Ionicons name="hand-left-outline" size={18} color="#ffd700" />
            </View>
          )}
        </View>

        {/* Media with error handling */}
        {mediaUri && item.type === "video" ? (
          <VideoPost
            mediaUri={mediaUri}
            onError={(error) => console.log("Video Error:", error)}
          />
        ) : mediaUri && item.type === "image" ? (
          <Image
            source={{
              uri: mediaUri,
              headers: { "Cache-Control": "no-cache" },
            }}
            style={styles.postImage}
            resizeMode="cover"
            onError={(error) => console.log("Image Error:", error)}
          />
        ) : (
          <View
            style={[
              styles.postImage,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text style={{ color: "#666" }}>Media not available</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <View style={styles.likeContainer}>
            <TouchableOpacity onPress={() => handleLike(item.id)}>
              <Ionicons
                name={likedPosts[item.id] ? "flame" : "flame-outline"}
                size={28}
                color="#e0245e"
              />
            </TouchableOpacity>
            <Text style={styles.likeText}>{likeCounts[item.id] ?? 0}</Text>
          </View>
          <Ionicons name="hand-left-outline" size={18} color="#ffd700" />
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color="#ffd700"
            style={{ marginRight: 18 }}
          />
          <Ionicons name="share-social-outline" size={28} color="#ffd700" />
        </View>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{item.caption}</Text>
        </View>

        {/* Timestamp */}
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    );
  };

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [loading, hasMore]);

  // Add error handler
  const handleError = (error) => {
    console.error(error);
    setError(error.message);
    setLoading(false);
    setRefreshing(false);
  };

  // Add error UI
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Text style={{ color: "#e0245e", marginBottom: 10 }}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              setPage(1);
              fetchPosts();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {Platform.OS === "ios" ? (
          <StatusBar style="light" />
        ) : (
          <StatusBar style="light" />
        )}
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading ? <ActivityIndicator size="large" color="#aaa" /> : null
          }
          onRefresh={handleRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      </View>
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
    backgroundColor: "#181818",
    paddingHorizontal: 8,
    paddingTop: 0, // Remove extra top padding
  },
  postCard: {
    backgroundColor: "#232323",
    marginVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e0245e", // Fighthub red accent
    overflow: "hidden",
    shadowColor: "#e0245e",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#e0245e",
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: "#444",
    borderWidth: 2,
    borderColor: "#e0245e",
  },
  username: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#ffd700", // gold for fighter name
    letterSpacing: 1,
  },
  fightStats: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    marginRight: 8,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#222",
    borderBottomWidth: 2,
    borderBottomColor: "#e0245e",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#1a1a1a",
    borderTopWidth: 1,
    borderTopColor: "#e0245e",
  },
  likeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 28,
  },
  likeText: {
    color: "#e0245e",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#232323",
  },
  caption: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  timestamp: {
    color: "#aaa",
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    fontStyle: "italic",
  },
  retryButton: {
    backgroundColor: "#e0245e",
    padding: 10,
    borderRadius: 5,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default Home;
