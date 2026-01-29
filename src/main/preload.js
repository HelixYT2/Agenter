import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("helix", {
  buildInfo: {
    channel: "local",
    version: "0.1.0"
  }
});
