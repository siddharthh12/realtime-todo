import { io } from "socket.io-client";

const URL = "http://localhost:5000"; // Adjust for deployed URL later

const socket = io(URL, {
  transports: ["websocket"],
});

export default socket;
