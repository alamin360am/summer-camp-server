const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

require("dotenv").config();

// Middleware

const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", 'PATCH'],
};
app.use(cors(corsConfig));
app.options("", cors(corsConfig));
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kacof5g.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("summer-camp-DB").collection("users");
    const classCollection = client.db("summer-camp-DB").collection("class");
    const cartCollection = client.db("summer-camp-DB").collection("carts");

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    // Users API

    app.get('/users', async(req, res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async(req, res) =>{
      const user = req.body;
      const query = {email: user.email};
      const existingUser = await usersCollection.findOne(query);
      if(existingUser) {
        return res.send({message: 'user already exists'})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.patch('/users/instructor/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // Class API

    app.get("/classes", async(req, res) =>{
        let query = {}
        const options = {
            sort: {"numberOfStudents" : -1}
        }
        const result = await classCollection.find(query, options).toArray();
        res.send(result);
    })

    // Cart API

    app.get('/carts', async(req, res)=>{
      const email = req.query.email;
      if(!email) {
        res.send([])
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/carts', async(req, res) =>{
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    })

    app.delete('/carts/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
