import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

const UserListScreen = () => {
  const [users, setUsers] = useState([]);
  const { userId } = useContext(AuthContext);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(
          `http://10.50.107.251:5001/users?exclude=${userId}`
        );
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
      style={styles.listContainer}
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() =>
              navigation.navigate("ChatScreen", {
                recipientId: item.id,
                recipientName: item.fname,
              })
            }
          >
            <View style={styles.userRow}>
              {item.profile_picture_url ? (
                <Image
                  source={{ uri: item.profile_picture_url }}
                  style={styles.avatar}
                />
              ) : (
                <Ionicons
                  name="person"
                  size={40}
                  color="gray"
                  style={styles.avatar}
                />
              )}
              <View>
                <Text style={styles.userText}>{item.fname}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.last_message || "No messages yet."}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No users found.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:"black",
    padding: 16,
  },
  listContainer:{
    marginTop:30
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  userText: {
    fontSize: 18,
    color: "white",
  },
  emptyText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 16,
    color: "gray",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 30,
    marginRight: 12,
  },
  lastMessage: {
    color: "gray",
    fontSize: 14,
    marginTop: 4,
    maxWidth: 220,
  },
});

export default UserListScreen;
