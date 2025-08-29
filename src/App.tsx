import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Languages, Zap, Bot, User } from 'lucide-react'
import cx from 'classnames'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// ===================
// 🔗 Your Ready Player Me avatar
// ===================
// Using a simpler GLB model that's known to work
const AVATAR_URL = "https://models.readyplayer.me/63ce8a1d899f8a85f5d06b24.glb";

// ---------------- Avatar Utils ----------------
function findBone(root: THREE.Object3D, names: string[]) {
  let found: THREE.Object3D | null = null
  root.traverse((o) => {
    if (found) return
    const n = (o as any).name?.toLowerCase?.() || ''
    if (names.some((t) => n.includes(t.toLowerCase()))) found = o
  })
  return found
}

function usePortraitCamera(root: THREE.Object3D | null) {
  const { camera } = useThree()
  useEffect(() => {
    if (!root) return
    const head = findBone(root, ['head'])
    const chest = findBone(root, ['spine2', 'spine1', 'upperchest', 'chest', 'neck'])
    const bb = new THREE.Box3().setFromObject(root)

    const headPos = new THREE.Vector3()
    const chestPos = new THREE.Vector3()
    if (head) (head as any).getWorldPosition?.(headPos)
    else bb.getCenter(headPos)
    if (chest) (chest as any).getWorldPosition?.(chestPos)
    else chestPos.copy(bb.getCenter(new THREE.Vector3())).add(new THREE.Vector3(0, -0.25 * bb.getSize(new THREE.Vector3()).y, 0))

    const center = headPos.clone().lerp(chestPos, 0.5)
    const height = Math.max(0.001, headPos.distanceTo(chestPos)) * 2.0

    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov || 35)
    const dist = (height * 0.5) / Math.tan(fov / 2)

    const dir = new THREE.Vector3(0, 0, 1)
    const camPos = center.clone().add(dir.multiplyScalar(dist * 1.2))
    camera.position.copy(camPos)
    camera.lookAt(center)
    ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
  }, [root, camera])
}

function AvatarModel() {
  const { scene } = useGLTF(AVATAR_URL)
  const group = useRef<THREE.Group>(null)

  const root = useMemo(() => {
    const g = new THREE.Group()
    g.add(scene)
    // Create a clone of the scene to avoid mutations
    const clonedScene = scene.clone(true)
    g.add(clonedScene)
    g.traverse((o: any) => {
      if (o.isMesh) {
        o.frustumCulled = false
        if (o.material) o.material.toneMapped = true
        if (o.material) {
          o.material = o.material.clone() // Clone materials
          o.material.toneMapped = true
        }
      }
    })
    // Center and scale the model
    const box = new THREE.Box3().setFromObject(g)
    const center = box.getCenter(new THREE.Vector3())
    g.position.sub(center)
    const size = box.getSize(new THREE.Vector3())
    const scale = 2 / Math.max(size.x, size.y, size.z)
    g.scale.setScalar(scale)
    return g
  }, [scene])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime()
    group.current.position.y = Math.sin(t * 1.2) * 0.01
    group.current.rotation.y = Math.sin(t * 0.4) * 0.05
  })

  return <group ref={group}><primitive object={root} /></group>
}

function PortraitScene() {
  const { scene } = useGLTF(AVATAR_URL)
  usePortraitCamera(scene)

  return (
    <>
      <color attach="background" args={['#f8f9fa']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 5]} intensity={1.1} />
      <Environment preset="studio" />
      <AvatarModel />
      <OrbitControls 
        enablePan={false} 
        enableZoom={false} 
        minPolarAngle={Math.PI / 3.5} 
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]} 
      />
    </>
  )
}

// ---------------- Voice Utils ----------------
const getSpeechRecognition = () => {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function useTTS(lang: 'en' | 'hi') {
  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }
  return { speak }
}

// ---------------- Main App ----------------
export default function App() {
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Welcome to Suno Beta! How can I help you today?' },
  ])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const { speak } = useTTS(lang)

  useEffect(() => {
    const Rec = getSpeechRecognition()
    if (!Rec) return
    const rec = new Rec()
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ')
      setInput(t)
      if (e.results[0].isFinal) handleSend(t)
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
  }, [lang])

  function handleSend(forceText?: string) {
    const text = (forceText ?? input).trim()
    if (!text) return
    const next = [...messages, { role: 'user' as const, text }]
    const reply = lang === 'hi' ? 'ठीक है! मैं आपकी मदद करता हूँ।' : "Got it! I'll help you with that."
    const done = [...next, { role: 'bot' as const, text: reply }]
    setMessages(done)
    setInput('')
    speak(reply)
  }

  function toggleMic() {
    const rec = recognitionRef.current
    if (!rec) return alert('Speech Recognition not supported in this browser. Use text input.')
    if (!listening) {
      setListening(true)
      rec.start()
    } else {
      setListening(false)
      rec.stop()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 grid place-items-center rounded-2xl bg-primary-100"><Zap className="h-5 w-5"/></div>
            <h1 className="font-semibold text-xl">Suno Beta</h1>
          </div>
          <button
            onClick={() => setLang((p) => (p === 'en' ? 'hi' : 'en'))}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            <Languages className="h-4 w-4"/>
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avatar Card */}
        <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-4 pt-4">
            <h2 className="font-medium">Your Assistant</h2>
            <p className="text-sm text-slate-500">Ready Player Me portrait (head & shoulders)</p>
          </div>
          <div className="h-[420px]">
            <Canvas camera={{ fov: 35, near: 0.1, far: 100 }} dpr={[1, 2]}>
              <PortraitScene />
            </Canvas>
          </div>
          <div className="flex items-center justify-center gap-3 p-4 border-t">
            <button
              onClick={toggleMic}
              className={cx('inline-flex items-center gap-2 rounded-full px-4 py-2 border shadow-sm', listening && 'ring-2 ring-primary-400')}
            >
              <Mic className="h-4 w-4"/>
              {listening ? (lang === 'hi' ? 'सुन रहा है…' : 'Listening…') : (lang === 'hi' ? 'बोलिए' : 'Speak')}
            </button>
          </div>
        </section>

        {/* Chat Card */}
        <section className="rounded-2xl border bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 pt-4 flex items-center gap-2">
            <h2 className="font-medium">{lang === 'hi' ? 'बातचीत' : 'Conversation'}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cx('flex items-start gap-2', m.role === 'bot' ? '' : 'justify-end')}>
                {m.role === 'bot' && <div className="mt-1 rounded-full bg-primary-100 p-1"><Bot className="h-4 w-4"/></div>}
                <div className={cx('rounded-2xl px-3 py-2 text-sm max-w-[75%]', m.role === 'bot' ? 'bg-slate-100 text-slate-900' : 'bg-blue-500 text-white')}>
                  {m.text}
                </div>
                {m.role === 'user' && <div className="mt-1 rounded-full bg-blue-100 p-1"><User className="h-4 w-4"/></div>}
              </div>
            ))}
          </div>
          <div className="border-t px-4 py-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={lang === 'hi' ? 'अपना संदेश लिखें…' : 'Type your message…'}
              className="flex-1 rounded-full border px-3 py-2 text-sm"
            />
            <button
              onClick={() => handleSend()}
              className="rounded-full bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Send
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}