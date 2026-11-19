import http from "node:http";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/authRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Allow cross-origin requests from frontend on port 3000
app.use(cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


// import http from "node:http";

// let queue = [
//     {name: "John Petrucci", position: 1, status: "waiting"},
//     {name: "Michaelangelo Batio", position: 2, status: "waiting"},
//     {name: "Yngvie Malmsteen", position: 3, status: "waiting"},
//     {name: "Steve Vai", position: 4, status: "waiting"},
//     {name: "Joe Satriani", position: 5, status: "waiting"},
//     {name: "Paul Gilbert", position: 6, status: "waiting"},
//     {name: "Eddie Van Halen", position: 7, status: "waiting"},
//     {name: "Jimmy Hendrix", position: 8, status: "waiting"},
// ]

// const server = http.createServer((req, res) => {
//     res.setHeader("Content-Type", "application/json");

//     if(req.method === "GET" && req.url === "/tickets"){
//         res.writeHead(200);
//         res.end(JSON.stringify({count: queue.length, queue}));

//         for(let i = 0; i < queue.length; i++){
//             console.log(`Position: ${queue[i].position}, Name: ${queue[i].name}, Status: ${queue[i].status}`);
//         }
        
//         return;
//     }

//     if(req.method === "POST" && req.url === "/tickets"){
//         let body = "";

//         req.on("data", (chunk) => {
//             body += chunk.toString();
//         })

//         req.on("end", () => {
//             try{
//                 const {name, service} = JSON.parse(body);

//                 if(!name || !service){
//                     res.writeHead(400);
//                     res.end(JSON.stringify({error: "Name and service are required"}));
//                     return;
//                 }
                
//                 const newTicket = {
//                     name,
//                     position: queue.length + 1,
//                     status: "waiting"
//                 };

//                 queue.push(newTicket);
//                 res.writeHead(201);
//                 res.end(JSON.stringify(newTicket));
//             }

//             catch(error){
//                 res.writeHead(400);
//                 res.end(JSON.stringify({error: "Something went wrong, please try again later"}));
//             }
//         });

//         return;
//     }

//     res.writeHead(404);
//     res.end(JSON.stringify({error: "Route not found"}));
//     // res.end("Server is running!\n");
// });

// server.listen(3000, () => {
//     console.log("Server is running on http://localhost:3000")
// });

