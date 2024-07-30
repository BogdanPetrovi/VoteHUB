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
app.use(express.json());
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
    const queryText = req.query;
    if(req.isAuthenticated()){
        const polls = await db.query("SELECT * FROM users JOIN polls ON polls.creator_id = users.id ORDER BY polls.id DESC");
        const options = await db.query("SELECT * FROM options");
        const votes = await db.query("SELECT * FROM votes WHERE user_id = $1", [user.id]);
        if(queryText.vote){
            res.render("index.ejs", {user: user, polls: polls.rows, options: options.rows, votes: votes.rows,vote: queryText});
        } else {
            res.render("index.ejs", {user: user, polls: polls.rows, options: options.rows, votes: votes.rows});
        }
    } else {
        res.redirect("/login");
    }
});

app.get("/make-poll", (req,res) => {
    if(req.isAuthenticated()){
        const user = req.user;
        if(user.is_admin){
            console.log(user);
            res.render("newpoll.ejs", {user: user});
        }
        else {
            res.redirect("/home");
        }
    } else {
        res.redirect("/login");
    }
});

app.get("/poll/:id", async (req,res) => {
    if(req.isAuthenticated()){
        const user = req.user;
        const poll_id = req.params.id;
        try {
            const poll = await db.query("SELECT * FROM polls JOIN options ON polls.id = options.poll_id WHERE polls.id = $1", [poll_id]);
            const creator = await db.query("SELECT * FROM users WHERE id=$1", [poll.rows[0].creator_id]);
            const vote = await db.query("SELECT * FROM votes WHERE poll_id=$1 AND user_id=$2", [poll_id, user.id]); 
            const allVotes = await db.query("SELECT * FROM votes WHERE poll_id=$1", [poll_id]);
            const options = await db.query("SELECT * FROM options WHERE poll_id=$1", [poll_id]);
            res.render("poll.ejs", {user: user, poll: poll.rows, vote: vote.rows, allVotes: allVotes.rows, options: options.rows, creator: creator.rows});
        } catch (error) {
            console.log(error);
            res.redirect("/home");
        }   
    } else {
        res.redirect("/login")
    }
});

app.get("/profile/:id", async (req, res) => {
    if(req.isAuthenticated()){
        const user = req.user;
        const userProfileId = req.params.id;
        try {
            const profile = await db.query("SELECT * FROM users WHERE id=$1", [userProfileId]);
            if(profile.rows.length > 0){
                const votes = await db.query("SELECT * FROM votes WHERE user_id=$1 ORDER BY id DESC LIMIT 10 ;", [userProfileId]);
                if(votes.rows.length > 0){
                    try {
                        const polls = await db.query("SELECT * FROM votes JOIN polls ON polls.id = votes.poll_id JOIN options ON votes.option_id = options.id WHERE votes.user_id = $1 ORDER BY votes.id DESC LIMIT 10;", [userProfileId]);
                        if(profile.rows[0].is_admin){
                            const created = await db.query("SELECT * FROM polls WHERE creator_id = $1", [userProfileId]);
                            res.render("profile.ejs", {user: user, profile:profile.rows, votes:votes.rows, polls:polls.rows, created: created.rows});
                        } else {
                            res.render("profile.ejs", {user: user, profile:profile.rows, votes:votes.rows, polls:polls.rows});
                        }
                    } catch (error) {
                        console.log(error);
                        res.redirect("/home");
                    }
                } else {
                    res.render("profile.ejs", {user:user, profile: profile.rows});
                }
            } else {
                res.render("profile.ejs", {user: user, error: "Profile not found"});
            }
        } catch (error) {
            console.log(error);
            res.send("Unknown error");
        }
    } else{
        res.redirect("/login");
    }
})

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

app.post('/logout', function(req, res, next){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/login');
    });
});

app.post("/make-poll", async (req,res) => {
    if(req.isAuthenticated()){
        const pollName = req.body["name"];
        const user = req.user;
        try {
            const result = await db.query("INSERT INTO polls (name, creator_id) VALUES($1, $2) RETURNING *;", [pollName,user.id]);
            console.log(result.rows[0]);
            const pollId = result.rows[0].id;
            const option1 = req.body["option1"];
            const option2 = req.body["option2"];
            try {
                const result1 = await db.query("INSERT INTO options (poll_id, option_text) VALUES($1, $2);", [pollId, option1])
                const result2 = await db.query("INSERT INTO options (poll_id, option_text) VALUES($1, $2);", [pollId, option2])
                res.redirect(`/poll/${pollId}`);
            } catch (error) {
                console.log(error + "while inserting values in options");
                res.render("newpoll.ejs", {user:user, error:"Unpredictable unhandled error, try again"})
            }
        } catch(error) {
            console.log(error);
            res.status(400).json({message:"Poll with this name already exists!"});
        }
        }
    else{
        res.redirect("/home");
    }
    
});

app.post("/vote", async (req, res) => {
    const optionId = req.body["radio"];
    const pollId = req.body["pollId"];
    const user = req.user;
    try {
        const result = await db.query("INSERT INTO votes (poll_id, option_id, user_id) VALUES($1, $2, $3);", [pollId, optionId, user.id]);
        const result1 = await db.query("SELECT option_text FROM options WHERE id=$1;",[optionId]);
        res.redirect(`/home?vote=You succesfully voted for:&option=${result1.rows[0].option_text}&pollid=${pollId}`);
    } catch (error) {
        if(error.constraint == 'unique_poll_user'){
            console.log("User already voted on this poll");
            res.redirect("/home?vote=You already voted on this poll");
        } else {
            console.log(error);
            res.redirect("/home?vote=Please select one of the options before clicking submit!");
        }
    }
});

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