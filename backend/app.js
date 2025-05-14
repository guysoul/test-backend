import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"; // use for importing Cross-Origin Resource Sharing middleware in node.js + express backend.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

//Drivers
import driversRoutes from "./routes/drivers.js";

//Customers
import customersRoutes from "./routes/customer.js";

//Price
import PriceRoutes from "./routes/PriceRoutes.js";

//adminRoutes (historikk og turer som er enten aktive eller i gang)
import adminRoutes from "./routes/adminRoutes.js";
//bestillinger
import ordersRoutes from "./routes/orderRoutes.js";
//statestikk
import statsRoutes from "./routes/statsRoutes.js";
const app = express();
//biler
import vehicleRoutes from "./routes/vehicleRoutes.js";
//tekst
import contentRoutes from "./routes/contentRoutes.js";
//driver kordinater
import locationRoutes from "./routes/locationRoutes.js";
import sessionsRoutes from "./routes/sessions.js";

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

const uploadsDir = path.join(dirName, "/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
} // lager mappe hvis mappen ikke finnes
app.use(
  cors({
    origin: "https://vikentours-opal.vercel.app", // React app running here
    //origin: "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
); // To allow requests from REACT Frontend

app.use(express.json());
app.use(cookieParser()); // For handling of cookies

//Routes for the API services
app.use("/api/admin", sessionsRoutes);
app.use("/api/admin", driversRoutes);
app.use("/api", PriceRoutes);
app.use("/api/admin", customersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/stats", statsRoutes);
app.use("/api", vehicleRoutes);
app.use("/api", ordersRoutes);
app.use("/api", locationRoutes);
app.use("/api/content", contentRoutes);
app.use("/uploads", express.static(uploadsDir));

// Start the server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
