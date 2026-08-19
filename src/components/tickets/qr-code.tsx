interface QrCodeProps {
  svg: string;
  label: string;
  className?: string;
}

export function QrCode({ svg, label, className = '' }: QrCodeProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`bg-white rounded-lg [&_svg]:block [&_svg]:h-auto [&_svg]:w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
