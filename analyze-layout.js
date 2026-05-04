export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rooms, furniture } = req.body;
    if (!rooms || !furniture) return res.status(400).json({ error: 'missing data' });

    const roomDesc = rooms.map(r => r.name + '(' + r.w + 'x' + r.d + 'cm)').join(', ');
    const furnDesc = furniture.map(f => f.name + '(' + f.w + 'x' + f.d + 'cm)').join(', ');

    const prompt = '인테리어 전문가입니다. 방과 가구 배치를 JSON으로만 답하세요 (마크다운 없이, 설명 없이).\n방: ' + roomDesc + '\n가구: ' + furnDesc + '\n반드시 이 형식으로만: {"score":85,"grade":"A","summary":"요약","highlights":["좋은점1","좋은점2","주의사항"],"rooms":[{"name":"방이름","emoji":"이모지","score":88,"furniture":[{"name":"가구","emoji":"이모지","position":"위치","reason":"이유"}],"tip":"팁"}],"order":[{"name":"가구","emoji":"이모지","dest":"위치","seq":1}]}';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    console.log('API response status:', response.status);
    console.log('API data:', JSON.stringify(data).substring(0, 200));
    
    if (data.error) return res.status(500).json({ error: data.error.message });
    if (!data.content || !data.content.length) return res.status(500).json({ error: 'empty response' });

    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    res.status(200).json(result);

  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
