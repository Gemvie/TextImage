import React, { useEffect, useMemo, useState } from 'react'

// ===== Types =====

type StyleOption = 'realistic' | 'artistic' | 'cartoon' | 'abstract' | 'cyberpunk' | 'vintage'
type Resolution = '512x512' | '768x768' | '1024x1024' | '1536x1024'
type Quality = 'standard' | 'high' | 'ultra'

interface GeneratedImage {
  url: string
  prompt: string
  style: StyleOption
  resolution: Resolution
  quality: Quality
  seed: number
  width: number
  height: number
}

// ===== Helpers =====

const STYLE_PRESETS: Record<StyleOption, string> = {
  realistic: 'photorealistic, natural lighting, DSLR depth of field, highly detailed',
  artistic: 'digital painting, painterly brushstrokes, dramatic lighting',
  cartoon: 'cartoon, cel-shaded, bold outlines, flat colors',
  abstract: 'abstract, geometric shapes, minimalism',
  cyberpunk: 'cyberpunk, neon lights, rain-soaked streets, holograms, high contrast',
  vintage: 'vintage, film grain, faded colors, 35mm photo, 1970s aesthetic',
}

// Pollinations exposes a `model` param. Keep it simple & safe: use `flux` for all styles.
// (You can change mapping later if you want to try other models.)
const MODEL_BY_STYLE: Record<StyleOption, string> = {
  realistic: 'flux',
  artistic: 'flux',
  cartoon: 'flux',
  abstract: 'flux',
  cyberpunk: 'flux',
  vintage: 'flux',
}

