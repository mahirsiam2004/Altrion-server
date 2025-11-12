const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@smart-deals.99va52p.mongodb.net/?appName=smart-deals`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let courseCollection;
let enrollmentCollection;

async function run() {
  try {
    await client.connect();

    db = client.db("altrion-db");
    courseCollection = db.collection("courses");
    enrollmentCollection = db.collection("enrollments");

    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    // Health check
    app.get("/", (req, res) => {
      res.send("Altrion Learning Platform API is running!");
    });

    // Get all courses with optional filtering
    app.get("/courses", async (req, res) => {
      try {
        const { category, search, featured } = req.query;
        let query = {};

        if (category) {
          query.category = category;
        }

        if (featured === "true") {
          query.isFeatured = true;
        }

        if (search) {
          query.title = { $regex: search, $options: "i" };
        }

        const result = await courseCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.error("GET /courses error:", err);
        res.status(500).send({ message: "Failed to fetch courses" });
      }
    });

    // Get featured courses (for home page)
    app.get("/courses/featured", async (req, res) => {
      try {
        const result = await courseCollection
          .find({ isFeatured: true })
          .limit(6)
          .toArray();
        res.send(result);
      } catch (err) {
        console.error("GET /courses/featured error:", err);
        res.status(500).send({ message: "Failed to fetch featured courses" });
      }
    });

    // Get single course by ID
    app.get("/courses/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await courseCollection.findOne(query);

        if (!result) {
          return res.status(404).send({ message: "Course not found" });
        }

        res.send(result);
      } catch (err) {
        console.error("GET /courses/:id error:", err);
        res.status(500).send({ message: "Failed to fetch course details" });
      }
    });

    // Get courses by instructor email (My Added Courses)
    app.get("/courses/instructor/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { "instructor.email": email };
        const result = await courseCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.error("GET /courses/instructor/:email error:", err);
        res.status(500).send({ message: "Failed to fetch instructor courses" });
      }
    });

    // Add new course
    app.post("/courses", async (req, res) => {
      try {
        const course = req.body;
        course.createdAt = new Date().toISOString();
        course.updatedAt = new Date().toISOString();
        course.enrolledStudents = 0;
        course.rating = 0;

        const result = await courseCollection.insertOne(course);
        res.send(result);
      } catch (err) {
        console.error("POST /courses error:", err);
        res.status(500).send({ message: "Failed to add course" });
      }
    });

    // Update course
    app.put("/courses/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedCourse = req.body;
        delete updatedCourse._id; // Remove _id from update
        updatedCourse.updatedAt = new Date().toISOString();

        const filter = { _id: new ObjectId(id) };
        const update = { $set: updatedCourse };

        const result = await courseCollection.updateOne(filter, update);
        res.send(result);
      } catch (err) {
        console.error("PUT /courses/:id error:", err);
        res.status(500).send({ message: "Failed to update course" });
      }
    });

    // Delete course
    app.delete("/courses/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await courseCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        console.error("DELETE /courses/:id error:", err);
        res.status(500).send({ message: "Failed to delete course" });
      }
    });

    // Enroll in course
    app.post("/enrollments", async (req, res) => {
      try {
        const enrollment = req.body;
        enrollment.enrolledAt = new Date().toISOString();

        // Check if already enrolled
        const existing = await enrollmentCollection.findOne({
          courseId: enrollment.courseId,
          userEmail: enrollment.userEmail,
        });

        if (existing) {
          return res
            .status(400)
            .send({ message: "Already enrolled in this course" });
        }

        const result = await enrollmentCollection.insertOne(enrollment);

        // Increment enrolled students count
        await courseCollection.updateOne(
          { _id: new ObjectId(enrollment.courseId) },
          { $inc: { enrolledStudents: 1 } }
        );

        res.send(result);
      } catch (err) {
        console.error("POST /enrollments error:", err);
        res.status(500).send({ message: "Failed to enroll in course" });
      }
    });

    // Get enrolled courses by user email
    app.get("/enrollments/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const enrollments = await enrollmentCollection
          .find({ userEmail: email })
          .toArray();

        // Get course details for each enrollment
        const courseIds = enrollments.map((e) => new ObjectId(e.courseId));
        const courses = await courseCollection
          .find({ _id: { $in: courseIds } })
          .toArray();

        res.send(courses);
      } catch (err) {
        console.error("GET /enrollments/:email error:", err);
        res.status(500).send({ message: "Failed to fetch enrolled courses" });
      }
    });

    // Get all categories (for filtering)
    app.get("/categories", async (req, res) => {
      try {
        const categories = await courseCollection.distinct("category");
        res.send(categories);
      } catch (err) {
        console.error("GET /categories error:", err);
        res.status(500).send({ message: "Failed to fetch categories" });
      }
    });

    app.listen(port, () => {
      console.log(`Altrion server is running on port ${port}`);
    });
  } catch (err) {
    console.error("Initialization error:", err);
    process.exit(1);
  }
}

run().catch(console.dir);

process.on("SIGINT", async () => {
  console.log("\nShutting down server…");
  try {
    await client.close();
  } finally {
    process.exit(0);
  }
});
