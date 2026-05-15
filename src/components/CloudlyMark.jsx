export default function CloudlyMark({ size = 18, className = '', alt = 'Cloudly' }) {
  return (
    <img
      src="/cloudly-assessts/cloudly-mark.png"
      alt={alt}
      draggable="false"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'cover',
        display: 'block',
        background: 'transparent',
      }}
    />
  );
}
