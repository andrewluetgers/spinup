import express, { Express } from "express"
const app = express()


app.use(express.static('public'));
app.get("/", (req, res) => res.send("It works!"));

if (import.meta.env.PROD)
    app.listen(3000);

export const viteNodeApp: Express = app;
