require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(bodyParser.json());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Fügen Sie diese Zeilen am Anfang Ihrer server.js hinzu
const morgan = require('morgan');
app.use(morgan('dev')); // Logging für alle Anfragen

// Multer Konfiguration für Bildupload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// Datenbankverbindung
const dbConfig = {
  host: 'server.godsapp.de',
  user: 'sfz',
  password: 'R#ZCLCmHxA4wGwr9J$',
  database: 'freizeit_db'
};

// Funktion zur Initialisierung der Datenbank
async function initializeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      ...dbConfig,
      multipleStatements: true
    });
    
    const sql = await fs.readFile('initial_schema.sql', 'utf8');
    
    await connection.query(sql);
    console.log('Database schema created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Middleware zur Überprüfung des JWT
const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Middleware zur Überprüfung der Leiterrolle
const isLeader = async (req, res, next) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute('SELECT is_leader FROM users WHERE id = ?', [req.user.id]);
    if (rows[0].is_leader) {
      next();
    } else {
      res.status(403).json({ message: 'Nur für Leiter zugänglich' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
};

// Routen

// Login
app.post('/login', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('Login-Anfrage erhalten:', req.body);
    const { username, password } = req.body;
    const [rows] = await connection.execute('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    console.log('Datenbankabfrage-Ergebnis:', rows);
    
    if (rows.length > 0) {
      const isPasswordValid = await bcrypt.compare(password, rows[0].password);
      console.log('Passwort gültig:', isPasswordValid);
      
      if (isPasswordValid) {
        const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const response = { 
          token, 
          user: { 
            id: rows[0].id, 
            username: rows[0].username, 
            is_leader: !!rows[0].is_leader 
          } 
        };
        console.log('Sende Antwort:', response);
        res.json(response);
      } else {
        res.status(401).json({ message: 'Ungültiges Passwort' });
      }
    } else {
      res.status(401).json({ message: 'Benutzer nicht gefunden' });
    }
  } catch (error) {
    console.error('Serverfehler beim Login:', error);
    res.status(500).json({ message: 'Serverfehler', error: error.message });
  } finally {
    await connection.end();
  }
});

// Benutzer erstellen (nur für Leiter)
app.post('/users', authenticateJWT, isLeader, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { username, email, first_name, last_name, birth_date, is_leader } = req.body;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const [result] = await connection.execute(
      'INSERT INTO users (username, password, email, first_name, last_name, birth_date, is_leader, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, email, first_name, last_name, birth_date, is_leader, req.user.id]
    );
    res.status(201).json({ message: 'Benutzer erstellt', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
});

// Freizeit erstellen
app.post('/freizeiten', authenticateJWT, isLeader, upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'church_logo', maxCount: 1 }
]), async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { title, location, address_street, address_number, address_zip, address_city, address_country,
            start_date, end_date, theme, church_name, church_street, church_number, church_zip,
            church_city, church_country } = req.body;
    const logo_path = req.files['logo'] ? req.files['logo'][0].path : null;
    const church_logo_path = req.files['church_logo'] ? req.files['church_logo'][0].path : null;
    
    const [result] = await connection.execute(
      'INSERT INTO freizeiten (title, location, address_street, address_number, address_zip, address_city, address_country, start_date, end_date, theme, church_name, church_street, church_number, church_zip, church_city, church_country, logo_path, church_logo_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, location, address_street, address_number, address_zip, address_city, address_country,
       start_date, end_date, theme, church_name, church_street, church_number, church_zip,
       church_city, church_country, logo_path, church_logo_path]
    );
    res.status(201).json({ message: 'Freizeit erstellt', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
});

// Benutzer zu Freizeit hinzufügen
app.post('/user_freizeiten', authenticateJWT, isLeader, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { user_id, freizeit_id, role, address_street, address_number, address_zip, address_city,
            address_country, phone, allergies, food_preferences, swimming_permission, medications,
            special_needs, motto } = req.body;
    const [result] = await connection.execute(
      'INSERT INTO user_freizeiten (user_id, freizeit_id, role, address_street, address_number, address_zip, address_city, address_country, phone, allergies, food_preferences, swimming_permission, medications, special_needs, motto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, freizeit_id, role, address_street, address_number, address_zip, address_city,
       address_country, phone, allergies, food_preferences, swimming_permission, medications,
       special_needs, motto]
    );
    res.status(201).json({ message: 'Benutzer zur Freizeit hinzugefügt', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
});

// Erziehungsberechtigten hinzufügen
app.post('/guardians', authenticateJWT, isLeader, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { user_freizeit_id, first_name, last_name, address_street, address_number, address_zip,
            address_city, address_country, phone, email } = req.body;
    const [result] = await connection.execute(
      'INSERT INTO guardians (user_freizeit_id, first_name, last_name, address_street, address_number, address_zip, address_city, address_country, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_freizeit_id, first_name, last_name, address_street, address_number, address_zip,
       address_city, address_country, phone, email]
    );
    res.status(201).json({ message: 'Erziehungsberechtigter hinzugefügt', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
});

// Leiterinformationen hinzufügen
app.post('/leader_info', authenticateJWT, isLeader, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { user_freizeit_id, church, occupation } = req.body;
    const [result] = await connection.execute(
      'INSERT INTO leader_info (user_freizeit_id, church, occupation) VALUES (?, ?, ?)',
      [user_freizeit_id, church, occupation]
    );
    res.status(201).json({ message: 'Leiterinformationen hinzugefügt', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
});

// Zugriffsanfrage stellen
app.post('/access_requests', async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { user_id, requested_by } = req.body;
    const [result] = await connection.execute(
      'INSERT INTO access_requests (user_id, requested_by) VALUES (?, ?)',
      [user_id, requested_by]
    );
    res.status(201).json({ message: 'Zugriffsanfrage gestellt', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
});

// Zugriffsanfragen abrufen (nur für Leiter)
app.get('/access_requests', authenticateJWT, isLeader, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute('SELECT * FROM access_requests WHERE status = "pending"');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
});

// Zugriffsanfrage genehmigen (nur für Leiter)
app.put('/access_requests/:id/approve', authenticateJWT, isLeader, async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { id } = req.params;
    await connection.execute('UPDATE access_requests SET status = "approved" WHERE id = ?', [id]);
    res.json({ message: 'Zugriffsanfrage genehmigt' });
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler' });
  } finally {
    await connection.end();
  }
});

const PORT = 54322;

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server läuft auf http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
  }
}

startServer();

// Am Ende Ihrer server.js
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Anwendung hier nicht beenden, nur loggen
});
