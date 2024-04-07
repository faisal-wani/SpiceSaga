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


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


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







app.get('/search', (req, res) => {
    const searchTerm = req.query.query; // Assuming the search term is passed as a query parameter

    // Search for recipes based on the search term
    const recipeQuery = `
        SELECT * 
        FROM recipe 
        WHERE name LIKE '%${searchTerm}%' 
        OR ingredients LIKE '%${searchTerm}%'
    `;

    // Execute the recipe query
    pool.query(recipeQuery)
        .then(recipeResults => {
            if (recipeResults.length > 0) {
                // Parse image_path and update search results
                const searchResults = recipeResults.map(recipe => {
                    const imagePathObject = JSON.parse(recipe.image_path);
                    return {
                        ...recipe,
                        image_path: imagePathObject.path
                    };
                });
                // Render the search results with parsed image paths
                res.render('search', { searchResults: searchResults });
            } else {
                // If no recipes are found, search for categories
                const categoryQuery = `
                SELECT rc.recipe_id AS category_recipe_id, r.*, u.username
                FROM recipe_category rc
                JOIN recipe r ON rc.recipe_id = r.recipe_id
                JOIN category c ON rc.category_id = c.category_id
                LEFT JOIN user u ON r.user_id = u.user_id
                WHERE c.name LIKE '%${searchTerm}%';
                
                


                
                `;

                // Execute the category query
                pool.query(categoryQuery)
                    .then(categoryResults => {
                        if (categoryResults.length > 0) {
                            // Parse image_path and update search results
                            const searchResults = categoryResults.map(recipe => {
                                const imagePathObject = JSON.parse(recipe.image_path);
                                return {
                                    ...recipe,
                                    image_path: imagePathObject.path
                                };
                            });
                            // Render the search results with parsed image paths
                            res.render('search', { searchResults: searchResults });
                        } else {
                            // If no recipes or categories are found, render empty search results
                            res.render('search', { searchResults: [] });
                        }
                    })
                    .catch(err => {
                        console.error('Error executing category query:', err);
                        res.status(500).send('Internal server error');
                    });
            }
        })
        .catch(err => {
            console.error('Error executing recipe query:', err);
            res.status(500).send('Internal server error');
        });
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
