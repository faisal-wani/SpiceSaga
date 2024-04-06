import express from "express";
import mariadb from "mariadb";
import session from 'express-session';
import bodyParser from "body-parser";
import multer from 'multer';


import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('views', path.join(__dirname, 'views'));



const port = 3000;


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 






app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
//maintaining session
const sessionMiddleware = session({
    secret: 'mylongrandomstringforsessioncookie',
    resave: false,
    saveUninitialized: false
});
app.use(sessionMiddleware);

const storage = multer.diskStorage({
    destination: './uploads/', // specify the destination folder where files will be stored
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); // define the filename
    }
});

const upload = multer({
    storage: storage
});

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '8825',
    database: 'spicesaga',
    connectionLimit: 5
});

pool.getConnection()
    .then(conn => {
        console.log('Connected to the MariaDB database!');
        conn.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    pool.query('SELECT * FROM user WHERE (username = ? OR email = ?) AND password = ?', [username, username, password])
        .then(results => {
            if (results.length > 0) {
                req.session.user_id = Number(results[0].user_id);
                res.send('<script>alert("Login successful!"); window.location.href="/";</script>');
            } else {
                res.status(401).send('Invalid username or password');
            }
        })
        .catch(err => {
            console.error('Error executing query:', err);
            res.status(500).send('Internal server error');
        });
});

app.post('/register', (req, res) => {
    const { firstname, lastname, email, password } = req.body;
    const username = `${firstname.toLowerCase()}_${lastname.toLowerCase()}`;
    pool.query('INSERT INTO user (username, email, password) VALUES (?, ?, ?)', [username, email, password])
        .then(results => {
            req.session.user_id = Number(results.insertId);
            res.send('<script>alert("registration successful!"); window.location.href="/";</script>');
        })
        .catch(err => {
            console.error('Error executing query:', err);
            res.status(500).send('Internal server error');
        });
});




app.post('/search', (req, res) => {
    const query = req.body.query;
    res.send(`Searching for: ${query}`);
});




app.post('/submit', upload.single('recipeImage'), (req, res) => {
    const { recipe, description, ingredient, procedure, category } = req.body;
    const recipeImage = req.file;

    if (!req.session.user_id) {
        return res.redirect('/project/login.html');
    }

    let categoryId;

    pool.query('SELECT category_id FROM category WHERE name = ?', [category])
        .then(categoryResult => {
            if (categoryResult.length === 0) {
                return pool.query('INSERT INTO category (name) VALUES (?)', [category])
                    .then(insertResult => insertResult.insertId);
            } else {
                return categoryResult[0].category_id;
            }
        })
        .then(insertedCategoryId => {
            categoryId = insertedCategoryId;
            return pool.query('INSERT INTO recipe (name, description, ingredients, instructions, image_path, user_id) VALUES (?, ?, ?, ?, ?, ?)', 
                [recipe, description, ingredient, procedure, recipeImage, req.session.user_id]);
        })
        .then(recipeResult => {
            const recipeId = recipeResult.insertId;
            return pool.query('INSERT INTO recipe_category (recipe_id, category_id) VALUES (?, ?)', [recipeId, categoryId]);
        })
        .then(() => {
            res.send('<script>alert("Submission successful!"); window.location.href="/";</script>');
        })
        .catch(err => {
            console.error('Error executing query:', err);
            res.status(500).send('Internal server error');
        });
});




// GET request for /myaccount
app.get('/myaccount', (req, res) => {
    // Check if user is logged in, if not, redirect to login page
    if (!req.session.user_id) {
        return res.redirect('/project/login.html');
    }

    // Fetch user data from the database
    pool.query('SELECT * FROM user WHERE user_id = ?', [req.session.user_id])
        .then(results => {
            // Render myaccount.ejs with fetched data
            res.render('myaccount', { user: results[0] });
        })
        .catch(err => {
            console.error('Error executing query:', err);
            res.status(500).send('Internal server error');
        });
});
// GET route for the logout page
app.get('/logout', (req, res) => {
    // Perform logout operation here, such as destroying the session
    // For example, if you are using sessions with Express.js:
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            // Handle error
            res.status(500).send('Internal Server Error');
        } else {
            // Redirect the user to the login page or any other page after logout
            res.redirect('/'); // Redirect to the login page
        }
    });
});







app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal server error');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
