export default async (request) => {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const location = searchParams.get('location');
  
  const API_KEY = Deno.env.get('HEFENG_API_KEY');
  const BASE_URL = Deno.env.get('HEFENG_BASE_URL') || 'https://m667cfw6ja.re.qweatherapi.com';
  
  if (!path || !location) {
    return new Response(JSON.stringify({ error: '缺少必要参数' }), { status: 400 });
  }
  
  const apiUrl = `${BASE_URL}${path}?location=${location}&key=${API_KEY}`;
  
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};