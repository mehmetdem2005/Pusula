import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, Share, Text, View } from 'react-native'
import WebView from 'react-native-webview'
import { Icon } from '../ui/Icon'

/**
 * Mermaid Diagram Renderer
 * =========================
 *
 * Mermaid.js'i WebView içinde inline render eder.
 *
 * Avantaj:
 *   - Bundle'a binmez (CDN'den çekilir, sadece ilk yüklemede)
 *   - Native bir Mermaid lib yok zaten
 *   - Production'da ESM mermaid global window'a inject
 *
 * Desteklenen diyagramlar:
 *   - flowchart, graph TD/LR
 *   - sequenceDiagram
 *   - classDiagram
 *   - stateDiagram
 *   - erDiagram
 *   - mindmap, timeline, gitGraph
 */

interface MermaidViewProps {
  code: string
  height?: number
  theme?: 'default' | 'dark' | 'forest' | 'neutral'
  onError?: (msg: string) => void
}

const MERMAID_VERSION = '11.4.1'

export function MermaidView({ code, height = 320, theme = 'default', onError }: MermaidViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const html = useMemo(() => {
    // XSS guard: htmlentities encode user code
    const safeCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #FAFAFA; padding: 16px; font-family: -apple-system, sans-serif; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .mermaid {
    width: 100%;
    background: white;
    border-radius: 12px;
    padding: 16px;
    overflow-x: auto;
  }
  .error {
    background: #FEE2E2; color: #991B1B; padding: 12px;
    border-radius: 8px; font-size: 12px;
  }
</style>
</head>
<body>
<div class="mermaid" id="diagram">${safeCode}</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js"></script>
<script>
  (async function() {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: '${theme}',
        themeVariables: {
          primaryColor: '#F59E0B',
          primaryTextColor: '#1E1B4B',
          primaryBorderColor: '#1E1B4B',
          lineColor: '#475569',
          secondaryColor: '#FBF8F0',
          tertiaryColor: '#F1F5F9',
          fontFamily: '-apple-system, sans-serif',
          fontSize: '14px'
        },
        securityLevel: 'strict',
        flowchart: { curve: 'basis', padding: 16 }
      });
      const el = document.getElementById('diagram');
      const { svg } = await mermaid.render('rendered', el.textContent);
      el.innerHTML = svg;

      // Notify ReactNative
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'rendered' }));
    } catch (e) {
      const el = document.getElementById('diagram');
      el.innerHTML = '<div class="error">⚠️ ' + (e.message || 'Diyagram render edilemedi') + '</div>';
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'error', message: e.message }));
    }
  })();
</script>
</body>
</html>`
  }, [code, theme])

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'rendered') {
        setLoading(false)
      } else if (data.type === 'error') {
        setLoading(false)
        setError(data.message)
        onError?.(data.message)
      }
    } catch {}
  }

  const handleCopy = async () => {
    try {
      await Share.share({ message: code, title: 'Mermaid Diagram Source' })
    } catch {}
  }

  return (
    <View
      style={{ height, position: 'relative' }}
      className="bg-cream-50 rounded-2xl overflow-hidden"
    >
      <WebView
        source={{ html }}
        onMessage={handleMessage}
        scalesPageToFit
        scrollEnabled
        style={{ backgroundColor: '#FAFAFA' }}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />

      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-cream-50">
          <ActivityIndicator color="#F59E0B" />
          <Text className="text-xs text-slate-500 mt-2">Diyagram çiziliyor...</Text>
        </View>
      )}

      {!loading && !error && (
        <Pressable
          onPress={handleCopy}
          className="absolute top-2 right-2 bg-white/90 rounded-full p-2 border border-slate-200"
          hitSlop={6}
        >
          <Icon name="copy" size={12} color="#1E1B4B" />
        </Pressable>
      )}
    </View>
  )
}
