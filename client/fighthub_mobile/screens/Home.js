import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import axios from "axios";
import { StatusBar } from "expo-status-bar";

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
  const [userProfiles, setUserProfiles] = useState({});

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

      // Fetch user profiles for the new posts
      newPosts.forEach((post) => {
        getUserProfile(post.user_id);
      });
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
      // Fetch user profiles for the refreshed posts
      response.data.forEach((post) => {
        getUserProfile(post.user_id);
      });
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const getUserProfile = async (userId) => {
    if (userProfiles[userId]) return; // If profile is already fetched, don't fetch again
    try {
      const response = await axios.post(
        "http://10.50.99.238:5001/fighter-info",
        { userId }
      );
      console.log(`Fetched profile for userId ${userId}:`, response.data);
      if (response.data) {
        setUserProfiles((prevProfiles) => ({
          ...prevProfiles,
          [userId]: {
            fname: response.data.fname || "",
            lname: response.data.lname || "",
            wins: response.data.wins || 0.0,
            losses: response.data.losses || 0.0,
            draws: response.data.draws || 0.0,
            style: response.data.fight_style || "",
            weight: response.data.weight || 0.0,
            height: response.data.height || 0.0,
            profileUrl: response.data.profile_picture_url,
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
    const profile = userProfiles[item.user_id];
    // console.log(profile);

    return (
      <View
        style={{
          padding: 20,
          borderBottomWidth: 1,
          marginTop: 10,
          borderBottomColor: "#ccc",
        }}
      >
        {/* <Text style={{ color: "white" }}>{item.user_id}</Text> */}
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 20 }}
        >
          {profile?.profileUrl && (
            <Image
              source={{ uri: profile.profileUrl }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25, // Half of width/height for a perfect circle
                marginRight: 10, // Space between image and text
              }}
              resizeMode="cover"
            />
          )}
          {profile?.fname && (
            <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
              {profile.fname} {profile.lname}
            </Text>
          )}
        </View>

        {item.media_url &&
        item.media_url.endsWith(".mp4") &&
        isValidUrl(mediaUri) ? (
          <VideoPost mediaUri={mediaUri} />
        ) : item.media_url && isValidUrl(mediaUri) ? (
          <Image
            source={{ uri: mediaUri }}
            style={{ width: "100%", height: 200, marginVertical: 10 }}
            resizeMode="contain"
          />
        ) : (
          <Text>Invalid media URL</Text>
        )}

        <Text style={{ color: "white" }}>{item.caption}</Text>
      </View>
    );
  };

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [loading, hasMore]);

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "black" }}>
      {Platform.OS === "ios" ? (
        <StatusBar style="light" backgroundColor="black" />
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
          loading ? <ActivityIndicator size="large" color="gray" /> : null
        }
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    </View>
  );
};

export default Home;
