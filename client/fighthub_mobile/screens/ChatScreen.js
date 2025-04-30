import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { format } from "date-fns";
import io from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import CustomButton from "../component/CustomButton";

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
    <View style={{ flex: 1, padding: 10, backgroundColor: "black" }}>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          marginBottom: 10,
          color: "white",
        }}
      >
        Chat with {recipientName}
      </Text>

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
            <View>
              <Text
                style={
                  item.sender === "me"
                    ? style.senderBubble
                    : style.receiverBubble
                }
              >
                {item.sender}: {item.text}
              </Text>
              <Text style={{ fontSize: 10, color: "#FFFFFF", marginTop: 2 }}>
                {item.timestamp ? format(new Date(item.timestamp), "p") : ""}
              </Text>
            </View>
          </View>
        )}
      />

      <View
        style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#ccc"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 20,
            paddingHorizontal: 10,
            height: 40,
            color: "white",
          }}
        />

        <CustomButton onPress={sendMessage}>
          <Text className="text-white">Send</Text>
        </CustomButton>
      </View>
    </View>
  );
};

const style = StyleSheet.create({
  senderBubble: {
    backgroundColor: "#BA2C73",
    color: "white",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 2, // tail effect
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-end",
    maxWidth: "80%",
    marginVertical: 4,
  },

  receiverBubble: {
    backgroundColor: "#444",
    borderTopLeftRadius: 12,
    color: "white",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 2, // tail effect
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    maxWidth: "80%",
    marginVertical: 4,
  },
});

export default ChatScreen;