function buildPollinationsUrl(params: {
  prompt: string
  width: number
  height: number
  seed: number
  model?: string
  enhance?: boolean
}): string {
  const { prompt, width, height, seed, model, enhance } = params
  const qs = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: 'true',
  })
  if (model) qs.set('model', model)
  if (enhance) qs.set('enhance', 'true')
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${qs.toString()}`
}

function parseResolution(res: string): { width: number; height: number } {
  const [w, h] = res.split('x').map((n) => parseInt(n.trim(), 10))
  return { width: w, height: h }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

// Small util to keep thumbnails in the real aspect ratio (no forced h-72)
function aspectStyle(res: Resolution): React.CSSProperties {
  const { width, height } = parseResolution(res)
  return { aspectRatio: `${width} / ${height}` }
}

export default function App() {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<StyleOption>('realistic')
  const [resolution, setResolution] = useState<Resolution>('512x512')
  const [quality, setQuality] = useState<Quality>('standard')
  const [count, setCount] = useState<number>(1)

  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<null | { type: 'success' | 'error' | 'info'; message: string }>(null)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [modalUrl, setModalUrl] = useState<string | null>(null)
  const [modalPrompt, setModalPrompt] = useState<string>('')

  const headerGradient = useMemo(
    () => ({
      backgroundImage: 'linear-gradient(135deg, #ffffff, #888888)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }),
    []
  )

  function showStatus(type: 'success' | 'error' | 'info', message: string) {
    setStatus({ type, message })
    if (type !== 'error') setTimeout(() => setStatus(null), 5000)
  }

  // ===== Generate =====
  async function handleGenerate() {
    const trimmed = prompt.trim()
    if (!trimmed) {
      showStatus('error', 'Please enter a description for your image.')
      return
    }
    if (isGenerating) return

    setIsGenerating(true)
    setImages([])
    showStatus('info', 'Generating your images...')

    const { width, height } = parseResolution(resolution)

    // Stronger style control + quality tweaks
    const stylePreset = STYLE_PRESETS[style]
    const qualityPreset = quality === 'ultra' ? 'ultra-detailed, crisp focus, 8k' : quality === 'high' ? 'high detail, sharp focus' : ''
    const enhancedPrompt = `${stylePreset}, ${trimmed}${qualityPreset ? `, ${qualityPreset}` : ''}`
    const model = MODEL_BY_STYLE[style]
    const enhance = quality !== 'standard'

    const next: GeneratedImage[] = Array.from({ length: count }).map((_, i) => {
      const seed = (window.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? Date.now()) + i
      const url = buildPollinationsUrl({ prompt: enhancedPrompt, width, height, seed, model, enhance })
      return { url, prompt: trimmed, style, resolution, quality, seed, width, height }
    })

    // Small delay for loader
    await new Promise((r) => setTimeout(r, 600))

    setImages(next)
    setIsGenerating(false)
    showStatus('success', `Successfully generated ${next.length} image${next.length > 1 ? 's' : ''}!`)
  }

  

  async function download(url: string, name: string) {
    try {
      const res = await fetch(url, { mode: 'cors' })
      if (!res.ok) throw new Error('Network response was not ok')
      const blob = await res.blob()

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `ai-generated-${sanitizeFilename(name)}-gemvie.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(link.href)
    } catch (err) {
      console.error('Download failed:', err)
      alert('Failed to download the image. Please try again.')
    }
  }

  function openModal(url: string, p: string) {
    setModalUrl(url)
    setModalPrompt(p)
  }

  function closeModal() {
    setModalUrl(null)
    setModalPrompt('')
  }

  useEffect(() => {
    console.assert(JSON.stringify(parseResolution('1024x768')) === JSON.stringify({ width: 1024, height: 768 }), 'parseResolution 1024x768 failed')
    console.assert(JSON.stringify(parseResolution('512x512')) === JSON.stringify({ width: 512, height: 512 }), 'parseResolution 512x512 failed')
    console.assert(sanitizeFilename('Hello World!') === 'hello-world', 'sanitizeFilename basic failed')
    console.assert(sanitizeFilename('A  B   C') === 'a-b-c', 'sanitizeFilename collapse failed')
    const seed = 123
    const url = buildPollinationsUrl({ prompt: 'test prompt', width: 256, height: 256, seed, model: 'flux' })
    console.assert(url.includes('width=256') && url.includes('height=256') && url.includes('seed=123') && url.includes('model=flux'), 'buildPollinationsUrl params failed')
    console.assert(url.includes(encodeURIComponent('test prompt')), 'buildPollinationsUrl encoding failed')
  }, [])

  // ===== Samples & Theme =====
  const samplePrompts = [
    'A neon-lit cyberpunk street market at night with flying cars overhead',
    'A serene tropical beach with crystal-clear turquoise water and palm trees swaying in the wind',
    'An epic fantasy castle floating above the clouds with waterfalls cascading off its edges',
    'A bustling space station orbiting a colorful gas giant planet',
    'A cozy cabin in the snowy mountains with smoke rising from the chimney under the northern lights',
  ]

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  // ===== UI =====
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold">TOTALLY FREE — just buy me a coffee ☕</h1>

        <a
  href="https://buymeacoffee.com/gemfrankfr8"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 mt-3 px-3 py-1 text-sm rounded bg-yellow-400 hover:bg-yellow-300 text-black font-semibold"
>
  ☕ Buy Me a Coffee
