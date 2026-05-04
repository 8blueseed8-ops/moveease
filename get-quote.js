export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { from, to, fromFloor, toFloor, moveType, furniture, totalVol } = req.body;

    const furnDesc = furniture.map(f => f.name).join(', ');

    const prompt = `이사 견적 전문가입니다. 아래 정보로 3개 이사업체 견적을 제안해주세요.
출발: ${from} ${fromFloor} / 도착: ${to} ${toFloor}
유형: ${moveType} / 가구: ${furnDesc} / 총부피: ${totalVol}m³
JSON만 응답(마크다운 없이):
{"companies":[{"name":"업체명","emoji":"이모지","rating":4.8,"reviews":1203,"price":450000,"features":["특징1","특징2","특징3"],"best":true},{"name":"업체2","emoji":"이모지","rating":4.6,"reviews":892,"price":520000,"features":["특징1","특징2"],"best":false},{"name":"업체3","emoji":"이모지","rating":4.7,"reviews":654,"price":490000,"features":["특징1","특징2"],"best":false}],"tip":"견적 선택 팁 1-2문장"}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content.map(i => i.text || '').join('');
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.status(200).json(result);

  } catch (e) {
    console.error('Quote Error:', e);
    res.status(500).json({ error: e.message });
  }
}
