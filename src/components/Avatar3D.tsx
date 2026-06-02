"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import type { Group } from "three";

type Avatar3DProps = {
  speaking?: boolean;
  listening?: boolean;
  compact?: boolean;
};

function AvatarModel({ speaking, listening }: Avatar3DProps) {
  const group = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = Math.sin(t * 0.3) * 0.15;
    const bob = speaking ? Math.sin(t * 12) * 0.02 : Math.sin(t * 2) * 0.008;
    group.current.position.y = bob;
  });

  const skin = listening ? "#7dd3fc" : "#f4d4b8";
  const accent = speaking ? "#a78bfa" : "#6366f1";

  return (
    <group ref={group} position={[0, -0.2, 0]}>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[-0.1, 1.62, 0.26]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#1e1b4b" />
      </mesh>
      <mesh position={[0.1, 1.62, 0.26]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#1e1b4b" />
      </mesh>
      <mesh position={[0, 1.48, 0.28]} rotation={[speaking ? 0.2 : 0, 0, 0]}>
        <boxGeometry args={[0.12, speaking ? 0.06 : 0.02, 0.02]} />
        <meshStandardMaterial color="#be123c" />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <capsuleGeometry args={[0.28, 0.55, 8, 16]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[-0.38, 1.1, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.07, 0.45, 4, 8]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh position={[0.38, 1.1, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.07, 0.45, 4, 8]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      <mesh position={[-0.14, 0.35, 0]}>
        <capsuleGeometry args={[0.09, 0.55, 4, 8]} />
        <meshStandardMaterial color="#312e81" />
      </mesh>
      <mesh position={[0.14, 0.35, 0]}>
        <capsuleGeometry args={[0.09, 0.55, 4, 8]} />
        <meshStandardMaterial color="#312e81" />
      </mesh>
    </group>
  );
}

export function Avatar3D({
  speaking = false,
  listening = false,
  compact = false,
}: Avatar3DProps) {
  return (
    <div
      className={`h-full w-full overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-950/80 to-slate-950 ${
        compact ? "min-h-0" : "min-h-[280px]"
      }`}
    >
      <Canvas camera={{ position: [0, 1.2, 2.8], fov: 42 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 2]} intensity={1.2} />
        <pointLight position={[-2, 2, -1]} intensity={0.4} color="#818cf8" />
        <AvatarModel speaking={speaking} listening={listening} />
        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={4} blur={2} />
        <OrbitControls
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
          minDistance={2}
          maxDistance={4}
        />
      </Canvas>
    </div>
  );
}
