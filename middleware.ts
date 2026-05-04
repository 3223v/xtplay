import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "session_id";
const USER_DATA_COOKIE_NAME = "user_data";

const PUBLIC_PATHS = [
  "/",
  "/docs",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/verify",
  "/public/market",
  "/api/public/market",
];

const STATIC_FILE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".css",
  ".js",
  ".json",
  ".txt",
  ".xml",
];

const LOGIN_PAGE_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XTPlay - 登录</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #f8fafc 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .container {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 48px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo img {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    }
    .logo-text {
      margin-top: 16px;
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: -0.5px;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
      text-align: center;
      margin-bottom: 32px;
    }
    .input-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 14px 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      color: #1e293b;
      font-size: 15px;
      outline: none;
      transition: all 0.2s;
    }
    input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      background: #fff;
    }
    input::placeholder {
      color: #94a3b8;
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
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    button:hover {
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .form-footer {
      margin-top: 24px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
    }
    .form-footer code {
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: monospace;
      color: #3b82f6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="/blue.png" alt="XTPlay Logo" onerror="this.style.display='none'">
      <div class="logo-text">XTPlay</div>
    </div>
    <p class="subtitle">请输入用户名或邮箱和密码</p>
    <form id="loginForm">
      <div class="input-group">
        <label for="identifier">用户名或邮箱</label>
        <input type="text" id="identifier" name="identifier" placeholder="请输入用户名或邮箱" required>
      </div>
      <div class="input-group">
        <label for="password">密码</label>
        <input type="password" id="password" name="password" placeholder="请输入密码" required>
        <p id="errorMsg" class="error">用户名或密码错误</p>
      </div>
      <button type="submit">登录</button>
    </form>
    <div class="form-footer">
      默认账号: <code>admin</code> / <code>123456</code>
    </div>
  </div>
  <script>
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorMsg.classList.remove('show');

      const identifier = document.getElementById('identifier').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });

        if (response.ok) {
          window.location.href = '/manage';
        } else {
          errorMsg.classList.add('show');
        }
      } catch {
        errorMsg.classList.add('show');
      }
    });
  </script>
</body>
</html>
`;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => {
    if (publicPath === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(publicPath);
  });
}

function isStaticFile(pathname: string): boolean {
  return STATIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isStaticFile(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const userDataCookie = request.cookies.get(USER_DATA_COOKIE_NAME)?.value;

  if (!userDataCookie) {
    return new NextResponse(LOGIN_PAGE_HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  try {
    const urlDecoded = decodeURIComponent(userDataCookie);
    const userData = JSON.parse(atob(urlDecoded));
    const response = NextResponse.next();
    response.headers.set("X-User-Id", userData.id);
    return response;
  } catch {
    return new NextResponse(LOGIN_PAGE_HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};