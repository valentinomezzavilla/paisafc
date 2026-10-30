import { Environment, Lightformer } from '@react-three/drei'

/**
 * Luz de estudio de producto: caja de luz grande arriba, dos rebotes laterales y un contraluz, más una
 * luz clave con sombra. Todo armado acá (sin HDRI que bajar de la red).
 */
export function StudioLights({ shadows = true, shadowSpan = 1 }: { shadows?: boolean; shadowSpan?: number }) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[1.6, 3.2, 2.4]}
        intensity={2.4}
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
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 1]} rotation-x={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-3, 1.2, 1.5]} rotation-y={Math.PI / 2.6} scale={[2, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[3, 1, 1]} rotation-y={-Math.PI / 2.4} scale={[2, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, 1.4, -3]} scale={1.5} />
      </Environment>
    </>
  )
}
