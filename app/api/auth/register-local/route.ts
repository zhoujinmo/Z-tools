import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, AuthUser } from "@/lib/types";

interface LocalUser {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  password: string;
  createdAt: number;
}

const STORAGE_KEY = "space-escape-users";

function getUsers(): LocalUser[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: LocalUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "密码长度至少8位" };
  }
  if (!/[A-Z]/.test(password) && !/[a-z]/.test(password)) {
    return { valid: false, message: "密码需要包含字母" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "密码需要包含数字" };
  }
  return { valid: true, message: "" };
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, email, phone } = await request.json();

    if (!username || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "请提供邮箱或手机号" },
        { status: 400 }
      );
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: passwordCheck.message },
        { status: 400 }
      );
    }

    const users = getUsers();
    
    if (users.some(u => u.username === username)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "用户名已存在" },
        { status: 400 }
      );
    }

    if (email && users.some(u => u.email === email)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "该邮箱已被注册" },
        { status: 400 }
      );
    }

    if (phone && users.some(u => u.phone === phone)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "该手机号已被注册" },
        { status: 400 }
      );
    }

    const newUser: LocalUser = {
      id: "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      username,
      email: email || null,
      phone: phone || null,
      password,
      createdAt: Date.now(),
    };

    users.push(newUser);
    saveUsers(users);

    const user: AuthUser = { id: newUser.id, username, email: newUser.email };

    return NextResponse.json<ApiResponse & { user: AuthUser }>({
      success: true,
      message: "注册成功",
      user,
    });
  } catch (err) {
    return NextResponse.json<ApiResponse>(
      { success: false, message: "服务器错误: " + (err as Error).message },
      { status: 500 }
    );
  }
}