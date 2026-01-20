async function testClaude() {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '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',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'Decime hola en una palabra' }
      ]
    })
  });
  
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

testClaude();