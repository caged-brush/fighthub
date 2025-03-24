import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Image, ActivityIndicator } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import axios from "axios";

// ✅ Move Video Post to its own component to avoid invalid hook calls
const VideoPost = ({ mediaUri }) => {
  const player = useVideoPlayer(mediaUri, (player) => {
    player.loop = true;
  });

  return (
    <View style={{ width: "100%", height: 300 }}>
      <VideoView
        player={player}
        style={{ width: "100%", height: 300 }}
        useNativeControls
        resizeMode="contain"
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
      setPosts((prevPosts) => [...newPosts, ...prevPosts]);
      if (response.data.length < 10) {
        setHasMore(false);
      }
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
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page]);

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const renderPost = ({ item }) => {
    const mediaUri = `http://10.50.99.238:5001${item.media_url}`;

    return (
      <View
        style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc" }}
      >
        <Text style={{ fontWeight: "bold" }}>{item.user_id}</Text>

        {item.media_url &&
        item.media_url.endsWith(".mp4") &&
        isValidUrl(mediaUri) ? (
          <VideoPost mediaUri={mediaUri} /> // ✅ Use the separate VideoPost component
        ) : item.media_url && isValidUrl(mediaUri) ? (
          <Image
            source={{ uri: mediaUri }}
            style={{ width: "100%", height: 200, marginVertical: 10 }}
            resizeMode="contain"
          />
        ) : (
          <Text>Invalid media URL</Text>
        )}

        <Text>{item.caption}</Text>
      </View>
    );
  };

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [loading, hasMore]);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? <ActivityIndicator size="large" color="gray" /> : null
        }
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    </View>
  );
};

export default Home;
