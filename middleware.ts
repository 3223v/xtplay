import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "ground_auth";
const GROUND_ROUTE = "/ground";

function isAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

function getAuthPassword(): string {
  return process.env.AUTH_PASSWORD || "";
}

const LOGIN_PAGE_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XTPlay - 访问验证</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .container {
      background: rgba(26, 26, 46, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 48px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    h1 {
      color: #fff;
      font-size: 24px;
      margin-bottom: 8px;
      text-align: center;
    }
    .subtitle {
      color: #9ca3af;
      font-size: 14px;
      text-align: center;
      margin-bottom: 32px;
    }
    .input-group {
      margin-bottom: 24px;
    }
    label {
      display: block;
      color: #d1d5db;
      font-size: 14px;
      margin-bottom: 8px;
    }
    input[type="password"] {
      width: 100%;
      padding: 14px 18px;
      background: #0d0d14;
      border: 1px solid #2a2a3e;
      border-radius: 12px;
      color: #fff;
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="password"]:focus {
      border-color: #6366f1;
    }
    .error {
      color: #ef4444;
      font-size: 13px;
      margin-top: 8px;
      display: none;
    }
    .error.show { display: block; }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    .logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo svg {
      width: 48px;
      height: 48px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="url(#g)" stroke-width="2"/>
        <circle cx="20" cy="20" r="8" fill="url(#g)"/>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stop-color="#22c55e"/>
            <stop offset="100%" stop-color="#38bdf8"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <h1>访问验证</h1>
    <p class="subtitle">请输入密码以访问 Ground 页面</p>
    <form id="loginForm">
      <div class="input-group">
        <label for="password">密码</label>
        <input type="password" id="password" name="password" placeholder="请输入访问密码" required>
        <p id="errorMsg" class="error">密码错误，请重新输入</p>
      </div>
      <button type="submit">验证</button>
    </form>
  </div>
  <script>
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const passwordInput = document.getElementById('password');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.classList.remove('show');
      const password = passwordInput.value;

      try {
        const response = await fetch('/api/auth/verify?password=' + encodeURIComponent(password));
        if (response.ok) {
          window.location.href = '/ground';
        } else {
          errorMsg.classList.add('show');
          passwordInput.value = '';
          passwordInput.focus();
        }
      } catch {
        errorMsg.classList.add('show');
      }
    });
  </script>
</body>
</html>
`;

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== GROUND_ROUTE) {
    return NextResponse.next();
  }

  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  const password = getAuthPassword();

  if (authCookie?.value === password) {
    return NextResponse.next();
  }

  return new NextResponse(LOGIN_PAGE_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export const config = {
  matcher: ["/ground"],
};