// Mapping your requested model names to actual available Gemini API endpoints.
const MODEL_MAP = {
  "Gemini 3.1 Flash Lite": { id: "gemini-3.1-flash-lite", rpm: 15 },
  "Gemini 3.5 Flash Lite": { id: "gemini-3.5-flash-lite", rpm: 15 },
  "Gemini 3 Flash":        { id: "gemini-3.0-flash", rpm: 5 },
  "Gemini 3.5 Flash":      { id: "gemini-3.5-flash", rpm: 5 },
  "Gemini 3.6 Flash":      { id: "gemini-3.6-flash", rpm: 5 },
  "Gemini 3.7 Flash":      { id: "gemini-3.7-flash", rpm: 5 }
};


export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/translate' && request.method === 'POST') {
      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY is not set in Cloudflare Secrets.");

        const { text, modelKey, customPrompt, useMethod2 } = await request.json();
        const modelConfig = MODEL_MAP[modelKey];
        
        if (!modelConfig) throw new Error("Invalid model selected.");

        const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelConfig.id + ':generateContent?key=' + apiKey;
        
        let finalPrompt = '';
        
        if (useMethod2) {
          finalPrompt = 'Translate the "text" field of each object in the JSON array to informal Persian.\n' +
            'RULES:\n' +
            '1. Return ONLY a valid JSON array of objects.\n' +
            '2. Keep the exact same "id" for each object.\n' +
            '3. Translate EVERY single item. Do not skip or stop early.\n' +
            '4. Use informal, colloquial Persian (spoken style). DO NOT use formal Persian.\n' +
            '5. No markdown, no explanations. Just the JSON array.\n\n' +
            'Input:\n' + text;
            
          if (customPrompt && customPrompt.trim() !== '') {
            finalPrompt = customPrompt + '\n\nCRITICAL: Return ONLY a valid JSON array. Do not skip any.\n\nInput:\n' + text;
          }
        } else {
          if (customPrompt && customPrompt.trim() !== '') {
            finalPrompt = customPrompt + '\n\nText to translate:\n' + text;
          } else {
            finalPrompt = 'Translate the following English SRT subtitle text to Persian.\n' +
              'STRICT FORMATTING RULES:\n' +
              '1. DO NOT change sequence numbers or timestamps.\n' +
              '2. Translate ONLY the text lines.\n' +
              '3. Use informal, colloquial Persian (spoken style). DO NOT use formal Persian.\n' +
              '4. No markdown or explanations. Output ONLY the translated SRT.\n\n' +
              'Text to translate:\n' + text;
          }
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: finalPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || 'API Error: ' + response.status);
        }

        const data = await response.json();
        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!translatedText) throw new Error("Empty response from Gemini.");

        let cleanText = translatedText.replace(/^```json\n?|```$/g, '').replace(/^```\n?|```$/g, '').trim();

        return new Response(JSON.stringify({ text: cleanText }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (err) {
        console.error("Worker Error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(HTML_CONTENT, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};

// ==========================================
// FRONTEND HTML/CSS/JS
// ==========================================
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SRT to Persian Translator</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #f4f4f9; color: #333; margin: 0; padding: 20px; display: flex; justify-content: center; }
  .container { max-width: 900px; width: 100%; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
  h1 { text-align: center; color: #2c3e50; margin-top: 0; }
  h3 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
  .form-group { margin-bottom: 20px; }
  label { display: block; margin-bottom: 8px; font-weight: 600; color: #555; }
  input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; box-sizing: border-box; font-family: inherit; }
  textarea { font-family: monospace; font-size: 14px; resize: vertical; }
  button { padding: 12px 20px; background: #3498db; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
  button:hover { background: #2980b9; }
  button:disabled { background: #bdc3c7; cursor: not-allowed; }
  #translateBtn { width: 100%; padding: 14px; font-size: 18px; }
  .btn-small { padding: 8px 15px; font-size: 14px; background: #27ae60; }
  .btn-small:hover { background: #229954; }
  .checkbox-group { display: flex; align-items: center; margin-bottom: 10px; }
  .checkbox-group input { width: auto; margin-right: 10px; }
  .checkbox-group label { margin-bottom: 0; font-weight: normal; }
  #custom-prompt-area { display: none; margin-bottom: 20px; }
  #progress-bar { width: 100%; height: 14px; background: #eee; border-radius: 7px; margin: 15px 0; overflow: hidden; border: 1px solid #ddd; }
  #progress-fill { height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60); width: 0%; transition: width 0.4s ease; }
  #log-area { background: #1e1e1e; color: #d4d4d4; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; height: 160px; overflow-y: auto; white-space: pre-wrap; margin-bottom: 20px; border: 1px solid #333; }
  .log-info { color: #3498db; }
  .log-success { color: #2ecc71; font-weight: bold; }
  .log-error { color: #e74c3c; font-weight: bold; }
  .log-warn { color: #f1c40f; }
  #output-area { background: #fcfcfc; border: 2px solid #3498db; border-radius: 6px; padding: 15px; font-family: 'Courier New', monospace; font-size: 14px; max-height: 350px; overflow-y: auto; white-space: pre-wrap; color: #2c3e50; min-height: 120px; line-height: 1.5; }
  .placeholder { color: #95a5a6; font-style: italic; }
</style>
</head>
<body>
<div class="container">
  <h1>SRT to Persian Translator</h1>
  <div class="form-group">
    <label for="modelSelect">Select Model:</label>
    <select id="modelSelect">
      <option value="Gemini 3.1 Flash Lite">Gemini 3.1 Flash Lite (RPM: 15)</option>
      <option value="Gemini 3.5 Flash Lite">Gemini 3.5 Flash Lite (RPM: 15)</option>
      <option value="Gemini 3 Flash">Gemini 3 Flash (RPM: 5)</option>
      <option value="Gemini 3.5 Flash">Gemini 3.5 Flash (RPM: 5)</option>
      <option value="Gemini 3.6 Flash">Gemini 3.6 Flash (RPM: 5)</option>
      <option value="Gemini 3.7 Flash">Gemini 3.7 Flash (RPM: 5)</option>
    </select>
  </div>
  <div class="checkbox-group">
    <input type="checkbox" id="method2Check" checked>
    <label for="method2Check"><strong>Use Method 2</strong> (Recommended: Bulletproof ID mapping, 100% timestamp safe)</label>
  </div>
  <div class="checkbox-group">
    <input type="checkbox" id="customPromptCheck">
    <label for="customPromptCheck">Enable Custom Prompt (Advanced)</label>
  </div>
  <div id="custom-prompt-area">
    <label for="customPromptText">Edit Prompt:</label>
    <textarea id="customPromptText" rows="6"></textarea>
  </div>
  <div class="form-group">
    <label for="srtFile">Upload SRT File:</label>
    <input type="file" id="srtFile" accept=".srt,.txt">
  </div>
  <button id="translateBtn" disabled>Start Translation</button>
  <h3>System Logs</h3>
  <div id="progress-bar"><div id="progress-fill"></div></div>
  <div id="log-area"><span class="placeholder">Waiting for translation to start...</span></div>
  <h3>
    Live Translation Output
    <button id="copyBtn" class="btn-small" disabled>Copy to Clipboard</button>
  </h3>
  <div id="output-area"><span class="placeholder">Translated subtitles will appear here in real-time...</span></div>
</div>

<script>
  const modelSelect = document.getElementById('modelSelect');
  const srtFileInput = document.getElementById('srtFile');
  const translateBtn = document.getElementById('translateBtn');
  const progressFill = document.getElementById('progress-fill');
  const logArea = document.getElementById('log-area');
  const outputArea = document.getElementById('output-area');
  const copyBtn = document.getElementById('copyBtn');
  const method2Check = document.getElementById('method2Check');
  const customPromptCheck = document.getElementById('customPromptCheck');
  const customPromptArea = document.getElementById('custom-prompt-area');
  const customPromptText = document.getElementById('customPromptText');

  const DEFAULT_PROMPT = 'Translate to informal, conversational Persian. Keep the exact meaning.';
  customPromptText.value = DEFAULT_PROMPT;
  customPromptCheck.addEventListener('change', function() {
    customPromptArea.style.display = customPromptCheck.checked ? 'block' : 'none';
  });

  const RPM_MAP = {
    "Gemini 3.1 Flash Lite": 15, "Gemini 3.5 Flash Lite": 15,
    "Gemini 3 Flash": 5, "Gemini 3.5 Flash": 5, "Gemini 3.6 Flash": 5, "Gemini 3.7 Flash": 5
  };

  // FIX: Simplified and robust button state management
  function updateButtonState() {
    translateBtn.disabled = srtFileInput.files.length === 0;
  }
  srtFileInput.addEventListener('change', updateButtonState);

  copyBtn.addEventListener('click', function() {
    if (outputArea.textContent && !outputArea.querySelector('.placeholder')) {
      navigator.clipboard.writeText(outputArea.textContent).then(function() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function() { copyBtn.textContent = 'Copy to Clipboard'; }, 2000);
      });
    }
  });

  function log(msg, type) {
    type = type || 'info';
    const time = new Date().toLocaleTimeString();
    if (logArea.querySelector('.placeholder')) logArea.innerHTML = '';
    const line = document.createElement('div');
    line.className = 'log-' + type;
    line.textContent = '[' + time + '] ' + msg;
    logArea.appendChild(line);
    logArea.scrollTop = logArea.scrollHeight;
  }

  function sleep(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }

  async function fetchWithRetry(url, options, retries = 2, delay = 2000) {
    for (let i = 0; i < retries; i++) {
      try { return await fetch(url, options); } 
      catch (err) {
        if (i === retries - 1) throw err;
        log('Network error. Retrying...', 'warn');
        await sleep(delay);
      }
    }
  }

  function parseAIResponse(str) {
    str = str.replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').trim();
    try { const parsed = JSON.parse(str); if (Array.isArray(parsed)) return parsed; } catch (e) {}
    const regex = /\{\s*"id"\s*:\s*"[^"]*"\s*,\s*"text"\s*:\s*"(?:\\\\.|[^"\\\\])*"\s*\}/g;
    const matches = str.match(regex);
    if (matches && matches.length > 0) {
      try { return JSON.parse('[' + matches.join(',') + ']'); } catch (e) {}
    }
    return null;
  }

  function getChunks(blocks, strategy) {
    if (strategy === 'full') return [blocks.join('\n\n')];
    if (strategy === 'half') { let mid = Math.ceil(blocks.length / 2); return [blocks.slice(0, mid).join('\n\n'), blocks.slice(mid).join('\n\n')]; }
    if (strategy === 'quarter') { let size = Math.ceil(blocks.length / 4); let res = []; for(let i=0; i<4; i++) { let chunk = blocks.slice(i*size, (i+1)*size); if(chunk.length > 0) res.push(chunk.join('\n\n')); } return res; }
    if (strategy === '100') return splitBySize(blocks, 100);
    if (strategy === '50') return splitBySize(blocks, 50);
    if (strategy === '20') return splitBySize(blocks, 20);
    if (strategy === '10') return splitBySize(blocks, 10);
  }

  function splitBySize(blocks, size) {
    let res = [];
    for(let i=0; i<blocks.length; i+=size) { res.push(blocks.slice(i, i+size).join('\n\n')); }
    return res;
  }

  translateBtn.addEventListener('click', async function() {
    const modelKey = modelSelect.value;
    const file = srtFileInput.files[0];
    const rpm = RPM_MAP[modelKey];
    const delayMs = Math.ceil(60000 / rpm) + 500; 
    const useMethod2 = method2Check.checked;
    const useCustomPrompt = customPromptCheck.checked;
    const promptToSend = useCustomPrompt ? customPromptText.value : null;

    translateBtn.disabled = true;
    translateBtn.textContent = 'Translating... Please Wait';
    progressFill.style.width = '0%';
    logArea.innerHTML = '';
    outputArea.innerHTML = '';
    copyBtn.disabled = true;
    
    let translatedSrt = '';
    const strategies = ['full', 'half', 'quarter', '100', '50', '20', '10'];
    const strategyNames = ['Whole Text', '2 Parts', '4 Parts', '100 blocks/chunk', '50 blocks/chunk', '20 blocks/chunk', '10 blocks/chunk'];

    log('Initializing translation using ' + modelKey);
    log('Method: ' + (useMethod2 ? 'Method 2 (Bulletproof ID Mapping)' : 'Method 1 (Full SRT format)'));

    try {
      log('Reading file: ' + file.name);
      let srtText = await file.text();
      srtText = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      srtText = srtText.replace(/^\uFEFF/, ''); 
      
      const blocks = srtText.trim().split(/\n\s*\n/).filter(function(b) { return b.trim() !== ''; });
      log('Parsed ' + blocks.length + ' subtitle blocks.', 'success');

      let processedCount = 0; // Tracks how many blocks we have successfully translated so far

      for (let s = 0; s < strategies.length; s++) {
        if (processedCount >= blocks.length) break; // All blocks translated!

        let strat = strategies[s];
        let stratName = strategyNames[s];
        let remainingBlocks = blocks.slice(processedCount);
        
        log('--- Strategy: ' + stratName + ' (Processing remaining ' + remainingBlocks.length + ' blocks) ---', 'info');
        
        let rawChunks = getChunks(remainingBlocks, strat);
        let strategyFailed = false;

        for (let i = 0; i < rawChunks.length; i++) {
          log('Processing chunk ' + (i + 1) + ' / ' + rawChunks.length + '...');
          
          let payloadText = rawChunks[i];
          let parsedBlocks = [];

          if (useMethod2) {
            const rawBlocks = rawChunks[i].trim().split(/\n\s*\n/);
            parsedBlocks = rawBlocks.map(function(b) {
              const lines = b.trim().split('\n');
              return { id: lines[0] || '', timestamp: lines[1] || '', text: lines.slice(2).join('\n') };
            });
            payloadText = JSON.stringify(parsedBlocks.map(function(b) { return { id: b.id, text: b.text }; }));
          }

          const bodyData = { text: payloadText, modelKey: modelKey, useMethod2: useMethod2 };
          if (useCustomPrompt) bodyData.customPrompt = promptToSend;

          try {
            const res = await fetchWithRetry('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyData)
            });

            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const cleanText = data.text;
            let chunkSrt = '';

            if (useMethod2) {
              const segments = parseAIResponse(cleanText);
              if (!segments) throw new Error("Invalid JSON response.");

              const translationMap = {};
              segments.forEach(function(item) {
                if (item && item.id !== undefined && item.text !== undefined) {
                  translationMap[String(item.id).trim()] = String(item.text).trim();
                }
              });

              let missingCount = 0;
              for (let j = 0; j < parsedBlocks.length; j++) {
                const originalId = String(parsedBlocks[j].id).trim();
                if (translationMap[originalId] === undefined) {
                  missingCount++;
                }
              }

              // If AI missed ANY blocks, reject this chunk and switch strategy for the REST
              if (missingCount > 0) {
                log('Incomplete: ' + missingCount + ' blocks missing. Keeping previous ' + processedCount + ' blocks. Switching strategy for the rest...', 'warn');
                strategyFailed = true;
                break; 
              }

              // 100% success for this chunk, build the SRT text
              for (let j = 0; j < parsedBlocks.length; j++) {
                const originalId = String(parsedBlocks[j].id).trim();
                chunkSrt += parsedBlocks[j].id + '\n' + parsedBlocks[j].timestamp + '\n' + translationMap[originalId] + '\n\n';
              }
            } else {
              chunkSrt = cleanText + '\n\n';
            }

            // Append to total and update progress
            translatedSrt += chunkSrt;
            processedCount += parsedBlocks.length > 0 ? parsedBlocks.length : rawBlocks.length; // Fallback for Method 1
            
            outputArea.textContent = translatedSrt;
            outputArea.scrollTop = outputArea.scrollHeight;

            const overallPercent = (processedCount / blocks.length) * 100;
            progressFill.style.width = overallPercent + '%';
            log('Chunk ' + (i + 1) + ' done! Overall progress: ' + Math.round(overallPercent) + '%', 'success');

            if (i < rawChunks.length - 1) {
              log('Pausing for ' + delayMs + 'ms...', 'warn');
              await sleep(delayMs);
            }
          } catch (chunkErr) {
            log('Chunk failed: ' + chunkErr.message + '. Keeping ' + processedCount + ' blocks. Switching strategy...', 'error');
            strategyFailed = true;
            break; 
          }
        }

        if (!strategyFailed) {
          log('Strategy ' + stratName + ' completed successfully!', 'success');
        }
      }

      if (processedCount < blocks.length) {
        throw new Error('Failed to translate all blocks. Translated ' + processedCount + ' / ' + blocks.length);
      }

      log('All ' + blocks.length + ' blocks processed! Generating download file...', 'success');
      const blob = new Blob([translatedSrt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.[^/.]+$/, "") + '_persian.srt';
      a.click();
      URL.revokeObjectURL(url);

      copyBtn.disabled = false;
      log('File downloaded! You can also use the "Copy" button.', 'success');
      translateBtn.textContent = 'Start Translation';

    } catch (err) {
      log('FATAL ERROR: ' + err.message, 'error');
      translateBtn.textContent = 'Retry Translation';
    } finally {
      // FIX: Ensure button is re-enabled if a file is still selected
      translateBtn.disabled = srtFileInput.files.length === 0;
    }
  });
</script>
</body>
</html>`;