</a>

        <h1 className="text-4xl md:text-6xl font-bold mb-2" style={headerGradient}>AI Image Generator</h1>
        <p className="text-neutral-400 max-w-2xl mx-auto">Create stunning images from text descriptions using advanced AI technology</p>
      </header>

      <section className="bg-neutral-900 border border-green-400 rounded-xl p-6 md:p-8 mb-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="prompt" className="block font-medium text-neutral-300">Enter your image description</label>
            <button
              type="button"
              onClick={() => setPrompt(samplePrompts[Math.floor(Math.random() * samplePrompts.length)])}
              className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md border border-neutral-700 hover:bg-neutral-800 text-neutral-300"
              title="Try a random prompt"
            >
              <span aria-hidden>🎲</span>
              <span>Try a random prompt</span>
            </button>
          </div>

          <textarea
            id="prompt"
            className="w-full min-h-[120px] resize-y rounded-md border border-neutral-800 bg-neutral-900/40 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/60 placeholder:text-neutral-500"
            placeholder="A neon-lit cyberpunk street market at night with flying cars overhead"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleGenerate() }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Control label="Art Style">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as StyleOption)}
              className="w-full rounded-md border border-green-400 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
            >
              <option value="realistic">Realistic</option>
              <option value="artistic">Artistic</option>
              <option value="cartoon">Cartoon</option>
              <option value="abstract">Abstract</option>
              <option value="cyberpunk">Cyberpunk</option>
              <option value="vintage">Vintage</option>
            </select>
          </Control>

          <Control label="Resolution">
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              className="w-full rounded-md border border-green-400 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
            >
              <option value="512x512">512 × 512</option>
              <option value="768x768">768 × 768</option>
              <option value="1024x1024">1024 × 1024</option>
              <option value="1536x1024">1536 × 1024</option>
            </select>
          </Control>

          <Control label="Quality">
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as Quality)}
              className="w-full rounded-md border border-green-400 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
            >
              <option value="standard">Standard</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </Control>

          <Control label="Number of Images">
            <select
              value={String(count)}
              onChange={(e) => setCount(parseInt(e.target.value, 10))}
              className="w-full rounded-md border border-green-400 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
            >
              <option value="1">1 Image</option>
              <option value="2">2 Images</option>
              <option value="4">4 Images</option>
            </select>
          </Control>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-semibold transition active:translate-y-0 disabled:bg-neutral-700 disabled:text-neutral-400 hover:bg-blue-400 hover:-translate-y-[1px] shadow-lg shadow-blue-500/20"
        >
          <span className={`h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin ${isGenerating ? 'inline-block' : 'hidden'}`} />
          <span>{isGenerating ? 'Generating…' : 'Generate Images'}</span>
        </button>
      </section>

      <section className="bg-neutral-900 border border-green-400 rounded-xl p-6 md:p-8 min-h-[400px]">
        <header className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">Generated Images</h2>
        </header>

        {status && (
          <div
            className={
              'text-center text-sm p-3 mb-4 rounded-md border ' +
              (status.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : status.type === 'error'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20')
            }
          >
            {status.message}
          </div>
        )}

        {!images.length ? (
          <Placeholder onPick={() => setPrompt(samplePrompts[Math.floor(Math.random() * samplePrompts.length)])} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <div key={img.seed} className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
                <div className="relative group" style={aspectStyle(img.resolution)}>
                  <img
                    src={img.url}
                    alt={`Generated: ${img.prompt}`}
                    className="w-full h-full object-contain bg-neutral-800 transition-transform duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).innerHTML = '<div class="flex items-center justify-center aspect-square text-neutral-500">Failed to generate image</div>'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-sm">
                    Click to view full size
                  </div>
                  <button
                    className="absolute inset-0"
                    aria-label="Open full-size image"
                    onClick={() => openModal(img.url, img.prompt)}
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-neutral-300 mb-2 line-clamp-3">"{img.prompt}"</p>
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>{img.resolution}</span>
                    <span>{img.style} style</span>
                    <span>{img.quality} quality</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => download(img.url, img.prompt.substring(0, 30))}
                      className="flex-1 rounded-md bg-blue-500 px-3 py-2 text-xs font-medium hover:bg-blue-400"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => openModal(img.url, img.prompt)}
                      className="flex-1 rounded-md bg-neutral-800 px-3 py-2 text-xs font-medium hover:bg-neutral-700 border border-neutral-700"
                    >
                      View Full
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modalUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.currentTarget === e.target) closeModal() }}
        >
          <div className="max-w-[90vw] max-h-[90vh] relative">
            <img src={modalUrl} alt="Full size" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <div className="absolute -top-10 left-0 right-10 text-center text-sm text-white">"{modalPrompt}"</div>
            <button
              onClick={closeModal}
              aria-label="Close"
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-400 text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-12 w-12 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <p className="text-white">Generating your masterpiece...</p>
          </div>
        </div>
      )}

      <div>
        <footer>
          <h1 className='text-center mt-2 text-white/30'>
            Created by Gemvie Frank Franco
          </h1>
        </footer>
      </div>
    </div>
  )
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-2 text-sm text-neutral-300">{label}</label>
      {children}
    </div>
  )
}

function Placeholder({ onPick }: { onPick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-72 text-center text-neutral-500 select-none cursor-pointer" onClick={onPick}>
      <svg className="w-16 h-16 mb-3 opacity-40" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c1.1 0 2 .9 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
      </svg>
      <p>Your generated images will appear here</p>
      <p className="text-xs mt-1">Tip: use the 🎲 button above to try a random prompt</p>
    </div>
  )
}
