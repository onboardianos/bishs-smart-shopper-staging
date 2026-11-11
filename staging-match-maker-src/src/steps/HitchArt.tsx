// SWAP HITCH ART IN THIS FILE ONLY.
// Owner PNGs (512×512): hitch-bumper-pull.png and hitch-fifth-wheel.png.
// Every breakpoint renders these images. There is no line-drawing fallback.
// .ha-img uses object-fit: contain so the whole drawing stays inside the card.
import bumperPng from './assets/hitch-bumper-pull.png';
import fifthPng from './assets/hitch-fifth-wheel.png';

export const HITCH_ART = {
  bumper: bumperPng,
  fifth: fifthPng,
};

export function BumperHitchArt({ id }: { id: string }) {
  return <img id={id} className="ha ha-img" src={HITCH_ART.bumper} alt="Bumper hitch: trailer tongue, propane tank, and ball hitch with safety chains" draggable={false} />;
}

export function FifthWheelHitchArt({ id }: { id: string }) {
  return <img id={id} className="ha ha-img" src={HITCH_ART.fifth} alt="Fifth-wheel hitch: trailer nose over a pickup bed hitch" draggable={false} />;
}
