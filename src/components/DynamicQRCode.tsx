import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface DynamicQRCodeProps {
  url: string;
  size?: number;
  className?: string;
}

export const DynamicQRCode: React.FC<DynamicQRCodeProps> = ({
  url,
  size = 180,
  className = ''
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: {
        dark: '#F5F2EB', // Off-white on dark background
        light: '#07080d' // Night blue
      }
    })
      .then((res) => setDataUrl(res))
      .catch((err) => console.error('QR code generation error:', err));
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className="flex items-center justify-center border border-cyan-500/30 bg-black/60 text-cyan-400 text-xs font-mono"
      >
        Gerando QR...
      </div>
    );
  }

  return (
    <div className={`p-2 border-2 border-cyan-400/80 bg-[#07080d] inline-block shadow-neon-cyan ${className}`}>
      <img src={dataUrl} alt={`QR Code para ${url}`} width={size} height={size} className="block" />
    </div>
  );
};
