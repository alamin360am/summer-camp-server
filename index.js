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

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



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
    const addedClassCollection = client.db("summer-camp-DB").collection("added_class");
    const cartCollection = client.db("summer-camp-DB").collection("carts");
    const instructorCollection = client.db("summer-camp-DB").collection("instructor");

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      if(user?.role !== 'admin') {
        return res.status(403).send({error: true, message: 'forbidden message'})
      }
      next();
    }

    const verifyInstructor = async(req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      if(user?.role !== 'instructor') {
        return res.status(403).send({error: true, message: 'forbidden message'})
      }
      next();
    }

    // Users API

    app.get('/users', verifyJWT, verifyAdmin, async(req, res)=>{
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

    app.get('/users/admin/:email', verifyJWT, async(req, res)=>{
      const email = req.params.email;

      if(req.decoded.email !== email) {
        res.send({admin: false})
      }

      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })

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

    app.get('/users/instructor/:email', verifyJWT, async(req, res)=>{
      const email = req.params.email;

      if(req.decoded.email !== email) {
        res.send({instructor: false})
      }

      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const result = {instructor: user?.role === 'instructor'}
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

    app.delete('/users/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
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

    app.post("/classes", async(req, res)=>{
      const classes = req.body;
      const result = await classCollection.insertOne(classes);
      res.send(result);
    })

    app.get("/added_classes", async(req, res)=>{
      const result = await addedClassCollection.find().toArray();
      res.send(result);
    })

    app.get("/added_classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addedClassCollection.findOne(query);
      res.send(result);
    });

    app.put("/added_classes/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedClass = req.body;
      const newToy = {
        $set: {
          title: updatedClass.title,
          instructorName: updatedClass.instructorName,
          instructorEmail: updatedClass.instructorEmail,
          price: updatedClass.price,
          photoUrl: updatedClass.photoUrl,
          availableSeats: updatedClass.availableSeats,
        },
      };
      const result = await addedClassCollection.updateOne( filter, newToy, options );
      res.send(result);
    });

    app.get('/added_classes/:email',  async(req, res)=>{
      const email = req.params.email;
      if(!email) {
        res.send([])
      }

      const query = { email: email };
      const result = await addedClassCollection.find(query).toArray();
      res.send(result);
    })

    app.post("/added_classes", async(req, res)=>{
      const classes = req.body;
      const result = await addedClassCollection.insertOne(classes);
      res.send(result);
    })

    app.patch('/added_classes/approved/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'approved'
        }
      }
      const result = await addedClassCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.patch('/added_classes/denied/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: 'denied'
        }
      }
      const result = await addedClassCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // Instructor API

    app.get("/instructor", async(req, res)=>{
      let query = {}
      const options = {
        sort: {"numberOfStudents" : -1}
      }
      const result = await instructorCollection.find(query, options).toArray();
      res.send(result);
    })

    app.post('/instructor', async(req, res)=>{
      const instructor = req.body;
      const result = await instructorCollection.insertOne(instructor);
      res.send(result);
    })

    // Cart API

    app.get('/carts', verifyJWT, async(req, res)=>{
      const email = req.query.email;
      if(!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail) {
        return res.status(403).send({error: true, message: 'forbidden access'})
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
