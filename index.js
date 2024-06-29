import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import env from "dotenv";
import bcrypt from "bcrypt";
import session from 'express-session';
import passport from 'passport';
import { Strategy } from 'passport-local';

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(session ({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 120,
    }
}));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

db.connect();

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.get("/", (req, res) => {
    if(req.isAuthenticated()){
        res.redirect("/home");
    } else {
        res.render("main.ejs");
    }
})

app.get("/login", (req, res) => {
    if(req.isAuthenticated()){
        res.redirect("/home");
    } else {
        res.render("login.ejs");
    }
})

app.get("/login-fail", (req, res) => {
    if(req.isAuthenticated()){
        res.redirect("/home");
    } else {
        res.render("login.ejs", {fail: "Incorrect username or password. Try again"})
    }
})

app.get("/register", (req, res) => {
    if(req.isAuthenticated()){
        res.redirect("/home");
    } else {
        res.render("register.ejs");
    }
})

app.get("/home", async (req, res) => {
    console.log(req.user);
    const user = req.user;
    if(req.isAuthenticated()){
        const info = await db.query("SELECT * FROM polls JOIN options ON polls.id = options.poll_id;");
        const voted = await db.query("SELECT * FROM votes WHERE user_id = $1", [user.id,]);
        console.log(voted.rows);
        console.log(info.rows);
        res.render("index.ejs", {user: user, info: info.rows, votes: voted.rows});
    } else {
        res.redirect("/login");
    }
});

app.post("/register", async (req,res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE username = $1 OR email = $2", 
        [username, email,]);
        
        if(checkResult.rows.length > 0) {
            res.redirect("/login");
        } else {
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if(err){
                    console.log("There was and error while hashing: ", err);
                } else {
                    const result = await db.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *;",
                        [username,email,hash]
                    );
                    const user = result.rows[0];
                    req.login(user, (err) => {
                        console.log(err);
                        res.redirect("/home");
                    })
                }
            })
        }
    } catch (error) {
        console.log(error);
    }
})

app.post("/login", 
    passport.authenticate("local", {
        successRedirect: "/home",
        failureRedirect: "/login-fail" 
    }));

passport.use(new Strategy(async function verify(username, password, cb) {
    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1 OR email = $2;", [username, username]);
        if(result.rows.length > 0){
            const user = result.rows[0];
            const userPass = user.password;
            bcrypt.compare(password, userPass, (err, result) => {
                if(err) {
                    return cb(console.log("da"));
                } else {
                    if(result) {
                        return cb(null, user);
                    } else {
                        return cb(null, false);
                    }
                }
            });
        } else {
            return cb(null, false);
        }
    } catch (err) {
        return cb(err);
    }
}));

passport.serializeUser((user, cb) => {
    cb(null, user);
  });
  
passport.deserializeUser((user,cb) => {
    cb(null,user);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})