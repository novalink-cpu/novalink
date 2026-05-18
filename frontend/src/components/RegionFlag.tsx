import { getFlagUrl } from '@data/config';

interface RegionFlagProps {
  flagCode: string;
  size?: number;
  className?: string;
}

export function RegionFlag({ flagCode, size = 28, className = 'region-flag' }: RegionFlagProps) {
  const height = Math.round(size * 0.72);

  return (
    <img
      src={getFlagUrl(flagCode, 80)}
      srcSet={`${getFlagUrl(flagCode, 160)} 2x`}
      alt=""
      width={size}
      height={height}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}