const express = require("express")
const cors = require("cors")

const app = express()
let corsOptions = {
    origin: "http://localhost:3000"
}

app.use(cors(corsOptions))

// Parse requests of content type: "application/json"
app.use(express.json())
app.use(express.urlencoded({extended: true}))


//Default route
app.get("/", (req,res) => {
    res.json({message: "Welcome to NodeJS Restful API Default Route"})
})

const PORT = process.env.SERVER_PORT || 5000;

app.listen(PORT, () => {
    console.log(`NodeJS Server is running on Port: ${PORT}`)
})

