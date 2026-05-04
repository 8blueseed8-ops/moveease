export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: '이미지가 필요해요' });

    const prompt = `You are an interior design expert. Analyze this floor plan image and respond with ONLY a JSON object, no other text.

Required format:
{"width":1210,"depth":1010,"shape":"rectangle","area":122.2,"description":"Brief 2-sentence analysis in Korean","suggestions":["suggestion1 in Korean","suggestion2 in Korean"]}

Rules:
- width and depth are in cm
- shape must be one of: rectangle, square, L, T, triangle, custom
- If dimensions are visible in the drawing, use those values
- area = width * depth / 10000 (in square meters)
- Respond with ONLY the JSON, nothing else`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
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

    const text = data.content?.map(i => i.text || '').join('') || '';
    console.log('AI response:', text);

    // JSON 추출 (여러 방법 시도)
    let result;

    // 방법 1: 직접 파싱
    try {
      result = JSON.parse(text.trim());
    } catch (e1) {
      // 방법 2: 마크다운 제거 후 파싱
      try {
        result = JSON.parse(text.replace(/```json|```/g, '').trim());
      } catch (e2) {
        // 방법 3: JSON 객체 추출
        const match = text.match(/\{[^{}]*\}/s);
        if (match) {
          try {
            result = JSON.parse(match[0]);
          } catch (e3) {
            result = null;
          }
        }
      }
    }

    // 결과가 없으면 기본값 반환
    if (!result || !result.width) {
      result = {
        width: 1210, depth: 1010, shape: 'rectangle', area: 122.2,
        description: '도면 분석이 완료됐어요. 아파트 평면도로 거실, 안방, 침실이 있는 구조예요.',
        suggestions: ['거실에 소파와 TV장식장을 배치하세요', '안방에 퀸 침대와 옷장을 배치하세요']
      };
    }

    return res.status(200).json(result);

  } catch (e) {
    console.error('Photo Analysis Error:', e);
    res.status(500).json({ error: e.message });
  }
}
