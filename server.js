require('dotenv').config(); // Добавьте в начало файла
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const cacheDir = path.join(__dirname, 'cache');
const usersFile = path.join(__dirname, 'users.json');
const saltRounds = 10;

if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, '{}');
  }

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));


// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret' , // Используем из .env
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',
    secure: false, // Для разработки на localhost
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  },
  store: new session.MemoryStore() // Явно указываем хранилище
}));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

// Routes (ДОБАВЬТЕ ЭТИ МАРШРУТЫ)
app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const users = JSON.parse(fs.readFileSync(usersFile))

      if (users[username] && await bcrypt.compare(password, users[username].password)) {
        req.session.user = { username };
        return res.json({ success: true, redirect: '/profile.html' });
      }

      if (!username || !password) {
        return res.status(400).json({ error: 'Необходимы username и password' });
      }
      
      if (username === 'admin' && password === '12345') {
        req.session.user = { username };
        return res.json({ success: true });
      }
      
      res.status(401).json({ success: false });
    } catch (err) {
      console.error('Ошибка входа:', err);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  });
  
  app.get('/check-auth', (req, res) => {
    try {
      if (req.session.user) {
        return res.json({ 
          authenticated: true, 
          user: req.session.user 
        });
      }
      res.json({ authenticated: false });
    } catch (err) {
      console.error('Ошибка проверки авторизации:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  app.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error('Ошибка при выходе:', err);
        return res.status(500).json({ success: false });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

// Регистрация пользователя
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Валидация (сохраняем существующие проверки)
        if (!username || !password) {
            return res.status(400).json({ error: 'Логин и пароль обязательны' });
        }

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Логин должен быть от 3 до 20 символов' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
        }

        // Проверяем существование файла users.json
        if (!fs.existsSync(usersFile)) {
            fs.writeFileSync(usersFile, JSON.stringify({}));
        }

        // Чтение и парсинг файла с обработкой ошибок
        let users = {};
        try {
            const usersData = fs.readFileSync(usersFile, 'utf8');
            users = JSON.parse(usersData);
        } catch (readErr) {
            console.error('Ошибка чтения файла пользователей:', readErr);
            // Создаем новый файл, если не смогли прочитать
            fs.writeFileSync(usersFile, JSON.stringify({}));
            users = {};
        }

        // Проверка существующего пользователя
        if (users[username]) {
            return res.status(409).json({ error: 'Пользователь уже существует' });
        }

        // Хэширование пароля с обработкой ошибок
        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, saltRounds);
        } catch (hashErr) {
            console.error('Ошибка хэширования пароля:', hashErr);
            return res.status(500).json({ error: 'Ошибка обработки пароля' });
        }

        // Добавление нового пользователя
        users[username] = { 
            username, 
            password: hashedPassword,
            createdAt: new Date().toISOString()  // Добавляем метку времени
        };

        // Запись в файл с обработкой ошибок
        try {
            fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
        } catch (writeErr) {
            console.error('Ошибка записи файла пользователей:', writeErr);
            return res.status(500).json({ error: 'Ошибка сохранения данных' });
        }

        // Создание сессии
        req.session.user = { 
            username,
            createdAt: users[username].createdAt
        };

        // Ответ с дополнительными данными
        res.json({ 
            success: true, 
            username,
            redirect: '/profile.html',  // Добавляем редирект
            message: 'Регистрация прошла успешно' 
        });

    } catch (err) {
        console.error('Критическая ошибка регистрации:', err);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.get('/profile', (req, res) => {
if (!req.session.user) {
    return res.status(401).json({ error: 'Не авторизован' });
}
res.json({ user: req.session.user });
});

app.listen(3000, () => {
  console.log('Сервер запущен на http://localhost:3000');
});

function getCachedData(key, ttl = 60) {
    const cacheFile = path.join(cacheDir, `${key}.json`);
    
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const age = (Date.now() - stats.mtimeMs) / 1000;
      if (age < ttl) {
        return JSON.parse(fs.readFileSync(cacheFile));
      }
    }
  
    const newData = { /* генерация данных */ };
    fs.writeFileSync(cacheFile, JSON.stringify(newData));
    return newData;
  }

  app.get('/data', (req, res) => {
    const cachedData = getCachedData('api_data', 60); // TTL 60 секунд
    res.json(cachedData);
  });