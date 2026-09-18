import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'play'
  | 'stop'
  | 'save'
  | 'share'
  | 'settings'
  | 'bell'
  | 'folder'
  | 'folderPlus'
  | 'file'
  | 'fileText'
  | 'filePlus'
  | 'plus'
  | 'minus'
  | 'x'
  | 'check'
  | 'checkCircle'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronUp'
  | 'menu'
  | 'moreH'
  | 'moreV'
  | 'alertCircle'
  | 'alertTriangle'
  | 'info'
  | 'copy'
  | 'trash'
  | 'pencil'
  | 'logout'
  | 'login'
  | 'home'
  | 'code'
  | 'terminal'
  | 'cpu'
  | 'zap'
  | 'shield'
  | 'smartphone'
  | 'cloud'
  | 'sun'
  | 'moon'
  | 'user'
  | 'clock'
  | 'refresh'
  | 'star'
  | 'external'
  | 'eye'
  | 'upload'
  | 'download'
  | 'arrowLeft'
  | 'arrowRight'
  | 'grid'
  | 'list'
  | 'database'
  | 'gitBranch'
  | 'rocket'
  | 'send'
  | 'panelLeft'
  | 'search'
  | 'message'
  | 'wand'
  | 'layers'
  | 'unplug'
  | 'keyboard'
  | 'globe'
  | 'mobile'
  | 'c'
  | 'lock'
  | 'mail'
  | 'cursor';

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

