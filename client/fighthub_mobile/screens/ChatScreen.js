import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import io from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";

// Set the URL for your backend server here
const socket = io("http://10.50.99.238:5001");

const ChatScreen = () => {
  const route = useRoute();
  const { recipientId, recipientName } = route.params;
  const { userId } = useContext(AuthContext);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // Connect to the socket and join the chat room when the component is mounted
    socket.emit("join", userId); // Send your user ID to join the socket room
    socket.emit("load-messages", { userId, recipientId });

    socket.on("message-history", (messagesFromServer) => {
      const formatted = messagesFromServer.map((msg) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender_id === userId ? "me" : recipientName,
        timestamp: msg.timestamp, // ✅ include timestamp
      }));
      setMessages(formatted);
    });

    // Listen for private messages
    socket.on("private-message", ({ message, senderId, timestamp, id }) => {
      if (senderId !== recipientId && senderId !== userId) return;
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: id || Date.now(),
          text: message,
          sender: senderId === userId ? "me" : recipientName,
          timestamp, // ✅ now defined
        },
      ]);
    });

    // Clean up when the component is unmounted
    return () => {
      socket.off("private-message");
      socket.off("message-history");
    };
  }, [recipientId]);

  const sendMessage = () => {
    if (input.trim() === "") return;

    const timestamp = new Date().toISOString();

    socket.emit("private-message", {
      recipientId,
      message: input,
      senderId: userId,
    });

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: Date.now(),
        text: input,
        sender: "me",
        timestamp, // ✅ add timestamp here
      },
    ]);
    setInput("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Ionicons
              name="body-outline"
              size={32}
              color="#ffd700"
              style={{ marginRight: 10 }}
            />
            <Text style={styles.headerText}>Chat with {recipientName}</Text>
          </View>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View
                style={{
                  alignItems: item.sender === "me" ? "flex-end" : "flex-start",
                  padding: 5,
                }}
              >
                <View
                  style={
                    item.sender === "me"
                      ? styles.senderBubble
                      : styles.receiverBubble
                  }
                >
                  <Text style={styles.messageText}>{item.text}</Text>
                  <Text style={styles.timestamp}>
                    {item.timestamp
                      ? format(new Date(item.timestamp), "p")
                      : ""}
                  </Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 12 }}
          />

          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#aaa"
              style={styles.input}
            />
            <Feather
              name="send"
              size={28}
              color="#ffd700"
              onPress={sendMessage}
              style={styles.sendIcon}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
    padding: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderColor: "#e0245e",
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffd700",
    letterSpacing: 1,
  },
  senderBubble: {
    backgroundColor: "#e0245e",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-end",
    maxWidth: "80%",
    marginVertical: 4,
    shadowColor: "#e0245e",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  receiverBubble: {
    backgroundColor: "#232323",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    maxWidth: "80%",
    marginVertical: 4,
    borderWidth: 2,
    borderColor: "#ffd700",
    shadowColor: "#ffd700",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 10,
    color: "#ffd700",
    marginTop: 2,
    alignSelf: "flex-end",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: "#232323",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#e0245e",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: "transparent",
  },
  sendIcon: {
    marginLeft: 8,
  },
});

export default ChatScreen;
