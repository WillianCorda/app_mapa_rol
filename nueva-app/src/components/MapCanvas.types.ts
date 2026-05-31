export type FowAction = {
  tool: 'brush' | 'eraser' | 'paint' | 'paint-eraser' | 'clear' | 'fill';
  points?: number[];
  size?: number;
  id: string;
  brushShape?: 'round' | 'square';
  color?: string;
  normalized?: boolean;
};

export type ViewState = {
  scale: number;
  position: { x: number; y: number };
  containerWidth?: number;
  containerHeight?: number;
};

export type MapTrap = {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  name?: string;
  activated: boolean;
  imageUrl?: string;
};
