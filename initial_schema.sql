-- Benutzer-Tabelle (erweitert)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),  -- Kann NULL sein, wenn kein Login erstellt wurde
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    profile_picture_path VARCHAR(255),
    is_leader BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Freizeit-Tabelle (erweitert)
CREATE TABLE IF NOT EXISTS freizeiten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    address_street VARCHAR(255) NOT NULL,
    address_number VARCHAR(20) NOT NULL,
    address_zip VARCHAR(20) NOT NULL,
    address_city VARCHAR(255) NOT NULL,
    address_country VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    theme VARCHAR(255),
    church_name VARCHAR(255),
    church_street VARCHAR(255),
    church_number VARCHAR(20),
    church_zip VARCHAR(20),
    church_city VARCHAR(255),
    church_country VARCHAR(255),
    logo_path VARCHAR(255),
    church_logo_path VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Benutzer-Freizeit-Zuordnung (erweitert)
CREATE TABLE IF NOT EXISTS user_freizeiten (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    freizeit_id INT,
    role ENUM('participant', 'team_member', 'leader') NOT NULL,
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_zip VARCHAR(20),
    address_city VARCHAR(255),
    address_country VARCHAR(255),
    phone VARCHAR(20),
    allergies TEXT,
    food_preferences TEXT,
    swimming_permission BOOLEAN,
    medications TEXT,
    special_needs TEXT,
    motto TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (freizeit_id) REFERENCES freizeiten(id)
);

-- Erziehungsberechtigte (pro Freizeit)
CREATE TABLE IF NOT EXISTS guardians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_freizeit_id INT,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    address_street VARCHAR(255) NOT NULL,
    address_number VARCHAR(20) NOT NULL,
    address_zip VARCHAR(20) NOT NULL,
    address_city VARCHAR(255) NOT NULL,
    address_country VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    FOREIGN KEY (user_freizeit_id) REFERENCES user_freizeiten(id)
);

-- Zusätzliche Informationen für Leiter (pro Freizeit)
CREATE TABLE IF NOT EXISTS leader_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_freizeit_id INT,
    church VARCHAR(255),
    occupation VARCHAR(255),
    FOREIGN KEY (user_freizeit_id) REFERENCES user_freizeiten(id)
);

-- Kleingruppen-Tabelle
CREATE TABLE IF NOT EXISTS kleingruppen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    freizeit_id INT,
    name VARCHAR(255) NOT NULL,
    leader_id INT,
    FOREIGN KEY (freizeit_id) REFERENCES freizeiten(id),
    FOREIGN KEY (leader_id) REFERENCES users(id)
);

-- Tagesplan-Tabelle
CREATE TABLE IF NOT EXISTS tagesplan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    freizeit_id INT,
    date DATE NOT NULL,
    activity TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (freizeit_id) REFERENCES freizeiten(id)
);

-- Dienste-Tabelle
CREATE TABLE IF NOT EXISTS dienste (
    id INT AUTO_INCREMENT PRIMARY KEY,
    freizeit_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    assigned_user_id INT,
    FOREIGN KEY (freizeit_id) REFERENCES freizeiten(id),
    FOREIGN KEY (assigned_user_id) REFERENCES users(id)
);

-- Fotos-Tabelle
CREATE TABLE IF NOT EXISTS photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    freizeit_id INT,
    user_id INT,
    file_path VARCHAR(255) NOT NULL,
    caption TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (freizeit_id) REFERENCES freizeiten(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Chat-Tabelle
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    freizeit_id INT,
    sender_id INT,
    receiver_id INT,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    chat_type ENUM('group', 'private') NOT NULL,
    group_id INT,
    FOREIGN KEY (freizeit_id) REFERENCES freizeiten(id),
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Andachten-Tabelle
CREATE TABLE IF NOT EXISTS devotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    freizeit_id INT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL,
    created_by INT,
    FOREIGN KEY (freizeit_id) REFERENCES freizeiten(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Lieder-Tabelle
CREATE TABLE IF NOT EXISTS songs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    lyrics TEXT NOT NULL,
    author VARCHAR(255)
);

-- Blog-Tabelle
CREATE TABLE IF NOT EXISTS blog_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    freizeit_id INT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (freizeit_id) REFERENCES freizeiten(id),
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Neue Tabelle für Zugriffsanfragen
CREATE TABLE IF NOT EXISTS access_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    requested_by INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (requested_by) REFERENCES users(id)
);