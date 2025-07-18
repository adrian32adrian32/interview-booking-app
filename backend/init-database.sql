-- init-database.sql
-- Script pentru inițializarea bazei de date Interview Booking App

-- Creează baza de date (rulează doar dacă nu există)
-- CREATE DATABASE interview_booking_db;

-- Conectează-te la baza de date
-- \c interview_booking_db;

-- Creează tabela users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'interviewer')),
    phone VARCHAR(50),
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Creează tabelul pentru programări (bookings)
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    
    -- Informații despre candidat
    candidate_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    candidate_phone VARCHAR(50),
    
    -- Informații despre intervievator
    interviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    interviewer_name VARCHAR(255),
    interviewer_email VARCHAR(255),
    
    -- Detalii programare
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER DEFAULT 60,
    
    -- Tipul interviului
    interview_type VARCHAR(50) DEFAULT 'technical' 
        CHECK (interview_type IN ('technical', 'hr', 'behavioral', 'system_design', 'final')),
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled' 
        CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show')),
    
    -- Detalii adiționale
    meeting_link VARCHAR(500),
    location VARCHAR(255),
    notes TEXT,
    candidate_notes TEXT,
    interviewer_feedback TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Index pentru căutări rapide
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_candidate ON bookings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_bookings_interviewer ON bookings(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Tabel pentru sloturi de timp disponibile
CREATE TABLE IF NOT EXISTS time_slots (
    id SERIAL PRIMARY KEY,
    interviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 60,
    break_duration INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel pentru zile libere/indisponibile
CREATE TABLE IF NOT EXISTS unavailable_dates (
    id SERIAL PRIMARY KEY,
    interviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    unavailable_date DATE NOT NULL,
    reason VARCHAR(255),
    all_day BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel pentru notificări
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL 
        CHECK (type IN ('booking_created', 'booking_confirmed', 'booking_cancelled', 
                       'booking_reminder', 'booking_rescheduled', 'feedback_request')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger pentru actualizare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplică trigger pe tabele
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_slots_updated_at ON time_slots;
CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON time_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funcție pentru a verifica disponibilitatea unui slot
CREATE OR REPLACE FUNCTION check_slot_availability(
    p_interviewer_id INTEGER,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verifică dacă există deja o programare în acel interval
    SELECT COUNT(*) INTO v_count
    FROM bookings
    WHERE interviewer_id = p_interviewer_id
    AND booking_date = p_date
    AND status NOT IN ('cancelled', 'rescheduled')
    AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
    );
    
    -- Verifică dacă data este marcată ca indisponibilă
    IF v_count = 0 THEN
        SELECT COUNT(*) INTO v_count
        FROM unavailable_dates
        WHERE interviewer_id = p_interviewer_id
        AND unavailable_date = p_date
        AND (
            all_day = true OR
            (start_time <= p_start_time AND end_time >= p_end_time)
        );
    END IF;
    
    RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql;

-- Inserează date de test
DO $$
BEGIN
    -- Verifică dacă există deja admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com') THEN
        -- Password: admin123 (hash generat cu bcrypt)
        INSERT INTO users (name, email, password, role, is_active)
        VALUES ('Administrator', 'admin@example.com', 
                '$2a$10$YourHashHere', 'admin', true);
    END IF;
    
    -- Adaugă câțiva utilizatori de test
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'interviewer1@example.com') THEN
        INSERT INTO users (name, email, password, role, phone, is_active)
        VALUES 
        ('John Doe', 'interviewer1@example.com', 
         '$2a$10$YourHashHere', 'interviewer', '+40721234567', true),
        ('Jane Smith', 'interviewer2@example.com', 
         '$2a$10$YourHashHere', 'interviewer', '+40721234568', true),
        ('Test Candidate', 'candidate1@example.com', 
         '$2a$10$YourHashHere', 'user', '+40721234569', true);
    END IF;
END $$;

-- Afișează tabelele create
\dt

-- Verifică structura tabelelor
\d users
\d bookings
\d time_slots
\d notifications