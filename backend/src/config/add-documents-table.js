const { pool } = require('./database');

async function addDocumentsTable() {
  try {
    // Creează tabela user_documents
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        verified_by INTEGER REFERENCES users(id),
        verification_notes TEXT,
        CONSTRAINT valid_document_type CHECK (document_type IN ('id_front', 'id_back', 'selfie', 'other'))
      );
    `);

    // Creează index pentru user_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
    `);

    // Creează index pentru document_type
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_documents_type ON user_documents(document_type);
    `);

    console.log('✅ Tabela user_documents creată cu succes!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Eroare la crearea tabelei:', error);
    process.exit(1);
  }
}

addDocumentsTable();
