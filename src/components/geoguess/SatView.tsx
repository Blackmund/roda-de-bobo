import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GeoEtapa } from '../../types/game';
import { geoTilesFor } from '../../utils/geoguessEngine';

/**
 * Recorte de satelite em volta de um ponto: monta os tiles que cobrem a area e estica para o tamanho da etapa.
 * Todas as etapas de uma rodada usam o mesmo ponto, entao as imagens sao sempre do mesmo lugar.
 * `prefetch` baixa de antemao os tiles da proxima etapa (a troca de imagem fica instantanea na TV).
 */
export const SatView: React.FC<{
  lat: number;
  lon: number;
  etapa: GeoEtapa;
  prefetch?: GeoEtapa;
  label: string;
  className?: string;
}> = ({ lat, lon, etapa, prefetch, label, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [failed, setFailed] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tiles = geoTilesFor(lat, lon, etapa, box.w, box.h);
  const stageKey = `${lat},${lon},${etapa.z},${etapa.span},${etapa.dx || 0},${etapa.dy || 0}`;
  useEffect(() => setFailed(0), [stageKey]);

  useEffect(() => {
    if (!prefetch || box.w === 0) return;
    geoTilesFor(lat, lon, prefetch, box.w, box.h).forEach((t) => {
      const img = new Image();
      img.src = t.url;
    });
  }, [lat, lon, prefetch, box.w, box.h]);

  return (
    <div ref={ref} className={'rdb-sat ' + (className || '')} role="img" aria-label={label} data-testid="geo-sat">
      <div key={stageKey} className="rdb-sat-layer">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            draggable={false}
            onError={() => setFailed((n) => n + 1)}
            style={{ left: t.left, top: t.top, width: t.size + 1, height: t.size + 1 }}
          />
        ))}
      </div>
      {failed > 0 && failed >= tiles.length / 2 && (
        <p className="rdb-sat-off">Sem conexão com as imagens de satélite. Confira a internet da TV.</p>
      )}
    </div>
  );
};
