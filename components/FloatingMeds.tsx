type Shape = {
  type: 'capsule' | 'tablet'
  top: string
  left: string
  size: number
  rotate: number
  colorA: string
  colorB: string
}

const shapes: Shape[] = [
  { type: 'capsule', top: '8%', left: '10%', size: 70, rotate: -25, colorA: '#3ECF8E', colorB: '#F2F3F5' },
  { type: 'tablet', top: '15%', left: '80%', size: 50, rotate: 0, colorA: '#E8A855', colorB: '' },
  { type: 'capsule', top: '65%', left: '5%', size: 60, rotate: 35, colorA: '#E8A855', colorB: '#F2F3F5' },
  { type: 'tablet', top: '75%', left: '85%', size: 54, rotate: 0, colorA: '#3ECF8E', colorB: '' },
  { type: 'capsule', top: '40%', left: '90%', size: 55, rotate: -15, colorA: '#3ECF8E', colorB: '#F2F3F5' },
  { type: 'tablet', top: '85%', left: '45%', size: 46, rotate: 0, colorA: '#E8A855', colorB: '' },
  { type: 'capsule', top: '5%', left: '45%', size: 48, rotate: 50, colorA: '#E8A855', colorB: '#F2F3F5' },
  { type: 'tablet', top: '55%', left: '18%', size: 48, rotate: 0, colorA: '#3ECF8E', colorB: '' },
]

function Tablet3D({ size, colorA }: { size: number; colorA: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 32% 28%, ${colorA}ee, ${colorA} 45%, ${colorA}99 75%, ${colorA}55)`,
        boxShadow: `0 ${size * 0.15}px ${size * 0.3}px -${size * 0.1}px rgba(0,0,0,0.6), inset 0 -${size * 0.08}px ${size * 0.12}px rgba(0,0,0,0.35), inset 0 ${size * 0.06}px ${size * 0.1}px rgba(255,255,255,0.4)`,
        position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute', top: '50%', left: '12%', right: '12%', height: size * 0.045,
        background: 'rgba(0,0,0,0.3)', borderRadius: 2, transform: 'translateY(-50%)',
      }} />
    </div>
  )
}

function Capsule3D({ size, colorA, colorB }: { size: number; colorA: string; colorB: string }) {
  const height = size * 0.42
  return (
    <div
      style={{
        width: size,
        height,
        borderRadius: height / 2,
        display: 'flex',
        overflow: 'hidden',
        boxShadow: `0 ${height * 0.35}px ${height * 0.7}px -${height * 0.2}px rgba(0,0,0,0.6), inset 0 -${height * 0.15}px ${height * 0.2}px rgba(0,0,0,0.3), inset 0 ${height * 0.12}px ${height * 0.15}px rgba(255,255,255,0.35)`,
      }}
    >
      <div style={{ flex: 1, background: `linear-gradient(160deg, ${colorA}ee, ${colorA} 50%, ${colorA}99)` }} />
      <div style={{ flex: 1, background: `linear-gradient(160deg, ${colorB}ee, ${colorB} 50%, ${colorB}bb)` }} />
    </div>
  )
}

export default function FloatingMeds() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {shapes.map((s, i) => (
        <div
          key={i}
          className="absolute opacity-25"
          style={{ top: s.top, left: s.left, transform: `rotate(${s.rotate}deg)` }}
        >
          {s.type === 'tablet' ? (
            <Tablet3D size={s.size} colorA={s.colorA} />
          ) : (
            <Capsule3D size={s.size} colorA={s.colorA} colorB={s.colorB} />
          )}
        </div>
      ))}
    </div>
  )
}