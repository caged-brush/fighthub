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
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import axios from "axios";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AuthContext } from "../context/AuthContext";

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

  const fetchPosts = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `http://10.50.99.238:5001/posts?page=${page}&limit=10`
      );
      const newPosts = response.data.filter(
        (newPost) =>
          !posts.some((existingPost) => existingPost.id === newPost.id)
      );
      setPosts((prevPosts) => [...prevPosts, ...newPosts]);
      if (response.data.length < 10) {
        setHasMore(false);
      }
      newPosts.forEach((post) => getUserProfile(post.user_id));
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    try {
      const response = await axios.get(
        `http://10.50.99.238:5001/posts?page=1&limit=10`
      );
      setPosts(response.data);
      setHasMore(response.data.length === 10);
      response.data.forEach((post) => getUserProfile(post.user_id));
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
        "http://10.50.99.238:5001/fighter-info",
        { userId }
      );
      if (response.data) {
        setUserProfiles((prevProfiles) => ({
          ...prevProfiles,
          [userId]: {
            fname: response.data.fname || "",
            lname: response.data.lname || "",
            profileUrl: response.data.profile_picture_url
              ? `http://10.50.99.238:5001${response.data.profile_picture_url}`
              : null,
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
    //console.log("user_id:", userId, "post id:", postId);
    const isLiked = likedPosts[postId];

    try {
      if (isLiked) {
        await axios.post(`http://10.50.99.238:5001/unlike`, {
          userId,
          postId,
        });
      } else {
        await axios.post(`http://10.50.99.238:5001/like`, {
          userId,
          postId,
        });
      }

      setLikedPosts((prev) => ({
        ...prev,
        [postId]: !isLiked,
      }));

      //console.log(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchLikedPosts = async () => {
      try {
        const response = await axios.post(
          "http://10.50.99.238:5001/liked-posts",
          {
            userId,
          }
        );

        const likedMap = {};
        response.data.likedPostIds.forEach((postId) => {
          likedMap[postId] = true;
        });

        setLikedPosts(likedMap);
      } catch (error) {
        console.error("Error fetching liked posts:", error);
      }
    };

    if (userId) {
      fetchLikedPosts();
    }
  }, [userId]);

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const renderPost = ({ item }) => {
    const mediaUri = `http://10.50.99.238:5001${item.media_url}`;
    const profile = userProfiles[item.user_id];

    return (
      <View style={styles.postCard}>
        {/* Header: Profile Pic + Username + Options */}
        <View style={styles.postHeader}>
          {profile?.profileUrl && isValidUrl(profile.profileUrl) ? (
            <Image
              source={{ uri: `${profile.profileUrl}?t=${Date.now()}` }}
              style={styles.profilePic}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="person-circle-outline"
              size={50}
              color="#ff3b30"
              style={{ marginRight: 10 }}
            />
          )}
          <Text style={styles.username}>
            {profile?.fname} {profile?.lname}
          </Text>
          <TouchableOpacity style={{ marginLeft: "auto" }}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#ff3b30" />
          </TouchableOpacity>
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

        {/* Actions (like, comment, share) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => handleLike(item.id)}>
            <Ionicons
              name={likedPosts[item.id] ? "heart" : "heart-outline"}
              size={28}
              color="#ff3b30"
              style={{ marginRight: 15 }}
            />
          </TouchableOpacity>

          <Ionicons
            name="chatbubble-outline"
            size={28}
            color="#ff3b30"
            style={{ marginRight: 15 }}
          />
          <Ionicons name="paper-plane-outline" size={28} color="#ff3b30" />
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
    <View style={styles.container}>
      {Platform.OS === "ios" ? (
        <StatusBar style="light" />
      ) : (
        <StatusBar style="light" />
      )}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // black background
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  postCard: {
    backgroundColor: "#111", // dark card
    marginVertical: 10,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  profilePic: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 10,
    backgroundColor: "#333",
  },
  username: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#fff", // white username text
  },
  caption: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#fff", // white username text
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#222",
  },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  captionContainer: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },

  timestamp: {
    color: "#aaa",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
});

export default Home;
