const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/GetMembers", (req, res) => {
    res.json({ 
        members: [
            {
                name: "Dr. Benjamin Dover",
                bio: "Professional UK based doctor who heals sick codes and programmers by using his magic gloves."
            },
            {
                name: "Beach Lasaga",
                bio: "Example of real professional. He has a cool haircut. From India."
            }
        ] 
    });
});

app.listen(1234);