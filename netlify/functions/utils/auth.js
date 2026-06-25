const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabaseAdmin = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
    }
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseAdmin;
}

function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: '密码必须包含字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含数字' };
  }
  return { valid: true, message: '' };
}

async function authenticate(event) {
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { error: '未授权访问' };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return { error: '未提供令牌' };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error) {
      return { error: '令牌无效或已过期' };
    }
    
    if (!data.user) {
      return { error: '用户不存在' };
    }
    
    return { success: true, user: { userId: data.user.id, username: data.user.email } };
  } catch (err) {
    return { error: '认证失败' };
  }
}

module.exports = { validatePassword, authenticate };