const JSX: Record<IconName, ReactNode[]> = {
  play: [<polygon key="p" points="5 3 19 12 5 21 5 3" />],
  stop: [<rect key="s" x="6" y="6" width="12" height="12" rx="1" />],
  save: [
    <path key="a" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />,
    <polyline key="b" points="17 21 17 13 7 13 7 21" />,
    <polyline key="c" points="7 3 7 8 15 8" />,
  ],
  share: [
    <circle key="a" cx="18" cy="5" r="3" />,
    <circle key="b" cx="6" cy="12" r="3" />,
    <circle key="c" cx="18" cy="19" r="3" />,
    <line key="d" x1="8.59" y1="13.51" x2="15.42" y2="17.49" />,
    <line key="e" x1="15.41" y1="6.51" x2="8.59" y2="10.49" />,
  ],
  settings: [
    <line key="a" x1="4" y1="21" x2="4" y2="14" />,
    <line key="b" x1="4" y1="10" x2="4" y2="3" />,
    <line key="c" x1="12" y1="21" x2="12" y2="12" />,
    <line key="d" x1="12" y1="8" x2="12" y2="3" />,
    <line key="e" x1="20" y1="21" x2="20" y2="16" />,
    <line key="f" x1="20" y1="12" x2="20" y2="3" />,
    <line key="g" x1="1" y1="14" x2="7" y2="14" />,
    <line key="h" x1="9" y1="8" x2="15" y2="8" />,
    <line key="i" x1="17" y1="16" x2="23" y2="16" />,
  ],
  bell: [
    <path key="a" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />,
    <path key="b" d="M13.73 21a2 2 0 0 1-3.46 0" />,
  ],
  folder: [<path key="a" d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />],
  folderPlus: [
    <path key="a" d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />,
    <line key="b" x1="12" y1="11" x2="12" y2="17" />,
    <line key="c" x1="9" y1="14" x2="15" y2="14" />,
  ],
  file: [
    <path key="a" d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />,
    <polyline key="b" points="13 2 13 9 20 9" />,
  ],
  fileText: [
    <path key="a" d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />,
    <polyline key="b" points="13 2 13 9 20 9" />,
    <line key="c" x1="9" y1="13" x2="15" y2="13" />,
    <line key="d" x1="9" y1="17" x2="15" y2="17" />,
  ],
  filePlus: [
    <path key="a" d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />,
    <polyline key="b" points="13 2 13 9 20 9" />,
    <line key="c" x1="12" y1="13" x2="12" y2="19" />,
    <line key="d" x1="9" y1="16" x2="15" y2="16" />,
  ],
  plus: [
    <line key="a" x1="12" y1="5" x2="12" y2="19" />,
    <line key="b" x1="5" y1="12" x2="19" y2="12" />,
  ],
  minus: [<line key="a" x1="5" y1="12" x2="19" y2="12" />],
  x: [
    <line key="a" x1="18" y1="6" x2="6" y2="18" />,
    <line key="b" x1="6" y1="6" x2="18" y2="18" />,
  ],
  check: [<polyline key="a" points="20 6 9 17 4 12" />],
  checkCircle: [
    <path key="a" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />,
    <polyline key="b" points="22 4 12 14.01 9 11.01" />,
  ],
  chevronDown: [<polyline key="a" points="6 9 12 15 18 9" />],
  chevronLeft: [<polyline key="a" points="15 18 9 12 15 6" />],
  chevronRight: [<polyline key="a" points="9 18 15 12 9 6" />],
  chevronUp: [<polyline key="a" points="18 15 12 9 6 15" />],
  menu: [
    <line key="a" x1="3" y1="6" x2="21" y2="6" />,
    <line key="b" x1="3" y1="12" x2="21" y2="12" />,
    <line key="c" x1="3" y1="18" x2="21" y2="18" />,
  ],
  moreH: [
    <circle key="a" cx="12" cy="12" r="1" />,
    <circle key="b" cx="19" cy="12" r="1" />,
    <circle key="c" cx="5" cy="12" r="1" />,
  ],
  moreV: [
    <circle key="a" cx="12" cy="12" r="1" />,
    <circle key="b" cx="12" cy="5" r="1" />,
    <circle key="c" cx="12" cy="19" r="1" />,
  ],
  alertCircle: [
    <circle key="a" cx="12" cy="12" r="10" />,
    <line key="b" x1="12" y1="8" x2="12" y2="12" />,
    <line key="c" x1="12" y1="16" x2="12.01" y2="16" />,
  ],
  alertTriangle: [
    <path
      key="a"
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
    />,
    <line key="b" x1="12" y1="9" x2="12" y2="13" />,
    <line key="c" x1="12" y1="17" x2="12.01" y2="17" />,
  ],
  info: [
    <circle key="a" cx="12" cy="12" r="10" />,
    <line key="b" x1="12" y1="16" x2="12" y2="12" />,
    <line key="c" x1="12" y1="8" x2="12.01" y2="8" />,
  ],
  copy: [
    <rect key="a" x="9" y="9" width="13" height="13" rx="2" ry="2" />,
    <path key="b" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />,
  ],
  trash: [
    <polyline key="a" points="3 6 5 6 21 6" />,
    <path key="b" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
    <line key="c" x1="10" y1="11" x2="10" y2="17" />,
    <line key="d" x1="14" y1="11" x2="14" y2="17" />,
  ],
  pencil: [<path key="a" d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />],
  logout: [
    <path key="a" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
    <polyline key="b" points="16 17 21 12 16 7" />,
    <line key="c" x1="21" y1="12" x2="9" y2="12" />,
  ],
  login: [
    <path key="a" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />,
    <polyline key="b" points="10 17 15 12 10 7" />,
    <line key="c" x1="15" y1="12" x2="3" y2="12" />,
  ],
  home: [
    <path key="a" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    <polyline key="b" points="9 22 9 12 15 12 15 22" />,
  ],
  code: [
    <polyline key="a" points="16 18 22 12 16 6" />,
    <polyline key="b" points="8 6 2 12 8 18" />,
  ],
  terminal: [
    <polyline key="a" points="4 17 10 11 4 5" />,
    <line key="b" x1="12" y1="19" x2="20" y2="19" />,
  ],
  cpu: [
    <rect key="a" x="4" y="4" width="16" height="16" rx="2" ry="2" />,
    <rect key="b" x="9" y="9" width="6" height="6" />,
    <line key="c" x1="9" y1="1" x2="9" y2="4" />,
    <line key="d" x1="15" y1="1" x2="15" y2="4" />,
    <line key="e" x1="9" y1="20" x2="9" y2="23" />,
    <line key="f" x1="15" y1="20" x2="15" y2="23" />,
    <line key="g" x1="20" y1="9" x2="23" y2="9" />,
    <line key="h" x1="20" y1="14" x2="23" y2="14" />,
    <line key="i" x1="1" y1="9" x2="4" y2="9" />,
    <line key="j" x1="1" y1="14" x2="4" y2="14" />,
  ],
  zap: [<polygon key="a" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />],
  shield: [<path key="a" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />],
  smartphone: [
    <rect key="a" x="5" y="2" width="14" height="20" rx="2" ry="2" />,
    <line key="b" x1="12" y1="18" x2="12.01" y2="18" />,
  ],
  cloud: [<path key="a" d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />],
  sun: [
    <circle key="a" cx="12" cy="12" r="5" />,
    <line key="b" x1="12" y1="1" x2="12" y2="3" />,
    <line key="c" x1="12" y1="21" x2="12" y2="23" />,
    <line key="d" x1="4.22" y1="4.22" x2="5.64" y2="5.64" />,
    <line key="e" x1="18.36" y1="18.36" x2="19.78" y2="19.78" />,
    <line key="f" x1="1" y1="12" x2="3" y2="12" />,
    <line key="g" x1="21" y1="12" x2="23" y2="12" />,
    <line key="h" x1="4.22" y1="19.78" x2="5.64" y2="18.36" />,
    <line key="i" x1="18.36" y1="5.64" x2="19.78" y2="4.22" />,
  ],
  moon: [<path key="a" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />],
  user: [
    <path key="a" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />,
    <circle key="b" cx="12" cy="7" r="4" />,
  ],
  clock: [
    <circle key="a" cx="12" cy="12" r="10" />,
    <polyline key="b" points="12 6 12 12 16 14" />,
  ],
  refresh: [
    <polyline key="a" points="23 4 23 10 17 10" />,
    <polyline key="b" points="1 20 1 14 7 14" />,
    <path key="c" d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />,
  ],
  star: [
    <polygon
      key="a"
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
    />,
  ],
  external: [
    <path key="a" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
    <polyline key="b" points="15 3 21 3 21 9" />,
    <line key="c" x1="10" y1="14" x2="21" y2="3" />,
  ],
  eye: [
    <path key="a" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />,
    <circle key="b" cx="12" cy="12" r="3" />,
  ],
  upload: [
    <path key="a" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />,
    <polyline key="b" points="17 8 12 3 7 8" />,
    <line key="c" x1="12" y1="3" x2="12" y2="15" />,
  ],
  download: [
    <path key="a" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />,
    <polyline key="b" points="7 10 12 15 17 10" />,
    <line key="c" x1="12" y1="15" x2="12" y2="3" />,
  ],
  arrowLeft: [
    <line key="a" x1="19" y1="12" x2="5" y2="12" />,
    <polyline key="b" points="12 19 5 12 12 5" />,
  ],
  arrowRight: [
    <line key="a" x1="5" y1="12" x2="19" y2="12" />,
    <polyline key="b" points="12 5 19 12 12 19" />,
  ],
  grid: [
    <rect key="a" x="3" y="3" width="7" height="7" rx="1" />,
    <rect key="b" x="14" y="3" width="7" height="7" rx="1" />,
    <rect key="c" x="14" y="14" width="7" height="7" rx="1" />,
    <rect key="d" x="3" y="14" width="7" height="7" rx="1" />,
  ],
  list: [
    <line key="a" x1="8" y1="6" x2="21" y2="6" />,
    <line key="b" x1="8" y1="12" x2="21" y2="12" />,
    <line key="c" x1="8" y1="18" x2="21" y2="18" />,
    <line key="d" x1="3" y1="6" x2="3.01" y2="6" />,
    <line key="e" x1="3" y1="12" x2="3.01" y2="12" />,
    <line key="f" x1="3" y1="18" x2="3.01" y2="18" />,
  ],
  database: [
    <ellipse key="a" cx="12" cy="5" rx="9" ry="3" />,
    <path key="b" d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />,
    <path key="c" d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />,
  ],
  gitBranch: [
    <line key="a" x1="6" y1="3" x2="6" y2="15" />,
    <circle key="b" cx="18" cy="6" r="3" />,
    <circle key="c" cx="6" cy="18" r="3" />,
    <path key="d" d="M18 9a9 9 0 0 1-9 9" />,
  ],
  rocket: [
    <path key="a" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />,
    <path key="b" d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />,
    <path key="c" d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />,
    <path key="d" d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />,
  ],
  send: [
    <line key="a" x1="22" y1="2" x2="11" y2="13" />,
    <polygon key="b" points="22 2 15 22 11 13 2 9 22 2" />,
  ],
  panelLeft: [
    <rect key="a" x="3" y="3" width="18" height="18" rx="2" ry="2" />,
    <line key="b" x1="9" y1="3" x2="9" y2="21" />,
  ],
  search: [
    <circle key="a" cx="11" cy="11" r="8" />,
    <line key="b" x1="21" y1="21" x2="16.65" y2="16.65" />,
  ],
  message: [
    <path key="a" d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  ],
  wand: [
    <path key="a" d="M15 4V2" />,
    <path key="b" d="M15 16v-2" />,
    <path key="c" d="M8 9h2" />,
    <path key="d" d="M20 9h2" />,
    <path key="e" d="M17.8 11.8L19 13" />,
    <path key="f" d="M15 9h0" />,
    <path key="g" d="M17.8 6.2L19 5" />,
    <path key="h" d="M3 21l9-9" />,
    <path key="i" d="M12.2 6.2L11 5" />,
  ],
  layers: [
    <polygon key="a" points="12 2 2 7 12 12 22 7 12 2" />,
    <polyline key="b" points="2 17 12 22 22 17" />,
    <polyline key="c" points="2 12 12 17 22 12" />,
  ],
  unplug: [
    <path key="a" d="M19 5l3-3" />,
    <path key="b" d="M2 22l3-3" />,
    <path key="c" d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4z" />,
    <path key="d" d="M7.5 13.5L10 11l8 8-2.5 2.5" />,
    <path key="e" d="M21 12l-4-4" />,
    <line key="f" x1="11" y1="7" x2="14" y2="10" />,
  ],
  keyboard: [
    <rect key="a" x="2" y="6" width="20" height="12" rx="2" />,
    <line key="b" x1="6" y1="10" x2="6.01" y2="10" />,
    <line key="c" x1="10" y1="10" x2="10.01" y2="10" />,
    <line key="d" x1="14" y1="10" x2="14.01" y2="10" />,
    <line key="e" x1="18" y1="10" x2="18.01" y2="10" />,
    <line key="f" x1="20" y1="14" x2="20.01" y2="14" />,
    <line key="g" x1="4" y1="14" x2="4.01" y2="14" />,
    <line key="h" x1="8" y1="14" x2="16" y2="14" />,
    <line key="i" x1="6" y1="14" x2="6.01" y2="14" />,
  ],
  globe: [
    <circle key="a" cx="12" cy="12" r="10" />,
    <line key="b" x1="2" y1="12" x2="22" y2="12" />,
    <path key="c" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />,
  ],
  mobile: [
    <rect key="a" x="6" y="2" width="12" height="20" rx="2" />,
    <line key="b" x1="12" y1="18" x2="12.01" y2="18" />,
  ],
  c: [
    <path key="a" d="M18 8a6 6 0 0 0-9.33-5" />,
    <path key="b" d="M17.6 10.6A6 6 0 1 1 15 19" />,
  ],
  lock: [
    <rect key="a" x="3" y="11" width="18" height="11" rx="2" ry="2" />,
    <path key="b" d="M7 11V7a5 5 0 0 1 10 0v4" />,
  ],
  mail: [
    <rect key="a" x="2" y="4" width="20" height="16" rx="2" ry="2" />,
    <path key="b" d="m22 6-10 7L2 6" />,
  ],
  cursor: [
    <path key="a" d="M9 3h6M12 3v18M9 21h6" />,
  ],
};

export function Icon({ name, size = 20, strokeWidth = 1.8, className, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {JSX[name]}
    </svg>
  );
}