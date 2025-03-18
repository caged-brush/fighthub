import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Image, ActivityIndicator } from "react-native";
import Video from "react-native-video";
import axios from "axios";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1); // Track current page
  const [hasMore, setHasMore] = useState(true); // Check if there are more posts to load
  const [refreshing, setRefreshing] = useState(false); // Track refreshing state

  // Fetch posts when component mounts or when the page changes
  const fetchPosts = async () => {
    if (loading) return; // Prevent multiple requests at the same time

    setLoading(true);
    try {
      const response = await axios.get(
        `http://10.50.99.238:5001/posts?page=${page}&limit=10`
      );
      // Check if the new posts already exist in the current list

      const newPosts = response.data.filter(
        (newPost) =>
          !posts.some((existingPost) => existingPost.id === newPost.id)
      );
      setPosts((prevPosts) => [...newPosts, ...prevPosts]);
      // Append new unique posts
      if (response.data.length < 10) {
        setHasMore(false); // If fewer posts are returned, there are no more to load
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); // Stop refreshing when data is loaded
    }
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    try {
      const response = await axios.get(
        `http://10.50.99.238:5001/posts?page=1&limit=10`
      );
      setPosts(response.data); // Replace existing posts instead of appending
      setHasMore(response.data.length === 10);
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [page]); // Make sure this is correctly updating

  // Render each post
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
          <Video
            source={{ uri: mediaUri }}
            style={{ width: "100%", height: 200 }}
            useNativeControls
            resizeMode="contain"
            repeat
          />
        ) : item.media_url && isValidUrl(mediaUri) ? (
          <Image
            source={{ uri: mediaUri }}
            style={{ width: "100%", height: 200, marginVertical: 10 }}
            resizeMode="contain"
          />
        ) : (
          <Text>Invalid media URL</Text> // Fallback for invalid URLs
        )}
        <Text>{item.caption}</Text>
      </View>
    );
  };
  // Fetch more posts when the user scrolls to the end
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prevPage) => prevPage + 1); // Increment the page number
    }
  }, [loading, hasMore]);

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()} // Assuming each post has a unique 'id'
        onEndReached={loadMore} // Trigger the loading of more posts when the user reaches the bottom
        onEndReachedThreshold={0.5} // Trigger 50% from the bottom
        ListFooterComponent={
          loading ? <ActivityIndicator size="large" color="gray" /> : null
        } // Show loading indicator while fetching more posts
        // Implementing pull-to-refresh
        onRefresh={handleRefresh} // Trigger fetch when user pulls to refresh
        refreshing={refreshing} // Show refresh indicator while refreshing
      />
    </View>
  );
};

export default Home;
