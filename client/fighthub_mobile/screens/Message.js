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

const FIGHTHUB_BASE_URL = "http://10.50.107.251:5001";

const UserListScreen = () => {
  const [users, setUsers] = useState([]);
  const { userId } = useContext(AuthContext);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(
          `${FIGHTHUB_BASE_URL}/users?exclude=${userId}`
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
      <Text style={styles.header}>Fighthub Fighters</Text>
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
                  source={{
                    uri: item.profile_picture_url.startsWith("/")
                      ? `${FIGHTHUB_BASE_URL}${item.profile_picture_url}`
                      : item.profile_picture_url,
                  }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="body-outline" size={32} color="#ffd700" />
                </View>
              )}
              <View style={styles.infoCol}>
                <Text style={styles.userText}>
                  {item.fname} {item.lname}
                </Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.last_message || "No messages yet."}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No fighters found.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818",
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffd700",
    textAlign: "center",
    marginBottom: 18,
    letterSpacing: 1,
  },
  listContainer: {
    marginTop: 10,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userItem: {
    backgroundColor: "#232323",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: "#e0245e",
    shadowColor: "#e0245e",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    borderWidth: 2,
    borderColor: "#ffd700",
    backgroundColor: "#292929",
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    backgroundColor: "#292929",
    borderWidth: 2,
    borderColor: "#ffd700",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCol: {
    flex: 1,
    justifyContent: "center",
  },
  userText: {
    fontSize: 19,
    color: "#ffd700",
    fontWeight: "bold",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  lastMessage: {
    color: "#fff",
    fontSize: 15,
    marginTop: 2,
    maxWidth: 220,
    fontStyle: "italic",
  },
  emptyText: {
    marginTop: 40,
    textAlign: "center",
    fontSize: 18,
    color: "#e0245e",
    fontWeight: "bold",
  },
});

export default UserListScreen;
