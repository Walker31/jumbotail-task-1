import express, { json, urlencoded } from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(json());
app.use(urlencoded({ extended: true }));

app.use("/admin", express.static(join(__dirname, "public")));
app.get("/admin", (req, res) =>
  res.sendFile(join(__dirname, "public", "admin.html"))
);

app.use("/", routes);

export const listen = (port, callback) => {
  return app.listen(port, callback);
};

export default app;
