const express = require("express")
const path = require("path")
const fs = require("fs")

const port = 4200

const app = express()

app.use(express.static(path.join(__dirname, "web")))

app.listen(port, () => console.log("Started listening"))
