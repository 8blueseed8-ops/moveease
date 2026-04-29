export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: '이미지가 필요해요' });

    const prompt = `인테리어 전문가입니다. 이 도면/방 사진을 분석해서 JSON으로만 응답하세요 (마크다운 없이).
형식: {"width":450,"depth":380,"shape":"rectangle","area":17.1,"description":"분석 설명 2문장","suggestions":["배치제안1","배치제안2"]}
shape는 rectangle/square/L/T/triangle/custom 중 하나. width와 depth는 cm 단위 추정값.
도면에 여러 방이 보이면 전체 크기 기준으로 분석해주세요.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64
              }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content.map(i => i.text || '').join('');
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.status(200).json(result);

  } catch (e) {
    console.error('Photo Analysis Error:', e);
    res.status(500).json({ error: e.message });
  }
}
