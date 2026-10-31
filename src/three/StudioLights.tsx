import { Environment, Lightformer } from '@react-three/drei'

/** Exposición del render: la misma en el visor, en "Las dos juntas", en los pósters y en la página de revisión. */
export const EXPOSURE = 1.12

/**
 * Luz de estudio de producto: caja de luz grande arriba, dos rebotes laterales y un contraluz, más una
 * luz clave con sombra. Todo armado acá (sin HDRI que bajar de la red).
 */
export function StudioLights({ shadows = true, shadowSpan = 1 }: { shadows?: boolean; shadowSpan?: number }) {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[-1.7, 2.9, 2.5]}
        intensity={2.3}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-shadowSpan}
        shadow-camera-right={shadowSpan}
        shadow-camera-top={2}
        shadow-camera-bottom={-0.2}
      />
      <Environment resolution={256}>
        {/* Caja de luz grande arriba, otra de costado como luz clave, un relleno del otro lado y un rebote bajo */}
        <Lightformer form="rect" intensity={3} position={[0, 4, 1]} rotation-x={Math.PI / 2} scale={[5, 3, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[-3.2, 1.6, 2]} rotation-y={Math.PI / 2.8} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[3.2, 1, 1.5]} rotation-y={-Math.PI / 2.6} scale={[2.5, 3.5, 1]} />
        <Lightformer form="rect" intensity={0.55} color="#fff1dc" position={[0, -1.2, 2.5]} rotation-x={-Math.PI / 3} scale={[4, 1.6, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[0, 1.4, -3]} scale={1.6} />
      </Environment>
    </>
  )
}
