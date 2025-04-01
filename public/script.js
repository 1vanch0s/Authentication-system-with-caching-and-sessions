document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const profileSection = document.getElementById('profile-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
  
    // Изначально скрываем профиль
    if (profileSection) profileSection.classList.add('hidden');
  
    // Проверка авторизации при загрузке
    checkAuth();
  
    // Обработчик входа (обновленная версия)
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const errorElement = document.getElementById('error-message');
  
      // Валидация полей
      if (!username || !password) {
        showError('Логин и пароль обязательны');
        return;
      }
  
      try {
        // Показываем состояние загрузки
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Вход...';
        submitBtn.disabled = true;
  
        const response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
          credentials: 'include'
        });
  
        // Возвращаем нормальное состояние кнопки
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Неверные учетные данные');
        }
  
        const data = await response.json();
        
        // Вариант 1: Если сервер возвращает redirect
        if (data.redirect) {
          window.location.href = data.redirect;
        } 
        // Вариант 2: Если нужно обновить страницу (старый вариант)
        else if (data.success) {
          window.location.reload();
        }
        else {
          throw new Error('Неизвестный ответ сервера');
        }
      } catch (err) {
        showError(err.message || 'Ошибка входа');
        console.error('Ошибка входа:', err);
      }
    });
  }
  
    // Обработчик регистрации
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
  
        try {
          const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
          });
  
          const data = await response.json();
          if (data.success) {
            window.location.href = '/profile.html';
          } else {
            showError(data.error || 'Ошибка регистрации');
          }
        } catch (err) {
          showError('Ошибка соединения');
        }
      });
    }
  
    // Обработчик выхода
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await fetch('/logout', { method: 'POST', credentials: 'include' });
          window.location.href = '/index.html';
        } catch (err) {
          console.error('Ошибка при выходе:', err);
        }
      });
    }
  
    async function checkAuth() {
      try {
        const response = await fetch('/check-auth', { credentials: 'include' });
        const data = await response.json();
        
        if (data.authenticated) {
          if (authSection) authSection.classList.add('hidden');
          if (profileSection) profileSection.classList.remove('hidden');
          if (document.getElementById('username-display')) {
            document.getElementById('username-display').textContent = data.user.username;
          }
        }
      } catch (err) {
        console.error('Ошибка проверки авторизации:', err);
      }
    }
  
    function showError(message) {
      const errorElement = document.getElementById('error-message');
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
          errorElement.style.display = 'none';
        }, 3000);
      }
    }
    // ===== Блок управления темой =====
  // 1. Инициализация темы при загрузке
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Обновляем кнопку (если есть)
    if (document.getElementById('theme-toggle')) {
      document.getElementById('theme-toggle').textContent = 
        savedTheme === 'light' ? 'Темная тема' : 'Светлая тема';
    }
  };

  // 2. Переключение темы
  const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Обновляем текст кнопки
    if (document.getElementById('theme-toggle')) {
      document.getElementById('theme-toggle').textContent = 
        newTheme === 'light' ? 'Темная тема' : 'Светлая тема';
    }
  };

  // 3. Инициализируем тему при загрузке
  initTheme();

  // 4. Вешаем обработчик на кнопку (если она есть)
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('refresh-data')?.addEventListener('click', async () => {
    const response = await fetch('/data', { credentials: 'include' });
    const data = await response.json();
    // Обновить интерфейс с новыми данными
  });
  });