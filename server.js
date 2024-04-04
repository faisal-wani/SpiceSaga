import express from "express";
import mariadb from "mariadb";
import session from 'express-session';
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
//maintaing session
const sessionMiddleware = session({
    secret: 'mylongrandomstringforsessioncookie',
    resave: false,
    saveUninitialized: false
});
app.use(sessionMiddleware);


// Create a database connection pool
const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '8825',
    database: 'spicesaga',
    connectionLimit: 5
});

// Test database connection
pool.getConnection()
    .then(conn => {
        console.log('Connected to the MariaDB database!');
        conn.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

// Handle login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  //   Query the database to check credentials
    
    pool.query('SELECT * FROM user WHERE username = ? OR email=? AND password = ?', [username,username, password])
       .then(results => {
           if (results.length > 0) {
                req.session.user = results[0];
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

// Handle registration
app.post('/register', (req, res) => {
    const { firstname, lastname, email, password } = req.body;
    // Insert new user data into the database
    const username = `${firstname.toLowerCase()}_${lastname.toLowerCase()}`;
    pool.query('INSERT INTO user (username, email, password) VALUES (?, ?, ?)', [username, email, password])
        .then(results => {
            req.session.user = { username, email };
            res.redirect('/');
        })
        .catch(err => {
            console.error('Error executing query:', err);
            res.status(500).send('Internal server error');
        });
});


// Handle search
app.post('/search', (req, res) => {
    const query = req.body.query;
    res.send(`Searching for: ${query}`);
});

// Handle recipe submission
app.post('/submit', (req, res) => {
    const { recipeName, description, ingredient, procedure, category } = req.body;
    // Insert new recipe data into the database
    // Example:
    // pool.query('INSERT INTO recipes (recipeName, description, ingredient, procedure, category) VALUES (?, ?, ?, ?, ?)', [recipeName, description, ingredient, procedure, category])
    //     .then(results => {
    //         res.send('Form submitted successfully!');
    //     })
    //     .catch(err => {
    //         console.error('Error executing query:', err);
    //         res.status(500).send('Internal server error');
    //     });
    console.log('Recipe Name:', recipeName);
    console.log('Description:', description);
    console.log('Ingredient:', ingredient);
    console.log('Procedure:', procedure);
    res.send('Form submitted successfully!');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Internal server error');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
