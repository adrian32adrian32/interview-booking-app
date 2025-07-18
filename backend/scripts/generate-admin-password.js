const bcrypt = require('bcryptjs');

// Funcție pentru generare hash admin
async function generateAdminHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('=== ADMIN USER ===');
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nUse this SQL to INSERT admin:');
    console.log(`INSERT INTO users (name, email, password, role, is_active) VALUES ('Administrator', 'admin@example.com', '${hash}', 'admin', true);`);
    console.log('\nOr UPDATE if exists:');
    console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@example.com';`);
}

// Funcție pentru generare mai mulți utilizatori
async function generateMultipleUsers() {
    console.log('\n\n=== OTHER TEST USERS ===');
    
    const users = [
        { 
            name: 'John Doe', 
            email: 'interviewer1@example.com', 
            password: 'test123', 
            role: 'interviewer',
            phone: '+40721234567'
        },
        { 
            name: 'Jane Smith', 
            email: 'interviewer2@example.com', 
            password: 'test123', 
            role: 'interviewer',
            phone: '+40721234568'
        },
        { 
            name: 'Test Candidate', 
            email: 'candidate1@example.com', 
            password: 'test123', 
            role: 'user',
            phone: '+40721234569'
        }
    ];
    
    console.log('\n-- SQL pentru inserare utilizatori de test:');
    console.log('-- Copiază și rulează în PostgreSQL:\n');
    
    for (const user of users) {
        const hash = await bcrypt.hash(user.password, 10);
        console.log(`-- ${user.role}: ${user.email} (password: ${user.password})`);
        console.log(`INSERT INTO users (name, email, password, role, phone, is_active)`);
        console.log(`VALUES ('${user.name}', '${user.email}', '${hash}', '${user.role}', '${user.phone}', true);`);
        console.log();
    }
}

// Funcție pentru verificare hash
async function verifyPassword(plainPassword, hash) {
    const isValid = await bcrypt.compare(plainPassword, hash);
    console.log(`\n=== VERIFY PASSWORD ===`);
    console.log(`Password: ${plainPassword}`);
    console.log(`Hash: ${hash}`);
    console.log(`Is valid: ${isValid}`);
}

// Funcție principală
async function main() {
    // Generează hash pentru admin
    await generateAdminHash();
    
    // Generează utilizatori de test
    await generateMultipleUsers();
    
    // Exemplu de verificare (opțional)
    // const testHash = '$2b$10$DveZ5yRwL8WsxPuINm0Nkuq1iBvlVbNQs59SZMnreUHYPckxUcqbi';
    // await verifyPassword('admin123', testHash);
    
    console.log('\n=== INSTRUCȚIUNI ===');
    console.log('1. Copiază SQL-ul de mai sus');
    console.log('2. Rulează: sudo -u postgres psql -d interview_booking_db');
    console.log('3. Lipește și execută SQL-ul');
    console.log('4. Verifică cu: SELECT id, name, email, role FROM users;');
    console.log('5. Ieși cu: \\q');
}

// Rulează scriptul
main().catch(console.error);