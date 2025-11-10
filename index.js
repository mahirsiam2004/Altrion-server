const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://altrion:pkCenKRG1iL9VDcE@smart-deals.99va52p.mongodb.net/?appName=smart-deals";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let courseCollection;

async function run() {
  try {
   
    await client.connect();

    
    db = client.db("altrion-db");
    courseCollection = db.collection("courses");


    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

   
    app.get("/", (req, res) => {
      res.send("cheaking");
    });

 
    app.get("/courses", async (req, res) => {
      try {
        const result = await courseCollection.find({}).toArray();
        res.send(result);
      } catch (err) {
        console.error("GET /courses error:", err);
        res.status(500).send({ message: "Failed to fetch courses" });
      }
    });


    app.listen(port, () => {
      console.log(`this server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Initialization error:", err);
    process.exit(1);
  }

}

run().catch(console.dir);


process.on("SIGINT", async () => {
  console.log("\nShutting down…");
  try {
    await client.close();
  } finally {
    process.exit(0);
  }
});
