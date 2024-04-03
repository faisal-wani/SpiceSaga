import  Express from "express";
import mariadb from "mariadb";
import bodyParser from "body-parser";
var app = Express();
const port = 3000;
app.use(Express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
   

//connecting database
const pool = mariadb.createPool({
    host: 'localhost', // Replace with your MariaDB host
    user: 'root', // Replace with your MariaDB username
    password: '8825', // Replace with your MariaDB password
    database: 'spicesaga', // Replace with your MariaDB database name
    connectionLimit: 5, // Adjust as needed
});
pool.getConnection()
.then((conn) => {
    console.log('Connected to the MariaDB database!');
    conn.release(); // Release the connection back to the pool
    // Perform your queries or other operations here
})
.catch((err) => {
    console.error('Error connecting to the database:', err);
});

  



     // post request from search bar
        app.post('/search', (req, res) => {
        const query = req.body.query;
        res.send(`Searching for: ${query}`);
    });


    //post request from dropdown bar
    app.post('/select', (req, res) => {
        const category = req.body.category;
        // Handle the category in the way you need
        res.send(`Searching for: ${category}`);
    });
    


   //login
   app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    res.send('Login successful');
});



//  registration POST request
app.post('/register', (req, res) => {
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const email = req.body.email;
    const password = req.body.password;
    res.send('Registration successful');
});




//request from qrosel


app.post('/endpoint1', (req, res) => {
    
    console.log('Received post request for endpoint1');
    res.send('Post request received for endpoint1');
});

app.post('/endpoint2', (req, res) => {
    console.log('Received post request for endpoint2');
    res.send('Post request received for endpoint2');
});

app.post('/endpoint3', (req, res) => {
    console.log('Received post request for endpoint3');
    res.send('Post request received for endpoint3');
});



//request for recipe submission
app.post('/submit', (req, res) => {
    // Extract form data from request body
    const recipeName = req.body.recipe;
    const description = req.body.description;
    const ingredient = req.body.ingredient;
    const procedure = req.body.procedure;
    const category = req.body.category;
  
    console.log('Recipe Name:', recipeName);
    console.log('Description:', description);
    console.log('Ingredient:', ingredient);
    console.log('Procedure:', procedure);
    console.log('Chef Name:', chefName);
    
    res.send('Form submitted successfully!');
   
});

//ending recipe submission
    
    


app.listen(port, () => {
console.log( `Server running on port ${port}`)});
