export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rooms, furniture } = req.body;
    if (!rooms || !furniture) return res.status(400).json({ error: '방과 가구 정보가 필요해요' });

    const roomDesc = rooms.map(r => `${r.name}(${r.w}×${r.d}cm)`).join(', ');
    const furnDesc = furniture.map(f => `${f.name}(${f.w}×${f.d}cm,${f.room})`).join(', ');

    const prompt = `인테리어 전문가입니다. 방과 가구 배치를 JSON으로만 답하세요 (마크다운 없이).
방: ${roomDesc}
가구: ${furnDesc}
반드시 아래 형식 그대로:
{"score":85,"grade":"A","summary":"전체 요약 2문장","highlights":["좋은점1","좋은점2","주의사항"],"rooms":[{"name":"방이름","emoji":"이모지","score":88,"furniture":[{"name":"가구","emoji":"이모지","position":"위치","reason":"이유"}],"tip":"팁"}],"order":[{"name":"가구","emoji":"이모지","dest":"방과위치","seq":1}]}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content.map(i => i.text || '').join('');
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.status(200).json(result);

  } catch (e) {
    console.error('AI Layout Error:', e);
    res.status(500).json({ error: e.message });
  }
}
