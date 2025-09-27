const express = require('express');
const { sql } = require('@vercel/postgres');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
// Vercel fornecerá a variável de ambiente PORT. Fallback para 3001 para desenvolvimento local.
const port = process.env.PORT || 3001;
const saltRounds = 10;

// Middleware
app.use(cors());
app.use(express.json());

// Uma função assíncrona auto-invocável para garantir que a tabela exista.
(async () => {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            );
        `;
        console.log('Tabela "users" está pronta.');
    } catch (error) {
        console.error('Erro ao criar tabela de usuários:', error);
    }
})();

// --- Endpoints da API ---

// Registro de Usuário
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    try {
        // Verifica se o usuário já existe
        const { rows: existingUsers } = await sql`SELECT * FROM users WHERE email = ${email}`;
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Este email já está em uso.' });
        }

        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        const { rows } = await sql`
            INSERT INTO users (name, email, password_hash)
            VALUES (${name}, ${email}, ${passwordHash})
            RETURNING id, name, email;
        `;
        
        const newUser = rows[0];
        res.status(201).json({ message: 'Usuário registrado com sucesso!', user: newUser });

    } catch (error) {
        console.error('Erro durante o registro:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Login de Usuário
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        
        if (match) {
            // Senhas coincidem
            const userToReturn = { id: user.id, name: user.name, email: user.email };
            res.status(200).json({ message: 'Login bem-sucedido!', user: userToReturn });
        } else {
            // Senhas não coincidem
            res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro durante o login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando na porta ${port}`);
});
