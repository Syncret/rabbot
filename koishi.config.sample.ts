const config = {
  type: "ws",
  server: "ws://localhost:6700",
  selfId: 0,
  secret: "",
  token: "",
  plugins: [
    "common",
    "schedule",
    ["./src/requestRedirector", { admin: 0 }],
  ],
};

export = config;
