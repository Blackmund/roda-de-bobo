import { useEffect, useState } from 'react';
import { GEO_LOCAIS } from '../../data/geoguessBank';
import type { GeoEtapa } from '../../types/game';
import { loadGeoPhotos, type GeoPhoto } from '../../utils/geoguessPhotos';
import { prepareGeoClue } from '../../utils/geoguessClueArtwork';
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
      photos => {
        if (!current) return;
        setResult({ id: local.id, photos });
        if (photos[0]) void prepareGeoClue(photos[0].url, 0);
        else if (photos[1]) void prepareGeoClue(photos[1].url, 1);
      },
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
  stage: number;
  nextPhoto?: GeoPhoto | null;
  label: string;
  onSourceChange: (photo: boolean) => void;
}

export function GeoClueView({ photo, nextPhoto, stage, onSourceChange, ...satellite }: GeoClueProps) {
  const [failed, setFailed] = useState(false);
  const [prepared, setPrepared] = useState<string | null>();

  useEffect(() => {
    if (!photo) return;
    let current = true;
    void prepareGeoClue(photo.url, stage).then(url => { if (current) setPrepared(url); });
    return () => { current = false; };
  }, [photo, stage]);

  useEffect(() => {
    if (nextPhoto && (!photo || prepared !== undefined)) void prepareGeoClue(nextPhoto.url, stage + 1);
  }, [nextPhoto, photo, prepared, stage]);

  const showPhoto = Boolean(prepared && !failed);
  useEffect(() => onSourceChange(showPhoto), [showPhoto, onSourceChange]);

  if (photo && prepared === undefined) return <div className="rdb-geo-photo is-loading" role="status">Preparando pista…</div>;
  if (!prepared || failed) return <SatView {...satellite} />;
  return (
    <div className="rdb-geo-photo">
      <img src={prepared} alt={satellite.label} draggable={false} onError={() => setFailed(true)} />
    </div>
  );
}
