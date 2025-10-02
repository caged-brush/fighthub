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

const VideoPost = ({ mediaUri }) => {
  const player = useVideoPlayer(mediaUri, (player) => {
    player.loop = true;
  });

  return (
    <View style={{ width: "100%", height: 350, backgroundColor: "black" }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: 350 }}
        useNativeControls
        resizeMode="cover"
        onError={(error) => console.log("Video Error:", error)}
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

  const navigation = useNavigation();

  const fetchPosts = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `http://10.50.107.251:5001/posts?page=${page}&limit=10`
      );
      const newPosts = response.data.filter(
        (newPost) =>
          !posts.some((existingPost) => existingPost.id === newPost.id)
      );
      // Instead of replacing posts blindly
      setPosts((prevPosts) => {
        const existingIds = new Set(prevPosts.map((p) => p.id));
        const newUniquePosts = response.data.filter(
          (post) => !existingIds.has(post.id)
        );
        return [...prevPosts, ...newUniquePosts];
      });

      if (response.data.length < 10) {
        setHasMore(false);
      }
      newPosts.forEach((post) => {
        getUserProfile(post.user_id);
      });

      const postIds = response.data.map((post) => post.id); // All posts, not just new

      fetchBatchLikes(postIds);
    } catch (error) {
      console.error("Error fetching posts:", error);
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
      setPosts(response.data);
      setHasMore(response.data.length === 10);
      response.data.forEach((post) => {
        getUserProfile(post.user_id);
      });

      const postIds = response.data.map((post) => post.id);
      fetchBatchLikes(postIds);
    } catch (error) {
      console.error("Error refreshing posts:", error);
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
            profileUrl: response.data.profile_picture_url
              ? `http://10.50.107.251:5001${response.data.profile_picture_url}`
              : null,
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

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const renderPost = ({ item }) => {
    const mediaUri = `http://10.50.107.251:5001${item.media_url}`;
    const profile = userProfiles[item.user_id];

    return (
      <View style={styles.postCard}>
        {/* Header: Profile Pic + Username + Fight Stats */}
        <View style={styles.postHeader}>
          {profile?.profileUrl && isValidUrl(profile.profileUrl) ? (
            <Image
              source={{ uri: `${profile.profileUrl}?t=${Date.now()}` }}
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

        {/* Media */}
        {item.media_url &&
        item.media_url.endsWith(".mp4") &&
        isValidUrl(mediaUri) ? (
          <VideoPost mediaUri={mediaUri} />
        ) : item.media_url && isValidUrl(mediaUri) ? (
          <Image
            source={{ uri: mediaUri }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: "#666", padding: 10 }}>Invalid media URL</Text>
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
});

export default Home;
