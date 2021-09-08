require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  origins: "*:*",
});
const jsforce = require("jsforce");

let user = process.env.USERNAME;
let pass = process.env.PASSWORD;
let channel = "/event/AssetCancelInitiatedEvent";
let replayId = -1; // -1 = Only New messages | -2 = All Window and New
let conn = new jsforce.Connection({
  loginUrl: process.env.LOGIN_URL,
});

conn.login(user, pass, function (err, loginRes) {
  if (err) {
    return console.error(err);
  }

  let createdClient = conn.streaming.createClient([
    new jsforce.StreamingExtension.Replay(channel, replayId),
    new jsforce.StreamingExtension.AuthFailure(function () {
      return console.error("Could not connect to stream.");
    }),
  ]);

  subscription = createdClient.subscribe(channel, function (data) {
    io.emit("AssetEvent", data);
  });
});

io.on("connection", async (socket) => {
  console.log("Client connected");
});

io.on("disconnect", async (socket) => {
  console.log("Client disconnected");
});

http.listen(process.env.PORT || 5000, () => {
  console.log("Server is running on " + process.env.PORT || 5000);
});
