import { useEffect, useState } from 'react';
import { GEO_LOCAIS } from '../../data/geoguessBank';
import type { GeoEtapa } from '../../types/game';
import { loadGeoPhotos, type GeoPhoto } from '../../utils/geoguessPhotos';
import { SatView } from './SatView';

export function useGeoPhotos(localId?: string) {
  const [result, setResult] = useState<{ id: string; photos: (GeoPhoto | null)[] }>();
  const local = GEO_LOCAIS.find(place => place.id === localId);

  useEffect(() => {
    if (!local) return;
    const controller = new AbortController();
    let current = true;
    const timeout = window.setTimeout(() => controller.abort(), 5500);
    loadGeoPhotos(local, controller.signal).then(
      photos => { if (current) setResult({ id: local.id, photos }); },
      () => { if (current) setResult({ id: local.id, photos: [] }); }
    ).finally(() => window.clearTimeout(timeout));
    return () => {
      current = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [local]);

  return {
    photos: result?.id === localId ? result?.photos || [] : [],
    loading: Boolean(local && result?.id !== localId)
  };
}

interface GeoClueProps {
  lat: number;
  lon: number;
  etapa: GeoEtapa;
  prefetch?: GeoEtapa;
  photo?: GeoPhoto | null;
  nextPhoto?: GeoPhoto | null;
  label: string;
  onSourceChange: (photo: boolean) => void;
}

export function GeoClueView({ photo, nextPhoto, onSourceChange, ...satellite }: GeoClueProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!nextPhoto) return;
    const image = new Image();
    image.src = nextPhoto.url;
  }, [nextPhoto]);

  useEffect(() => onSourceChange(Boolean(photo && !failed)), [photo, failed, onSourceChange]);

  if (!photo || failed) return <SatView {...satellite} />;
  return (
    <div className={'rdb-geo-photo' + (photo.detail ? ' is-detail' : '')}>
      <img src={photo.url} alt={satellite.label} draggable={false} onError={() => setFailed(true)} />
    </div>
  );
}
