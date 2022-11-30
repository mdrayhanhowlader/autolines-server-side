const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)


// middleware
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send("server is running");
});

// mongo db connect 


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pwszy9e.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next){
    // console.log('token verify', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized access');
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
    })

}


async function run() {
    try {
        const productsCollection = client.db('autolines').collection('products');
        const categoriesCollection = client.db('autolines').collection('categories');
        const bookingsCollection = client.db('autolines').collection('bookings');
        const usersCollection = client.db('autolines').collection('users');
        const wishlistCollection = client.db('autolines').collection('wishlist')
        const paymentsCollection = client.db('autolines').collection('payments')
        

        // get only categories
        app.get('/categories', async(req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/products', async (req, res) => {
            const query = {};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        // get product by seller
        app.get('/sellerproducts', async(req, res) => {
            const email = req.query.email
            const query = {email}
            const products = await productsCollection.find(query).toArray()
            res.send(products)
        })
        // promote products 
        app.put('/promoteproducts/:id', async(req, res) => {
            const id = req.params.id 
            const filter = {_id: ObjectId(id)}
            const options = {upsert: true}
            const updatedDoc = {
                $set: {
                    ad: 'yes'
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })
        // remove promote products 
        app.put('/removepromoteproducts/:id', async(req, res) => {
            const id = req.params.id 
            const filter = {_id: ObjectId(id)}
            const options = {upsert: true}
            const updatedDoc = {
                $set: {
                    ad: 'no'
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        // get promote products 
        app.get('/promoteditem', async(req, res) => {
            const query = {ad: 'yes'}
            const result = await productsCollection.find(query).limit(3).toArray()
            res.send(result)
            
        })
        // get remove promote products 
        app.get('/removepromoteitem', async(req, res) => {
            const query = {ad: 'no'}
            const result = await productsCollection.find(query).toArray()
            res.send(result)
            
        })

       // delete promote products 
        app.delete('/deletepromoteitem/:id', async(req, res) => {
            const id = req.params.id 
            const query = {_id: ObjectId(id)}
            const result = await productsCollection.deleteOne(query)
            res.send(result)
        })

        // verified seller 
        app.put('/verifiedseller', async(req, res) => {
            const email = req.query.email
            const filter = {email}
            const options = {upsert: true}
            const updatedDoc = {
                $set: {
                    status: 'verified'
                }
            }
            const result = await productsCollection.updateMany(filter, updatedDoc, options)
            const resultTwo = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send({result, resultTwo})
        })

        // add products to db 
        app.post('/products', async (req, res) => {
            const query = req.body 
            const product = await productsCollection.insertOne(query)
            res.send(product)
        })

        // delete product from admin dashboard 
        app.delete('/products/admin/delete/:id', async(req, res) => {
            const id = req.params.id 
            const query = {_id: ObjectId(id)}
            const deleteProduct= await productsCollection.deleteOne(query)
            res.send(deleteProduct)
        })
        
        app.get('/categories/:id', async(req, res) => {
            const id = req.params.id;
            const query = {category_id: id};
            const cars = await productsCollection.find(query).toArray()
            res.send(cars)
        })

        // add booked products 
        app.post('/bookings', async(req, res) => {
            const booking = req.body 
            const bookingsProduct = await bookingsCollection.insertOne(booking)
            res.send(bookingsProduct)
        })

        // get all booked products
        app.get('/bookings', async(req, res) => {
            const query = {}
            const bookingsProduct = await bookingsCollection.find(query).toArray()
            res.send(bookingsProduct)
        })

        // bookings by id for payment 
        app.get('/bookings/:id', async(req, res) => {
            const id = req.params.id 
            const query = {_id: ObjectId(id)}
            const booking = await bookingsCollection.findOne(query)
            res.send(booking)
        })

        // bookings for each buyer
        app.get('/allbookings', async(req, res) => {
            const email = req.query.email
            const query = {email} 
            const result = await bookingsCollection.find(query).toArray()
            res.send(result)
        })

        // delete bookings order from db 
        app.delete('/deletebookings/:id', async(req, res) => {
            const id = req.params.id 
            const query = {_id: ObjectId(id)}
            const deleteProduct = await bookingsCollection.deleteOne(query)
            res.send(deleteProduct)
        })

        // get booked products by email
        app.get('/bookings', verifyJWT, async(req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email
            if(!decodedEmail){
                return res.status(403).send({message: 'forbidden access'})
            }
            const query = {email: email}
            const bookings = await bookingsCollection.find(query).toArray()
            res.send(bookings)
        })

        
        // add wishlist
        app.post('/wishlist', async(req, res) => {
            const wishlist = req.body 
            const wishlistProduct = await wishlistCollection.insertOne(wishlist)
            res.send(wishlistProduct)
        })


        app.get('/wishlist', async(req, res) => {
            const email = req.query.email 
            const query = {email}
            const result = await wishlistCollection.find(query).toArray()
            res.send(result)
        })

        // delete wishlist 
        app.delete('/deleteWishlist/:id', async(req, res) => {
            const id = req.params.id 
            const query = {_id: ObjectId(id)}
            const result = await wishlistCollection.deleteOne(query)
            res.send(result)
        })

        // jwt 
        app.get('/jwt', async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1h'})
                return res.send({accessToken: token})
            }
            res.status(403).send({accessToken: ''})

        })

        // add user to db 
        app.post('/users', async(req, res) => {
            const user = req.body 
            const users = await usersCollection.insertOne(user) 
            res.send(users)
        })

        // get admin 
        app.get('/users/admin/:email', async(req, res) => {
            const email = req.params.email
            const query = {email}
            const user = await usersCollection.findOne(query)
            res.send({isAdmin: user?.role === 'admin'})
        })
        // get seller 
        app.get('/users/seller/:email', async(req, res) => {
            const email = req.params.email
            const query = {email}
            const user = await usersCollection.findOne(query)
            res.send({isSeller: user?.role === 'Seller'})
        })
        // get buyer 
        app.get('/users/buyer/:email', async(req, res) => {
            const email = req.params.email
            const query = {email}
            const user = await usersCollection.findOne(query)
            res.send({isBuyer: user?.role === 'Buyer'})
        })

        // get admin from db for dashboard
        app.get('/admin', async(req, res) => {
            const query = {role: 'admin'};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        // delete admin from db 
        app.delete('/admin/delete/:id', async(req, res) => {
            const id = req.params.id 
            const query = {_id: ObjectId(id)}
            const deleteAdmin = await usersCollection.deleteOne(query)
            res.send(deleteAdmin)
        })

        // get sellers from db for dashboard 
        app.get('/sellers', async(req, res) => {
            const query = {role: 'Seller'};
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers)
            
        })

        // get buyers from db for dashboard 
        app.get('/buyers', async(req, res) => {
            const query = {role: 'Buyer'};
            const buyers = await usersCollection.find(query).toArray()
            res.send(buyers)
        })

        // delete users from database
        app.delete('/users/delete/:id', async(req, res) => {
            const id = req.params.id 
            const query = {_id: ObjectId(id)}
            const deletedUser = await usersCollection.deleteOne(query)
            res.send(deletedUser)
        })


        // set admin user 
        app.put('/users/admin/:id', verifyJWT, async(req, res) => {
            const decodedEmail = req.decoded.email;
            const query = {email: decodedEmail};
            const user = await usersCollection.findOne(query);
            if(user?.role !== 'admin'){
                return res.status(403).send({message: 'forbidden access'})
            }
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = { upsert: true};
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const admin = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(admin);
        })


        // stripe 
        app.post('/create-payment-intent', async(req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types" : [
                    "card"
                ]
            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        app.post('/payments', async(req, res) => {
            const payment = req.body 
            const result = await paymentsCollection.insertOne(payment)
            const id = payment.bookingId
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })
        app.get('/payments', async(req, res) => {
            const email = req.query.email 
            const query = {email}
            const result = await paymentsCollection.find(query).toArray()
            res.send(result)
        })
    }
    finally {

    }
}

run().catch(error => console.error(error))






app.listen(port, () => {
    console.log(`server is running ${port}`)
});

