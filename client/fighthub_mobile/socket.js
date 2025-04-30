import { io } from "socket.io-client";

const socket = io("http://10.50.99.238:5001", {
  transports: ["websocket"],
});

export default socket;
