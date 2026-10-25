import React from 'react';

/**
 * Standard Code 39 Barcode Pattern Dictionary
 * 9 elements per character (5 bars, 4 spaces), exactly 3 wide (1) and 6 narrow (0).
 * Alternating: Bar, Space, Bar, Space, Bar, Space, Bar, Space, Bar.
 */
const CODE39_PATTERNS = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100',
};

const Barcode = ({
  value = '',
  height = 42,
  narrowWidth = 1.3,
  wideRatio = 2.4,
  gapRatio = 1.0,
  quietZone = 12,
  showText = true,
  textColor = '#0f172a',
  barColor = '#000000',
  className = '',
  style = {},
}) => {
  if (!value) return null;

  // Clean value for standard Code 39 (letters, numbers, specific punctuation)
  const cleanVal = String(value)
    .toUpperCase()
    .replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '');

  if (!cleanVal) return null;

  const wideWidth = narrowWidth * wideRatio;
  const gapWidth = narrowWidth * gapRatio;
  const encodedStr = `*${cleanVal}*`;

  const bars = [];
  let currentX = quietZone;

  for (let i = 0; i < encodedStr.length; i++) {
    const char = encodedStr[i];
    const pattern = CODE39_PATTERNS[char];
    if (!pattern) continue;

    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0;
      const isWide = pattern[p] === '1';
      const w = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        bars.push({
          x: Math.round(currentX * 10) / 10,
          y: 0,
          width: Math.round(w * 10) / 10,
          height: height,
        });
      }
      currentX += w;
    }

    // Inter-character narrow space gap
    if (i < encodedStr.length - 1) {
      currentX += gapWidth;
    }
  }

  const totalWidth = Math.ceil(currentX + quietZone);
  const totalHeight = showText ? height + 16 : height;

  return (
    <div
      className={`barcode-component ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#ffffff',
        ...style,
      }}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{
          width: '100%',
          maxWidth: `${totalWidth}px`,
          height: 'auto',
          display: 'block',
        }}
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0" y="0" width={totalWidth} height={totalHeight} fill="#ffffff" />
        {bars.map((b, idx) => (
          <rect
            key={idx}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            fill={barColor}
          />
        ))}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height + 12}
            textAnchor="middle"
            fill={textColor}
            fontSize="11"
            fontFamily="'Courier New', Courier, monospace"
            fontWeight="700"
            letterSpacing="2"
          >
            {cleanVal}
          </text>
        )}
      </svg>
    </div>
  );
};

export default Barcode;
